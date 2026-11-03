import axios from 'axios';

// A API é acessada pela MESMA origem do front (/api): o Vite repassa para o backend (proxy em
// vite.config.js). Assim funciona igual no PC, no celular pela rede e por HTTPS (PWA instalado).
// VITE_API_URL sobrescreve, ex.: http://servidor:8080/api.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  // No servidor grátis o backend "dorme" sem uso e leva até ~1 min para acordar: 8 s fazia o
  // dashboard desistir das chamadas e abrir vazio.
  timeout: 60000,
});

const TENTATIVAS_GET = 2;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Injeta JWT em todo request se houver token salvo
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('@sigfec:user');
    if (raw) {
      const user = JSON.parse(raw);
      // sessão antiga sem token (ex.: login simulado de versões anteriores): força novo login
      if (!user?.token) {
        localStorage.removeItem('@sigfec:user');
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return config;
      }
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
  async (err) => {
    const status = err?.response?.status;
    // GET que falhou por servidor acordando/reiniciando (sem resposta, timeout ou 502/503/504): tenta de novo
    const cfg = err.config;
    const transitorio = err.code !== 'ERR_CANCELED' && (!err.response || [502, 503, 504].includes(status));
    if (cfg && (cfg.method || 'get') === 'get' && transitorio && (cfg._tentativa || 0) < TENTATIVAS_GET) {
      cfg._tentativa = (cfg._tentativa || 0) + 1;
      await esperar(2000 * cfg._tentativa);
      return api(cfg);
    }
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
