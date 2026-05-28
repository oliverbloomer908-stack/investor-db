'use client';
import { useState } from 'react';
import ImportCSV from './components/ImportCSV';
import DynamicFilters from './components/DynamicFilters';
import QueryBox from './components/QueryBox';
import ResultsTable, { RankResult } from './components/ResultsTable';

export default function Home() {
  const [filters, setFilters] = useState({ location: '', seniority: '', industry: '', keyword: '' });
  const [results, setResults] = useState<RankResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [candidateCount, setCandidateCount] = useState<number | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  async function handleQuery(query: string) {
    setLoading(true);
    setSelectedUrls(new Set());
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

  function handleSelectionChange(urls: Set<string>) {
    setSelectedUrls(urls);
  }

  function handleDelete(url: string) {
    if (!confirm('Delete this investor? This cannot be undone.')) return;
    setResults(results.filter(r => r.linkedInUrl !== url));
    setSelectedUrls(prev => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
  }

  function handleDeleteSelected() {
    if (!confirm(`Delete ${selectedUrls.size} selected investors? This cannot be undone.`)) return;
    setResults(results.filter(r => !selectedUrls.has(r.linkedInUrl)));
    setSelectedUrls(new Set());
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

  async function handleExportSelected() {
    const urls = Array.from(selectedUrls);
    if (urls.length === 0) return;
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedInUrls: urls }),
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
      alert(e.message || 'Export failed');
    }
  }

  return (
    <main className="app">
      <div className="layout">
        <aside className="sidebar">
          <ImportCSV />
          <DynamicFilters onSearch={setFilters} />
        </aside>

        <section className="main-content">
          <QueryBox onQuery={handleQuery} onExport={(query: string) => handleExport(query)} loading={loading} />
          {candidateCount !== null && (
            <p className="candidate-count">Ranking from {candidateCount} matching investors</p>
          )}
          <ResultsTable
            results={results}
            selectedUrls={selectedUrls}
            onSelectionChange={handleSelectionChange}
            onDelete={handleDelete}
            onDeleteSelected={handleDeleteSelected}
            onExportSelected={handleExportSelected}
            selectedCount={selectedUrls.size}
          />
        </section>
      </div>
    </main>
  );
}