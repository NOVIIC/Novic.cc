import { isMarkdown, type TreeNode } from './types';

export interface TreeEvents {
	onOpenFile: (node: TreeNode) => void;
	onCreate: (
		dirNode: TreeNode,
		kind: 'file' | 'directory',
		name: string,
	) => void;
	onRename: (node: TreeNode, newName: string) => void;
	onDelete: (node: TreeNode) => void;
}

const ICONS = {
	chevron: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 4 4-4 4"/></svg>`,
	file: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 1.5h-6v13h9v-9.5z"/><path d="M9.5 1.5v3h3"/></svg>`,
	folder: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 3.5h4l1.5 2h7.5v7h-13z"/></svg>`,
	rename: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.3 2.2a1.4 1.4 0 0 1 2 2l-8 8-3 .7.7-3z"/></svg>`,
	trash: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M6 4V2.5h4V4M3.5 4l.7 9.5h7.6l.7-9.5"/></svg>`,
	plus: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>`,
};

const icon = (svg: string, cls: string) => {
	const s = document.createElement('span');
	s.className = cls;
	s.innerHTML = svg;
	return s;
};

/** 目录树视图：渲染 + 折叠状态 + 行内新建/重命名。 */
export class TreeView {
	private collapsed = new Set<string>();
	private activePath: string | null = null;
	private editing = false;

	constructor(
		private container: HTMLElement,
		private events: TreeEvents,
	) {}

	setActive(path: string | null) {
		this.activePath = path;
		this.container
			.querySelectorAll('.tree-row.is-active')
			.forEach((el) => el.classList.remove('is-active'));
		if (path) {
			this.container
				.querySelector(`.tree-row[data-path="${CSS.escape(path)}"]`)
				?.classList.add('is-active');
		}
	}

	get isEditing() {
		return this.editing;
	}

	render(root: TreeNode) {
		this.rootNode = root;
		this.container.textContent = '';
		if (!root.children?.length) {
			const empty = document.createElement('p');
			empty.className = 'px-2 py-4 text-center text-xs text-white/30';
			empty.textContent = '空目录';
			this.container.appendChild(empty);
			return;
		}
		const ul = document.createElement('ul');
		ul.className = 'space-y-px';
		for (const child of root.children)
			ul.appendChild(this.renderNode(child, 0));
		this.container.appendChild(ul);
		if (this.activePath) this.setActive(this.activePath);
	}

	private renderNode(node: TreeNode, depth: number): HTMLLIElement {
		if (node.kind === 'more') {
			const li = document.createElement('li');
			const row = document.createElement('div');
			row.className =
				'flex cursor-default items-center gap-1 rounded-md py-1 pr-1 text-white/30';
			row.style.paddingLeft = `${depth * 14 + 22}px`;
			row.textContent = node.name;
			li.appendChild(row);
			return li;
		}

		const li = document.createElement('li');
		const row = document.createElement('div');
		row.className =
			'tree-row group flex cursor-pointer items-center gap-1 rounded-md py-1 pr-1 text-white/70 hover:bg-white/5 hover:text-white';
		row.style.paddingLeft = `${depth * 14 + 4}px`;
		row.dataset.path = node.path;
		row.title = node.path;

		// 折叠箭头 / 占位
		const caret = icon(
			ICONS.chevron,
			'h-3.5 w-3.5 shrink-0 transition-transform ' +
				(node.kind === 'directory' ? '' : 'invisible'),
		);
		row.appendChild(caret);

		row.appendChild(
			icon(
				node.kind === 'directory' ? ICONS.folder : ICONS.file,
				'h-3.5 w-3.5 shrink-0 ' +
					(node.kind === 'directory'
						? 'text-accent/80'
						: isMarkdown(node.name)
							? 'text-white/50'
							: 'text-white/25'),
			),
		);

		const label = document.createElement('span');
		label.className =
			'min-w-0 flex-1 truncate ' +
			(isMarkdown(node.name) || node.kind === 'directory'
				? ''
				: 'text-white/35');
		label.textContent = node.meta?.title
			? `${node.name} · ${node.meta.title}`
			: node.name;
		row.appendChild(label);

		// hover 操作按钮
		const actions = document.createElement('span');
		actions.className = 'hidden shrink-0 items-center gap-0.5 group-hover:flex';
		const mkBtn = (svg: string, title: string, onClick: () => void) => {
			const b = document.createElement('button');
			b.className =
				'rounded p-0.5 text-white/50 hover:bg-white/10 hover:text-white';
			b.title = title;
			b.innerHTML = svg;
			b.querySelector('svg')?.classList.add('h-3.5', 'w-3.5');
			b.addEventListener('click', (e) => {
				e.stopPropagation();
				onClick();
			});
			return b;
		};
		if (node.kind === 'directory') {
			actions.appendChild(
				mkBtn(ICONS.plus, '新建文件', () =>
					this.startInline(li, node, depth, 'file'),
				),
			);
			actions.appendChild(
				mkBtn(ICONS.folder, '新建文件夹', () =>
					this.startInline(li, node, depth, 'directory'),
				),
			);
		}
		actions.appendChild(
			mkBtn(ICONS.rename, '重命名', () => this.startRename(row, node)),
		);
		actions.appendChild(
			mkBtn(ICONS.trash, '删除', () => this.events.onDelete(node)),
		);
		row.appendChild(actions);

		li.appendChild(row);

		if (node.kind === 'directory') {
			row.addEventListener('click', () => {
				if (this.collapsed.has(node.path)) this.collapsed.delete(node.path);
				else this.collapsed.add(node.path);
				childWrap.classList.toggle('hidden');
				caret.classList.toggle('rotate-90');
			});
			const childWrap = document.createElement('ul');
			childWrap.className = 'space-y-px';
			for (const c of node.children ?? [])
				childWrap.appendChild(this.renderNode(c, depth + 1));
			if (this.collapsed.has(node.path)) childWrap.classList.add('hidden');
			else caret.classList.add('rotate-90');
			li.appendChild(childWrap);
		} else {
			row.addEventListener('click', () => this.events.onOpenFile(node));
		}
		return li;
	}

	/** 公开入口：在根目录顶部插入行内输入行（对应侧栏「+文件/+目录」按钮）。 */
	beginCreateInRoot(kind: 'file' | 'directory') {
		if (!this.rootNode) return;
		this.startInline(null, this.rootNode, -1, kind);
	}

	private rootNode: TreeNode | null = null;

	/** 在目录内插入行内输入行，用于新建文件/文件夹。 */
	private startInline(
		li: HTMLLIElement | null,
		dirNode: TreeNode,
		depth: number,
		kind: 'file' | 'directory',
	) {
		if (this.editing) return;
		let wrap: Element;
		if (li) {
			// 确保目录展开
			this.collapsed.delete(dirNode.path);
			li.querySelector(':scope > ul')?.classList.remove('hidden');
			li.querySelector(':scope > .tree-row > span:first-child')?.classList.add(
				'rotate-90',
			);
			wrap = li.querySelector(':scope > ul') ?? li;
		} else {
			wrap = this.container;
		}
		const row = document.createElement('div');
		row.className = 'flex items-center gap-1 py-1 pr-1';
		row.style.paddingLeft = `${(depth + 1) * 14 + 22}px`;
		const input = document.createElement('input');
		input.className =
			'w-full rounded border border-accent/50 bg-black/40 px-1.5 py-0.5 text-xs text-white outline-none';
		input.placeholder = kind === 'file' ? 'name.md' : '目录名';
		row.appendChild(input);
		wrap.prepend(row);
		this.editing = true;
		input.focus();

		let done = false;
		const finish = (commit: boolean) => {
			if (done) return;
			done = true;
			this.editing = false;
			const name = input.value.trim();
			row.remove();
			if (commit && name) this.events.onCreate(dirNode, kind, name);
		};
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') finish(true);
			if (e.key === 'Escape') finish(false);
			e.stopPropagation();
		});
		input.addEventListener('blur', () => finish(false));
	}

	/** 行内重命名。 */
	private startRename(row: HTMLElement, node: TreeNode) {
		if (this.editing) return;
		const label = row.querySelector('span:nth-child(3)') as HTMLElement;
		if (!label) return;
		this.editing = true;
		const input = document.createElement('input');
		input.className =
			'min-w-0 flex-1 rounded border border-accent/50 bg-black/40 px-1 py-0 text-xs text-white outline-none';
		input.value = node.name;
		label.replaceWith(input);
		input.focus();
		// 选中主文件名部分
		const dot = node.name.lastIndexOf('.');
		input.setSelectionRange(0, dot > 0 ? dot : node.name.length);

		let done = false;
		const finish = (commit: boolean) => {
			if (done) return;
			done = true;
			this.editing = false;
			const name = input.value.trim();
			if (commit && name && name !== node.name) {
				this.events.onRename(node, name);
			} else {
				input.replaceWith(label);
			}
		};
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') finish(true);
			if (e.key === 'Escape') finish(false);
			e.stopPropagation();
		});
		input.addEventListener('blur', () => finish(true));
		input.addEventListener('click', (e) => e.stopPropagation());
	}
}
