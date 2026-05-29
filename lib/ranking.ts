import { Investor } from '@/types';

export function buildRankingPrompt(query: string, candidates: Partial<Investor>[], maxResults: number): string {
  const candidateList = candidates.map((c, i) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || `Investor${i + 1}`;
    const co = c.companyName || '';
    const bio = (c.description || '').slice(0, 200);
    return `[${i + 1}] ${name} | ${co} | ${bio}`;
  }).join('\n\n');

  return `Given the query and candidate list, return ONLY a JSON array with the top ${maxResults} most relevant candidate indices.

Query: ${query}

Candidates (index starts at 1):
${candidateList}

Return ONLY a JSON array with exactly these fields: rank (1,2,3...), candidate (the index number from the list), score (1-10), and reason (1 sentence why this candidate fits). Do NOT include any other fields. Do NOT invent data — use only the candidates above.

Example: [{"rank":1,"candidate":5,"score":9,"reason":"London-based fintech angel investor"}]`;
}
