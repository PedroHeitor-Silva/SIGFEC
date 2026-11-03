import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, ClipboardCheck, Check, X, Truck, User, CheckCircle2, XCircle, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { maskPlaca } from '../utils/masks';

// 10 perguntas fixas do formulário oficial de inspeção da carga.
const PERGUNTAS = [
  { campo: 'semVestigiosToxicos', texto: 'Sem vestígios de transporte de produtos tóxicos ou que possam contaminar o produto' },
  { campo: 'higieneLimpeza',      texto: 'Boas condições de higiene e limpeza geral da carreta' },
  { campo: 'estruturaConservada', texto: 'Boas condições de assoalho, paredes, tetos e guardas do caminhão' },
  { campo: 'lonaCordaOk',         texto: 'Bom estado de lona/corda, sob os aspectos de conservação e higiene' },
  { campo: 'ausenciaPragas',      texto: 'Ausência de insetos, roedores, alimentos deteriorados etc.' },
  { campo: 'secosSemOdor',        texto: 'Carroceria, lona e forro secos e sem odor estranho' },
  { campo: 'forroOk',             texto: 'Forro em boas condições e em quantidade suficiente' },
  { campo: 'sacariaLimpa',        texto: 'Ausência de sacaria suja, molhada e mofada' },
  { campo: 'sacariaSemAvaria',    texto: 'Sacarias sem avarias (furadas/rasgadas)' },
  { campo: 'lonasAdequadas',      texto: 'Lonas colocadas adequadamente' },
];

