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
    fr: 'Ingénieur en efficacité énergétique, fondateur de Kuma Science',
    en: 'Energy-efficiency engineer, founder of Kuma Science',
  } satisfies LocalizedText,
  shortRole: {
    fr: 'Ingénieur en efficacité énergétique',
    en: 'Energy-efficiency engineer',
  } satisfies LocalizedText,
  tagline: {
    fr: 'Je fiabilise la donnée énergétique de l’Afrique de l’Ouest : référentiels ouverts, méthode de correction des produits satellitaires, logiciels pour s’en servir.',
    en: 'I make West Africa’s energy data dependable: open reference datasets, a method to correct satellite products, and the software to use them.',
  } satisfies LocalizedText,
  bio: {
    fr: 'Ingénieur en efficacité énergétique, formé au CNAM. J’ai fondé Kuma Science, qui produit les données solaires et énergétiques de référence de la Guinée. Je travaille entre Montréal et Conakry.',
    en: 'Energy-efficiency engineer, trained at CNAM. I founded Kuma Science, which produces Guinea’s reference solar and energy data. I work between Montréal and Conakry.',
  } satisfies LocalizedText,
  email: 'doctasiba10@gmail.com',
  orcid: '0009-0002-8292-1905',
  githubUser: 'siba-IEE',
  github: 'https://github.com/siba-IEE',
  linkedin: 'https://www.linkedin.com/in/siba-kalivogui/',
  // URL de production (GitHub Pages).
  url: 'https://siba-iee.github.io',
} as const;

export const orcidUrl = `https://orcid.org/${SITE.orcid}`;

export const socialLinks = [
  { key: 'github', label: 'GitHub', href: SITE.github },
  { key: 'linkedin', label: 'LinkedIn', href: SITE.linkedin },
  { key: 'orcid', label: 'ORCID', href: orcidUrl },
  { key: 'email', label: 'Email', href: `mailto:${SITE.email}` },
] as const;
