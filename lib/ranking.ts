import { Investor } from '@/types';

export function buildRankingPrompt(query: string, candidates: Partial<Investor>[], maxResults: number): string {
  const candidateList = candidates.map((c, i) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || `Investor ${i + 1}`;
    const desc = (c.description || '').slice(0, 300);
    const loc = c.location || '';
    const ind = c.industries || '';
    const co = c.companyName || '';
    const li = c.linkedInUrl || '';
    return `[${i + 1}] name:"${name}" url:"${li}" | ${loc} | ${ind} | ${co}\n  Bio: ${desc}`;
  }).join('\n\n');

  return `You are an investor intelligence analyst. Given the query and candidate list below, you MUST rank the investors from that list ONLY. Do NOT invent new investors.

Query: ${query}

Candidates:
${candidateList}

CRITICAL RULES:
- You MUST return exactly ${maxResults} investors from the candidate list above, using their EXACT name and linkedInUrl from the candidate list.
- Do NOT add extra fields to the linkedInUrl — use the exact url provided for each candidate.
- Do NOT skip candidates — if fewer than ${maxResults} candidates exist, return only those.
- For each result: use rank=1,2,3... score=1-10, and include a brief reason.

IMPORTANT: Respond ONLY with a raw JSON array - no markdown, no code blocks, no backticks. Start with '[' and end with ']'.

Correct format (note: use the EXACT name and url from the candidate list above):
[{"rank":1,"name":"Full Name","title":"Job Title","company":"Company","linkedInUrl":"https://linkedin.com/in/xyz","reason":"brief reason","score":9}]`;
}
