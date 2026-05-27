/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Lock, ArrowRight, Scale, Beaker, Truck, Wheat,
  ShieldCheck, Eye, EyeOff, CheckCircle2, Sparkles, MapPin,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../services/api';
import Logo from '../components/Logo';

const FEATURES = [
  { icon: Scale,  title: 'Pesagem',     desc: 'Balança e cálculo automático' },
  { icon: Beaker, title: 'Laboratório', desc: 'Renda e análise química' },
  { icon: Truck,  title: 'Logística',   desc: 'Motoristas e veículos' },
  { icon: Wheat,  title: 'Produção',    desc: 'Lotes e rastreabilidade' },
];

const STATS = [
  { value: 400,  suffix: 't/dia', label: 'Processamento' },
  { value: 30,   suffix: '+',     label: 'Anos no mercado' },
  { value: 100,  suffix: '%',     label: 'Rastreabilidade' },
];

// Contador animado para chamar atenção
function Counter({ to, suffix }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1400;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span>{n}{suffix}</span>;
}

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

  return (
    <div className="min-h-screen flex" style={{ background: '#f5f7fa' }}>
      <Toaster position="top-right" />

      {/* ============ PAINEL ESQUERDO (institucional, animado) ============ */}
      <div
        className="hidden lg:flex relative overflow-hidden"
        style={{
          width: '55%',
          background: 'linear-gradient(135deg, #064e3b 0%, #0e7c66 35%, #1ABB9C 75%, #2dd4bf 100%)',
        }}
      >
        {/* Padrão de pontos */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.13) 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
            opacity: 0.35,
          }}
        />

        {/* Blobs orgânicos animados (movem lentamente) */}
        <motion.div
          aria-hidden
          className="absolute"
          style={{
            top: '-15%', right: '-12%', width: 520, height: 520, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 65%)',
            filter: 'blur(20px)',
          }}
          animate={{ x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute"
          style={{
            bottom: '-22%', left: '-10%', width: 560, height: 560, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(45,212,191,0.45) 0%, transparent 65%)',
            filter: 'blur(24px)',
          }}
          animate={{ x: [0, -40, 0], y: [0, -25, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute"
          style={{
            top: '40%', left: '20%', width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(167,243,208,0.25) 0%, transparent 70%)',
            filter: 'blur(28px)',
          }}
          animate={{ x: [0, 50, -30, 0], y: [0, -40, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col justify-between w-full max-w-2xl mx-auto px-14 py-12">
          {/* Topo: brand com pulse no logo */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <motion.div
              className="flex items-center justify-center relative"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'rgba(255,255,255,0.22)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.4)',
              }}
              animate={{ boxShadow: [
                '0 0 0 0 rgba(255,255,255,0.3)',
                '0 0 0 12px rgba(255,255,255,0)',
                '0 0 0 0 rgba(255,255,255,0)',
              ]}}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
            >
              <Logo size={32} />
            </motion.div>
            <div>
              <p className="text-xl font-bold text-white tracking-tight leading-none">SIGFEC</p>
              <p className="text-xs text-white/80 mt-0.5 flex items-center gap-1.5">
                <MapPin size={10} /> Fecularia Loanda — PR
              </p>
            </div>
          </motion.div>

          {/* Centro: hero */}
          <div className="space-y-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <span
                className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.32)',
                  padding: '6px 14px',
                  borderRadius: 999,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Sparkles size={11} />
                Sistema integrado de gestão
              </span>
              <h1 className="mt-5 text-5xl font-bold text-white leading-[1.04] tracking-tight">
                Da mandioca<br />
                <span style={{ color: '#d1fae5' }}>ao cliente final.</span>
              </h1>
              <p className="mt-4 text-base text-white/85 max-w-md leading-relaxed">
                Pesagem, laboratório, produção, estoque, vendas e financeiro
                em uma única plataforma corporativa.
              </p>
            </motion.div>

            {/* Features grid (glass cards, stagger) */}
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="flex items-start gap-3 p-4 rounded-xl cursor-default"
                    style={{
                      background: 'rgba(255,255,255,0.14)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: 'rgba(255,255,255,0.22)',
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    >
                      <Icon size={17} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{f.title}</p>
                      <p className="text-[12px] text-white/75 mt-0.5 leading-snug">{f.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Rodapé: stats animadas + selo segurança */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="space-y-4"
          >
            <div
              className="grid grid-cols-3 gap-2 px-5 py-4 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-bold text-white tracking-tight">
                    <Counter to={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-white/70 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/75">
              <div className="flex items-center gap-2">
                <ShieldCheck size={13} />
                <span>Conexão segura • JWT autenticado</span>
              </div>
              <p>© {new Date().getFullYear()} SIGFEC</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ============ PAINEL DIREITO (formulário) ============ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        {/* Acento sutil no fundo direito (light) */}
        <div
          aria-hidden
          className="absolute"
          style={{
            top: '-10%', right: '-15%', width: 360, height: 360, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,187,156,0.08) 0%, transparent 70%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md relative"
        >
          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <motion.div
              className="flex items-center justify-center mb-3"
              style={{
                width: 60, height: 60, borderRadius: 14,
                background: 'linear-gradient(135deg, #1ABB9C, #16a085)',
                boxShadow: '0 8px 24px rgba(26,187,156,0.3)',
              }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Logo size={36} />
            </motion.div>
            <p className="text-xl font-bold text-gray-800">SIGFEC</p>
            <p className="text-xs text-gray-500">Fecularia Loanda</p>
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#1ABB9C' }}>
              Bem-vindo de volta
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-800 tracking-tight">
              Acessar o sistema
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Use suas credenciais corporativas para entrar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Login */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">USUÁRIO</label>
              <div className="relative group">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-[#1ABB9C] transition" />
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Digite seu usuário"
                  autoComplete="username"
                  required
                  autoFocus
                  style={{ background: '#fff', color: '#1f2937' }}
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-3 text-sm placeholder:text-gray-400 outline-none focus:border-[#1ABB9C] transition"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700">SENHA</label>
                <button type="button" className="text-[11px] font-semibold text-gray-400 hover:text-[#1ABB9C] transition">
                  Esqueci a senha
                </button>
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-[#1ABB9C] transition" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ background: '#fff', color: '#1f2937' }}
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-11 py-3 text-sm placeholder:text-gray-400 outline-none focus:border-[#1ABB9C] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 transition"
                  title={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botão entrar (com shimmer) */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="group w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1ABB9C 0%, #16a085 100%)',
                boxShadow: '0 6px 18px rgba(26,187,156,0.38)',
              }}
            >
              {/* Shimmer animado */}
              <motion.span
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
              />
              <span className="relative inline-flex items-center gap-2">
                {loading ? 'Entrando...' : (
                  <>Acessar sistema <ArrowRight size={15} className="group-hover:translate-x-0.5 transition" /></>
                )}
              </span>
            </motion.button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] uppercase tracking-widest text-gray-400">Modo desenvolvimento</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="rounded-lg p-4 text-xs text-gray-600 flex items-start gap-3"
            style={{ background: '#f0fdf9', border: '1px solid #a7f3d0' }}
          >
            <CheckCircle2 size={16} style={{ color: '#1ABB9C' }} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-800">Credenciais de teste</p>
              <p className="mt-1">
                Usuário: <code className="font-mono font-semibold" style={{ color: '#0e7c66' }}>admin</code>
                <span className="mx-2 text-gray-300">•</span>
                Senha: <code className="font-mono font-semibold" style={{ color: '#0e7c66' }}>admin</code>
              </p>
            </div>
          </motion.div>

          <p className="mt-10 text-center text-[11px] text-gray-400">
            SIGFEC v1.0 — Sistema de gestão para Fecularia Loanda
          </p>
        </motion.div>
      </div>
    </div>
  );
}
