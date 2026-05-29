import { Investor } from '@/types';

export function buildRankingPrompt(query: string, candidates: Partial<Investor>[], maxResults: number): string {
  const candidateList = candidates.map((c, i) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || `Investor${i + 1}`;
    const co = c.companyName || '';
    const bio = (c.description || '').slice(0, 200);
    return `[${i + 1}] ${name} | ${co} | ${bio}`;
  }).join('\n\n');

  return `Given the query and candidate list below, rank the top ${maxResults} most relevant investors by returning their FULL NAME from the list.

Query: ${query}

Candidates:
${candidateList}

Return a JSON array with {rank, fullName, score, reason}. The fullName MUST exactly match one of the names in the list above. Score is 1-10. reason is 1 sentence.

IMPORTANT: fullName must be an EXACT match from the list above. Do not abbreviate, translate, or modify names.

Example: [{"rank":1,"fullName":"John Smith","score":9,"reason":"London-based fintech VC"}]`;
}
