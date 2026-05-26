// Unidades de medida de produto — espelha o enum EnumUnidadeMedida do backend.

export const UNIDADES = {
  KG:        { label: 'Quilograma (kg)', singular: 'kg',       plural: 'kg',        pesoKg: 1 },
  SACO_25KG: { label: 'Saco 25 kg',      singular: 'saco',     plural: 'sacos',     pesoKg: 25 },
  SACO_50KG: { label: 'Saco 50 kg',      singular: 'saco',     plural: 'sacos',     pesoKg: 50 },
  TONELADA:  { label: 'Tonelada (t)',    singular: 'tonelada', plural: 'toneladas', pesoKg: 1000 },
};

/** Rótulo completo da unidade (ex: 'Saco 25 kg'). */
export const unidadeLabel = (u) => UNIDADES[u]?.label || u || '—';

/** Nome da unidade com plural correto conforme a quantidade. */
export const unidadeNome = (u, qtd = 2) => {
  const v = UNIDADES[u];
  if (!v) return 'kg';
  return Math.abs(Number(qtd) || 0) === 1 ? v.singular : v.plural;
};

/** Texto curto: '200 sacos', '1 saco', '1.250 kg', '5 toneladas'. */
export const formatarQtd = (qtd, u) => {
  const n = Number(qtd) || 0;
  return `${n.toLocaleString('pt-BR')} ${unidadeNome(u, n)}`;
};

/** Equivalência aproximada em kg (null para produto já medido em kg). */
export const equivalenteKg = (qtd, u) => {
  const v = UNIDADES[u];
  if (!v || v.pesoKg === 1) return null;
  const totalKg = (Number(qtd) || 0) * v.pesoKg;
  return `${totalKg.toLocaleString('pt-BR')} kg`;
};

/** Opções para <select>. */
export const UNIDADE_OPTIONS = Object.entries(UNIDADES).map(([value, v]) => ({
  value,
  label: v.label,
}));
