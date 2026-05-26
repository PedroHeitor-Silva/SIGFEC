/**
 * Mapeia cada perfil aos módulos visíveis.
 * Módulos referenciam keys de MODULES em theme/modules.jsx.
 */
const PERMISSIONS = {
  ADMIN: '*', // tudo
  BALANCA: ['dashboard', 'pesagem', 'romaneio', 'parceiros'],
  LABORATORIO: ['dashboard', 'laboratorio', 'pesagem', 'romaneio'],
  PRODUCAO: ['dashboard', 'estoque', 'pesagem', 'romaneio', 'laboratorio', 'lotes'],
  FINANCEIRO: ['dashboard', 'financeiro', 'vendas', 'parceiros', 'cadastros'],
};

const PATH_TO_MODULE = {
  '/': 'dashboard',
  '/cadastros': 'cadastros',
  '/parceiros': 'parceiros',
  '/motoristas': 'cadastros',
  '/veiculos': 'cadastros',
  '/produtos': 'cadastros',
  '/usuarios': 'cadastros',
  '/pesagem': 'pesagem',
  '/balanca': 'pesagem',
  '/romaneio': 'romaneio',
  '/laboratorio': 'laboratorio',
  '/lotes': 'lotes',
  '/estoque': 'estoque',
  '/vendas': 'vendas',
  '/financeiro': 'financeiro',
};

/**
 * Retorna lista de módulos permitidos pro perfil.
 * @param {string} perfil - ADMIN | BALANCA | LABORATORIO | PRODUCAO | FINANCEIRO
 * @returns {string[]|'*'}
 */
export function allowedModules(perfil) {
  return PERMISSIONS[perfil?.toUpperCase()] ?? PERMISSIONS.ADMIN;
}

/**
 * Verifica se módulo está liberado pro perfil.
 */
export function canAccessModule(perfil, moduleKey) {
  const allowed = allowedModules(perfil);
  if (allowed === '*') return true;
  return allowed.includes(moduleKey);
}

/**
 * Verifica se path está liberado pro perfil.
 */
export function canAccessPath(perfil, pathname) {
  const allowed = allowedModules(perfil);
  if (allowed === '*') return true;
  // checa root path
  const root = '/' + pathname.split('/')[1];
  const moduleKey = PATH_TO_MODULE[root === '/' ? '/' : root];
  if (!moduleKey) return true; // path desconhecido, libera
  return allowed.includes(moduleKey);
}

export const PERFIS = {
  ADMIN: 'Administrador',
  BALANCA: 'Operador de Balança',
  LABORATORIO: 'Laboratório',
  PRODUCAO: 'Produção',
  FINANCEIRO: 'Financeiro',
};
