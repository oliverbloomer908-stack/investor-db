'use client';
import { useState } from 'react';

export default function ImportCSV() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleUpload(files: File[]) {
    setImporting(true);
    setErrors([]);
    let totalImported = 0;
    let totalRows = 0;
    const allUnmapped: string[] = [];

    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/import', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Import failed');
        totalImported += data.imported;
        totalRows += data.total;
        if (data.unmappedColumns?.length > 0) {
          allUnmapped.push(...data.unmappedColumns);
        }
      } catch (e: any) {
        // Continue to next file instead of stopping
        setErrors(prev => [...prev, `${file.name}: ${e.message}`]);
      }
    }

    setImporting(false);
    if (totalRows > 0) {
      setResult({ imported: totalImported, total: totalRows, unmappedColumns: allUnmapped });
    }
  }

  return (
    <div className="import-panel">
      <h3>Import CSV</h3>
      <input
        type="file"
        accept=".csv"
        multiple
        onChange={e => e.target.files?.length && handleUpload(Array.from(e.target.files))}
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
      {errors.map((err, i) => (
        <p key={i} className="error" style={{ fontSize: '12px' }}>Error: {err}</p>
      ))}
    </div>
  );
}
