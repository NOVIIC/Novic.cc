import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'brand', 'logo.png');
const outDir = join(root, 'public');

const render = (size) =>
	sharp(src).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();

await mkdir(outDir, { recursive: true });

// 仅生成主站图标；主站非 PWA，无需 192/512
// editor 保持原 favicon.svg + editor-icons，不纳入此脚本
const pngs = [
	['favicon-16x16.png', 16],
	['favicon-32x32.png', 32],
	['apple-touch-icon.png', 180],
];

for (const [name, size] of pngs) {
	const dest = join(outDir, name);
	await mkdir(dirname(dest), { recursive: true });
	await writeFile(dest, await render(size));
	console.log(`✓ ${name} (${size}x${size})`);
}

// ICO 容器直接内嵌 PNG 数据（Windows Vista+ / 现代浏览器均支持）
const icoSizes = [16, 32, 48];
const blobs = await Promise.all(icoSizes.map(render));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);

let offset = 6 + icoSizes.length * 16;
const entries = icoSizes.map((size, i) => {
	const entry = Buffer.alloc(16);
	entry.writeUInt8(size >= 256 ? 0 : size, 0);
	entry.writeUInt8(size >= 256 ? 0 : size, 1);
	entry.writeUInt8(0, 2);
	entry.writeUInt8(0, 3);
	entry.writeUInt16LE(1, 4);
	entry.writeUInt16LE(32, 6);
	entry.writeUInt32LE(blobs[i].length, 8);
	entry.writeUInt32LE(offset, 12);
	offset += blobs[i].length;
	return entry;
});

await writeFile(
	join(outDir, 'favicon.ico'),
	Buffer.concat([header, ...entries, ...blobs]),
);
console.log(`✓ favicon.ico (${icoSizes.join('/')})`);
