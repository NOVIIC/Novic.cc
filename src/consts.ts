export const SITE_TITLE = 'Novic.cc';
export const SITE_DESCRIPTION = 'Novic 的个人博客 —— 记录技术、折腾与生活';
export const SITE_URL = 'https://novic.cc';
export const SITE_AUTHOR = 'Novic';

export const NOTES_TOPICS = [
	{
		slug: 'single-variable-calculus',
		title: '单变量微积分',
		description: '从极限、导数到积分，单变量微积分的学习笔记。',
	},
	{
		slug: 'multivariable-integration',
		title: '多元函数积分学',
		description: '二重、三重积分与曲线、曲面积分的学习笔记。',
	},
] as const;

export const NOTES_TOPIC_MAP = Object.fromEntries(
	NOTES_TOPICS.map((t) => [t.slug, t]),
) as Record<string, (typeof NOTES_TOPICS)[number]>;
