/** Formas de pagamento — espelha EnumFormaPagamento do backend. */
export const FORMAS_PAGAMENTO = [
  { value: 'PIX',            label: 'PIX',               aVista: true },
  { value: 'DINHEIRO',       label: 'Dinheiro',          aVista: true },
  { value: 'CARTAO_DEBITO',  label: 'Cartão de débito',  aVista: true },
  { value: 'CARTAO_CREDITO', label: 'Cartão de crédito', aVista: false },
  { value: 'BOLETO',         label: 'Boleto',            aVista: false },
  { value: 'TRANSFERENCIA',  label: 'Transferência',     aVista: false },
  { value: 'CHEQUE',         label: 'Cheque',            aVista: false },
];

import { configInt } from './configPublica.js';

/** Padrão 12; o administrador muda em Configurações → Vendas e financeiro. */
export const MAX_PARCELAS = 12;
export const maxParcelas = () => configInt('vendas.max-parcelas') || MAX_PARCELAS;
export const intervaloParcelas = () => configInt('vendas.intervalo-parcelas-dias') || 30;

export const formaLabel = (v) => FORMAS_PAGAMENTO.find((f) => f.value === v)?.label || v || '—';

export const ehAVista = (v) => !!FORMAS_PAGAMENTO.find((f) => f.value === v)?.aVista;

/** Mesma divisão do backend: parcelas iguais, centavos de diferença na última. */
export function dividirParcelas(total, n) {
  const centavos = Math.round((Number(total) || 0) * 100);
  const qtd = Math.max(1, Math.min(maxParcelas(), Number(n) || 1));
  const base = Math.floor(centavos / qtd);
  return Array.from({ length: qtd }, (_, i) => (i < qtd - 1 ? base : centavos - base * (qtd - 1)) / 100);
}

/** Texto curto: "À vista · PIX", "3x · Cartão de crédito". */
export const resumoPagamento = (forma, parcelas) => {
  if (!forma) return parcelas > 1 ? `${parcelas}x` : `A prazo (${intervaloParcelas()} dias)`;
  return ehAVista(forma) || !parcelas || parcelas <= 1 ? `À vista · ${formaLabel(forma)}` : `${parcelas}x · ${formaLabel(forma)}`;
};
