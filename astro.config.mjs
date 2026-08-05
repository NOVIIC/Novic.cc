// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';
import font from 'vite-plugin-font';
import { unified } from '@astrojs/markdown-remark';
import { remarkPlugins, rehypePlugins } from './src/utils/render-config.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://novic.cc',
	image: {
		layout: 'constrained',
	},
	prefetch: {
		prefetchAll: true,
		defaultStrategy: 'viewport',
	},
	integrations: [
		expressiveCode(),
		mdx(),
		sitemap({ filter: (page) => !page.includes('/editor') }),
	],
	vite: {
		plugins: [
			tailwindcss(),
			font.vite({
				include: [/\.woff2(\?|$)/i],
				scanFiles: ['src/**/*.{astro,ts,js,mdx,md}'],
			}),
		],
	},
	markdown: {
		// 与编辑器预览（src/editor/preview.ts）共用同一份 remark/rehype 配置
		// （src/utils/render-config.mjs）。
		// GFM 与智能标点已收进共享 remarkPlugins，这里关掉处理器默认避免叠加两次；
		// 注意此处的 false 必须与共享列表里的 remarkGfm/remarkSmartypants 保持同步，
		// 去掉任一都会导致对应特性全站缺失或重复应用（smartypants 重复应用不可幂等）。
		processor: unified({
			// 共享列表按 unified 的 PluggableList 类型导出（预览侧消费），形状比
			// Astro 的 RemarkPlugins/RehypePlugins 宽（含 Preset），此处需收窄强转。
			remarkPlugins:
				/** @type {import('@astrojs/markdown-remark').UnifiedProcessorOptions['remarkPlugins']} */ (
					remarkPlugins
				),
			rehypePlugins:
				/** @type {import('@astrojs/markdown-remark').UnifiedProcessorOptions['rehypePlugins']} */ (
					rehypePlugins
				),
			gfm: false,
			smartypants: false,
		}),
	},
});
