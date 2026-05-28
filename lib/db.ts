import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

function getPool() {
  return new Pool({ connectionString: DATABASE_URL, max: 5 });
}

export function getDb() {
  const pool = getPool();
  return {
    prepare(sql: string) {
      return {
        all(...params: any[]) {
          return pool.query(sql, params).then(r => r.rows);
        },
        get(...params: any[]) {
          return pool.query(sql, params).then(r => r.rows[0] ?? null);
        },
        run(...params: any[]) {
          return pool.query(sql, params);
        },
        transaction<T>(fn: (rows: T[]) => number) {
          return async (rows: T[]) => {
            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              const count = fn(rows);
              await client.query('COMMIT');
              return count;
            } catch (err) {
              await client.query('ROLLBACK');
              throw err;
            } finally {
              client.release();
            }
          };
        },
      };
    },
  };
}

export async function initDb() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS investors (
      id SERIAL PRIMARY KEY,
      linkedInUrl TEXT NOT UNIQUE,
      firstName TEXT,
      lastName TEXT,
      description TEXT,
      location TEXT,
      seniority TEXT,
      title TEXT,
      industries TEXT,
      companyName TEXT,
      companyDescription TEXT,
      domain TEXT,
      email TEXT,
      meta TEXT,
      createdAt TIMESTAMP DEFAULT NOW(),
      updatedAt TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_investors_location ON investors(location)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_investors_seniority ON investors(seniority)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_investors_industries ON investors(industries)`);
  await pool.end();
}
