import React from 'react';

const MAP = {
  operational: { cls: 'badge-positive', label: 'Operational' },
  degraded: { cls: 'badge-warning', label: 'Degraded' },
  unreachable: { cls: 'badge-negative', label: 'Unreachable' },
  passed: { cls: 'badge-positive', label: 'Passed' },
  failed: { cls: 'badge-negative', label: 'Failed' },
  live: { cls: 'badge-positive', label: 'Live backend' },
  mock: { cls: 'badge-warning', label: 'Demo data' }
};

export default function StatusPill({ status, label }) {
  const cfg = MAP[status] || { cls: 'badge-neutral', label: status };
  return (
    <span className={`badge ${cfg.cls}`}>
      <span className="badge-dot" />
      {label || cfg.label}
    </span>
  );
}
