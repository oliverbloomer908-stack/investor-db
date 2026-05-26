'use client';
import { useState } from 'react';

interface FilterPanelProps {
  onSearch: (filters: { location: string; seniority: string; industry: string; keyword: string }) => void;
}

const SENIORITY_OPTIONS = ['', 'Founder', 'C-Level', 'Partner', 'Director', 'VP', 'Manager'];

export default function FilterPanel({ onSearch }: FilterPanelProps) {
  const [location, setLocation] = useState('');
  const [seniority, setSeniority] = useState('');
  const [industry, setIndustry] = useState('');
  const [keyword, setKeyword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({ location, seniority, industry, keyword });
  }

  return (
    <form className="filter-panel" onSubmit={handleSubmit}>
      <h3>Filters</h3>
      <label>Location</label>
      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="New York, USA" />

      <label>Seniority</label>
      <select value={seniority} onChange={e => setSeniority(e.target.value)}>
        {SENIORITY_OPTIONS.map(s => <option key={s} value={s}>{s || 'Any'}</option>)}
      </select>

      <label>Industry</label>
      <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="FinTech, Venture Capital" />

      <label>Keyword</label>
      <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="fintech, healthcare..." />

      <button type="submit">Search</button>
    </form>
  );
}