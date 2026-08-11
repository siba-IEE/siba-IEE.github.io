/**
 * Chargement de contenu, edge-safe : tout est lu au build depuis des fichiers
 * (JSON gérés par Keystatic, snapshot ORCID). Aucun Reader Node, aucun appel réseau
 * au runtime. C'est la doctrine "snapshot" de kuma-science.
 */
import type { Lang } from './i18n';
import orcidSnapshot from '../data/snapshots/orcid.json';
import profileData from '../content/profile/index.json';

/* ---------- Profil ---------- */

export interface Profile {
  roleFr: string;
  roleEn: string;
  taglineFr: string;
  taglineEn: string;
  bioFr: string;
  bioEn: string;
  photo: string | null;
}

export function getProfile(): Profile {
  return profileData as Profile;
}

/* ---------- Projets ---------- */

export type ProjectKind = 'platform' | 'data' | 'tool';
export type ProjectStatus = 'live' | 'wip' | 'archived';

export interface ProjectRaw {
  title: string;
  kind: ProjectKind;
  status: ProjectStatus;
  featured: boolean;
  order: number;
  year: string;
  url: string | null;
  repo: string | null;
  summaryFr: string;
  summaryEn: string;
  stack: string[];
  tags: string[];
  /** Visuel de carte (chemin sous /public, ex. "/images/projets/rds.jpg"). Optionnel. */
  image?: string;
  bodyFr: string;
  bodyEn: string;
}

export interface Project extends ProjectRaw {
  slug: string;
}

const projectModules = import.meta.glob<{ default: ProjectRaw }>('../content/projects/*.json', {
  eager: true,
});

export function getProjects(): Project[] {
  return Object.entries(projectModules)
    .map(([path, mod]) => ({
      slug: path.split('/').pop()!.replace(/\.json$/, ''),
      ...mod.default,
    }))
    .sort((a, b) => a.order - b.order);
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((project) => project.slug === slug);
}

export const kindLabels: Record<ProjectKind, Record<Lang, string>> = {
  platform: { fr: 'Plateforme', en: 'Platform' },
  data: { fr: 'Données', en: 'Data' },
  tool: { fr: 'Outil', en: 'Tool' },
};

export const statusLabels: Record<ProjectStatus, Record<Lang, string>> = {
  live: { fr: 'En ligne', en: 'Live' },
  wip: { fr: 'En cours', en: 'In progress' },
  archived: { fr: 'Archivé', en: 'Archived' },
};

/* ---------- Publications (ORCID + curation manuelle) ---------- */

interface OrcidWork {
  putCode: number | null;
  title: string;
  year: string | null;
  type: string | null;
  journal: string | null;
  doi: string | null;
  url: string | null;
}

interface ManualPublication {
  title: string;
  authors: string[];
  venue: string | null;
  year: string | null;
  doi: string | null;
  url: string | null;
  type: string;
}

export interface Publication {
  title: string;
  authors: string[];
  venue: string | null;
  year: string | null;
  doi: string | null;
  url: string | null;
  type: string;
  source: 'orcid' | 'manual';
}

const publicationModules = import.meta.glob<{ default: ManualPublication }>(
  '../content/publications/*.json',
  { eager: true },
);

export function getPublications(): Publication[] {
  const manual: Publication[] = Object.values(publicationModules).map((mod) => ({
    ...mod.default,
    source: 'manual',
  }));

  const orcidWorks = (orcidSnapshot.works ?? []) as OrcidWork[];
  const seen = new Set(manual.map((pub) => pub.doi ?? pub.title));
  const fromOrcid: Publication[] = orcidWorks
    .filter((work) => !seen.has(work.doi ?? work.title))
    .map((work) => ({
      title: work.title,
      authors: [],
      venue: work.journal,
      year: work.year,
      doi: work.doi,
      url: work.url ?? (work.doi ? `https://doi.org/${work.doi}` : null),
      type: work.type ?? 'other',
      source: 'orcid',
    }));

  return [...manual, ...fromOrcid].sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0));
}

/* ---------- Parcours et compétences ---------- */

export interface Experience {
  roleFr: string;
  roleEn: string;
  org: string;
  locationFr: string;
  locationEn: string;
  start: string;
  end: string;
  current: boolean;
  order: number;
  descFr: string;
  descEn: string;
}

const experienceModules = import.meta.glob<{ default: Experience }>(
  '../content/experience/*.json',
  { eager: true },
);

export function getExperience(): Experience[] {
  return Object.values(experienceModules)
    .map((mod) => mod.default)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export interface SkillGroup {
  categoryFr: string;
  categoryEn: string;
  order: number;
  itemsFr: string[];
  itemsEn: string[];
}

const skillModules = import.meta.glob<{ default: SkillGroup }>('../content/skills/*.json', {
  eager: true,
});

export function getSkills(): SkillGroup[] {
  return Object.values(skillModules)
    .map((mod) => mod.default)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/* ---------- Formation ---------- */

export interface Education {
  titleFr: string;
  titleEn: string;
  school: string;
  locationFr: string;
  locationEn: string;
  start: string;
  end: string;
  order: number;
  noteFr: string;
  noteEn: string;
}

const educationModules = import.meta.glob<{ default: Education }>('../content/education/*.json', {
  eager: true,
});

export function getEducation(): Education[] {
  return Object.values(educationModules)
    .map((mod) => mod.default)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/* ---------- Recherche (travaux) ---------- */

/** Chiffre clé de la fiche technique (ex. « 31 stations »). */
export interface ResearchMetric {
  value: string;
  labelFr: string;
  labelEn: string;
}

/** Figure (carte, courbe) rattachée à une section du travail. */
export interface ResearchFigure {
  /** Chemin sous /public (ex. "/images/recherche/calage-variogramme.png"). */
  src: string;
  /** Section d'ancrage : la figure s'affiche sous cette section. */
  section: 'method' | 'result';
  captionFr: string;
  captionEn: string;
  /** Figure maîtresse : occupe toute la largeur de la planche. */
  featured?: boolean;
}

export interface Research {
  titleFr: string;
  titleEn: string;
  summaryFr: string;
  summaryEn: string;
  status: ProjectStatus;
  order: number;
  /** Avancement du chantier, une phrase. */
  progressFr: string;
  progressEn: string;
  /** Chiffres clés (fiche technique). Optionnel. */
  metrics?: ResearchMetric[];
  /** Figures rattachées aux sections méthode / résultats. Optionnel. */
  figures?: ResearchFigure[];
  /** Problématique / positionnement (markdown, peut contenir du LaTeX $...$). */
  problemFr: string;
  problemEn: string;
  /** Hypothèses testées (liste ; LaTeX autorisé). */
  hypothesesFr: string[];
  hypothesesEn: string[];
  /** Méthode et calculs (markdown ; LaTeX $$...$$ autorisé). */
  methodFr: string;
  methodEn: string;
  /** Résultats / où j'en suis (markdown). */
  resultsFr: string;
  resultsEn: string;
  /** Questions ouvertes / prochaines étapes (liste). */
  questionsFr: string[];
  questionsEn: string[];
  /** Lien vers l'article / le DOI si publié. Optionnel. */
  url?: string;
}

const researchModules = import.meta.glob<{ default: Research }>('../content/recherche/*.json', {
  eager: true,
});

export function getResearch(): Research[] {
  return Object.values(researchModules)
    .map((mod) => mod.default)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
