import { unified, type PluggableList } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkSmartypants from 'remark-smartypants';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';
import rehypeExpressiveCode, {
	type RehypeExpressiveCodeOptions,
} from 'rehype-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { parseFrontmatter } from './frontmatter';
import type { Frontmatter } from './types';

/* 与站点 astro.config.mjs / ec.config.mjs 对齐的插件配置 */
const autolinkOptions = {
	behavior: 'append' as const,
	properties: {
		className: ['heading-anchor'],
		ariaHidden: 'true',
		tabIndex: -1,
	},
};

const ecOptions: RehypeExpressiveCodeOptions = {
	plugins: [pluginLineNumbers()],
	styleOverrides: {
		// 与 ec.config.mjs 对齐（codeBorder 在 EC 0.44 中已是无效键，站点实际生效的只有 codeBackground）
		codeBackground: '#0b1020',
	},
};

const remarkPlugins: PluggableList = [
	remarkFrontmatter,
	remarkGfm,
	remarkSmartypants,
];

const rehypePlugins: PluggableList = [
	rehypeSlug,
	[rehypeAutolinkHeadings, autolinkOptions],
	[rehypeExpressiveCode, ecOptions],
];

/** .md：unified 管线直接输出 HTML 字符串。 */
async function renderMd(source: string): Promise<string> {
	const file = await unified()
		.use(remarkParse)
		.use(remarkPlugins)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeRaw)
		.use(rehypePlugins)
		.use(rehypeStringify)
		.process(source);
	return String(file);
}

/** .mdx：MDX 运行时编译（evaluate + preact），再序列化为 HTML 字符串。 */
async function renderMdx(source: string): Promise<string> {
	const [{ evaluate }, runtime, { createElement }, { renderToString }] =
		await Promise.all([
			import('@mdx-js/mdx'),
			import('preact/jsx-runtime'),
			import('preact'),
			import('preact-render-to-string'),
		]);
	type EvaluateOptions = Parameters<typeof evaluate>[1];
	const mod = await evaluate(source, {
		...(runtime as unknown as EvaluateOptions),
		remarkPlugins,
		rehypePlugins,
	});
	const Content = mod.default as Parameters<typeof createElement>[0];
	return renderToString(createElement(Content, {}));
}

const fmtDate = (t: number) =>
	new Date(t).toLocaleDateString('zh-CN', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function headerHtml(fm: Frontmatter): string {
	if (!fm.title && !fm.pubDate) return '';
	const dateRow = fm.pubDate
		? `<span>发布于 <time>${fmtDate(fm.pubDate)}</time></span>${
				fm.updatedDate
					? `<span> · 更新于 <time>${fmtDate(fm.updatedDate)}</time></span>`
					: ''
			}`
		: '';
	const tags =
		fm.tags && fm.tags.length
			? `<div class="mt-3 flex flex-wrap gap-2 text-xs">${fm.tags
					.map(
						(t) =>
							`<span class="content-bg rounded-full px-2.5 py-0.5 text-white/70">#${esc(t)}</span>`,
					)
					.join('')}</div>`
			: '';
	const draft = fm.draft
		? '<span class="ml-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 align-middle text-xs text-amber-300">draft</span>'
		: '';
	return `<header class="not-prose mb-8"><h1 class="text-3xl font-bold text-white sm:text-4xl">${esc(
		fm.title ?? '（无标题）',
	)}${draft}</h1><div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray">${dateRow}</div>${tags}</header>`;
}

/** 把预览中的相对路径图片替换为本地文件的 blob URL。 */
let blobUrls: string[] = [];

async function resolveImages(
	container: HTMLElement,
	root: FileSystemDirectoryHandle,
	fileDir: string,
): Promise<void> {
	const prevUrls = blobUrls;
	blobUrls = [];
	try {
		const imgs = container.querySelectorAll('img');
		for (const img of imgs) {
			const src = img.getAttribute('src');
			if (!src || /^(https?:|data:|blob:|\/)/.test(src)) continue;
			try {
				const parts = [...fileDir.split('/').filter(Boolean), ...src.split('/')];
				const stack: string[] = [];
				for (const p of parts) {
					if (p === '.') continue;
					if (p === '..') stack.pop();
					else stack.push(p);
				}
				const fileName = stack.pop();
				if (!fileName) continue;
				let dir = root;
				for (const seg of stack) dir = await dir.getDirectoryHandle(seg);
				const fh = await dir.getFileHandle(fileName);
				const url = URL.createObjectURL(await fh.getFile());
				blobUrls.push(url);
				img.src = url;
			} catch {
				img.classList.add('opacity-40');
				img.title = `找不到图片：${src}`;
			}
		}
	} finally {
		for (const u of prevUrls) URL.revokeObjectURL(u);
	}
}

export interface PreviewOptions {
	source: string;
	isMdx: boolean;
	container: HTMLElement;
	root: FileSystemDirectoryHandle;
	/** 当前文件所在目录（相对根目录，'' 表示根） */
	fileDir: string;
}

/** 渲染预览：与 ContentLayout 相同的 prose 容器与文章头部。 */
export async function renderPreview(opts: PreviewOptions): Promise<void> {
	const { source, isMdx, container } = opts;
	let body: string;
	const fm = parseFrontmatter(source);
	try {
		body = isMdx ? await renderMdx(source) : await renderMd(source);
	} catch (e) {
		container.innerHTML = `<div class="mx-auto max-w-3xl p-6"><div class="content-bg border-red-400/40 p-4 font-mono text-xs whitespace-pre-wrap text-red-300">${esc(
			e instanceof Error ? (e.stack ?? e.message) : String(e),
		)}</div></div>`;
		return;
	}
	container.innerHTML = `<article class="prose prose-invert max-w-none prose-headings:scroll-mt-32 prose-pre:bg-transparent prose-pre:p-0"><div class="mx-auto max-w-3xl"><div class="content-bg min-w-0 px-2 py-6 sm:p-7">${headerHtml(fm)}<div>${body}</div></div></div></article>`;
	await resolveImages(container, opts.root, opts.fileDir);
}
