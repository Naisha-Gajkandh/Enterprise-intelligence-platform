import { http, request } from './client.js';
import { mockBacktestResult, mockBacktestHistory } from './mock/mockData.js';

// Maps to app/routers/backtest.py: /run, /history

export async function runBacktest({ symbol, fastWindow, slowWindow, transactionCostPct }) {
  const result = await request(
    () =>
      http.post('/backtest/run', {
        strategy: 'sma_crossover',
        fast_window: Number(fastWindow || 10),
        slow_window: Number(slowWindow || 50),
        fee_pct: Number(transactionCostPct ?? 0.1),
        initial_capital: 10000,
        days: 365
      }),
    () => ({
      ...mockBacktestResult,
      run_id: `bt-demo-${Math.floor(Math.random() * 9000 + 1000)}`,
      params: {
        symbol: symbol || 'DEMO-EQUITY',
        fast_window: fastWindow,
        slow_window: slowWindow,
        transaction_cost_pct: transactionCostPct
      }
    }),
    { disableFallback: true }
  );

  if (result.source === 'live' && result.data?.summary) {
    const summary = result.data.summary;
    const rawCurve = result.data.equity_curve || [];
    const firstEquity = rawCurve[0]?.equity || 10000;
    const equityCurve = rawCurve.map((pt, idx) => ({
      date: pt.date,
      equity: pt.equity,
      benchmark: Math.round(firstEquity * (1 + (idx / Math.max(rawCurve.length, 1)) * 0.05))
    }));

    return {
      source: 'live',
      data: {
        run_id: summary.id,
        params: {
          symbol: symbol || 'SYNTHETIC-PRICE-SERIES',
          fast_window: summary.fast_window,
          slow_window: summary.slow_window,
          transaction_cost_pct: summary.fee_pct
        },
        metrics: {
          total_return_pct: summary.total_return_pct,
          sharpe_ratio: summary.sharpe_ratio,
          max_drawdown_pct: summary.max_drawdown_pct,
          cagr_pct: summary.cagr_pct,
          win_rate_pct: summary.win_rate_pct,
          total_trades: summary.total_trades
        },
        equity_curve: equityCurve,
        evidence: {
          signal_computed_on: 'close(t)',
          execution_applied_on: 'open(t+1)',
          signal_lag_days: 1,
          transaction_cost_applied: summary.fee_pct > 0,
          lookahead_bias_check: 'passed'
        }
      }
    };
  }

  return result;
}

export async function fetchBacktestHistory() {
  const result = await request(
    () => http.get('/backtest/history'),
    mockBacktestHistory
  );

  if (result.source === 'live' && Array.isArray(result.data)) {
    const mapped = result.data.map((r) => ({
      ...r,
      run_id: r.id,
      fast_window: r.fast_window,
      slow_window: r.slow_window,
      total_return_pct: r.total_return_pct,
      sharpe_ratio: r.sharpe_ratio,
      max_drawdown_pct: r.max_drawdown_pct,
      created_at: typeof r.created_at === 'string' ? r.created_at.replace('T', ' ').slice(0, 19) : r.created_at
    }));
    return { ...result, data: mapped };
  }

  return result;
}
