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
      reasoning: { type: 'disable' },
    }),
  });

  const text = await response.text();

  // Strip <reasoning>...</reasoning> tags if present
  const cleaned = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '');

  // If response is not OK, return the error text so caller can handle it
  if (!response.ok) {
    return `HTTP_ERROR_${response.status}: ${cleaned.slice(0, 200)}`;
  }

  // Try to parse as JSON with choices structure
  try {
    const data = JSON.parse(cleaned);
    if (typeof data === 'object' && data !== null && 'choices' in data) {
      const raw = data.choices?.[0]?.message?.content;
      if (typeof raw === 'string') {
        // If content itself is JSON string, try to re-parse
        try { return JSON.parse(raw).choices?.[0]?.message?.content || raw; }
        catch { return raw; }
      }
    }
  } catch {
    // Not JSON — return trimmed text as-is
    const trimmed = cleaned.trim();
    // Return a sentinel so callers can detect non-JSON responses
    return trimmed;
  }

  return cleaned.trim();
}
