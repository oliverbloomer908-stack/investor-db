import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function getDbPath(): string {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
  // On Vercel serverless, /tmp is the only writable path
  if (process.env.VERCEL) return '/tmp/investors.db';
  return path.join(process.cwd(), 'investors.db');
}

let db: Database.Database | null = null;

function getLocalDb(): Database.Database {
  if (db) return db;
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(dbPath);
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

export function getDb() {
  return getLocalDb();
}

export function initDb() {
  return getLocalDb();
}
