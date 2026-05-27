import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = getDb();
    const investors = (await db.prepare(
      'SELECT id, linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email FROM investors LIMIT $1 OFFSET $2'
    ).all(limit, offset)) as any[];

    const countRow = (await db.prepare('SELECT COUNT(*) as count FROM investors').get()) as any;
    const total = countRow?.count ?? 0;

    return NextResponse.json({ investors, total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
