import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkLint from 'remark-lint';
import remarkLintNoUndefinedReferences from 'remark-lint-no-undefined-references';
import remarkLintNoUnusedDefinitions from 'remark-lint-no-unused-definitions';
import remarkValidateLinks from 'remark-validate-links';

const config = {
	plugins: [
		[remarkFrontmatter],
		[remarkGfm],
		[remarkMdx],
		[remarkLint],
		[remarkLintNoUndefinedReferences, { allowShortcutLink: true }],
		[remarkLintNoUnusedDefinitions],
		[remarkValidateLinks],
	],
};

export default config;
