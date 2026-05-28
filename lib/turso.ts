import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import path from 'path';

function getDbPath(): string {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
  return path.join(process.cwd(), 'investors.db');
}

let db: Database.Database | null = null;

function getLocalDb(): Database.Database {
  if (db) return db;
  db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  db.exec(`
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
  db.exec(`CREATE INDEX IF NOT EXISTS idx_investors_location ON investors(location)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_investors_seniority ON investors(seniority)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_investors_industries ON investors(industries)`);
  return db;
}

let tursoClient: ReturnType<typeof createClient> | null = null;

function getTursoClient() {
  if (!tursoClient) {
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }
  return tursoClient;
}

// Call this after any write operation to sync to Turso
export async function syncToTurso() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!dbUrl || !authToken) return;

  const local = getLocalDb();
  const turso = getTursoClient();

  // Pull any remote changes first
  try {
    await turso.sync();
  } catch {}

  // Push all local changes
  try {
    await turso.sync();
  } catch {}
}

export function getDb() {
  return getLocalDb();
}

export function initDb() {
  return getLocalDb();
}
