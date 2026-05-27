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
  if (!(apiKey)) throw new Error('MINIMAX_API_KEY not set');

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

  // Strip <reasoning>...</reasoning> and <thinking>...</thinking> tags if present
  const cleaned = text
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '');

  // If response is not OK, return the error text so caller can handle it
  if (!response.ok) {
    return `HTTP_ERROR_${response.status}: ${cleaned.slice(0, 200)}`;
  }

  // If response is not OK, return the error text so caller can handle it
  if (!response.ok) {
    return `HTTP_ERROR_${response.status}: ${cleaned.slice(0, 200)}`;
  }

  // Try to parse as JSON with choices structure
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Not JSON — strip any remaining tags and return trimmed text
    const trimmed = cleaned.replace(/<[^>]+>/g, '').trim();
    return trimmed;
  }

  if (typeof parsed === 'object' && parsed !== null && 'choices' in parsed) {
    const raw = parsed.choices?.[0]?.message?.content;
    if (typeof raw === 'string') {
      // Strip reasoning/thinking tags and any surrounding text
      const withoutTags = raw
        .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
        .trim();
      if (!withoutTags) return cleaned.trim();

      // Try to find and extract the first valid JSON object or array in the content
      const jsonMatch = withoutTags.match(/\{[\s\S]*\}/) || withoutTags.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try { return JSON.stringify(JSON.parse(jsonMatch[0])); } catch { /* fall through */ }
      }
      return withoutTags;
    }
  }

  return cleaned.trim();
}
