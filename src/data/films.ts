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
/** Une précision ; `at` nomme l'élément de la scène sur lequel elle se pose. */
export type Note = Label & { at?: string };

export interface Beat {
  say: Label;
  /** Élément de la scène que la phrase désigne. Par défaut : le premier élément mis en avant. */
  focus?: string;
  notes?: Note[];
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
/** Précision posée sur un élément de la scène. */
const pin = (at: string, fr: string, en: string): Note => ({ fr, en, at });
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
          'Vous devez décider où installer du solaire en Guinée. Par où commencer ?',
          'You have to decide where to install solar in Guinea. Where do you start?',
        ),
        focus: 'carte',
        notes: [
          l(
            'Chaque tache de couleur : une des 340 sous-préfectures',
            'Each patch of colour: one of the 340 sub-prefectures',
          ),
        ],
        scene: () => ({ map: { key: 'gn', theme: 'ghi' }, cam: [0.5, 0.62, 2.1] }),
      },
      {
        say: l(
          'La carte vous montre où le soleil est le plus fort : plus la couleur est foncée, plus il y en a.',
          'The map shows you where the sun is strongest: the darker the colour, the more there is.',
        ),
        focus: 'Siguiri',
        notes: [
          pin('Siguiri', 'Le plus ensoleillé : 5,75 kWh/m²/j', 'The sunniest: 5.75 kWh/m²/day'),
          pin('Yomou', 'Le moins ensoleillé : 4,76', 'The least sunny: 4.76'),
        ],
        scene: () => ({
          map: { key: 'gn', theme: 'ghi', labels: { Siguiri: 'Siguiri', Yomou: 'Yomou' } },
          cam: [0.5, 0.62, 2.1],
        }),
      },
      {
        say: l(
          'Mais pouvez-vous vous fier à ce chiffre ? Vous basculez la carte : elle montre maintenant où la valeur est solide.',
          'But can you rely on that figure? You switch the map: it now shows where the value is solid.',
        ),
        focus: 'carte',
        notes: [
          l('Bleu : haute confiance', 'Blue: high confidence'),
          l('Ocre : incertitude élevée', 'Ochre: high uncertainty'),
        ],
        scene: () => ({ map: { key: 'gn', theme: 'confiance' }, cam: [-0.5, 0.7, 2.0] }),
      },
      {
        say: l(
          'Vous ouvrez un territoire. Sa fiche répond à vos questions, une par une, et ne donne jamais un classement que la donnée ne permet pas.',
          'You open a territory. Its sheet answers your questions, one by one, and never gives a ranking the data cannot support.',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          map: { key: 'gn', theme: 'ghi' },
          panels: [
            {
              kind: 'card',
              title: t('La fiche d’un territoire', 'A territory’s sheet'),
              rows: [
                [
                  t('Combien ?', 'How much?'),
                  t('Le rayonnement, année et mois', 'Irradiance, by year and month'),
                ],
                [t('Fiable ?', 'Reliable?'), t('Le niveau de confiance', 'The confidence level')],
                [
                  t('Régulier ?', 'Steady?'),
                  t('Les bonnes et les mauvaises années', 'Good and bad years'),
                ],
                [
                  t('Par rapport au pays ?', 'Versus the country?'),
                  t('« Parmi le tiers le plus ensoleillé »', '“Among the sunniest third”'),
                ],
              ],
            },
          ],
          cam: [0.55, 0.42, 2.4],
        }),
      },
      {
        say: l(
          'Vous repartez avec le fichier, ou vous branchez directement votre outil de cartographie dessus. Sans compte, sans clé.',
          'You leave with the file, or plug your mapping tool straight into it. No account, no key.',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t(
                'Cinq façons de repartir avec la donnée',
                'Five ways to leave with the data',
              ),
              rows: [
                [t('Un fichier', 'A file'), 'CSV, GeoJSON'],
                [t('Un programme', 'A program'), 'API'],
                [t('Une carte', 'A map'), 'WMS'],
                [t('Les contours', 'The outlines'), 'WFS'],
                [t('Un autre portail', 'Another portal'), 'CSW'],
              ],
            },
          ],
          cam: [0.5, 0.25, 2.0],
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
          'On vous demande de dimensionner une centrale solaire à Kankan. Première question : combien de soleil y reçoit-on ?',
          'You are asked to size a solar plant at Kankan. First question: how much sun does it get?',
        ),
        focus: 'Kankan',
        scene: () => ({
          map: { key: 'gn', columns: true, mark: ['Kankan'], labels: { Kankan: 'Kankan' } },
          cam: [0.9, 0.45, 2.0],
        }),
      },
      {
        say: l(
          'Vous ouvrez quatre sources. Elles ne sont pas d’accord. Laquelle mettez-vous dans votre étude ?',
          'You open four sources. They disagree. Which one goes into your study?',
        ),
        focus: 'panneau1',
        notes: [
          l(
            'Courbe ambre : la mesure au sol, 5,39 kWh/m²/j',
            'Amber curve: the ground measurement, 5.39 kWh/m²/day',
          ),
          l(
            'Courbe rouge : SARAH-3, 5,99, soit 11 % de plus',
            'Red curve: SARAH-3, 5.99, 11% more',
          ),
          l(
            '11 % sur le soleil, c’est à peu près 11 % sur la production annoncée',
            '11% on the sun is roughly 11% on the output you promise',
          ),
        ],
        scene: (t) => ({
          map: { key: 'gn', mark: ['Kankan'], labels: { Kankan: 'Kankan' } },
          panels: disagreement(t),
          cam: [0.5, 0.38, 2.4],
        }),
      },
      {
        say: l(
          'Le référentiel tranche pour vous : chaque valeur porte un niveau de confiance. À Kankan, une station a mesuré pendant 730 jours : niveau A.',
          'The reference settles it for you: every value carries a confidence level. At Kankan, a station measured for 730 days: level A.',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          map: { key: 'gn', mark: ['Kankan'] },
          panels: [
            {
              kind: 'card',
              title: t(
                'Ce que la valeur vous dit d’elle-même',
                'What the value tells you about itself',
              ),
              rows: [
                [
                  'A',
                  t(
                    'Mesurée au sol : vous pouvez vous engager',
                    'Measured on the ground: you can commit',
                  ),
                ],
                [
                  'B',
                  t(
                    'Satellite : bon pour comparer des sites',
                    'Satellite: good for comparing sites',
                  ),
                ],
                ['C', t('Estimation : à prendre avec réserve', 'Estimate: handle with care')],
              ],
            },
          ],
          cam: [0.5, 0.4, 2.4],
        }),
      },
      {
        say: l(
          'Et ailleurs dans le pays ? Vous avez la valeur pour 34 villes, et le référentiel vous prévient de ses limites au lieu de les cacher.',
          'And elsewhere in the country? You get the value for 34 towns, and the reference warns you of its limits instead of hiding them.',
        ),
        focus: 'Kindia',
        notes: [
          pin(
            'Mamou',
            'Même valeur que Kindia, à 85 km : même maille du satellite',
            'Same value as Kindia, 85 km away: same satellite cell',
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
          'Vous téléchargez, vous citez le DOI dans votre rapport, et n’importe qui peut vérifier d’où vient votre chiffre.',
          'You download, you cite the DOI in your report, and anyone can check where your figure comes from.',
        ),
        focus: 'carte',
        notes: [
          l('Licence CC BY 4.0, archivé sur Zenodo', 'CC BY 4.0 licence, archived on Zenodo'),
        ],
        scene: () => ({ map: { key: 'gn', columns: true }, cam: [0.5, 0.55, 2.3] }),
      },
    ],
  },
  'rds-cote-divoire': {
    glyph: 'ci',
    tint: '#4d2a16',
    beats: [
      {
        say: l(
          'Vous cherchez le meilleur site pour un projet solaire en Côte d’Ivoire. Il vous faut comparer.',
          'You are looking for the best site for a solar project in Côte d’Ivoire. You need to compare.',
        ),
        focus: 'carte',
        notes: [l('Une colonne : une des 142 localités', 'One column: one of the 142 localities')],
        scene: () => ({ map: { key: 'ci', columns: true }, cam: [0.5, 0.55, 2.2] }),
      },
      {
        say: l(
          'D’un coup d’œil, vous voyez que le nord reçoit plus que le sud : les colonnes montent.',
          'At a glance, you see the north gets more than the south: the columns rise.',
        ),
        focus: 'carte',
        notes: [
          l(
            'De 4,52 au sud à 5,66 kWh/m²/j au nord',
            'From 4.52 in the south to 5.66 kWh/m²/day in the north',
          ),
        ],
        scene: () => ({ map: { key: 'ci', columns: true }, cam: [-0.6, 0.35, 2.3] }),
      },
      {
        say: l(
          'Et vous savez à quoi vous en tenir : aucune station au sol n’est encore intégrée. Assez pour choisir un site, pas encore pour s’engager auprès d’une banque.',
          'And you know where you stand: no ground station is integrated yet. Enough to choose a site, not yet to commit to a bank.',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          map: { key: 'ci', columns: true },
          panels: [
            {
              kind: 'card',
              title: t(
                'Niveau de confiance de toutes les valeurs',
                'Confidence level of every value',
              ),
              rows: [
                [
                  'B',
                  t(
                    'Satellite : bon pour comparer des sites',
                    'Satellite: good for comparing sites',
                  ),
                ],
                ['A', t('Mesure au sol : pas encore ici', 'Ground measurement: not here yet')],
              ],
            },
          ],
          cam: [0.6, 0.4, 2.4],
        }),
      },
      {
        say: l(
          'Une étude ne s’arrête pas au soleil. Vous trouvez au même endroit la chaleur, le vent, la pluie et les poussières.',
          'A study does not stop at the sun. In the same place you find heat, wind, rain and dust.',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          map: { key: 'ci', columns: true },
          panels: [
            {
              kind: 'card',
              title: t('Ce que vous y trouvez', 'What you find there'),
              rows: [
                [t('Soleil', 'Sun'), 'GHI, DNI, DHI'],
                [t('Chaleur', 'Heat'), t('Température, humidité', 'Temperature, humidity')],
                [t('Vent, pluie', 'Wind, rain'), '1991–2025'],
                [
                  t('Poussières', 'Dust'),
                  t('Elles salissent les modules', 'They soil the modules'),
                ],
              ],
            },
          ],
          cam: [0.6, 0.4, 2.4],
        }),
      },
    ],
  },
  'kuma-data-core': {
    glyph: 'database',
    tint: '#1c2f52',
    beats: [
      {
        say: l(
          'Vous avez cité un chiffre de rayonnement dans une étude. Six mois plus tard, on vous demande : d’où vient-il ?',
          'You quoted an irradiance figure in a study. Six months later, you are asked: where does it come from?',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t(
                'Le chiffre, tel que le moteur vous le rend',
                'The figure, as the engine returns it',
              ),
              rows: [
                [t('valeur', 'value'), '5,83 kWh/m²/j'],
                [t('lieu, jour', 'place, day'), 'Conakry, 2024-06-15'],
                [t('source', 'source'), 'NASA POWER'],
                [t('confiance', 'confidence'), 'B'],
                [t('statut', 'status'), t('brut, pas encore validé', 'raw, not yet validated')],
              ],
            },
          ],
          cam: [0.5, 0.25, 2.0],
        }),
      },
      {
        say: l(
          'La réponse est dans le chiffre lui-même. Le moteur ne stocke jamais une valeur sans dire d’où elle vient et ce qu’elle vaut.',
          'The answer is in the figure itself. The engine never stores a value without saying where it comes from and what it is worth.',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t(
                'Comment le niveau de confiance est attribué',
                'How the confidence level is assigned',
              ),
              rows: [
                [
                  'A',
                  t(
                    'mesure directe, source très fiable',
                    'direct measurement, highly reliable source',
                  ),
                ],
                ['B', t('satellite ou réanalyse', 'satellite or reanalysis')],
                [
                  'C',
                  t('source peu fiable, ou avis d’expert', 'unreliable source, or expert opinion'),
                ],
              ],
            },
          ],
          cam: [-0.5, 0.25, 2.0],
        }),
      },
      {
        say: l(
          'Entre-temps, la valeur a été corrigée. Rien n’a été écrasé : celle que vous aviez citée est toujours là, datée.',
          'Meanwhile, the value was corrected. Nothing was overwritten: the one you quoted is still there, dated.',
        ),
        focus: 'panneau1',
        notes: [
          pin(
            'panneau2',
            'Chaque modification laisse une trace : qui, quand, avant, après',
            'Every change leaves a trace: who, when, before, after',
          ),
        ],
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t(
                'Deux versions de la même valeur (exemple)',
                'Two versions of the same value (example)',
              ),
              rows: [
                [
                  t('version 1', 'version 1'),
                  t('5,83 · valable jusqu’à la correction', '5.83 · valid until the correction'),
                ],
                [t('version 2', 'version 2'), t('5,79 · valable depuis', '5.79 · valid since')],
                [
                  t('règle', 'rule'),
                  t('deux versions ne se chevauchent jamais', 'two versions never overlap'),
                ],
              ],
            },
            {
              kind: 'card',
              title: t('Journal (exemple)', 'Log (example)'),
              rows: [
                [t('quoi', 'what'), t('valeur modifiée', 'value changed')],
                [t('avant, après', 'before, after'), '5,83 → 5,79'],
                [t('qui, quand', 'who, when'), t('enregistrés', 'recorded')],
              ],
            },
          ],
          cam: [0.5, 0.25, 2.6],
        }),
      },
      {
        say: l(
          'Il vous évite aussi les erreurs qui coûtent cher. Une unité mal convertie, et les pertes par salissure passent de 2 % à 34 %.',
          'It also spares you costly mistakes. One wrongly converted unit, and soiling losses go from 2% to 34%.',
        ),
        focus: 'panneau1',
        notes: [pin('panneau1', 'Barre ambre : la valeur juste', 'Amber bar: the right value')],
        scene: (t) => ({
          panels: [
            {
              kind: 'bars',
              title: t('Pertes par salissure calculées', 'Computed soiling losses'),
              unit: '%',
              labels: [t('Unité fausse', 'Wrong unit'), t('Unité juste', 'Right unit')],
              values: [34, 2],
              mark: [1],
            },
          ],
          cam: [0.5, 0.25, 2.0],
        }),
      },
      {
        say: l(
          'C’est ce moteur qui produit les référentiels de Guinée, de Côte d’Ivoire et du Burkina Faso. Vous l’interrogez par une API ouverte, avec une clé gratuite.',
          'This engine produces the references of Guinea, Côte d’Ivoire and Burkina Faso. You query it through an open API, with a free key.',
        ),
        focus: 'carte',
        scene: () => ({ map: { key: 'gn', columns: true }, cam: [-0.5, 0.6, 2.3] }),
      },
    ],
  },
  'solclim-3': {
    glyph: 'panel',
    tint: '#523f1c',
    beats: [
      {
        say: l(
          'Votre site n’a pas de station de mesure. C’est le cas presque partout. Il vous reste le satellite.',
          'Your site has no measurement station. That is the case almost everywhere. You are left with the satellite.',
        ),
        focus: 'carte',
        notes: [
          pin(
            'Kankan',
            'Une des 31 stations au sol de la région',
            'One of the region’s 31 ground stations',
          ),
        ],
        scene: () => ({
          map: {
            key: 'ao',
            mark: ['Kankan', 'Tarambaly', 'Bissau', 'Kenema', 'Farafenni', 'Maradi'],
          },
          cam: [0.5, 0.75, 2.5],
        }),
      },
      {
        say: l(
          'Or le satellite voit trop de soleil. Si vous le croyez sur parole, vous promettez une production que la centrale n’atteindra pas.',
          'But the satellite sees too much sun. If you take its word, you promise an output the plant will not reach.',
        ),
        focus: 'panneau1',
        notes: [
          pin(
            'panneau1',
            'Rayonnement direct : 24,6 % de trop, à cause des poussières',
            'Direct irradiance: 24.6% too much, because of dust',
          ),
        ],
        scene: (t) => ({
          panels: [
            {
              kind: 'bars',
              title: t('Ce que le satellite ajoute à tort', 'What the satellite wrongly adds'),
              unit: '%',
              labels: [
                t('Rayonnement global', 'Global irradiance'),
                t('Rayonnement direct', 'Direct irradiance'),
              ],
              values: [6.1, 24.6],
              mark: [1],
            },
          ],
          cam: [0.5, 0.25, 2.0],
        }),
      },
      {
        say: l(
          'SolClim-3 corrige votre site avec les stations qui lui ressemblent : celles de même latitude, même à l’autre bout de la région.',
          'SolClim-3 corrects your site with the stations that resemble it: those at the same latitude, even at the other end of the region.',
        ),
        focus: 'Maradi',
        notes: [
          pin(
            'Farafenni',
            'À 2 460 km de Maradi, même latitude : même correction, à 2 % près',
            '2,460 km from Maradi, same latitude: same correction, within 2%',
          ),
        ],
        scene: () => ({
          map: {
            key: 'ao',
            mark: ['Farafenni', 'Maradi'],
            arcs: [['Farafenni', 'Maradi']],
            labels: { Farafenni: 'Farafenni', Maradi: 'Maradi' },
          },
          cam: [0.5, 0.6, 2.6],
        }),
      },
      {
        say: l(
          'Vous obtenez une valeur corrigée, et surtout de combien elle peut encore se tromper. C’est ce chiffre-là qu’un financeur vous demandera.',
          'You get a corrected value, and above all how far it can still be off. That is the figure a lender will ask you for.',
        ),
        focus: 'panneau1',
        notes: [
          pin(
            'panneau1',
            'Barres ambre : l’écart qui reste après correction',
            'Amber bars: the gap left after correction',
          ),
        ],
        scene: (t) => ({
          panels: [
            {
              kind: 'bars',
              title: t('Écart à la mesure au sol', 'Gap to the ground measurement'),
              unit: '%',
              labels: [
                t('Global, avant', 'Global, before'),
                t('Global, après', 'Global, after'),
                t('Direct, avant', 'Direct, before'),
                t('Direct, après', 'Direct, after'),
              ],
              values: [6.2, 2.0, 24.6, 5.8],
              mark: [1, 3],
            },
          ],
          cam: [0.5, 0.25, 2.0],
        }),
      },
      {
        say: l(
          'Ce travail est déjà fait pour toute la Guinée : chaque sous-préfecture a sa valeur corrigée et son incertitude.',
          'This work is already done for all of Guinea: each sub-prefecture has its corrected value and its uncertainty.',
        ),
        focus: 'carte',
        notes: [
          l(
            'Plus la couleur est claire, plus la valeur est sûre',
            'The lighter the colour, the safer the value',
          ),
        ],
        scene: () => ({ map: { key: 'gn', theme: 'ecart' }, cam: [0.5, 0.75, 2.0] }),
      },
    ],
  },
  'kuma-science': {
    glyph: 'browser',
    tint: '#2b1c52',
    beats: [
      {
        say: l(
          'Vous cherchez une donnée énergétique fiable pour l’Afrique de l’Ouest. Où aller ?',
          'You are looking for reliable energy data for West Africa. Where do you go?',
        ),
        focus: 'carte',
        scene: () => ({ map: { key: 'ao', mark: ['Kankan'] }, cam: [0.5, 0.7, 2.6] }),
      },
      {
        say: l(
          'Un seul endroit, selon ce que vous venez faire.',
          'One place, depending on what you came to do.',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t('Vous voulez…', 'You want to…'),
              rows: [
                [t('voir une carte', 'see a map'), 'RNDE'],
                [
                  t('télécharger des séries', 'download series'),
                  t('Référentiels solaires', 'Solar references'),
                ],
                [t('brancher un outil', 'plug in a tool'), t('Catalogue, API', 'Catalogue, API')],
                [t('une valeur corrigée', 'a corrected value'), 'SolClim-3'],
              ],
            },
          ],
          cam: [0.5, 0.25, 2.0],
        }),
      },
      {
        say: l(
          'Vous n’avez rien à installer : la carte et l’atelier de calcul tournent dans votre navigateur, et vos données ne quittent pas votre appareil.',
          'You have nothing to install: the map and the calculation workshop run in your browser, and your data never leaves your device.',
        ),
        focus: 'carte',
        scene: () => ({ map: { key: 'gn', theme: 'ghi' }, cam: [0.5, 0.6, 2.1] }),
      },
      {
        say: l(
          'Et vous apprenez à vous méfier, sur des cas réels. Ces deux villes reçoivent la même énergie sur l’année, mais pas les mêmes jours : la correction de l’une abîme l’autre.',
          'And you learn to be wary, on real cases. These two towns get the same energy over the year, but not on the same days: the correction of one harms the other.',
        ),
        focus: 'Tarambaly',
        notes: [pin('Kankan', 'À 328 km de Tarambaly', '328 km from Tarambaly')],
        scene: () => ({
          map: {
            key: 'ao',
            mark: ['Kankan', 'Tarambaly'],
            arcs: [['Kankan', 'Tarambaly']],
            labels: { Kankan: 'Kankan', Tarambaly: 'Tarambaly' },
          },
          cam: [-0.5, 0.7, 2.2],
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
          'Un village n’a pas le réseau. On vous demande combien de panneaux, de batteries, et quel groupe électrogène il lui faut.',
          'A village is off the grid. You are asked how many panels, how many batteries, and which generator it needs.',
        ),
        focus: 'maquette',
        scene: () => ({ model: 'village', cam: [0.5, 0.5, 1.8] }),
      },
      {
        say: l(
          'Vous décrivez le site et ce que le village consomme. Le logiciel simule chaque heure de l’année.',
          'You describe the site and what the village uses. The software simulates every hour of the year.',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          model: 'village',
          panels: [
            {
              kind: 'card',
              title: t('Ce que vous renseignez, dans l’ordre', 'What you fill in, in order'),
              rows: [
                ['1', t('Le site et son soleil', 'The site and its sun')],
                ['2', t('La consommation du village', 'The village’s consumption')],
                ['3', t('Le champ solaire et les batteries', 'The solar field and the batteries')],
                ['4', t('Le groupe électrogène', 'The generator')],
              ],
            },
          ],
          cam: [0.7, 0.4, 2.2],
        }),
      },
      {
        say: l(
          'Il ne vous donne pas une solution au hasard. Il essaie toutes les combinaisons, garde celles qui tiennent la fiabilité demandée, et vous montre la moins chère.',
          'It does not give you a random solution. It tries every combination, keeps those that meet the required reliability, and shows you the cheapest.',
        ),
        focus: 'panneau1',
        notes: [
          pin(
            'panneau1',
            'Case ambre : la moins chère qui tient (schéma)',
            'Amber cell: the cheapest that holds (schematic)',
          ),
        ],
        scene: (t) => ({
          model: 'village',
          panels: [
            {
              kind: 'matrix',
              title: t('Toutes les combinaisons essayées', 'Every combination tried'),
              across: t('Plus de panneaux →', 'More panels →'),
              down: t('Plus de batteries →', 'More batteries →'),
            },
          ],
          cam: [0.5, 0.4, 2.2],
        }),
      },
      {
        say: l(
          'Il vous évite l’erreur qui casse du matériel. Un matin froid, trois modules en série dépassent la tension que le régulateur supporte.',
          'It spares you the mistake that breaks equipment. On a cold morning, three modules in series exceed the voltage the regulator can take.',
        ),
        focus: 'panneau1',
        notes: [
          pin(
            'panneau1',
            'Barre ambre : 154 V un matin à 10,6 °C, pour une limite à 150 V',
            'Amber bar: 154 V on a 10.6 °C morning, for a 150 V limit',
          ),
        ],
        scene: (t) => ({
          model: 'kit',
          panels: [
            {
              kind: 'bars',
              title: t('Tension de trois modules en série', 'Voltage of three modules in series'),
              unit: 'V',
              labels: [
                t('Ce que le régulateur supporte', 'What the regulator takes'),
                t('Un matin froid à Kankan', 'A cold morning at Kankan'),
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
          'Et il ne vous ment pas sur la précision : chaque chiffre dit s’il repose sur des données corrigées ou brutes.',
          'And it does not lie to you about precision: every figure says whether it rests on corrected or raw data.',
        ),
        focus: 'carte',
        notes: [
          l(
            'Bleu : données corrigées sur mesures au sol',
            'Blue: data corrected on ground measurements',
          ),
          l(
            'Ocre : données brutes, le logiciel le signale',
            'Ochre: raw data, the software flags it',
          ),
        ],
        scene: () => ({ map: { key: 'gn', theme: 'confiance' }, cam: [0.5, 0.8, 2.0] }),
      },
    ],
  },
  'kuma-solaire-app': {
    glyph: 'phone',
    tint: '#521c38',
    beats: [
      {
        say: l(
          'Un vendeur vous propose une installation solaire pour votre maison. Comment savoir si elle est trop petite, ou bien trop chère pour rien ?',
          'A seller offers you a solar installation for your home. How do you know if it is too small, or overpriced for nothing?',
        ),
        notes: [
          l(
            'Application gratuite, sans compte, sans connexion',
            'Free app, no account, no connection',
          ),
          l('En cours de développement', 'In development'),
        ],
        scene: (t) => ({
          tags: [
            {
              at: 'table',
              text: t(
                'Que faut-il pour alimenter ce salon ?',
                'What does it take to power this room?',
              ),
            },
          ],
          cam: [0.5, 0.32, 2.6],
        }),
      },
      {
        say: l(
          'Vous dites où vous êtes, ce que vous branchez, et combien d’heures par jour.',
          'You say where you are, what you plug in, and for how many hours a day.',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          panels: [
            {
              kind: 'card',
              title: t('Trois questions', 'Three questions'),
              rows: [
                [
                  t('Où ?', 'Where?'),
                  t('Votre préfecture, ou votre position', 'Your prefecture, or your position'),
                ],
                [
                  t('Quoi ?', 'What?'),
                  t('Vos appareils, le jour et la nuit', 'Your appliances, by day and by night'),
                ],
                [
                  t('Pourquoi ?', 'Why?'),
                  t('Sans réseau, ou pour les coupures', 'Off-grid, or for power cuts'),
                ],
              ],
            },
          ],
          cam: [0.5, 0.25, 2.0],
        }),
      },
      {
        say: l(
          'L’application calcule pour le mois le moins ensoleillé. Si votre installation tient ce mois-là, elle tient toute l’année.',
          'The app calculates for the least sunny month. If your installation holds that month, it holds all year.',
        ),
        focus: 'panneau1',
        notes: [
          pin(
            'panneau1',
            'Barre ambre : août, le pire mois à Kankan',
            'Amber bar: August, the worst month at Kankan',
          ),
        ],
        scene: (t) => ({
          panels: [
            {
              kind: 'bars',
              title: t('Le soleil, mois par mois, à Kankan', 'The sun, month by month, at Kankan'),
              unit: 'kWh/m²/j',
              labels: months(t),
              values: k.normale,
              mark: [7],
            },
          ],
          cam: [0.5, 0.25, 2.0],
        }),
      },
      {
        say: l(
          'Vous savez ce qu’il vous faut : panneaux, batterie, onduleur, câbles. Une fourchette honnête, pas un chiffre magique.',
          'You know what you need: panels, battery, inverter, cables. An honest range, not a magic number.',
        ),
        focus: 'maquette',
        notes: [l('Un ordre de grandeur, pas un devis', 'An order of magnitude, not a quote')],
        scene: () => ({ model: 'kit', cam: [0.6, 0.45, 1.6] }),
      },
      {
        say: l(
          'Et le vendeur ne peut pas tricher. Le rapport porte un QR code : il le scanne, et le calcul est refait devant vous à partir de vos besoins.',
          'And the seller cannot cheat. The report carries a QR code: they scan it, and the calculation is redone in front of you from your needs.',
        ),
        focus: 'panneau1',
        scene: (t) => ({
          model: 'kit',
          panels: [
            {
              kind: 'card',
              title: t('Ce que contient le QR code', 'What the QR code holds'),
              rows: [
                [
                  t('vos besoins', 'your needs'),
                  t('oui : lieu, appareils, situation', 'yes: place, appliances, situation'),
                ],
                [
                  t('les résultats', 'the results'),
                  t('non : ils sont recalculés', 'no: they are recomputed'),
                ],
              ],
            },
          ],
          cam: [0.5, 0.4, 2.1],
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
