import { visit } from 'unist-util-visit';

/**
 * remark 插件：文章内链接处理
 * - 站外链接（http/https/协议相对，且非本站域名）：新标签页打开
 *   （target=_blank + rel="noopener noreferrer"）。
 * - 指向同库 .md/.mdx 的相对链接：按内容集合路由改写为站点 URL
 *   （如 ./linux-init.mdx#Shell-配置 → /articles/2026/linux-init#shell-配置）。
 *   改写依赖 Astro 传入的 file.path；编辑器预览无文件路径时保持原样。
 *
 * 由 render-config.mjs 注册进共享 remarkPlugins，主站与编辑器预览共用。
 */

/** 内容集合目录（对应 src/content/<collection>/<id>，路由为 /<collection>/<id>） */
const CONTENT_DIR_RE = /\/src\/content\/(articles|notes)\/(.+?)\.(?:md|mdx)$/i;

/** 以 / 分隔解析相对路径（baseDir 与 rel 都按 / 分隔，返回规范化绝对路径） */
function resolveRelativePath(baseDir, rel) {
	const stack = baseDir.split('/').filter(Boolean);
	for (const seg of rel.split('/')) {
		if (seg === '' || seg === '.') continue;
		if (seg === '..') stack.pop();
		else stack.push(seg);
	}
	return '/' + stack.join('/');
}

/**
 * 与 rehype-slug（github-slugger）生成标题 id 的规则对齐：
 * 小写、连续空白转单个连字符。作者手写的锚点（如 #Shell-配置）
 * 往往只是大小写/空白与真实 slug 不一致。
 */
function normalizeHash(hash) {
	return hash.toLowerCase().replace(/\s+/g, '-');
}

export const remarkArticleLinks = () => (tree, file) => {
	visit(tree, 'link', (node) => {
		const url = node.url;
		if (!url) return;

		if (/^(https?:)?\/\//i.test(url)) {
			let host;
			try {
				host = new URL(url.startsWith('//') ? 'https:' + url : url).hostname;
			} catch {
				return;
			}
			if (host === 'novic.cc' || host === 'www.novic.cc') return;
			const data = (node.data ??= {});
			data.hProperties = {
				...(data.hProperties ?? {}),
				target: '_blank',
				rel: 'noopener noreferrer',
			};
			return;
		}

		if (url.startsWith('/') || url.startsWith('#') || !file?.path) return;
		const m = /^([^#?]+\.mdx?)([#?].*)?$/i.exec(url);
		if (!m) return;
		const filePath = String(file.path).replaceAll('\\', '/');
		const baseDir = filePath.slice(0, filePath.lastIndexOf('/'));
		const cm = CONTENT_DIR_RE.exec(resolveRelativePath(baseDir, m[1]));
		if (!cm) return;
		let suffix = m[2] ?? '';
		if (suffix.startsWith('#')) {
			suffix = '#' + normalizeHash(decodeURIComponent(suffix.slice(1)));
		}
		node.url = `/${cm[1]}/${cm[2]}${suffix}`;
	});
};
