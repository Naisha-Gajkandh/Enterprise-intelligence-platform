import React, { useState } from 'react';

export default function TracePanel({ title = 'Response trace', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="trace-panel">
      <button className="trace-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{title}</span>
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="trace-body">{children}</div>}
    </div>
  );
}

export function TraceSteps({ steps }) {
  return (
    <div className="trace-steps">
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <div className="trace-step">
            <div className="trace-step-label">{step.label}</div>
            <div className="trace-step-value">{step.value}</div>
          </div>
          {i < steps.length - 1 && <div className="trace-arrow">→</div>}
        </React.Fragment>
      ))}
    </div>
  );
}
