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

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    let rowCount = 0;

    if (body.ids && body.ids.length > 0) {
      const result = await db.prepare(
        'DELETE FROM investors WHERE id = ANY($1)'
      ).run(body.ids);
      rowCount = result.rowCount ?? 0;
    } else if (body.linkedInUrls && body.linkedInUrls.length > 0) {
      const result = await db.prepare(
        'DELETE FROM investors WHERE linkedinurl = ANY($1)'
      ).run(body.linkedInUrls);
      rowCount = result.rowCount ?? 0;
    } else if (Object.keys(body).length === 0) {
      const result = await db.prepare('DELETE FROM investors').run();
      rowCount = result.rowCount ?? 0;
    } else {
      return NextResponse.json(
        { error: "Provide ids[], linkedInUrls[], or empty body to delete all" },
        { status: 400 }
      );
    }

    return NextResponse.json({ deleted: rowCount });
  } catch (err: any) {
    console.error('DELETE /api/investors error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
