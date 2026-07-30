import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '@/consts';
import { getNotesTree } from '@/utils/notes';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
	const filter = ({ data }: { data: { draft: boolean } }) => !data.draft;

	const articles = (await getCollection('articles', filter)).sort(
		(a, b) =>
			b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
			a.id.localeCompare(b.id),
	);
	const notesTopics = await getNotesTree();
	const validTopicSlugs = new Set(notesTopics.map((t) => t.slug));
	const topicTitleBySlug = new Map(notesTopics.map((t) => [t.slug, t.title]));

	// intro 由主题首页承载，不作为独立条目进入 RSS
	const notes = (await getCollection('notes', filter))
		.filter((n) => validTopicSlugs.has(n.id.split('/')[0]))
		.filter((n) => n.id.split('/').slice(1).join('/') !== 'intro')
		.sort(
			(a, b) =>
				b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
				a.id.localeCompare(b.id),
		);

	const items = [
		...articles.map((post) => ({
			id: post.id,
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `/articles/${post.id}/`,
			categories: post.data.tags,
		})),
		...notes.map((note) => {
			const topicTitle = topicTitleBySlug.get(note.id.split('/')[0]);
			// 标题前缀主题名，让 RSS 阅读器中能直接看到「主题 · 文章」层级关系；
			// categories 同时保留主题，便于按主题聚合订阅。
			return {
				id: note.id,
				title: topicTitle
					? `${topicTitle} · ${note.data.title}`
					: note.data.title,
				description: note.data.description,
				pubDate: note.data.pubDate,
				link: `/notes/${note.id}/`,
				categories: [topicTitle].filter(Boolean) as string[],
			};
		}),
	].sort(
		(a, b) =>
			b.pubDate.valueOf() - a.pubDate.valueOf() || a.id.localeCompare(b.id),
	);

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site!,
		items,
	});
}
