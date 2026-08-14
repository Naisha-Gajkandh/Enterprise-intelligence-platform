import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/common/Card.jsx';
import { LoadingBlock, ErrorBlock, EmptyBlock, DataSourceNotice } from '../components/common/States.jsx';
import { fetchBacktestHistory } from '../api/backtest.js';

const pct = (n) => `${n > 0 ? '+' : ''}${Number(n).toFixed(2)}%`;

export default function BacktestHistory() {
  const [state, setState] = useState({ loading: true, error: null });
  const [runs, setRuns] = useState([]);
  const [sort, setSort] = useState('created_at');

  async function load() {
    setState({ loading: true, error: null });
    try {
      const { data, source, error } = await fetchBacktestHistory();
      setRuns(data);
      setState({ loading: false, error: null, source, errorNote: error });
    } catch (err) {
      setState({ loading: false, error: err.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = [...runs].sort((a, b) => {
    if (sort === 'return') return b.total_return_pct - a.total_return_pct;
    if (sort === 'sharpe') return b.sharpe_ratio - a.sharpe_ratio;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Quantitative Backtesting</span>
          <h1>Backtest history</h1>
          <p className="page-subtitle">GET /api/v1/backtest/history — every run tied to your account.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/backtesting" className="btn btn-primary">New backtest</Link>
        </div>
      </div>

      {state.loading && <Card><LoadingBlock label="Loading run history…" /></Card>}
      {state.error && <Card><ErrorBlock message={state.error} onRetry={load} /></Card>}

      {!state.loading && !state.error && (
        <Card
          actions={
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 160 }}>
              <option value="created_at">Sort: most recent</option>
              <option value="return">Sort: total return</option>
              <option value="sharpe">Sort: Sharpe ratio</option>
            </select>
          }
        >
          <DataSourceNotice source={state.source} error={state.errorNote} />
          {sorted.length === 0 ? (
            <EmptyBlock title="No backtests yet" message="Run your first SMA crossover backtest to build history here." action={<Link to="/backtesting" className="btn btn-primary btn-sm">Run backtest</Link>} />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Strategy</th>
                    <th>Windows</th>
                    <th className="table-numeric">Return</th>
                    <th className="table-numeric">Sharpe</th>
                    <th className="table-numeric">Max drawdown</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.run_id}>
                      <td className="num">{r.run_id}</td>
                      <td>{r.strategy}</td>
                      <td className="num">{r.fast_window} / {r.slow_window}</td>
                      <td className="table-numeric">
                        <span className={`badge ${r.total_return_pct >= 0 ? 'badge-positive' : 'badge-negative'}`}>{pct(r.total_return_pct)}</span>
                      </td>
                      <td className="table-numeric">{r.sharpe_ratio.toFixed(2)}</td>
                      <td className="table-numeric">{r.max_drawdown_pct.toFixed(2)}%</td>
                      <td>{r.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
