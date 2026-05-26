import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildRankingPrompt } from '@/lib/ranking';
import { chatCompletion } from '@/lib/minimax';

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
    const candidates = db.prepare(sql).all(...params) as any[];

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

    // Parse JSON response
    let results: any[];
    try {
      results = JSON.parse(responseText);
      if (!Array.isArray(results)) throw new Error('Not an array');
    } catch {
      // Fallback: try to extract JSON from response
      const match = responseText.match(/\[[\s\S]*\]/);
      if (match) results = JSON.parse(match[0]);
      else return NextResponse.json({ error: 'Failed to parse AI response', raw: responseText.slice(0, 500) }, { status: 500 });
    }

    return NextResponse.json({ results, candidateCount: candidates.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
