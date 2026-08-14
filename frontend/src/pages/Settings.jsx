import React from 'react';
import { Card } from '../components/common/Card.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user, logout } = useAuth();

  const name = user?.full_name || 'Nishra Gajkandh';
  const email = user?.email || '—';
  const role = user?.role || 'Analyst';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Enterprise Intelligence';

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Platform</span>
          <h1>Settings</h1>
          <p className="page-subtitle">Your account details and personal preferences.</p>
        </div>
      </div>

      <div style={{ maxWidth: 680 }}>
        <Card title="Account" subtitle="Your profile on the Enterprise Intelligence Console">
          <div className="flex-col gap-0">
            <SettingRow label="Full name" value={name} />
            <SettingRow label="Email address" value={email} mono />
            <SettingRow label="Role" value={role} />
            <SettingRow label="Member since" value={memberSince} />
          </div>
        </Card>

        <div style={{ marginTop: 20 }}>
          <Card title="Session">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  Sign out of this console
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Your session data will be cleared from this browser.
                </div>
              </div>
              <a
                href="/login"
                className="btn btn-secondary btn-sm"
                onClick={(e) => { e.preventDefault(); logout(); window.location.href = '/login'; }}
                style={{ flexShrink: 0 }}
              >
                Sign out
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, value, mono }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '13px 0',
      borderBottom: '1px solid var(--border)',
      gap: 16
    }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 13,
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        fontWeight: 500,
        color: 'var(--text-primary)',
        textAlign: 'right'
      }}>
        {value}
      </span>
    </div>
  );
}
