/**
 * Helpers SEO : métadonnées et données structurées schema.org.
 */
import { SITE, orcidUrl } from './site';
import type { Lang } from './i18n';

/** JSON-LD `Person` pour l'entête, avec ORCID/GitHub/LinkedIn en sameAs. */
export function personJsonLd(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.name,
    jobTitle: SITE.role[lang],
    url: SITE.url,
    email: SITE.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Conakry',
      addressCountry: 'GN',
    },
    worksFor: {
      '@type': 'Organization',
      name: 'Kuma Science',
    },
    knowsLanguage: ['fr', 'en'],
    sameAs: [orcidUrl, SITE.github, SITE.linkedin],
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'ORCID',
      value: orcidUrl,
    },
  };
}
