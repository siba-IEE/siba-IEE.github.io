import { describe, it, expect } from 'vitest';
import {
  getProjects,
  getPublications,
  getProfile,
  getExperience,
  getSkills,
  kindLabels,
  statusLabels,
} from '../../src/lib/content';

describe('getProjects', () => {
  const projects = getProjects();

  it('retourne au moins un projet', () => {
    expect(projects.length).toBeGreaterThan(0);
  });

  it('attribue un slug non vide à chaque projet', () => {
    for (const project of projects) expect(project.slug, project.title).toBeTruthy();
  });

  it('trie les projets par ordre croissant', () => {
    const orders = projects.map((project) => project.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('fournit un résumé FR et EN pour chaque projet', () => {
    for (const project of projects) {
      expect(project.summaryFr, `${project.slug}.summaryFr`).toBeTruthy();
      expect(project.summaryEn, `${project.slug}.summaryEn`).toBeTruthy();
    }
  });
});

describe('getPublications', () => {
  const publications = getPublications();

  it('trie par année décroissante', () => {
    const years = publications.map((publication) => Number(publication.year ?? 0));
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('ne contient pas de doublon (DOI ou titre)', () => {
    const keys = publications.map((publication) => publication.doi ?? publication.title);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('labels bilingues', () => {
  it('kindLabels couvre FR et EN', () => {
    for (const label of Object.values(kindLabels)) {
      expect(label.fr).toBeTruthy();
      expect(label.en).toBeTruthy();
    }
  });

  it('statusLabels couvre FR et EN', () => {
    for (const label of Object.values(statusLabels)) {
      expect(label.fr).toBeTruthy();
      expect(label.en).toBeTruthy();
    }
  });
});

describe('getProfile', () => {
  it('a un contenu bilingue entièrement rempli', () => {
    const profile = getProfile();
    for (const field of ['roleFr', 'roleEn', 'taglineFr', 'taglineEn', 'bioFr', 'bioEn'] as const) {
      expect(profile[field], field).toBeTruthy();
    }
  });
});

describe('parcours et compétences', () => {
  it('renvoient toujours un tableau (même sans contenu)', () => {
    expect(Array.isArray(getExperience())).toBe(true);
    expect(Array.isArray(getSkills())).toBe(true);
  });
});
