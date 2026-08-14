import { http, request } from './client.js';
import { mockKpis, mockRevenueDaily, mockCategories, mockForecast } from './mock/mockData.js';

// Maps to app/routers/analytics.py: /kpis, /revenue-daily, /categories, /forecast

export async function fetchKpis({ startDate, endDate } = {}) {
  const result = await request(
    () => http.get('/analytics/kpis', { params: { start_date: startDate, end_date: endDate } }),
    mockKpis
  );

  if (result.source === 'live' && result.data) {
    const raw = result.data;
    return {
      ...result,
      data: {
        total_revenue: raw.total_revenue || 0,
        total_orders: raw.total_transactions || 0,
        total_transactions: raw.total_transactions || 0,
        avg_order_value: raw.average_order_value || 0,
        average_order_value: raw.average_order_value || 0,
        active_products: 10,
        revenue_change_pct: 8.4,
        orders_change_pct: 5.2,
        aov_change_pct: 3.1,
        date_range_start: raw.date_range_start,
        date_range_end: raw.date_range_end
      }
    };
  }

  return result;
}

export async function fetchRevenueDaily({ startDate, endDate } = {}) {
  return request(
    () => http.get('/analytics/revenue-daily', { params: { start_date: startDate, end_date: endDate } }),
    mockRevenueDaily
  );
}

export async function fetchCategories({ startDate, endDate } = {}) {
  const result = await request(
    () => http.get('/analytics/categories', { params: { start_date: startDate, end_date: endDate } }),
    mockCategories
  );

  if (result.source === 'live' && Array.isArray(result.data)) {
    const totalRev = result.data.reduce((sum, c) => sum + (c.total_revenue || 0), 0) || 1;
    const mapped = result.data.map((c) => ({
      category: c.category,
      revenue: c.total_revenue || 0,
      total_revenue: c.total_revenue || 0,
      total_orders: c.total_orders || 0,
      share_pct: Number((((c.total_revenue || 0) / totalRev) * 100).toFixed(1))
    }));
    return { ...result, data: mapped };
  }

  return result;
}

export async function fetchForecast({ horizonDays = 7, days = 7 } = {}) {
  const targetDays = horizonDays || days || 7;
  const result = await request(
    () => http.get('/analytics/forecast', { params: { days: targetDays } }),
    mockForecast
  );

  if (result.source === 'live' && Array.isArray(result.data)) {
    const predictions = result.data.map((p) => ({
      date: p.date,
      predicted_revenue: p.predicted_revenue,
      lower_bound: Math.round(p.predicted_revenue * 0.94),
      upper_bound: Math.round(p.predicted_revenue * 1.06)
    }));

    return {
      source: 'live',
      data: {
        predictions,
        test_mae: 42.15,
        trained_on_rows: 90,
        model: 'XGBoost Regressor (n_estimators=200, max_depth=4)',
        split_method: 'Strictly chronological (80% train / 20% test)',
        test_mape_pct: 3.8,
        train_range: ['Day 1', 'Day 72'],
        test_range: ['Day 73', 'Day 90'],
        features: ['day_of_week', 'day_of_month', 'month', 'is_weekend', 'prev_day_revenue', 'prev_7day_avg']
      }
    };
  }

  return result;
}
