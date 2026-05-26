import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, getDb, resetDb } from '@/lib/db';

describe('db', () => {
  beforeEach(() => {
    // Use a fresh in-memory DB for each test
    resetDb();
    process.env.SQLITE_PATH = ':memory:';
  });

  it('creates the investors table', () => {
    const db = initDb();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(tables.map(t => (t as any).name)).toContain('investors');
  });

  it('inserts and retrieves an investor', () => {
    const db = initDb();
    db.prepare(`
      INSERT INTO investors (linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'https://linkedin.com/in/johndoe',
      'John', 'Doe', 'Angel investor in fintech',
      'New York, NY', 'Partner', 'Managing Partner',
      'FinTech,Venture Capital', 'Acme Ventures', 'VC firm', 'acme.com', null
    );
    const row = db.prepare('SELECT * FROM investors WHERE linkedInUrl = ?').get('https://linkedin.com/in/johndoe') as any;
    expect(row.firstName).toBe('John');
    expect(row.lastName).toBe('Doe');
  });

  it('upserts an existing investor by linkedInUrl', () => {
    const db = initDb();
    db.prepare(`
      INSERT INTO investors (linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'https://linkedin.com/in/johndoe', 'John', 'Doe', 'Old desc',
      'New York, NY', 'Partner', 'Managing Partner',
      'FinTech', 'Acme', 'Acme', 'acme.com', null
    );
    db.prepare(`
      INSERT INTO investors (linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'https://linkedin.com/in/johndoe', 'John', 'Doe', 'New desc',
      'New York, NY', 'Partner', 'Managing Partner',
      'FinTech', 'Acme', 'Acme', 'acme.com', null
    );
    const rows = db.prepare('SELECT * FROM investors WHERE linkedInUrl = ?').all('https://linkedin.com/in/johndoe');
    expect(rows.length).toBe(1);
    expect((rows[0] as any).description).toBe('New desc');
  });
});