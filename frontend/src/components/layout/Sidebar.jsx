import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Command Center', icon: '⊡', end: true }]
  },
  {
    label: 'Analytics',
    items: [
      { to: '/analytics', label: 'Analytics', icon: '∿' },
      { to: '/data-explorer', label: 'Data Explorer', icon: '⊞' }
    ]
  },
  {
    label: 'Quant',
    items: [
      { to: '/backtesting', label: 'Backtesting', icon: '⟳' },
      { to: '/backtest-history', label: 'Backtest History', icon: '≡' }
    ]
  },
  {
    label: 'Retail',
    items: [
      { to: '/assistant', label: 'Retail Assistant', icon: '◎' },
      { to: '/products', label: 'Products', icon: '▦' }
    ]
  },
  {
    label: 'Platform',
    items: [
      { to: '/upload', label: 'Data Upload', icon: '↑' },
      { to: '/system-health', label: 'System Health', icon: '◉' },
      { to: '/settings', label: 'Settings', icon: '○' }
    ]
  }
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">EI</div>
          <div>
            <div className="sidebar-brand-name">Enterprise Intelligence</div>
            <div className="sidebar-brand-sub">Console · PS-05</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="sidebar-group">
              <div className="sidebar-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                  }
                  onClick={onClose}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span style={{ fontSize: 11, color: '#3A3A40', fontFamily: 'var(--font-mono)' }}>
            v1.0 · unified platform
          </span>
        </div>
      </aside>
    </>
  );
}
