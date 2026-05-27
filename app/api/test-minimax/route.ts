import { NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/minimax';

export async function GET() {
  try {
    const prompt = 'Reply with JSON: {"test":"ok"}';
    const result = await chatCompletion([{ role: 'user', content: prompt }], { temperature: 0.1, max_tokens: 50 });

    // Inspect the raw response structure
    let info: Record<string, any> = {
      result,
      resultType: typeof result,
      resultFirst50: String(result).slice(0, 50),
      isValidJson: false,
      parsedResult: null,
    };

    try {
      const parsed = JSON.parse(result);
      info.isValidJson = true;
      info.parsedResult = parsed;
    } catch (e: any) {
      info.jsonParseError = e.message;
    }

    return NextResponse.json(info);
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
