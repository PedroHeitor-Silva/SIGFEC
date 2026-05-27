/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, UserCircle, PanelLeftClose, PanelLeftOpen, Menu, X } from 'lucide-react';
import Logo from './components/Logo';
import CadastroParceiro from './pages/CadastroParceiro';
import ListaParceiros from './pages/ListaParceiros';
import PesagemLista from './pages/PesagemLista';
import TelaPesagem from './pages/TelaPesagem';
import LaboratorioLista from './pages/LaboratorioLista';
import LaboratorioForm from './pages/LaboratorioForm';
import FinanceiroListagem from './pages/FinanceiroListagem';
import FinanceiroCadastro from './pages/FinanceiroCadastro';
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
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
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
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha drawer mobile ao trocar rota
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const saved = localStorage.getItem('@sigfec:user');
    if (saved) setUser(JSON.parse(saved));
    else if (!isLogin) navigate('/login');
  }, []);

  // Redireciona se acessar path sem permissão
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
  const ModuleIcon = moduleConfig.icon;

  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
      </Routes>
    );
  }

  if (isExpress) {
    return (
      <Routes>
        <Route path="/balanca" element={<BalancaExpress />} />
      </Routes>
    );
  }

  if (location.pathname === '/mockup') {
    return (
      <Routes>
        <Route path="/mockup" element={<MockupShowcase />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans">
      {/* Backdrop mobile */}
      {user && mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {user && (
        <aside
          className={`
            ${collapsed ? 'lg:w-20' : 'lg:w-64'}
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            fixed lg:sticky top-0 left-0 z-50
            w-72 lg:w-auto h-screen
            flex flex-col bg-slate-900/95 lg:bg-slate-900/80 backdrop-blur-xl
            border-r border-slate-800 transition-all duration-300
          `}
        >
          {/* Brand */}
          <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
            {collapsed && !mobileOpen ? (
              <Logo size={32} />
            ) : (
              <Logo size={38} withText />
            )}
            {/* Botão retrair (desktop) */}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="hidden lg:inline-flex p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={collapsed ? 'Expandir' : 'Retrair'}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            {/* Botão fechar (mobile) */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* User */}
          <div className={`px-4 py-4 border-b border-slate-800 ${collapsed && !mobileOpen ? 'lg:hidden' : ''}`}>
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <UserCircle size={18} className="text-emerald-400" />
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.login || user.nome}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 truncate">
                  {PERFIS[user.perfilAcesso] ?? user.perfilAcesso ?? user.perfil?.nome ?? 'Usuário'}
                </p>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
            </div>
          </div>

          {/* Nav sections */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {SECTIONS.map((sec) => {
              const itemsAllowed = sec.items.filter((key) => canAccessModule(user?.perfilAcesso, key));
              if (!itemsAllowed.length) return null;
              return (
                <div key={sec.label} className="mb-5">
                  <p className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 ${collapsed && !mobileOpen ? 'lg:hidden' : ''}`}>
                    {sec.label}
                  </p>
                  <div className="space-y-1">
                    {itemsAllowed.map((key) => (
                      <NavItem
                        key={key}
                        to={PATHS[key]}
                        moduleKey={key}
                        currentPath={location.pathname}
                        collapsed={collapsed && !mobileOpen}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 py-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition ${collapsed && !mobileOpen ? 'lg:justify-center' : ''}`}
            >
              <LogOut size={16} className="shrink-0" />
              <span className={collapsed && !mobileOpen ? 'lg:hidden' : ''}>Sair</span>
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Top bar — module-aware accent */}
        {user && (
          <header className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
            <div className={`h-0.5 ${moduleConfig.bar} opacity-70`} />
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Hamburger mobile */}
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Menu"
                >
                  <Menu size={20} />
                </button>
                <ModuleIcon size={16} className={`${moduleConfig.text} shrink-0`} />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 truncate">
                  <span className="hidden sm:inline">{moduleConfig.section} <span className="text-slate-700 mx-1">›</span></span>
                  <span className="text-white">{moduleConfig.label}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('sigfec:open-palette'))}
                  className="hidden md:inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 hover:border-emerald-500/30 hover:text-emerald-400 transition"
                  title="Busca global"
                >
                  <span className="text-slate-500">Buscar</span>
                  <kbd className="rounded border border-slate-700 bg-slate-900 px-1 text-[10px] font-mono">Ctrl K</kbd>
                </button>
                <NotificationBell />
                <span className="hidden xl:flex items-center gap-2 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
            </div>
          </header>
        )}

        {/* Page area with module gradient wash */}
        <main className="flex-1 relative">
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b ${moduleConfig.gradient} opacity-40`}
          />
          <div className="relative p-4 sm:p-6">
            <div key={location.pathname}>
              <Routes>
                <Route path="/login" element={<Login setUser={setUser} />} />
                <Route path="/" element={<Page><Home /></Page>} />
                <Route path="/cadastros" element={<Page><DashboardCadastros /></Page>} />
                <Route path="/parceiros" element={<Page><ListaParceiros /></Page>} />
                <Route path="/parceiros/novo" element={<Page><CadastroParceiro /></Page>} />
                <Route path="/parceiros/:id" element={<Page><HistoricoParceiro /></Page>} />
                <Route path="/motoristas" element={<Page><MotoristaLista /></Page>} />
                <Route path="/motoristas/novo" element={<Page><CadastroPage tipo="MOTORISTA" /></Page>} />
                <Route path="/veiculos" element={<Page><VeiculoLista /></Page>} />
                <Route path="/veiculos/novo" element={<Page><CadastroPage tipo="VEICULO" /></Page>} />
                <Route path="/produtos" element={<Page><ProdutoLista /></Page>} />
                <Route path="/produtos/novo" element={<Page><CadastroPage tipo="PRODUTO" /></Page>} />
                <Route path="/usuarios" element={<Page><UsuarioLista /></Page>} />
                <Route path="/usuarios/novo" element={<Page><CadastroPage tipo="USUARIO" /></Page>} />
                <Route path="/pesagem" element={<Page><PesagemLista /></Page>} />
                <Route path="/pesagem/novo" element={<Page><TelaPesagem /></Page>} />
                <Route path="/pesagem/mandioca" element={<Page><TelaPesagem /></Page>} />
                <Route path="/laboratorio" element={<Page><LaboratorioLista /></Page>} />
                <Route path="/laboratorio/novo" element={<Page><LaboratorioForm /></Page>} />
                <Route path="/lotes" element={<Page><LoteLista /></Page>} />
                <Route path="/lotes/novo" element={<Page><LoteForm /></Page>} />
                <Route path="/romaneio" element={<Page><RomaneioDiario /></Page>} />
                <Route path="/produtos/precos" element={<Page><TabelaPrecos /></Page>} />
                <Route path="/financeiro" element={<Page><FinanceiroListagem /></Page>} />
                <Route path="/financeiro/novo" element={<Page><FinanceiroCadastro /></Page>} />
                <Route path="/estoque" element={<Page><EstoqueListagem /></Page>} />
                <Route path="/estoque/novo" element={<Page><EstoqueCadastro /></Page>} />
                <Route path="/vendas" element={<Page><VendaLista /></Page>} />
                <Route path="/vendas/nova" element={<Page><VendaForm /></Page>} />
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

  const activeCls = `${m.bg} ${m.text} border ${m.border} shadow-lg ${m.glow}`;
  const inactiveCls = 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent';

  return (
    <Link
      to={to}
      title={collapsed ? m.label : undefined}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${collapsed ? 'justify-center' : ''} ${isActive ? activeCls : inactiveCls}`}
    >
      {isActive && !collapsed && (
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 ${m.bar} rounded-r-full`} />
      )}
      <Icon size={17} className="shrink-0" />
      {!collapsed && <span>{m.label}</span>}
    </Link>
  );
}

function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
