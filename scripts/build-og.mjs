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

// Même ouverture que l'accueil : fond gris, disque jaune, grotesque noire.
const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#ededed"/>
  <circle cx="820" cy="300" r="270" fill="#ffff00"/>
  <g font-family="Helvetica, Arial, sans-serif" fill="#0a0a0a" letter-spacing="-3">
    <text x="70" y="250" font-size="92" font-weight="700">${name}</text>
    <text x="110" y="345" font-size="64">${role}</text>
    <text x="70" y="440" font-size="64">${meta}</text>
  </g>
  <text x="70" y="570" font-family="Courier New, monospace" font-size="22" fill="#5a5a5a">siba-iee.github.io</text>
</svg>`;

await mkdir(dirname(OUT), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log('[og] public/og.png genere.');
