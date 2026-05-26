const MINIMAX_BASE_URL = 'https://api.minimaxi.com/v1';

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

  const response = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'minimax-01',
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Minimax API error ${response.status}: ${err}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}
