import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import { getNotesTree } from '../utils/notes';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
	const filter = ({ data }: { data: { draft: boolean } }) => !data.draft;

	const articles = (await getCollection('articles', filter)).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
	const notesTopics = await getNotesTree();
	const topicTitleBySlug = new Map(notesTopics.map((t) => [t.slug, t.title]));

	// intro 由主题首页承载，不作为独立条目进入 RSS
	const notes = (await getCollection('notes', filter))
		.filter((n) => n.id.split('/').slice(1).join('/') !== 'intro')
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

	const items = [
		...articles.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `/articles/${post.id}/`,
			categories: post.data.tags,
		})),
		...notes.map((note) => ({
			title: note.data.title,
			description: note.data.description,
			pubDate: note.data.pubDate,
			link: `/notes/${note.id}/`,
			categories: [topicTitleBySlug.get(note.id.split('/')[0])].filter(
				Boolean,
			) as string[],
		})),
	].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site!,
		items,
	});
}
