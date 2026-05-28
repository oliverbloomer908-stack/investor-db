import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the db module
const mockDb = {
  prepare: vi.fn().mockReturnValue({
    all: vi.fn(),
    run: vi.fn(),
  }),
};
vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}));

// Mock the ranking and minimax modules to avoid AI calls
vi.mock('@/lib/ranking', () => ({
  buildRankingPrompt: vi.fn().mockReturnValue('mock prompt'),
}));
vi.mock('@/lib/minimax', () => ({
  chatCompletion: vi.fn().mockResolvedValue('[]'),
}));

describe('POST /api/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports directly when linkedInUrls is provided (no ranking)', async () => {
    const mockInvestors = [
      {
        linkedInUrl: 'https://linkedin.com/in/john',
        firstName: 'John',
        lastName: 'Doe',
        description: 'VC at Acme',
        location: 'New York, NY',
        seniority: 'Partner',
        title: 'General Partner',
        industries: 'FinTech,AI',
        companyName: 'Acme Ventures',
        companyDescription: 'Early stage VC',
        domain: 'acme.vc',
        email: 'john@acme.vc',
      },
    ];

    mockDb.prepare.mockReturnValueOnce({
      all: vi.fn().mockResolvedValue(mockInvestors),
    });

    const { POST } = await import('@/app/api/export/route');
    const req = new Request('http://localhost/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedInUrls: ['https://linkedin.com/in/john'] }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');

    const csv = await res.text();
    // Should have header + 1 data row
    const lines = csv.split('\n');
    expect(lines[0]).toBe('linkedInUrl,firstName,lastName,title,company,location,industries,description,domain,email');
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('https://linkedin.com/in/john');
    expect(lines[1]).toContain('John');
    expect(lines[1]).toContain('Doe');
  });

  it('returns 400 when linkedInUrls is empty array', async () => {
    const { POST } = await import('@/app/api/export/route');
    const req = new Request('http://localhost/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedInUrls: [] }),
    });
    const res = await POST(req);

    // Empty linkedInUrls should fall through to ranking flow which requires query
    expect(res.status).toBe(400);
  });

  it('uses ranking flow when linkedInUrls is not provided', async () => {
    const mockInvestors = [
      {
        linkedInUrl: 'https://linkedin.com/in/john',
        firstName: 'John',
        lastName: 'Doe',
        description: 'VC at Acme',
        location: 'New York, NY',
        seniority: 'Partner',
        title: 'General Partner',
        industries: 'FinTech,AI',
        companyName: 'Acme Ventures',
        companyDescription: 'Early stage VC',
        domain: 'acme.vc',
        email: 'john@acme.vc',
      },
    ];

    // First call for candidates query
    mockDb.prepare.mockReturnValueOnce({
      all: vi.fn().mockResolvedValue(mockInvestors),
    });

    const { POST } = await import('@/app/api/export/route');
    const req = new Request('http://localhost/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'fintech investors', limit: 10 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    const csv = await res.text();
    // Ranking flow includes rank,name,title,company,location,linkedInUrl,industries,reason,score
    const lines = csv.split('\n');
    expect(lines[0]).toBe('rank,name,title,company,location,linkedInUrl,industries,reason,score');
  });
});