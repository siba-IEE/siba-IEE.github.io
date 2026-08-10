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
    fr: 'Ingénieur en efficacité énergétique · Fondateur de Kuma Science',
    en: 'Energy-efficiency engineer · Founder of Kuma Science',
  } satisfies LocalizedText,
  shortRole: {
    fr: 'Ingénieur énergéticien',
    en: 'Energy engineer',
  } satisfies LocalizedText,
  location: {
    fr: 'Conakry · Guinée',
    en: 'Conakry · Guinea',
  } satisfies LocalizedText,
  tagline: {
    fr: 'Données, méthodes et outils d’ingénierie énergétique pour l’Afrique francophone.',
    en: 'Data, methods and tools for energy engineering across French-speaking Africa.',
  } satisfies LocalizedText,
  bio: {
    fr: 'Ingénieur en efficacité énergétique, j’ai consacré trois ans à l’optimisation énergétique des bâtiments avant de fonder Kuma Science. J’assure la direction scientifique et éditoriale du portail, et j’ai participé à deux publications évaluées par les pairs sur la décarbonation des communautés isolées du Nord canadien.',
    en: 'An energy-efficiency engineer, I spent three years optimizing building energy performance before founding Kuma Science. I lead the platform’s scientific and editorial direction, and I contributed to two peer-reviewed publications on decarbonizing off-grid communities in northern Canada.',
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
