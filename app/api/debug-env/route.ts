import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const dbg: Record<string, string> = {};

  dbg['DATABASE_URL_set'] = !!process.env.DATABASE_URL ? 'YES' : 'NO';
  dbg['NODE_ENV'] = process.env.NODE_ENV || 'undefined';
  dbg['VERCEL'] = process.env.VERCEL || 'not set';
  dbg['MINIMAX_API_KEY_set'] = !!process.env.MINIMAX_API_KEY ? 'YES' : 'NO';
  dbg['MINIMAX_API_KEY_prefix'] = process.env.MINIMAX_API_KEY
    ? process.env.MINIMAX_API_KEY.slice(0, 8) + '...'
    : 'undefined';

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

  // Test Minimax
  let minimaxOk = false;
  let minimaxErr = '';
  try {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      minimaxErr = 'MINIMAX_API_KEY not set';
    } else {
      const res = await fetch('https://api.minimax.io/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.1',
          messages: [{ role: 'user', content: 'reply with JSON: {"test":"ok"}' }],
          max_tokens: 50,
          temperature: 0.1,
        }),
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        minimaxOk = true;
        minimaxErr = 'status=' + res.status;
      } catch {
        // NON-JSON response - key source of the bug
        minimaxErr = 'NON-JSON response: ' + text.slice(0, 120);
      }
    }
  } catch (e: any) {
    minimaxErr = e.message;
  }
  dbg['minimax_connect'] = minimaxOk ? 'OK' : 'FAIL: ' + minimaxErr;

  return NextResponse.json(dbg);
}
