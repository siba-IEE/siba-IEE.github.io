/**
 * Les 31 stations de mesure du rayonnement solaire de la campagne ESMAP/WAPP, du nord au sud.
 * Source : tableau 1 de la prépublication (Kalivogui, 2026, doi:10.5281/zenodo.23381054).
 */
export interface Station {
  name: string;
  lat: number;
  lon: number;
}

export const STATIONS: Station[] = [
  { name: 'Dori', lat: 14.03, lon: -0.02 },
  { name: 'Lossa', lat: 13.95, lon: 1.57 },
  { name: 'Farafenni', lat: 13.57, lon: -15.59 },
  { name: 'Maradi', lat: 13.52, lon: 7.17 },
  { name: 'Manantali', lat: 13.2, lon: -10.43 },
  { name: 'Kaya', lat: 13.08, lon: -1.07 },
  { name: 'Zabori', lat: 12.71, lon: 3.56 },
  { name: 'Dédougou', lat: 12.47, lon: -3.47 },
  { name: 'Sanankoroba', lat: 12.39, lon: -7.94 },
  { name: 'Gabu', lat: 12.3, lon: -14.24 },
  { name: 'Koupéla', lat: 12.19, lon: -0.36 },
  { name: 'Kano', lat: 11.87, lon: 8.46 },
  { name: 'Bissau', lat: 11.86, lon: -15.59 },
  { name: 'Malanville', lat: 11.78, lon: 3.37 },
  { name: 'Bougouni', lat: 11.41, lon: -7.48 },
  { name: 'Tarambaly', lat: 11.36, lon: -12.14 },
  { name: 'Sikasso', lat: 11.31, lon: -5.74 },
  { name: 'Dapaong', lat: 10.89, lon: 0.19 },
  { name: 'Navrongo', lat: 10.88, lon: -1.06 },
  { name: 'Kankan', lat: 10.36, lon: -9.3 },
  { name: 'Bauchi', lat: 10.29, lon: 9.85 },
  { name: 'Korhogo', lat: 9.48, lon: -5.6 },
  { name: 'Parakou', lat: 9.33, lon: 2.59 },
  { name: 'Bumbuna', lat: 9.04, lon: -11.76 },
  { name: 'Sérébou', lat: 7.93, lon: -4.01 },
  { name: 'Kenema', lat: 7.82, lon: -11.18 },
  { name: 'Yekepa', lat: 7.39, lon: -8.67 },
  { name: 'Sunyani', lat: 7.35, lon: -2.34 },
  { name: 'Mount Coffee', lat: 6.5, lon: -10.65 },
  { name: 'Davié', lat: 6.39, lon: 1.19 },
  { name: 'Buchanan', lat: 5.92, lon: -9.99 },
];
