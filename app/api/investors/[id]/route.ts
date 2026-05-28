import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const result = await db.prepare('DELETE FROM investors WHERE id = $1').run(id);

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error(`DELETE /api/investors/[id] error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
