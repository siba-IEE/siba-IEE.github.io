# Portfolio · Siba Kalivogui

Portfolio personnel de Siba Kalivogui, ingénieur en efficacité énergétique et fondateur de Kuma Science. Site rapide, bilingue (FR/EN), éditable via un CMS git-based et déployé sur Cloudflare.

## Stack

- Astro 7 (sortie statique) + TypeScript strict
- Tailwind CSS v4 (jetons OKLCH, thème clair/sombre)
- Keystatic (CMS git-based) pour le contenu éditable
- API ORCID au build pour les publications
- i18n natif Astro (fr par défaut, en)
- Cloudflare Workers/Pages (`@astrojs/cloudflare`)
- Qualité : ESLint, Prettier, Stylelint, Vitest, Playwright, Husky

## Prérequis

- Node >= 22.12
- pnpm >= 10

## Commandes

| Commande | Effet |
| --- | --- |
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Snapshot ORCID + garde anti-cadratin + build Astro |
| `pnpm preview` | Prévisualisation du build |
| `pnpm fetch:orcid` | Régénère le snapshot des publications ORCID |
| `pnpm guard:emdash` | Remplace les tirets cadratins par un point médian |
| `pnpm typecheck` | Vérification de types (`astro check`) |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm test` | Tests unitaires (Vitest) |
| `pnpm e2e` | Tests bout en bout (Playwright) |

## Structure

- `src/lib/site.ts` : configuration centrale (identité, liens, ORCID)
- `src/lib/i18n.ts` : dictionnaire d'interface FR/EN
- `src/styles/global.css` : jetons de design (OKLCH) et base Tailwind
- `src/pages` : pages du site
- `scripts` : génération de snapshots et garde-fous

## Contenu

Le contenu éditorial (profil, projets, publications) est géré via Keystatic. Chaque édition écrit un fichier versionné par Git.

## Licence

Tous droits réservés.
