import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const dbg: Record<string, string> = {};
  dbg['DATABASE_URL_set'] = !!process.env.DATABASE_URL ? 'YES' : 'NO - not set';
  dbg['DATABASE_URL_value'] = process.env.DATABASE_URL
    ? (process.env.DATABASE_URL.length > 20
        ? process.env.DATABASE_URL.slice(0, 40) + '...'
        : process.env.DATABASE_URL)
    : 'undefined';
  dbg['NODE_ENV'] = process.env.NODE_ENV || 'undefined';
  dbg['VERCEL'] = process.env.VERCEL || 'not set';

  // Test pg connection
  let pgOk = false;
  let pgErr = '';
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    const result = await pool.query('SELECT 1 as test');
    pgOk = result.rows[0]?.test === 1;
    await pool.end();
  } catch (e: any) {
    pgErr = e.message;
  }
  dbg['pg_connect'] = pgOk ? 'OK' : 'FAIL: ' + pgErr;

  return NextResponse.json(dbg);
}
