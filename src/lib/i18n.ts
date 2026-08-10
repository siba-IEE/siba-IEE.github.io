/**
 * Internationalisation minimale (dictionnaire d'interface).
 * Le contenu éditorial (bio, projets, publications) vit dans Keystatic ;
 * ici ne figurent que les libellés d'UI.
 */

export const languages = {
  fr: 'Français',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'fr';

export const localeTag: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

export const ui = {
  fr: {
    'nav.about': 'À propos',
    'nav.projects': 'Projets',
    'nav.publications': 'Publications',
    'nav.contact': 'Contact',
    'nav.skipToContent': 'Aller au contenu',
    'theme.toggle': 'Changer de thème',
    'lang.switch': 'English',
    'hero.availability': 'Ouvert aux collaborations',
    'hero.cta.projects': 'Voir les projets',
    'hero.cta.contact': 'Me contacter',
    'section.projects.title': 'Projets',
    'section.projects.lede': 'Une sélection de plateformes et d’outils que je conçois et fais tourner.',
    'footer.rights': 'Tous droits réservés',
    'footer.builtWith': 'Conçu avec Astro et Tailwind',
  },
  en: {
    'nav.about': 'About',
    'nav.projects': 'Projects',
    'nav.publications': 'Publications',
    'nav.contact': 'Contact',
    'nav.skipToContent': 'Skip to content',
    'theme.toggle': 'Toggle theme',
    'lang.switch': 'Français',
    'hero.availability': 'Open to collaborations',
    'hero.cta.projects': 'View projects',
    'hero.cta.contact': 'Get in touch',
    'section.projects.title': 'Projects',
    'section.projects.lede': 'A selection of platforms and tools I design and operate.',
    'footer.rights': 'All rights reserved',
    'footer.builtWith': 'Built with Astro and Tailwind',
  },
} as const;

export type UiKey = keyof (typeof ui)['fr'];

/** Déduit la langue depuis l'URL (le préfixe /en active l'anglais). */
export function getLangFromUrl(url: URL): Lang {
  const [, seg] = url.pathname.split('/');
  if (seg in languages) return seg as Lang;
  return defaultLang;
}

/** Retourne un traducteur pour la langue donnée, avec repli sur le français. */
export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/** Préfixe un chemin avec la locale (le français reste à la racine). */
export function localizePath(path: string, lang: Lang): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return lang === defaultLang ? clean : `/${lang}${clean === '/' ? '' : clean}`;
}
