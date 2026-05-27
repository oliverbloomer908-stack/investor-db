import { createClient } from '@libsql/client';

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  return createClient({ url, authToken: token });
}

function transform(result: { columns: string[]; rows: any[][] }) {
  return result.rows.map(row =>
    Object.fromEntries(row.map((val, i) => [result.columns[i], val]))
  );
}

export function getDb() {
  const client = getClient();
  return {
    prepare(sql: string) {
      return {
        all(...params: any[]) {
          const r = client.execute({ sql, args: params });
          return transform(r);
        },
        get(...params: any[]) {
          const r = client.execute({ sql, args: params });
          const rows = transform(r);
          return rows[0] ?? null;
        },
        run(...params: any[]) {
          return client.execute({ sql, args: params });
        },
      };
    },
    transaction<T>(fn: (rows: T[]) => number) {
      // Wrap in SQL transaction for actual atomicity
      return (rows: T[]) => {
        const sqls = [];
        client.execute({ sql: 'BEGIN' });
        try {
          const count = fn(rows);
          client.execute({ sql: 'COMMIT' });
          return count;
        } catch (err) {
          client.execute({ sql: 'ROLLBACK' });
          throw err;
        }
      };
    },
  };
}

export function initDb() {
  const client = getClient();
  client.execute(`
    CREATE TABLE IF NOT EXISTS investors (
      id INTEGER PRIMARY KEY,
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
  client.execute(`CREATE INDEX IF NOT EXISTS idx_investors_location ON investors(location)`);
  client.execute(`CREATE INDEX IF NOT EXISTS idx_investors_seniority ON investors(seniority)`);
  client.execute(`CREATE INDEX IF NOT EXISTS idx_investors_industries ON investors(industries)`);
  return getDb();
}
