/**
 * Garde-fou : aucun tiret cadratin dans le contenu visible.
 * Remplace U+2014 (—) par le point médian « · » dans les fichiers texte de src/.
 * Le demi-cadratin « – » reste autorisé (plages numériques : 2021–2025).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(scriptDir, '..', 'src');
const EXTENSIONS = new Set(['.astro', '.md', '.mdx', '.ts', '.tsx', '.json', '.css']);
const EMDASH = /—/g;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

let changed = 0;
for await (const file of walk(ROOT)) {
  const content = await readFile(file, 'utf8');
  if (EMDASH.test(content)) {
    await writeFile(file, content.replace(EMDASH, '·'), 'utf8');
    changed += 1;
    console.log(`[emdash] corrige : ${file}`);
  }
}
console.log(
  changed ? `[emdash] ${changed} fichier(s) nettoye(s).` : '[emdash] aucun cadratin trouve.',
);
