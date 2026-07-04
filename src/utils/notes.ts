import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export interface NotesTopic {
	slug: string;
	intro: CollectionEntry<'notes'> | undefined;
	title: string;
	description: string;
	tags: string[];
	articles: CollectionEntry<'notes'>[];
}

const isIntro = (entry: CollectionEntry<'notes'>) =>
	entry.id.split('/').slice(1).join('/') === 'intro';

const draftFilter = ({ data }: { data: { draft: boolean } }) =>
	import.meta.env.PROD ? !data.draft : true;

export async function getNotesTree(): Promise<NotesTopic[]> {
	const notes = await getCollection('notes', draftFilter);
	const byTopic = new Map<string, CollectionEntry<'notes'>[]>();
	for (const n of notes) {
		const topic = n.id.split('/')[0];
		if (!byTopic.has(topic)) byTopic.set(topic, []);
		byTopic.get(topic)!.push(n);
	}

	const topics: NotesTopic[] = [...byTopic.entries()].map(([slug, items]) => {
		const intro = items.find(isIntro);
		const articles = items
			.filter((n) => !isIntro(n))
			.sort((a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
		return {
			slug,
			intro,
			title: intro?.data.title ?? slug,
			description: intro?.data.description ?? '',
			tags: intro?.data.tags ?? [],
			articles,
		};
	});

	topics.sort(
		(a, b) =>
			(a.intro?.data.pubDate.valueOf() ?? 0) -
			(b.intro?.data.pubDate.valueOf() ?? 0),
	);
	return topics;
}

export interface NotesTag {
	tag: string;
	count: number;
}

export async function getNotesTags(): Promise<NotesTag[]> {
	const topics = await getNotesTree();
	const counts = new Map<string, number>();
	for (const t of topics) {
		for (const tag of t.tags) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * 解析 Notes 路径，返回当前激活的主题/文章 slug（用于目录树高亮）。
 * 排除 /notes/tags/... 标签页。
 */
export function parseNotesPath(pathname: string): {
	activeTopicSlug?: string;
	activeArticleSlug?: string;
} {
	const m = pathname.match(
		/^\/notes\/(?!tags(?:\/|$))([^/]+)(?:\/([^/]+))?\/?$/,
	);
	if (!m) return {};
	return { activeTopicSlug: m[1], activeArticleSlug: m[2] };
}
