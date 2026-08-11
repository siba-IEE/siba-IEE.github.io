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
    'section.projects.all': 'Tous les projets',
    'projects.pageTitle': 'Projets',
    'projects.pageLede': 'Plateformes, données et outils d’ingénierie énergétique que je conçois et fais tourner.',
    'projects.filterAll': 'Tous',
    'project.visit': 'Visiter le site',
    'project.repo': 'Code source',
    'project.back': 'Tous les projets',
    'project.stack': 'Stack technique',
    'publications.pageTitle': 'Publications',
    'publications.pageLede': 'Travaux de recherche, synchronisés depuis mon profil ORCID.',
    'publications.viewOrcid': 'Voir le profil ORCID',
    'publications.empty': 'Aucune publication pour le moment.',
    'about.pageTitle': 'À propos',
    'about.experience': 'Parcours',
    'about.education': 'Formation',
    'about.skills': 'Compétences',
    'about.elsewhere': 'Ailleurs',
    'contact.pageTitle': 'Contact',
    'contact.pageLede': 'Pour un projet, une collaboration ou une question.',
    'contact.email': 'Écrire un email',
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
    'section.projects.all': 'All projects',
    'projects.pageTitle': 'Projects',
    'projects.pageLede': 'Platforms, data and energy-engineering tools I design and operate.',
    'projects.filterAll': 'All',
    'project.visit': 'Visit site',
    'project.repo': 'Source code',
    'project.back': 'All projects',
    'project.stack': 'Tech stack',
    'publications.pageTitle': 'Publications',
    'publications.pageLede': 'Research work, synced from my ORCID profile.',
    'publications.viewOrcid': 'View ORCID profile',
    'publications.empty': 'No publications yet.',
    'about.pageTitle': 'About',
    'about.experience': 'Experience',
    'about.education': 'Education',
    'about.skills': 'Skills',
    'about.elsewhere': 'Elsewhere',
    'contact.pageTitle': 'Contact',
    'contact.pageLede': 'For a project, a collaboration or a question.',
    'contact.email': 'Send an email',
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

/** Retire le préfixe de locale d'un chemin (renvoie le chemin « français »). */
export function unlocalizePath(pathname: string): string {
  const clean = pathname.replace(/\/$/, '') || '/';
  const stripped = clean.replace(/^\/en(?=\/|$)/, '') || '/';
  return stripped;
}

/**
 * Traduit le chemin courant vers l'autre langue, en préservant la page.
 * Sert au sélecteur de langue (ex. /projets ⇄ /en/projets).
 */
export function alternatePath(pathname: string, target: Lang): string {
  return localizePath(unlocalizePath(pathname), target);
}
