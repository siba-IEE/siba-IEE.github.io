import { describe, it, expect } from 'vitest';
import {
  getLangFromUrl,
  localizePath,
  unlocalizePath,
  alternatePath,
  useTranslations,
  ui,
} from '../../src/lib/i18n';

const url = (pathname: string) => new URL(pathname, 'https://siba.test');

describe('getLangFromUrl', () => {
  it('renvoie fr par défaut à la racine', () => {
    expect(getLangFromUrl(url('/'))).toBe('fr');
  });

  it('renvoie fr pour les pages sans préfixe', () => {
    expect(getLangFromUrl(url('/projets'))).toBe('fr');
    expect(getLangFromUrl(url('/projets/kuma-science'))).toBe('fr');
  });

  it('renvoie en pour le préfixe /en', () => {
    expect(getLangFromUrl(url('/en'))).toBe('en');
    expect(getLangFromUrl(url('/en/projets'))).toBe('en');
    expect(getLangFromUrl(url('/en/projets/kuma-science'))).toBe('en');
  });

  it("ne confond pas un slug commençant par « en »", () => {
    expect(getLangFromUrl(url('/english'))).toBe('fr');
  });
});

describe('localizePath', () => {
  it('laisse le français à la racine', () => {
    expect(localizePath('/', 'fr')).toBe('/');
    expect(localizePath('/projets', 'fr')).toBe('/projets');
  });

  it('préfixe /en pour l’anglais', () => {
    expect(localizePath('/', 'en')).toBe('/en');
    expect(localizePath('/projets', 'en')).toBe('/en/projets');
    expect(localizePath('/projets/kuma-science', 'en')).toBe('/en/projets/kuma-science');
  });

  it('normalise un chemin sans slash initial', () => {
    expect(localizePath('projets', 'en')).toBe('/en/projets');
    expect(localizePath('projets', 'fr')).toBe('/projets');
  });
});

describe('unlocalizePath', () => {
  it('retire le préfixe /en', () => {
    expect(unlocalizePath('/en')).toBe('/');
    expect(unlocalizePath('/en/projets')).toBe('/projets');
    expect(unlocalizePath('/en/projets/kuma-science')).toBe('/projets/kuma-science');
  });

  it('laisse un chemin français inchangé', () => {
    expect(unlocalizePath('/')).toBe('/');
    expect(unlocalizePath('/projets')).toBe('/projets');
  });

  it('tolère les slashs de fin', () => {
    expect(unlocalizePath('/en/')).toBe('/');
    expect(unlocalizePath('/projets/')).toBe('/projets');
  });

  it("ne casse pas un slug commençant par « en »", () => {
    expect(unlocalizePath('/english')).toBe('/english');
  });
});

describe('alternatePath', () => {
  it('bascule du français vers l’anglais', () => {
    expect(alternatePath('/', 'en')).toBe('/en');
    expect(alternatePath('/projets', 'en')).toBe('/en/projets');
    expect(alternatePath('/projets/kuma-science', 'en')).toBe('/en/projets/kuma-science');
  });

  it('bascule de l’anglais vers le français', () => {
    expect(alternatePath('/en', 'fr')).toBe('/');
    expect(alternatePath('/en/projets', 'fr')).toBe('/projets');
    expect(alternatePath('/en/projets/kuma-science', 'fr')).toBe('/projets/kuma-science');
  });

  it('est réversible (aller-retour)', () => {
    for (const path of ['/', '/projets', '/a-propos', '/publications', '/projets/kuma-science']) {
      expect(alternatePath(alternatePath(path, 'en'), 'fr')).toBe(path);
    }
  });
});

describe('useTranslations', () => {
  it('traduit selon la langue', () => {
    expect(useTranslations('fr')('nav.about')).toBe('À propos');
    expect(useTranslations('en')('nav.about')).toBe('About');
  });
});

describe('dictionnaire ui', () => {
  it('expose exactement les mêmes clés en FR et en EN', () => {
    expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.fr).sort());
  });

  it('n’a aucune traduction vide', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const [key, value] of Object.entries(ui[lang])) {
        expect(value, `${lang}.${key}`).toBeTruthy();
      }
    }
  });
});
