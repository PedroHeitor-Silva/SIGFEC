/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, X, Save, Check, Minus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  ACOES, MODULOS_PERMISSAO, canDo,
} from '../theme/permissions';

/**
 * Matriz de permissões granulares por usuário.
 * Cada célula = "modulo:acao". Estado tem 3 valores:
 *  - 'default'  — segue regra padrão do perfil (não força nada)
 *  - 'liberado' — força LIBERAR (vai pra permissoesExtras)
 *  - 'negado'   — força NEGAR (vai pra permissoesNegadas)
 *
 * Click cicla entre os 3 estados.
 */
export default function PermissoesModal({ open, usuario, onClose, onSaved }) {
  const [matriz, setMatriz] = useState({}); // { 'modulo:acao': 'liberado'|'negado' }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !usuario) return;
    const m = {};
    (usuario.permissoesExtras || '').split(',').filter(Boolean).forEach((k) => {
      m[k.trim()] = 'liberado';
    });
    (usuario.permissoesNegadas || '').split(',').filter(Boolean).forEach((k) => {
      m[k.trim()] = 'negado';
    });
    setMatriz(m);
  }, [open, usuario]);

  if (typeof document === 'undefined') return null;

  const toggle = (modulo, acao) => {
    const key = `${modulo}:${acao}`;
    setMatriz((prev) => {
      const next = { ...prev };
      const atual = next[key];
      if (!atual) next[key] = 'liberado';
      else if (atual === 'liberado') next[key] = 'negado';
      else delete next[key]; // negado → volta pro default
      return next;
    });
  };

  const handleSave = async () => {
    const extras = Object.entries(matriz).filter(([, v]) => v === 'liberado').map(([k]) => k).join(',');
    const negadas = Object.entries(matriz).filter(([, v]) => v === 'negado').map(([k]) => k).join(',');
    setSaving(true);
    try {
      const { data } = await api.put(`/usuarios/${usuario.id}`, {
        ...usuario,
        permissoesExtras: extras,
        permissoesNegadas: negadas,
        senha: null,
      });
      toast.success('Permissões atualizadas.');
      onSaved?.(data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Falha ao salvar permissões.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <AnimatePresence>
      {open && usuario && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true"
            className="w-full max-w-4xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-rose-500/10 border border-rose-500/20">
                  <Shield size={14} className="text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Permissões — {usuario.login}</h3>
                  <p className="text-[11px] text-slate-500">
                    Perfil base: <span className="text-rose-400 font-semibold">{usuario.perfilAcesso}</span> — ajustes finos abaixo
                  </p>
                </div>
              </div>
              <button type="button" aria-label="Fechar" title="Fechar" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X size={16} />
              </button>
            </div>

            {/* Legenda */}
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/50 flex items-center gap-4 text-[11px] text-slate-400">
              <Info size={12} className="shrink-0 text-slate-500" />
              <span>Click cicla entre:</span>
              <CellChip status="default" /> <span>Padrão do perfil</span>
              <CellChip status="liberado" /> <span>Liberado (extra)</span>
              <CellChip status="negado" /> <span>Negado</span>
            </div>

            {/* Matriz */}
            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 z-10">
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Módulo</th>
                    {ACOES.map((a) => (
                      <th key={a.key} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULOS_PERMISSAO.map((m) => (
                    <tr key={m.key} className="border-b border-slate-800/60">
                      <td className="px-4 py-3 font-medium text-white">{m.label}</td>
                      {ACOES.map((a) => {
                        const key = `${m.key}:${a.key}`;
                        const override = matriz[key];
                        // Mostra "efetivo" considerando perfil base + overrides locais
                        const effective = effectivePermission(usuario, m.key, a.key, matriz);
                        return (
                          <td key={a.key} className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggle(m.key, a.key)}
                              title={override ? `Override: ${override}` : 'Padrão do perfil'}
                              className="inline-flex h-9 w-9 items-center justify-center"
                            >
                              <CellChip status={override || (effective ? 'permitido-default' : 'negado-default')} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
              <p className="text-[11px] text-slate-500">
                Overrides ativos: {Object.keys(matriz).length}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition">
                  Cancelar
                </button>
                <button type="button" onClick={handleSave} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
                  <Save size={14} /> {saving ? 'Salvando...' : 'Salvar permissões'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Mostra efetivo combinando perfil base + overrides em edição. */
function effectivePermission(usuario, modulo, acao, matriz) {
  const key = `${modulo}:${acao}`;
  if (matriz[key] === 'liberado') return true;
  if (matriz[key] === 'negado') return false;
  // sem override: aplica regra padrão
  return canDo(usuario, modulo, acao);
}

function CellChip({ status }) {
  const map = {
    'permitido-default': { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: <Check size={12} className="text-emerald-400" />, dim: true },
    'negado-default':    { bg: 'bg-slate-800',     border: 'border-slate-700',     icon: <Minus size={12} className="text-slate-500" />, dim: true },
    'liberado':          { bg: 'bg-emerald-500',   border: 'border-emerald-400',   icon: <Check size={12} className="text-white" /> },
    'negado':            { bg: 'bg-rose-500',      border: 'border-rose-400',      icon: <X size={12} className="text-white" /> },
    'default':           { bg: 'bg-slate-700/40',  border: 'border-slate-700',     icon: null, dim: true },
  };
  const s = map[status] || map.default;
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${s.bg} ${s.border} ${s.dim ? 'opacity-60' : ''}`}>
      {s.icon}
    </span>
  );
}
