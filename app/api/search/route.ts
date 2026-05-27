import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface SearchFilters {
  location?: string;
  seniority?: string;
  industry?: string;
  keyword?: string;
  hasEmail?: boolean;
  limit?: number;
  offset?: number;
}

export function buildSearchQuery(filters: SearchFilters): { sql: string; params: (string | number)[] } {
  const hasSearchFilters = filters.location || filters.seniority || filters.industry || filters.keyword || filters.hasEmail;

  if (!hasSearchFilters) {
    return { sql: '', params: [] };
  }

  const conditions: string[] = ['1=1'];
  const params: (string | number)[] = [];

  if (filters.location) {
    conditions.push('(location LIKE ? OR location LIKE ?)');
    params.push(`%${filters.location}%`, `%${filters.location.replace(/,.*/, '')}%`);
  }
  if (filters.seniority) {
    conditions.push('LOWER(seniority) = LOWER(?)');
    params.push(filters.seniority);
  }
  if (filters.industry) {
    conditions.push('industries LIKE ?');
    params.push(`%${filters.industry}%`);
  }
  if (filters.keyword) {
    conditions.push('(description LIKE ? OR companyName LIKE ? OR title LIKE ? OR firstName LIKE ? OR lastName LIKE ?)');
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  if (filters.hasEmail === true) {
    conditions.push('email IS NOT NULL AND email != ""');
  }

  const limit = filters.limit || 500;
  const offset = filters.offset || 0;
  params.push(limit, offset);

  const sql = `SELECT id, linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email
    FROM investors WHERE ${conditions.join(' AND ')} LIMIT ? OFFSET ?`;

  return { sql, params };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filters: SearchFilters = {
      location: searchParams.get('location') || undefined,
      seniority: searchParams.get('seniority') || undefined,
      industry: searchParams.get('industry') || undefined,
      keyword: searchParams.get('keyword') || undefined,
      hasEmail: searchParams.get('hasEmail') === 'true' ? true : undefined,
      limit: parseInt(searchParams.get('limit') || '500'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const { sql, params } = buildSearchQuery(filters);
    const db = getDb();

    let investors;
    if (!sql) {
      investors = await db.prepare('SELECT id, linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email FROM investors LIMIT ? OFFSET ?').all(filters.limit, filters.offset);
    } else {
      investors = await db.prepare(sql).all(...params);
    }

    return NextResponse.json({ investors, count: investors.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
