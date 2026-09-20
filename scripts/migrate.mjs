import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  const env = await readFile(resolve(".env.local"), "utf8");
  const match = env.match(/^DATABASE_URL=(.*)$/m);
  if (match) process.env.DATABASE_URL = match[1].replace(/^['"]|['"]$/g, "");
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL absente");
const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(resolve("db/schema.sql"), "utf8");
for (const statement of schema.split(/;\s*(?:\r?\n|$)/).map((part) => part.trim()).filter(Boolean)) {
  await sql.query(statement);
}
console.log("Base de données prête.");
