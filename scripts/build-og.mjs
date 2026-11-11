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

// Même planche que l'accueil : papier, encre noire, un filet vermillon.
const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#f3efe8"/>
  <rect x="0" y="0" width="1200" height="10" fill="#1f1a17"/>
  <g font-family="Georgia, 'Times New Roman', serif">
    <text x="80" y="250" font-size="96" fill="#1f1a17" letter-spacing="-2">${name}</text>
    <text x="80" y="330" font-size="42" font-style="italic" fill="#d9431f">${role}</text>
  </g>
  <rect x="80" y="400" width="1040" height="2" fill="#1f1a17"/>
  <g font-family="Courier New, monospace" font-size="24" fill="#5c544c">
    <text x="80" y="456">${meta}</text>
    <text x="80" y="496">ORCID 0009-0002-8292-1905</text>
    <text x="1120" y="456" text-anchor="end">siba-iee.github.io</text>
  </g>
</svg>`;

await mkdir(dirname(OUT), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log('[og] public/og.png genere.');
