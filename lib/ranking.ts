import { Investor } from '@/types';

export function buildRankingPrompt(query: string, candidates: Partial<Investor>[], maxResults: number): string {
  const candidateList = candidates.map((c, i) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || `Investor ${i + 1}`;
    const desc = (c.description || '').slice(0, 300);
    const loc = c.location || '';
    const ind = c.industries || '';
    const co = c.companyName || '';
    return `[${i + 1}] ${name} | ${loc} | ${ind} | ${co}\n  Bio: ${desc}`;
  }).join('\n\n');

  return `You are an investor intelligence analyst. Given the query and candidate list below, return the top ${maxResults} most relevant investors in JSON format.

Query: ${query}

Candidates:
${candidateList}

Respond ONLY with valid JSON array (no markdown, no explanation):
[
  {
    "rank": 1,
    "name": "Full Name",
    "title": "Job Title",
    "company": "Company Name",
    "linkedInUrl": "https://linkedin.com/in/...",
    "reason": "why this investor is a good fit (1 sentence)",
    "score": 9
  },
  ...
]

Scoring: 1-10 based on fit to query. Include score for each. Return top ${maxResults} only.`;
}
