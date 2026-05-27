'use client';
import { useState } from 'react';

interface QueryBoxProps {
  onQuery: (query: string) => Promise<void>;
  loading: boolean;
}

export default function QueryBox({ onQuery, loading }: QueryBoxProps) {
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    await onQuery(query.trim());
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters: {}, limit: 100 }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investors-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <form className="query-box" onSubmit={handleSubmit}>
      <h3>AI Ranking Query</h3>
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder='e.g. "fintech investors in the US who write $50K-$250K checks and have backed similar deals recently"'
        rows={3}
        disabled={loading}
      />
      <div className="query-actions">
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? 'Ranking...' : 'Rank Investors'}
        </button>
        <button type="button" onClick={handleExport} disabled={exporting || !query.trim()} className="export-btn">
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>
    </form>
  );
}