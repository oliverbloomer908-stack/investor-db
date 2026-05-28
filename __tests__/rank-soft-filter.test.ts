import { buildRankingPrompt } from '@/lib/ranking';
import { Investor } from '@/types';

describe('buildRankingPrompt with filters', () => {
  const mockCandidates: Partial<Investor>[] = [
    {
      firstName: 'John',
      lastName: 'Smith',
      description: 'Fintech investor focused on payments',
      location: 'New York',
      seniority: 'Partner',
      industries: 'FinTech,Payments',
      companyName: 'Acme Ventures',
      title: 'General Partner',
      linkedInUrl: 'https://linkedin.com/in/johnsmith',
    },
    {
      firstName: 'Jane',
      lastName: 'Doe',
      description: 'AI and ML specialist',
      location: 'San Francisco',
      seniority: 'Principal',
      industries: 'AI,Machine Learning',
      companyName: 'Tech Capital',
      title: 'Principal',
      linkedInUrl: 'https://linkedin.com/in/janedoe',
    },
  ];

  it('should include location and industry in prompt when filters are provided', () => {
    const prompt = buildRankingPrompt('Find fintech', mockCandidates, 10, {
      location: 'New York',
      seniority: 'Partner',
      industry: 'FinTech',
    });

    expect(prompt).toContain('New York');
    expect(prompt).toContain('FinTech');
    expect(prompt).toContain('Partner');
    expect(prompt).toContain('Filter signals');
  });

  it('should NOT contain Location preference when no filters provided', () => {
    const prompt = buildRankingPrompt('Find AI', mockCandidates, 10);

    expect(prompt).not.toContain('Location preference');
    expect(prompt).not.toContain('Filter signals');
    expect(prompt).toContain('IMPORTANT:'); // Ensure prompt structure is intact
  });

  it('should include partial filter signals when only some filters provided', () => {
    const prompt = buildRankingPrompt('Find fintech', mockCandidates, 10, {
      location: 'New York',
    });

    expect(prompt).toContain('New York');
    expect(prompt).not.toContain('Seniority preference');
    expect(prompt).not.toContain('Industry preference');
  });
});
