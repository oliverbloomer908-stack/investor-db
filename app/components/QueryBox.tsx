'use client';
import { useState } from 'react';

interface QueryBoxProps {
  onQuery: (query: string) => Promise<void>;
  onExport: (query: string) => Promise<void>;
  loading: boolean;
}

export default function QueryBox({ onQuery, onExport, loading }: QueryBoxProps) {
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    await onQuery(query.trim());
  }

  async function handleExportClick() {
    setExporting(true);
    try {
      await onExport(query.trim());
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
        <button type="button" onClick={handleExportClick} disabled={exporting || !query.trim() || loading} className="export-btn">
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>
    </form>
  );
}