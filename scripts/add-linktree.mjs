import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  const env = await readFile('.env.local', 'utf8');
  const value = env.match(/^DATABASE_URL=(.*)$/m)?.[1];
  if (value) process.env.DATABASE_URL = value.replace(/^['"]|['"]$/g, '').trim();
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL absente');
const sql = neon(process.env.DATABASE_URL);
// Explicit event date from the request, never recalculated on later runs.
const result = await sql`INSERT INTO page_items (id, kind, title, subtitle, url, icon, countdown_at, featured, sort_order)
  SELECT '00000000-0000-4000-8000-000000000004', 'countdown', 'Retrouve-nous sur Linktree', '', 'https://linktr.ee/ae2v', 'Linktree', '2026-09-20T20:00:00Z', TRUE, 0
  WHERE NOT EXISTS (SELECT 1 FROM page_items WHERE url IN ('https://linktr.ee/ae2v', 'https://linktr.ee/ae2v/'))
  ON CONFLICT (id) DO NOTHING RETURNING id`;
console.log(result.length ? 'Linktree ajouté : 20 septembre 2026 à 22 h (Paris).' : 'Linktree existe déjà ; contenu conservé.');
