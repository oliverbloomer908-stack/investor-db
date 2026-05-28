import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = {
  prepare: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({ rowCount: 0 }),
  }),
};
vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}));

describe('DELETE /api/investors/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes investor by id and returns deleted: true', async () => {
    mockDb.prepare.mockReturnValueOnce({
      run: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });

    const { DELETE } = await import('@/app/api/investors/[id]/route');
    const req = new Request('http://localhost/api/investors/123', {
      method: 'DELETE',
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: '123' }) });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
  });

  it('returns 404 when investor not found', async () => {
    mockDb.prepare.mockReturnValueOnce({
      run: vi.fn().mockResolvedValue({ rowCount: 0 }),
    });

    const { DELETE } = await import('@/app/api/investors/[id]/route');
    const req = new Request('http://localhost/api/investors/999', {
      method: 'DELETE',
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: '999' }) });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Investor not found' });
  });
});
