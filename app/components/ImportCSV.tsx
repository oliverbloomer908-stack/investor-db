'use client';
import { useState, useRef } from 'react';

const INVESTOR_FIELDS = [
  { value: '', label: '— skip —' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'linkedInUrl', label: 'LinkedIn URL' },
  { value: 'title', label: 'Title' },
  { value: 'companyName', label: 'Company' },
  { value: 'description', label: 'Description' },
  { value: 'location', label: 'Location' },
  { value: 'seniority', label: 'Seniority' },
  { value: 'industries', label: 'Industries' },
  { value: 'companyDescription', label: 'Company Description' },
  { value: 'domain', label: 'Domain' },
  { value: 'email', label: 'Email' },
];

export default function ImportCSV() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ deleted: number } | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [unmappedCols, setUnmappedCols] = useState<string[]>([]);
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(file: File) {
    // First, detect columns without importing
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/import/debug', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to preview file');

      if (data.unmappedColumns?.length > 0) {
        // Show mapper with unmapped columns
        setPendingFile(file);
        setUnmappedCols(data.unmappedColumns);
        setManualMappings({});
        setShowMapper(true);
      } else {
        // No unmapped columns — import directly
        await doImport(file, {});
      }
    } catch (e: any) {
      setErrors(prev => [...prev, `Preview failed: ${e.message}`]);
    }
  }

  async function doImport(file: File, mappings: Record<string, string>) {
    setImporting(true);
    setErrors([]);
    setDeleteResult(null);
    setShowMapper(false);
    setPendingFile(null);

    const fd = new FormData();
    fd.append('file', file);
    if (Object.keys(mappings).length > 0) {
      fd.append('columnMappings', JSON.stringify(mappings));
    }

    try {
      const res = await fetch('/api/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult({
        imported: data.imported,
        total: data.total,
        unmappedColumns: data.unmappedColumns,
      });
    } catch (e: any) {
      setErrors(prev => [...prev, `${file.name}: ${e.message}`]);
    } finally {
      setImporting(false);
    }
  }

  function handleMapperSubmit() {
    if (!pendingFile) return;
    // Filter out empty (skip) mappings
    const activeMappings: Record<string, string> = {};
    for (const [col, field] of Object.entries(manualMappings)) {
      if (field) activeMappings[col] = field;
    }
    doImport(pendingFile, activeMappings);
  }

  function handleMapperClose() {
    setShowMapper(false);
    setPendingFile(null);
    setUnmappedCols([]);
    setManualMappings({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="import-panel">
      <h3>Import CSV</h3>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        multiple
        onChange={e => {
          const files = e.target.files;
          if (!files?.length) return;
          // For simplicity: process first file
          handleFileSelect(files[0]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
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

      {deleteResult && <p>Deleted {deleteResult.deleted} investors.</p>}

      <button
        onClick={() => {
          if (!confirm('Delete ALL investors? This cannot be undone.')) return;
          setErrors([]);
          setDeleteResult(null);
          setDeleting(true);
          fetch('/api/investors', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
            .then(r => r.json())
            .then(data => {
              if (!data.error) setDeleteResult({ deleted: data.deleted });
              else setErrors(prev => [...prev, `Delete failed: ${data.error}`]);
            })
            .catch((e: any) => setErrors(prev => [...prev, `Delete failed: ${e.message}`]))
            .finally(() => setDeleting(false));
        }}
        disabled={deleting}
        style={{ marginTop: '8px', padding: '6px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {deleting ? 'Deleting...' : 'Delete All Investors'}
      </button>

      {/* Manual Column Mapper Modal */}
      {showMapper && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '24px',
            width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ marginTop: 0, fontSize: '18px' }}>Map Columns</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
              These columns weren't auto-detected. Select which investor field each should map to:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {unmappedCols.map(col => (
                <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#333' }}>
                    {col}
                  </span>
                  <select
                    value={manualMappings[col] || ''}
                    onChange={e => setManualMappings(prev => ({ ...prev, [col]: e.target.value }))}
                    style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
                  >
                    {INVESTOR_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleMapperClose}
                style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px', background: '#f5f5f5', cursor: 'pointer', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleMapperSubmit}
                style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#0070f3', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
              >
                Import with Mappings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
