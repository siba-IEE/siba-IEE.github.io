/**
 * Génère le fond de carte de l'accueil (Afrique de l'Ouest et alentours) à partir de
 * Natural Earth 1:50m (paquet world-atlas, domaine public). Le résultat, des chemins SVG
 * déjà projetés, est committé dans src/data/west-africa-map.json : aucune dépendance
 * cartographique au build ni dans le navigateur.
 *
 * Projection : équirectangulaire à parallèle standard 10° N (au centre du réseau).
 *   x = (lon - LON0) * cos(10°) * S      y = (LAT0 - lat) * S
 * `land` réunit les polygones des pays : rempli, il donne les terres ; tracé, les frontières.
 * Les mêmes constantes sont réexportées dans le JSON pour placer les stations.
 *
 * Exécuter avec `pnpm map` (uniquement si l'emprise ou l'échelle change).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature, mesh } from 'topojson-client';

const require = createRequire(import.meta.url);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const OUT = join(scriptDir, '..', 'src', 'data', 'west-africa-map.json');

const LON0 = -45;
const LON1 = 30;
const LAT0 = 32;
const LAT1 = -10;
const S = 20;
const K = Math.cos((10 * Math.PI) / 180);

const px = (lon) => (lon - LON0) * K * S;
const py = (lat) => (LAT0 - lat) * S;
const r1 = (v) => Math.round(v * 5) / 5;

const topo = JSON.parse(await readFile(require.resolve('world-atlas/countries-50m.json'), 'utf8'));
const countries = feature(topo, topo.objects.countries).features;

const clampLon = (lon) => Math.min(LON1, Math.max(LON0, lon));
const clampLat = (lat) => Math.min(LAT0, Math.max(LAT1, lat));

/** Anneau -> sous-chemin SVG, points bornés à l'emprise et doublons retirés. */
function ringPath(ring) {
  let d = '';
  let last = '';
  for (const [lon, lat] of ring) {
    const pt = `${r1(px(clampLon(lon)))},${r1(py(clampLat(lat)))}`;
    if (pt === last) continue;
    d += (d ? 'L' : 'M') + pt;
    last = pt;
  }
  return d ? `${d}Z` : '';
}

const intersects = (ring) => {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return maxLon >= LON0 && minLon <= LON1 && maxLat >= LAT1 && minLat <= LAT0;
};

function polygonsPath(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let d = '';
  for (const poly of polys) {
    if (!intersects(poly[0])) continue;
    for (const ring of poly) d += ringPath(ring);
  }
  return d;
}

let land = '';
let guinea = '';
for (const country of countries) {
  const d = polygonsPath(country.geometry);
  if (!d) continue;
  land += d;
  if (country.properties.name === 'Guinea') guinea = d;
}

/** Lignes (frontières, côtes) : on coupe aux sorties de l'emprise. */
function linesPath(multiLine) {
  let d = '';
  for (const line of multiLine.coordinates) {
    let open = false;
    let last = '';
    for (const [lon, lat] of line) {
      const inside = lon >= LON0 && lon <= LON1 && lat >= LAT1 && lat <= LAT0;
      if (!inside) {
        open = false;
        continue;
      }
      const pt = `${r1(px(lon))},${r1(py(lat))}`;
      if (pt === last) continue;
      d += (open ? 'L' : 'M') + pt;
      open = true;
      last = pt;
    }
  }
  return d;
}

const coast = linesPath(mesh(topo, topo.objects.countries, (a, b) => a === b));

const out = {
  source: 'Natural Earth 1:50m (world-atlas), domaine public',
  projection: { lon0: LON0, lat0: LAT0, scale: S, k: K },
  width: r1(px(LON1)),
  height: r1(py(LAT1)),
  land,
  guinea,
  coast,
};

await writeFile(OUT, `${JSON.stringify(out)}\n`, 'utf8');
console.log(
  `[map] ${OUT} : terre ${land.length} o, cotes ${coast.length} o, Guinee ${guinea.length} o`,
);
