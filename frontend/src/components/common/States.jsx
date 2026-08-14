import React from 'react';

export function LoadingBlock({ label = 'Loading data…', rows = 3 }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <div className="flex-col gap-2 w-full" style={{ maxWidth: 420 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 14, width: `${92 - i * 14}%` }} />
        ))}
      </div>
      <p style={{ marginTop: 12 }}>{label}</p>
    </div>
  );
}

export function CardSkeleton({ height = 96 }) {
  return <div className="skeleton" style={{ height, width: '100%', borderRadius: 5 }} />;
}

export function ErrorBlock({ title = 'Could not load this data', message, onRetry }) {
  return (
    <div className="state-block" role="alert">
      <div className="state-icon">⚠</div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {onRetry && (
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="state-block">
      <div className="state-icon">○</div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function DataSourceNotice({ source, error }) {
  if (source === 'live') return null;
  return (
    <div className="badge badge-warning" style={{ marginBottom: 16 }}>
      <span className="badge-dot" />
      Showing demo data — {error || 'backend unavailable'}
    </div>
  );
}
