import { NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/minimax';

export async function GET() {
  try {
    const prompt = 'Reply with JSON: {"test":"ok"}';
    const result = await chatCompletion([{ role: 'user', content: prompt }], { temperature: 0.1, max_tokens: 50 });
    return NextResponse.json({
      raw: result,
      rawLength: result.length,
      rawFirst50: result.slice(0, 50),
      rawJsonparsable: (() => { try { JSON.parse(result); return true; } catch (e: any) { return e ? String(e.message) : String(e); } })(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
