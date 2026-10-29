/* eslint-disable react/prop-types */

/**
 * Botão de ação das tabelas: ícone + texto, colorido pelo tipo de ação (sempre visível, não só no hover).
 * Cores: verde (concluir/emitir), azul (imprimir/ver), roxo (cobrança), ambar (estornar/editar),
 * vermelho (cancelar/excluir). `soIcone` deixa só o ícone (com nome acessível) para ações secundárias.
 */
const CORES = {
  verde:    'text-emerald-400 bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25',
  azul:     'text-sky-400 bg-sky-500/15 border-sky-500/40 hover:bg-sky-500/25',
  roxo:     'text-violet-400 bg-violet-500/15 border-violet-500/40 hover:bg-violet-500/25',
  ambar:    'text-amber-400 bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25',
  vermelho: 'text-rose-400 bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20',
};

export default function BotaoAcao({ icon: Icon, label, onClick, cor = 'azul', soIcone = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold whitespace-nowrap transition disabled:opacity-40 disabled:cursor-not-allowed
        ${soIcone ? 'h-8 w-8 justify-center' : 'h-8 px-2.5 text-xs'} ${CORES[cor] || CORES.azul}`}
    >
      {Icon && <Icon size={15} strokeWidth={2.2} />}
      {!soIcone && <span>{label}</span>}
    </button>
  );
}
