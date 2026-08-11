/**
 * Configuration centrale du portfolio.
 * Toutes les valeurs sont réelles, sourcées depuis les dépôts de Siba Kalivogui.
 * Ne rien inventer ici (garde-fou : pas de données spéculatives).
 */

export interface LocalizedText {
  fr: string;
  en: string;
}

export const SITE = {
  name: 'Siba Kalivogui',
  role: {
    fr: 'Ingénieur énergéticien et chercheur · Fondateur de Kuma Science',
    en: 'Energy engineer and researcher · Founder of Kuma Science',
  } satisfies LocalizedText,
  shortRole: {
    fr: 'Ingénieur énergéticien',
    en: 'Energy engineer',
  } satisfies LocalizedText,
  location: {
    fr: 'Montréal · Conakry',
    en: 'Montréal · Conakry',
  } satisfies LocalizedText,
  tagline: {
    fr: 'Données, méthodes et outils pour l’ingénierie solaire en Afrique de l’Ouest francophone.',
    en: 'Data, methods and tools for solar engineering across French-speaking West Africa.',
  } satisfies LocalizedText,
  bio: {
    fr: 'Ingénieur en efficacité énergétique et chercheur, je fonde et dirige Kuma Science, dont la mission est d’outiller l’ingénierie des énergies renouvelables en Afrique de l’Ouest francophone, la Guinée en pays pilote. Entre Montréal, où je poursuis des travaux de recherche à l’ÉTS, et Conakry, je construis des référentiels de données solaires qualifiées, des outils de dimensionnement et des plateformes, en m’appuyant sur le développement assisté par IA pour aller de la donnée brute au logiciel. J’ai co-signé deux publications évaluées par les pairs sur la décarbonation des communautés isolées du Nord canadien.',
    en: 'An energy-efficiency engineer and researcher, I founded and lead Kuma Science, whose mission is to equip renewable-energy engineering across French-speaking West Africa, with Guinea as the pilot country. Between Montréal, where I pursue research at ÉTS, and Conakry, I build qualified solar-data references, sizing tools and platforms, using AI-assisted development to go from raw data to shipped software. I co-authored two peer-reviewed publications on decarbonizing off-grid communities in northern Canada.',
  } satisfies LocalizedText,
  email: 'contact@kumascience.com',
  orcid: '0009-0002-8292-1905',
  githubUser: 'siba-IEE',
  github: 'https://github.com/siba-IEE',
  linkedin: 'https://www.linkedin.com/in/siba-kalivogui/',
  // URL de production, surchargée par PUBLIC_SITE_URL au build.
  url: 'https://siba-portfolio.pages.dev',
} as const;

export const orcidUrl = `https://orcid.org/${SITE.orcid}`;

export const socialLinks = [
  { key: 'github', label: 'GitHub', href: SITE.github },
  { key: 'linkedin', label: 'LinkedIn', href: SITE.linkedin },
  { key: 'orcid', label: 'ORCID', href: orcidUrl },
  { key: 'email', label: 'Email', href: `mailto:${SITE.email}` },
] as const;