const STATUS_CHECK = {
  PENDENTE:  { label: 'Pendente',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  APROVADO:  { label: 'Aprovado',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  REPROVADO: { label: 'Reprovado', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

export default function ChecklistCargaForm() {
  const { entradaId } = useParams();
  const navigate = useNavigate();
  const [entrada, setEntrada] = useState(null);
  const [avaliacao, setAvaliacao] = useState(null); // quem avaliou e quando (vem do servidor)
  const [respostas, setRespostas] = useState({});
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/fila/${entradaId}`)
      .then((r) => setEntrada(r.data))
      .catch((e) => toast.error(e?.response?.data?.error || 'Entrada não encontrada.'));

    api.get(`/checklists/entrada/${entradaId}`)
      .then((r) => {
        const c = r.data;
        if (c && c.id) {
          const resp = {};
          PERGUNTAS.forEach((p) => { resp[p.campo] = c[p.campo] ?? undefined; });
          setRespostas(resp);
          setObservacao(c.observacao || '');
          setAvaliacao(c);
        }
      })
      .catch(() => { /* 204 = ainda não existe */ });
  }, [entradaId]);

  // Só dá para inspecionar enquanto o veículo aguarda chamada.
  const bloqueado = entrada != null && entrada.status !== 'AGUARDANDO';

  const setResposta = (campo, valor) => {
    if (bloqueado) return;
    setRespostas((r) => ({ ...r, [campo]: r[campo] === valor ? undefined : valor }));
  };

  // Prévia do status — mesma regra do servidor: qualquer NÃO reprova; aprovado só com os 10 SIM.
  const statusPrevia = useMemo(() => {
    const vals = PERGUNTAS.map((p) => respostas[p.campo]);
    if (vals.includes(false)) return 'REPROVADO';
    if (vals.includes(undefined)) return 'PENDENTE';
    return 'APROVADO';
  }, [respostas]);

  const respondidas = PERGUNTAS.filter((p) => respostas[p.campo] !== undefined).length;

  const salvar = () => {
    setSaving(true);
    const payload = {
      observacao: observacao || null,
      ...Object.fromEntries(PERGUNTAS.map((p) => [p.campo, respostas[p.campo] ?? null])),
    };
    api.put(`/checklists/entrada/${entradaId}`, payload)
      .then((r) => {
        setAvaliacao(r.data);
        const status = r.data?.status;
        if (status === 'APROVADO') {
          toast.success('Checklist aprovado — veículo liberado para chamada.');
          setTimeout(() => navigate('/fila'), 900);
        } else if (status === 'REPROVADO') {
          toast.error('Checklist reprovado — o veículo não poderá ser chamado.');
        } else {
          toast.success(`Checklist salvo como pendente (${respondidas}/${PERGUNTAS.length} respondidas).`);
        }
      })
      .catch((e) => toast.error(e?.response?.data?.error || 'Erro ao salvar checklist.'))
      .finally(() => setSaving(false));
  };

  const st = STATUS_CHECK[statusPrevia];

  return (
    <div>

      <div className="mx-auto max-w-3xl">
        <button onClick={() => navigate('/fila')}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white">
          <ArrowLeft size={16} /> Voltar para a fila
        </button>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
                <ClipboardCheck size={24} className="text-cyan-400" /> Checklist da Carga
              </h1>
              {entrada && (
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5"><Truck size={14} /> {maskPlaca(entrada.veiculo?.placa) || '—'}</span>
                  <span className="flex items-center gap-1.5"><User size={14} /> {entrada.motorista?.nome || 'Sem motorista'}</span>
                  <span className="font-mono text-emerald-400">#{String(entrada.senhaDiaria ?? 0).padStart(3, '0')}</span>
                </p>
              )}
            </div>
            <span className={`self-start rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${st.cls}`}>
              {st.label} · {respondidas}/{PERGUNTAS.length}
            </span>
          </div>
          {avaliacao?.avaliadoPor && avaliacao?.dataHoraAvaliacao && (
            <p className="mt-3 text-xs text-slate-500">
              Avaliado por <b className="text-slate-400">{avaliacao.avaliadoPor}</b> em{' '}
              {new Date(avaliacao.dataHoraAvaliacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          )}
        </div>

        {bloqueado && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
            <Lock size={16} /> O veículo já saiu da fila de espera ({entrada.status.toLowerCase().replace('_', ' ')}): o checklist está somente para consulta.
          </div>
        )}

        {!bloqueado && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm text-slate-300">Carga sem problemas? Marque tudo de uma vez e ajuste só o que não estiver conforme.</p>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => setRespostas(Object.fromEntries(PERGUNTAS.map((p) => [p.campo, true])))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition">
                <CheckCircle2 size={16} /> Marcar tudo como Sim
              </button>
              {respondidas > 0 && (
                <button type="button" onClick={() => setRespostas({})}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition">
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {PERGUNTAS.map((p, i) => {
            const val = respostas[p.campo];
            return (
              <div key={p.campo}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex-1 text-sm text-slate-200">
                  <span className="mr-2 font-mono text-xs text-slate-500">{String(i + 1).padStart(2, '0')}</span>
                  {p.texto}
                </p>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setResposta(p.campo, true)} disabled={bloqueado}
                    className={`inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed ${
                      val === true
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                    <Check size={16} /> Sim
                  </button>
                  <button onClick={() => setResposta(p.campo, false)} disabled={bloqueado}
                    className={`inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed ${
                      val === false
                        ? 'border-rose-500 bg-rose-500/15 text-rose-400'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                    <X size={16} /> Não
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Observações da inspeção</label>
          <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} disabled={bloqueado}
            placeholder="Registre não-conformidades, avarias ou ressalvas..."
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500" />
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {statusPrevia === 'APROVADO' && <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={18} /> Carga apta para descarga</span>}
            {statusPrevia === 'REPROVADO' && <span className="flex items-center gap-1.5 text-rose-400"><XCircle size={18} /> Há itens não-conformes</span>}
            {statusPrevia === 'PENDENTE' && <span className="text-slate-500">Responda os 10 itens para liberar a chamada</span>}
          </div>
          <button onClick={salvar} disabled={saving || bloqueado}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50">
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar checklist'}
          </button>
        </div>
      </div>
    </div>
  );
}
