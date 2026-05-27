import { NextRequest, NextResponse } from 'next/server';
import { parseCSV, detectColumnsWithConfidence, mapRowToInvestor } from '@/lib/csv';
import { ColumnMapping } from '@/lib/csv';
import { requestColumnMapping } from '@/lib/aiMapping';

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

    if (trulyUnmapped.length > 0 && trulyUnmapped.length <= 10) {
      const aiMappings = await requestColumnMapping({
        unmappedHeaders: trulyUnmapped,
        sampleRows: rows.slice(0, 3),
      });
      debug.aiMappings = aiMappings;
      debug.aiMappingsType = typeof aiMappings;
      debug.aiMappingsIsArray = Array.isArray(aiMappings);
      debug.aiMappingsKeys = Object.keys(aiMappings);

      try {
        if (typeof aiMappings === 'object' && aiMappings !== null && !Array.isArray(aiMappings)) {
          for (const [header, field] of Object.entries(aiMappings)) {
            if (field && (mapping as any)[field] === null) {
              (mapping as any)[field] = header;
            }
          }
          debug.aiMappingsApplied = true;
        } else {
          debug.aiMappingsApplied = false;
          debug.aiMappingsAppliedReason = `unexpected type: ${typeof aiMappings}`;
        }
      } catch (e: any) {
        debug.aiMappingsApplied = false;
        debug.aiMappingsAppliedError = e.message;
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
