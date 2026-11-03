/**
 * Sistema de permissões — duas camadas:
 *  1) PADRÃO por perfil — define quais módulos cada perfil vê
 *  2) GRANULAR por usuário — pode LIBERAR extras (permissoesExtras)
 *     ou NEGAR padrões (permissoesNegadas). Formato CSV "modulo:acao".
 */

const PERMISSIONS = {
  ADMIN: '*', // tudo
  BALANCA: ['dashboard', 'fila', 'pesagem', 'romaneio', 'parceiros', 'relatorios'],
  LABORATORIO: ['dashboard', 'laboratorio', 'pesagem', 'romaneio', 'relatorios'],
  PRODUCAO: ['dashboard', 'fila', 'estoque', 'pesagem', 'romaneio', 'laboratorio', 'lotes', 'relatorios'],
  FINANCEIRO: ['dashboard', 'financeiro', 'vendas', 'parceiros', 'cadastros', 'relatorios'],
};

const PATH_TO_MODULE = {
  '/': 'dashboard',
  '/cadastros': 'cadastros',
  '/parceiros': 'parceiros',
  '/motoristas': 'cadastros',
  '/veiculos': 'cadastros',
  '/produtos': 'cadastros',
  '/usuarios': 'cadastros',
  '/fila': 'fila',
  '/painel-fila': 'fila',
  '/pesagem': 'pesagem',
  '/balanca': 'pesagem',
  '/romaneio': 'romaneio',
  '/laboratorio': 'laboratorio',
  '/lotes': 'lotes',
  '/estoque': 'estoque',
  '/vendas': 'vendas',
  '/financeiro': 'financeiro',
  '/relatorios': 'relatorios', // cada relatório ainda exige o módulo de origem (checado na API)
  '/configuracoes': 'configuracoes', // só ADMIN (nenhum outro perfil tem o módulo; a API também exige ADMIN)
};

/** Ações granulares disponíveis por módulo. */
export const ACOES = [
  { key: 'ver',     label: 'Visualizar' },
  { key: 'criar',   label: 'Criar' },
  { key: 'editar',  label: 'Editar' },
  { key: 'excluir', label: 'Excluir' },
];

/** Lista de módulos pra exibir na matriz de permissões. */
export const MODULOS_PERMISSAO = [
  { key: 'fila',        label: 'Fila / Pátio' },
  { key: 'parceiros',   label: 'Parceiros' },
  { key: 'cadastros',   label: 'Cadastros (Motorista/Veículo/Produto)' },
  { key: 'pesagem',     label: 'Pesagem' },
  { key: 'romaneio',    label: 'Romaneio' },
  { key: 'laboratorio', label: 'Laboratório' },
  { key: 'lotes',       label: 'Lotes de Produção' },
  { key: 'estoque',     label: 'Estoque' },
  { key: 'vendas',      label: 'Vendas' },
  { key: 'financeiro',  label: 'Financeiro' },
];

export function allowedModules(perfil) {
  return PERMISSIONS[perfil?.toUpperCase()] ?? PERMISSIONS.ADMIN;
}

export function canAccessModule(perfil, moduleKey) {
  const allowed = allowedModules(perfil);
  if (allowed === '*') return true;
  return allowed.includes(moduleKey);
}

export function canAccessPath(perfil, pathname) {
  const allowed = allowedModules(perfil);
  if (allowed === '*') return true;
  const root = '/' + pathname.split('/')[1];
  const moduleKey = PATH_TO_MODULE[root === '/' ? '/' : root];
  if (!moduleKey) return true;
  return allowed.includes(moduleKey);
}

/** Parse CSV "modulo:acao,modulo:acao" → Set. */
function parsePerms(csv) {
  if (!csv) return new Set();
  return new Set(csv.split(',').map((s) => s.trim()).filter(Boolean));
}

/**
 * Verifica se usuário pode executar uma ação em um módulo.
 * Regras:
 *  - ADMIN sempre pode.
 *  - Se permissoesNegadas tem "modulo:acao" → NEGA (mesmo se perfil deixaria).
 *  - Se permissoesExtras tem "modulo:acao" → LIBERA (mesmo se perfil não deixaria).
 *  - Senão: aplica regra padrão do perfil:
 *      • Tem acesso ao módulo? Então pode ver/criar/editar.
 *      • Excluir só ADMIN por padrão (perigoso).
 */
export function canDo(user, modulo, acao) {
  if (!user) return false;
  const perfil = user.perfilAcesso;
  if (perfil === 'ADMIN') return true;

  const key = `${modulo}:${acao}`;
  const negadas = parsePerms(user.permissoesNegadas);
  if (negadas.has(key)) return false;

  const extras = parsePerms(user.permissoesExtras);
  if (extras.has(key)) return true;

  // Default por perfil
  if (!canAccessModule(perfil, modulo)) return false;
  if (acao === 'excluir') return false; // só admin por padrão
  return true; // ver/criar/editar liberados se tem módulo
}

/** Helper rápido pra ler usuário atual do localStorage. */
export function currentUser() {
  try { return JSON.parse(localStorage.getItem('@sigfec:user') || 'null'); }
  catch { return null; }
}

/** Helper combinado: canDo do usuário atual. */
export function can(modulo, acao) {
  return canDo(currentUser(), modulo, acao);
}

export const PERFIS = {
  ADMIN: 'Administrador',
  BALANCA: 'Operador de Balança',
  LABORATORIO: 'Laboratório',
  PRODUCAO: 'Produção',
  FINANCEIRO: 'Financeiro',
};
