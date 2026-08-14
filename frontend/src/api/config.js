// Centralized environment configuration. Every other module reads config
// through here instead of touching import.meta.env directly, so the
// adapters stay portable if the env strategy changes later.

const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const prefix = import.meta.env.VITE_API_PREFIX || '/api/v1';

export const config = {
  apiBaseUrl: rawBase.replace(/\/+$/, ''),
  apiPrefix: prefix.startsWith('/') ? prefix : `/${prefix}`,
  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 60000),
  forceMock: String(import.meta.env.VITE_FORCE_MOCK).toLowerCase() === 'true'
};

export const API_ROOT = `${config.apiBaseUrl}${config.apiPrefix}`;
