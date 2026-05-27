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
    const { query, filters, limit = 100 } = await req.json() as {
      query: string;
      filters?: { location?: string; seniority?: string; industry?: string; keyword?: string };
      limit?: number;
    };

    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let p = 1;

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
    if (filters?.keyword) {
      conditions.push(`(description LIKE $${p} OR companyName LIKE $${p} OR title LIKE $${p})`);
      params.push(`%${filters.keyword}%`);
      p += 1;
    }

    const db = getDb();
    const sql = `SELECT linkedInUrl, firstName, lastName, description, location, seniority, title, industries, companyName, companyDescription, domain, email
      FROM investors WHERE ${conditions.join(' AND ')} LIMIT 500`;
    const candidates = (await db.prepare(sql).all(...params)) as any[];

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No matching investors found' }, { status: 404 });
    }

    const truncated = candidates.map(c => ({
      ...c,
      description: (c.description || '').slice(0, 300),
    }));

    const prompt = buildRankingPrompt(query, truncated, Math.min(limit, candidates.length));
    const responseText = await chatCompletion([
      { role: 'user', content: prompt }
    ], { temperature: 0.3, max_tokens: 4000 });

    let ranked: any[];
    const parseable = extractJsonArray(responseText);
    if (parseable) {
      ranked = parseable;
    } else {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: responseText.slice(0, 500) }, { status: 500 });
    }

    // Build CSV from ranked results
    const csvRows = [
      'rank,name,title,company,location,linkedInUrl,industries,reason,score'
    ];
    for (const r of ranked) {
      const name = r.name || [r.firstName, r.lastName].filter(Boolean).join(' ') || '';
      const title = r.title || '';
      const company = r.company || '';
      const location = r.location || '';
      const linkedInUrl = r.linkedInUrl || '';
      const industries = r.industries || '';
      const reason = (r.reason || '').replace(/"/g, '""');
      const score = r.score || '';
      csvRows.push(`${r.rank || ''},"${name}","${title}","${company}","${location}","${linkedInUrl}","${industries}","${reason}",${score}`);
    }

    const csv = csvRows.join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="investor-export-${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
