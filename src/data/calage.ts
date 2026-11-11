/**
 * Données de l'accueil, toutes lues dans la prépublication
 * « Calage de CAMS sans station locale en Afrique de l'Ouest : coût du transfert et
 * structure du biais » (Kalivogui, 2026, doi:10.5281/zenodo.23381054).
 * Rien n'est estimé ici : chaque nombre renvoie à un tableau de l'article.
 */
import map from './west-africa-map.json';

export const PAPER = {
  doi: '10.5281/zenodo.23381054',
  url: 'https://doi.org/10.5281/zenodo.23381054',
} as const;

/* ---------- Projection (identique à scripts/build-map.mjs) ---------- */

const { lon0, lat0, scale, k } = map.projection;
export const projX = (lon: number) => (lon - lon0) * k * scale;
export const projY = (lat: number) => (lat0 - lat) * scale;
export const MAP = map;

/* ---------- Tableau 1 : les 31 stations ESMAP/WAPP, du nord au sud ---------- */

export interface Station {
  name: string;
  country: { fr: string; en: string };
  lat: number;
  lon: number;
  alt: number;
  /** Tier 1 : DNI par pyrhéliomètre. Tier 2 : radiomètre à bande d'ombrage tournante. */
  tier: 1 | 2;
  /** Côté de l'étiquette sur la carte (évite les chevauchements). */
  label?: 'l' | 't' | 'b';
}

const C = {
  bf: { fr: 'Burkina Faso', en: 'Burkina Faso' },
  ne: { fr: 'Niger', en: 'Niger' },
  gm: { fr: 'Gambie', en: 'The Gambia' },
  ml: { fr: 'Mali', en: 'Mali' },
  gw: { fr: 'Guinée-Bissau', en: 'Guinea-Bissau' },
  ng: { fr: 'Nigeria', en: 'Nigeria' },
  bj: { fr: 'Bénin', en: 'Benin' },
  gn: { fr: 'Guinée', en: 'Guinea' },
  tg: { fr: 'Togo', en: 'Togo' },
  gh: { fr: 'Ghana', en: 'Ghana' },
  ci: { fr: 'Côte d’Ivoire', en: 'Côte d’Ivoire' },
  sl: { fr: 'Sierra Leone', en: 'Sierra Leone' },
  lr: { fr: 'Libéria', en: 'Liberia' },
};

export const STATIONS: Station[] = [
  { name: 'Dori', country: C.bf, lat: 14.03, lon: -0.02, alt: 285, tier: 1, label: 'l' },
  { name: 'Lossa', country: C.ne, lat: 13.95, lon: 1.57, alt: 205, tier: 2 },
  { name: 'Farafenni', country: C.gm, lat: 13.57, lon: -15.59, alt: 19, tier: 1 },
  { name: 'Maradi', country: C.ne, lat: 13.52, lon: 7.17, alt: 375, tier: 1 },
  { name: 'Manantali', country: C.ml, lat: 13.2, lon: -10.43, alt: 175, tier: 1 },
  { name: 'Kaya', country: C.bf, lat: 13.08, lon: -1.07, alt: 324, tier: 2, label: 'l' },
  { name: 'Zabori', country: C.ne, lat: 12.71, lon: 3.56, alt: 235, tier: 1 },
  { name: 'Dédougou', country: C.bf, lat: 12.47, lon: -3.47, alt: 305, tier: 1, label: 't' },
  { name: 'Sanankoroba', country: C.ml, lat: 12.39, lon: -7.94, alt: 360, tier: 2 },
  { name: 'Gabu', country: C.gw, lat: 12.3, lon: -14.24, alt: 75, tier: 1 },
  { name: 'Koupéla', country: C.bf, lat: 12.19, lon: -0.36, alt: 302, tier: 2 },
  { name: 'Kano', country: C.ng, lat: 11.87, lon: 8.46, alt: 449, tier: 1 },
  { name: 'Bissau', country: C.gw, lat: 11.86, lon: -15.59, alt: 20, tier: 2, label: 'l' },
  { name: 'Malanville', country: C.bj, lat: 11.78, lon: 3.37, alt: 184, tier: 1 },
  { name: 'Bougouni', country: C.ml, lat: 11.41, lon: -7.48, alt: 335, tier: 2, label: 'b' },
  { name: 'Tarambaly', country: C.gn, lat: 11.36, lon: -12.14, alt: 860, tier: 1 },
  { name: 'Sikasso', country: C.ml, lat: 11.31, lon: -5.74, alt: 375, tier: 1 },
  { name: 'Dapaong', country: C.tg, lat: 10.89, lon: 0.19, alt: 310, tier: 2 },
  { name: 'Navrongo', country: C.gh, lat: 10.88, lon: -1.06, alt: 180, tier: 1, label: 'b' },
  { name: 'Kankan', country: C.gn, lat: 10.36, lon: -9.3, alt: 375, tier: 1 },
  { name: 'Bauchi', country: C.ng, lat: 10.29, lon: 9.85, alt: 597, tier: 1, label: 't' },
  { name: 'Korhogo', country: C.ci, lat: 9.48, lon: -5.6, alt: 370, tier: 1 },
  { name: 'Parakou', country: C.bj, lat: 9.33, lon: 2.59, alt: 387, tier: 1 },
  { name: 'Bumbuna', country: C.sl, lat: 9.04, lon: -11.76, alt: 140, tier: 1 },
  { name: 'Sérébou', country: C.ci, lat: 7.93, lon: -4.01, alt: 195, tier: 1 },
  { name: 'Kenema', country: C.sl, lat: 7.82, lon: -11.18, alt: 145, tier: 1 },
  { name: 'Yekepa', country: C.lr, lat: 7.39, lon: -8.67, alt: 446, tier: 1 },
  { name: 'Sunyani', country: C.gh, lat: 7.35, lon: -2.34, alt: 330, tier: 1 },
  { name: 'Mount Coffee', country: C.lr, lat: 6.5, lon: -10.65, alt: 20, tier: 2, label: 'l' },
  { name: 'Davié', country: C.tg, lat: 6.39, lon: 1.19, alt: 91, tier: 1, label: 't' },
  { name: 'Buchanan', country: C.lr, lat: 5.92, lon: -9.99, alt: 20, tier: 1 },
];

