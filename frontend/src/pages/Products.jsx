import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/common/Card.jsx';
import { LoadingBlock, ErrorBlock, EmptyBlock, DataSourceNotice } from '../components/common/States.jsx';
import { fetchProducts } from '../api/products.js';

export default function Products() {
  const [state, setState] = useState({ loading: true, error: null });
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  async function load() {
    setState({ loading: true, error: null });
    try {
      const { data, source, error } = await fetchProducts();
      setProducts(data);
      setState({ loading: false, error: null, source, errorNote: error });
    } catch (err) {
      setState({ loading: false, error: err.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const filtered = products.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || p.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Retail Catalog</span>
          <h1>Products</h1>
          <p className="page-subtitle">Catalog backing the Retail AI Assistant's product recommendations.</p>
        </div>
      </div>

      <Card className="mb-3" bodyClassName="tight">
        <div className="form-row">
          <div className="field">
            <label htmlFor="search">Search</label>
            <input id="search" className="input" placeholder="Search name or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {state.loading && <Card><LoadingBlock label="Loading catalog…" /></Card>}
      {state.error && <Card><ErrorBlock message={state.error} onRetry={load} /></Card>}

      {!state.loading && !state.error && (
        <>
          <DataSourceNotice source={state.source} error={state.errorNote} />
          {filtered.length === 0 ? (
            <Card><EmptyBlock title="No products match" message="Try a different search term or clear the category filter." /></Card>
          ) : (
            <div className="grid grid-4">
              {filtered.map((p) => (
                <div key={p.id} className="card card-pad flex-col gap-2">
                  <span className="badge badge-neutral" style={{ alignSelf: 'flex-start' }}>{p.category}</span>
                  <h3 style={{ fontSize: 14 }}>{p.name}</h3>
                  <p className="text-secondary text-sm">{p.description}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="num" style={{ fontWeight: 600, fontSize: 15 }}>${p.price.toFixed(2)}</span>
                    <span className="text-xs text-muted num">{p.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
