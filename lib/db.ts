import Database from 'better-sqlite3';
import path from 'path';

function getDbPath(): string {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
  return path.join(process.cwd(), 'investors.db');
}

let db: Database.Database | null = null;

export function resetDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function initDb(): Database.Database {
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
    );
    CREATE INDEX IF NOT EXISTS idx_investors_location ON investors(location);
    CREATE INDEX IF NOT EXISTS idx_investors_seniority ON investors(seniority);
    CREATE INDEX IF NOT EXISTS idx_investors_industries ON investors(industries);
  `);
  // Trigger to convert INSERT into UPDATE when linkedInUrl conflicts
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS investors_upsert BEFORE INSERT ON investors
    WHEN EXISTS (SELECT 1 FROM investors WHERE linkedInUrl = NEW.linkedInUrl)
    BEGIN
      UPDATE investors SET
        firstName = NEW.firstName, lastName = NEW.lastName, description = NEW.description,
        location = NEW.location, seniority = NEW.seniority, title = NEW.title,
        industries = NEW.industries, companyName = NEW.companyName,
        companyDescription = NEW.companyDescription, domain = NEW.domain,
        email = NEW.email, meta = NEW.meta, updatedAt = datetime('now')
      WHERE linkedInUrl = NEW.linkedInUrl;
      SELECT RAISE(IGNORE);
    END
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!db) return initDb();
  return db;
}