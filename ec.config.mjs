import { defineEcConfig } from 'astro-expressive-code';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';

export default defineEcConfig({
	plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
	styleOverrides: {
		codeBackground: '#0b1020',
		codeBorder: '#1e293b',
	},
});
