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
    fr: 'Formé à l’ingénierie de l’efficacité énergétique au CNAM, j’ai fondé Kuma Science, où je dirige les travaux techniques : le référentiel de données solaires de la Guinée, le Référentiel national de données énergétiques (RNDE) et son catalogue en ligne, une méthode de correction des produits satellitaires validée sur 31 stations ouest-africaines, un moteur de données et un logiciel de dimensionnement. Avant cela, plus de deux ans d’audit énergétique et de bilans carbone chez un bailleur social en France, et un stage de recherche à Montréal qui a donné deux articles sur les réseaux isolés du Nord canadien. Entre Montréal et Conakry, je développe le traitement des données énergétiques et l’appui technique aux projets en Guinée.',
    en: 'Trained as an energy-efficiency engineer at CNAM, I founded Kuma Science, where I lead the technical work: Guinea’s solar-data reference, the National Energy Data Reference (RNDE) and its online catalogue, a method for correcting satellite products validated on 31 West African stations, a data engine and a sizing software. Before that, more than two years of energy audits and carbon assessments for a social-housing landlord in France, and a research internship in Montréal that led to two papers on the isolated grids of northern Canada. Between Montréal and Conakry, I work on energy-data processing and technical support for projects in Guinea.',
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
