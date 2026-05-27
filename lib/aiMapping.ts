import { chatCompletion } from './minimax';
import { ColumnMapping } from './csv';

interface AiMappingInput {
  unmappedHeaders: string[];
  sampleRows: Record<string, string>[];
}

export async function requestColumnMapping(
  input: AiMappingInput,
  maxRetries = 2
): Promise<Record<string, keyof ColumnMapping | null>> {
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

  let lastError = '';
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await chatCompletion([
        { role: 'user', content: prompt }
      ], { temperature: 0.1, max_tokens: 1000 });

      // If response starts with "An error" or HTML-like content, treat as failure
      const trimmed = response.trim();
      if (trimmed.startsWith('An error') || trimmed.startsWith('<!') || trimmed.startsWith('Error')) {
        lastError = trimmed;
        continue;
      }

      // Try parsing directly
      try {
        return JSON.parse(trimmed);
      } catch {
        // Try extracting JSON from plain text
        const match = trimmed.match(/\{[\s\S]*\}/);
        if (match) {
          try { return JSON.parse(match[0]); } catch {}
        }
      }
      lastError = 'Could not parse response: ' + trimmed.slice(0, 100);
    } catch (err: any) {
      lastError = err.message;
    }
  }

  // All attempts failed — return empty mapping
  console.warn('AI column mapping failed after retries:', lastError);
  return {};
}
