/**
 * Máscaras de input — formatam string conforme o usuário digita.
 * Cada função recebe valor cru e retorna string mascarada.
 */

export const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '');

/** Telefone: (44) 99999-9999 ou (44) 9999-9999 */
export function maskTelefone(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** CEP: 00000-000 */
export function maskCEP(v) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** CPF ou CNPJ — detecta por tamanho. 000.000.000-00 / 00.000.000/0000-00 */
export function maskCpfCnpj(v) {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** RG: 00.000.000-0 (genérico) */
export function maskRG(v) {
  const d = onlyDigits(v).slice(0, 10);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Placa: ABC-1D23 (Mercosul) ou ABC-1234 — letras maiúsculas com hífen após 3 letras */
export function maskPlaca(v) {
  const c = String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (c.length <= 3) return c;
  return `${c.slice(0, 3)}-${c.slice(3)}`;
}

/** Peso em kg: inteiro com milhar + sufixo " kg" só na exibição. Ex: 18.500 kg */
export function maskPeso(v) {
  const d = onlyDigits(v);
  return d ? parseInt(d, 10).toLocaleString('pt-BR') : '';
}

/** Formata número como peso para exibição: 18500 → "18.500 kg" */
export function pesoFromNumber(n, sufixo = 'kg') {
  if (n == null || n === '') return '—';
  return `${Number(n).toLocaleString('pt-BR')} ${sufixo}`;
}

/** CNH: somente dígitos, 11 posições */
export function maskCNH(v) {
  return onlyDigits(v).slice(0, 11);
}

/** Moeda BR: digita centavos → "1.234,56" (sem R$) */
export function maskMoeda(v) {
  const d = onlyDigits(v);
  if (!d) return '';
  const n = parseInt(d, 10);
  return (n / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "1.234,56" → 1234.56 (número) */
export function unmaskMoeda(v) {
  const d = onlyDigits(v);
  return d ? parseInt(d, 10) / 100 : 0;
}

/** Número → string moeda formatada "1.234,56" (para preencher valor existente) */
export function moedaFromNumber(n) {
  if (n == null || n === '') return '';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Peso/quantidade: inteiro com separador de milhar "38.500" */
export function maskInteiro(v) {
  const d = onlyDigits(v);
  return d ? parseInt(d, 10).toLocaleString('pt-BR') : '';
}

/** "38.500" → 38500 */
export function unmaskInteiro(v) {
  return Number(onlyDigits(v)) || 0;
}

/** Decimal com 2 casas e milhar: digita centavos → "1.234,50" */
export function maskDecimal(v) {
  return maskMoeda(v);
}
export const unmaskDecimal = unmaskMoeda;

/** Aplica máscara pelo nome do tipo. */
export function applyMask(tipo, valor) {
  switch (tipo) {
    case 'telefone': return maskTelefone(valor);
    case 'cep': return maskCEP(valor);
    case 'documento': return maskCpfCnpj(valor);
    case 'rg': return maskRG(valor);
    case 'placa': return maskPlaca(valor);
    case 'cnh': return maskCNH(valor);
    case 'moeda': return maskMoeda(valor);
    case 'inteiro': return maskInteiro(valor);
    case 'peso': return maskPeso(valor);
    default: return valor;
  }
}
