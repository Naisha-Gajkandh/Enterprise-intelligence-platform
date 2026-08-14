import React, { useEffect, useState } from 'react';
import { Card } from '../components/common/Card.jsx';
import { LoadingBlock, ErrorBlock } from '../components/common/States.jsx';
import StatusPill from '../components/common/StatusPill.jsx';
import { fetchSystemHealth } from '../api/health.js';

const DESCRIPTIONS = {
  fastapi: 'API gateway — CORS, JWT auth guard and the global exception envelope.',
  database: 'SQLAlchemy 2.0 ORM against PostgreSQL (production) or SQLite (development).',
  duckdb: 'Vectorized SQL aggregation directly over in-memory Pandas DataFrames.',
  xgboost: 'XGBRegressor trained on calendar and lag features for the 7-day forecast.',
  groq: 'Optional conversational polish for the Retail Assistant via llama-3.3-70b-versatile.',
  ollama: 'Local llama3.2:3b instance summarizing uploaded dataset statistics.'
};

export default function SystemHealth() {
  const [state, setState] = useState({ loading: true, error: null });
  const [health, setHealth] = useState(null);

  async function load() {
    setState({ loading: true, error: null });
    try {
      const { data, source, error } = await fetchSystemHealth();
      setHealth(data);
      setState({ loading: false, error: null, source, errorNote: error });
    } catch (err) {
      setState({ loading: false, error: err.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Platform</span>
          <h1>System Health</h1>
          <p className="page-subtitle">Live status of the gateway and each downstream engine the platform depends on.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load}>Re-check now</button>
        </div>
      </div>

      {state.loading && <Card><LoadingBlock label="Probing services…" /></Card>}
      {state.error && <Card><ErrorBlock message={state.error} onRetry={load} /></Card>}

      {!state.loading && !state.error && health && (
        <>
          {state.source !== 'live' && (
            <div className="badge badge-warning mb-3">
              <span className="badge-dot" /> {state.errorNote}
            </div>
          )}
          <div className="grid grid-3">
            {health.services.map((s) => (
              <Card key={s.key}>
                <div className="flex justify-between items-start mb-2">
                  <h3 style={{ fontSize: 14 }}>{s.name}</h3>
                  <StatusPill status={s.status} />
                </div>
                <p className="text-secondary text-sm">{DESCRIPTIONS[s.key]}</p>
                <div className="divider" style={{ margin: '12px 0' }} />
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Latency</span>
                  <span className="num">{s.latency_ms !== null ? `${s.latency_ms} ms` : '—'}</span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-muted">Detail</span>
                  <span style={{ textAlign: 'right', maxWidth: '65%' }}>{s.detail}</span>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">Last checked {new Date(health.checked_at).toLocaleString()}</p>
        </>
      )}
    </div>
  );
}
