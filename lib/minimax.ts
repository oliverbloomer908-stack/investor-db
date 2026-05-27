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

  // Get raw text first
  let text = await response.text();

  // Strip <reasoning>...</reasoning> tags if present
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '');

  // Try to parse as full API JSON response with choices structure
  try {
    const data = JSON.parse(text);
    if (typeof data === 'object' && data !== null && 'choices' in data) {
      const raw = data.choices?.[0]?.message?.content;
      if (typeof raw === 'string') {
        // Try parsing if content itself is JSON
        try { return JSON.parse(raw).choices?.[0]?.message?.content || raw; }
        catch { return raw; }
      }
    }
  } catch {
    // Not JSON — treat as plain text response (e.g. error messages)
    return text.trim();
  }

  // If we get here, text wasn't a JSON object with choices
  // This handles plain text error responses from Minimax
  return text.trim();
}
