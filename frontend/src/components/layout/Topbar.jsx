import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const TITLES = {
  '/': 'Command Center',
  '/analytics': 'Analytics',
  '/data-explorer': 'Data Explorer',
  '/backtesting': 'Backtesting',
  '/backtest-history': 'Backtest History',
  '/assistant': 'Retail Assistant',
  '/products': 'Products',
  '/upload': 'Data Upload',
  '/system-health': 'System Health',
  '/settings': 'Settings'
};

const DISPLAY_NAME = 'Nishra Gajkandh';

export default function Topbar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const title = TITLES[location.pathname] || 'Console';

  const name = user?.full_name || DISPLAY_NAME;
  const initials = name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Open navigation">
          ☰
        </button>
        <span className="topbar-crumb">
          Enterprise Intelligence Console&ensp;/&ensp;{title}
        </span>
      </div>

      <div className="topbar-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="topbar-status-dot" title="All systems operational" />
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', letterSpacing: '0.005em' }}>
            Live
          </span>
        </div>

        <div className="topbar-divider" />

        <div className="topbar-user">
          <div className="topbar-avatar">{initials}</div>
          <div>
            <div className="topbar-user-name">{name}</div>
            <div className="topbar-user-role">
              {user?.role || 'Analyst'} · Enterprise Intelligence
            </div>
          </div>
        </div>

        <div className="topbar-divider" />

        <button
          className="topbar-signout"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
