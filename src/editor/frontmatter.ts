import { load } from 'js-yaml';
import type { Frontmatter } from './types';

const FM_RE = /^\s*---\r?\n([\s\S]*?)\r?\n---/;

const toTime = (v: unknown): number | undefined => {
	if (v == null || v === '') return undefined;
	const t = new Date(v as string | number | Date).valueOf();
	return Number.isNaN(t) ? undefined : t;
};

/** 解析 md/mdx 源码中的 YAML frontmatter，失败时返回空对象。 */
export function parseFrontmatter(source: string): Frontmatter {
	const m = FM_RE.exec(source);
	if (!m) return {};
	let raw: unknown;
	try {
		raw = load(m[1]);
	} catch {
		return {};
	}
	if (!raw || typeof raw !== 'object') return {};
	const o = raw as Record<string, unknown>;
	return {
		title: typeof o.title === 'string' ? o.title : undefined,
		description: typeof o.description === 'string' ? o.description : undefined,
		pubDate: toTime(o.pubDate),
		updatedDate: toTime(o.updatedDate),
		tags: Array.isArray(o.tags)
			? o.tags.filter((t): t is string => typeof t === 'string')
			: undefined,
		draft: typeof o.draft === 'boolean' ? o.draft : undefined,
	};
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 新建 md/mdx 文件的 frontmatter 模板（与 content.config.ts 的 schema 对齐）。 */
export function newFileTemplate(): string {
	const d = new Date();
	const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	return `---\ntitle: ''\ndescription: ''\npubDate: ${date}\ntags: []\ndraft: true\n---\n\n`;
}
