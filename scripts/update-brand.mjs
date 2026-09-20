import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  const env = await readFile('.env.local', 'utf8');
  const value = env.match(/^DATABASE_URL=(.*)$/m)?.[1];
  if (value) process.env.DATABASE_URL = value.replace(/^['"]|['"]$/g, '').trim();
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL absente');
const sql = neon(process.env.DATABASE_URL);
await sql`UPDATE site_settings SET bio='Always further, together', updated_at=NOW() WHERE id=1`;
console.log('Sous-titre AE2V mis à jour.');
