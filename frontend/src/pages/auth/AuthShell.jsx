import React from 'react';
import '../../styles/auth.css';

const MODULES = [
  { num: '01', name: 'Quant Backtesting', desc: 'SMA crossover · t+1 execution · zero look-ahead bias.' },
  { num: '02', name: 'DataMart Analytics', desc: 'DuckDB vectorized aggregation · XGBoost 7-day forecasting.' },
  { num: '03', name: 'Retail AI Assistant', desc: 'Structured retrieval, then optional Groq LLM polishing.' }
];

export default function AuthShell({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-side">
        {/* Brand */}
        <div className="auth-side-brand">
          <div className="mark">EI</div>
          <span>Enterprise Intelligence Console</span>
        </div>

        {/* Editorial body */}
        <div className="auth-side-body">
          <h1>One console for backtesting, analytics and retail AI.</h1>
          <p className="auth-side-sub">
            A single FastAPI-backed platform unifying quantitative strategy validation,
            DuckDB analytics, and a structured-data-first retail intelligence assistant.
          </p>
          <div className="auth-modules">
            {MODULES.map((m) => (
              <div className="auth-module" key={m.num}>
                <div className="num">{m.num}</div>
                <div className="name">{m.name}</div>
                <div className="desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack footer */}
        <div className="auth-side-foot">
          FastAPI · PostgreSQL / SQLite · DuckDB · XGBoost · Groq · Ollama
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
}
