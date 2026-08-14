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

export default function Topbar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const title = TITLES[location.pathname] || 'Console';
  const initials = (user?.full_name || user?.email || 'U')
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
        <span className="topbar-crumb">Enterprise Intelligence Console / {title}</span>
      </div>
      <div className="topbar-right">
        <div className="topbar-user">
          <div className="topbar-avatar">{initials}</div>
          <span>{user?.full_name || user?.email}</span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
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
