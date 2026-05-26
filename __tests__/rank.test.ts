import { describe, it, expect } from 'vitest';
import { buildRankingPrompt } from '@/lib/ranking';

describe('ranking', () => {
  it('builds a prompt with user query and candidate count', () => {
    const prompt = buildRankingPrompt(
      'fintech investors in the US who write $50K-$250K checks',
      [{ firstName: 'John', lastName: 'Doe', description: 'VC at Acme', location: 'New York', industries: 'FinTech', companyName: 'Acme' }],
      1
    );
    expect(prompt).toContain('fintech investors');
    expect(prompt).toContain('John Doe');
  });

  it('limits candidate descriptions in prompt', () => {
    const candidates = Array(5).fill({ firstName: 'X', lastName: 'Y', description: 'Long desc '.repeat(20), location: 'NYC', industries: 'Tech', companyName: 'Co' });
    const prompt = buildRankingPrompt('test', candidates, 5);
    expect(prompt.length).toBeLessThan(5000);
  });
});
