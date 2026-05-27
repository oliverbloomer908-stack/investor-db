function transform(result: { columns: string[]; rows: any[][] }) {
  if (!result.columns || !result.rows) return [];
  const cols = result.columns;
  return result.rows.map(row =>
    Object.fromEntries(row.map((val, i) => [cols[i], val]))
  );
}

export function getDb() {
  const baseUrl = process.env.TURSO_DATABASE_URL || '';
  const authToken = process.env.TURSO_AUTH_TOKEN || '';

  async function sqlExecute(sql: string, args: any[] = []) {
    const url = `${baseUrl}/v1/statements`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'X-Custom-Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ sql, args }),
    });
    if (!res.ok) throw new Error(`Turso error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  const db = {
    prepare(sql: string) {
      return {
        all(...params: any[]) {
          return sqlExecute(sql, params).then(r => transform(r));
        },
        get(...params: any[]) {
          return sqlExecute(sql, params).then(r => {
            const rows = transform(r);
            return rows[0] ?? null;
          });
        },
        run(...params: any[]) {
          return sqlExecute(sql, params);
        },
      };
    },
    transaction<T>(fn: (rows: T[]) => number) {
      return async (rows: T[]) => {
        await sqlExecute('BEGIN', []);
        try {
          const count = fn(rows);
          await sqlExecute('COMMIT', []);
          return count;
        } catch (err) {
          await sqlExecute('ROLLBACK', []);
          throw err;
        }
      };
    },
  };
  return db;
}

export async function initDb() {
  const baseUrl = process.env.TURSO_DATABASE_URL || '';
  const authToken = process.env.TURSO_AUTH_TOKEN || '';

  async function sqlExecute(sql: string) {
    const url = `${baseUrl}/v1/statements`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'X-Custom-Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ sql }),
    });
    if (!res.ok) throw new Error(`Turso error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  await sqlExecute(`
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
}
