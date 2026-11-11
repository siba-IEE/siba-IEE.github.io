/**
 * Droite biais-latitude du produit CAMS en rayonnement global (GHI).
 * Source : tableau 5 de la prépublication (Kalivogui, 2026, doi:10.5281/zenodo.23381054),
 * ajustement sur les 22 stations Tier 1 situées sous 600 m d'altitude.
 */
export const BIAS_LINE = {
  /** Biais brut de CAMS (%) = intercept + slope × latitude (° N). */
  intercept: 23.95,
  slope: -1.62,
  /** Domaine de validité, en degrés de latitude nord. */
  latMin: 5.9,
  latMax: 14,
  /**
   * Demi-largeur de l'intervalle de prédiction à 95 %. Le tableau 5 la donne à 6, 8, 10, 12
   * et 14° N (3,46 ; 3,32 ; 3,27 ; 3,29 ; 3,40). Entre ces points on suit la forme de
   * l'équation 12, hw² = a + b (lat − c)², ajustée sur ces cinq valeurs (écart maximal : 0,01).
   */
  interval: { a: 10.68, b: 0.0673, c: 10.38 },
  /** Latitudes pour lesquelles le tableau 5 publie le biais prédit et son intervalle. */
  tabulated: [6, 8, 10, 12, 14],
} as const;

export const biasAt = (lat: number) => BIAS_LINE.intercept + BIAS_LINE.slope * lat;

export const halfWidthAt = (lat: number) => {
  const { a, b, c } = BIAS_LINE.interval;
  return Math.sqrt(a + b * (lat - c) ** 2);
};
