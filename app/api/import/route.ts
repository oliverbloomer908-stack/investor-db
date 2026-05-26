import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { parseCSV, detectColumns, mapRowToInvestor } from '@/lib/csv';
import { ColumnMapping } from '@/lib/csv';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length === 0) return NextResponse.json({ error: 'No data found in CSV' }, { status: 400 });

    const headers = Object.keys(rows[0]);
    const { mapping, unmapped } = detectColumns(headers);
    const total = rows.length;

    const db = initDb();
    const insert = db.prepare(`
      INSERT INTO investors (linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(linkedInUrl) DO UPDATE SET
        firstName = excluded.firstName,
        lastName = excluded.lastName,
        description = excluded.description,
        location = excluded.location,
        seniority = excluded.seniority,
        title = excluded.title,
        industries = excluded.industries,
        companyName = excluded.companyName,
        companyDescription = excluded.companyDescription,
        domain = excluded.domain,
        email = excluded.email,
        updatedAt = datetime('now')
    `);

    const insertMany = db.transaction((rows: Record<string, string>[]) => {
      let inserted = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const inv = mapRowToInvestor(row, mapping as ColumnMapping);
        let linkedInUrl = inv.linkedInUrl;

        // Fallback: if no linkedInUrl but email exists, generate from email
        if (!linkedInUrl && inv.email) {
          const emailHash = inv.email.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);
          linkedInUrl = `https://linkedin.com/in/email-${emailHash}`;
        }
        // Fallback: if still no linkedInUrl, construct from location + firstName + lastName
        if (!linkedInUrl) {
          const parts = [inv.location, inv.firstName, inv.lastName].filter(Boolean);
          linkedInUrl = `https://linkedin.com/in/unknown-${parts.join('-').replace(/[^a-zA-Z0-9-]/g, '-')}-${i + 1}`;
        }

        insert.run(
          linkedInUrl, inv.firstName || '', inv.lastName || '', inv.description || '',
          inv.location || '', inv.seniority || '', inv.title || '', inv.industries || '',
          inv.companyName || '', inv.companyDescription || '', inv.domain || '', inv.email || null
        );
        inserted++;
      }
      return inserted;
    });

    const inserted = insertMany(rows);

    return NextResponse.json({
      imported: inserted,
      total,
      unmappedColumns: unmapped,
      columnMapping: mapping,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}