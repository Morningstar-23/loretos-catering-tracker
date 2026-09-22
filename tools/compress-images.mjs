/**
 * tools/compress-images.mjs — optional desktop helper.
 *
 * The app already compresses every photo on the phone (js/image.js).
 * Use this only when you have a folder of photos on a laptop and want to
 * seed them in bulk: it writes a backup-shaped JSON you can paste into
 * Setup > Restore, so the 5s never has to decode a 4 MB original.
 *
 *   npm install sharp
 *   node tools/compress-images.mjs ./photos ./seed-photos.json
 *
 * File names become gear names: "chafing-dish.jpg" -> "Chafing dish".
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';

const FULL_MAX = 900, THUMB_MAX = 128, QUALITY = 70;
const OK = ['.jpg', '.jpeg', '.png', '.heic', '.webp'];

const [, , srcDir = './photos', outFile = './seed-photos.json'] = process.argv;

const toDataUrl = (buf) => 'data:image/jpeg;base64,' + buf.toString('base64');

const resize = (buf, max) =>
  sharp(buf).rotate().resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();

const titleise = (f) =>
  basename(f, extname(f)).replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

const files = (await readdir(srcDir)).filter((f) => OK.includes(extname(f).toLowerCase()));
if (!files.length) {
  console.error(`No images in ${srcDir}`);
  process.exit(1);
}

const items = [], photos = {};
let before = 0, after = 0;

for (const f of files) {
  const buf = await readFile(join(srcDir, f));
  const full = await resize(buf, FULL_MAX);
  const thumb = await resize(buf, THUMB_MAX);
  const id = 'ph-' + Math.random().toString(36).slice(2, 10);

  photos[id] = toDataUrl(full);
  photos[id + '-t'] = toDataUrl(thumb);
  items.push({
    id: 'i-' + Math.random().toString(36).slice(2, 10),
    name: titleise(f), categoryId: '', qty: 1, unit: 'pc',
    tagLabel: '', tagColor: 'orange', tagStyle: 'tape',
    note: '', photoId: id,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });

  before += buf.length; after += full.length + thumb.length;
  console.log(`${f.padEnd(34)} ${(buf.length / 1024 | 0)} KB -> ${((full.length + thumb.length) / 1024 | 0)} KB`);
}

await writeFile(outFile, JSON.stringify({
  app: 'loretos-catering-tracker', v: 1, exportedAt: new Date().toISOString(),
  note: 'Seed file. Merge these items into a real export before restoring.',
  items, photos
}, null, 0));

console.log(`\n${files.length} photos  ${(before / 1048576).toFixed(1)} MB -> ${(after / 1024 | 0)} KB  →  ${outFile}`);
