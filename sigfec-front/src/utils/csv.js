/**
 * Export rows to CSV file with BOM (Excel-friendly UTF-8).
 *
 * @param {string} filename - e.g. 'pesagens-2026.csv'
 * @param {{label:string,key:string|function}[]} columns - column defs
 * @param {object[]} rows - data
 */
export function exportCSV(filename, columns, rows) {
  const header = columns.map((c) => esc(c.label)).join(';');
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = typeof c.key === 'function' ? c.key(r) : get(r, c.key);
      return esc(v);
    }).join(';')
  ).join('\n');

  const csv = '﻿' + header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function esc(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function get(obj, path) {
  return path.split('.').reduce((v, k) => v?.[k], obj);
}
