import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getDb } from '@/lib/db';
import { parseCSV, detectColumnsWithConfidence, mapRowToInvestor } from '@/lib/csv';
import { ColumnMapping } from '@/lib/csv';
import { requestColumnMapping } from '@/lib/aiMapping';

async function executeRawSql(sql: string, params: any[] = []) {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } finally {
    await pool.end();
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length === 0) return NextResponse.json({ error: 'No data found in CSV' }, { status: 400 });

    const headers = Object.keys(rows[0]);
    const { mapping, unmapped, confidence } = detectColumnsWithConfidence(headers);

    const trulyUnmapped = headers.filter(h =>
      Object.values(mapping).every(m => m !== h)
    );

    if (trulyUnmapped.length > 0 && trulyUnmapped.length <= 10) {
      const aiMappings = await requestColumnMapping({
        unmappedHeaders: trulyUnmapped,
        sampleRows: rows.slice(0, 3),
      });
      for (const [header, field] of Object.entries(aiMappings)) {
        if (field && (mapping as any)[field] === null) {
          (mapping as any)[field] = header;
        }
      }
    }

    const lowConfidenceFields: string[] = [];
    for (const field of Object.keys(mapping) as (keyof ColumnMapping)[]) {
      if (mapping[field] !== null && (confidence[field] || 0) < 0.7) {
        lowConfidenceFields.push(field);
      }
    }

    const usedHeaders = new Set(Object.values(mapping).filter(Boolean) as string[]);
    const postAiUnmapped = headers.filter(h => !usedHeaders.has(h));

    const total = rows.length;
    let inserted = 0;

    const DB = await import('pg');
    const pool = new DB.Pool({ connectionString: process.env.DATABASE_URL! });

    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const inv = mapRowToInvestor(row, mapping as ColumnMapping);
          let linkedInUrl = inv.linkedInUrl;

          if (!linkedInUrl && inv.email) {
            const emailHash = createHash('sha256').update(inv.email.toLowerCase()).digest('hex').slice(0, 24);
            linkedInUrl = `https://linkedin.com/in/email-${emailHash}`;
          }
          if (!linkedInUrl) {
            const parts = [inv.location, inv.firstName, inv.lastName].filter(Boolean);
            const urlSafe = parts.join('-').replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            linkedInUrl = urlSafe
              ? `https://linkedin.com/in/unknown-${urlSafe}-${i + 1}`
              : `https://linkedin.com/in/unknown-${Date.now()}-${i + 1}`;
          }

          await client.query(`
            INSERT INTO investors (linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email, updatedAt)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (linkedInUrl) DO UPDATE SET
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
              updatedAt = NOW()
          `, [
            linkedInUrl,
            inv.firstName || '',
            inv.lastName || '',
            inv.description || '',
            inv.location || '',
            inv.seniority || '',
            inv.title || '',
            inv.industries || '',
            inv.companyName || '',
            inv.companyDescription || '',
            inv.domain || '',
            inv.email || null,
          ]);
          inserted++;
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }

    return NextResponse.json({
      imported: inserted,
      total,
      unmappedColumns: postAiUnmapped,
      lowConfidenceFields: lowConfidenceFields.length > 0 ? lowConfidenceFields : undefined,
      columnMapping: mapping,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
