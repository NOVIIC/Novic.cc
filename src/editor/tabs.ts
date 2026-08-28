/** 顶栏标签页条：渲染 + 点击切换 / × 按钮 / 中键关闭。 */

export interface TabItem {
	/** 文件名（不含目录） */
	name: string;
	/** 相对根目录的完整路径（tooltip） */
	path: string;
	dirty: boolean;
}

export interface TabBarEvents {
	onActivate: (index: number) => void;
	onClose: (index: number) => void;
}

const CLOSE_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;

export class TabBar {
	constructor(
		private container: HTMLElement,
		private events: TabBarEvents,
	) {
		container.addEventListener('click', (e) => {
			const tab = (e.target as HTMLElement).closest<HTMLElement>('.tab');
			if (!tab) return;
			const i = Number(tab.dataset.i);
			if ((e.target as HTMLElement).closest('.tab-close'))
				this.events.onClose(i);
			else this.events.onActivate(i);
		});
		// 中键关闭
		container.addEventListener('auxclick', (e) => {
			if (e.button !== 1) return;
			const tab = (e.target as HTMLElement).closest<HTMLElement>('.tab');
			if (!tab) return;
			e.preventDefault();
			this.events.onClose(Number(tab.dataset.i));
		});
		// 阻止中键触发浏览器自动滚动
		container.addEventListener('mousedown', (e) => {
			if (e.button === 1 && (e.target as HTMLElement).closest('.tab'))
				e.preventDefault();
		});
	}

	render(items: TabItem[], active: number) {
		this.container.textContent = '';
		this.container.classList.toggle('hidden', items.length === 0);
		this.container.classList.toggle('flex', items.length > 0);
		items.forEach((item, i) => {
			const isActive = i === active;
			const el = document.createElement('div');
			el.className =
				'tab group flex h-8 max-w-44 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors ' +
				(isActive
					? 'border-accent/40 bg-accent/15 text-white'
					: 'border-transparent text-white/50 hover:bg-white/5 hover:text-white/85');
			el.dataset.i = String(i);
			el.title = item.path;

			const name = document.createElement('span');
			name.className = 'truncate';
			name.textContent = item.name;
			el.appendChild(name);

			if (item.dirty) {
				const dot = document.createElement('span');
				dot.className =
					'h-1.5 w-1.5 shrink-0 rounded-full bg-accent group-hover:hidden';
				dot.title = '有未保存的修改';
				el.appendChild(dot);
			}

			const close = document.createElement('button');
			close.className =
				'tab-close -mr-1 shrink-0 rounded p-0.5 text-white/40 transition-opacity hover:bg-white/10 hover:text-white ' +
				(item.dirty
					? 'hidden group-hover:block'
					: isActive
						? ''
						: 'opacity-0 group-hover:opacity-100');
			close.title = '关闭标签';
			close.setAttribute('aria-label', `关闭标签 ${item.name}`);
			close.innerHTML = CLOSE_SVG;
			close.querySelector('svg')?.classList.add('h-3', 'w-3');
			el.appendChild(close);

			this.container.appendChild(el);
		});
		// 激活标签滚入可视区
		this.container.children[active]?.scrollIntoView({
			block: 'nearest',
			inline: 'nearest',
		});
	}
}
