/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, AlertCircle, Beaker, DollarSign, TrendingDown, Calendar, CheckCircle2, Package, IdCard } from 'lucide-react';
import api from '../services/api';
import { formatarQtd } from '../utils/unidades';

const fmtMoney = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const fmtDate = (v) => v ? new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-';

const daysUntil = (dateStr) => {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.floor((target - now) / (1000 * 60 * 60 * 24));
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Perfil do usuário logado — só ADMIN vê alertas de estoque
  const perfilUser = (() => {
    try { return JSON.parse(localStorage.getItem('@sigfec:user') || '{}').perfilAcesso; }
    catch { return null; }
  })();
  // Estoque baixo: ADMIN (gerente) e PRODUCAO veem
  const veEstoque = perfilUser === 'ADMIN' || perfilUser === 'PRODUCAO';

  useEffect(() => {
    Promise.allSettled([
      api.get('/financeiro'),
      api.get('/laboratorio'),
      api.get('/pesagens'),
      api.get('/estoque'),
      api.get('/motoristas'),
    ]).then(([fin, lab, pes, est, mot]) => {
      const lista = (r) => (r.status === 'fulfilled' && Array.isArray(r.value.data) ? r.value.data : []);
      const titulos = lista(fin);
      const analises = lista(lab);
      const pesagens = lista(pes);
      const estoques = lista(est);
      const motoristas = lista(mot);

      const alerts = [];

      // === CNH vencida ou a vencer (<=30 dias) — ADMIN + PRODUCAO ===
      if (veEstoque) {
        motoristas.forEach((m) => {
          if (!m.validadeCnh || m.statusAtivo === false) return;
          const dias = Math.floor((new Date(m.validadeCnh + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24));
          if (dias < 0) {
            alerts.push({
              type: 'cnh-vencida', icon: IdCard, accent: 'rose',
              title: 'CNH vencida',
              desc: `${m.nome} — habilitação vencida há ${Math.abs(dias)} dia(s)`,
              date: m.validadeCnh, link: '/motoristas',
            });
          } else if (dias <= 30) {
            alerts.push({
              type: 'cnh-vencer', icon: IdCard, accent: 'amber',
              title: 'CNH a vencer',
              desc: `${m.nome} — habilitação vence em ${dias} dia(s)`,
              date: m.validadeCnh, link: '/motoristas',
            });
          }
        });
      }

      // === Estoque baixo (ADMIN + PRODUCAO) ===
      if (veEstoque) {
        estoques.forEach((e) => {
          const atual = Number(e.quantidadeAtual || 0);
          const min = Number(e.quantidadeMinima || 0);
          if (min > 0 && atual <= min) {
            const zerado = atual <= 0;
            const un = e.produto?.unidadeMedida;
            alerts.push({
              type: 'estoque-baixo',
              icon: Package,
              accent: zerado ? 'rose' : 'amber',
              title: zerado ? 'Estoque ZERADO' : 'Estoque baixo',
              desc: `${e.produto?.nome || 'Produto'} — ${formatarQtd(atual, un)} (mínimo ${formatarQtd(min, un)})`,
              date: e.ultimaAtualizacao || new Date().toISOString(),
              link: '/estoque',
            });
          }
        });
      }

      // Vencimentos próximos (<=7 dias) e atrasados
      titulos.filter((t) => t.statusFinanceiro === 'ABERTO' || t.statusFinanceiro === 'ATRASADO').forEach((t) => {
        const days = daysUntil(t.dataVencimento);
        if (days < 0) {
          alerts.push({
            type: 'atrasado', icon: AlertCircle, accent: 'rose',
            title: `${t.fornecedor ? 'A pagar' : 'A receber'} atrasado`,
            desc: `${fmtMoney(t.valorOriginal)} venceu há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`,
            date: t.dataVencimento, link: '/financeiro',
          });
        } else if (days <= 7) {
          alerts.push({
            type: 'vencimento', icon: Calendar, accent: 'amber',
            title: `Vencimento próximo`,
            desc: `${fmtMoney(t.valorOriginal)} vence em ${days} dia${days === 1 ? '' : 's'}`,
            date: t.dataVencimento, link: '/financeiro',
          });
        }
      });

      // Pesagens sem análise vinculada
      const analiseIds = new Set(analises.map((a) => a.pesagem?.id).filter(Boolean));
      pesagens.filter((p) => !analiseIds.has(p.id)).slice(0, 5).forEach((p) => {
        alerts.push({
          type: 'sem-analise', icon: Beaker, accent: 'fuchsia',
          title: 'Pesagem sem análise',
          desc: `Carga #${p.id} (${p.produtorNome || 'sem produtor'}) aguarda laudo`,
          date: p.dataHoraEntrada, link: '/laboratorio/novo',
        });
      });

      // Análises reprovadas
      analises.filter((a) => a.statusQualidade === 'REPROVADO').slice(0, 3).forEach((a) => {
        alerts.push({
          type: 'reprovado', icon: AlertCircle, accent: 'rose',
          title: 'Análise reprovada',
          desc: `Análise #${a.id} — renda média ${Number(a.rendaMedia || 0).toFixed(0)} g`,
          date: a.dataCriacao, link: '/laboratorio',
        });
      });

      // Ordena por data desc (mais recentes primeiro)
      alerts.sort((a, b) => new Date(b.date) - new Date(a.date));
      setItems(alerts.slice(0, 10));
      setLoading(false);
    });
  }, []);

  const unread = items.length;

  const ACCENT = {
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition"
        title="Notificações"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 w-80 max-h-[70vh] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div>
                <p className="text-sm font-bold text-white">Notificações</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">{unread} {unread === 1 ? 'alerta' : 'alertas'} ativo{unread === 1 ? '' : 's'}</p>
              </div>
              <Bell size={14} className="text-emerald-400" />
            </div>

            <div className="max-h-[55vh] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-xs text-slate-500">Carregando...</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 size={32} className="text-emerald-400/40 mx-auto mb-3" />
                  <p className="text-sm font-bold text-white">Tudo em dia</p>
                  <p className="text-xs text-slate-500 mt-1">Sem alertas pendentes</p>
                </div>
              ) : (
                items.map((n, i) => {
                  const Icon = n.icon;
                  const a = ACCENT[n.accent];
                  return (
                    <Link
                      key={i}
                      to={n.link}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/40 transition"
                    >
                      <div className={`shrink-0 mt-0.5 p-1.5 rounded-md border ${a}`}>
                        <Icon size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.desc}</p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-600 mt-1">{fmtDate(n.date)}</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-800 px-4 py-2 bg-slate-950/50 text-[10px] text-slate-500 text-center">
              Atualiza a cada acesso
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
