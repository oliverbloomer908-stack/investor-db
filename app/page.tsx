'use client';
import { useState } from 'react';
import ImportCSV from './components/ImportCSV';
import FilterPanel from './components/FilterPanel';
import QueryBox from './components/QueryBox';
import ResultsTable, { RankResult } from './components/ResultsTable';

export default function Home() {
  const [filters, setFilters] = useState({ location: '', seniority: '', industry: '', keyword: '' });
  const [results, setResults] = useState<RankResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [candidateCount, setCandidateCount] = useState<number | null>(null);

  async function handleQuery(query: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters, limit: 50 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ranking failed');
      setResults(data.results || []);
      setCandidateCount(data.candidateCount || null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(query: string) {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, filters, limit: 100 }),
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investors-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app">
      <div className="layout">
        <aside className="sidebar">
          <ImportCSV />
          <FilterPanel onSearch={setFilters} />
        </aside>

        <section className="main-content">
          <QueryBox onQuery={handleQuery} onExport={(query: string) => handleExport(query)} loading={loading} />
          {candidateCount !== null && (
            <p className="candidate-count">Ranking from {candidateCount} matching investors</p>
          )}
          <ResultsTable results={results} />
        </section>
      </div>
    </main>
  );
}