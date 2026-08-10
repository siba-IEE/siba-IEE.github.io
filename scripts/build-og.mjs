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
const role = 'Ingenieur en efficacite energetique';
const meta = 'Fondateur de Kuma Science  ·  Conakry, Guinee';

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f1319"/>
      <stop offset="1" stop-color="#171b24"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0" r="0.8">
      <stop offset="0" stop-color="#d98324" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#d98324" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="1200" height="8" fill="#d98324"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <rect x="80" y="150" width="96" height="96" rx="20" fill="#d98324"/>
    <text x="128" y="216" font-size="56" font-weight="700" fill="#ffffff" text-anchor="middle">S</text>
    <text x="80" y="360" font-size="76" font-weight="700" fill="#ffffff">${name}</text>
    <text x="80" y="424" font-size="36" font-weight="600" fill="#e0a458">${role}</text>
    <text x="80" y="486" font-size="30" fill="#9aa4b2">${meta}</text>
    <text x="80" y="560" font-size="24" fill="#6b7686" letter-spacing="1">ORCID 0009-0002-8292-1905</text>
  </g>
</svg>`;

await mkdir(dirname(OUT), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log('[og] public/og.png genere.');
