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

  const ml = result?.ml_model;
  const hasML = ml && ml.status === 'success';

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Data Engineering</span>
          <h1>Data Upload & ML Analysis</h1>
          <p className="page-subtitle">Upload your dataset — Python ML preprocessing runs first, AI summarizes the results.</p>
        </div>
      </div>

      {/* ── Upload Zone ──────────────────────────────────────────── */}
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

      {/* ── Results ──────────────────────────────────────────────── */}
      {result && (
        <div className="mt-4">
          <DataSourceNotice source={meta?.source} error={meta?.error} />

          {/* Profiling Overview */}
          <Card title="Dataset Profile" actions={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/data-explorer')}>Open in Data Explorer →</button>}>
            <div className="grid grid-4">
              <SummaryStat label="Rows" value={result.rows?.toLocaleString()} />
              <SummaryStat label="Columns" value={result.columns} />
              <SummaryStat label="Missing values" value={result.missing_values_total} />
              <SummaryStat label="Duplicate rows" value={result.duplicate_rows} />
            </div>

            {/* DB Ingestion status */}
            {result.ingestion && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-sunken)', borderRadius: 6, fontSize: 13 }}>
                <strong>Database Updated:</strong> {result.ingestion.products} products and {result.ingestion.transactions} transactions ingested into your dashboard.
                {result.ingestion.error && <span style={{ color: 'var(--color-error)', marginLeft: 8 }}>⚠ {result.ingestion.error}</span>}
              </div>
            )}
          </Card>

          {/* ML Model Results */}
          {hasML && (
            <Card title="ML Model Performance" className="mt-4">
              <div className="grid grid-4">
                <SummaryStat label="R² Score" value={ml.r2_score?.toFixed(4)} highlight={ml.r2_score > 0.7 ? 'good' : ml.r2_score > 0.4 ? 'warn' : 'bad'} />
                <SummaryStat label="MAE" value={ml.mae?.toFixed(2)} />
                <SummaryStat label="RMSE" value={ml.rmse?.toFixed(2)} />
                <SummaryStat label="Target Column" value={ml.target_column} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Trained on {ml.train_rows} rows, tested on {ml.test_rows} rows (RandomForestRegressor)
              </div>

              {/* Feature Importance */}
              {ml.feature_importance?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="section-title">Feature Importance — What drives {ml.target_column}?</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {ml.feature_importance.slice(0, 8).map((fi) => (
                      <div key={fi.feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 140, fontSize: 13, fontWeight: 500, flexShrink: 0, textAlign: 'right' }}>{fi.feature}</span>
                        <div style={{ flex: 1, height: 22, background: 'var(--bg-sunken)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            width: `${fi.importance_pct}%`,
                            height: '100%',
                            background: 'var(--accent)',
                            borderRadius: 4,
                            transition: 'width 0.5s ease',
                            minWidth: 2,
                          }} />
                        </div>
                        <span className="num" style={{ fontSize: 13, width: 50, textAlign: 'right' }}>{fi.importance_pct?.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {ml && ml.status === 'skipped' && (
            <Card title="ML Model" className="mt-4">
              <p className="text-sm text-muted">Model training skipped: {ml.reason}</p>
            </Card>
          )}

          {/* Top Correlations */}
          {result.top_correlations?.length > 0 && (
            <Card title="Top Correlations" className="mt-4">
              <div style={{ display: 'grid', gap: 6 }}>
                {result.top_correlations.slice(0, 6).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 13 }}>{c.feature_1} ↔ {c.feature_2}</span>
                    <span className="num" style={{
                      fontSize: 13, fontWeight: 600,
                      color: Math.abs(c.correlation) > 0.7 ? 'var(--color-success)' : Math.abs(c.correlation) > 0.4 ? 'var(--color-warning)' : 'var(--text-muted)'
                    }}>
                      {c.correlation?.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Category Breakdowns */}
          {result.category_breakdowns && Object.keys(result.category_breakdowns).length > 0 && (
            <Card title="Segment Breakdown" className="mt-4">
              {Object.entries(result.category_breakdowns).slice(0, 3).map(([catName, items]) => (
                <div key={catName} style={{ marginBottom: 16 }}>
                  <div className="section-title" style={{ marginBottom: 8 }}>By {catName}</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-strong)' }}>
                          <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>Segment</th>
                          <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>Total</th>
                          <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>Average</th>
                          <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.slice(0, 8).map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '6px 8px' }}>{item.category}</td>
                            <td className="num" style={{ textAlign: 'right', padding: '6px 8px' }}>{item.total?.toLocaleString()}</td>
                            <td className="num" style={{ textAlign: 'right', padding: '6px 8px' }}>{item.average?.toLocaleString()}</td>
                            <td className="num" style={{ textAlign: 'right', padding: '6px 8px' }}>{item.count?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* AI Executive Summary */}
          <Card title="AI Executive Summary" className="mt-4">
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
              Generated from ML metrics — not raw data
            </div>
            <p className="text-sm text-secondary" style={{ whiteSpace: 'pre-wrap' }}>{result.ai_summary || result.ollama_insight}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, highlight }) {
  const colorMap = {
    good: 'var(--color-success)',
    warn: 'var(--color-warning)',
    bad: 'var(--color-error)',
  };
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="num" style={{
        fontSize: 20,
        fontWeight: 600,
        marginTop: 4,
        color: highlight ? colorMap[highlight] : undefined,
      }}>{value}</div>
    </div>
  );
}
