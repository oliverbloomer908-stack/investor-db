import { NextRequest, NextResponse } from 'next/server';
import { parseCSV, detectColumnsWithConfidence, mapRowToInvestor } from '@/lib/csv';
import { ColumnMapping } from '@/lib/csv';
import { chatCompletion } from '@/lib/minimax';

export async function POST(req: NextRequest) {
  const debug: Record<string, any> = {};

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length === 0) return NextResponse.json({ error: 'No data found in CSV' }, { status: 400 });

    const headers = Object.keys(rows[0]);
    const { mapping, unmapped, confidence } = detectColumnsWithConfidence(headers);

    const trulyUnmapped = headers.filter(h =>
      Object.values(mapping).every(m => m !== h)
    );

    debug.headers = headers;
    debug.trulyUnmapped = trulyUnmapped;
    debug.mappingBeforeAI = Object.fromEntries(Object.entries(mapping).filter(([_, v]) => v !== null));

    if (trulyUnmapped.length > 0) {
      const sampleRows = rows.slice(0, 3);
      const samplePreview = sampleRows.map(row => {
        return trulyUnmapped.map(h => `${h}: "${(row[h] || '').slice(0, 50)}"`).join(', ');
      }).join('\n');

      const prompt = `Given these CSV column headers that could not be matched automatically, and sample data from the rows, map each header to the most appropriate investor database field.

Available fields: firstName, lastName, linkedInUrl, description, location, seniority, title, industries, companyName, companyDescription, domain, email

Headers to map: ${trulyUnmapped.join(', ')}

Sample rows:
${samplePreview}

Respond ONLY with valid JSON mapping header → field name (use null if no good mapping exists):
{"header1": "firstName", "header2": "email", ...}`;

      debug.aiPrompt = prompt;

      const aiRaw = await chatCompletion([{ role: 'user', content: prompt }], { temperature: 0.1, max_tokens: 1000 });

      debug.aiRawResponse = aiRaw;
      debug.aiRawLength = aiRaw.length;
      debug.aiRawFirst100 = aiRaw.slice(0, 100);
      debug.aiRawJsonparsable = (() => { try { JSON.parse(aiRaw); return true; } catch (e) { return e.message; } })();

      // Override mapping with AI suggestions
      try {
        const aiMappings = JSON.parse(aiRaw);
        if (typeof aiMappings === 'object' && !Array.isArray(aiMappings)) {
          for (const [header, field] of Object.entries(aiMappings)) {
            if (field && (mapping as any)[field] === null) {
              (mapping as any)[field] = header;
            }
          }
          debug.aiMappingsApplied = true;
        }
      } catch (e: any) {
        debug.aiParseError = e.message;
        debug.aiMappingsApplied = false;
      }
    }

    const usedHeaders = new Set(Object.values(mapping).filter(Boolean) as string[]);
    const postAiUnmapped = headers.filter(h => !usedHeaders.has(h));
    debug.postAiUnmapped = postAiUnmapped;

    return NextResponse.json({ debug, rowsFound: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, debug }, { status: 500 });
  }
}
