import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = {
  prepare: vi.fn().mockReturnValue({
    run: vi.fn(),
  }),
};
vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}));

describe('DELETE /api/investors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes by linkedInUrls', async () => {
    mockDb.prepare.mockReturnValueOnce({
      run: vi.fn().mockResolvedValue({ rowCount: 3 }),
    });

    const { DELETE } = await import('@/app/api/investors/route');
    const req = new Request('http://localhost/api/investors', {
      method: 'DELETE',
      body: JSON.stringify({ linkedInUrls: ['url1', 'url2', 'url3'] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 3 });
  });

  it('deletes all when body empty', async () => {
    mockDb.prepare.mockReturnValueOnce({
      run: vi.fn().mockResolvedValue({ rowCount: 50 }),
    });

    const { DELETE } = await import('@/app/api/investors/route');
    const req = new Request('http://localhost/api/investors', {
      method: 'DELETE',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 50 });
  });

  it('returns 400 when ids is empty array', async () => {
    const { DELETE } = await import('@/app/api/investors/route');
    const req = new Request('http://localhost/api/investors', {
      method: 'DELETE',
      body: JSON.stringify({ ids: [] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Provide ids[], linkedInUrls[], or empty body to delete all" });
  });

  it('deletes by ids', async () => {
    mockDb.prepare.mockReturnValueOnce({
      run: vi.fn().mockResolvedValue({ rowCount: 2 }),
    });

    const { DELETE } = await import('@/app/api/investors/route');
    const req = new Request('http://localhost/api/investors', {
      method: 'DELETE',
      body: JSON.stringify({ ids: [1, 2] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 2 });
  });
});