'use client';

import { useState } from 'react';

export interface RankResult {
  rank: number;
  name: string;
  title: string;
  company: string;
  linkedInUrl: string;
  reason: string;
  score: number;
  firstName?: string;
  lastName?: string;
  description?: string;
  location?: string;
  seniority?: string;
  industries?: string;
  companyName?: string;
  companyDescription?: string;
  domain?: string;
  email?: string;
}

interface ResultsTableProps {
  results: RankResult[];
  selectedUrls: Set<string>;
  onSelectionChange: (urls: Set<string>) => void;
  onDelete: (linkedInUrl: string) => void;
  onDeleteSelected?: () => void;
  selectedCount?: number;
}

function DetailPanel({ result, onDelete, onClose }: { result: RankResult; onDelete: () => void; onClose: () => void }) {
  return (
    <tr className="detail-panel">
      <td colSpan={8}>
        <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <strong>Investor Details</strong>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onDelete} style={{ color: 'red', border: '1px solid red', padding: '4px 8px', background: 'white', cursor: 'pointer' }}>Delete</button>
              <button onClick={onClose} style={{ padding: '4px 8px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
            <div><dt>Name</dt><dd>{result.name}</dd></div>
            <div><dt>Title</dt><dd>{result.title}</dd></div>
            <div><dt>Company</dt><dd>{result.company}</dd></div>
            <div><dt>Location</dt><dd>{result.location || '-'}</dd></div>
            <div><dt>Seniority</dt><dd>{result.seniority || '-'}</dd></div>
            <div><dt>Industries</dt><dd>{result.industries || '-'}</dd></div>
            <div><dt>LinkedIn</dt><dd><a href={result.linkedInUrl} target="_blank">{result.linkedInUrl}</a></dd></div>
            <div><dt>Email</dt><dd>{result.email ? <a href={`mailto:${result.email}`}>{result.email}</a> : '-'}</dd></div>
            <div><dt>Domain</dt><dd>{result.domain ? <a href={result.domain} target="_blank">{result.domain}</a> : '-'}</dd></div>
            <div style={{ gridColumn: '1 / -1' }}><dt>Description</dt><dd>{result.description || '-'}</dd></div>
          </dl>
        </div>
      </td>
    </tr>
  );
}

function openLinkedIn(url: string) {
  window.open(url, '_blank');
}

export default function ResultsTable({ results, selectedUrls, onSelectionChange, onDelete, onDeleteSelected, selectedCount }: ResultsTableProps) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  function toggleSelect(url: string) {
    const next = new Set(selectedUrls);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    onSelectionChange(next);
  }

  function toggleSelectAll() {
    if (selectedUrls.size === results.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(results.map(r => r.linkedInUrl)));
    }
  }

  if (results.length === 0) return <p className="no-results">No results yet. Import a CSV and run a query.</p>;

  return (
    <div className="results-table">
      {selectedCount && selectedCount > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span>{selectedCount} selected</span>
          {onDeleteSelected && <button onClick={onDeleteSelected}>Delete Selected</button>}
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedUrls.size === results.length && results.length > 0}
                onChange={toggleSelectAll}
              />
            </th>
            <th>#</th>
            <th>Name</th>
            <th>Title</th>
            <th>Company</th>
            <th>Fit Reason</th>
            <th>Score</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => (
            <>
              <tr key={r.rank}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUrls.has(r.linkedInUrl)}
                    onChange={() => toggleSelect(r.linkedInUrl)}
                  />
                </td>
                <td>{r.rank}</td>
                <td>{r.name}</td>
                <td>{r.title}</td>
                <td>{r.company}</td>
                <td className="reason">{r.reason}</td>
                <td><span className="score-badge">{r.score}/10</span></td>
                <td>
                  <button onClick={() => setExpandedUrl(expandedUrl === r.linkedInUrl ? null : r.linkedInUrl)}>
                    {expandedUrl === r.linkedInUrl ? 'Hide' : 'View'}
                  </button>
                  <button onClick={() => openLinkedIn(r.linkedInUrl)} style={{ marginLeft: '4px' }}>LinkedIn</button>
                </td>
              </tr>
              {expandedUrl === r.linkedInUrl && (
                <DetailPanel
                  result={r}
                  onDelete={() => onDelete(r.linkedInUrl)}
                  onClose={() => setExpandedUrl(null)}
                />
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}