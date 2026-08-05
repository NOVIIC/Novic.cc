import { defineEcConfig } from 'astro-expressive-code';
import { ecOptions } from './src/utils/render-config.mjs';

// 与编辑器预览（src/editor/preview.ts）共用同一份 expressive-code 配置。
// 注意：站点侧经 astro-expressive-code 集成加载本文件后还会与 expressiveCode()
// 的集成选项深合并（仅 defaultProps/frames/shiki/styleOverrides）；若在
// astro.config.mjs 给 expressiveCode() 传 plugins，会整体替换这里的列表，
// 与预览产生分歧——改动前需两边同步。
export default defineEcConfig(ecOptions);
