'use client';

import { useEffect, useState } from 'react';
import { Investor } from '@/types';
import InvestorDetail from './InvestorDetail';

const LIMIT = 50;

export default function DatabaseTable() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);

  useEffect(() => {
    const offset = page * LIMIT;
    fetch(`/api/investors?limit=${LIMIT}&offset=${offset}`)
      .then(r => r.json())
      .then(data => {
        setInvestors(data.investors || []);
        setTotal(data.total || 0);
      });
  }, [page]);

  function handlePrev() {
    setPage(p => Math.max(0, p - 1));
  }

  function handleNext() {
    setPage(p => p + 1);
  }

  function closeDetail() {
    setSelectedInvestor(null);
  }

  const filtered = investors.filter(inv => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (inv.firstName + ' ' + inv.lastName).toLowerCase().includes(s) ||
      (inv.title || '').toLowerCase().includes(s) ||
      (inv.companyName || '').toLowerCase().includes(s) ||
      (inv.location || '').toLowerCase().includes(s)
    );
  });

  return (
    <>
      <div className="db-search">
        <input
          type="text"
          placeholder="Search by name, title, company, or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="db-empty">No investors in the database yet.</div>
      ) : (
        <>
          <div className="db-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Seniority</th>
                  <th>LinkedIn</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} onClick={() => setSelectedInvestor(inv)} style={{ cursor: 'pointer' }}>
                    <td>{inv.firstName} {inv.lastName}</td>
                    <td>{inv.title || '—'}</td>
                    <td>{inv.companyName || '—'}</td>
                    <td>{inv.location || '—'}</td>
                    <td>{inv.seniority || '—'}</td>
                    <td>
                      <button onClick={e => { e.stopPropagation(); window.open(inv.linkedInUrl, '_blank'); }}>
                        Link
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="db-pagination">
            <button onClick={handlePrev} disabled={page === 0}>Previous {LIMIT}</button>
            <span style={{ fontSize: '13px', color: '#666' }}>
              Showing {page * LIMIT + 1}–{Math.min(page * LIMIT + filtered.length, total)} of {total}
            </span>
            <button onClick={handleNext} disabled={(page + 1) * LIMIT >= total}>Next {LIMIT}</button>
          </div>
        </>
      )}

      <InvestorDetail investor={selectedInvestor} onClose={closeDetail} />
    </>
  );
}