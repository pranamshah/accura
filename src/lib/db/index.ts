import { neon } from '@neondatabase/serverless';

// During `next build`, DATABASE_URL may not be available.
// A placeholder prevents neon() from throwing at import time;
// it only actually connects when a query is executed at runtime.
const sql = neon(process.env.DATABASE_URL ?? 'postgresql://build:build@build/build');

export default sql;
export { sql };
