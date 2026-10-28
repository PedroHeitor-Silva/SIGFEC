import axios from 'axios';

// A API é acessada pela MESMA origem do front (/api): o Vite repassa para o backend (proxy em
// vite.config.js). Assim funciona igual no PC, no celular pela rede e por HTTPS (PWA instalado).
// VITE_API_URL sobrescreve, ex.: http://servidor:8080/api.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 8000,
});

// Injeta JWT em todo request se houver token salvo
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('@sigfec:user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
  } catch { /* ignore */ }
  return config;
});

// Logout automático só em 401 (token expirado/ausente)
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      const url = err.config?.url || '';
      if (!url.includes('/usuarios/login')) {
        localStorage.removeItem('@sigfec:user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
