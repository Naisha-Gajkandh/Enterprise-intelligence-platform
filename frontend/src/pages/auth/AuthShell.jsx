import React from 'react';
import '../../styles/auth.css';

const MODULES = [
  { name: 'Quant Backtesting' },
  { name: 'DataMart Analytics' },
  { name: 'Retail AI Assistant' }
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

        {/* Headline + module chips */}
        <div className="auth-side-body">
          <h1>One console for backtesting, analytics and retail AI.</h1>

          <div className="auth-modules">
            {MODULES.map((m) => (
              <div className="auth-module" key={m.name}>
                <div className="name">{m.name}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="auth-form-side">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
}
