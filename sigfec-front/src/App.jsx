/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, ChevronRight, Menu, X, Search, Sun, Moon } from 'lucide-react';
import Logo from './components/Logo';
import CadastroParceiro from './pages/CadastroParceiro';
import ListaParceiros from './pages/ListaParceiros';
import PesagemLista from './pages/PesagemLista';
import TelaPesagem from './pages/TelaPesagem';
import FilaPatio from './pages/FilaPatio';
import ChecklistCargaForm from './pages/ChecklistCargaForm';
import PainelChamadas from './pages/PainelChamadas';
import LaboratorioLista from './pages/LaboratorioLista';
import LaboratorioForm from './pages/LaboratorioForm';
import FinanceiroListagem from './pages/FinanceiroListagem';
import FinanceiroCadastro from './pages/FinanceiroCadastro';
import Relatorios from './pages/Relatorios';
import EstoqueListagem from './pages/EstoqueListagem';
import EstoqueCadastro from './pages/EstoqueCadastro';
import Home from './pages/Home';
import Login from './pages/Login';
import DashboardCadastros from './pages/DashboardCadastros';
import MotoristaLista from './pages/MotoristaLista';
import HistoricoParceiro from './pages/HistoricoParceiro';
import VeiculoLista from './pages/VeiculoLista';
import ProdutoLista from './pages/ProdutoLista';
import UsuarioLista from './pages/UsuarioLista';
import CadastroPage from './pages/CadastroPage';
import BalancaExpress from './pages/BalancaExpress';
import LoteLista from './pages/LoteLista';
import LoteForm from './pages/LoteForm';
import RomaneioDiario from './pages/RomaneioDiario';
import TabelaPrecos from './pages/TabelaPrecos';
import VendaLista from './pages/VendaLista';
import VendaForm from './pages/VendaForm';
import MockupShowcase from './pages/MockupShowcase';
import { MODULES, SECTIONS, PATHS, moduleFromPath } from './theme/modules.jsx';
import { canAccessModule, canAccessPath, PERFIS } from './theme/permissions';
import ConfirmDialog from './components/ConfirmDialog';
import ProgressBar from './components/ProgressBar';
import CommandPalette from './components/CommandPalette';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import NotificationBell from './components/NotificationBell';
import InstallAppButton from './components/InstallAppButton';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            fontSize: '13px',
          },
        }}
      />
      <ProgressBar />
      <ConfirmDialog />
      <CommandPalette />
      <KeyboardShortcuts />
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const isExpress = location.pathname === '/balanca';
  const isPainel = location.pathname === '/painel-fila';
  const isMockup = location.pathname === '/mockup';
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('@sigfec:theme') || 'light');

  // Aplica tema no <html> e persiste
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('@sigfec:theme', theme);
  }, [theme]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const saved = localStorage.getItem('@sigfec:user');
    if (saved) setUser(JSON.parse(saved));
    else if (!isLogin) navigate('/login');
  }, []);

  useEffect(() => {
    if (!user || isLogin || isExpress) return;
    if (!canAccessPath(user.perfilAcesso, location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [user, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('@sigfec:user');
    setUser(null);
    navigate('/login');
  };

  const currentModule = moduleFromPath(location.pathname);
  const moduleConfig = MODULES[currentModule];

  if (isLogin) {
    return <Routes><Route path="/login" element={<Login setUser={setUser} />} /></Routes>;
  }
  if (isExpress) {
    return <Routes><Route path="/balanca" element={<BalancaExpress />} /></Routes>;
  }
  if (isPainel) {
    return <Routes><Route path="/painel-fila" element={<PainelChamadas />} /></Routes>;
  }
  if (isMockup) {
    return <Routes><Route path="/mockup" element={<MockupShowcase />} /></Routes>;
  }

  return (
    <div className="flex min-h-screen" style={{ background: theme === 'dark' ? '#020617' : '#f5f7fa', color: theme === 'dark' ? '#f1f5f9' : '#1f2937' }}>
      {user && mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-gray-900/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* === SIDEBAR (dark navy, ainda maior) === */}
      {user && (
        <aside
          style={{ background: '#1e293b', color: '#e5e7eb' }}
          className={`
            ${collapsed ? 'lg:w-28' : 'lg:w-96'}
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            fixed lg:sticky top-0 left-0 z-50
            w-[85vw] max-w-96 lg:max-w-none lg:w-auto h-screen flex flex-col
            transition-all duration-200
          `}
        >
          <div className="flex items-center justify-between px-7 h-24" style={{ borderBottom: '1px solid #334155' }}>
            <div className="flex items-center gap-4 min-w-0">
              <Logo size={48} />
              {!collapsed && <span className="text-2xl font-bold tracking-tight" style={{ color: '#fff' }}>SIGFEC</span>}
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-2 rounded-md"
              style={{ color: '#94a3b8' }}
            ><X size={22} /></button>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-5">
            {SECTIONS.map((sec) => {
              const itemsAllowed = sec.items.filter((key) => canAccessModule(user?.perfilAcesso, key));
              if (!itemsAllowed.length) return null;
              return (
                <div key={sec.label} className="mb-8">
                  {!collapsed && (
                    <p className="px-3 mb-3 text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: '#64748b' }}>
                      {sec.label}
                    </p>
                  )}
                  <div className="space-y-2">
                    {itemsAllowed.map((key) => (
                      <NavItem key={key} to={PATHS[key]} moduleKey={key}
                        currentPath={location.pathname} collapsed={collapsed} />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          <div style={{ borderTop: '1px solid #334155' }}>
            <div className={`flex items-center gap-4 px-6 py-5 ${collapsed ? 'justify-center' : ''}`}>
              <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold"
                style={{ background: 'rgba(26,187,156,0.18)', color: '#1ABB9C', border: '1px solid rgba(26,187,156,0.35)' }}>
                {(user.nome || user.login || 'U').charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate" style={{ color: '#f1f5f9' }}>{user.login || user.nome}</p>
                  <p className="text-xs uppercase tracking-wider truncate mt-0.5" style={{ color: '#94a3b8' }}>
                    {PERFIS[user.perfilAcesso] ?? user.perfilAcesso ?? 'Usuário'}
                  </p>
                </div>
              )}
            </div>
            <div className="flex" style={{ borderTop: '1px solid #334155' }}>
              <button
                type="button" onClick={handleLogout}
                className="flex-1 inline-flex items-center justify-center gap-2.5 px-3 py-4 text-base font-medium transition"
                style={{ color: '#cbd5e1' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244,63,94,0.12)'; e.currentTarget.style.color = '#fda4af'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; }}
              >
                <LogOut size={20} />
                {!collapsed && <span>Sair</span>}
              </button>
              <button
                type="button" onClick={() => setCollapsed((c) => !c)}
                className="hidden lg:inline-flex items-center justify-center w-16 transition"
                style={{ borderLeft: '1px solid #334155', color: '#94a3b8' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                title={collapsed ? 'Expandir' : 'Recolher'}
              >
                {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* === TOP BAR maior, com busca proeminente e toggle de tema === */}
        {user && (
          <header
            className="sticky top-0 z-20"
            style={{
              background: theme === 'dark' ? '#0f172a' : '#fff',
              borderBottom: `1px solid ${theme === 'dark' ? '#1e293b' : '#e5e7eb'}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-center justify-between gap-4 px-5 sm:px-8 h-20">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <button
                  type="button" onClick={() => setMobileOpen(true)}
                  className="lg:hidden p-2 -ml-1 rounded-md"
                  style={{ color: theme === 'dark' ? '#cbd5e1' : '#4b5563' }}
                ><Menu size={22} /></button>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: theme === 'dark' ? '#64748b' : '#94a3b8' }}>
                    {moduleConfig.section}
                  </p>
                  <h2 className="text-lg sm:text-xl font-bold truncate"
                    style={{ color: theme === 'dark' ? '#f1f5f9' : '#1f2937' }}>
                    {moduleConfig.label}
                  </h2>
                </div>

                {/* Busca grande — só desktop */}
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('sigfec:open-palette'))}
                  className="hidden lg:flex items-center gap-3 ml-auto max-w-md flex-1 rounded-lg px-4 py-2.5 text-sm transition"
                  style={{
                    background: theme === 'dark' ? '#1e293b' : '#f5f7fa',
                    border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`,
                    color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  }}
                >
                  <Search size={16} />
                  <span className="flex-1 text-left">Buscar no sistema...</span>
                  <kbd className="rounded px-1.5 py-0.5 text-[10px] font-mono"
                    style={{
                      background: theme === 'dark' ? '#0f172a' : '#fff',
                      border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`,
                    }}>Ctrl K</kbd>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <InstallAppButton theme={theme} />
                {/* Toggle dark/light */}
                <button
                  type="button"
                  onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                  title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                  className="p-2.5 rounded-md transition"
                  style={{
                    color: theme === 'dark' ? '#fbbf24' : '#475569',
                    background: theme === 'dark' ? 'rgba(251,191,36,0.1)' : '#f5f7fa',
                  }}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <NotificationBell />
              </div>
            </div>
          </header>
        )}

        <main className="flex-1" style={{ background: theme === 'dark' ? '#020617' : '#f5f7fa' }}>
          <div className="mx-auto w-full max-w-[1500px] px-5 sm:px-8 lg:px-10 py-8">
            <div key={location.pathname}>
              <Routes>
                <Route path="/login" element={<Login setUser={setUser} />} />
                <Route path="/" element={<Home />} />
                <Route path="/cadastros" element={<DashboardCadastros />} />
                <Route path="/parceiros" element={<ListaParceiros />} />
                <Route path="/parceiros/novo" element={<CadastroParceiro />} />
                <Route path="/parceiros/:id" element={<HistoricoParceiro />} />
                <Route path="/motoristas" element={<MotoristaLista />} />
                <Route path="/motoristas/novo" element={<CadastroPage tipo="MOTORISTA" />} />
                <Route path="/veiculos" element={<VeiculoLista />} />
                <Route path="/veiculos/novo" element={<CadastroPage tipo="VEICULO" />} />
                <Route path="/produtos" element={<ProdutoLista />} />
                <Route path="/produtos/novo" element={<CadastroPage tipo="PRODUTO" />} />
                <Route path="/usuarios" element={<UsuarioLista />} />
                <Route path="/usuarios/novo" element={<CadastroPage tipo="USUARIO" />} />
                <Route path="/fila" element={<FilaPatio />} />
                <Route path="/fila/checklist/:entradaId" element={<ChecklistCargaForm />} />
                <Route path="/pesagem" element={<PesagemLista />} />
                <Route path="/pesagem/novo" element={<TelaPesagem />} />
                <Route path="/pesagem/mandioca" element={<TelaPesagem />} />
                <Route path="/laboratorio" element={<LaboratorioLista />} />
                <Route path="/laboratorio/novo" element={<LaboratorioForm />} />
                <Route path="/lotes" element={<LoteLista />} />
                <Route path="/lotes/novo" element={<LoteForm />} />
                <Route path="/romaneio" element={<RomaneioDiario />} />
                <Route path="/produtos/precos" element={<TabelaPrecos />} />
                <Route path="/financeiro" element={<FinanceiroListagem />} />
                <Route path="/financeiro/novo" element={<FinanceiroCadastro />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/estoque" element={<EstoqueListagem />} />
                <Route path="/estoque/novo" element={<EstoqueCadastro />} />
                <Route path="/vendas" element={<VendaLista />} />
                <Route path="/vendas/nova" element={<VendaForm />} />
                <Route path="*" element={<PaginaNaoEncontrada />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, moduleKey, currentPath, collapsed }) {
  const m = MODULES[moduleKey];
  const Icon = m.icon;
  const isActive = to === '/' ? currentPath === '/' : currentPath === to || currentPath.startsWith(`${to}/`);

  const base = {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: collapsed ? '16px 0' : '15px 18px',
    borderRadius: 10, fontSize: 16, fontWeight: 500,
    justifyContent: collapsed ? 'center' : 'flex-start',
    position: 'relative', transition: 'background 140ms, color 140ms',
    textDecoration: 'none',
  };
  const active = { background: 'rgba(26,187,156,0.14)', color: '#1ABB9C' };
  const inactive = { color: '#cbd5e1' };

  return (
    <Link
      to={to}
      title={collapsed ? m.label : undefined}
      style={{ ...base, ...(isActive ? active : inactive) }}
      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; } }}
    >
      {isActive && (
        <span style={{
          position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
          borderRadius: '0 4px 4px 0', background: '#1ABB9C',
        }} />
      )}
      <Icon size={24} style={{ flexShrink: 0, color: isActive ? '#1ABB9C' : '#94a3b8' }} />
      {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>}
    </Link>
  );
}

/** Endereço que não existe: em vez de tela vazia, explica e oferece o caminho de volta. */
function PaginaNaoEncontrada() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <p className="text-6xl font-bold text-slate-700 font-mono">404</p>
      <h1 className="mt-4 text-xl font-bold text-white">Página não encontrada</h1>
      <p className="mt-1 text-sm text-slate-500">O endereço digitado não existe no SIGFEC.</p>
      <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition">
        Voltar ao dashboard
      </Link>
    </div>
  );
}
