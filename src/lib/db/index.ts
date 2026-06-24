import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);

export default sql;
export { sql };
