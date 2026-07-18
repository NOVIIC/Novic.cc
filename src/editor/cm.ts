import { EditorState, StateField, RangeSet } from '@codemirror/state';
import {
	EditorView,
	keymap,
	highlightActiveLine,
	highlightActiveLineGutter,
	lineNumbers,
	drawSelection,
	dropCursor,
	placeholder,
	Decoration,
	type DecorationSet,
} from '@codemirror/view';
import {
	defaultKeymap,
	history,
	historyKeymap,
	indentWithTab,
} from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import {
	defaultHighlightStyle,
	syntaxHighlighting,
	HighlightStyle,
} from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { tags } from '@lezer/highlight';

/** 把文档开头的 YAML frontmatter 块（--- 到 ---）整体灰化。 */
const frontmatterDim = StateField.define<DecorationSet>({
	create(state) {
		return dimFrontmatter(state);
	},
	update(deco, tr) {
		return tr.docChanged ? dimFrontmatter(tr.state) : deco;
	},
	provide: (f) => EditorView.decorations.from(f),
});

function dimFrontmatter(state: EditorState): DecorationSet {
	const first = state.doc.line(1);
	if (first.text.trim() !== '---') return RangeSet.empty;
	for (let n = 2; n <= state.doc.lines; n++) {
		const line = state.doc.line(n);
		if (line.text.trim() === '---') {
			const deco = Decoration.line({ class: 'cm-frontmatter' });
			const ranges = [];
			for (let i = 1; i <= n; i++)
				ranges.push(deco.range(state.doc.line(i).from));
			return RangeSet.of(ranges);
		}
	}
	return RangeSet.empty;
}

const highlight = HighlightStyle.define([
	{
		tag: tags.heading1,
		color: '#d2a8ff',
		fontWeight: '700',
		fontSize: '1.25em',
	},
	{
		tag: tags.heading2,
		color: '#d2a8ff',
		fontWeight: '700',
		fontSize: '1.15em',
	},
	{ tag: tags.heading3, color: '#d2a8ff', fontWeight: '600' },
	{
		tag: [tags.heading4, tags.heading5, tags.heading6],
		color: '#c4b5fd',
		fontWeight: '600',
	},
	{ tag: tags.strong, color: '#ffffff', fontWeight: '700' },
	{ tag: tags.emphasis, color: '#e5e9f0', fontStyle: 'italic' },
	{ tag: tags.strikethrough, textDecoration: 'line-through', color: '#8b949e' },
	{ tag: tags.link, color: '#79c0ff', textDecoration: 'underline' },
	{ tag: tags.url, color: '#79c0ff' },
	{ tag: tags.monospace, color: '#a5d6ff' },
	{ tag: tags.quote, color: '#8b949e', fontStyle: 'italic' },
	{
		tag: [tags.meta, tags.comment, tags.processingInstruction],
		color: '#8b949e',
	},
	{ tag: [tags.propertyName, tags.attributeName], color: '#7ee787' },
	{ tag: [tags.attributeValue, tags.string], color: '#a5d6ff' },
	{ tag: [tags.tagName], color: '#7ee787' },
	{ tag: [tags.number, tags.bool, tags.null], color: '#ffa657' },
	{ tag: [tags.keyword, tags.operator], color: '#ff7b72' },
	{ tag: [tags.contentSeparator], color: '#6e39e0', fontWeight: '700' },
	{ tag: [tags.labelName, tags.punctuation], color: '#9f8c60' },
]);

const theme = EditorView.theme(
	{
		'&': {
			height: '100%',
			fontSize: '0.875rem',
			backgroundColor: 'transparent',
			color: '#e5e9f0',
		},
		'.cm-content': {
			fontFamily: 'var(--font-mono)',
			padding: '1rem 0.75rem 40vh',
			caretColor: '#c4b5fd',
		},
		'.cm-scroller': {
			fontFamily: 'var(--font-mono)',
			lineHeight: '1.75',
			overflow: 'auto',
		},
		'.cm-gutters': {
			backgroundColor: 'transparent',
			color: 'rgb(255 255 255 / 0.25)',
			border: 'none',
			paddingLeft: '0.5rem',
		},
		'.cm-activeLine': { backgroundColor: 'rgb(255 255 255 / 0.04)' },
		'.cm-activeLineGutter': {
			backgroundColor: 'transparent',
			color: 'rgb(255 255 255 / 0.6)',
		},
		'&.cm-focused': { outline: 'none' },
		'.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
			backgroundColor: 'rgb(110 57 224 / 0.28) !important',
		},
		'.cm-cursor': { borderLeftColor: '#c4b5fd' },
		'.cm-placeholder': { color: 'rgb(255 255 255 / 0.3)' },
		'.cm-frontmatter, .cm-frontmatter span': { color: '#8b949e !important' },
		'.cm-panels': {
			backgroundColor: '#0b1020',
			color: '#e5e9f0',
			border: '1px solid rgb(255 255 255 / 0.1)',
		},
		'.cm-searchMatch': {
			backgroundColor: 'rgb(110 57 224 / 0.35)',
			outline: '1px solid rgb(110 57 224 / 0.6)',
		},
	},
	{ dark: true },
);

export interface EditorCallbacks {
	onDocChanged: (doc: string) => void;
	onSave: () => void;
}

function buildState(doc: string, callbacks: EditorCallbacks): EditorState {
	return EditorState.create({
		doc,
		extensions: [
			lineNumbers(),
			highlightActiveLineGutter(),
			history(),
			drawSelection(),
			dropCursor(),
			EditorState.allowMultipleSelections.of(true),
			EditorView.lineWrapping,
			highlightActiveLine(),
			highlightSelectionMatches(),
			placeholder('从左侧选择或新建一个 Markdown 文件开始写作…'),
			markdown({
				base: markdownLanguage,
				codeLanguages: languages,
				addKeymap: true,
			}),
			frontmatterDim,
			syntaxHighlighting(highlight),
			syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
			theme,
			keymap.of([
				{
					key: 'Mod-s',
					preventDefault: true,
					run: () => {
						callbacks.onSave();
						return true;
					},
				},
				indentWithTab,
				...defaultKeymap,
				...historyKeymap,
				...searchKeymap,
			]),
			EditorView.updateListener.of((u) => {
				if (u.docChanged) callbacks.onDocChanged(u.state.doc.toString());
			}),
		],
	});
}

export function createEditor(
	parentEl: HTMLElement,
	callbacks: EditorCallbacks,
): EditorView {
	return new EditorView({
		parent: parentEl,
		state: buildState('', callbacks),
	});
}

/** 载入新文档（重建 state，同时清空撤销历史，避免撤销串到上一个文件）。 */
export function setDoc(
	view: EditorView,
	doc: string,
	callbacks: EditorCallbacks,
) {
	view.setState(buildState(doc, callbacks));
}
