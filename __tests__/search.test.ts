import { describe, it, expect } from 'vitest';
import { buildSearchQuery } from '@/app/api/search/route';

describe('search', () => {
  it('builds a query with all filters', () => {
    const { sql, params } = buildSearchQuery({
      location: 'New York',
      seniority: 'Partner',
      industry: 'FinTech',
      keyword: 'fintech',
    });
    expect(sql).toContain('WHERE 1=1');
    expect(sql).toContain('location');
    expect(sql).toContain('seniority');
    expect(sql).toContain('industries');
    expect(params.length).toBeGreaterThan(0);
  });

  it('builds a query with only keyword', () => {
    const { sql, params } = buildSearchQuery({ keyword: 'fintech' });
    expect(sql).toContain('description');
    expect(params).toContain('%fintech%');
  });

  it('returns empty object for no filters', () => {
    const result = buildSearchQuery({});
    expect(result.sql).toBe('');
    expect(result.params).toEqual([]);
  });
});
