import { Pool } from 'pg';

const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined;
};

// Create or reuse pool depending on environment
export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // set to `true` if needed for your DB host
  });

// Reuse pool in development (to avoid exhausting connections during hot reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}
