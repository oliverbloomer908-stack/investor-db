import { Investor } from '@/types';

export function buildRankingPrompt(query: string, candidates: Partial<Investor>[], maxResults: number): string {
  const candidateList = candidates.map((c, i) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || `Investor ${i + 1}`;
    const desc = (c.description || '').slice(0, 300);
    const loc = c.location || '';
    const ind = c.industries || '';
    const co = c.companyName || '';
    return `[${i + 1}] ${name} | ${co} | ${loc} | ${ind}\n  Bio: ${desc}`;
  }).join('\n\n');

  return `You are an investor intelligence analyst. Given the query and candidate list below, you MUST rank the investors from that list ONLY. Do NOT invent new investors.

Query: ${query}

Candidates:
${candidateList}

CRITICAL RULES:
- Return exactly ${maxResults} investors from the candidate list above (use candidate number in brackets, e.g. [3] for the 3rd candidate).
- Do NOT invent names, companies, or URLs — use the EXACT data from the candidate list.
- Do NOT skip candidates — if fewer than ${maxResults} exist, return only those.
- Each result must include: rank (1,2,3...), candidate number, name, and score 1-10.

IMPORTANT: Respond ONLY with a raw JSON array - no markdown, no code blocks, no backticks. Start with '[' and end with ']'.

Format — use the EXACT candidate number and name from the list:
[{"rank":1,"candidate":3,"name":"John Smith","title":"Partner","company":"Acme VC","location":"London","reason":"strong fit","score":9}]`;
}
