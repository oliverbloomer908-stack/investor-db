import { Investor } from '@/types';

export function buildRankingPrompt(query: string, candidates: Partial<Investor>[], maxResults: number, filters?: { location?: string; seniority?: string; industry?: string; name?: string }): string {
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

${filters ? `Filter signals (use as soft ranking signals, not hard filters):
${filters.location ? `Location: ${filters.location}` : ''}
${filters.seniority ? `Seniority: ${filters.seniority}` : ''}
${filters.industry ? `Industry: ${filters.industry}` : ''}
${filters.name ? `Investor name: ${filters.name}` : ''}
` : ''}IMPORTANT: Respond ONLY with a raw JSON array - no markdown formatting, no code blocks, no backticks. Start your response with '[' and end with ']'.

Example of correct format:
[{"rank":1,"name":"Full Name","title":"Job Title","company":"Company","linkedInUrl":"https://linkedin.com/in/xyz","reason":"brief reason","score":9}]

Scoring: 1-10 based on fit to query. Include score for each. Return top ${maxResults} only.`;
}
