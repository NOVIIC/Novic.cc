import { defineEcConfig } from 'astro-expressive-code';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';

export default defineEcConfig({
	// 锁定为深色主题
	themes: ['slack-dark'],
	plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
});