/* ---------- Tableau 5 : droite biais-latitude du GHI (22 stations Tier 1 sous 600 m) ---------- */

export const BIAS_LINE = {
  /** Biais brut de CAMS en GHI (%) = intercept + slope × latitude (° N). */
  intercept: 23.95,
  slope: -1.62,
  /** Domaine de validité de la droite. */
  latMin: 5.9,
  latMax: 14.0,
  /**
   * Demi-largeur de l'intervalle de prédiction à 95 % : le tableau 5 la donne à
   * 6, 8, 10, 12 et 14° N (3,46 ; 3,32 ; 3,27 ; 3,29 ; 3,40). Entre ces points on suit
   * la forme de l'équation 12, hw² = a + b (lat - c)², ajustée sur ces cinq valeurs
   * (écart maximal aux valeurs publiées : 0,01).
   */
  pi: { a: 10.68, b: 0.0673, c: 10.38 },
} as const;

export const biasAt = (lat: number) => BIAS_LINE.intercept + BIAS_LINE.slope * lat;
export const piAt = (lat: number) =>
  Math.sqrt(BIAS_LINE.pi.a + BIAS_LINE.pi.b * (lat - BIAS_LINE.pi.c) ** 2);

/* ---------- Tableau 3 : résidu absolu moyen du cumul annuel de GHI, 29 cibles (%) ---------- */

export interface MethodRow {
  code: string;
  value: number;
  kind: 'raw' | 'onsite' | 'transfer';
  fr: string;
  en: string;
}

export const GHI_RESIDUALS: MethodRow[] = [
  { code: 'RAW', value: 6.63, kind: 'raw', fr: 'CAMS brut', en: 'Raw CAMS' },
  {
    code: 'D-NN1',
    value: 2.85,
    kind: 'transfer',
    fr: 'station la plus proche',
    en: 'nearest station',
  },
  {
    code: 'D-IDW4',
    value: 2.37,
    kind: 'transfer',
    fr: '4 plus proches, pondérées',
    en: '4 nearest, weighted',
  },
  { code: 'M-IB', value: 2.36, kind: 'transfer', fr: 'biais interpolé', en: 'interpolated bias' },
  {
    code: 'L-LAT3',
    value: 2.04,
    kind: 'transfer',
    fr: '3 plus proches en latitude',
    en: '3 nearest in latitude',
  },
  { code: 'M-REG1', value: 1.85, kind: 'transfer', fr: 'droite en latitude', en: 'latitude line' },
  {
    code: 'M-TEND',
    value: 1.83,
    kind: 'transfer',
    fr: 'tendance lat., lon., altitude',
    en: 'lat., lon., altitude trend',
  },
  { code: 'ON-SITE', value: 1.11, kind: 'onsite', fr: 'calage sur site', en: 'on-site adaptation' },
];
