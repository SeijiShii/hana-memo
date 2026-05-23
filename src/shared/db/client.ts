/**
 * Drizzle DB クライアント
 *
 * - `db`: Vercel Function 用シングルトン (neon-http、edge runtime 互換)
 * - `dbPool`: 長時間接続が必要なバッチ用 (node-postgres + Neon pooler)
 *
 * 関連: docs/_shared/db/001_db_SPEC.md §1.2
 */
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local and fill in the Neon connection string.',
  );
}

/** Vercel Function (edge / node) 用シングルトン */
export const db = drizzleHttp(neon(databaseUrl), { schema });

/** バッチ用 (node-postgres 経由)、長時間接続が必要な処理のみ */
let _dbPool: ReturnType<typeof drizzleNode> | null = null;
export function dbPool() {
  if (_dbPool) return _dbPool;
  const pool = new Pool({ connectionString: databaseUrl });
  _dbPool = drizzleNode(pool, { schema });
  return _dbPool;
}

export type Db = typeof db;
