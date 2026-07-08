// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';
import font from 'vite-plugin-font';
import { unified } from '@astrojs/markdown-remark';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// https://astro.build/config
export default defineConfig({
	site: 'https://novic.cc',
	image: {
		layout: 'constrained',
	},
	prefetch: {
		prefetchAll: true,
		defaultStrategy: 'hover',
	},
	integrations: [expressiveCode(), mdx(), sitemap()],
	vite: {
		plugins: [
			tailwindcss(),
			font.vite({
				include: [/\.woff2$/i],
			}),
		],
	},
	markdown: {
		processor: unified({
			rehypePlugins: [
				rehypeSlug,
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
		}),
	},
});
