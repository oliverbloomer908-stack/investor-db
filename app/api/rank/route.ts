import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildRankingPrompt } from '@/lib/ranking';
import { chatCompletion } from '@/lib/minimax';

function extractJsonArray(text: string): any[] | null {
  // Strategy 1: direct parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  // Strategy 2: markdown code fence
  const mdMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (mdMatch) {
    try { return JSON.parse(mdMatch[1]); } catch {}
  }

  // Strategy 3: find first [...] and parse it
  const bareMatch = text.match(/\[[\s\S]*\]/);
  if (bareMatch) {
    try { return JSON.parse(bareMatch[0]); } catch {}
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { query, filters, limit = 50 } = await req.json() as {
      query: string;
      filters?: { location?: string; seniority?: string; industry?: string; keyword?: string };
      limit?: number;
    };

    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    // Build search to get candidate set
    const conditions: string[] = ['1=1'];
    const params: string[] = [];
    if (filters?.location) { conditions.push('(location LIKE ? OR location LIKE ?)'); params.push(`%${filters.location}%`, `%${filters.location.replace(/,.*/, '')}%`); }
    if (filters?.seniority) { conditions.push('LOWER(seniority) = LOWER(?)'); params.push(filters.seniority); }
    if (filters?.industry) { conditions.push('industries LIKE ?'); params.push(`%${filters.industry}%`); }
    if (filters?.keyword) { conditions.push('(description LIKE ? OR companyName LIKE ? OR title LIKE ?)'); params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`); }

    // Get up to 500 candidates for the AI to rank
    const db = getDb();
    const sql = `SELECT firstName, lastName, description, location, seniority, title, industries, companyName, linkedInUrl
      FROM investors WHERE ${conditions.join(' AND ')} LIMIT 500`;
    const candidates = (await db.prepare(sql).all(...params)) as any[];

    if (candidates.length === 0) return NextResponse.json({ results: [], message: 'No matching investors found' });

    // Truncate descriptions to keep prompt token count reasonable
    const truncated = candidates.map(c => ({
      ...c,
      linkedInUrl: c.linkedInUrl,
      description: (c.description || '').slice(0, 300),
    }));

    const prompt = buildRankingPrompt(query, truncated, Math.min(limit, candidates.length));
    const responseText = await chatCompletion([
      { role: 'user', content: prompt }
    ], { temperature: 0.3, max_tokens: 4000 });

    // Parse JSON response — try multiple strategies
    let results: any[];
    const parseable = extractJsonArray(responseText);
    if (parseable) {
      results = parseable;
    } else {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: responseText.slice(0, 1000) }, { status: 500 });
    }

    return NextResponse.json({ results, candidateCount: candidates.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
