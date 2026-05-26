/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, ArrowRight, LayoutDashboard, Users, Weight, Beaker,
  Package, DollarSign, UserCircle, IdCard, Truck, UserCog, Plus, Scale, Boxes, ClipboardList, ShoppingCart,
} from 'lucide-react';
import api from '../services/api';

const ACTIONS = [
  { type: 'page', label: 'Dashboard', icon: LayoutDashboard, path: '/', kbd: 'D' },
  { type: 'page', label: 'Parceiros', icon: Users, path: '/parceiros' },
  { type: 'page', label: 'Motoristas', icon: IdCard, path: '/motoristas' },
  { type: 'page', label: 'Veículos', icon: Truck, path: '/veiculos' },
  { type: 'page', label: 'Produtos', icon: Package, path: '/produtos' },
  { type: 'page', label: 'Tabela de Preços', icon: Package, path: '/produtos/precos' },
  { type: 'page', label: 'Usuários', icon: UserCog, path: '/usuarios' },
  { type: 'page', label: 'Pesagens', icon: Weight, path: '/pesagem' },
  { type: 'page', label: 'Romaneio do Pátio', icon: ClipboardList, path: '/romaneio' },
  { type: 'page', label: 'Laboratório', icon: Beaker, path: '/laboratorio' },
  { type: 'page', label: 'Lotes Produção', icon: Boxes, path: '/lotes' },
  { type: 'page', label: 'Estoque', icon: Package, path: '/estoque' },
  { type: 'page', label: 'Vendas', icon: ShoppingCart, path: '/vendas' },
  { type: 'page', label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
  { type: 'page', label: 'Cadastros', icon: UserCircle, path: '/cadastros' },
  { type: 'action', label: 'Modo Balança Express (fullscreen)', icon: Scale, path: '/balanca', accent: 'emerald' },
  { type: 'action', label: 'Nova Pesagem', icon: Scale, path: '/pesagem/mandioca', kbd: 'F2', accent: 'amber' },
  { type: 'action', label: 'Nova Análise', icon: Beaker, path: '/laboratorio/novo', kbd: 'F3', accent: 'fuchsia' },
  { type: 'action', label: 'Novo Parceiro', icon: Plus, path: '/parceiros/novo', accent: 'cyan' },
  { type: 'action', label: 'Novo Motorista', icon: Plus, path: '/motoristas/novo', accent: 'sky' },
  { type: 'action', label: 'Novo Veículo', icon: Plus, path: '/veiculos/novo', accent: 'amber' },
  { type: 'action', label: 'Novo Lote de Produção', icon: Plus, path: '/lotes/novo', accent: 'emerald' },
  { type: 'action', label: 'Novo Lote Estoque', icon: Plus, path: '/estoque/novo', accent: 'sky' },
  { type: 'action', label: 'Nova Venda', icon: ShoppingCart, path: '/vendas/nova', accent: 'emerald' },
  { type: 'action', label: 'Novo Lançamento Financeiro', icon: Plus, path: '/financeiro/novo', accent: 'lime' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [parceiros, setParceiros] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // global toggle Ctrl+K / Cmd+K or via custom event
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    const onCustom = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('sigfec:open-palette', onCustom);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('sigfec:open-palette', onCustom);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      // lazy load parceiros pra busca
      if (parceiros.length === 0) {
        api.get('/parceiros').then(({ data }) => setParceiros(data || [])).catch(() => {});
      }
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [
      ...ACTIONS,
      ...parceiros.map((p) => ({
        type: 'parceiro', label: p.nome, sub: p.documento, icon: Users,
        path: `/parceiros/${p.id}`, accent: 'cyan',
      })),
    ];
    if (!q) return all.slice(0, 10);
    return all.filter((a) =>
      a.label.toLowerCase().includes(q) || (a.sub || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query, parceiros]);

  useEffect(() => { setSelected(0); }, [query]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[selected];
      if (r) { navigate(r.path); setOpen(false); }
    }
  };

  if (typeof document === 'undefined') return null;

  const ACCENT = {
    amber: 'text-amber-400 bg-amber-500/10',
    fuchsia: 'text-fuchsia-400 bg-fuchsia-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    sky: 'text-sky-400 bg-sky-500/10',
    lime: 'text-lime-400 bg-lime-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-[150] flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.96, y: -8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: -8 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl mx-4 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
              <Search size={16} className="text-slate-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar páginas, ações, parceiros..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
              />
              <kbd className="hidden sm:inline-flex items-center rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                Esc
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-1">
              {results.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Nenhum resultado para "{query}"</div>
              ) : (
                results.map((r, i) => {
                  const Icon = r.icon;
                  const a = ACCENT[r.accent] || 'text-slate-400 bg-slate-800';
                  const isSel = selected === i;
                  return (
                    <button
                      key={`${r.path}-${i}`}
                      type="button"
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => { navigate(r.path); setOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${isSel ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                    >
                      <div className={`p-1.5 rounded-md ${a}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{r.label}</p>
                        {r.sub && <p className="text-[11px] text-slate-500 font-mono truncate">{r.sub}</p>}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-600">
                        {r.type === 'parceiro' ? 'Parceiro' : r.type === 'action' ? 'Ação' : 'Página'}
                      </span>
                      {r.kbd && (
                        <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                          {r.kbd}
                        </kbd>
                      )}
                      <ArrowRight size={12} className={`text-slate-600 ${isSel ? 'text-emerald-400' : ''}`} />
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-950/50 text-[10px] text-slate-600">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-700 px-1">↑↓</kbd> navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-700 px-1">↵</kbd> abrir
                </span>
              </div>
              <span>SIGFEC</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
