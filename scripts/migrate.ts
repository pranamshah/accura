import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const schema = readFileSync(join(process.cwd(), 'src/lib/db/schema.sql'), 'utf-8');
  await sql.transaction(txn => [txn.unsafe(schema)]);
  console.log('✅ Accura database schema applied to Neon');
}
main().catch(console.error);
