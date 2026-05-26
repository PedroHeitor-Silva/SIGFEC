/* eslint-disable react/prop-types */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, Scale, Beaker, Truck, Wheat } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../services/api';
import Logo from '../components/Logo';

const FEATURES = [
  { icon: Scale, title: 'Pesagem industrial', desc: 'Controle de balança e cálculo automático de peso líquido' },
  { icon: Beaker, title: 'Análise de qualidade', desc: 'Teor de amido com classificação automática' },
  { icon: Truck, title: 'Logística integrada', desc: 'Motoristas, veículos e parceiros unificados' },
  { icon: Wheat, title: 'Estoque inteligente', desc: 'Lotes de produção e movimentação' },
];

export default function Login({ setUser }) {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!login.trim() || !senha.trim()) { toast.error('Preencha login e senha.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/usuarios/login', { login, senha });
      localStorage.setItem('@sigfec:user', JSON.stringify(data));
      if (setUser) setUser(data);
      navigate('/');
    } catch (error) {
      const status = error?.response?.status;
      const isOffline = !error.response || error.code === 'ERR_NETWORK';
      const isServerBroken = status === 500 || status === 404;
      if ((isOffline || isServerBroken) && login === 'admin' && senha === 'admin') {
        const mock = { id: 1, login: 'admin', nome: 'Administrador', perfilAcesso: 'ADMIN' };
        localStorage.setItem('@sigfec:user', JSON.stringify(mock));
        if (setUser) setUser(mock);
        toast.success(isServerBroken ? `Login (mock — backend ${status})` : 'Login (modo dev)');
        navigate('/');
        return;
      }
      toast.error(status === 401 ? 'Credenciais inválidas.' : `Erro ao conectar (${status || 'rede'}).`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Toaster position="top-right" />

      {/* Brand panel (esquerda) */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-900">
        {/* Pattern de fundo - grade industrial */}
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(rgba(16,185,129,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Blobs animados sutis */}
        <motion.div
          animate={{ x: [0, 80, 0], y: [0, -40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -60, 0], y: [0, 60, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-emerald-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Brand top */}
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          >
            <Logo size={56} withText />
          </motion.div>

          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400 mb-3">
                Sistema integrado
              </p>
              <h1 className="text-5xl font-black text-white leading-tight">
                Indústria de<br />
                <span className="text-emerald-400">amido de mandioca</span>
              </h1>
              <p className="mt-4 text-base text-slate-400 max-w-md leading-relaxed">
                Pesagem, laboratório, estoque e financeiro em uma única plataforma industrial.
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-3 max-w-lg pt-4">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + i * 0.07 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm"
                  >
                    <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                      <Icon size={14} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{f.title}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center justify-between text-xs text-slate-600"
          >
            <p>© {new Date().getFullYear()} SIGFEC</p>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>v1.0 — Build estável</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Form panel (direita) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          {/* Logo mobile (só em telas pequenas) */}
          <div className="lg:hidden flex justify-center mb-8">
            <Logo size={56} withText />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Bem-vindo</p>
            <h2 className="text-3xl font-bold text-white mt-1">Acesse sua conta</h2>
            <p className="text-sm text-slate-500 mt-2">Use suas credenciais para entrar no sistema.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-8">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <User size={12} /> Login
              </span>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu usuário"
                autoComplete="username"
                required
                autoFocus
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Lock size={12} /> Senha
              </span>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="group w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-900/40"
            >
              {loading ? 'Entrando...' : (
                <>
                  Entrar no sistema
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] uppercase tracking-widest text-slate-600">Modo Dev</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500">
            <p>Credenciais: <code className="text-emerald-400 font-mono">admin</code> / <code className="text-emerald-400 font-mono">admin</code></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
