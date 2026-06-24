import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const schema = readFileSync(join(process.cwd(), 'src/lib/db/schema.sql'), 'utf-8');
  const statements = schema
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`✅ Accura database schema applied to Neon (${statements.length} statements)`);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
