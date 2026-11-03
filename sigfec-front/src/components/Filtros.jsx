/* eslint-disable react/prop-types */
import { Search, X, Filter, ArrowDownUp } from 'lucide-react';

/**
 * Peças de filtro das tabelas (mesmo visual em todos os módulos):
 *   <BarraFiltros total={lista.length} exibidos={filtrados.length} ativo={algumFiltro} onLimpar={...}>
 *     <CampoBusca value onChange placeholder />
 *     <FiltroSelect label="Produtor" value onChange options={opcoesDe(lista, (p) => p.produtorNome)} />
 *     <DateRangeFilter ... />
 *   </BarraFiltros>
 */

const selectCls = 'rounded-lg border border-slate-700 bg-slate-800 py-2 pl-2.5 pr-7 text-sm text-white outline-none focus:border-emerald-500 transition max-w-[220px]';

export function BarraFiltros({ children, total, exibidos, ativo, onLimpar, ordenacao }) {
  return (
    <div className="px-5 py-4 border-b border-slate-800 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          {total == null ? null : exibidos === total
            ? <>{total} {total === 1 ? 'registro' : 'registros'}</>
            : <>Mostrando <strong className="text-white">{exibidos}</strong> de {total}</>}
        </span>
        {ordenacao && (
          <span className="inline-flex items-center gap-1"><ArrowDownUp size={12} /> {ordenacao}</span>
        )}
        <span className="hidden sm:inline">Clique no título de uma coluna para ordenar.</span>
        {ativo && (
          <button type="button" onClick={onLimpar}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-rose-500 hover:bg-rose-500/10 transition">
            <X size={13} /> Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}

export function CampoBusca({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition" />
    </div>
  );
}

/** Select de filtro: valor '' = todos. options: [{ value, label }] ou strings. */
export function FiltroSelect({ label, value, onChange, options, todos = 'Todos' }) {
  const ops = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <label className={`inline-flex items-center gap-1.5 text-xs font-semibold ${value ? 'text-emerald-500' : 'text-slate-400'}`}>
      <Filter size={12} /> {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${selectCls} ${value ? 'border-emerald-500' : ''}`}>
        <option value="">{todos}</option>
        {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Opções únicas (ordenadas) a partir de uma lista: opcoesDe(pesagens, (p) => p.produtorNome). */
export function opcoesDe(itens, ler) {
  return [...new Set(itens.map(ler).filter((v) => v != null && v !== ''))]
    .sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

/** Data (AAAA-MM-DD ou ISO com hora) dentro do período { from, to } do DateRangeFilter. */
export function noPeriodo(valor, { from, to }) {
  if (!from && !to) return true;
  if (!valor) return false;
  const d = String(valor).slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}

/** Texto contém o termo (ignora maiúsculas e acentos). */
export function contem(termo, ...campos) {
  const t = normalizar(termo);
  if (!t) return true;
  return campos.some((c) => normalizar(c).includes(t));
}

const normalizar = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
