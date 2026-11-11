/**
 * Le film de chaque réalisation, écrit comme une explication : à quoi elle sert, comment
 * elle fonctionne, ce qu'on en obtient. Chaque étape associe une phrase, un plan vectoriel
 * et, au besoin, quelques notes qui définissent les termes. Les faits viennent des fiches
 * de src/content/projects.
 */
import type { Lang } from '../lib/i18n';

export type Label = Record<Lang, string>;

export type Shot =
  | { scene: 'territory'; country: 'gn' | 'ci'; tag: Label; station?: Label }
  | { scene: 'timeline'; from: number; to: number; steps: Label[] }
  | { scene: 'sources'; inputs: Label[]; core: Label; output: Label }
  | { scene: 'fields'; fields: Label[] }
  | { scene: 'levels'; levels: { letter: string; label: Label; muted?: boolean }[] }
  | { scene: 'versions'; note: Label; log?: boolean }
  | { scene: 'layers'; layers: Label[] }
  | { scene: 'network'; hub: Label; nodes: Label[]; flaky?: boolean }
  | { scene: 'solar' }
  | { scene: 'check'; left: Label; right: Label; count?: number }
  | { scene: 'device'; kind: 'browser' | 'phone' | 'desktop'; address?: string; blocks: Label[] }
  | { scene: 'convert'; output: Label }
  | { scene: 'archive'; tags: Label[] };

/** Pictogramme de la chaîne sur la mosaïque de la télévision. */
export type Glyph = 'gn' | 'ci' | 'database' | 'panel' | 'browser' | 'files' | 'phone';

/** Une étape du film : ce qui est dit, ce qui est montré, et les précisions affichées à côté. */
export interface Beat {
  say: Label;
  shot: Shot;
  notes?: Label[];
}

export interface Film {
  glyph: Glyph;
  /** Teinte du carton de la chaîne. */
  tint: string;
  beats: Beat[];
}

const same = (text: string): Label => ({ fr: text, en: text });
const l = (fr: string, en: string): Label => ({ fr, en });
const blank = same('');

const radiation = [
  l(
    'GHI : rayonnement global sur un plan horizontal',
    'GHI: global irradiance on a horizontal plane',
  ),
  l('DNI : rayonnement direct, face au soleil', 'DNI: direct irradiance, facing the sun'),
  l('DHI : rayonnement diffusé par le ciel', 'DHI: irradiance scattered by the sky'),
];

