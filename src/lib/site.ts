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
    fr: 'Ingénieur énergéticien et chercheur, fondateur de Kuma Science',
    en: 'Energy engineer and researcher, founder of Kuma Science',
  } satisfies LocalizedText,
  shortRole: {
    fr: 'Ingénieur énergéticien',
    en: 'Energy engineer',
  } satisfies LocalizedText,
  tagline: {
    fr: 'Des données solaires fiables pour l’Afrique de l’Ouest francophone, et les outils pour les mettre au travail.',
    en: 'Solar data you can actually rely on for French-speaking West Africa, and the tools to put it to work.',
  } satisfies LocalizedText,
  bio: {
    fr: 'Ingénieur en efficacité énergétique et chercheur. J’ai fondé Kuma Science, à laquelle je me consacre aujourd’hui exclusivement, pour combler un manque criant de l’ingénierie solaire en Afrique de l’Ouest : des données fiables, et de quoi les exploiter. La Guinée est mon terrain pilote. Au quotidien, je construis des référentiels de données solaires qualifiées et les logiciels qui les rendent utiles, de la mesure brute jusqu’à l’application de terrain. J’ai aussi co-signé deux articles évalués par les pairs sur la décarbonation des communautés isolées du Nord canadien.',
    en: 'An energy-efficiency engineer and researcher. I founded Kuma Science, which now has my exclusive focus, to fix what West African solar engineering lacks most: dependable data, and the means to use it. Guinea is my pilot ground. Day to day, I build qualified solar-data references and the software that makes them useful, from raw measurement to the field app. I’ve also co-authored two peer-reviewed papers on decarbonizing off-grid communities in northern Canada.',
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
