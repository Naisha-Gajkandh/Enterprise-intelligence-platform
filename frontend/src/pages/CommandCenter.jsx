import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Card, StatCard } from '../components/common/Card.jsx';
import { LoadingBlock, ErrorBlock, DataSourceNotice } from '../components/common/States.jsx';
import StatusPill from '../components/common/StatusPill.jsx';
import { fetchKpis, fetchRevenueDaily, fetchForecast } from '../api/analytics.js';
import { fetchBacktestHistory } from '../api/backtest.js';
import { fetchSystemHealth } from '../api/health.js';

const money = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const pct = (n) => `${n > 0 ? '+' : ''}${Number(n).toFixed(1)}%`;

export default function CommandCenter() {
  const [state, setState] = useState({ loading: true, error: null });
  const [data, setData] = useState(null);

  async function load() {
    setState({ loading: true, error: null });
    try {
      const [kpis, revenue, forecast, history, health] = await Promise.all([
        fetchKpis(),
        fetchRevenueDaily(),
        fetchForecast({ horizonDays: 7 }),
        fetchBacktestHistory(),
        fetchSystemHealth()
      ]);
      const sources = [kpis.source, revenue.source, forecast.source, history.source];
      const anyMock = sources.some((s) => s !== 'live');
      const bestRun = [...history.data].sort((a, b) => b.total_return_pct - a.total_return_pct)[0];
      setData({ kpis: kpis.data, revenue: revenue.data, forecast: forecast.data, bestRun, health: health.data });
      setState({
        loading: false,
        error: null,
        source: anyMock ? 'mock' : 'live',
        errorNote: anyMock ? kpis.error || revenue.error || forecast.error || history.error : null
      });
    } catch (err) {
      setState({ loading: false, error: err.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (state.loading) return <LoadingBlock label="Loading executive overview…" />;
  if (state.error) return <ErrorBlock message={state.error} onRetry={load} />;

  const { kpis, revenue, forecast, bestRun, health } = data;
  const degraded = health.services.filter((s) => s.status !== 'operational').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Command Center</span>
          <h1>Executive overview</h1>
          <p className="page-subtitle">
            Live read across the Backtesting Engine, DataMart Analytics and Retail AI Assistant.
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/backtesting" className="btn btn-secondary">Run backtest</Link>
          <Link to="/assistant" className="btn btn-primary">Open assistant</Link>
        </div>
      </div>

      <DataSourceNotice source={state.source} error={state.errorNote} />

      <div className="grid grid-4 mb-3">
        <StatCard label="Total revenue" value={money(kpis.total_revenue)} delta={pct(kpis.revenue_change_pct)} deltaDirection={kpis.revenue_change_pct >= 0 ? 'up' : 'down'} caption="vs. prior period" />
        <StatCard label="Total orders" value={kpis.total_orders.toLocaleString()} delta={pct(kpis.orders_change_pct)} deltaDirection={kpis.orders_change_pct >= 0 ? 'up' : 'down'} caption="vs. prior period" />
        <StatCard label="Avg order value" value={money(kpis.avg_order_value)} delta={pct(kpis.aov_change_pct)} deltaDirection={kpis.aov_change_pct >= 0 ? 'up' : 'down'} caption="vs. prior period" />
        <StatCard label="Active products" value={kpis.active_products} caption="in catalog" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <Card title="Revenue — last 30 days" subtitle="app/routers/analytics.py · /revenue-daily">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(d) => d.slice(5)} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} width={48} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ fontSize: 12, borderRadius: 5, border: '1px solid var(--border)' }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <div className="flex-col gap-4">
          <Card title="7-day forecast" subtitle={`XGBoost · test MAE ${money(forecast.test_mae)}`} bodyClassName="tight">
            <div className="flex-col gap-2">
              {forecast.predictions.slice(0, 4).map((p) => (
                <div key={p.date} className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-secondary text-sm">{p.date}</span>
                  <span className="num" style={{ fontWeight: 600 }}>{money(p.predicted_revenue)}</span>
                </div>
              ))}
            </div>
            <Link to="/analytics" className="btn btn-ghost btn-sm mt-3">View full forecast →</Link>
          </Card>

          <Card title="Best backtest" subtitle="app/routers/backtest.py · /history">
            {bestRun ? (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-secondary text-sm">SMA {bestRun.fast_window}/{bestRun.slow_window}</span>
                  <span className="badge badge-positive">{pct(bestRun.total_return_pct)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Sharpe</span>
                  <span className="num">{bestRun.sharpe_ratio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted">Max drawdown</span>
                  <span className="num">{bestRun.max_drawdown_pct.toFixed(2)}%</span>
                </div>
                <Link to="/backtest-history" className="btn btn-ghost btn-sm mt-3">View history →</Link>
              </div>
            ) : (
              <span className="text-muted text-sm">No runs yet.</span>
            )}
          </Card>
        </div>
      </div>

      <div className="grid grid-2 mt-4">
        <Card title="Recent activity">
          <ul className="flex-col gap-3" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <ActivityRow label="Backtest run completed" meta={`SMA ${bestRun?.fast_window}/${bestRun?.slow_window} · ${pct(bestRun?.total_return_pct || 0)} return`} time="Just now" />
            <ActivityRow label="Forecast regenerated" meta={`${forecast.trained_on_rows} rows · chronological split`} time="12m ago" />
            <ActivityRow label="Dataset analyzed" meta="transactions_q3.csv · 18,420 rows" time="1h ago" />
            <ActivityRow label="Retail assistant query" meta="Category performance lookup" time="2h ago" />
          </ul>
        </Card>
        <Card title="System status" subtitle={`${degraded} of ${health.services.length} services need attention`} actions={<Link to="/system-health" className="btn btn-ghost btn-sm">Details</Link>}>
          <div className="flex-col gap-2">
            {health.services.map((s) => (
              <div key={s.key} className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm">{s.name}</span>
                <StatusPill status={s.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ActivityRow({ label, meta, time }) {
  return (
    <li className="flex justify-between items-center" style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div className="text-muted text-xs mt-2">{meta}</div>
      </div>
      <span className="text-muted text-xs">{time}</span>
    </li>
  );
}
