/**
 * 分屏滚动同步：移植 VSCode Markdown 预览的源码行号对齐算法。
 *
 * 核心思路（vscode markdown-language-features / preview-src/scroll-sync.ts）：
 *   - 渲染时给每个块级元素打 data-line（0-based 起始行）+ src-line class；
 *   - 预览侧构建按 DOM 顺序（即 line 单调递增）的 CodeLineElement 列表；
 *   - 编辑器→预览：取编辑器顶部"分数行号"，在列表里找到包夹元素，
 *     线性插值出像素位置（两档：间隙 / 末尾分数）；
 *   - 预览→编辑器：二分找到包夹元素，反向插值出分数行号；
 *   - 双向回声抑制：每个方向各一道 lock 标志。
 *
 * 与 VSCode 的差异：滚动容器不是 window 而是 #preview-container，
 * 所有坐标都是相对该容器内容盒的。
 */

const CODE_LINE_CLASS = 'src-line';

interface CodeLineElement {
	readonly element: HTMLElement;
	readonly line: number;
}

const isVisible = (el: HTMLElement): boolean => {
	if (!el.getBoundingClientRect) return false;
	const rect = el.getBoundingClientRect();
	if (rect.width === 0 && rect.height === 0) return false;
	const style = getComputedStyle(el);
	if (style.display === 'none' || style.visibility === 'hidden') return false;
	let node: Node | null = el;
	while (node) {
		if (
			node instanceof HTMLElement &&
			node.tagName === 'DETAILS' &&
			!node.hasAttribute('open')
		) {
			return false;
		}
		node = node.parentElement;
	}
	return true;
};

let _codeLineV: number | undefined;
let _codeLineList: CodeLineElement[] | undefined;
let _codeLineContainer: HTMLElement | undefined;

/**
 * Memoized CodeLineElement 列表，按 documentVersion 缓存。
 * 首项是哨兵 {element: container, line: -1}，让请求 line=0 也能解到包夹对。
 */
export function getCodeLineElements(
	container: HTMLElement,
	version: number,
): CodeLineElement[] {
	if (
		_codeLineList &&
		_codeLineV === version &&
		_codeLineContainer === container
	) {
		return _codeLineList;
	}
	const list: CodeLineElement[] = [{ element: container, line: -1 }];
	const elements = container.getElementsByClassName(CODE_LINE_CLASS);
	for (let i = 0; i < elements.length; i++) {
		const element = elements[i] as HTMLElement;
		const raw = element.getAttribute('data-line');
		const line = raw === null ? NaN : Number(raw);
		if (!Number.isFinite(line)) continue;

		if (element.tagName === 'UL' || element.tagName === 'OL') {
			// 第一个 <li> 与 <ul>/<ol> 同 data-line 且有真实高度，跳过容器
		} else {
			list.push({ element, line });
		}
	}
	_codeLineV = version;
	_codeLineList = list;
	_codeLineContainer = container;
	return list;
}

/** 清除缓存（容器被替换/重置时调用）。 */
export function invalidateCodeLineElements(): void {
	_codeLineV = undefined;
	_codeLineList = undefined;
	_codeLineContainer = undefined;
}

/** 元素相对容器内容盒的 top / height；嵌套 src-line 子节点时截到第一个子节点之前。 */
function getElementBounds(
	entry: CodeLineElement,
	container: HTMLElement,
): {
	top: number;
	height: number;
} {
	const el = entry.element;
	if (el === container) return { top: 0, height: 0 };
	const myBounds = el.getBoundingClientRect();
	const contBounds = container.getBoundingClientRect();
	const contTop = contBounds.top - container.scrollTop;
	let top = myBounds.top - contTop;
	let height = myBounds.height;

	const child = el.querySelector(`.${CODE_LINE_CLASS}`) as HTMLElement | null;
	if (child) {
		const childBounds = child.getBoundingClientRect();
		height = Math.max(1, childBounds.top - myBounds.top);
	}
	return { top, height };
}

interface Bracket {
	previous: CodeLineElement;
	next?: CodeLineElement;
}

/** 源码行 → 包夹元素（线性扫描；列表通常较小）。 */
export function getElementsForSourceLine(
	targetLine: number,
	container: HTMLElement,
	version: number,
): Bracket {
	const lineNumber = Math.floor(targetLine);
	const lines = getCodeLineElements(container, version);
	let previous = lines[0];
	for (const entry of lines) {
		if (entry.line === lineNumber) return { previous: entry };
		if (entry.line > lineNumber) return { previous, next: entry };
		previous = entry;
	}
	return { previous };
}

/**
 * 编辑器→预览：把预览容器滚动到源码行 `line`（0-based，可为分数）顶部。
 * 两档插值：两块间隙 / 末尾分数。代码块由 expressive-code 转为 &lt;figure&gt; 不可溯源，
 * 回退为所在段落的间隙插值。
 */
export function scrollToRevealSourceLine(
	line: number,
	container: HTMLElement,
	version: number,
): void {
	if (!Number.isFinite(line) || line <= 0) {
		container.scrollTop = 0;
		return;
	}
	const { previous, next } = getElementsForSourceLine(line, container, version);
	if (!previous) return;

	let scrollTo = 0;
	const rect = getElementBounds(previous, container);

	if (next && next.line !== previous.line) {
		// 两块间隙
		const betweenProgress =
			(line - previous.line) / (next.line - previous.line);
		const elementEnd = rect.top + rect.height;
		const nextTop = getElementBounds(next, container).top;
		scrollTo = elementEnd + betweenProgress * (nextTop - elementEnd);
	} else {
		// 末尾：用分数部分在 previous 内滚动
		const progressInElement = line - Math.floor(line);
		scrollTo = rect.top + rect.height * progressInElement;
	}

	container.scrollTop = Math.max(1, scrollTo);
}

/**
 * 预览→编辑器：给定预览容器当前的 scrollTop，返回它对应的源码行号（0-based，分数）。
 */
export function getEditorLineNumberForPageOffset(
	offset: number,
	container: HTMLElement,
	version: number,
): number {
	const lines = getCodeLineElements(container, version).filter((x) =>
		isVisible(x.element),
	);
	if (lines.length === 0) return 0;

	// 二分：找到 [top, top+height] 包含 position 的元素
	const position = offset;
	let lo = -1;
	let hi = lines.length - 1;
	while (lo + 1 < hi) {
		const mid = Math.floor((lo + hi) / 2);
		const bounds = getElementBounds(lines[mid], container);
		if (bounds.top + bounds.height >= position) hi = mid;
		else lo = mid;
	}

	const hiElement = lines[hi];
	const hiBounds = getElementBounds(hiElement, container);
	let previous: CodeLineElement;
	let next: CodeLineElement | undefined;
	if (hi >= 1 && hiBounds.top > position) {
		previous = lines[lo];
		next = hiElement;
	} else if (
		hi > 1 &&
		hi < lines.length &&
		hiBounds.top + hiBounds.height > position
	) {
		previous = hiElement;
		next = lines[hi + 1];
	} else {
		previous = hiElement;
	}

	const previousBounds = getElementBounds(previous, container);
	const offsetFromPrevious = position - previousBounds.top;

	if (next) {
		const nextBounds = getElementBounds(next, container);
		const span = nextBounds.top - previousBounds.top;
		if (span > 0) {
			const progress = offsetFromPrevious / span;
			return Math.max(
				0,
				previous.line + progress * (next.line - previous.line),
			);
		}
	}
	if (previousBounds.height > 0) {
		return Math.max(
			0,
			previous.line + offsetFromPrevious / previousBounds.height,
		);
	}
	return Math.max(0, previous.line);
}
