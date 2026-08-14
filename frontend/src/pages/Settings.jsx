import React, { useState } from 'react';
import { Card } from '../components/common/Card.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { config } from '../api/config.js';

export default function Settings() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  function copyBaseUrl() {
    navigator.clipboard?.writeText(config.apiBaseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Platform</span>
          <h1>Settings</h1>
          <p className="page-subtitle">Account details and the API configuration this console is currently using.</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card title="Account">
          <div className="flex-col gap-3">
            <SettingRow label="Name" value={user?.full_name || '—'} />
            <SettingRow label="Email" value={user?.email || '—'} />
            <SettingRow label="Role" value={user?.role || 'analyst'} />
          </div>
        </Card>

        <Card title="API configuration" subtitle="Read from environment variables at build time" actions={
          <button className="btn btn-secondary btn-sm" onClick={copyBaseUrl}>{copied ? 'Copied' : 'Copy base URL'}</button>
        }>
          <div className="flex-col gap-3">
            <SettingRow label="Base URL" value={config.apiBaseUrl} mono />
            <SettingRow label="API prefix" value={config.apiPrefix} mono />
            <SettingRow label="Request timeout" value={`${config.timeoutMs} ms`} mono />
            <SettingRow label="Force mock mode" value={config.forceMock ? 'Enabled' : 'Disabled'} />
          </div>
          <p className="text-xs text-muted mt-3">
            Update VITE_API_BASE_URL, VITE_API_PREFIX, VITE_API_TIMEOUT_MS and VITE_FORCE_MOCK in your .env file, then
            rebuild — see .env.example.
          </p>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({ label, value, mono }) {
  return (
    <div className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="text-muted text-sm">{label}</span>
      <span className={mono ? 'num text-sm' : 'text-sm'} style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
