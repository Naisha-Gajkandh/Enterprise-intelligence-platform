import { http, request } from './client.js';
import { mockProducts } from './mock/mockData.js';

// SCHEMA ASSUMPTION (isolated here, not baked into any page):
// The architecture doc defines a `Product` model and a catalog search used
// internally by the Retail AI Assistant Engine, but does not publish a
// dedicated products router. We expose the catalog at GET /assistant/products
// since it's owned by the assistant engine's retrieval layer. If the real
// backend mounts this elsewhere (e.g. its own /products router), only this
// file needs to change.

export function fetchProducts({ category, search } = {}) {
  return request(
    () => http.get('/assistant/products', { params: { category, search } }),
    () => {
      let results = mockProducts;
      if (category) results = results.filter((p) => p.category === category);
      if (search) {
        const q = search.toLowerCase();
        results = results.filter(
          (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
        );
      }
      return results;
    }
  );
}
