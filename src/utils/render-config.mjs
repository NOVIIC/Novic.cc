import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkSmartypants from 'remark-smartypants';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginTitleLinks } from './ec-plugin-title-links.mjs';

/**
 * 主站（astro.config.mjs / ec.config.mjs）与编辑器预览（src/editor/preview.ts）
 * 共用的内容渲染配置，同时覆盖 .md 与 .mdx。要调整渲染行为只改这一份。
 *
 * 导出的数组/对象为共享只读配置，勿在原处 push/修改；astro-expressive-code
 * 集成会在 unified() 的拷贝上追加插件（见 astro.config.mjs）。
 */

/** 标题锚点样式（rehype-autolink-headings 选项，仅 rehypePlugins 内联使用） */
const autolinkHeadingsOptions = {
	behavior: 'append',
	properties: {
		className: ['heading-anchor'],
		ariaHidden: 'true',
		tabIndex: -1,
	},
};

/**
 * remark 插件
 * @type {import('unified').PluggableList}
 */
export const remarkPlugins = [remarkGfm, remarkMath, remarkSmartypants];

/**
 * rehype 插件
 * @type {import('unified').PluggableList}
 */
export const rehypePlugins = [
	rehypeSlug,
	rehypeKatex,
	[rehypeAutolinkHeadings, autolinkHeadingsOptions],
];

/**
 * expressive-code 配置：主题与插件
 * @type {import('rehype-expressive-code').RehypeExpressiveCodeOptions}
 */
export const ecOptions = {
	themes: ['slack-dark'],
	plugins: [
		pluginLineNumbers(),
		pluginCollapsibleSections(),
		pluginTitleLinks(),
	],
};
