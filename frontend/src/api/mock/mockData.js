// Demo-quality mock data, shaped exactly like the FastAPI response envelope
// payloads described in the backend architecture doc. Used only when a live
// call fails or VITE_FORCE_MOCK=true, so the console stays demonstrable
// with the backend offline.

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const mockUser = {
  id: 'a1b2c3d4-0001',
  email: 'demo.analyst@enterprise-console.io',
  full_name: 'Demo Analyst',
  role: 'analyst',
  created_at: '2025-11-02T09:15:00Z'
};

export const mockAuth = {
  login: {
    access_token: 'mock.jwt.token',
    token_type: 'bearer',
    user: mockUser
  }
};

export const mockKpis = {
  total_revenue: 1284920.55,
  revenue_change_pct: 6.4,
  total_orders: 9186,
  orders_change_pct: 3.1,
  avg_order_value: 139.9,
  aov_change_pct: -1.2,
  active_products: 342,
  products_change_pct: 0.0,
  as_of: new Date().toISOString()
};

export const mockRevenueDaily = Array.from({ length: 30 }).map((_, i) => {
  const base = 32000 + Math.sin(i / 3) * 5200 + (i % 7 === 5 || i % 7 === 6 ? 6000 : 0);
  return {
    date: isoDaysAgo(29 - i),
    revenue: Math.round(base + (Math.random() - 0.5) * 2200),
    orders: Math.round(180 + Math.sin(i / 4) * 30 + (Math.random() - 0.5) * 15)
  };
});

export const mockCategories = [
  { category: 'Home & Kitchen', revenue: 312400, orders: 2140, share_pct: 24.3 },
  { category: 'Apparel', revenue: 268900, orders: 3012, share_pct: 20.9 },
  { category: 'Electronics', revenue: 241100, orders: 980, share_pct: 18.8 },
  { category: 'Grocery', revenue: 189500, orders: 4210, share_pct: 14.8 },
  { category: 'Beauty & Personal Care', revenue: 148200, orders: 1560, share_pct: 11.5 },
  { category: 'Sporting Goods', revenue: 124820, orders: 890, share_pct: 9.7 }
];

export const mockForecast = {
  model: 'XGBRegressor',
  trained_on_rows: 540,
  split_method: 'chronological',
  train_range: [isoDaysAgo(540), isoDaysAgo(31)],
  test_range: [isoDaysAgo(30), isoDaysAgo(1)],
  features: ['day_of_week', 'is_weekend', 'prev_day_revenue', 'prev_7day_avg'],
  test_mae: 1842.16,
  test_mape_pct: 5.3,
  predictions: Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const base = 34500 + Math.sin(i / 2) * 3100;
    return {
      date: d.toISOString().slice(0, 10),
      predicted_revenue: Math.round(base),
      lower_bound: Math.round(base * 0.91),
      upper_bound: Math.round(base * 1.09)
    };
  })
};

export const mockBacktestResult = {
  run_id: 'bt-demo-0007',
  strategy: 'SMA Crossover',
  params: { fast_window: 10, slow_window: 30, transaction_cost_pct: 0.1, symbol: 'DEMO-EQUITY' },
  metrics: {
    total_return_pct: 38.42,
    sharpe_ratio: 1.64,
    max_drawdown_pct: -12.85,
    cagr_pct: 14.9,
    win_rate_pct: 54.2,
    total_trades: 47
  },
  equity_curve: Array.from({ length: 60 }).map((_, i) => ({
    date: isoDaysAgo(59 - i),
    equity: Math.round(10000 * (1 + 0.006 * i + Math.sin(i / 6) * 0.03) * 100) / 100,
    benchmark: Math.round(10000 * (1 + 0.003 * i) * 100) / 100
  })),
  evidence: {
    signal_lag_days: 1,
    signal_computed_on: 't',
    execution_applied_on: 't+1',
    transaction_cost_applied: true,
    lookahead_bias_check: 'passed'
  },
  created_at: new Date().toISOString()
};

