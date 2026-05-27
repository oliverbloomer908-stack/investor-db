import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { mapRowToInvestor } from '@/lib/csv';
import { detectColumnsWithConfidence } from '@/lib/csv';
import { requestColumnMapping } from '@/lib/aiMapping';
import { createHash } from 'crypto';
import { ColumnMapping } from '@/lib/csv';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filters = {
      location: searchParams.get('location') || undefined,
      seniority: searchParams.get('seniority') || undefined,
      industry: searchParams.get('industry') || undefined,
      keyword: searchParams.get('keyword') || undefined,
      hasEmail: searchParams.get('hasEmail') === 'true',
      limit: parseInt(searchParams.get('limit') || '500'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const hasFilter = filters.location || filters.seniority || filters.industry || filters.keyword || filters.hasEmail;
    let sql = '';
    let params: any[] = [];
    let p = 1;

    if (hasFilter) {
      const conditions: string[] = [];
      if (filters.location) {
        conditions.push(`(location LIKE $${p} OR location LIKE $${p + 1})`);
        params.push(`%${filters.location}%`, `%${filters.location.replace(/,.*/, '')}%`);
        p += 2;
      }
      if (filters.seniority) {
        conditions.push(`LOWER(seniority) = LOWER($${p})`);
        params.push(filters.seniority);
        p += 1;
      }
      if (filters.industry) {
        conditions.push(`industries LIKE $${p}`);
        params.push(`%${filters.industry}%`);
        p += 1;
      }
      if (filters.keyword) {
        conditions.push(`(description LIKE $${p} OR companyName LIKE $${p} OR title LIKE $${p} OR firstName LIKE $${p} OR lastName LIKE $${p})`);
        params.push(`%${filters.keyword}%`);
        p += 1;
      }
      if (filters.hasEmail) {
        conditions.push(`email IS NOT NULL AND email != ''`);
      }
      sql = `SELECT id, linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email FROM investors WHERE ${conditions.join(' AND ')} LIMIT ${filters.limit} OFFSET ${filters.offset}`;
    } else {
      sql = `SELECT id, linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email FROM investors LIMIT ${filters.limit} OFFSET ${filters.offset}`;
    }

    const investors = await executeRawSql(sql, params);
    return NextResponse.json({ investors, count: investors.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
