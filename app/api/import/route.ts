import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { parseCSV, detectColumnsWithConfidence, mapRowToInvestor } from '@/lib/csv';
import { ColumnMapping } from '@/lib/csv';
import { requestColumnMapping } from '@/lib/aiMapping';

export async function POST(req: NextRequest) {
  const debug: Record<string, any> = {};

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
      debug.aiMappings = aiMappings;

      for (const [header, field] of Object.entries(aiMappings)) {
        if (field && (mapping as any)[field] === null) {
          (mapping as any)[field] = header;
        }
      }
    }

    // Apply custom column mappings from frontend (user manually mapped columns)
    const customMappingsRaw = formData.get('columnMappings');
    if (customMappingsRaw) {
      try {
        const customMappings = JSON.parse(customMappingsRaw as string);
        for (const [header, field] of Object.entries(customMappings)) {
          if (header && typeof field === 'string' && headers.includes(header) && field in mapping) {
            (mapping as any)[field] = header;
          }
        }
      } catch {}
    }

    const usedHeaders = new Set(Object.values(mapping).filter(Boolean) as string[]);
    const postAiUnmapped = headers.filter(h => !usedHeaders.has(h));

    const BATCH_SIZE = 100;
    let inserted = 0;

    try {
      const DB = await import('pg');
      const pool = new DB.Pool({ connectionString: process.env.DATABASE_URL! });
      const client = await pool.connect();

      const insertRows = async (batch: typeof rows): Promise<number> => {
        if (batch.length === 0) return 0;
        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;
        const seenUrls = new Set<string>();

        for (const row of batch) {
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
              ? `https://linkedin.com/in/unknown-${urlSafe}-${Date.now()}`
              : `https://linkedin.com/in/unknown-${Date.now()}`;
          }

          // Skip rows with duplicate URLs within the same batch (PostgreSQL ON CONFLICT
          // cannot update the same row twice in one statement)
          if (seenUrls.has(linkedInUrl)) continue;
          seenUrls.add(linkedInUrl);

          placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, NOW())`);
          values.push(
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
          );
          paramIndex += 12;
        }

        if (placeholders.length === 0) return 0;
        await client.query(`
          INSERT INTO investors (linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email, updatedAt)
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (linkedInUrl) DO UPDATE SET
            firstName = EXCLUDED.firstName,
            lastName = EXCLUDED.lastName,
            description = EXCLUDED.description,
            location = EXCLUDED.location,
            seniority = EXCLUDED.seniority,
            title = EXCLUDED.title,
            industries = EXCLUDED.industries,
            companyName = EXCLUDED.companyName,
            companyDescription = EXCLUDED.companyDescription,
            domain = EXCLUDED.domain,
            email = EXCLUDED.email,
            updatedAt = NOW()
        `, values);
        return placeholders.length;
      };

      try {
        await client.query('BEGIN');

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const count = await insertRows(batch);
          inserted += count;
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err: any) {
      return NextResponse.json({ error: err.message, debug }, { status: 500 });
    }

    return NextResponse.json({
      imported: inserted,
      total: rows.length,
      unmappedColumns: postAiUnmapped,
      debug,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, debug }, { status: 500 });
  }
}
