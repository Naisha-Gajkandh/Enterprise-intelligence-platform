import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card, StatCard } from '../components/common/Card.jsx';
import { LoadingBlock, ErrorBlock, DataSourceNotice } from '../components/common/States.jsx';
import TracePanel from '../components/common/TracePanel.jsx';
import { fetchKpis, fetchRevenueDaily, fetchCategories, fetchForecast } from '../api/analytics.js';

const money = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function Analytics() {
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  const [state, setState] = useState({ loading: true, error: null });
  const [data, setData] = useState(null);

  async function load() {
    setState({ loading: true, error: null });
    try {
      const [kpis, revenue, categories, forecast] = await Promise.all([
        fetchKpis(range),
        fetchRevenueDaily(range),
        fetchCategories(range),
        fetchForecast({ horizonDays: 7 })
      ]);
      const anyMock = [kpis.source, revenue.source, categories.source, forecast.source].some((s) => s !== 'live');
      setData({ kpis: kpis.data, revenue: revenue.data, categories: categories.data, forecast: forecast.data });
      setState({ loading: false, error: null, source: anyMock ? 'mock' : 'live', errorNote: kpis.error || revenue.error });
    } catch (err) {
      setState({ loading: false, error: err.message });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">DataMart Analytics</span>
          <h1>Analytics</h1>
          <p className="page-subtitle">
            DuckDB-vectorized KPIs, revenue and category aggregation, plus the XGBoost 7-day forecast.
          </p>
        </div>
      </div>

      <Card className="mb-3" bodyClassName="tight">
        <div className="form-row items-center">
          <div className="field">
            <label htmlFor="start">Start date</label>
            <input id="start" type="date" className="input" value={range.startDate} onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="end">End date</label>
            <input id="end" type="date" className="input" value={range.endDate} onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end', flex: '0 0 auto' }}>
            <label>&nbsp;</label>
            <button className="btn btn-primary" onClick={load}>Apply filters</button>
          </div>
        </div>
      </Card>

      {state.loading && <LoadingBlock label="Querying DuckDB…" />}
      {state.error && <ErrorBlock message={state.error} onRetry={load} />}

      {!state.loading && !state.error && data && (
        <>
          <DataSourceNotice source={state.source} error={state.errorNote} />

          <div className="grid grid-4 mb-3">
            <StatCard label="Total revenue" value={money(data.kpis.total_revenue)} caption="app/routers/analytics.py · /kpis" />
            <StatCard label="Total orders" value={data.kpis.total_orders.toLocaleString()} caption="/kpis" />
            <StatCard label="Avg order value" value={money(data.kpis.avg_order_value)} caption="/kpis" />
            <StatCard label="Active products" value={data.kpis.active_products} caption="/kpis" />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
            <Card title="Daily revenue" subtitle="/revenue-daily">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.revenue}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(d) => d.slice(5)} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} width={48} />
                  <Tooltip formatter={(v) => money(v)} contentStyle={{ fontSize: 12, borderRadius: 5, border: '1px solid var(--border)' }} />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Revenue by category" subtitle="/categories">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Category</th><th>Share</th><th className="table-numeric">Revenue</th></tr>
                  </thead>
                  <tbody>
                    {data.categories.map((c) => (
                      <tr key={c.category}>
                        <td>{c.category}</td>
                        <td>
                          <div style={{ background: 'var(--bg-sunken)', borderRadius: 3, overflow: 'hidden', height: 6, width: 70 }}>
                            <div style={{ width: `${c.share_pct}%`, background: 'var(--accent)', height: '100%' }} />
                          </div>
                        </td>
                        <td className="table-numeric">{money(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card title="7-day XGBoost forecast" subtitle="/forecast" className="mt-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.forecast.predictions}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} width={48} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ fontSize: 12, borderRadius: 5, border: '1px solid var(--border)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="lower_bound" name="Lower bound" stroke="var(--border-strong)" strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="predicted_revenue" name="Predicted revenue" stroke="var(--accent)" strokeWidth={2.2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="upper_bound" name="Upper bound" stroke="var(--border-strong)" strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>

            <TracePanel title="Model & evidence — chronological split, no data leakage">
              <div className="grid grid-3">
                <EvidenceStat label="Model" value={data.forecast.model} />
                <EvidenceStat label="Split method" value={data.forecast.split_method} />
                <EvidenceStat label="Test MAE" value={money(data.forecast.test_mae)} />
                <EvidenceStat label="Test MAPE" value={`${data.forecast.test_mape_pct}%`} />
                <EvidenceStat label="Train window" value={`${data.forecast.train_range[0]} → ${data.forecast.train_range[1]}`} />
                <EvidenceStat label="Test window" value={`${data.forecast.test_range[0]} → ${data.forecast.test_range[1]}`} />
              </div>
              <div className="mt-3">
                <div className="text-xs text-muted mb-3">Lag & calendar features</div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {data.forecast.features.map((f) => (
                    <span key={f} className="badge badge-accent">{f}</span>
                  ))}
                </div>
              </div>
            </TracePanel>
          </Card>
        </>
      )}
    </div>
  );
}

function EvidenceStat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="num" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}
