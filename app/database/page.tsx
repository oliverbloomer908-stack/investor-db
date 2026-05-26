import DatabaseTable from '@/app/components/DatabaseTable';

export default async function DatabasePage() {
  let count = 0;
  let investorsEmpty = true;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/investors?limit=1&offset=0`);
    if (res.ok) {
      const data = await res.json();
      count = data.total ?? 0;
      investorsEmpty = !data.investors || data.investors.length === 0;
    }
  } catch (err) {
    console.error('Failed to fetch investor count:', err);
    investorsEmpty = true;
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      {investorsEmpty && count === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#888' }}>
          <p>No investors yet. Go to <a href="/search" style={{ color: '#1a1a2e' }}>Search</a> to import a CSV.</p>
        </div>
      ) : (
        <DatabaseTable />
      )}
    </div>
  );
}