import { describe, it, expect } from 'vitest';
import { personJsonLd } from '../../src/lib/seo';
import { SITE, orcidUrl } from '../../src/lib/site';

describe('personJsonLd', () => {
  it('produit un schéma Person valide', () => {
    const ld = personJsonLd('fr');
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('Person');
    expect(ld.name).toBe(SITE.name);
  });

  it('localise le jobTitle', () => {
    expect(personJsonLd('fr').jobTitle).toBe(SITE.role.fr);
    expect(personJsonLd('en').jobTitle).toBe(SITE.role.en);
  });

  it('référence les profils publics dans sameAs', () => {
    const { sameAs } = personJsonLd('fr');
    expect(sameAs).toContain(orcidUrl);
    expect(sameAs).toContain(SITE.github);
    expect(sameAs).toContain(SITE.linkedin);
  });

  it('déclare les langues connues', () => {
    expect(personJsonLd('fr').knowsLanguage).toEqual(expect.arrayContaining(['fr', 'en']));
  });
});
