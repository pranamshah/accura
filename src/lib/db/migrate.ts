import sql from './index';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function runMigrations() {
  const schema = readFileSync(join(process.cwd(), 'src/lib/db/schema.sql'), 'utf-8');
  await sql.transaction(txn => [txn.unsafe(schema)]);
  console.log('✅ Database schema applied');
}
