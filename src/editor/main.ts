import * as fs from './fs';
import { createEditor, setDoc, type EditorCallbacks } from './cm';
import { TreeView } from './tree';
import { isImage, isMarkdown, type TreeNode } from './types';
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

type Mode = 'edit' | 'split' | 'preview';
const MODE_ORDER: Mode[] = ['edit', 'split', 'preview'];

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
		btnSidebar: $('btn-sidebar'),
		sidebarWrap: $('sidebar-wrap'),
		sidebarResizer: $('sidebar-resizer'),
		sidebarBackdrop: $('sidebar-backdrop'),
	};

	let rootHandle: FileSystemDirectoryHandle | null = null;
	let lastTree: TreeNode | null = null;
	let current: {
		handle: FileSystemFileHandle;
		path: string;
		saved: string;
	} | null = null;
	let dirty = false;
	let mode: Mode = 'edit';
	let previewTimer = 0;
	let previewSeq = 0;
	let imageBlobUrl = '';

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

	/* ---------- 通用小工具 ---------- */

	/** 面板入场动画（模式切换 / 从图片预览切回时）。 */
	const animateIn = (el: HTMLElement) => {
		if (reduceMotion.matches) return;
		el.animate(
			[
				{ opacity: 0, transform: 'translateY(6px)' },
				{ opacity: 1, transform: 'translateY(0)' },
			],
			{ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
		);
	};

	const scrollRatioOf = (el: HTMLElement) => {
		const max = el.scrollHeight - el.clientHeight;
		return max > 0 ? el.scrollTop / max : 0;
	};
	const applyRatio = (el: HTMLElement, r: number) => {
		el.scrollTop = r * Math.max(0, el.scrollHeight - el.clientHeight);
	};

	/* ---------- 状态与渲染 ---------- */

	const setDirty = (v: boolean) => {
		dirty = v;
		ui.dirtyDot.classList.toggle('hidden', !v);
		ui.btnSave.disabled = !v;
	};

	const confirmDiscard = () =>
		!dirty || window.confirm('当前文件有未保存的修改，确定放弃吗？');

	/**
	 * 渲染预览。
	 * scroll：'preserve' 保持当前滚动位置（编辑触发的刷新）；
	 *         'reset' 回到顶部（打开新文件）；
	 *         数字则按比例定位（模式切换时保持阅读进度）。
	 */
	const renderPreviewNow = async (
		scroll: 'preserve' | 'reset' | number = 'preserve',
	) => {
		const cur = current;
		const root = rootHandle;
		if (!cur || !root || isImage(cur.path)) return;
		const seq = ++previewSeq;
		const source = view.state.doc.toString();
		const prevScrollTop = ui.preview.scrollTop;
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
			if (seq !== previewSeq || current !== cur) return;
			if (typeof scroll === 'number') applyRatio(ui.preview, scroll);
			else ui.preview.scrollTop = scroll === 'preserve' ? prevScrollTop : 0;
		} catch (e) {
			console.error(e);
			toast(`预览加载失败：${errMsg(e)}`, 4000);
		}
	};

	const schedulePreview = () => {
		if (mode === 'edit' || !current) return;
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
	const cmScroller = view.scrollDOM;

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

	/* ---------- 面板布局与模式切换 ---------- */

	const togglePane = (el: HTMLElement, show: boolean) => {
		const wasHidden = el.classList.contains('hidden');
		el.classList.toggle('hidden', !show);
		if (show && wasHidden) animateIn(el);
	};

	/** 根据当前模式（及是否为图片）排布编辑/预览面板。 */
	const layoutPanes = () => {
		const image = current !== null && isImage(current.path);
		const eff: Mode = image ? 'preview' : mode;
		togglePane(ui.cm, eff !== 'preview');
		togglePane(ui.preview, eff !== 'edit');
	};

	const showModeToggle = (v: boolean) => {
		ui.modeToggle.classList.toggle('hidden', !v);
		ui.modeToggle.classList.toggle('flex', v);
	};

	const setMode = (m: Mode) => {
		if (m === mode) return;
		// 记录当前可见面板的滚动比例，切换后恢复，保持阅读/编辑位置
		const from =
			mode === 'edit'
				? cmScroller
				: mode === 'preview'
					? ui.preview
					: m === 'edit'
						? cmScroller
						: ui.preview;
		const ratio = scrollRatioOf(from);
		mode = m;
		document.body.dataset.editorMode = m;
		ui.modeToggle.style.setProperty(
			'--mode-idx',
			String(MODE_ORDER.indexOf(m)),
		);
		ui.modeToggle
			.querySelectorAll<HTMLButtonElement>('.mode-btn')
			.forEach((b) => {
				const active = b.dataset.mode === m;
				b.classList.toggle('text-white', active);
				b.classList.toggle('text-white/55', !active);
			});
		layoutPanes();
		if (m !== 'preview')
			requestAnimationFrame(() => applyRatio(cmScroller, ratio));
		if (m !== 'edit') void renderPreviewNow(ratio);
	};

	/* ---------- 分屏滚动同步（按滚动进度比例） ---------- */

	let syncLock = false;
	const syncTo = (from: HTMLElement, to: HTMLElement) => {
		if (mode !== 'split' || syncLock) return;
		const ratio = scrollRatioOf(from);
		syncLock = true;
		requestAnimationFrame(() => {
			applyRatio(to, ratio);
			requestAnimationFrame(() => {
				syncLock = false;
			});
		});
	};
	cmScroller.addEventListener('scroll', () => syncTo(cmScroller, ui.preview), {
		passive: true,
	});
	ui.preview.addEventListener('scroll', () => syncTo(ui.preview, cmScroller), {
		passive: true,
	});

	/* ---------- 目录栏：宽度 / 收起 / 响应式 ---------- */

	const SB_MIN = 180;
	const SB_MAX = 520;
	const SB_DEFAULT = 256;
	const mqMobile = window.matchMedia('(max-width: 767px)');
	const storedW = Number(localStorage.getItem('editor:sidebar-w'));
	let sidebarW =
		Number.isFinite(storedW) && storedW >= SB_MIN
			? Math.min(SB_MAX, storedW)
			: SB_DEFAULT;
	let sidebarCollapsed =
		localStorage.getItem('editor:sidebar-collapsed') === '1' ||
		(localStorage.getItem('editor:sidebar-collapsed') === null &&
			mqMobile.matches);

	const applySidebar = () => {
		ui.sidebarWrap.style.setProperty('--sbw', `${sidebarW}px`);
		ui.sidebarWrap.classList.toggle('collapsed', sidebarCollapsed);
		const showBackdrop = !sidebarCollapsed && mqMobile.matches;
		ui.sidebarBackdrop.classList.toggle('hidden', !showBackdrop);
		if (showBackdrop && !reduceMotion.matches)
			ui.sidebarBackdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
				duration: 180,
			});
	};

	const setSidebarCollapsed = (v: boolean) => {
		if (sidebarCollapsed === v) return;
		sidebarCollapsed = v;
		localStorage.setItem('editor:sidebar-collapsed', v ? '1' : '0');
		applySidebar();
	};

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
		if (isImage(node.name)) {
			await openImage(node);
			return;
		}
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
			showModeToggle(true);
			treeView.setActive(node.path);
			layoutPanes();
			if (mode !== 'edit') void renderPreviewNow('reset');
			if (mqMobile.matches) setSidebarCollapsed(true);
		} catch (e) {
			toast(`打开失败：${errMsg(e)}`, 4000);
		}
	}

	async function openImage(node: TreeNode) {
		if (current?.path === node.path) return;
		if (!confirmDiscard()) return;
		try {
			const blob = await (node.handle as FileSystemFileHandle).getFile();
			if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);
			imageBlobUrl = URL.createObjectURL(blob);

			current = {
				handle: node.handle as FileSystemFileHandle,
				path: node.path,
				saved: '',
			};
			setDirty(false);
			ui.filePath.textContent = node.path;
			ui.fileInfo.classList.remove('hidden');
			ui.fileInfo.classList.add('flex');
			ui.btnSave.classList.add('hidden');
			showModeToggle(false);
			ui.preview.innerHTML = `<div class="flex h-full items-center justify-center p-4"><img src="${imageBlobUrl}" class="max-h-full max-w-full rounded-xl object-contain shadow-2xl" alt="${node.name}" /></div>`;
			layoutPanes();
			treeView.setActive(node.path);
			if (mqMobile.matches) setSidebarCollapsed(true);
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
		showModeToggle(false);
		ui.preview.textContent = '';
		if (imageBlobUrl) {
			URL.revokeObjectURL(imageBlobUrl);
			imageBlobUrl = '';
		}
		treeView.setActive(null);
		setDoc(view, '', editorCallbacks);
		// 恢复编辑模式
		setMode('edit');
		layoutPanes();
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
			b.addEventListener('click', () => setMode(b.dataset.mode as Mode)),
		);

	ui.btnSidebar.addEventListener('click', () =>
		setSidebarCollapsed(!sidebarCollapsed),
	);
	ui.sidebarBackdrop.addEventListener('click', () => setSidebarCollapsed(true));
	mqMobile.addEventListener('change', applySidebar);

	ui.sidebarResizer.addEventListener('pointerdown', (e) => {
		e.preventDefault();
		const left = ui.sidebarWrap.getBoundingClientRect().left;
		ui.sidebarWrap.classList.add('resizing');
		ui.sidebarResizer.classList.add('bg-accent/60');
		const move = (ev: PointerEvent) => {
			sidebarW = Math.min(
				SB_MAX,
				Math.max(SB_MIN, Math.round(ev.clientX - left)),
			);
			ui.sidebarWrap.style.setProperty('--sbw', `${sidebarW}px`);
		};
		const up = () => {
			ui.sidebarWrap.classList.remove('resizing');
			ui.sidebarResizer.classList.remove('bg-accent/60');
			localStorage.setItem('editor:sidebar-w', String(sidebarW));
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	});
	ui.sidebarResizer.addEventListener('dblclick', () => {
		sidebarW = SB_DEFAULT;
		localStorage.setItem('editor:sidebar-w', String(sidebarW));
		applySidebar();
	});
	applySidebar();

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
