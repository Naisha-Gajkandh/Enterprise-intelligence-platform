import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user, logout, updateUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    full_name: user?.full_name || 'Nishra Gajkandh',
    email: user?.email || '',
  });

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    // Optimistic update — persist to localStorage via context
    await new Promise((r) => setTimeout(r, 400));
    updateUser({ full_name: form.full_name });
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleCancel() {
    setForm({
      full_name: user?.full_name || 'Nishra Gajkandh',
      email: user?.email || '',
    });
    setEditing(false);
  }

  const displayName = user?.full_name || 'Nishra Gajkandh';
  const email = user?.email || '—';
  const role = user?.role || 'Analyst';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const initials = displayName
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Platform</span>
          <h1>Settings</h1>
          <p className="page-subtitle">Manage your account information and session.</p>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>

        {/* Avatar + name hero */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 18,
          padding: '20px 24px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          marginBottom: 16, boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            background: '#E8E5DF', border: '1px solid var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17,
            color: '#3A3A3E', flexShrink: 0
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {role} · Member since {memberSince}
            </div>
          </div>
        </div>

        {/* Account details card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', marginBottom: 16
        }}>
          {/* Card header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid var(--border)'
          }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.02em' }}>Account information</div>
            </div>
            {!editing && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            )}
          </div>

          {/* Form body */}
          <form onSubmit={handleSave} style={{ padding: '6px 20px 20px' }}>
            <FieldRow
              label="Full name"
              name="full_name"
              value={editing ? form.full_name : displayName}
              editing={editing}
              onChange={handleChange}
              autoComplete="name"
            />
            <FieldRow
              label="Email address"
              name="email"
              value={email}
              editing={false}        /* email is read-only — tied to auth record */
              onChange={handleChange}
              mono
              hint="Contact your administrator to change your email address."
            />
            <FieldRow
              label="Role"
              value={role}
              editing={false}
            />

            {editing && (
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            )}

            {saved && (
              <div style={{
                marginTop: 14, fontSize: 12.5, color: 'var(--positive)', fontWeight: 500
              }}>
                ✓ Changes saved
              </div>
            )}
          </form>
        </div>

        {/* Session card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.02em' }}>Session</div>
          </div>
          <div style={{
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                Sign out of this console
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                Your session data will be cleared from this browser.
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => { logout(); window.location.href = '/login'; }}
            >
              Sign out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function FieldRow({ label, name, value, editing, onChange, mono, hint, autoComplete }) {
  return (
    <div style={{
      padding: '13px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: editing ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, minWidth: 120, flexShrink: 0, paddingTop: editing ? 9 : 0 }}>
          {label}
        </span>
        {editing ? (
          <div style={{ flex: 1 }}>
            <input
              name={name}
              value={value}
              onChange={onChange}
              autoComplete={autoComplete}
              className="input"
              style={{ fontSize: 13 }}
            />
            {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{hint}</div>}
          </div>
        ) : (
          <span style={{
            fontSize: 13,
            fontFamily: mono ? 'var(--font-mono)' : 'inherit',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}>
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
