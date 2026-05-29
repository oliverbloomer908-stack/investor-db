import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildRankingPrompt } from '@/lib/ranking';
import { chatCompletion } from '@/lib/minimax';

function extractJsonArray(text: string): any[] | null {
  try { const p = JSON.parse(text); if (Array.isArray(p)) return p; } catch {}
  const md = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (md) { try { return JSON.parse(md[1]); } catch {} }
  const bare = text.match(/\[[\s\S]*\]/);
  if (bare) { try { return JSON.parse(bare[0]); } catch {} }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { query, filters, limit = 50 } = await req.json() as {
      query: string;
      filters?: { location?: string; seniority?: string; industry?: string; name?: string; keyword?: string };
      limit?: number;
    };

    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let p = 1;

    // Hard SQL filters
    if (filters?.name) {
      conditions.push(`LOWER(CONCAT(firstName, ' ', lastName)) LIKE $${p}`);
      params.push(`%${filters.name.toLowerCase()}%`);
      p += 1;
    }

    if (filters?.keyword) {
      conditions.push(`(description LIKE $${p} OR companyName LIKE $${p} OR title LIKE $${p})`);
      params.push(`%${filters.keyword}%`);
      p += 1;
    }

    if (filters?.location) {
      conditions.push(`(location LIKE $${p} OR location LIKE $${p + 1})`);
      params.push(`%${filters.location}%`, `%${filters.location.replace(/,.*/, '')}%`);
      p += 2;
    }

    if (filters?.seniority) {
      conditions.push(`LOWER(seniority) = LOWER($${p})`);
      params.push(filters.seniority);
      p += 1;
    }

    if (filters?.industry) {
      conditions.push(`industries LIKE $${p}`);
      params.push(`%${filters.industry}%`);
      p += 1;
    }

    const db = getDb();
    const sql = `SELECT firstName, lastName, description, location, seniority, title, industries, companyName, linkedInUrl, email, domain, companyDescription
      FROM investors WHERE ${conditions.join(' AND ')} LIMIT 500`;
    const candidates = (await db.prepare(sql).all(...params)) as any[];

    if (candidates.length === 0) return NextResponse.json({ results: [], message: 'No matching investors found' });

    const truncated = candidates.map(c => ({
      ...c,
      linkedInUrl: c.linkedInUrl,
      description: (c.description || '').slice(0, 300),
    }));

    const prompt = buildRankingPrompt(query, truncated, Math.min(limit, candidates.length));
    const responseText = await chatCompletion([
      { role: 'user', content: prompt }
    ], { temperature: 0.3, max_tokens: 4000 });

    let results: any[];
    const parseable = extractJsonArray(responseText);
    if (parseable) {
      // Merge AI results with original DB candidate data so DetailPanel has all fields
      const candidateByUrl = new Map(candidates.map(c => [c.linkedInUrl, c]));
      results = parseable.map((r: any) => {
        const db = candidateByUrl.get(r.linkedInUrl);
        return {
          ...r,
          // Always use DB fields for accurate data (AI only echoes what it received)
          firstName: db?.firstName || '',
          lastName: db?.lastName || '',
          name: db
            ? [db.firstName, db.lastName].filter(Boolean).join(' ') || r.name
            : r.name,
          description: db?.description || r.description || '',
          location: db?.location || '',
          seniority: db?.seniority || '',
          industries: db?.industries || '',
          companyName: db?.companyName || r.company || '',
          company: db?.companyName || r.company || '',
          companyDescription: db?.companyDescription || '',
          domain: db?.domain || '',
          email: db?.email || '',
          linkedInUrl: r.linkedInUrl,
        };
      });
    } else {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: responseText.slice(0, 1000) }, { status: 500 });
    }

    return NextResponse.json({ results, candidateCount: candidates.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
