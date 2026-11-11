/**
 * Le film de chaque réalisation. Il ne se joue pas dans la télévision : il se construit en
 * 3D au-dessus de la table du salon (src/scripts/holo.ts), à partir des données publiées
 * des projets. Chaque étape associe une phrase, une scène et, au besoin, quelques notes.
 *
 * Sources des faits : dépôts rds-guinee, rds-cote-divoire et kuma-data-core, API publique
 * du RNDE, sites rnde.kumascience.com, kumascience.com et solclim3.kumascience.com.
 */
import type { Lang } from '../lib/i18n';
import type { Scene } from '../scripts/holo';
import donnees from './hologrammes.json';

export type Label = Record<Lang, string>;
/** Choisit le texte dans la langue de la page. */
type Pick = (fr: string, en: string) => string;

export interface Beat {
  say: Label;
  notes?: Label[];
  scene: (t: Pick) => Scene;
}

/** Pictogramme de la chaîne sur la mosaïque de la télévision. */
export type Glyph = 'gn' | 'ci' | 'database' | 'panel' | 'browser' | 'files' | 'phone';

export interface Film {
  glyph: Glyph;
  /** Teinte du carton de la chaîne. */
  tint: string;
  beats: Beat[];
}

const l = (fr: string, en: string): Label => ({ fr, en });
const k = donnees.gn.kankan;
const SOL = '#ffc266';
const NASA = '#7fdcff';
const ERA5 = '#b8a1ff';
const SARAH = '#ff7a7a';
const months = (t: Pick) => t('J F M A M J J A S O N D', 'J F M A M J J A S O N D').split(' ');

/** Kankan en 2022 : la mesure au sol et trois produits satellitaires, au même endroit. */
const disagreement = (t: Pick): Scene['panels'] => [
  {
    kind: 'lines',
    title: t('Kankan, 2022 : rayonnement global', 'Kankan, 2022: global irradiance'),
    unit: 'kWh/m²/j',
    series: [
      { name: t('Sol', 'Ground'), color: SOL, values: k.sol },
      { name: 'NASA POWER', color: NASA, values: k.nasa },
      { name: 'ERA5-Land', color: ERA5, values: k.era5 },
      { name: 'SARAH-3', color: SARAH, values: k.sarah },
    ],
  },
];

