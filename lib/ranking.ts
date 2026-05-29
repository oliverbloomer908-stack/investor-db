import { Investor } from '@/types';

export function buildRankingPrompt(query: string, candidates: Partial<Investor>[], maxResults: number): string {
  const candidateList = candidates.map((c, i) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || '(unknown)';
    const li = c.linkedInUrl || '';
    const co = c.companyName || '';
    const bio = (c.description || '').slice(0, 150);
    return `[${i}] url:${li} name:${name} co:${co} bio:${bio}`;
  }).join('\n');

  return `Given the query and list of investors, rank the top ${maxResults} by relevance to the query.

Query: ${query}

Investors:
${candidateList}

Return a JSON array with {rank, index, score, reason}. Use the numeric index [N] from the investor list above. Score 1-10. reason is 1 sentence.

Respond with ONLY the JSON array, no other text:
[{"rank":1,"index":5,"score":9,"reason":"London fintech angel investor"}]`;
}
