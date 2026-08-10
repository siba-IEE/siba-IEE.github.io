import { config, fields, collection, singleton } from '@keystatic/core';

/**
 * Stockage : local en dev (écriture disque directe), GitHub en production
 * (l'admin déployé commite via OAuth, ce qui déclenche le rebuild Cloudflare).
 * Le Reader de build lit toujours le système de fichiers local.
 */
const storage = import.meta.env.DEV
  ? ({ kind: 'local' } as const)
  : ({ kind: 'github', repo: 'siba-IEE/portfolio' } as const);

const localizedText = (labelFr: string) =>
  fields.text({ label: labelFr, multiline: true });

export default config({
  storage,
  ui: {
    brand: { name: 'Siba · Portfolio' },
    navigation: {
      Contenu: ['profile', 'projects', 'publications', 'experience', 'skills'],
    },
  },
  singletons: {
    profile: singleton({
      label: 'Profil',
      path: 'src/content/profile',
      format: { data: 'json' },
      schema: {
        roleFr: fields.text({ label: 'Rôle (FR)' }),
        roleEn: fields.text({ label: 'Rôle (EN)' }),
        taglineFr: localizedText('Accroche (FR)'),
        taglineEn: localizedText('Accroche (EN)'),
        bioFr: localizedText('Bio (FR)'),
        bioEn: localizedText('Bio (EN)'),
        photo: fields.image({
          label: 'Portrait',
          directory: 'public/images/profile',
          publicPath: '/images/profile/',
        }),
      },
    }),
  },
  collections: {
    projects: collection({
      label: 'Projets',
      slugField: 'title',
      path: 'src/content/projects/*',
      format: { data: 'json' },
      columns: ['title', 'kind', 'status'],
      schema: {
        title: fields.slug({ name: { label: 'Titre' } }),
        kind: fields.select({
          label: 'Type',
          options: [
            { label: 'Plateforme', value: 'platform' },
            { label: 'Données', value: 'data' },
            { label: 'Outil', value: 'tool' },
          ],
          defaultValue: 'platform',
        }),
        status: fields.select({
          label: 'Statut',
          options: [
            { label: 'En ligne', value: 'live' },
            { label: 'En cours', value: 'wip' },
            { label: 'Archivé', value: 'archived' },
          ],
          defaultValue: 'wip',
        }),
        featured: fields.checkbox({ label: 'Mis en avant', defaultValue: true }),
        order: fields.integer({ label: 'Ordre', defaultValue: 0 }),
        year: fields.text({ label: 'Année' }),
        url: fields.url({ label: 'Lien public' }),
        repo: fields.url({ label: 'Dépôt' }),
        summaryFr: localizedText('Résumé (FR)'),
        summaryEn: localizedText('Résumé (EN)'),
        stack: fields.array(fields.text({ label: 'Techno' }), {
          label: 'Stack',
          itemLabel: (props) => props.value,
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value,
        }),
        body: localizedText('Description'),
      },
    }),
    publications: collection({
      label: 'Publications',
      slugField: 'title',
      path: 'src/content/publications/*',
      format: { data: 'json' },
      schema: {
        title: fields.slug({ name: { label: 'Titre' } }),
        authors: fields.array(fields.text({ label: 'Auteur' }), {
          label: 'Auteurs',
          itemLabel: (props) => props.value,
        }),
        venue: fields.text({ label: 'Revue / conférence' }),
        year: fields.text({ label: 'Année' }),
        doi: fields.text({ label: 'DOI' }),
        url: fields.url({ label: 'Lien' }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'Article évalué par les pairs', value: 'journal' },
            { label: 'Conférence', value: 'conference' },
            { label: 'Preprint', value: 'preprint' },
            { label: 'Autre', value: 'other' },
          ],
          defaultValue: 'journal',
        }),
      },
    }),
    experience: collection({
      label: 'Parcours',
      slugField: 'roleFr',
      path: 'src/content/experience/*',
      format: { data: 'json' },
      schema: {
        roleFr: fields.slug({ name: { label: 'Rôle (FR)' } }),
        roleEn: fields.text({ label: 'Rôle (EN)' }),
        org: fields.text({ label: 'Organisation' }),
        locationFr: fields.text({ label: 'Lieu (FR)' }),
        locationEn: fields.text({ label: 'Lieu (EN)' }),
        start: fields.text({ label: 'Début' }),
        end: fields.text({ label: 'Fin' }),
        current: fields.checkbox({ label: 'En cours', defaultValue: false }),
        order: fields.integer({ label: 'Ordre', defaultValue: 0 }),
        descFr: localizedText('Description (FR)'),
        descEn: localizedText('Description (EN)'),
      },
    }),
    skills: collection({
      label: 'Compétences',
      slugField: 'categoryFr',
      path: 'src/content/skills/*',
      format: { data: 'json' },
      schema: {
        categoryFr: fields.slug({ name: { label: 'Catégorie (FR)' } }),
        categoryEn: fields.text({ label: 'Catégorie (EN)' }),
        order: fields.integer({ label: 'Ordre', defaultValue: 0 }),
        items: fields.array(fields.text({ label: 'Élément' }), {
          label: 'Éléments',
          itemLabel: (props) => props.value,
        }),
      },
    }),
  },
});
