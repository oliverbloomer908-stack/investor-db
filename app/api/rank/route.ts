import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildRankingPrompt } from '@/lib/ranking';
import { chatCompletion } from '@/lib/minimax';

function extractJsonArray(text: string): any[] | null {
  // Try direct parse first
  try { const p = JSON.parse(text); if (Array.isArray(p)) return p; } catch {}
  // Try extracting JSON array from anywhere in the text
  const allArrayMatches = text.matchAll(/\[[\s\S]*?\]/g);
  for (const match of allArrayMatches) {
    try { const p = JSON.parse(match[0]); if (Array.isArray(p)) return p; } catch {}
  }
  // Try markdown code blocks
  const md = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (md) { try { return JSON.parse(md[1]); } catch {} }
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
    const sql = `SELECT linkedinurl AS "linkedInUrl", firstname AS "firstName", lastname AS "lastName", description, location, seniority, title, industries, companyname AS "companyName", email, domain, companydescription AS "companyDescription"
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
      { role: 'system', content: 'You must respond with ONLY a valid JSON array, no other text, no explanations, no markdown. Start with [ and end with ].' },
      { role: 'user', content: prompt }
    ], { temperature: 0.1, max_tokens: 4000 });

    let results: any[];
    const parseable = extractJsonArray(responseText);
    if (parseable) {
      // Use index-based lookup (index is 0-based from the prompt)
      results = parseable.map((r: any) => {
        let db: any = null;
        if (r.index != null) {
          const idx = Number(r.index);
          if (idx >= 0 && idx < candidates.length) db = candidates[idx];
        }
        // Fall back to fullName match
        if (!db && r.fullName) {
          const fn = (r.fullName || '').toLowerCase();
          db = candidates.find((c: any) =>
            [c.firstName, c.lastName].filter(Boolean).join(' ').toLowerCase() === fn
          ) || null;
        }
        const name = db ? [db.firstName, db.lastName].filter(Boolean).join(' ') : (r.fullName || r.name || '');
        return {
          rank: r.rank,
          score: r.score,
          reason: r.reason,
          firstName: db?.firstName || '',
          lastName: db?.lastName || '',
          name,
          linkedInUrl: db?.linkedInUrl || '',
          description: db?.description || '',
          location: db?.location || '',
          seniority: db?.seniority || '',
          industries: db?.industries || '',
          companyName: db?.companyName || '',
          company: db?.companyName || '',
          companyDescription: db?.companyDescription || '',
          domain: db?.domain || '',
          email: db?.email || '',
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
