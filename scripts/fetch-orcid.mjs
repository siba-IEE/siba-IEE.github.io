/**
 * Récupère les travaux publiés depuis l'API publique ORCID et écrit un snapshot JSON.
 * Repli gracieux : si l'API est indisponible, on écrit un snapshot vide et le build continue
 * (même doctrine que le fallback CMS de kuma-science).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORCID = process.env.ORCID_ID ?? '0009-0002-8292-1905';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const OUT = join(scriptDir, '..', 'src', 'data', 'snapshots', 'orcid.json');

async function fetchWorks() {
  const res = await fetch(`https://pub.orcid.org/v3.0/${ORCID}/works`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const groups = Array.isArray(data.group) ? data.group : [];

  return groups.map((group) => {
    const summary = group['work-summary']?.[0] ?? {};
    const externalIds = summary['external-ids']?.['external-id'] ?? [];
    const doi =
      externalIds.find((id) => id['external-id-type'] === 'doi')?.['external-id-value'] ?? null;
    return {
      putCode: summary['put-code'] ?? null,
      title: summary.title?.title?.value ?? 'Sans titre',
      year: summary['publication-date']?.year?.value ?? null,
      type: summary.type ?? null,
      journal: summary['journal-title']?.value ?? null,
      doi,
      url: summary.url?.value ?? (doi ? `https://doi.org/${doi}` : null),
    };
  });
}

async function main() {
  let works;
  try {
    works = await fetchWorks();
  } catch (error) {
    // Doctrine snapshot : sur echec reseau, ne JAMAIS ecraser le snapshot existant.
    console.warn(`[orcid] API indisponible, snapshot conserve : ${error.message}`);
    return;
  }
  // Un fetch qui renvoie 0 travail alors qu'on en avait est presque toujours un
  // faux negatif (glitch API) : on preserve aussi dans ce cas.
  if (!works.length) {
    console.warn('[orcid] 0 travail renvoye, snapshot existant conserve.');
    return;
  }
  works.sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0));
  const snapshot = { source: 'orcid', orcid: ORCID, count: works.length, works };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`[orcid] ${works.length} travaux recuperes.`);
}

main();
