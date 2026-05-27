import { createClient, type ResultSet } from '@libsql/client';

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  return createClient({ url, authToken: token });
}

function transform(result: ResultSet) {
  if (!result.columns || !result.rows) return [];
  const cols = result.columns as string[];
  return (result.rows as any[]).map((row: any) =>
    Object.fromEntries((row as any[]).map((val: any, i: number) => [cols[i], val]))
  );
}

export function getDb() {
  const client = getClient();
  const db = {
    prepare(sql: string) {
      return {
        all(...params: any[]) {
          return client.execute({ sql, args: params }).then(r => transform(r));
        },
        get(...params: any[]) {
          return client.execute({ sql, args: params }).then(r => {
            const rows = transform(r);
            return rows[0] ?? null;
          });
        },
        run(...params: any[]) {
          return client.execute({ sql, args: params });
        },
      };
    },
    transaction<T>(fn: (rows: T[]) => number) {
      return async (rows: T[]) => {
        await client.execute({ sql: 'BEGIN' });
        try {
          const count = fn(rows);
          await client.execute({ sql: 'COMMIT' });
          return count;
        } catch (err) {
          await client.execute({ sql: 'ROLLBACK' });
          throw err;
        }
      };
    },
  };
  return db;
}

export async function initDb() {
  const client = getClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS investors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      linkedInUrl TEXT NOT NULL,
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
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      UNIQUE(linkedInUrl)
    )
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_investors_location ON investors(location)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_investors_seniority ON investors(seniority)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_investors_industries ON investors(industries)`);
}
