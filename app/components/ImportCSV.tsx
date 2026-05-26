'use client';
import { useState } from 'react';

export default function ImportCSV() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setImporting(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="import-panel">
      <h3>Import CSV</h3>
      <input
        type="file"
        accept=".csv"
        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={importing}
      />
      {importing && <p>Importing...</p>}
      {result && (
        <div className="import-result">
          <p>✓ Imported {result.imported} of {result.total} investors</p>
          {result.unmappedColumns?.length > 0 && (
            <p className="warning">Unmapped columns: {result.unmappedColumns.join(', ')}</p>
          )}
        </div>
      )}
      {error && <p className="error">Error: {error}</p>}
    </div>
  );
}