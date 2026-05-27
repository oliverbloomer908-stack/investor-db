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

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Minimax API error ${response.status}: ${err}`);
  }

  let text = await response.text();

  // Strip <reasoning>...</reasoning> tags if present
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '');

  // Try to extract content — MiniMax can return various formats
  let content = '';

  // Format 1: full JSON API response
  try {
    const data = JSON.parse(text) as any;
    if (data.choices?.[0]?.message?.content) {
      const raw = data.choices[0].message.content;
      // If content itself is a JSON string (model parsed it), try parsing it
      try { content = JSON.parse(raw).choices?.[0]?.message?.content || raw; }
      catch { content = raw; }
    } else if (Array.isArray(data)) {
      // Format 2: model returned bare JSON array as the entire response body
      content = JSON.stringify(data);
    }
  } catch {
    // Format 3: response is plain text / non-JSON, return as-is
    content = text.trim();
  }

  return content;
}
