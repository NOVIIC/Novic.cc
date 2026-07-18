import * as fs from './fs';
import { createEditor, setDoc, type EditorCallbacks } from './cm';
import { TreeView } from './tree';
import { isMarkdown, type TreeNode } from './types';
import { newFileTemplate } from './frontmatter';

const $ = <T extends HTMLElement>(id: string): T => {
	const el = document.getElementById(id) as T | null;
	if (!el) throw new Error(`#${id} not found`);
	return el;
};

let toastTimer = 0;
function toast(msg: string, ms = 2200) {
	const el = $('toast');
	el.textContent = msg;
	el.style.opacity = '1';
	clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => (el.style.opacity = '0'), ms);
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function init() {
	if (!fs.isSupported()) {
		$('unsupported').classList.remove('hidden');
		$('unsupported').classList.add('flex');
		$('welcome').classList.add('hidden');
		return;
	}

	const ui = {
		welcome: $('welcome'),
		restoreHint: $('restore-hint'),
		tree: $('tree'),
		cm: $('cm-container'),
		preview: $('preview-container'),
		fileInfo: $('file-info'),
		filePath: $('file-path'),
		dirtyDot: $('dirty-dot'),
		btnSave: $('btn-save') as unknown as HTMLButtonElement,
		btnOpen: $('btn-open'),
		btnOpenWelcome: $('btn-open-welcome'),
		btnRefresh: $('btn-refresh') as unknown as HTMLButtonElement,
		btnNewFile: $('btn-new-file') as unknown as HTMLButtonElement,
		btnNewFolder: $('btn-new-folder') as unknown as HTMLButtonElement,
		modeToggle: $('mode-toggle'),
	};

	let rootHandle: FileSystemDirectoryHandle | null = null;
	let lastTree: TreeNode | null = null;
	let current: {
		handle: FileSystemFileHandle;
		path: string;
		saved: string;
	} | null = null;
	let dirty = false;
	let mode: 'edit' | 'preview' = 'edit';
	let previewTimer = 0;
	let previewSeq = 0;

	/* ---------- 状态与渲染 ---------- */

	const setDirty = (v: boolean) => {
		dirty = v;
		ui.dirtyDot.classList.toggle('hidden', !v);
		ui.btnSave.disabled = !v;
	};

	const confirmDiscard = () =>
		!dirty || window.confirm('当前文件有未保存的修改，确定放弃吗？');

	const renderPreviewNow = async () => {
		const cur = current;
		const root = rootHandle;
		if (!cur || !root) return;
		const seq = ++previewSeq;
		const source = view.state.doc.toString();
		try {
			const { renderPreview } = await import('./preview');
			if (seq !== previewSeq || current !== cur) return; // 期间已切换文件/关闭
			await renderPreview({
				source,
				isMdx: /\.mdx$/i.test(cur.path),
				container: ui.preview,
				root,
				fileDir: cur.path.split('/').slice(0, -1).join('/'),
			});
		} catch (e) {
			console.error(e);
			toast(`预览加载失败：${errMsg(e)}`, 4000);
		}
	};

	const schedulePreview = () => {
		if (mode !== 'preview' || !current) return;
		clearTimeout(previewTimer);
		previewTimer = window.setTimeout(() => void renderPreviewNow(), 400);
	};

	const editorCallbacks: EditorCallbacks = {
		onDocChanged: (doc) => {
			if (!current) return;
			setDirty(doc !== current.saved);
			schedulePreview();
		},
		onSave: () => void save(),
	};

	const view = createEditor(ui.cm, editorCallbacks);

	const treeView = new TreeView(ui.tree, {
		onOpenFile: (node) => void openFile(node),
		onCreate: (dirNode, kind, name) => void createEntry(dirNode, kind, name),
		onRename: (node, newName) => void renameEntry(node, newName),
		onDelete: (node) => void deleteEntry(node),
	});

	function findNode(path: string): TreeNode | null {
		const walk = (n: TreeNode): TreeNode | null => {
			if (n.path === path) return n;
			for (const c of n.children ?? []) {
				const r = walk(c);
				if (r) return r;
			}
			return null;
		};
		return lastTree ? walk(lastTree) : null;
	}

	async function parentDirOf(path: string): Promise<FileSystemDirectoryHandle> {
		if (!rootHandle) throw new Error('尚未打开目录');
		let dir = rootHandle;
		for (const s of path.split('/').slice(0, -1)) {
			dir = await dir.getDirectoryHandle(s);
		}
		return dir;
	}

	async function refreshTree(): Promise<boolean> {
		if (!rootHandle) return false;
		try {
			lastTree = await fs.scan(rootHandle);
			treeView.render(lastTree);
			return true;
		} catch (e) {
			toast(`扫描目录失败：${errMsg(e)}`, 4000);
			return false;
		}
	}

	/* ---------- 文件操作 ---------- */

	let saving = false;
	async function save() {
		if (!current || !dirty || saving) return;
		saving = true;
		try {
			const doc = view.state.doc.toString();
			await fs.writeFile(current.handle, doc);
			current.saved = doc;
			setDirty(false);
			toast(`已保存 ${current.path}`);
		} catch (e) {
			toast(`保存失败：${errMsg(e)}`, 4000);
		} finally {
			saving = false;
		}
	}

	async function openFile(node: TreeNode) {
		if (node.kind !== 'file') return;
		if (!isMarkdown(node.name)) {
			toast('仅支持编辑 .md / .mdx 文件');
			return;
		}
		if (current?.path === node.path) return;
		if (!confirmDiscard()) return;
		try {
			const content = await fs.readFile(node.handle as FileSystemFileHandle);
			current = {
				handle: node.handle as FileSystemFileHandle,
				path: node.path,
				saved: content,
			};
			setDoc(view, content, editorCallbacks);
			setDirty(false);
			ui.filePath.textContent = node.path;
			ui.fileInfo.classList.remove('hidden');
			ui.fileInfo.classList.add('flex');
			ui.btnSave.classList.remove('hidden');
			ui.modeToggle.classList.remove('hidden');
			treeView.setActive(node.path);
			if (mode === 'preview') void renderPreviewNow();
		} catch (e) {
			toast(`打开失败：${errMsg(e)}`, 4000);
		}
	}

	function closeCurrentFile() {
		current = null;
		setDirty(false);
		ui.filePath.textContent = '';
		ui.fileInfo.classList.add('hidden');
		ui.fileInfo.classList.remove('flex');
		ui.btnSave.classList.add('hidden');
		ui.modeToggle.classList.add('hidden');
		ui.preview.textContent = '';
		treeView.setActive(null);
		setDoc(view, '', editorCallbacks);
	}

	async function createEntry(
		dirNode: TreeNode,
		kind: 'file' | 'directory',
		rawName: string,
	) {
		let name = rawName.trim();
		if (!name || /[/\\]/.test(name)) {
			toast('名称不合法');
			return;
		}
		if (kind === 'file' && !/\.[a-z0-9]+$/i.test(name)) name += '.md';
		try {
			const dir = dirNode.handle as FileSystemDirectoryHandle;
			// 重名检查，避免覆盖已有文件
			let exists = false;
			try {
				if (kind === 'file') await dir.getFileHandle(name);
				else await dir.getDirectoryHandle(name);
				exists = true;
			} catch {
				// NotFoundError：不存在，可以创建
			}
			if (exists) {
				toast(`「${name}」已存在`);
				return;
			}
			if (kind === 'file') {
				await fs.createFile(
					dir,
					name,
					isMarkdown(name) ? newFileTemplate() : '',
				);
			} else {
				await fs.createDir(dir, name);
			}
			await refreshTree();
			toast(`已创建 ${name}`);
			if (kind === 'file') {
				const path = dirNode.path ? `${dirNode.path}/${name}` : name;
				const node = findNode(path);
				if (node) await openFile(node);
			}
		} catch (e) {
			toast(`创建失败：${errMsg(e)}`, 4000);
		}
	}

	async function renameEntry(node: TreeNode, newName: string) {
		if (!newName.trim() || /[/\\]/.test(newName)) {
			toast('名称不合法');
			return;
		}
		try {
			const ok = await fs.renameEntry(node.handle, newName);
			if (!ok) {
				toast('当前浏览器不支持重命名，请使用较新的 Chrome/Edge', 4000);
				return;
			}
			if (current) {
				const dir = node.path.split('/').slice(0, -1).join('/');
				const newPath = dir ? `${dir}/${newName}` : newName;
				if (current.path === node.path) {
					current.path = newPath;
					ui.filePath.textContent = current.path;
				} else if (
					node.kind === 'directory' &&
					current.path.startsWith(node.path + '/')
				) {
					// 重命名了当前文件的父目录：同步前缀
					current.path = newPath + current.path.slice(node.path.length);
					ui.filePath.textContent = current.path;
				}
			}
			await refreshTree();
			toast(`已重命名为 ${newName}`);
		} catch (e) {
			toast(`重命名失败：${errMsg(e)}`, 4000);
		}
	}

	async function deleteEntry(node: TreeNode) {
		const hint =
			node.kind === 'directory'
				? `确定删除目录「${node.path}」及其全部内容吗？`
				: `确定删除「${node.path}」吗？`;
		if (!window.confirm(hint)) return;
		try {
			const parent = await parentDirOf(node.path);
			await fs.removeEntry(parent, node.name, node.kind === 'directory');
			if (
				current &&
				(current.path === node.path || current.path.startsWith(node.path + '/'))
			) {
				closeCurrentFile();
			}
			await refreshTree();
			toast(`已删除 ${node.name}`);
		} catch (e) {
			toast(`删除失败：${errMsg(e)}`, 4000);
		}
	}

	/* ---------- 目录打开/恢复 ---------- */

	async function openRoot(handle: FileSystemDirectoryHandle) {
		rootHandle = handle;
		await fs.saveRootHandle(handle);
		ui.welcome.classList.add('hidden');
		ui.btnRefresh.disabled = false;
		ui.btnNewFile.disabled = false;
		ui.btnNewFolder.disabled = false;
		await refreshTree();
		toast(`已打开 ${handle.name}/`);
	}

	async function pickAndOpen() {
		const handle = await fs.pickDirectory();
		if (handle) await openRoot(handle);
	}

	/* ---------- 模式切换 ---------- */

	const toggle = {
		setMode(m: 'edit' | 'preview') {
			mode = m;
			ui.modeToggle
				.querySelectorAll<HTMLButtonElement>('.mode-btn')
				.forEach((b) => {
					const active = b.dataset.mode === m;
					b.classList.toggle('bg-accent/20', active);
					b.classList.toggle('text-white', active);
					b.classList.toggle('text-white/60', !active);
				});
			ui.cm.classList.toggle('hidden', m === 'preview');
			ui.preview.classList.toggle('hidden', m !== 'preview');
			if (m === 'preview') void renderPreviewNow();
		},
	};

	/* ---------- 事件绑定 ---------- */

	ui.btnOpen.addEventListener('click', () => void pickAndOpen());
	ui.btnOpenWelcome.addEventListener('click', async () => {
		// 优先恢复上次打开的目录
		const saved = await fs.loadRootHandle();
		if (saved && (await fs.verifyPermission(saved, true))) {
			await openRoot(saved);
			return;
		}
		await pickAndOpen();
	});
	ui.btnRefresh.addEventListener('click', async () => {
		if (await refreshTree()) toast('已刷新');
	});
	ui.btnNewFile.addEventListener('click', () =>
		treeView.beginCreateInRoot('file'),
	);
	ui.btnNewFolder.addEventListener('click', () =>
		treeView.beginCreateInRoot('directory'),
	);
	ui.btnSave.addEventListener('click', () => void save());
	ui.modeToggle
		.querySelectorAll<HTMLButtonElement>('.mode-btn')
		.forEach((b) =>
			b.addEventListener('click', () =>
				toggle.setMode(b.dataset.mode as 'edit' | 'preview'),
			),
		);

	document.addEventListener('keydown', (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			if (ui.cm.contains(document.activeElement)) return;
			e.preventDefault();
			void save();
		}
	});

	window.addEventListener('beforeunload', (e) => {
		if (dirty) e.preventDefault();
	});

	// 尝试静默恢复上次目录（已授权则直接进入）
	void (async () => {
		const saved = await fs.loadRootHandle();
		if (!saved) return;
		if (await fs.verifyPermission(saved, false)) {
			await openRoot(saved);
		} else {
			ui.restoreHint.classList.remove('hidden');
		}
	})();
}
