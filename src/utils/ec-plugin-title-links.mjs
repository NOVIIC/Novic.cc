import { definePlugin } from 'rehype-expressive-code';
import { visit } from 'unist-util-visit';

/**
 * Expressive Code 插件：让代码块标题支持 Markdown 链接语法。
 *
 * 用法：
 *     ```js title="[示例来源](https://example.com)"
 *     ```
 * 标题中的 `[文字](URL)` 会渲染为 `<a>` 链接；其余文本原样保留。
 * 仅允许 `http://`、`https://` 与以 `/` 开头的站内路径，其它协议
 * （如 `javascript:`）按纯文本处理。外链在新标签页打开。
 *
 * 实现方式：frames 插件会把 title 原样转义渲染进 `span.title`，
 * 本插件在 `postprocessRenderedBlock` 钩子里找到该元素并把文本中的
 * 链接语法替换为真正的锚点节点。
 */

/** 匹配标题文本中的 [label](url) 片段（url 不含空白与右括号） */
const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** 判断 URL 是否允许渲染为链接 */
function isSafeUrl(url) {
	return /^(https?:\/\/|\/)/.test(url);
}

/**
 * 把一段标题文本解析为 hast 子节点数组；不含有效链接时返回 null
 * @param {string} value
 * @returns {import('hast').ElementContent[] | null}
 */
function linkifyTitleText(value) {
	/** @type {import('hast').ElementContent[]} */
	const children = [];
	LINK_PATTERN.lastIndex = 0;
	let lastIndex = 0;
	/** @type {RegExpExecArray | null} */
	let match;
	while ((match = LINK_PATTERN.exec(value)) !== null) {
		const [raw, label, url] = match;
		if (!isSafeUrl(url)) continue;
		if (match.index > lastIndex) {
			children.push({
				type: 'text',
				value: value.slice(lastIndex, match.index),
			});
		}
		const isExternal = /^https?:\/\//.test(url);
		children.push({
			type: 'element',
			tagName: 'a',
			properties: {
				href: url,
				...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
			},
			children: [{ type: 'text', value: label }],
		});
		lastIndex = match.index + raw.length;
	}
	if (children.length === 0) return null;
	if (lastIndex < value.length) {
		children.push({ type: 'text', value: value.slice(lastIndex) });
	}
	return children;
}

export function pluginTitleLinks() {
	return definePlugin({
		name: 'Title Links',
		baseStyles: () => `
			.frame .title a {
				color: inherit;
				text-decoration: underline;
				text-underline-offset: 0.2em;
			}
		`,
		hooks: {
			postprocessRenderedBlock({ renderData }) {
				visit(renderData.blockAst, 'element', (node) => {
					if (node.tagName !== 'span') return;
					const className = node.properties?.className;
					const isTitle = Array.isArray(className)
						? className.includes('title')
						: className === 'title';
					if (!isTitle) return;
					for (let i = 0; i < node.children.length; i++) {
						const child = node.children[i];
						if (child.type !== 'text') continue;
						const linked = linkifyTitleText(child.value);
						if (linked) node.children.splice(i, 1, ...linked);
					}
				});
			},
		},
	});
}
