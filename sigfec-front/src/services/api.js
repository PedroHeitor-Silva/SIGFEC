import axios from 'axios';

// baseURL dinâmico: usa o mesmo host que abriu o front.
// PC → localhost:8080. Celular na rede → IP-do-PC:8080.
const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const api = axios.create({
  baseURL: `http://${host}:8080/api`,
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
