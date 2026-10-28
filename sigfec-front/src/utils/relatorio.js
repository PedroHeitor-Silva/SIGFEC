/**
 * Formatação dos valores de relatório pelo tipo da coluna vindo da API
 * (texto, numero, peso, moeda, percentual, data, datahora).
 */
const nf = (min, max) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });

export function fmtValor(v, tipo) {
  if (v == null || v === '') return '—';
  switch (tipo) {
    case 'moeda':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
    case 'peso':
      return `${nf(0, 2).format(Number(v) || 0)} kg`;
    case 'percentual':
      return `${nf(0, 2).format(Number(v) || 0)}%`;
    case 'numero':
      return typeof v === 'number' || !isNaN(Number(v)) ? nf(0, 2).format(Number(v)) : String(v);
    case 'data':
      return new Date(String(v).length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('pt-BR');
    case 'datahora':
      return new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    default:
      return String(v);
  }
}

/** Valor "cru" para CSV: números sem milhar e com vírgula decimal (Excel pt-BR). */
export function csvValor(v, tipo) {
  if (v == null) return '';
  if (['moeda', 'peso', 'percentual', 'numero'].includes(tipo) && !isNaN(Number(v))) {
    return String(v).replace('.', ',');
  }
  if (tipo === 'data' || tipo === 'datahora') return fmtValor(v, tipo);
  return String(v);
}

export const isNumerico = (tipo) => ['moeda', 'peso', 'percentual', 'numero'].includes(tipo);

/** Data local AAAA-MM-DD (toISOString usa UTC: depois das 21h no Brasil já seria o dia seguinte). */
export const isoLocal = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const isoHoje = () => {
  const d = new Date();
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const isoMenosDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const isoInicioMes = () => isoHoje().slice(0, 8) + '01';

export const fmtDataIso = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');
