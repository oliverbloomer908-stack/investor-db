import DatabaseTable from '@/app/components/DatabaseTable';
import { getDb } from '@/lib/db';

export default async function DatabasePage() {
  let investorsEmpty = true;
  try {
    const db = getDb();
    const row = await db.prepare('SELECT COUNT(*) as c FROM investors').get() as any;
    investorsEmpty = (row?.c ?? 0) === 0;
  } catch (err) {
    console.error('Failed to fetch investor count:', err);
    investorsEmpty = true;
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      {investorsEmpty ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>
          <p>No investors yet. Go to <a href="/search" style={{ color: '#1a1a2e' }}>Search</a> to import a CSV.</p>
        </div>
      ) : (
        <DatabaseTable />
      )}
    </div>
  );
}
