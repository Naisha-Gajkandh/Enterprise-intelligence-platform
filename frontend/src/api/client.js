import axios from 'axios';
import { config, API_ROOT } from './config.js';

export const TOKEN_KEY = 'eic_auth_token';
export const USER_KEY = 'eic_auth_user';

export const http = axios.create({
  baseURL: API_ROOT,
  timeout: config.timeoutMs
});

http.interceptors.request.use((req) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Broadcast 401s so the auth context can log the user out without every
// adapter having to know about routing / context.
http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('eic:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/**
 * Unwraps the backend's standard envelope: { success, data, error }.
 * Falls back gracefully if a response doesn't use the envelope shape.
 */
function unwrapEnvelope(payload) {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    if (!payload.success) {
      const message = payload.error?.message || payload.error || 'Request failed';
      throw new Error(typeof message === 'string' ? message : 'Request failed');
    }
    return payload.data;
  }
  return payload;
}

/**
 * Executes a live API call and transparently falls back to mock data when
 * the backend is unreachable (network error, timeout, 5xx, or explicit
 * VITE_FORCE_MOCK=true). Every adapter function uses this so pages never
 * have to implement their own fallback branching.
 *
 * @param {() => Promise<import('axios').AxiosResponse>} liveCall
 * @param {*} mockData - value or function returning the mock payload
 * @returns {Promise<{data: *, source: 'live'|'mock', error?: string}>}
 */
export async function request(liveCall, mockData, options = {}) {
  if (config.forceMock) {
    return { data: resolveMock(mockData), source: 'mock' };
  }
  try {
    const res = await liveCall();
    return { data: unwrapEnvelope(res.data), source: 'live' };
  } catch (err) {
    const reason = describeError(err);
    if (options.disableFallback || (err.response && err.response.status >= 400 && err.response.status < 500)) {
      const errMsg = err.response.data?.error?.message || reason;
      throw new Error(errMsg);
    }
    return { data: resolveMock(mockData), source: 'mock', error: reason };
  }
}

function resolveMock(mockData) {
  return typeof mockData === 'function' ? mockData() : mockData;
}

function describeError(err) {
  if (err.code === 'ECONNABORTED') return 'Request timed out';
  if (!err.response) return 'Backend unreachable';
  if (err.response.status === 401) return 'Session expired';
  if (err.response.status >= 500) return `Server error (${err.response.status})`;
  return err.response.data?.error?.message || err.message || 'Request failed';
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
