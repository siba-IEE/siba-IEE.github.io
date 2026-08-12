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
    'nav.services': 'Services',
    'nav.research': 'Travaux',
    'nav.publications': 'Publications',
    'nav.contact': 'Contact',
    'nav.skipToContent': 'Aller au contenu',
    'theme.toggle': 'Changer de thème',
    'lang.switch': 'English',
    'hero.availability': 'Ouvert aux collaborations',
    'hero.cta.projects': 'Voir les projets',
    'hero.cta.contact': 'Me contacter',
    'section.projects.title': 'Projets',
    'section.projects.lede': 'Une poignée de plateformes et d’outils que j’ai construits et que je maintiens.',
    'section.projects.all': 'Tous les projets',
    'projects.pageTitle': 'Projets',
    'projects.pageLede': 'Tout ce que je construis pour l’ingénierie énergétique et que je garde en état de marche, des jeux de données aux applis de terrain.',
    'projects.filterAll': 'Tous',
    'project.visit': 'Visiter le site',
    'project.repo': 'Code source',
    'project.back': 'Tous les projets',
    'project.stack': 'Stack technique',
    'publications.pageTitle': 'Publications',
    'publications.pageLede': 'Mes articles, logiciels et jeux de données, tirés directement de mon profil ORCID.',
    'publications.viewOrcid': 'Voir le profil ORCID',
    'publications.empty': 'Aucune contribution pour le moment.',
    'about.pageTitle': 'À propos',
    'about.experience': 'Parcours',
    'about.education': 'Formation',
    'about.skills': 'Compétences',
    'about.elsewhere': 'Ailleurs',
    'contact.pageTitle': 'Contact',
    'contact.pageLede': 'Une idée de projet, ou juste une question ? La boîte mail est ouverte.',
    'contact.email': 'Écrire un email',
    'footer.rights': 'Tous droits réservés',
    'footer.builtWith': 'Conçu avec Astro et Tailwind',
  },
  en: {
    'nav.about': 'About',
    'nav.projects': 'Projects',
    'nav.services': 'Services',
    'nav.research': 'Research',
    'nav.publications': 'Publications',
    'nav.contact': 'Contact',
    'nav.skipToContent': 'Skip to content',
    'theme.toggle': 'Toggle theme',
    'lang.switch': 'Français',
    'hero.availability': 'Open to collaborations',
    'hero.cta.projects': 'View projects',
    'hero.cta.contact': 'Get in touch',
    'section.projects.title': 'Projects',
    'section.projects.lede': 'A handful of platforms and tools I’ve built and keep running.',
    'section.projects.all': 'All projects',
    'projects.pageTitle': 'Projects',
    'projects.pageLede': 'Everything I build for energy engineering and keep in working order, from datasets to field apps.',
    'projects.filterAll': 'All',
    'project.visit': 'Visit site',
    'project.repo': 'Source code',
    'project.back': 'All projects',
    'project.stack': 'Tech stack',
    'publications.pageTitle': 'Publications',
    'publications.pageLede': 'My papers, software and datasets, pulled straight from my ORCID profile.',
    'publications.viewOrcid': 'View ORCID profile',
    'publications.empty': 'No contributions yet.',
    'about.pageTitle': 'About',
    'about.experience': 'Experience',
    'about.education': 'Education',
    'about.skills': 'Skills',
    'about.elsewhere': 'Elsewhere',
    'contact.pageTitle': 'Contact',
    'contact.pageLede': 'An idea for a project, or just a question? My inbox is open.',
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