export const mockBacktestHistory = [
  { run_id: 'bt-demo-0007', strategy: 'SMA Crossover', fast_window: 10, slow_window: 30, total_return_pct: 38.42, sharpe_ratio: 1.64, max_drawdown_pct: -12.85, created_at: isoDaysAgo(0) },
  { run_id: 'bt-demo-0006', strategy: 'SMA Crossover', fast_window: 5, slow_window: 20, total_return_pct: 22.11, sharpe_ratio: 1.21, max_drawdown_pct: -17.92, created_at: isoDaysAgo(2) },
  { run_id: 'bt-demo-0005', strategy: 'SMA Crossover', fast_window: 20, slow_window: 50, total_return_pct: 16.77, sharpe_ratio: 0.98, max_drawdown_pct: -9.41, created_at: isoDaysAgo(5) },
  { run_id: 'bt-demo-0004', strategy: 'SMA Crossover', fast_window: 10, slow_window: 40, total_return_pct: 29.05, sharpe_ratio: 1.43, max_drawdown_pct: -14.63, created_at: isoDaysAgo(9) },
  { run_id: 'bt-demo-0003', strategy: 'SMA Crossover', fast_window: 15, slow_window: 30, total_return_pct: -4.18, sharpe_ratio: -0.22, max_drawdown_pct: -21.04, created_at: isoDaysAgo(14) }
];

export const mockProducts = [
  { id: 'p-1001', name: 'Aria Ceramic Pour-Over Set', category: 'Home & Kitchen', price: 48.0, description: 'Slow-drip ceramic brewer with walnut collar and 400ml carafe.' },
  { id: 'p-1002', name: 'Fieldrunner Trail Jacket', category: 'Apparel', price: 129.0, description: 'Packable 3-layer shell rated to -5°C with pit-zip venting.' },
  { id: 'p-1003', name: 'Nimbus 65W GaN Charger', category: 'Electronics', price: 39.5, description: 'Triple-port compact charger, 65W max, foldable prongs.' },
  { id: 'p-1004', name: 'Harvest Grove Cold-Press Oil', category: 'Grocery', price: 14.25, description: 'Single-origin extra virgin olive oil, 500ml dark glass bottle.' },
  { id: 'p-1005', name: 'Quartz Mineral SPF 40 Stick', category: 'Beauty & Personal Care', price: 22.0, description: 'Reef-safe mineral sunscreen stick, fragrance-free.' },
  { id: 'p-1006', name: 'Trailhead 22L Hydration Pack', category: 'Sporting Goods', price: 74.0, description: '2L reservoir, ventilated back panel, rain cover included.' },
  { id: 'p-1007', name: 'Solace Weighted Throw', category: 'Home & Kitchen', price: 58.0, description: '6.8kg glass-bead weighted throw, breathable cotton shell.' },
  { id: 'p-1008', name: 'Pulse Run Sock 3-Pack', category: 'Apparel', price: 21.0, description: 'Compression arch band, moisture-wicking blend.' }
];

export const mockAssistantResponse = (message) => ({
  reply:
    "Home & Kitchen led revenue this week at $312.4K (24.3% share), up on strong pour-over and weighted-throw sell-through. I'd pair a Home & Kitchen push with the Fieldrunner Trail Jacket restock — Apparel is your second-largest category and trending with the seasonal shift.",
  intent: /recommend|suggest|product|buy|shop/i.test(message) ? 'product_recommendation' : 'structured_query',
  confidence: 0.87,
  retrieved_context: [
    { source: 'analytics.category_revenue', summary: 'Home & Kitchen: $312,400 revenue / 2,140 orders (24.3% share)' },
    { source: 'catalog.products', summary: '3 matching products in Home & Kitchen, Apparel' }
  ],
  trace: {
    query: message,
    intent_router: /recommend|suggest|product|buy|shop/i.test(message) ? 'product_recommendation' : 'structured_query',
    retrieval: 'SQL metric lookup + catalog keyword match (4 rows)',
    draft: 'Deterministic template answer generated from retrieved rows',
    llm_polish: { used: true, provider: 'Groq · llama-3.3-70b-versatile', fallback: false }
  },
  generated_at: new Date().toISOString()
});

