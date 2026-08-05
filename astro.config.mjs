// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';
import font from 'vite-plugin-font';
import remarkMath from 'remark-math';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

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
		remarkPlugins: [remarkMath],
		rehypePlugins: [
			rehypeSlug,
			rehypeKatex,
			[
				rehypeAutolinkHeadings,
				{
					behavior: 'append',
					properties: {
						className: ['heading-anchor'],
						ariaHidden: 'true',
						tabIndex: -1,
					},
				},
			],
		],
	},
});