export const films: Record<string, Film> = {
  'rnde-guinee': {
    glyph: 'gn',
    tint: '#16424d',
    beats: [
      {
        say: l(
          'Le RNDE rassemble en un seul endroit la donnée énergétique de la Guinée, sous-préfecture par sous-préfecture.',
          'RNDE gathers Guinea’s energy data in one place, sub-prefecture by sub-prefecture.',
        ),
        shot: {
          scene: 'territory',
          country: 'gn',
          tag: l('340 sous-préfectures', '340 sub-prefectures'),
        },
        notes: [l('Un repère : un territoire décrit', 'One marker: one territory described')],
      },
      {
        say: l(
          'Chaque territoire a sa fiche. Il y en a 374.',
          'Each territory has its own sheet. There are 374.',
        ),
        shot: {
          scene: 'device',
          kind: 'browser',
          address: 'rnde.kumascience.com',
          blocks: [
            l('Fiche territoriale', 'Territory sheet'),
            l('Fiche territoriale', 'Territory sheet'),
            l('Fiche territoriale', 'Territory sheet'),
          ],
        },
      },
      {
        say: l(
          'Six jeux de données sont ouverts. On les lit par une API ou par des services cartographiques.',
          'Six datasets are open. They are read through an API or through map services.',
        ),
        shot: {
          scene: 'network',
          hub: same('RNDE'),
          nodes: [l('6 jeux ouverts', '6 open datasets'), same('API'), same('WMS'), same('WFS')],
        },
        notes: [
          l('API : les valeurs, pour un programme', 'API: the values, for a program'),
          l('WMS : des cartes prêtes à afficher', 'WMS: maps ready to display'),
          l('WFS : les objets géographiques eux-mêmes', 'WFS: the geographic features themselves'),
        ],
      },
      {
        say: l(
          'Un catalogue décrit chaque jeu selon trois normes internationales.',
          'A catalogue describes each dataset according to three international standards.',
        ),
        shot: { scene: 'layers', layers: [same('ISO 19115'), same('CSW'), same('DCAT')] },
        notes: [
          l(
            'ISO 19115 : la fiche descriptive d’un jeu',
            'ISO 19115: the description sheet of a dataset',
          ),
          l('CSW : l’interrogation du catalogue', 'CSW: querying the catalogue'),
          l('DCAT : l’échange entre portails', 'DCAT: exchange between portals'),
        ],
      },
      {
        say: l(
          'Grâce à ces normes, un autre portail peut moissonner le catalogue et présenter ces données chez lui.',
          'Thanks to these standards, another portal can harvest the catalogue and present the data on its side.',
        ),
        shot: {
          scene: 'network',
          hub: l('Catalogue', 'Catalogue'),
          nodes: [l('Portail', 'Portal'), l('Portail', 'Portal'), l('Portail', 'Portal')],
        },
      },
      {
        say: l(
          '« National » désigne la couverture du territoire, pas un statut conféré par l’État.',
          '“National” refers to the coverage of the territory, not to a status granted by the State.',
        ),
        shot: {
          scene: 'territory',
          country: 'gn',
          tag: l('Tout le territoire', 'The whole territory'),
        },
      },
    ],
  },
  'rds-guinee': {
    glyph: 'gn',
    tint: '#4d3a16',
    beats: [
      {
        say: l(
          'Pour dimensionner une installation solaire, il faut connaître le rayonnement du lieu sur de longues années.',
          'Sizing a solar installation requires knowing the irradiance of the site over many years.',
        ),
        shot: { scene: 'solar' },
        notes: [l('Le soleil reçu fixe la production', 'The sun received sets the output')],
      },
      {
        say: l(
          'Le référentiel donne cette information pour 34 chefs-lieux de préfecture de Guinée.',
          'The reference gives this information for 34 prefecture capitals of Guinea.',
        ),
        shot: { scene: 'territory', country: 'gn', tag: l('34 localités', '34 localities') },
        notes: [l('Plus de 68 millions d’enregistrements', 'More than 68 million records')],
      },
      {
        say: l(
          'Il réunit des sources satellitaires, des réanalyses et une station au sol.',
          'It brings together satellite sources, reanalyses and a ground station.',
        ),
        shot: {
          scene: 'sources',
          inputs: [
            same('NASA POWER'),
            same('SARAH-3'),
            same('CAMS'),
            same('ERA5-Land'),
            l('Station au sol', 'Ground station'),
          ],
          core: same('RDS Guinée'),
          output: same('CSV'),
        },
      },
      {
        say: l(
          'Les séries remontent jusqu’à 1981, au pas mensuel, journalier ou horaire.',
          'The series go back to 1981, at monthly, daily or hourly steps.',
        ),
        shot: {
          scene: 'timeline',
          from: 1981,
          to: 2025,
          steps: [l('Mensuel', 'Monthly'), l('Journalier', 'Daily'), l('Horaire', 'Hourly')],
        },
      },
      {
        say: l(
          'Chaque valeur garde ce qui permet de la juger : sa source, sa méthode, sa période de validité, son incertitude.',
          'Each value keeps what is needed to judge it: its source, its method, its validity period, its uncertainty.',
        ),
        shot: {
          scene: 'fields',
          fields: [
            same('Source'),
            l('Méthode', 'Method'),
            l('Niveau de confiance', 'Confidence level'),
            l('Période de validité', 'Validity period'),
            l('Incertitude', 'Uncertainty'),
          ],
        },
      },
      {
        say: l(
          'Le niveau de confiance dit d’où vient la valeur.',
          'The confidence level tells where the value comes from.',
        ),
        shot: {
          scene: 'levels',
          levels: [
            { letter: 'A', label: l('Mesure au sol validée', 'Validated ground measurement') },
            { letter: 'B', label: l('Satellite ou réanalyse', 'Satellite or reanalysis') },
          ],
        },
      },
      {
        say: l(
          'La station de Kankan, issue de la campagne ESMAP/WAPP, est la première au niveau A.',
          'The Kankan station, from the ESMAP/WAPP campaign, is the first at level A.',
        ),
        shot: {
          scene: 'territory',
          country: 'gn',
          tag: same('ESMAP / WAPP'),
          station: l('Kankan · niveau A', 'Kankan · level A'),
        },
      },
      {
        say: l(
          'Le tout est publié sous licence CC BY 4.0 et archivé sur Zenodo.',
          'Everything is published under the CC BY 4.0 licence and archived on Zenodo.',
        ),
        shot: { scene: 'archive', tags: [same('CC BY 4.0'), same('Zenodo'), same('v2.0.1')] },
        notes: [
          l(
            'CC BY : réutilisation libre, en citant la source',
            'CC BY: free reuse, with attribution',
          ),
        ],
      },
    ],
  },
  'rds-cote-divoire': {
    glyph: 'ci',
    tint: '#4d2a16',
    beats: [
      {
        say: l(
          'Le même référentiel existe pour la Côte d’Ivoire : 142 localités.',
          'The same reference exists for Côte d’Ivoire: 142 localities.',
        ),
        shot: { scene: 'territory', country: 'ci', tag: l('142 localités', '142 localities') },
        notes: [l('31 régions', '31 regions'), l('111 départements', '111 departments')],
      },
      {
        say: l(
          'Il fournit le rayonnement, la température, l’humidité, le vent, la pluie et les particules.',
          'It provides irradiance, temperature, humidity, wind, rain and particles.',
        ),
        shot: {
          scene: 'layers',
          layers: [
            l('Rayonnement', 'Irradiance'),
            l('Température, humidité', 'Temperature, humidity'),
            l('Vent', 'Wind'),
            l('Pluie', 'Rain'),
            l('Particules', 'Particles'),
          ],
        },
        notes: radiation,
      },
      {
        say: l('Ces grandeurs viennent de six sources.', 'These quantities come from six sources.'),
        shot: {
          scene: 'sources',
          inputs: [
            same('NASA POWER'),
            same('ERA5'),
            same('CAMS'),
            same('SARAH-3'),
            same('GPM IMERG'),
            same('CHIRPS'),
          ],
          core: same('RDS Côte d’Ivoire'),
          output: same('CSV'),
        },
      },
      {
        say: l(
          'Les séries couvrent 1991 à 2025, au pas mensuel et journalier.',
          'The series cover 1991 to 2025, at monthly and daily steps.',
        ),
        shot: {
          scene: 'timeline',
          from: 1991,
          to: 2025,
          steps: [l('Mensuel', 'Monthly'), l('Journalier', 'Daily')],
        },
        notes: [l('37,6 millions de valeurs', '37.6 million values')],
      },
      {
        say: l(
          'Toutes sont au niveau de confiance B : aucune mesure au sol n’est encore intégrée.',
          'All are at confidence level B: no ground measurement is integrated yet.',
        ),
        shot: {
          scene: 'levels',
          levels: [
            {
              letter: 'A',
              label: l('Mesure au sol : pas encore', 'Ground measurement: not yet'),
              muted: true,
            },
            { letter: 'B', label: l('Satellite ou réanalyse', 'Satellite or reanalysis') },
          ],
        },
      },
      {
        say: l(
          'Chaque lot est produit par Kuma Data Core, et une décision publiée le documente.',
          'Each batch is produced by Kuma Data Core, and a published decision documents it.',
        ),
        shot: {
          scene: 'sources',
          inputs: [l('Lot', 'Batch'), l('Lot', 'Batch'), l('Lot', 'Batch')],
          core: same('Kuma Data Core'),
          output: l('Décision publiée', 'Published decision'),
        },
      },
      {
        say: l(
          'Les données sont sous licence CC BY 4.0.',
          'The data is under the CC BY 4.0 licence.',
        ),
        shot: { scene: 'archive', tags: [same('CC BY 4.0'), same('Zenodo')] },
        notes: [
          l(
            'CC BY : réutilisation libre, en citant la source',
            'CC BY: free reuse, with attribution',
          ),
        ],
      },
    ],
  },
  'kuma-data-core': {
    glyph: 'database',
    tint: '#1c2f52',
    beats: [
      {
        say: l(
          'Kuma Data Core est le moteur qui fabrique les référentiels. Il ingère plusieurs sources.',
          'Kuma Data Core is the engine that builds the references. It ingests several sources.',
        ),
        shot: {
          scene: 'sources',
          inputs: [
            same('NASA POWER'),
            same('SARAH-3'),
            same('CAMS'),
            same('ERA5-Land'),
            l('Mesures au sol', 'Ground measurements'),
          ],
          core: same('Kuma Data Core'),
          output: l('Référentiels', 'References'),
        },
      },
      {
        say: l(
          'Une valeur n’est jamais enregistrée seule : elle porte sa source, sa méthode, son niveau de confiance, ses dates de validité et son statut éditorial.',
          'A value is never stored alone: it carries its source, its method, its confidence level, its validity dates and its editorial status.',
        ),
        shot: {
          scene: 'fields',
          fields: [
            same('Source'),
            l('Méthode', 'Method'),
            l('Confiance A · B · C', 'Confidence A · B · C'),
            l('Dates de validité', 'Validity dates'),
            l('Statut éditorial', 'Editorial status'),
          ],
        },
      },
      {
        say: l(
          'Rien n’est écrasé. Une correction crée une nouvelle version, et l’ancienne est conservée.',
          'Nothing is overwritten. A correction creates a new version, and the previous one is kept.',
        ),
        shot: {
          scene: 'versions',
          note: l('L’ancienne version reste', 'The previous version stays'),
        },
      },
      {
        say: l(
          'Des triggers PostgreSQL inscrivent chaque écriture dans une table d’audit.',
          'PostgreSQL triggers record every write in an audit table.',
        ),
        shot: { scene: 'versions', note: l('Table d’audit', 'Audit table'), log: true },
      },
      {
        say: l(
          'À partir de modèles publiés, le moteur calcule ce dont l’ingénieur a besoin, jusqu’au productible.',
          'From published models, the engine computes what the engineer needs, up to the energy yield.',
        ),
        shot: { scene: 'solar' },
        notes: [
          l('Rayonnement dans le plan des modules', 'Irradiance in the plane of the modules'),
          l('P50 : production atteinte une année sur deux', 'P50: output reached one year in two'),
          l(
            'P90 : production atteinte neuf années sur dix',
            'P90: output reached nine years in ten',
          ),
        ],
      },
      {
        say: l(
          'Une API FastAPI sert ces données aux outils.',
          'A FastAPI API serves this data to tools.',
        ),
        shot: { scene: 'network', hub: same('API FastAPI'), nodes: [blank, blank, blank, blank] },
      },
      {
        say: l(
          'Une instance publique est en ligne pour la Guinée. Le même moteur tourne pour la Côte d’Ivoire et le Burkina Faso.',
          'A public instance is online for Guinea. The same engine runs for Côte d’Ivoire and Burkina Faso.',
        ),
        shot: { scene: 'territory', country: 'gn', tag: same('api.kumascience.com') },
        notes: [
          l('Côte d’Ivoire : 142 localités', 'Côte d’Ivoire: 142 localities'),
          l(
            'Burkina Faso : 47 provinces, 351 communes',
            'Burkina Faso: 47 provinces, 351 communes',
          ),
        ],
      },
      {
        say: l('Le code est sous licence AGPL.', 'The code is under the AGPL licence.'),
        shot: {
          scene: 'archive',
          tags: [l('Licence AGPL', 'AGPL licence'), same('github.com/siba-IEE')],
        },
      },
    ],
  },
  'solclim-3': {
    glyph: 'panel',
    tint: '#523f1c',
    beats: [
      {
        say: l(
          'SolClim-3 dimensionne une installation photovoltaïque et son stockage.',
          'SolClim-3 sizes a photovoltaic installation and its storage.',
        ),
        shot: { scene: 'solar' },
        notes: [l('Modules photovoltaïques', 'Photovoltaic modules'), l('Batteries', 'Batteries')],
      },
      {
        say: l('Il s’adresse aux bureaux d’études.', 'It is meant for engineering offices.'),
        shot: {
          scene: 'device',
          kind: 'browser',
          address: 'solclim3.kumascience.com',
          blocks: [
            l('Photovoltaïque', 'Photovoltaics'),
            l('Stockage', 'Storage'),
            l('Étude', 'Study'),
          ],
        },
      },
      {
        say: l(
          'Chaque calcul est vérifié contre pvlib, la bibliothèque de référence du domaine.',
          'Each calculation is checked against pvlib, the reference library of the field.',
        ),
        shot: { scene: 'check', left: same('SolClim-3'), right: same('pvlib') },
        notes: [l('Les deux courbes doivent se superposer', 'The two curves must overlap')],
      },
      {
        say: l(
          '800 tests automatisés couvrent ces calculs.',
          '800 automated tests cover these calculations.',
        ),
        shot: { scene: 'check', left: same('SolClim-3'), right: same('pvlib'), count: 800 },
        notes: [l('Un point : un test', 'One dot: one test')],
      },
    ],
  },
  'kuma-science': {
    glyph: 'browser',
    tint: '#2b1c52',
    beats: [
      {
        say: l(
          'Kuma Science publie en accès libre des données, des méthodes et des outils pour l’ingénierie énergétique en Afrique francophone.',
          'Kuma Science openly publishes data, methods and tools for energy engineering in French-speaking Africa.',
        ),
        shot: {
          scene: 'network',
          hub: same('Kuma Science'),
          nodes: [l('Données', 'Data'), l('Méthodes', 'Methods'), l('Outils', 'Tools')],
        },
      },
      {
        say: l(
          'Le site réunit un média éditorial, un catalogue de séries et une boutique d’outils.',
          'The site brings together an editorial media, a catalogue of series and a tool shop.',
        ),
        shot: {
          scene: 'device',
          kind: 'browser',
          address: 'kumascience.com',
          blocks: [l('Média', 'Media'), l('Catalogue', 'Catalogue'), l('Boutique', 'Shop')],
        },
      },
      {
        say: l(
          'Les séries du catalogue viennent de Kuma Data Core.',
          'The series in the catalogue come from Kuma Data Core.',
        ),
        shot: {
          scene: 'sources',
          inputs: [same('Kuma Data Core')],
          core: l('Catalogue', 'Catalogue'),
          output: l('Séries', 'Series'),
        },
      },
      {
        say: l(
          'Il est construit avec Astro. Supabase gère les comptes, Cloudflare l’héberge.',
          'It is built with Astro. Supabase handles accounts, Cloudflare hosts it.',
        ),
        shot: { scene: 'layers', layers: [same('Astro'), same('Supabase'), same('Cloudflare')] },
        notes: [
          l('Astro : les pages', 'Astro: the pages'),
          l('Supabase : les comptes', 'Supabase: the accounts'),
          l('Cloudflare : l’hébergement', 'Cloudflare: the hosting'),
        ],
      },
      {
        say: l(
          'Les erreurs sont suivies avec Sentry. Des tests et une intégration continue couvrent le code.',
          'Errors are tracked with Sentry. Tests and continuous integration cover the code.',
        ),
        shot: {
          scene: 'check',
          left: l('Tests', 'Tests'),
          right: l('Intégration continue', 'Continuous integration'),
        },
      },
    ],
  },
  'kuma-solar-bridge': {
    glyph: 'files',
    tint: '#1c5240',
    beats: [
      {
        say: l(
          'Une installation solaire enregistre ses mesures dans un datalogger.',
          'A solar installation records its measurements in a datalogger.',
        ),
        shot: { scene: 'solar' },
      },
      {
        say: l(
          'Chaque fabricant exporte ses fichiers CSV à sa manière.',
          'Each manufacturer exports its CSV files in its own way.',
        ),
        shot: { scene: 'device', kind: 'desktop', blocks: [same('CSV'), same('CSV'), same('CSV')] },
        notes: [l('Mêmes mesures, colonnes différentes', 'Same measurements, different columns')],
      },
      {
        say: l(
          'Solar Bridge lit ces fichiers et les convertit vers un format commun.',
          'Solar Bridge reads these files and converts them to a common format.',
        ),
        shot: { scene: 'convert', output: l('Format commun', 'Common format') },
      },
      {
        say: l(
          'C’est le premier outil qui utilise l’API de Kuma Data Core.',
          'It is the first tool that uses the Kuma Data Core API.',
        ),
        shot: { scene: 'network', hub: same('Kuma Data Core'), nodes: [same('Solar Bridge')] },
      },
      {
        say: l(
          'Un logiciel de bureau, pour les bureaux d’études photovoltaïques d’Afrique de l’Ouest. Il est en cours de développement.',
          'A desktop application for photovoltaic engineering offices in West Africa. It is in development.',
        ),
        shot: { scene: 'layers', layers: [same('Tauri'), same('React'), same('TypeScript')] },
      },
    ],
  },
  'kuma-solaire-app': {
    glyph: 'phone',
    tint: '#521c38',
    beats: [
      {
        say: l(
          'Kuma Solaire est une application mobile pour dimensionner une installation solaire sur le terrain.',
          'Kuma Solaire is a mobile app for sizing a solar installation in the field.',
        ),
        shot: {
          scene: 'device',
          kind: 'phone',
          blocks: [
            l('Lieu de l’installation', 'Installation site'),
            l('Appareils', 'Appliances'),
            l('Dimensionnement', 'Sizing'),
          ],
        },
      },
      {
        say: l(
          'Le moteur de calcul est séparé de l’interface par une règle d’imports stricte.',
          'The calculation engine is separated from the interface by a strict import rule.',
        ),
        shot: {
          scene: 'layers',
          layers: [
            l('Interface', 'Interface'),
            l('Règle d’imports', 'Import rule'),
            l('Moteur de calcul', 'Calculation engine'),
          ],
        },
        notes: [
          l('Le calcul se vérifie sans l’écran', 'The calculation is checked without the screen'),
        ],
      },
      {
        say: l(
          'Une page de vérification expose ses résultats.',
          'A verification page exposes its results.',
        ),
        shot: {
          scene: 'check',
          left: l('Moteur', 'Engine'),
          right: l('Vérification', 'Verification'),
        },
      },
      {
        say: l(
          'L’application est conçue pour fonctionner avec une connexion intermittente. Elle est en cours de développement.',
          'The app is designed to work with an intermittent connection. It is in development.',
        ),
        shot: {
          scene: 'network',
          hub: same('Kuma Solaire'),
          nodes: [blank, blank, blank],
          flaky: true,
        },
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
