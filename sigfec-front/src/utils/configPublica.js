/**
 * Parâmetros públicos do sistema (Configurações → GET /api/configuracoes/publicas): dados da empresa
 * para o cabeçalho dos documentos e limites usados nas telas. Lidos uma vez após o login e guardados
 * em memória + localStorage; enquanto não chegam, valem os padrões abaixo.
 */
import api from '../services/api';

const CHAVE_LS = '@sigfec:config';

const PADRAO = {
  'empresa.razao-social': 'Fecularia Loanda',
  'empresa.cidade-uf': 'Loanda — PR',
  'vendas.max-parcelas': '12',
  'vendas.intervalo-parcelas-dias': '30',
  'alertas.cnh-dias': '30',
};

let atual = (() => {
  try { return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE_LS) || '{}') }; }
  catch { return { ...PADRAO }; }
})();

export const config = (chave) => atual[chave] || PADRAO[chave] || '';

export const configInt = (chave) => {
  const n = parseInt(config(chave), 10);
  return Number.isFinite(n) ? n : parseInt(PADRAO[chave] || '0', 10);
};

/** Dados do emitente para os documentos impressos. */
export const empresa = () => ({
  nome: config('empresa.razao-social'),
  cnpj: config('empresa.cnpj'),
  ie: config('empresa.inscricao-estadual'),
  endereco: config('empresa.endereco'),
  cidade: config('empresa.cidade-uf'),
  telefone: config('empresa.telefone'),
  email: config('empresa.email'),
});

export function recarregarConfigPublica() {
  if (!localStorage.getItem('@sigfec:user')) return Promise.resolve(atual); // ainda não logado
  return api.get('/configuracoes/publicas')
    .then(({ data }) => {
      if (data && typeof data === 'object') {
        atual = { ...PADRAO, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v != null)) };
        try { localStorage.setItem(CHAVE_LS, JSON.stringify(data)); } catch { /* sem storage: só memória */ }
      }
      return atual;
    })
    .catch(() => atual);
}
