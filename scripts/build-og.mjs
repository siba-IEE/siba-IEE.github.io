/**
 * Génère la carte OpenGraph (1200x630) à partir d'un SVG, rasterisée via sharp.
 * Exécuter avec `pnpm og` après un changement de marque. Le PNG produit
 * (public/og.png) est committé comme asset statique : aucune dépendance sharp
 * au build Cloudflare.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const OUT = join(scriptDir, '..', 'public', 'og.png');

const name = 'Siba Kalivogui';
const role = 'Ingénieur en efficacité énergétique';
const meta = 'Fondateur de Kuma Science';

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f2036"/>
      <stop offset="1" stop-color="#16294a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0" r="0.85">
      <stop offset="0" stop-color="#38b5cc" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#38b5cc" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="1200" height="8" fill="#38b5cc"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <rect x="80" y="150" width="96" height="96" rx="20" fill="#2a4a7c"/>
    <text x="128" y="214" font-size="46" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="-1">SK</text>
    <text x="80" y="360" font-size="76" font-weight="700" fill="#f7f4ec">${name}</text>
    <text x="80" y="424" font-size="36" font-weight="600" fill="#45b8cd">${role}</text>
    <text x="80" y="486" font-size="30" fill="#9fb0c6">${meta}</text>
    <text x="80" y="560" font-size="24" fill="#6f8098" letter-spacing="1">ORCID 0009-0002-8292-1905</text>
  </g>
</svg>`;

await mkdir(dirname(OUT), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log('[og] public/og.png genere.');
