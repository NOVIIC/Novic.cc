export interface Frontmatter {
	title?: string;
	description?: string;
	pubDate?: number;
	updatedDate?: number;
	tags?: string[];
	draft?: boolean;
}

export interface TreeNode {
	name: string;
	/** 相对根目录的路径（根节点为 ''） */
	path: string;
	kind: 'directory' | 'file' | 'more';
	handle: FileSystemDirectoryHandle | FileSystemFileHandle | null;
	/** 目录子节点（已按站点排序逻辑排序） */
	children?: TreeNode[];
	/** md/mdx 文件的 frontmatter；目录则取其 intro 文件的 frontmatter */
	meta?: Frontmatter;
}

export const isMarkdown = (name: string): boolean => /\.(md|mdx)$/i.test(name);

export const isIntro = (name: string): boolean =>
	/^intro\.(md|mdx)$/i.test(name);
