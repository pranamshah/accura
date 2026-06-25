import { neon } from '@neondatabase/serverless';

let _neon: ReturnType<typeof neon> | null = null;

function getInstance() {
  if (!_neon) _neon = neon(process.env.DATABASE_URL!);
  return _neon;
}

const sql = (strings: TemplateStringsArray, ...values: any[]): Promise<any[]> => {
  return getInstance()(strings, ...values) as Promise<any[]>;
};

export default sql;
