import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = getDb();

    let investors = [];
    try {
      const result = await db.prepare(
        'SELECT id, linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email FROM investors LIMIT $1 OFFSET $2'
      ).all(limit, offset);
      investors = result;
    } catch (err) {
      return NextResponse.json({ error: 'SELECT query failed: ' + (err as Error).message, limit, offset }, { status: 500 });
    }

    let total = 0;
    try {
      const countRow = await db.prepare('SELECT COUNT(*) as count FROM investors').get();
      total = countRow?.count ?? 0;
    } catch (err) {
      return NextResponse.json({ error: 'COUNT query failed: ' + (err as Error).message }, { status: 500 });
    }

    return NextResponse.json({ investors, total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
