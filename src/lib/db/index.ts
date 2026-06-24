import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

function getSQL() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

const sql = new Proxy({} as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, args) {
    return (getSQL() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    return (getSQL() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default sql;
export { sql };
