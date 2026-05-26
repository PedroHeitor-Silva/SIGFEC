/**
 * Busca de CEP via ViaCEP com timeout e tolerância a falta de internet.
 * Quando offline, falha rápido (não trava o formulário) e o usuário
 * preenche o endereço manualmente.
 */

const VIACEP_TIMEOUT_MS = 4000;

/**
 * @param {string} cepRaw - CEP com ou sem máscara
 * @returns {Promise<{ok:boolean, offline?:boolean, data?:object, error?:string}>}
 */
export async function buscarCep(cepRaw) {
  const cep = String(cepRaw || '').replace(/\D/g, '');
  if (cep.length !== 8) return { ok: false, error: 'CEP incompleto' };

  // Sem conexão — nem tenta
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, offline: true, error: 'Sem internet — preencha o endereço manualmente.' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VIACEP_TIMEOUT_MS);

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
    clearTimeout(timer);
    const data = await res.json();
    if (data.erro) return { ok: false, error: 'CEP não encontrado.' };
    return {
      ok: true,
      data: {
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        localidade: data.localidade || '',
        uf: data.uf || '',
      },
    };
  } catch (err) {
    clearTimeout(timer);
    // abort (timeout) ou rede caída → trata como offline
    return { ok: false, offline: true, error: 'Busca de CEP indisponível — preencha manualmente.' };
  }
}
