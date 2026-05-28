import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the db module
const mockDb = {
  prepare: vi.fn().mockReturnValue({
    all: vi.fn(),
    get: vi.fn(),
    run: vi.fn(),
  }),
};
vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}));

describe('GET /api/investors/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns top 10 locations, seniorities, industries', async () => {
    // Setup mock responses for each query
    mockDb.prepare
      .mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([
          { location: 'New York, NY', cnt: 5 },
          { location: 'San Francisco, CA', cnt: 4 },
          { location: 'London, UK', cnt: 3 },
        ]),
      })
      .mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([
          { seniority: 'Partner', cnt: 6 },
          { seniority: 'Managing Director', cnt: 3 },
        ]),
      })
      .mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([
          { industry: 'FinTech', cnt: 7 },
          { industry: 'Venture Capital', cnt: 4 },
          { industry: 'AI/ML', cnt: 2 },
        ]),
      });

    const { GET } = await import('@/app/api/investors/stats/route');
    const req = new Request('http://localhost/api/investors/stats');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.locations).toEqual(['New York, NY', 'San Francisco, CA', 'London, UK']);
    expect(json.seniorities).toEqual(['Partner', 'Managing Director']);
    expect(json.industries).toEqual(['FinTech', 'Venture Capital', 'AI/ML']);
  });

  it('returns empty arrays when no investors exist', async () => {
    mockDb.prepare
      .mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([]),
      })
      .mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([]),
      })
      .mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([]),
      });

    const { GET } = await import('@/app/api/investors/stats/route');
    const req = new Request('http://localhost/api/investors/stats');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.locations).toEqual([]);
    expect(json.seniorities).toEqual([]);
    expect(json.industries).toEqual([]);
  });
});
