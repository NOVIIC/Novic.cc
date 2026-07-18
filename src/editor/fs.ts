/// <reference types="wicg-file-system-access" />
import { parseFrontmatter } from './frontmatter';
import { isIntro, isMarkdown, type TreeNode } from './types';

export const isSupported = (): boolean =>
	typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
	try {
		return await window.showDirectoryPicker({
			id: 'novic-content',
			mode: 'readwrite',
		});
	} catch (e) {
		if (e instanceof DOMException && e.name === 'AbortError') return null;
		throw e;
	}
}

export async function verifyPermission(
	handle: FileSystemDirectoryHandle,
	request: boolean,
): Promise<boolean> {
	const opts = { mode: 'readwrite' as const };
	if ((await handle.queryPermission(opts)) === 'granted') return true;
	if (!request) return false;
	return (await handle.requestPermission(opts)) === 'granted';
}

/* ---------- IndexedDB：记住上次打开的目录 ---------- */

const DB_NAME = 'novic-editor';
const STORE = 'kv';

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(STORE);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function saveRootHandle(
	handle: FileSystemDirectoryHandle,
): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).put(handle, 'rootDir');
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function loadRootHandle(): Promise<FileSystemDirectoryHandle | null> {
	try {
		const db = await openDb();
		return await new Promise((resolve, reject) => {
			const req = db.transaction(STORE).objectStore(STORE).get('rootDir');
			req.onsuccess = () =>
				resolve((req.result as FileSystemDirectoryHandle) ?? null);
			req.onerror = () => reject(req.error);
		});
	} catch {
		return null;
	}
}

/* ---------- 目录扫描 ---------- */

/** 读取文件头部，提取 frontmatter（只取前 16KB，避免读取大文件全文）。 */
async function readMeta(handle: FileSystemFileHandle) {
	try {
		const file = await handle.getFile();
		const head = await file.slice(0, 16 * 1024).text();
		return parseFrontmatter(head);
	} catch {
		return {};
	}
}

async function scanDir(
	handle: FileSystemDirectoryHandle,
	path: string,
	depth: number,
): Promise<TreeNode> {
	const node: TreeNode = {
		name: handle.name,
		path,
		kind: 'directory',
		handle,
		children: [],
	};
	if (depth > 8) return node; // 防御性深度限制

	const dirs: TreeNode[] = [];
	const mdFiles: TreeNode[] = [];
	const otherFiles: TreeNode[] = [];
	const MAX_ENTRIES = 100;
	let count = 0;

	for await (const entry of handle.values()) {
		if (entry.name.startsWith('.')) continue;
		if (++count > MAX_ENTRIES) break;
		const childPath = path ? `${path}/${entry.name}` : entry.name;
		if (entry.kind === 'directory') {
			dirs.push(await scanDir(entry, childPath, depth + 1));
		} else if (isMarkdown(entry.name)) {
			mdFiles.push({
				name: entry.name,
				path: childPath,
				kind: 'file',
				handle: entry,
				meta: await readMeta(entry),
			});
		} else {
			otherFiles.push({
				name: entry.name,
				path: childPath,
				kind: 'file',
				handle: entry,
			});
		}
	}

	// 目录的 meta 取其 intro 文件的 frontmatter（对应 notes 主题的排序依据）
	const intro = mdFiles.find((f) => isIntro(f.name));
	node.meta = intro?.meta;

	// 目录排序：按 intro 的 pubDate 升序（无 intro 视为 0，与站点一致），再按名称
	dirs.sort(
		(a, b) =>
			(a.meta?.pubDate ?? 0) - (b.meta?.pubDate ?? 0) ||
			a.name.localeCompare(b.name),
	);

	// 文件排序：
	// - 含 intro 的目录（notes 主题）：intro 置顶，其余按 pubDate 升序
	// - 其他目录（articles 等）：按 pubDate 降序（新的在前），无日期的排最后
	if (intro) {
		mdFiles.sort((a, b) => {
			if (isIntro(a.name)) return -1;
			if (isIntro(b.name)) return 1;
			return (
				(a.meta?.pubDate ?? Infinity) - (b.meta?.pubDate ?? Infinity) ||
				a.name.localeCompare(b.name)
			);
		});
	} else {
		mdFiles.sort(
			(a, b) =>
				(b.meta?.pubDate ?? -Infinity) - (a.meta?.pubDate ?? -Infinity) ||
				a.name.localeCompare(b.name),
		);
	}

	otherFiles.sort((a, b) => a.name.localeCompare(b.name));
	node.children = [...dirs, ...mdFiles, ...otherFiles];
	if (count > MAX_ENTRIES) {
		node.children.push({ name: '……', path: '', kind: 'more', handle: null });
	}
	return node;
}

export function scan(root: FileSystemDirectoryHandle): Promise<TreeNode> {
	return scanDir(root, '', 0);
}

/* ---------- 文件操作 ---------- */

export async function readFile(handle: FileSystemFileHandle): Promise<string> {
	return (await handle.getFile()).text();
}

export async function writeFile(
	handle: FileSystemFileHandle,
	content: string,
): Promise<void> {
	const w = await handle.createWritable();
	await w.write(content);
	await w.close();
}

export async function createFile(
	dir: FileSystemDirectoryHandle,
	name: string,
	content: string,
): Promise<void> {
	const fh = await dir.getFileHandle(name, { create: true });
	if (content) await writeFile(fh, content);
}

export async function createDir(
	dir: FileSystemDirectoryHandle,
	name: string,
): Promise<void> {
	await dir.getDirectoryHandle(name, { create: true });
}

export async function removeEntry(
	parent: FileSystemDirectoryHandle,
	name: string,
	recursive: boolean,
): Promise<void> {
	await parent.removeEntry(name, { recursive });
}

/** 重命名（同目录 move）。返回 false 表示浏览器不支持 move()。 */
export async function renameEntry(
	handle: FileSystemDirectoryHandle | FileSystemFileHandle | null,
	newName: string,
): Promise<boolean> {
	if (!handle) return false;
	const movable = handle as FileSystemHandle & {
		move?: (name: string) => Promise<void>;
	};
	if (typeof movable.move !== 'function') return false;
	await movable.move(newName);
	return true;
}
