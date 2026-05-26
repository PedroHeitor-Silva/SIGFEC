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
export default function SortableHeader({ sortKey, current, onChange, children, align = 'left' }) {
  const active = current?.key === sortKey;
  const dir = current?.dir;
  const toggle = () => {
    if (!active) return onChange({ key: sortKey, dir: 'asc' });
    if (dir === 'asc') return onChange({ key: sortKey, dir: 'desc' });
    return onChange({ key: null, dir: null });
  };

  return (
    <th className={`px-5 py-3 text-${align} text-xs font-bold uppercase tracking-wider text-slate-500`}>
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

/**
 * Hook helper: sort array by current sort state.
 */
export function applySort(items, sort) {
  if (!sort?.key) return items;
  const { key, dir } = sort;
  const mult = dir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = get(a, key);
    const bv = get(b, key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
    const ad = Date.parse(av);
    const bd = Date.parse(bv);
    if (!isNaN(ad) && !isNaN(bd)) return (ad - bd) * mult;
    return String(av).localeCompare(String(bv), 'pt-BR') * mult;
  });
}

function get(obj, path) {
  return path.split('.').reduce((v, k) => v?.[k], obj);
}
