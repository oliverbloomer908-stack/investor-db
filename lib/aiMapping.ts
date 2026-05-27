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

      const trimmed = response.trim();

      // If Minimax returned an error indicator, treat as failure
      if (
        trimmed.startsWith('HTTP_ERROR_') ||
        trimmed.startsWith('An error') ||
        trimmed.startsWith('Error:') ||
        trimmed.startsWith('<!') ||
        trimmed.startsWith('<html') ||
        trimmed.includes('connect ECONNREFUSED') ||
        trimmed.includes('Unexpected token')
      ) {
        lastError = trimmed.slice(0, 150);
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
      // Non-JSON and no error indicator — return empty (no AI mapping possible)
      lastError = 'Non-JSON response: ' + trimmed.slice(0, 100);
    } catch (err: any) {
      lastError = err.message;
    }
  }

  // All attempts failed — return empty mapping, import continues without AI fallback
  console.warn('AI column mapping failed after retries:', lastError);
  return {};
}
