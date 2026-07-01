import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION, NOTES_TOPIC_MAP } from '../consts';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
	const filter = ({ data }: { data: { draft: boolean } }) => !data.draft;

	const articles = (await getCollection('articles', filter)).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
	const notes = (await getCollection('notes', filter)).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);

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
			categories: [NOTES_TOPIC_MAP[note.id.split('/')[0]]?.title].filter(
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
