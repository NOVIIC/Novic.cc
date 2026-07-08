declare module '*.woff2' {
	export const css: {
		family: string;
		weight?: string | number;
		style?: string;
		[k: string]: unknown;
	};
}
