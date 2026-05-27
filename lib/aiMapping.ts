import { chatCompletion } from './minimax';
import { ColumnMapping } from './csv';

interface AiMappingInput {
  unmappedHeaders: string[];
  sampleRows: Record<string, string>[];
}

export async function requestColumnMapping(input: AiMappingInput): Promise<Record<string, keyof ColumnMapping | null>> {
  const { unmappedHeaders, sampleRows } = input;

  const samplePreview = sampleRows.slice(0, 3).map(row => {
    return unmappedHeaders.map(h => `${h}: "${(row[h] || '').slice(0, 50)}"`).join(', ');
  }).join('\n');

  const prompt = `Given these CSV column headers that could not be matched automatically, and sample data from the rows, map each header to the most appropriate investor database field.

Available fields: firstName, lastName, linkedInUrl, description, location, seniority, title, industries, companyName, companyDescription, domain, email

Headers to map: ${unmappedHeaders.join(', ')}

Sample rows:
${samplePreview}

Respond ONLY with valid JSON mapping header → field name (use null if no good mapping exists):
{"header1": "firstName", "header2": "email", ...}`;

  const response = await chatCompletion([
    { role: 'user', content: prompt }
  ], { temperature: 0.1, max_tokens: 1000 });

  // response is already the extracted content string from chatCompletion
  // The model returns JSON like {"header1": "firstName", ...}
  try {
    return JSON.parse(response);
  } catch {
    // Try extracting from within plain text
    const match = response.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return {};
  }
}