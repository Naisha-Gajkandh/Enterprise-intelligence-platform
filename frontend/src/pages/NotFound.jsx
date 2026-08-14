import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="state-block" style={{ minHeight: '100vh' }}>
      <span className="num" style={{ fontSize: 13, color: 'var(--accent)' }}>404</span>
      <h4 style={{ fontSize: 18, marginTop: 4 }}>This page doesn't exist</h4>
      <p>Check the sidebar for the module you're looking for.</p>
      <Link to="/" className="btn btn-primary btn-sm mt-3">Back to Command Center</Link>
    </div>
  );
}
