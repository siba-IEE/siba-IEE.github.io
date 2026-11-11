/**
 * Génère les frontières et les côtes de l'Afrique de l'Ouest pour le film de la page Travaux,
 * à partir de Natural Earth 1:50m (paquet world-atlas, domaine public). Le résultat, des
 * lignes en longitude et latitude, est committé dans src/data/borders.json.
 *
 * Exécuter avec `pnpm borders` (uniquement si l'emprise change).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mesh } from 'topojson-client';

const require = createRequire(import.meta.url);
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'borders.json');
const BOX = { west: -20, east: 17, south: 2, north: 21 };

const topo = JSON.parse(await readFile(require.resolve('world-atlas/countries-50m.json'), 'utf8'));
const inside = ([lon, lat]) =>
  lon >= BOX.west && lon <= BOX.east && lat >= BOX.south && lat <= BOX.north;
const round = (value) => Math.round(value * 100) / 100;

// Chaque ligne est coupée là où elle sort de l'emprise.
const lines = [];
for (const line of mesh(topo, topo.objects.countries).coordinates) {
  let current = [];
  for (const point of line) {
    if (inside(point)) {
      current.push([round(point[0]), round(point[1])]);
    } else {
      if (current.length > 1) lines.push(current);
      current = [];
    }
  }
  if (current.length > 1) lines.push(current);
}

await writeFile(OUT, `${JSON.stringify(lines)}\n`, 'utf8');
console.log(`[borders] ${lines.length} lignes, ${lines.reduce((n, l) => n + l.length, 0)} points.`);
