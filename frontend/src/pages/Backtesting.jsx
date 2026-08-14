import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, StatCard } from '../components/common/Card.jsx';
import { LoadingBlock, ErrorBlock, EmptyBlock, DataSourceNotice } from '../components/common/States.jsx';
import TracePanel from '../components/common/TracePanel.jsx';
import { runBacktest } from '../api/backtest.js';

const pct = (n) => `${n > 0 ? '+' : ''}${Number(n).toFixed(2)}%`;

const DEFAULTS = {
  symbol: 'DEMO-EQUITY',
  fastWindow: 10,
  slowWindow: 30,
  transactionCostPct: 0.1,
  startDate: '',
  endDate: ''
};

export default function Backtesting() {
  const [form, setForm] = useState(DEFAULTS);
  const [status, setStatus] = useState({ loading: false, error: null });
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleRun(e) {
    e.preventDefault();
    if (Number(form.fastWindow) >= Number(form.slowWindow)) {
      setStatus({ loading: false, error: 'Fast window must be smaller than the slow window.' });
      return;
    }
    setStatus({ loading: true, error: null });
    try {
      const { data, source, error } = await runBacktest(form);
      setResult(data);
      setMeta({ source, error });
      setStatus({ loading: false, error: null });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Quantitative Backtesting</span>
          <h1>Backtesting</h1>
          <p className="page-subtitle">SMA crossover strategy · signal at t, execution at t+1 · POST /api/v1/backtest/run</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '340px 1fr' }}>
        <Card title="Strategy parameters">
          <form onSubmit={handleRun} className="flex-col gap-4">
            <div className="field">
              <label htmlFor="symbol">Symbol / dataset</label>
              <input id="symbol" className="input" value={form.symbol} onChange={(e) => update('symbol', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="fast">Fast MA window</label>
                <input id="fast" type="number" min={2} className="input" value={form.fastWindow} onChange={(e) => update('fastWindow', Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="slow">Slow MA window</label>
                <input id="slow" type="number" min={3} className="input" value={form.slowWindow} onChange={(e) => update('slowWindow', Number(e.target.value))} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="cost">Transaction cost (%)</label>
              <input id="cost" type="number" step="0.01" min={0} className="input" value={form.transactionCostPct} onChange={(e) => update('transactionCostPct', Number(e.target.value))} />
              <span className="hint">Applied on every position change.</span>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="startDate">Start date</label>
                <input id="startDate" type="date" className="input" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="endDate">End date</label>
                <input id="endDate" type="date" className="input" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
              </div>
            </div>
            {status.error && <div className="auth-error">{status.error}</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={status.loading}>
              {status.loading ? 'Running backtest…' : 'Run backtest'}
            </button>
          </form>
        </Card>

        <div>
          {status.loading && <Card><LoadingBlock label="Computing equity curve and metrics…" /></Card>}
          {!status.loading && !result && (
            <Card>
              <EmptyBlock title="No backtest run yet" message="Set your SMA crossover parameters and run a backtest to see performance metrics and the equity curve." />
            </Card>
          )}
          {!status.loading && result && (
            <div className="flex-col gap-4">
              <DataSourceNotice source={meta?.source} error={meta?.error} />
              <div className="grid grid-5">
                <StatCard label="Total return" value={pct(result.metrics.total_return_pct)} deltaDirection={result.metrics.total_return_pct >= 0 ? 'up' : 'down'} />
                <StatCard label="Sharpe ratio" value={result.metrics.sharpe_ratio.toFixed(2)} />
                <StatCard label="Max drawdown" value={pct(result.metrics.max_drawdown_pct)} deltaDirection="down" />
                <StatCard label="CAGR" value={pct(result.metrics.cagr_pct)} deltaDirection={result.metrics.cagr_pct >= 0 ? 'up' : 'down'} />
                <StatCard label="Win rate" value={`${result.metrics.win_rate_pct.toFixed(1)}%`} caption={`${result.metrics.total_trades} trades`} />
              </div>

              <Card title="Equity curve" subtitle={`Run ${result.run_id} · fast ${result.params.fast_window} / slow ${result.params.slow_window}`}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={result.equity_curve}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(d) => d.slice(5)} minTickGap={28} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={54} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 5, border: '1px solid var(--border)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="equity" name="Strategy" stroke="var(--accent)" strokeWidth={2.2} dot={false} />
                    <Line type="monotone" dataKey="benchmark" name="Buy & hold" stroke="var(--text-muted)" strokeDasharray="4 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>

                <TracePanel title="Validation & evidence — look-ahead bias prevention" defaultOpen>
                  <div className="grid grid-3">
                    <EvidenceStat label="Signal computed on" value={`t (${result.evidence.signal_computed_on})`} />
                    <EvidenceStat label="Execution applied on" value={`t+1 (${result.evidence.execution_applied_on})`} />
                    <EvidenceStat label="Signal lag" value={`${result.evidence.signal_lag_days} day(s), via shift(1)`} />
                    <EvidenceStat label="Transaction costs" value={result.evidence.transaction_cost_applied ? 'Applied on every position change' : 'Not applied'} />
                    <EvidenceStat label="Look-ahead bias check" value={result.evidence.lookahead_bias_check === 'passed' ? 'Passed' : 'Failed'} />
                    <EvidenceStat label="Transaction cost rate" value={`${result.params.transaction_cost_pct}%`} />
                  </div>
                  <p className="text-xs text-muted mt-3">
                    Positions derived from the SMA crossover signal on day t are shifted forward one day before being
                    applied to returns, so no trade acts on information not yet available at execution time.
                  </p>
                </TracePanel>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceStat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}
