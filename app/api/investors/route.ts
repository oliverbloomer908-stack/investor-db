import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = getDb();
    const investors = db.prepare(
      'SELECT id, linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email FROM investors LIMIT ? OFFSET ?'
    ).all(limit, offset);

    const countRow = db.prepare('SELECT COUNT(*) as count FROM investors').get() as any;

    return NextResponse.json({ investors, total: countRow?.count ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}