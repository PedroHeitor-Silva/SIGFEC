/* eslint-disable react/prop-types */
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

/**
 * Clickable table header with sort indicator.
 *
 * Usage:
 *   const [sort, setSort] = useState({ key: 'data', dir: 'desc' });
 *   <SortableHeader sortKey="data" current={sort} onChange={setSort}>Data</SortableHeader>
 *
 *   const sorted = useSorted(items, sort);
 */
export default function SortableHeader({ sortKey, current, onChange, children, align = 'left', px = 'px-5' }) {
  const active = current?.key === sortKey;
  const dir = current?.dir;
  const toggle = () => {
    if (!active) return onChange({ key: sortKey, dir: 'asc' });
    if (dir === 'asc') return onChange({ key: sortKey, dir: 'desc' });
    return onChange({ key: null, dir: null });
  };

  return (
    <th aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`${px} py-3 text-${align} whitespace-nowrap text-xs font-bold uppercase tracking-wider text-slate-500`}>
      <button
        type="button"
        onClick={toggle}
        className={`inline-flex items-center gap-1.5 hover:text-white transition ${active ? 'text-emerald-400' : ''}`}
      >
        {children}
        {!active && <ChevronsUpDown size={11} className="opacity-40" />}
        {active && dir === 'asc' && <ChevronUp size={11} />}
        {active && dir === 'desc' && <ChevronDown size={11} />}
      </button>
    </th>
  );
}

const ISO_DATA = /^\d{4}-\d{2}-\d{2}/;

/**
 * Ordena pela coluna atual. `acessores` mapeia sortKey → função (para valores calculados,
 * ex.: { saldo: (t) => t.valorOriginal - t.valorPago }); sem acessor, a chave é um caminho ("produto.nome").
 * Nulos vão sempre para o fim; datas ISO e números comparam como tal; texto em ordem alfabética pt-BR.
 */
export function applySort(items, sort, acessores = {}) {
  if (!sort?.key) return items;
  const { key, dir } = sort;
  const ler = acessores[key] || ((o) => get(o, key));
  const mult = dir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = ler(a);
    const bv = ler(b);
    const vazioA = av == null || av === '';
    const vazioB = bv == null || bv === '';
    if (vazioA && vazioB) return 0;
    if (vazioA) return 1;
    if (vazioB) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
    if (typeof av === 'boolean' || typeof bv === 'boolean') return (Number(av) - Number(bv)) * mult;
    if (ISO_DATA.test(av) && ISO_DATA.test(bv)) return (Date.parse(av) - Date.parse(bv)) * mult;
    return String(av).localeCompare(String(bv), 'pt-BR', { numeric: true }) * mult;
  });
}

function get(obj, path) {
  return path.split('.').reduce((v, k) => v?.[k], obj);
}