export const mockAssistantResponseFallback = (message) => ({
  ...mockAssistantResponse(message),
  trace: {
    query: message,
    intent_router: 'structured_query',
    retrieval: 'SQL metric lookup (2 rows)',
    draft: 'Deterministic template answer generated from retrieved rows',
    llm_polish: { used: false, provider: null, fallback: true, reason: 'GROQ_API_KEY not configured — serving templated draft as-is' }
  }
});

export const mockUploadAnalysis = {
  filename: 'transactions_q3.csv',
  rows: 18420,
  columns: 9,
  schema: [
    { column: 'transaction_id', dtype: 'string', missing: 0 },
    { column: 'date', dtype: 'datetime', missing: 0 },
    { column: 'category', dtype: 'string', missing: 12 },
    { column: 'product_id', dtype: 'string', missing: 0 },
    { column: 'quantity', dtype: 'int', missing: 0 },
    { column: 'unit_price', dtype: 'float', missing: 4 },
    { column: 'revenue', dtype: 'float', missing: 0 },
    { column: 'customer_id', dtype: 'string', missing: 210 },
    { column: 'channel', dtype: 'string', missing: 0 }
  ],
  missing_values_total: 226,
  duplicate_rows: 38,
  numeric_summary: [
    { column: 'quantity', mean: 2.4, std: 1.8, min: 1, max: 24 },
    { column: 'unit_price', mean: 27.15, std: 14.92, min: 3.5, max: 189.0 },
    { column: 'revenue', mean: 64.9, std: 48.3, min: 3.5, max: 2140.0 }
  ],
  preview: Array.from({ length: 8 }).map((_, i) => ({
    transaction_id: `TXN-${10450 + i}`,
    date: isoDaysAgo(8 - i),
    category: mockCategories[i % mockCategories.length].category,
    product_id: `p-100${(i % 8) + 1}`,
    quantity: 1 + (i % 4),
    unit_price: (18 + i * 3.4).toFixed(2),
    revenue: ((1 + (i % 4)) * (18 + i * 3.4)).toFixed(2)
  })),
  ollama_insight:
    'Revenue is concentrated in three categories accounting for roughly two-thirds of volume. Missing customer_id on ~1.1% of rows suggests guest checkouts rather than a data quality defect — safe to proceed with category-level aggregation without imputation.',
  analyzed_at: new Date().toISOString()
};

export const mockSystemHealth = {
  checked_at: new Date().toISOString(),
  services: [
    { name: 'FastAPI Gateway', key: 'fastapi', status: 'operational', latency_ms: 41, detail: 'Uvicorn workers responding' },
    { name: 'Database (PostgreSQL/SQLite)', key: 'database', status: 'operational', latency_ms: 12, detail: 'Connection pool healthy' },
    { name: 'DuckDB Analytics Engine', key: 'duckdb', status: 'operational', latency_ms: 8, detail: 'In-memory OLAP ready' },
    { name: 'XGBoost Forecaster', key: 'xgboost', status: 'operational', latency_ms: 210, detail: 'Model artifact loaded' },
    { name: 'Groq Cloud (Llama 3.3 70B)', key: 'groq', status: 'degraded', latency_ms: null, detail: 'GROQ_API_KEY not set — templated fallback active' },
    { name: 'Local Ollama (Llama 3.2 3B)', key: 'ollama', status: 'unreachable', latency_ms: null, detail: 'No response from local Ollama instance' }
  ]
};
