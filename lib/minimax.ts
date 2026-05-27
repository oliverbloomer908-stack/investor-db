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
  const reasoningMatch = text.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
  if (reasoningMatch) {
    text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/, '');
  }

  let content = '';
  try {
    const data = JSON.parse(text) as any;
    content = data.choices?.[0]?.message?.content || '';
  } catch {
    // Minimax sometimes returns plain text before/around the JSON
    // Try extracting anything that looks like JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try { content = JSON.parse(jsonMatch[0])?.choices?.[0]?.message?.content || ''; } catch { content = ''; }
    }
  }

  return content;
}
