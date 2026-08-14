import { http, request } from './client.js';
import { mockAuth, mockUser } from './mock/mockData.js';

// Maps to app/routers/auth.py: /signup, /login, /me

export function signup({ full_name, email, password }) {
  return request(
    () => http.post('/auth/signup', { full_name, email, password }),
    mockAuth.login
  );
}

export function login({ email, password }) {
  return request(
    () => http.post('/auth/login', { email, password }),
    mockAuth.login
  );
}

export function loginWithGoogle(credential) {
  return request(
    () => http.post('/auth/google', { credential }),
    mockAuth.login
  );
}

export function fetchProfile() {
  return request(
    () => http.get('/auth/me'),
    mockUser
  );
}
