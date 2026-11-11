/**
 * Découpage du film de chaque réalisation. Un plan par phrase du commentaire : le plan
 * d'indice n accompagne la phrase n, le dernier plan vaut pour les phrases restantes.
 * Les faits affichés viennent des fiches de src/content/projects.
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

export interface Film {
  glyph: Glyph;
  /** Teinte du carton de la chaîne. */
  tint: string;
  shots: Shot[];
}

const same = (text: string): Label => ({ fr: text, en: text });
const l = (fr: string, en: string): Label => ({ fr, en });
const blank = same('');

export const films: Record<string, Film> = {
  'rnde-guinee': {
    glyph: 'gn',
    tint: '#16424d',
    shots: [
      {
        scene: 'device',
        kind: 'browser',
        address: 'rnde.kumascience.com',
        blocks: [
          l('Fiches territoriales', 'Territory sheets'),
          l('Jeux de données', 'Datasets'),
          l('Cartes', 'Maps'),
        ],
      },
      { scene: 'territory', country: 'gn', tag: l('340 sous-préfectures', '340 sub-prefectures') },
      {
        scene: 'network',
        hub: same('RNDE'),
        nodes: [
          l('374 fiches', '374 sheets'),
          l('6 jeux ouverts', '6 open datasets'),
          same('API'),
          same('WMS'),
          same('WFS'),
        ],
      },
      { scene: 'layers', layers: [same('ISO 19115'), same('CSW'), same('DCAT')] },
      {
        scene: 'network',
        hub: l('Catalogue', 'Catalogue'),
        nodes: [l('Portail', 'Portal'), l('Portail', 'Portal'), l('Portail', 'Portal')],
      },
      {
        scene: 'territory',
        country: 'gn',
        tag: l('Couverture du territoire', 'Coverage of the territory'),
      },
    ],
  },
  'rds-guinee': {
    glyph: 'gn',
    tint: '#4d3a16',
    shots: [
      {
        scene: 'territory',
        country: 'gn',
        tag: l('34 chefs-lieux de préfecture', '34 prefecture capitals'),
      },
      {
        scene: 'timeline',
        from: 1981,
        to: 2025,
        steps: [l('Mensuel', 'Monthly'), l('Journalier', 'Daily'), l('Horaire', 'Hourly')],
      },
      {
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
      {
        scene: 'fields',
        fields: [
          same('Source'),
          l('Méthode', 'Method'),
          l('Niveau de confiance', 'Confidence level'),
          l('Période de validité', 'Validity period'),
          l('Incertitude', 'Uncertainty'),
        ],
      },
      {
        scene: 'levels',
        levels: [
          { letter: 'A', label: l('Mesures au sol validées', 'Validated ground measurements') },
          { letter: 'B', label: l('Satellite et réanalyse', 'Satellite and reanalysis') },
        ],
      },
      {
        scene: 'territory',
        country: 'gn',
        tag: same('ESMAP / WAPP'),
        station: l('Kankan · niveau A', 'Kankan · level A'),
      },
      { scene: 'archive', tags: [same('CC BY 4.0'), same('Zenodo'), same('v2.0.1')] },
    ],
  },
  'rds-cote-divoire': {
    glyph: 'ci',
    tint: '#4d2a16',
    shots: [
      { scene: 'territory', country: 'ci', tag: l('142 localités', '142 localities') },
      {
        scene: 'timeline',
        from: 1991,
        to: 2025,
        steps: [l('Mensuel', 'Monthly'), l('Journalier', 'Daily')],
      },
      {
        scene: 'archive',
        tags: [l('37,6 millions de valeurs', '37.6 million values'), same('CC BY 4.0')],
      },
      {
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
        output: same('GHI · DNI · DHI'),
      },
      {
        scene: 'levels',
        levels: [
          {
            letter: 'A',
            label: l('Mesures au sol : pas encore', 'Ground measurements: not yet'),
            muted: true,
          },
          { letter: 'B', label: l('Satellite et réanalyse', 'Satellite and reanalysis') },
        ],
      },
      {
        scene: 'sources',
        inputs: [l('Lot', 'Batch'), l('Lot', 'Batch'), l('Lot', 'Batch')],
        core: same('Kuma Data Core'),
        output: l('Décision publiée', 'Published decision'),
      },
    ],
  },
  'kuma-data-core': {
    glyph: 'database',
    tint: '#1c2f52',
    shots: [
      {
        scene: 'layers',
        layers: [
          l('Ingestion', 'Ingestion'),
          l('Niveau de confiance', 'Confidence level'),
          l('Versions', 'Versions'),
          l('API publique', 'Public API'),
        ],
      },
      {
        scene: 'fields',
        fields: [
          same('Source'),
          l('Méthode', 'Method'),
          l('Confiance A · B · C', 'Confidence A · B · C'),
          l('Dates de validité', 'Validity dates'),
          l('Statut éditorial', 'Editorial status'),
        ],
      },
      {
        scene: 'versions',
        note: l('L’ancienne version est conservée', 'The previous version is kept'),
      },
      { scene: 'versions', note: l('Table d’audit', 'Audit table'), log: true },
      {
        scene: 'sources',
        inputs: [
          same('NASA POWER'),
          same('SARAH-3'),
          same('CAMS'),
          same('ERA5-Land'),
          l('Mesures au sol', 'Ground measurements'),
        ],
        core: same('Kuma Data Core'),
        output: l('Séries', 'Series'),
      },
      { scene: 'solar' },
      { scene: 'network', hub: same('API FastAPI'), nodes: [blank, blank, blank, blank] },
      { scene: 'territory', country: 'gn', tag: same('api.kumascience.com') },
      { scene: 'territory', country: 'ci', tag: l('142 localités', '142 localities') },
      { scene: 'archive', tags: [l('Licence AGPL', 'AGPL licence'), same('github.com/siba-IEE')] },
    ],
  },
  'solclim-3': {
    glyph: 'panel',
    tint: '#523f1c',
    shots: [
      { scene: 'solar' },
      {
        scene: 'device',
        kind: 'browser',
        address: 'solclim3.kumascience.com',
        blocks: [
          l('Photovoltaïque', 'Photovoltaics'),
          l('Stockage', 'Storage'),
          l('Étude', 'Study'),
        ],
      },
      { scene: 'check', left: same('SolClim-3'), right: same('pvlib'), count: 800 },
    ],
  },
  'kuma-science': {
    glyph: 'browser',
    tint: '#2b1c52',
    shots: [
      {
        scene: 'network',
        hub: same('Kuma Science'),
        nodes: [l('Données', 'Data'), l('Méthodes', 'Methods'), l('Outils', 'Tools')],
      },
      {
        scene: 'archive',
        tags: [l('Accès libre', 'Open access'), l('Afrique francophone', 'French-speaking Africa')],
      },
      {
        scene: 'device',
        kind: 'browser',
        address: 'kumascience.com',
        blocks: [l('Média', 'Media'), l('Catalogue', 'Catalogue'), l('Boutique', 'Shop')],
      },
      { scene: 'layers', layers: [same('Astro'), same('Supabase'), same('Cloudflare')] },
      {
        scene: 'check',
        left: l('Tests', 'Tests'),
        right: l('Intégration continue', 'Continuous integration'),
      },
    ],
  },
  'kuma-solar-bridge': {
    glyph: 'files',
    tint: '#1c5240',
    shots: [
      { scene: 'device', kind: 'desktop', blocks: [same('CSV'), same('CSV'), same('CSV')] },
      { scene: 'solar' },
      { scene: 'convert', output: l('Format commun', 'Common format') },
      { scene: 'network', hub: same('Kuma Data Core'), nodes: [same('Solar Bridge')] },
    ],
  },
  'kuma-solaire-app': {
    glyph: 'phone',
    tint: '#521c38',
    shots: [
      {
        scene: 'device',
        kind: 'phone',
        blocks: [
          l('Lieu de l’installation', 'Installation site'),
          l('Appareils', 'Appliances'),
          l('Dimensionnement', 'Sizing'),
        ],
      },
      { scene: 'solar' },
      {
        scene: 'layers',
        layers: [
          l('Interface', 'Interface'),
          l('Règle d’imports', 'Import rule'),
          l('Moteur de calcul', 'Calculation engine'),
        ],
      },
      { scene: 'network', hub: same('Kuma Solaire'), nodes: [blank, blank, blank], flaky: true },
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
