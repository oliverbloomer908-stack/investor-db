const MINIMAX_BASE_URL = 'https://api.minimax.io';

interface MinimaxMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MinimaxChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export async function chatCompletion(
  messages: MinimaxMessage[],
  options: MinimaxChatOptions = {}
): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error('MINIMAX_API_KEY not set');

  const response = await fetch(`${MINIMAX_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'MiniMax-M2.1',
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 4000,
    }),
  });

  const text = await response.text();
  console.log('[minimax] raw response:', text.slice(0, 500));

  // Strip <reasoning> and <thinking> tags
  const cleaned = text
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '');

  if (!response.ok) {
    console.log('[minimax] HTTP error:', response.status, cleaned.slice(0, 200));
    return `HTTP_ERROR_${response.status}: ${cleaned.slice(0, 200)}`;
  }

  // Try to parse as JSON with choices structure
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.log('[minimax] not JSON, returning raw text');
    const trimmed = cleaned.replace(/<[^>]+>/g, '').trim();
    return trimmed;
  }

  if (typeof parsed === 'object' && parsed !== null && 'choices' in parsed) {
    const raw = parsed.choices?.[0]?.message?.content;
    if (typeof raw === 'string') {
      console.log('[minimax] choices content before tag strip:', raw.slice(0, 300));
      const withoutTags = raw
        .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
        .replace(/<vercel_thinking>[\s\S]*?<\/vercel_thinking>/g, '')
        .replace(/<[^>]+>/g, '')
        .trim();
      if (!withoutTags) {
        console.log('[minimax] content empty after tag strip');
        return cleaned.trim();
      }
      console.log('[minimax] content after tag strip:', withoutTags.slice(0, 300));

      // Try to extract and parse a JSON array or object
      const jsonMatch = withoutTags.match(/\[[\s\S]*\]/) || withoutTags.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const inner = JSON.parse(jsonMatch[0]);
          console.log('[minimax] parsed inner JSON:', JSON.stringify(inner).slice(0, 200));
          return JSON.stringify(inner);
        } catch (e: any) {
          console.log('[minimax] inner JSON parse failed:', e.message);
        }
      }
      return withoutTags;
    }
  }

  console.log('[minimax] no choices, returning cleaned');
  return cleaned.trim();
}
