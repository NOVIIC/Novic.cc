import type { CollectionEntry } from 'astro:content';

/**
 * 统计文章正文字数（中文字符数 + 英文单词数）。
 * 会先剥离图片、链接、HTML 与 Markdown 标记符号，使结果更贴近实际阅读量。
 */
export function countWords(
	entry: CollectionEntry<'articles' | 'notes'>,
): number {
	const body = entry.body ?? '';
	const text = body
		// 图片
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		// 链接：保留链接文本
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		// HTML / JSX 标签
		.replace(/<\/?[a-zA-Z][^>]*>/g, '')
		// Markdown 标记符号
		.replace(/[#>*_~]/g, '');

	const cjk = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length;
	const en = (text.match(/[a-zA-Z]+/g) ?? []).length;

	return cjk + en;
}

/**
 * 格式化字数显示：万以下以「字」为单位，万以上以「万字」为单位。
 */
export function formatWordCount(count: number): string {
	if (count >= 10000) {
		return `${(count / 10000).toFixed(1)} 万字`;
	}
	return `${count} 字`;
}
