'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

interface DynamicFiltersProps {
  onSearch: (filters: { location: string; seniority: string; industry: string; keyword: string }) => void;
}

interface FilterOptions {
  locations: string[];
  seniorities: string[];
  industries: string[];
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  filterKey: string;
}

function SearchableSelect({ value, onChange, options, placeholder, filterKey }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setSearch('');
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  function handleSelect(opt: string) {
    onChange(opt);
    setIsOpen(false);
    setSearch('');
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange(newValue);
    setIsOpen(true);
  }

  function handleFocus() {
    setIsOpen(true);
    setSearch(value);
  }

  const dropdownId = `dropdown-${filterKey}`;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={dropdownId}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          fontSize: '13px',
        }}
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul
          id={dropdownId}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '6px',
            marginTop: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 100,
            listStyle: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {filteredOptions.map(opt => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              onClick={() => handleSelect(opt)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                background: opt === value ? '#f0f0f0' : 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = opt === value ? '#f0f0f0' : 'transparent')}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DynamicFilters({ onSearch }: DynamicFiltersProps) {
  const [filters, setFilters] = useState({ location: '', seniority: '', industry: '', keyword: '' });
  const [options, setOptions] = useState<FilterOptions>({ locations: [], seniorities: [], industries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/investors/stats');
        if (res.ok) {
          const data = await res.json();
          setOptions({
            locations: data.locations || [],
            seniorities: data.seniorities || [],
            industries: data.industries || [],
          });
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(filters);
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginBottom: '32px',
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Filters</h3>

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Location</label>
            <SearchableSelect
              value={filters.location}
              onChange={v => updateFilter('location', v)}
              options={options.locations}
              placeholder="Select location"
              filterKey="location"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Seniority</label>
            <SearchableSelect
              value={filters.seniority}
              onChange={v => updateFilter('seniority', v)}
              options={options.seniorities}
              placeholder="Select seniority"
              filterKey="seniority"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Industry</label>
            <SearchableSelect
              value={filters.industry}
              onChange={v => updateFilter('industry', v)}
              options={options.industries}
              placeholder="Select industry"
              filterKey="industry"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Keyword</label>
            <input
              type="text"
              value={filters.keyword}
              onChange={e => updateFilter('keyword', e.target.value)}
              placeholder="Keyword"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            />
          </div>
        </div>
      )}

      {loading && (
        <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', padding: '20px' }}>
          Loading filter options...
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: '16px',
          width: '100%',
          padding: '10px',
          background: loading ? '#ccc' : '#1a1a2e',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '13px',
        }}
      >
        Search
      </button>
    </form>
  );
}