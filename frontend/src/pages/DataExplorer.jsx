import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/common/Card.jsx';
import { EmptyBlock, DataSourceNotice } from '../components/common/States.jsx';
import { loadDatasetAnalysis } from '../utils/datasetStore.js';
import { mockUploadAnalysis } from '../api/mock/mockData.js';

export default function DataExplorer() {
  const [dataset, setDataset] = useState(null);

  useEffect(() => {
    setDataset(loadDatasetAnalysis());
  }, []);

  function loadSample() {
    setDataset({ ...mockUploadAnalysis, _source: 'mock', _error: 'sample dataset — no file uploaded yet' });
  }

  if (!dataset) {
    return (
      <div>
        <PageHeader />
        <Card>
          <EmptyBlock
            title="No dataset explored yet"
            message="Upload a CSV or XLSX file to see schema, row and column counts, missing values, duplicates and statistics here."
            action={
              <div className="flex gap-2 mt-2">
                <Link to="/upload" className="btn btn-primary btn-sm">Upload dataset</Link>
                <button className="btn btn-secondary btn-sm" onClick={loadSample}>View sample dataset</button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader filename={dataset.filename} />
      <DataSourceNotice source={dataset._source} error={dataset._error} />

      <div className="grid grid-4 mb-3">
        <StatBlock label="Rows" value={dataset.rows.toLocaleString()} />
        <StatBlock label="Columns" value={dataset.columns} />
        <StatBlock label="Missing values" value={dataset.missing_values_total} />
        <StatBlock label="Duplicate rows" value={dataset.duplicate_rows} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
        <Card title="Schema">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Column</th><th>Type</th><th className="table-numeric">Missing</th></tr></thead>
              <tbody>
                {dataset.schema.map((c) => (
                  <tr key={c.column}>
                    <td className="num">{c.column}</td>
                    <td><span className="badge badge-neutral">{c.dtype}</span></td>
                    <td className="table-numeric">{c.missing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Numeric statistics">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Column</th><th className="table-numeric">Mean</th><th className="table-numeric">Std</th><th className="table-numeric">Min</th><th className="table-numeric">Max</th></tr></thead>
              <tbody>
                {dataset.numeric_summary.map((s) => (
                  <tr key={s.column}>
                    <td className="num">{s.column}</td>
                    <td className="table-numeric">{s.mean}</td>
                    <td className="table-numeric">{s.std}</td>
                    <td className="table-numeric">{s.min}</td>
                    <td className="table-numeric">{s.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Row preview" subtitle={`First ${dataset.preview.length} rows`} className="mt-4">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{Object.keys(dataset.preview[0]).map((k) => <th key={k}>{k}</th>)}</tr>
            </thead>
            <tbody>
              {dataset.preview.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((v, j) => <td key={j} className={typeof v === 'number' ? 'table-numeric num' : ''}>{String(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {dataset.ollama_insight && (
        <Card title="Ollama insight" className="mt-4">
          <p className="text-sm text-secondary">{dataset.ollama_insight}</p>
        </Card>
      )}
    </div>
  );
}

function PageHeader({ filename }) {
  return (
    <div className="page-header">
      <div>
        <span className="page-eyebrow">Data Engineering</span>
        <h1>Data Explorer</h1>
        <p className="page-subtitle">{filename ? `Exploring ${filename}` : 'Schema, quality and statistics for your most recently analyzed dataset.'}</p>
      </div>
      <div className="page-header-actions">
        <Link to="/upload" className="btn btn-secondary">Upload another file</Link>
      </div>
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ fontSize: 22 }}>{value}</span>
    </div>
  );
}
