import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildRankingPrompt } from '@/lib/ranking';
import { chatCompletion } from '@/lib/minimax';

function extractJsonArray(text: string): any[] | null {
  try { const p = JSON.parse(text); if (Array.isArray(p)) return p; } catch {}
  const allArrayMatches = text.matchAll(/\[[\s\S]*?\]/g);
  for (const match of allArrayMatches) {
    try { const p = JSON.parse(match[0]); if (Array.isArray(p)) return p; } catch {}
  }
  const md = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (md) { try { return JSON.parse(md[1]); } catch {} }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { query, filters, limit = 100, linkedInUrls } = await req.json() as {
      query: string;
      filters?: { location?: string; seniority?: string; industry?: string; keyword?: string };
      limit?: number;
      linkedInUrls?: string[];
    };

    // Direct export: fetch by linkedInUrls, skip ranking
    if (linkedInUrls && linkedInUrls.length > 0) {
      const db = getDb();
      const sql = `SELECT linkedinurl, firstname, lastname, description, location, seniority, title, industries, companyname, companydescription, domain, email
        FROM investors WHERE linkedinurl = ANY($1)`;
      const investors = (await db.prepare(sql).all(linkedInUrls)) as any[];

      if (investors.length === 0) {
        return NextResponse.json({ error: 'No investors found for the provided linkedInUrls' }, { status: 404 });
      }

      const csvRows = [
        'linkedInUrl,firstName,lastName,title,company,location,industries,description,domain,email'
      ];
      for (const inv of investors) {
        const escape = (v: string) => (v || '').replace(/"/g, '""');
        csvRows.push(
          `${inv.linkedinurl || ''},` +
          `"${escape(inv.firstname)}",` +
          `"${escape(inv.lastname)}",` +
          `"${escape(inv.title)}",` +
          `"${escape(inv.companyname)}",` +
          `"${escape(inv.location)}",` +
          `"${escape(inv.industries)}",` +
          `"${escape(inv.description)}",` +
          `"${escape(inv.domain)}",` +
          `"${escape(inv.email)}"`
        );
      }

      const csv = csvRows.join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="investor-export-${Date.now()}.csv"`,
        },
      });
    }

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
    const sql = `SELECT linkedinurl AS "linkedInUrl", firstname AS "firstName", lastname AS "lastName", description, location, seniority, title, industries, companyname AS "companyName", companydescription AS "companyDescription", domain, email
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
      { role: 'system', content: 'You must respond with ONLY a valid JSON array, no other text, no explanations, no markdown. Start with [ and end with ].' },
      { role: 'user', content: prompt }
    ], { temperature: 0.1, max_tokens: 4000 });

    let ranked: any[];
    const parseable = extractJsonArray(responseText);
    if (parseable) {
      ranked = parseable.map((r: any) => {
        let db: any = null;
        if (r.index != null) {
          const idx = Number(r.index);
          if (idx >= 0 && idx < candidates.length) db = candidates[idx];
        }
        if (!db && r.fullName) {
          const fn = (r.fullName || '').toLowerCase();
          db = candidates.find((c: any) =>
            [c.firstName, c.lastName].filter(Boolean).join(' ').toLowerCase() === fn
          ) || null;
        }
        const name = db ? [db.firstName, db.lastName].filter(Boolean).join(' ') : (r.fullName || r.name || '');
        return {
          ...r,
          name,
          title: db?.title || r.title || '',
          company: db?.companyName || r.company || '',
          location: db?.location || r.location || '',
          linkedInUrl: db?.linkedInUrl || r.linkedInUrl || '',
          industries: db?.industries || r.industries || '',
        };
      });
    } else {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: responseText.slice(0, 500) }, { status: 500 });
    }

    // Build CSV from ranked results
    const csvRows = [
      'rank,name,title,company,location,linkedInUrl,industries,reason,score'
    ];
    for (const r of ranked) {
      const name = r.name || '';
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
