import React from 'react';
import '../../styles/auth.css';

const MODULES = [
  { num: '01', name: 'Quant Backtesting', desc: 'SMA crossover, t+1 execution, zero look-ahead bias.' },
  { num: '02', name: 'DataMart Analytics', desc: 'DuckDB aggregation and XGBoost 7-day revenue forecasts.' },
  { num: '03', name: 'Retail AI Assistant', desc: 'Structured retrieval, then optional Groq LLM polishing.' }
];

export default function AuthShell({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-side">
        <div>
          <div className="auth-side-brand">
            <div className="mark">EI</div>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Enterprise Intelligence Console</span>
          </div>
          <h1>One console for backtesting, analytics and retail AI.</h1>
          <p>
            PS-05 — Sustainability &amp; Smart Infrastructure. A single FastAPI-backed platform unifying
            quantitative strategy validation, DataMart analytics, and a structured-data-first retail assistant.
          </p>
          <div className="auth-modules">
            {MODULES.map((m) => (
              <div className="auth-module" key={m.num}>
                <div className="num num-label">{m.num}</div>
                <div className="name">{m.name}</div>
                <div className="desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-side-foot">FastAPI · PostgreSQL/SQLite · DuckDB · XGBoost · Groq · Ollama</div>
      </div>
      <div className="auth-form-side">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
}
