interface FontSubsetCss {
	family: string;
	weight?: string | number;
	style?: string;
	[k: string]: unknown;
}

declare module '*.woff2' {
	export const css: FontSubsetCss;
}

declare module '*.woff2?subsets' {
	export const css: FontSubsetCss;
}