export const films: Record<string, Film> = {
  'rnde-guinee': {
    glyph: 'gn',
    tint: '#16424d',
    beats: [
      {
        say: l(
          'Le RNDE publie la donnée énergétique de la Guinée, territoire par territoire. Le solaire est le premier domaine ouvert.',
          'RNDE publishes Guinea’s energy data, territory by territory. Solar is the first domain opened.',
        ),
        notes: [
          l('340 sous-préfectures', '340 sub-prefectures'),
          l(
            'Du plus clair au plus foncé : de 4,7 à 5,9 kWh/m²/j',
            'Lightest to darkest: 4.7 to 5.9 kWh/m²/day',
          ),
          l(
            'Yomou 4,76 au sud, Siguiri 5,75 au nord',
            'Yomou 4.76 in the south, Siguiri 5.75 in the north',
          ),
        ],
        scene: () => ({
          map: {
            key: 'gn',
            theme: 'ghi',
            labels: { Siguiri: 'Siguiri 5,75', Yomou: 'Yomou 4,76' },
          },
          cam: [0.35, 0.62, 2.1],
        }),
      },
      {
        say: l(
          'La même carte répond à une autre question : quelle confiance accorder à chaque valeur ?',
          'The same map answers another question: how far can each value be trusted?',
        ),
        notes: [
          l('Bleu : haute confiance', 'Blue: high confidence'),
          l('Ocre : incertitude élevée', 'Ochre: high uncertainty'),
        ],
        scene: () => ({ map: { key: 'gn', theme: 'confiance' }, cam: [-0.3, 0.7, 2.0] }),
      },
      {
        say: l(
          'Et à une troisième : de combien la valeur peut-elle s’écarter d’une mesure au sol ?',
          'And a third one: how far can the value deviate from a ground measurement?',
        ),
        notes: [
          l('Clair : moins de 2 %', 'Light: under 2%'),
          l('Moyen : 2 à 4 %', 'Medium: 2 to 4%'),
          l('Foncé : 4 % et plus', 'Dark: 4% and above'),
        ],
        scene: () => ({ map: { key: 'gn', theme: 'ecart' }, cam: [0.1, 0.8, 1.9] }),
      },
      {
        say: l(
          'Chaque territoire a sa fiche, et chaque section de la fiche répond à une question.',
          'Each territory has its sheet, and each section of the sheet answers a question.',
        ),
        notes: [
          l(
            '374 fiches : 340 sous-préfectures et 34 préfectures',
            '374 sheets: 340 sub-prefectures and 34 prefectures',
          ),
        ],
        scene: (t) => ({
          map: { key: 'gn', theme: 'ghi' },
          panels: [
            {
              kind: 'card',
              title: t('Fiche territoriale', 'Territory sheet'),
              rows: [
                [
                  t('Ressource', 'Resource'),
                  t('GHI et DNI annuels, 1991–2020', 'Annual GHI and DNI, 1991–2020'),
                ],
                [
                  t('Fiabilité', 'Reliability'),
                  t('Quelle confiance accorder aux valeurs ?', 'How far to trust the values?'),
                ],
                [
                  t('Variabilité', 'Variability'),
                  t('P50, P90, minimum, maximum', 'P50, P90, minimum, maximum'),
                ],
                [
                  t('Saisons', 'Seasons'),
                  t(
                    'Sèche de novembre à mai, pluies de juin à octobre',
                    'Dry November to May, rains June to October',
                  ),
                ],
                [
                  t('Profil', 'Profile'),
                  t(
                    '12 mois, avec leur bande d’incertitude',
                    '12 months, with their uncertainty band',
                  ),
                ],
              ],
            },
          ],
          cam: [0.55, 0.42, 2.4],
        }),
      },
      {
        say: l(
          'Une fiche ne donne jamais de rang. Une trentaine de mailles satellite pour 340 territoires ne permet pas de classer : elle dit « parmi le tiers le plus ensoleillé ».',
          'A sheet never gives a rank. Some thirty satellite cells for 340 territories cannot support a ranking: it says “among the sunniest third”.',
        ),
        scene: () => ({ map: { key: 'gn', theme: 'ghi', grid: true }, cam: [0, 1.05, 1.8] }),
      },
      {
        say: l(
          'Six jeux de données sont ouverts, sans compte ni clé, et le même jeu se récupère de cinq façons.',
          'Six datasets are open, with no account or key, and the same dataset can be fetched in five ways.',
        ),
        notes: [
          l('WMS : des cartes prêtes à afficher', 'WMS: maps ready to display'),
          l('WFS : les objets géographiques', 'WFS: the geographic features'),
          l('CSW : le catalogue, moissonnable', 'CSW: the catalogue, harvestable'),
        ],
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t('Six jeux ouverts', 'Six open datasets'),
              rows: [
                [
                  'CC BY 4.0',
                  t('Irradiation par sous-préfecture', 'Irradiation by sub-prefecture'),
                ],
                ['CC BY 4.0', t('Niveau de confiance', 'Confidence level')],
                [
                  'CC BY 4.0',
                  t('Irradiation aux 34 chefs-lieux', 'Irradiation at the 34 capitals'),
                ],
                ['CC BY 4.0', t('Séries horaires 2001–2025', 'Hourly series 2001–2025')],
                ['CC BY-IGO', t('Limites des préfectures', 'Prefecture boundaries')],
                ['CC BY-IGO', t('Limites des sous-préfectures', 'Sub-prefecture boundaries')],
              ],
            },
            {
              kind: 'card',
              title: t('Cinq accès', 'Five routes'),
              rows: [
                [t('Fichier', 'File'), 'CSV, GeoJSON'],
                ['API', 'JSON, DCAT'],
                ['WMS', t('Cartes', 'Maps')],
                ['WFS', t('Objets', 'Features')],
                ['CSW', t('Catalogue', 'Catalogue')],
              ],
            },
          ],
          cam: [0.25, 0.3, 2.5],
        }),
      },
    ],
  },
  'rds-guinee': {
    glyph: 'gn',
    tint: '#4d3a16',
    beats: [
      {
        say: l(
          'Un dimensionnement solaire vaut ce que valent ses données. Le référentiel donne le rayonnement de 34 localités de Guinée.',
          'A solar design is only as good as its data. The reference gives the irradiance of 34 localities in Guinea.',
        ),
        notes: [
          l(
            'Une colonne : le rayonnement moyen, 1991–2020',
            'One column: mean irradiance, 1991–2020',
          ),
          l('Plus de 68 millions de valeurs', 'More than 68 million values'),
        ],
        scene: () => ({
          map: {
            key: 'gn',
            columns: true,
            labels: { Siguiri: 'Siguiri 5,75', Yomou: 'Yomou 4,76' },
          },
          cam: [0.45, 0.5, 2.2],
        }),
      },
      {
        say: l(
          'Kindia et Mamou, à 85 km l’une de l’autre, reçoivent exactement les mêmes valeurs : elles tombent dans la même maille de 110 km du satellite.',
          'Kindia and Mamou, 85 km apart, get exactly the same values: they fall in the same 110 km cell of the satellite product.',
        ),
        notes: [
          l(
            'Le référentiel le dit, au lieu de le cacher',
            'The reference says so, instead of hiding it',
          ),
        ],
        scene: () => ({
          map: {
            key: 'gn',
            columns: true,
            grid: true,
            mark: ['Kindia', 'Mamou'],
            labels: { Kindia: 'Kindia', Mamou: 'Mamou' },
          },
          cam: [-0.5, 0.75, 1.9],
        }),
      },
      {
        say: l(
          'Tout le pays repose sur un seul point de vérité au sol : la station de Kankan, 730 jours de mesure.',
          'The whole country rests on a single ground-truth point: the Kankan station, 730 days of measurement.',
        ),
        notes: [
          l('Campagne ESMAP / WAPP, 2021–2023', 'ESMAP / WAPP campaign, 2021–2023'),
          l('Seule série au niveau de confiance A', 'The only series at confidence level A'),
        ],
        scene: () => ({
          map: { key: 'gn', columns: true, mark: ['Kankan'], labels: { Kankan: 'Kankan' } },
          cam: [0.9, 0.45, 2.0],
        }),
      },
      {
        say: l(
          'Au même endroit, la même année, les sources ne disent pas la même chose.',
          'In the same place, the same year, the sources do not say the same thing.',
        ),
        notes: [
          l('Sol : 5,39 kWh/m²/j', 'Ground: 5.39 kWh/m²/day'),
          l('NASA POWER : 5,52', 'NASA POWER: 5.52'),
          l('ERA5-Land : 5,59', 'ERA5-Land: 5.59'),
          l('SARAH-3 : 5,99, soit 11 % au-dessus du sol', 'SARAH-3: 5.99, 11% above the ground'),
        ],
        scene: (t) => ({
          map: { key: 'gn', mark: ['Kankan'], labels: { Kankan: 'Kankan' } },
          panels: disagreement(t),
          cam: [0.3, 0.38, 2.4],
        }),
      },
      {
        say: l(
          'Pendant l’harmattan, la poussière monte et le rayonnement direct mesuré au sol s’effondre. Le satellite le voit mal.',
          'During the harmattan, dust rises and the direct irradiance measured on the ground collapses. The satellite sees it poorly.',
        ),
        notes: [
          l(
            'Poussières PM10 : 89 µg/m³ en mars, 14 en août',
            'PM10 dust: 89 µg/m³ in March, 14 in August',
          ),
        ],
        scene: (t) => ({
          panels: [
            {
              kind: 'lines',
              title: t('Kankan, 2022 : rayonnement direct', 'Kankan, 2022: direct irradiance'),
              unit: 'kWh/m²/j',
              series: [
                { name: t('Sol', 'Ground'), color: SOL, values: k.dni_sol },
                { name: 'CAMS', color: NASA, values: k.dni_cams },
              ],
            },
            {
              kind: 'bars',
              title: t('Poussières à Kankan', 'Dust at Kankan'),
              unit: 'PM10, µg/m³',
              labels: months(t),
              values: k.pm10,
              mark: [1, 2],
            },
          ],
          cam: [0.2, 0.28, 2.6],
        }),
      },
      {
        say: l(
          'C’est pourquoi chaque valeur voyage avec un passeport, et un niveau de confiance qui dit d’où elle vient.',
          'This is why every value travels with a passport, and a confidence level that tells where it comes from.',
        ),
        notes: [
          l('A : mesure directe au sol', 'A: direct ground measurement'),
          l(
            'B : satellite ou réanalyse, non validé au sol',
            'B: satellite or reanalysis, not validated on the ground',
          ),
          l('C : estimation tirée de la littérature', 'C: estimate drawn from the literature'),
        ],
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t('Le passeport d’une valeur', 'The passport of a value'),
              rows: [
                ['source', 'NASA POWER'],
                [t('méthode', 'method'), t('modèle satellitaire', 'satellite model')],
                [t('confiance', 'confidence'), 'B'],
                [t('validité', 'validity'), '1991–2020'],
                [t('incertitude', 'uncertainty'), t('chiffrée', 'quantified')],
              ],
            },
          ],
          cam: [0.3, 0.25, 2.3],
        }),
      },
      {
        say: l(
          '« Le terrain ne remplace pas le satellite, il le calibre. » Le tout est ouvert : licence CC BY 4.0, archivé sur Zenodo.',
          '“The ground does not replace the satellite, it calibrates it.” Everything is open: CC BY 4.0 licence, archived on Zenodo.',
        ),
        scene: () => ({
          map: { key: 'gn', columns: true, mark: ['Kankan'] },
          cam: [-0.4, 0.55, 2.3],
        }),
      },
    ],
  },
  'rds-cote-divoire': {
    glyph: 'ci',
    tint: '#4d2a16',
    beats: [
      {
        say: l(
          'Le même référentiel existe pour la Côte d’Ivoire : 142 localités, les 31 régions et les 111 départements.',
          'The same reference exists for Côte d’Ivoire: 142 localities, the 31 regions and the 111 departments.',
        ),
        notes: [
          l(
            'Une colonne : le rayonnement moyen, 1991–2020',
            'One column: mean irradiance, 1991–2020',
          ),
          l('De 4,52 au sud à 5,66 au nord', 'From 4.52 in the south to 5.66 in the north'),
        ],
        scene: () => ({ map: { key: 'ci', columns: true }, cam: [0.4, 0.55, 2.2] }),
      },
      {
        say: l(
          'Il ne s’arrête pas au rayonnement : température, humidité, vent, pluie et particules, à partir de six sources.',
          'It does not stop at irradiance: temperature, humidity, wind, rain and particles, from six sources.',
        ),
        scene: (t) => ({
          map: { key: 'ci', columns: true },
          panels: [
            {
              kind: 'card',
              title: t('Six sources', 'Six sources'),
              rows: [
                ['NASA POWER', t('Rayonnement, météo', 'Irradiance, weather')],
                ['ERA5', t('Réanalyse', 'Reanalysis')],
                ['CAMS', t('Rayonnement direct, particules', 'Direct irradiance, particles')],
                ['SARAH-3', t('Rayonnement, Meteosat', 'Irradiance, Meteosat')],
                ['GPM IMERG', t('Pluie', 'Rain')],
                ['CHIRPS', t('Pluie', 'Rain')],
              ],
            },
          ],
          cam: [0.6, 0.4, 2.4],
        }),
      },
      {
        say: l(
          'Ici, aucune station au sol n’est encore intégrée. Toutes les séries restent donc au niveau B, et le référentiel le dit.',
          'Here, no ground station is integrated yet. All series therefore stay at level B, and the reference says so.',
        ),
        notes: [
          l('B : suffisant pour la préfaisabilité', 'B: enough for pre-feasibility'),
          l('37,6 millions de valeurs, 1991–2025', '37.6 million values, 1991–2025'),
        ],
        scene: () => ({ map: { key: 'ci', columns: true }, cam: [-0.5, 0.8, 2.0] }),
      },
      {
        say: l(
          'Chaque lot est produit par Kuma Data Core et documenté par une décision publiée. Licence CC BY 4.0.',
          'Each batch is produced by Kuma Data Core and documented by a published decision. CC BY 4.0 licence.',
        ),
        scene: () => ({ map: { key: 'ci', columns: true }, cam: [0.1, 0.45, 2.5] }),
      },
    ],
  },
  'kuma-data-core': {
    glyph: 'database',
    tint: '#1c2f52',
    beats: [
      {
        say: l(
          'Le problème de départ : les produits satellitaires se contredisent, et rien ne dit lequel croire. Kuma Data Core est le moteur qui range ce désordre.',
          'The starting problem: satellite products contradict each other, and nothing says which to believe. Kuma Data Core is the engine that puts this in order.',
        ),
        scene: (t) => ({ panels: disagreement(t), cam: [0.2, 0.25, 2.2] }),
      },
      {
        say: l(
          'Une valeur n’y est jamais enregistrée seule. Voici ce que l’API renvoie pour un jour à Conakry.',
          'A value is never stored alone. This is what the API returns for one day in Conakry.',
        ),
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: '/v1/series/gin_conakry_ghi_nasa_power',
              rows: [
                ['instant_mesure', '2024-06-15'],
                ['valeur', '5,83 kWh/m²/j'],
                ['niveau_effectif', 'B'],
                ['statut', t('brut', 'brut (raw)')],
                ['methode_collecte', t('modèle satellitaire', 'satellite model')],
              ],
            },
          ],
          cam: [0.3, 0.25, 2.2],
        }),
      },
      {
        say: l(
          'Le niveau de confiance n’est pas saisi à la main : quatre règles le déduisent de la source et de la méthode.',
          'The confidence level is not typed by hand: four rules derive it from the source and the method.',
        ),
        notes: [
          l(
            'Une valeur calculée hérite du plus faible de ses entrants',
            'A computed value inherits the lowest of its inputs',
          ),
        ],
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t('Règles de confiance', 'Confidence rules'),
              rows: [
                ['→ C', t('source de fiabilité faible', 'low-reliability source')],
                ['→ C', t('expertise humaine', 'human expertise')],
                [
                  '→ A',
                  t(
                    'mesure directe, source de haute fiabilité',
                    'direct measurement, high-reliability source',
                  ),
                ],
                ['→ B', t('tout le reste', 'everything else')],
              ],
            },
          ],
          cam: [-0.3, 0.25, 2.2],
        }),
      },
      {
        say: l(
          'Rien n’est écrasé. Corriger une valeur ferme l’ancienne version et en ouvre une nouvelle au même instant ; la base refuse que deux versions se chevauchent.',
          'Nothing is overwritten. Correcting a value closes the previous version and opens a new one at the same instant; the database refuses overlapping versions.',
        ),
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t('Deux versions d’une valeur (exemple)', 'Two versions of a value (example)'),
              rows: [
                ['v1 · valide_du', '2026-05-11 12:30'],
                ['v1 · valide_au', '2026-07-02 09:14'],
                ['v2 · valide_du', '2026-07-02 09:14'],
                ['v2 · valide_au', t('ouverte', 'open')],
                ['EXCLUDE', t('chevauchement impossible', 'overlap impossible')],
              ],
            },
            {
              kind: 'card',
              title: t('Journal d’audit (exemple)', 'Audit log (example)'),
              rows: [
                ['type_operation', 'U'],
                ['champs_modifies', '{"valeur": [5.83, 5.79]}'],
                ['auteur_applicatif', t('renseigné', 'recorded')],
                ['horodatage', 'clock_timestamp()'],
              ],
            },
          ],
          cam: [0.15, 0.25, 2.6],
        }),
      },
      {
        say: l(
          'Deux pièges que le moteur documente. Une unité de poussière mal convertie donnait 34 % de pertes par salissure au lieu de 2 %. Et le P90 est le 10ᵉ centile, pas le 90ᵉ.',
          'Two pitfalls the engine documents. A wrongly converted dust unit gave 34% soiling losses instead of 2%. And P90 is the 10th percentile, not the 90th.',
        ),
        scene: (t) => ({
          panels: [
            {
              kind: 'bars',
              title: t('Pertes par salissure', 'Soiling losses'),
              unit: '%',
              labels: [
                t('g/m³ pris pour des µg/m³', 'g/m³ read as µg/m³'),
                t('unité corrigée', 'unit fixed'),
              ],
              values: [34, 2],
              mark: [1],
            },
          ],
          cam: [0.3, 0.25, 2.2],
        }),
      },
      {
        say: l(
          'À partir de modèles publiés, il calcule ce dont l’ingénieur a besoin : rayonnement dans le plan des modules, productible corrigé de la chaleur, P50 et P90, salissure.',
          'From published models, it computes what the engineer needs: plane-of-array irradiance, heat-corrected yield, P50 and P90, soiling.',
        ),
        notes: [
          l(
            'Perez 1990, Ross 1980, Coello et Boyle 2019',
            'Perez 1990, Ross 1980, Coello and Boyle 2019',
          ),
        ],
        scene: () => ({ model: 'kit', cam: [0.6, 0.45, 1.7] }),
      },
      {
        say: l(
          'Une API publique sert le tout : clé gratuite, 5 000 requêtes par jour. Le code est sous licence AGPL.',
          'A public API serves everything: free key, 5,000 requests a day. The code is under the AGPL licence.',
        ),
        scene: () => ({ map: { key: 'gn', columns: true }, cam: [-0.3, 0.6, 2.3] }),
      },
    ],
  },
  'solclim-3': {
    glyph: 'panel',
    tint: '#523f1c',
    beats: [
      {
        say: l(
          'En Afrique de l’Ouest, le satellite surestime le rayonnement : de 6,1 % en moyenne pour le global, de 24,6 % pour le direct, à cause des poussières de l’harmattan.',
          'In West Africa, the satellite overestimates irradiance: by 6.1% on average for global, by 24.6% for direct, because of harmattan dust.',
        ),
        notes: [l('31 stations de mesure au sol', '31 ground measurement stations')],
        scene: (t) => ({
          map: { key: 'ao', mark: ['Kankan'], labels: { Kankan: 'Kankan' } },
          panels: [
            {
              kind: 'bars',
              title: t('Surestimation du satellite', 'Satellite overestimation'),
              unit: '%',
              labels: [t('Global', 'Global'), t('Direct', 'Direct')],
              values: [6.1, 24.6],
            },
          ],
          cam: [0.2, 0.5, 2.7],
        }),
      },
      {
        say: l(
          'Corriger là où il y a une station est simple. La question est : que faire là où il n’y en a pas ?',
          'Correcting where there is a station is simple. The question is: what to do where there is none?',
        ),
        scene: () => ({
          map: {
            key: 'ao',
            mark: ['Kankan', 'Tarambaly', 'Bissau', 'Kenema', 'Farafenni', 'Maradi'],
          },
          cam: [0, 0.9, 2.4],
        }),
      },
      {
        say: l(
          'La réponse est la latitude, pas la distance. Farafenni et Maradi sont à 2 460 km l’une de l’autre, sur le même parallèle : la correction de l’une vaut pour l’autre à 2 % près.',
          'The answer is latitude, not distance. Farafenni and Maradi are 2,460 km apart, on the same parallel: the correction of one holds for the other within 2%.',
        ),
        scene: () => ({
          map: {
            key: 'ao',
            mark: ['Farafenni', 'Maradi'],
            arcs: [['Farafenni', 'Maradi']],
            labels: { Farafenni: 'Farafenni', Maradi: 'Maradi' },
          },
          cam: [0.1, 0.6, 2.6],
        }),
      },
      {
        say: l(
          'À l’inverse, Bissau et Kenema ne sont qu’à 660 km, mais séparées de 4° de latitude : l’écart reste de 9 à 10 %.',
          'Conversely, Bissau and Kenema are only 660 km apart, but 4° of latitude away: the gap stays at 9 to 10%.',
        ),
        notes: [
          l(
            'Le biais baisse de 1,65 point par degré de latitude',
            'The bias drops 1.65 points per degree of latitude',
          ),
        ],
        scene: () => ({
          map: {
            key: 'ao',
            mark: ['Bissau', 'Kenema'],
            arcs: [['Bissau', 'Kenema']],
            labels: { Bissau: 'Bissau', Kenema: 'Kenema' },
          },
          cam: [-0.5, 0.6, 2.3],
        }),
      },
      {
        say: l(
          'C’est la méthode LAT3 : chaque point emprunte la correction de trois à dix stations de même latitude. Validée sur 930 transferts.',
          'This is the LAT3 method: each point borrows the correction of three to ten stations at the same latitude. Validated on 930 transfers.',
        ),
        scene: (t) => ({
          panels: [
            {
              kind: 'bars',
              title: t(
                'Écart au sol, avant et après calage',
                'Gap to ground, before and after calibration',
              ),
              unit: '%',
              labels: [
                t('Global brut', 'Global raw'),
                t('Global calé', 'Global calibrated'),
                t('Direct brut', 'Direct raw'),
                t('Direct calé', 'Direct calibrated'),
              ],
              values: [6.2, 2.0, 24.6, 5.8],
              mark: [1, 3],
            },
          ],
          cam: [0.3, 0.25, 2.2],
        }),
      },
      {
        say: l(
          'Résultat pour la Guinée : une ressource solaire calée pour les 340 sous-préfectures, avec son incertitude chiffrée.',
          'Result for Guinea: a calibrated solar resource for the 340 sub-prefectures, with its quantified uncertainty.',
        ),
        notes: [
          l('Résidu médian : 2,39 % pour le global', 'Median residual: 2.39% for global'),
          l('79 896 260 enregistrements calés', '79,896,260 calibrated records'),
        ],
        scene: () => ({ map: { key: 'gn', theme: 'ecart' }, cam: [0.3, 0.75, 2.0] }),
      },
    ],
  },
  'kuma-science': {
    glyph: 'browser',
    tint: '#2b1c52',
    beats: [
      {
        say: l(
          '« Un dimensionnement ne peut pas être plus fiable que les données qui le fondent. » Kuma Science construit et maintient des référentiels nationaux de données énergétiques en Afrique de l’Ouest.',
          '“A design cannot be more reliable than the data it rests on.” Kuma Science builds and maintains national energy data references in West Africa.',
        ),
        scene: () => ({ map: { key: 'ao', mark: ['Kankan'] }, cam: [0.2, 0.7, 2.6] }),
      },
      {
        say: l(
          'Quatre plateformes tournent sur le même moteur, Kuma Data Core.',
          'Four platforms run on the same engine, Kuma Data Core.',
        ),
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t('Quatre plateformes', 'Four platforms'),
              rows: [
                ['RNDE', t('Données énergétiques de la Guinée', 'Energy data of Guinea')],
                ['RDS', t('Référentiels solaires, sous DOI', 'Solar references, under DOI')],
                [t('Catalogue', 'Catalogue'), 'ISO 19115, CSW, WMS, WFS'],
                [
                  'SolClim-3',
                  t(
                    'Ressource calée et logiciel d’étude',
                    'Calibrated resource and study software',
                  ),
                ],
              ],
            },
          ],
          cam: [0.3, 0.25, 2.2],
        }),
      },
      {
        say: l(
          'Le site donne aussi de quoi travailler : un explorateur cartographique, un atlas d’incertitude, et un atelier Python qui tourne dans le navigateur.',
          'The site also gives tools to work with: a map explorer, an uncertainty atlas, and a Python workshop that runs in the browser.',
        ),
        notes: [
          l(
            'Dans l’atelier, les données ne quittent pas votre appareil',
            'In the workshop, the data never leaves your device',
          ),
          l('2 728 séries servies par l’API', '2,728 series served by the API'),
        ],
        scene: () => ({ map: { key: 'gn', theme: 'ghi' }, cam: [0.5, 0.6, 2.1] }),
      },
      {
        say: l(
          'Et des guides qui partent de cas réels. Kankan et Tarambaly, à 328 km, reçoivent presque la même énergie sur l’année, mais leurs journées ne se ressemblent pas : corrélation de 0,29.',
          'And guides that start from real cases. Kankan and Tarambaly, 328 km apart, get almost the same energy over the year, but their days do not match: correlation of 0.29.',
        ),
        notes: [
          l(
            'Un facteur appris à Kankan ramène l’écart de 3,07 % à 0,45 %',
            'A factor learned at Kankan cuts the gap from 3.07% to 0.45%',
          ),
          l(
            'Le même facteur dégrade la série à Tarambaly',
            'The same factor degrades the series at Tarambaly',
          ),
        ],
        scene: () => ({
          map: {
            key: 'ao',
            mark: ['Kankan', 'Tarambaly'],
            arcs: [['Kankan', 'Tarambaly']],
            labels: { Kankan: 'Kankan', Tarambaly: 'Tarambaly' },
          },
          cam: [-0.2, 0.7, 2.2],
        }),
      },
    ],
  },
  'kuma-solar-bridge': {
    glyph: 'files',
    tint: '#1c5240',
    beats: [
      {
        say: l(
          'Solar Bridge est le logiciel d’étude de SolClim-3. Son premier module dimensionne un mini-réseau : un village, un champ solaire, des batteries, un groupe électrogène.',
          'Solar Bridge is the study software of SolClim-3. Its first module sizes a mini-grid: a village, a solar field, batteries, a generator.',
        ),
        scene: () => ({ model: 'village', cam: [0.5, 0.5, 1.8] }),
      },
      {
        say: l(
          'L’étude suit huit étapes, du site aux résultats.',
          'The study follows eight steps, from site to results.',
        ),
        scene: (t) => ({
          model: 'village',
          panels: [
            {
              kind: 'card',
              title: t('Huit étapes', 'Eight steps'),
              rows: [
                ['1 · 2', t('Site, ressource solaire', 'Site, solar resource')],
                ['3', t('Charge du village', 'Village load')],
                ['4 · 5', t('Champ photovoltaïque, stockage', 'Photovoltaic field, storage')],
                ['6', t('Groupe électrogène', 'Generator')],
                ['7 · 8', t('Simulation horaire, résultats', 'Hourly simulation, results')],
              ],
            },
          ],
          cam: [0.7, 0.4, 2.2],
        }),
      },
      {
        say: l(
          'Il ne propose pas une solution, il les essaie toutes : chaque combinaison de champ et de stockage qui tient l’objectif de fiabilité, classée par coût. La moins chère est retenue.',
          'It does not propose one solution, it tries them all: every combination of field and storage that meets the reliability target, ranked by cost. The cheapest is kept.',
        ),
        notes: [
          l('Schéma de principe', 'Schematic'),
          l('Cases pleines : l’objectif est tenu', 'Filled cells: the target is met'),
        ],
        scene: (t) => ({
          model: 'village',
          panels: [
            {
              kind: 'matrix',
              title: t('Nappe d’admissibilité', 'Admissibility surface'),
              across: t('Champ photovoltaïque →', 'Photovoltaic field →'),
              down: t('Stockage →', 'Storage →'),
            },
          ],
          cam: [0.3, 0.4, 2.2],
        }),
      },
      {
        say: l(
          'Chaque chiffre porte un badge : calé sur mesures au sol, ou brut. Hors du domaine qualifié, le logiciel refuse le calage plutôt que d’inventer une précision.',
          'Every figure carries a badge: calibrated on ground measurements, or raw. Outside the qualified domain, the software refuses calibration rather than inventing precision.',
        ),
        scene: () => ({ map: { key: 'gn', theme: 'confiance' }, cam: [0.2, 0.8, 2.0] }),
      },
      {
        say: l(
          'Le module bureau d’études vérifie les chaînes de modules aux températures extrêmes. Un matin de janvier à 10,6 °C à Kankan pousse une chaîne de trois modules à 154 V, au-dessus d’un régulateur de 150 V.',
          'The engineering module checks module strings at temperature extremes. A January morning at 10.6 °C in Kankan pushes a three-module string to 154 V, above a 150 V regulator.',
        ),
        notes: [
          l(
            'La moyenne de 26 °C n’aurait rien signalé',
            'The 26 °C mean would have flagged nothing',
          ),
        ],
        scene: (t) => ({
          model: 'kit',
          panels: [
            {
              kind: 'bars',
              title: t('Tension d’une chaîne de trois modules', 'Voltage of a three-module string'),
              unit: 'V',
              labels: [
                t('Limite du régulateur', 'Regulator limit'),
                t('Matin à 10,6 °C', 'Morning at 10.6 °C'),
              ],
              values: [150, 154],
              mark: [1],
            },
          ],
          cam: [0.5, 0.4, 2.0],
        }),
      },
      {
        say: l(
          'Aucune formule n’entre dans le code avant d’être écrite dans la méthode. Plus de 800 tests, et une vérification contre pvlib.',
          'No formula enters the code before being written in the method. More than 800 tests, and a check against pvlib.',
        ),
        scene: () => ({ model: 'village', cam: [-0.5, 0.55, 1.9] }),
      },
    ],
  },
  'kuma-solaire-app': {
    glyph: 'phone',
    tint: '#521c38',
    beats: [
      {
        say: l(
          'Kuma Solaire aide un foyer à savoir de quoi il a besoin avant de parler à un installateur. Prenons ce salon.',
          'Kuma Solaire helps a household know what it needs before talking to an installer. Take this living room.',
        ),
        notes: [
          l('Hors ligne, sans compte, gratuite', 'Offline, no account, free'),
          l('En cours de développement', 'In development'),
        ],
        scene: (t) => ({
          tags: [
            { at: 'tv', text: t('Téléviseur · 60 W', 'Television · 60 W') },
            {
              at: 'table',
              text: t('Qu’est-ce que ce salon consomme ?', 'What does this living room use?'),
            },
          ],
          cam: [0.5, 0.32, 2.6],
        }),
      },
      {
        say: l(
          'On liste ses appareils et leurs heures d’usage, de jour et de nuit. Exemple : un foyer de Kankan, six heures de coupure par jour.',
          'You list your appliances and their hours of use, by day and by night. Example: a household in Kankan, six hours of power cuts a day.',
        ),
        notes: [
          l('4 096 Wh par jour', '4,096 Wh a day'),
          l('Pointe de 1 220 W', 'Peak of 1,220 W'),
        ],
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t('Les appareils du foyer', 'The household’s appliances'),
              rows: [
                ['90 W', t('Réfrigérateur', 'Fridge')],
                ['6 × 9 W', t('Ampoules LED', 'LED bulbs')],
                ['60 W', t('Téléviseur', 'Television')],
                ['2 × 45 W', t('Ventilateurs', 'Fans')],
                ['1 000 W', t('Fer à repasser', 'Iron')],
              ],
            },
          ],
          cam: [0.3, 0.25, 2.2],
        }),
      },
      {
        say: l(
          'Le calcul se fait sur le pire mois de l’année. Si le système suffit ce mois-là, il suffit toute l’année.',
          'The calculation is done on the worst month of the year. If the system is enough that month, it is enough all year.',
        ),
        notes: [l('À Kankan : août', 'At Kankan: August')],
        scene: (t) => ({
          panels: [
            {
              kind: 'bars',
              title: t('Rayonnement mensuel à Kankan', 'Monthly irradiance at Kankan'),
              unit: 'kWh/m²/j',
              labels: months(t),
              values: k.normale,
              mark: [7],
            },
          ],
          cam: [0.3, 0.25, 2.2],
        }),
      },
      {
        say: l(
          'Résultat pour ce foyer : 350 à 390 Wc de panneaux, une batterie de 2 190 Wh au lithium ou 3 500 Wh au plomb, un onduleur de 1 525 VA.',
          'Result for this household: 350 to 390 Wp of panels, a 2,190 Wh lithium or 3,500 Wh lead battery, a 1,525 VA inverter.',
        ),
        notes: [
          l('Une fourchette, pas un chiffre : ± 4,5 %', 'A range, not a figure: ± 4.5%'),
          l('Un ordre de grandeur, pas un devis', 'An order of magnitude, not a quote'),
        ],
        scene: () => ({ model: 'kit', cam: [0.6, 0.45, 1.6] }),
      },
      {
        say: l(
          'Le rapport porte un QR code qui contient les besoins saisis, pas les résultats. Le vendeur le scanne, la page officielle refait le calcul avec le même moteur : un rapport gonflé ne passe pas.',
          'The report carries a QR code holding the needs entered, not the results. The seller scans it, the official page redoes the calculation with the same engine: an inflated report does not pass.',
        ),
        scene: (t) => ({
          model: 'kit',
          panels: [
            {
              kind: 'card',
              title: t('Ce que contient le QR code', 'What the QR code holds'),
              rows: [
                [t('lieu', 'place'), 'Kankan'],
                [t('appareils', 'appliances'), t('la liste saisie', 'the list entered')],
                [t('scénario', 'scenario'), t('secours, 6 h de coupure', 'backup, 6 h of cuts')],
                [
                  t('résultats', 'results'),
                  t('aucun : ils sont recalculés', 'none: they are recomputed'),
                ],
              ],
            },
          ],
          cam: [0.4, 0.4, 2.1],
        }),
      },
    ],
  },
};

