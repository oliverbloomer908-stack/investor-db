import { NextRequest, NextResponse } from 'next/server';
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

    // Inspect first 3 rows
    const first3Rows = rows.slice(0, 3).map(row => {
      const mapped = mapRowToInvestor(row, mapping as ColumnMapping);
      return {
        raw: row,
        mapped,
        linkedInUrl: mapped.linkedInUrl,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        email: mapped.email,
      };
    });

    return NextResponse.json({
      totalRows: rows.length,
      headers,
      unmappedColumns: unmapped,
      columnMapping: mapping,
      first3Rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}