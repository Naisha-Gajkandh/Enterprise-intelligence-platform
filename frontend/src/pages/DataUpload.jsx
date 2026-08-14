import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card.jsx';
import { DataSourceNotice, ErrorBlock } from '../components/common/States.jsx';
import { analyzeDataset } from '../api/upload.js';
import { saveDatasetAnalysis } from '../utils/datasetStore.js';

const ACCEPTED = ['.csv', '.xlsx', '.xls'];

export default function DataUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({ state: 'idle', error: null });
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);

  const pickFile = useCallback((f) => {
    if (!f) return;
    const ext = `.${f.name.split('.').pop().toLowerCase()}`;
    if (!ACCEPTED.includes(ext)) {
      setStatus({ state: 'idle', error: `Unsupported file type ${ext}. Upload a CSV or XLSX file.` });
      return;
    }
    setFile(f);
    setStatus({ state: 'idle', error: null });
    setResult(null);
  }, []);

  async function handleAnalyze() {
    if (!file) return;
    setStatus({ state: 'uploading', error: null });
    setProgress(0);
    try {
      const { data, source, error } = await analyzeDataset(file, setProgress);
      setResult(data);
      setMeta({ source, error });
      saveDatasetAnalysis({ ...data, _source: source, _error: error });
      setStatus({ state: 'done', error: null });
    } catch (err) {
      setStatus({ state: 'idle', error: err.message });
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Data Engineering</span>
          <h1>Data Upload</h1>
          <p className="page-subtitle">POST /api/v1/upload/analyze — dataset profiling summarized by a local Ollama model.</p>
        </div>
      </div>

      <Card>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          style={{
            border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
            borderRadius: 6,
            padding: '36px 20px',
            textAlign: 'center',
            background: dragOver ? 'var(--accent-soft)' : 'var(--bg-sunken)'
          }}
        >
          <p style={{ fontWeight: 600, fontSize: 14 }}>Drag a CSV or XLSX file here</p>
          <p className="text-muted text-sm mt-2">or</p>
          <label className="btn btn-secondary btn-sm mt-2" style={{ display: 'inline-flex', cursor: 'pointer' }}>
            Browse files
            <input type="file" accept={ACCEPTED.join(',')} hidden onChange={(e) => pickFile(e.target.files?.[0])} />
          </label>
          {file && <p className="text-sm mt-3 num">{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
        </div>

        {status.error && <ErrorBlock message={status.error} />}

        <div className="flex justify-between items-center mt-4">
          <span className="text-xs text-muted">Accepted formats: {ACCEPTED.join(', ')}</span>
          <button className="btn btn-primary" disabled={!file || status.state === 'uploading'} onClick={handleAnalyze}>
            {status.state === 'uploading' ? `Analyzing… ${progress}%` : 'Analyze dataset'}
          </button>
        </div>
        {status.state === 'uploading' && (
          <div style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s ease' }} />
          </div>
        )}
      </Card>

      {result && (
        <div className="mt-4">
          <DataSourceNotice source={meta?.source} error={meta?.error} />
          <Card title="Analysis complete" actions={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/data-explorer')}>Open in Data Explorer →</button>}>
            <div className="grid grid-4">
              <SummaryStat label="Rows" value={result.rows.toLocaleString()} />
              <SummaryStat label="Columns" value={result.columns} />
              <SummaryStat label="Missing values" value={result.missing_values_total} />
              <SummaryStat label="Duplicate rows" value={result.duplicate_rows} />
            </div>
            <div className="divider" />
            <div className="section-title">Ollama data insight</div>
            <p className="text-sm text-secondary">{result.ollama_insight}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="num" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}