/** Tracés des pictogrammes, dans un carré de 100 unités. Les pays viennent de outlines.json. */
export const glyphs: Record<Exclude<Glyph, 'gn' | 'ci'>, string> = {
  database:
    'M20 25c0-9 60-9 60 0v50c0 9-60 9-60 0zM20 25c0 9 60 9 60 0M20 42c0 9 60 9 60 0M20 58c0 9 60 9 60 0',
  panel:
    'M8 62 68 46 90 78 30 94ZM28 57 50 89M48 51 70 83M15 73 75 57M22 84 82 68M66 22a11 11 0 1 0 22 0a11 11 0 1 0-22 0',
  browser:
    'M10 20h80v60H10zM10 34h80M18 27h2M26 27h2M34 27h2M20 44h36v26H20zM64 44h16M64 54h16M64 64h10',
  files:
    'M10 22h20l8 8v30H10zM16 40h16M16 48h16M46 46h16M56 40l6 6-6 6M70 28h22v40H70zM70 40h22M70 52h22M81 28v40',
  phone:
    'M32 10h36a6 6 0 0 1 6 6v68a6 6 0 0 1-6 6H32a6 6 0 0 1-6-6V16a6 6 0 0 1 6-6zM44 17h12M34 30h32M34 42h32M34 54h20',
};
