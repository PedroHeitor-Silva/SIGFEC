/* eslint-disable react/prop-types */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Lock, ArrowRight, Eye, EyeOff, KeyRound,
  ShieldCheck, MapPin,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../services/api';
import Logo from '../components/Logo';

const TEAL = '#1ABB9C';
const TEAL_DARK = '#0e7c66';

export default function Login({ setUser }) {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [showPw, setShowPw] = useState(false);
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

  const usarDev = () => { setLogin('admin'); setSenha('admin'); };

  return (
    <div className="min-h-screen flex" style={{ background: '#f5f7fa' }}>
      <Toaster position="top-right" />

      {/* ============== PAINEL ESQUERDO — brand visual only ============== */}
      <div
        className="hidden lg:flex relative overflow-hidden flex-col"
        style={{
          width: '50%',
          background: `linear-gradient(140deg, #064e3b 0%, ${TEAL_DARK} 45%, ${TEAL} 100%)`,
        }}
      >
        {/* Curvas decorativas SVG */}
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 800 1000"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="curve1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M -50 400 Q 200 200 450 350 T 900 280 L 900 0 L 0 0 Z" fill="url(#curve1)" />
          <path d="M -50 700 Q 250 500 500 650 T 900 580" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.5" />
          <path d="M -50 760 Q 250 560 500 710 T 900 640" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1.5" />
          <path d="M -50 820 Q 250 620 500 770 T 900 700" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1.5" />
        </svg>

        {/* Blobs animados */}
        <motion.div
          aria-hidden
          className="absolute"
          style={{
            top: '20%', right: '-15%', width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* === Conteúdo: brand bem grande, centralizado === */}
        <div className="relative z-10 flex flex-col h-full justify-between p-14">
          {/* Topo: localização discreta */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 text-white/75 text-sm"
          >
            <MapPin size={13} /> Loanda — Paraná
          </motion.div>

          {/* Centro: BRAND HERO */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col items-center text-center"
          >
            <div
              className="flex items-center justify-center mb-8"
              style={{
                width: 120, height: 120, borderRadius: 32,
                background: 'rgba(255,255,255,0.22)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.4)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              }}
            >
              <Logo size={72} />
            </div>
            <h1 className="text-6xl font-bold tracking-tight leading-none" style={{ color: '#d1fae5' }}>
              SIGFEC
            </h1>
            <p className="mt-4 text-lg font-medium max-w-xs" style={{ color: '#a7f3d0' }}>
              Sistema de gestão integrada para fecularia.
            </p>

            {/* Linha decorativa */}
            <div className="mt-8 flex items-center gap-3">
              <div className="h-px w-12 bg-white/40" />
              <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
              <div className="h-px w-12 bg-white/40" />
            </div>
          </motion.div>

          {/* Rodapé fino */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center justify-between text-xs text-white/70"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck size={13} /> Conexão segura
            </span>
            <span>© {new Date().getFullYear()} SIGFEC</span>
          </motion.div>
        </div>
      </div>

      {/* ============== PAINEL DIREITO — form ============== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-md"
        >
          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div
              className="flex items-center justify-center mb-3"
              style={{
                width: 64, height: 64, borderRadius: 18,
                background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
                boxShadow: `0 10px 24px ${TEAL}55`,
              }}
            >
              <Logo size={40} />
            </div>
            <p className="text-2xl font-bold text-gray-900">SIGFEC</p>
          </div>

          {/* Cabeçalho */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1ABB9C]">
              Bem-vindo
            </p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight leading-tight" style={{ color: '#1ABB9C' }}>
              Entrar
            </h2>
            <p className="mt-2 text-base text-gray-500">
              Informe suas credenciais para acessar o sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Usuário */}
            <div>
              <label htmlFor="login" className="block text-sm font-semibold text-gray-700 mb-2">
                Usuário
              </label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-[#1ABB9C] transition" />
                <input
                  id="login"
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="seu.usuario"
                  autoComplete="username"
                  required
                  autoFocus
                  style={{ background: '#fff', color: '#1f2937' }}
                  className="w-full h-12 rounded-lg border border-gray-300 pl-12 pr-4 text-base placeholder:text-gray-400 outline-none focus:border-[#1ABB9C] focus:ring-2 focus:ring-[#1ABB9C]/15 transition"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="senha" className="block text-sm font-semibold text-gray-700">
                  Senha
                </label>
                <button type="button" className="text-xs font-semibold text-[#1ABB9C] hover:text-[#0e7c66] transition">
                  Esqueceu?
                </button>
              </div>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-[#1ABB9C] transition" />
                <input
                  id="senha"
                  type={showPw ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ background: '#fff', color: '#1f2937' }}
                  className="w-full h-12 rounded-lg border border-gray-300 pl-12 pr-12 text-base placeholder:text-gray-400 outline-none focus:border-[#1ABB9C] focus:ring-2 focus:ring-[#1ABB9C]/15 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700 transition rounded-md hover:bg-gray-100"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 accent-[#1ABB9C]"
              />
              <span className="text-sm text-gray-600">Manter conectado neste dispositivo</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="group w-full inline-flex items-center justify-center gap-2 rounded-lg h-12 text-base font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
                boxShadow: `0 6px 18px ${TEAL}45`,
              }}
            >
              {loading ? 'Entrando...' : (
                <>Acessar sistema <ArrowRight size={18} className="group-hover:translate-x-1 transition" /></>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">OU</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={usarDev}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg h-12 text-sm font-semibold text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 hover:border-[#1ABB9C]/40 transition"
          >
            <KeyRound size={16} className="text-[#1ABB9C]" />
            Preencher credenciais de desenvolvimento
          </button>

          <p className="mt-10 text-center text-xs text-gray-400">
            SIGFEC <span className="font-mono">v1.0</span> · Sistema de gestão para fecularia
          </p>
        </motion.div>
      </div>
    </div>
  );
}
