/**
 * Mise en scène du film de chaque réalisation : le décor vectoriel et les détails qui
 * s'affichent au fil des explications. Les faits viennent des fiches de src/content/projects.
 */
import type { Lang } from '../lib/i18n';

type Label = Record<Lang, string>;

export type FilmScene =
  | { kind: 'territory'; country: 'gn' | 'ci' }
  | { kind: 'engine'; inputs: Label[]; core: Label; output: Label }
  | { kind: 'solar' };

export interface Film {
  scene: FilmScene;
  details: Label[];
}

const same = (text: string): Label => ({ fr: text, en: text });

export const films: Record<string, Film> = {
  'rnde-guinee': {
    scene: { kind: 'territory', country: 'gn' },
    details: [
      { fr: '340 sous-préfectures', en: '340 sub-prefectures' },
      { fr: '374 fiches territoriales', en: '374 territory sheets' },
      same('WMS · WFS · API'),
      same('ISO 19115 · CSW · DCAT'),
    ],
  },
  'rds-guinee': {
    scene: { kind: 'territory', country: 'gn' },
    details: [
      { fr: '34 chefs-lieux de préfecture', en: '34 prefecture capitals' },
      same('1981 – 2025'),
      { fr: 'Niveau A : station de Kankan', en: 'Level A: Kankan station' },
      same('CC BY 4.0 · Zenodo'),
    ],
  },
  'rds-cote-divoire': {
    scene: { kind: 'territory', country: 'ci' },
    details: [
      { fr: '142 localités', en: '142 localities' },
      same('1991 – 2025'),
      same('GHI · DNI · DHI'),
      { fr: 'Niveau de confiance B', en: 'Confidence level B' },
    ],
  },
  'kuma-data-core': {
    scene: {
      kind: 'engine',
      inputs: [
        same('NASA POWER'),
        same('SARAH-3'),
        same('CAMS'),
        same('ERA5-Land'),
        { fr: 'Mesures au sol', en: 'Ground measurements' },
      ],
      core: same('Kuma Data Core'),
      output: { fr: 'API publique', en: 'Public API' },
    },
    details: [
      { fr: 'Confiance A, B ou C par valeur', en: 'Confidence A, B or C per value' },
      { fr: 'Versions conservées', en: 'Versions kept' },
      same('PostgreSQL · FastAPI'),
      { fr: 'Licence AGPL', en: 'AGPL licence' },
    ],
  },
  'solclim-3': {
    scene: { kind: 'solar' },
    details: [
      { fr: 'Photovoltaïque et stockage', en: 'Photovoltaics and storage' },
      { fr: 'Vérifié contre pvlib', en: 'Checked against pvlib' },
      { fr: '800 tests automatisés', en: '800 automated tests' },
    ],
  },
  'kuma-science': {
    scene: {
      kind: 'engine',
      inputs: [
        { fr: 'Média éditorial', en: 'Editorial media' },
        { fr: 'Catalogue des séries', en: 'Series catalogue' },
        { fr: 'Boutique d’outils', en: 'Tool shop' },
      ],
      core: same('kumascience.com'),
      output: { fr: 'Accès libre', en: 'Open access' },
    },
    details: [
      same('Astro'),
      same('Supabase'),
      same('Cloudflare'),
      { fr: 'Tests et intégration continue', en: 'Tests and CI' },
    ],
  },
  'kuma-solar-bridge': {
    scene: {
      kind: 'engine',
      inputs: [same('CSV · datalogger'), same('CSV · datalogger'), same('CSV · datalogger')],
      core: same('Solar Bridge'),
      output: { fr: 'Format commun', en: 'Common format' },
    },
    details: [
      { fr: 'Logiciel de bureau', en: 'Desktop software' },
      same('Tauri · React'),
      { fr: 'Utilise l’API de Kuma Data Core', en: 'Uses the Kuma Data Core API' },
    ],
  },
  'kuma-solaire-app': {
    scene: { kind: 'solar' },
    details: [
      { fr: 'Application mobile de terrain', en: 'Mobile field app' },
      { fr: 'Moteur de calcul séparé', en: 'Separate calculation engine' },
      { fr: 'Connexion intermittente', en: 'Intermittent connection' },
    ],
  },
};
