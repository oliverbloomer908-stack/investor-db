import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();

    // Top 10 locations (most common, non-empty)
    const locations = await db.prepare(`
      SELECT location, COUNT(*) as cnt
      FROM investors
      WHERE location IS NOT NULL AND location != ''
      GROUP BY location
      ORDER BY cnt DESC
      LIMIT 10
    `).all() as { location: string }[];

    // Top 10 seniorities
    const seniorities = await db.prepare(`
      SELECT seniority, COUNT(*) as cnt
      FROM investors
      WHERE seniority IS NOT NULL AND seniority != ''
      GROUP BY seniority
      ORDER BY cnt DESC
      LIMIT 10
    `).all() as { seniority: string }[];

    // Top 10 industries — split by comma, deduplicate per investor, then count
    const industriesResult = await db.prepare(`
      SELECT i.industry, COUNT(*) as cnt FROM (
        SELECT id, TRIM(unnest(string_to_array(industries, ','))) as industry
        FROM investors
        WHERE industries IS NOT NULL AND industries != ''
        GROUP BY id, TRIM(unnest(string_to_array(industries, ',')))
      ) i
      GROUP BY i.industry
      ORDER BY cnt DESC
      LIMIT 10
    `).all() as { industry: string }[];

    // Top 10 names — concat firstName + lastName, deduplicate per investor, then count
    const namesResult = await db.prepare(`
      SELECT i.fullname, COUNT(*) as cnt FROM (
        SELECT id, TRIM(CONCAT(firstName, ' ', lastName)) as fullname
        FROM investors
        WHERE (firstName IS NOT NULL AND firstName != '') OR (lastName IS NOT NULL AND lastName != '')
        GROUP BY id, TRIM(CONCAT(firstName, ' ', lastName))
      ) i
      GROUP BY i.fullname
      ORDER BY cnt DESC
      LIMIT 10
    `).all() as { fullname: string }[];

    return NextResponse.json({
      locations: locations.map(r => r.location),
      seniorities: seniorities.map(r => r.seniority),
      industries: industriesResult.map(r => r.industry),
      names: namesResult.map(r => r.fullname),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
