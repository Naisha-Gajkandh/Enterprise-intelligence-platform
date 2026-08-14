import React from 'react';

export function Card({ title, subtitle, actions, children, className = '', bodyClassName = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <div className="card-header-sub">{subtitle}</div>}
          </div>
          {actions && <div className="flex gap-2 items-center">{actions}</div>}
        </div>
      )}
      <div className={`card-body ${bodyClassName}`}>{children}</div>
    </div>
  );
}

export function StatCard({ label, value, delta, deltaDirection, caption, prefix = '', suffix = '' }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {prefix}
        {value}
        {suffix}
      </span>
      {(delta !== undefined || caption) && (
        <div className="stat-meta">
          {delta !== undefined && (
            <span className={`stat-delta ${deltaDirection === 'down' ? 'down' : 'up'}`}>
              {deltaDirection === 'down' ? '▼' : '▲'} {delta}
            </span>
          )}
          {caption && <span className="stat-caption">{caption}</span>}
        </div>
      )}
    </div>
  );
}
