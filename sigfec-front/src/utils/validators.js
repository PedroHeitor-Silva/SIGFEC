/**
 * Validadores reutilizáveis. Cada um retorna string de erro ou null se válido.
 */

export const required = (v) => (!v || String(v).trim() === '' ? 'Campo obrigatório' : null);

export const email = (v) => {
  if (!v) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : 'E-mail inválido';
};

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

export const cpf = (v) => {
  const d = onlyDigits(v);
  if (!d) return null;
  if (d.length !== 11) return 'CPF deve ter 11 dígitos';
  if (/^(\d)\1+$/.test(d)) return 'CPF inválido';
  // dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let dig1 = (sum * 10) % 11;
  if (dig1 === 10) dig1 = 0;
  if (dig1 !== parseInt(d[9])) return 'CPF inválido';
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  let dig2 = (sum * 10) % 11;
  if (dig2 === 10) dig2 = 0;
  if (dig2 !== parseInt(d[10])) return 'CPF inválido';
  return null;
};

export const cnpj = (v) => {
  const d = onlyDigits(v);
  if (!d) return null;
  if (d.length !== 14) return 'CNPJ deve ter 14 dígitos';
  if (/^(\d)\1+$/.test(d)) return 'CNPJ inválido';
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s = 0; for (let i = 0; i < 12; i++) s += parseInt(d[i]) * w1[i];
  let d1 = s % 11; d1 = d1 < 2 ? 0 : 11 - d1;
  if (d1 !== parseInt(d[12])) return 'CNPJ inválido';
  s = 0; for (let i = 0; i < 13; i++) s += parseInt(d[i]) * w2[i];
  let d2 = s % 11; d2 = d2 < 2 ? 0 : 11 - d2;
  if (d2 !== parseInt(d[13])) return 'CNPJ inválido';
  return null;
};

export const cpfOrCnpj = (v) => {
  const d = onlyDigits(v);
  if (!d) return null;
  if (d.length === 11) return cpf(v);
  if (d.length === 14) return cnpj(v);
  return 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos';
};

export const phone = (v) => {
  const d = onlyDigits(v);
  if (!d) return null;
  if (d.length < 10 || d.length > 11) return 'Telefone inválido';
  return null;
};

export const cep = (v) => {
  const d = onlyDigits(v);
  if (!d) return null;
  return d.length === 8 ? null : 'CEP deve ter 8 dígitos';
};

export const minLength = (n) => (v) =>
  !v ? null : (String(v).length < n ? `Mínimo ${n} caracteres` : null);

/**
 * Roda múltiplos validadores em sequência. Para no primeiro erro.
 */
export const compose = (...fns) => (v) => {
  for (const fn of fns) {
    const err = fn(v);
    if (err) return err;
  }
  return null;
};
