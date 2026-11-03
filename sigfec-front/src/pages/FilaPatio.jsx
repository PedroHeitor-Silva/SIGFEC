import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, User, UserCircle, PlusCircle, PhoneCall, PlayCircle, Undo2, Scale,
  XCircle, ClipboardCheck, Clock, RefreshCw, MapPin, MonitorPlay, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Select from 'react-select';
import api from '../services/api';
import { maskPlaca } from '../utils/masks';
import { getSelectStyles, selectMenuProps } from '../theme/selectStyles';
import { CampoBusca, FiltroSelect, contem } from '../components/Filtros';

const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-400';
const LOCAL_KEY = '@sigfec:fila-local';

const STATUS = {
  AGUARDANDO:     { label: 'Aguardando',     cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  CHAMADO:        { label: 'Chamado',        cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  EM_ATENDIMENTO: { label: 'Em atendimento', cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40' },
  FINALIZADO:     { label: 'Finalizado',     cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  CANCELADO:      { label: 'Cancelado',      cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

const CHECKLIST = {
  PENDENTE:  { label: 'Checklist pendente',  cls: 'text-amber-400 border-amber-500/40' },
  APROVADO:  { label: 'Checklist aprovado',  cls: 'text-emerald-400 border-emerald-500/40' },
  REPROVADO: { label: 'Checklist reprovado', cls: 'text-rose-400 border-rose-500/40' },
};

const senhaFmt = (n) => `#${String(n ?? 0).padStart(3, '0')}`;
const erroApi = (e, padrao) => e?.response?.data?.error || padrao;

function tempoEspera(seg) {
  if (seg == null) return '—';
  const m = Math.floor(seg / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

const hojeISO = () => new Date().toLocaleDateString('sv-SE'); // yyyy-mm-dd no fuso local

export default function FilaPatio() {
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [produtores, setProdutores] = useState([]);
  const [selVeiculo, setSelVeiculo] = useState(null);
  const [selMotorista, setSelMotorista] = useState(null);
  const [selProdutor, setSelProdutor] = useState(null);
  const [observacao, setObservacao] = useState('');
  const [fila, setFila] = useState([]);
  const [locais, setLocais] = useState([]);
  const [local, setLocal] = useState(() => localStorage.getItem(LOCAL_KEY) || '');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ocupado, setOcupado] = useState(null); // id em processamento (evita clique duplo)
  const [busca, setBusca] = useState('');
  const [ordemFila, setOrdemFila] = useState('espera');
  const navigate = useNavigate();

  const selectStyles = useMemo(() => getSelectStyles(), []);

  const carregarFila = useCallback((silencioso = false) => {
    if (!silencioso) setLoading(true);
    return api.get('/fila')
      .then((r) => setFila(r.data || []))
      .catch((e) => { if (!silencioso) toast.error(erroApi(e, 'Falha ao carregar a fila.')); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.allSettled([
      api.get('/veiculos'), api.get('/motoristas'), api.get('/parceiros'), api.get('/fila/locais'),
    ]).then(([ve, mo, pa, lo]) => {
      const vs = ve.status === 'fulfilled' ? (ve.value.data || []) : [];
      setVeiculos(vs.filter((v) => v.statusAtivo !== false).map((v) => ({
        value: v.id, label: `${maskPlaca(v.placa)}${v.modelo ? ' — ' + v.modelo : ''}`, motorista: v.motorista,
      })));

      const ms = mo.status === 'fulfilled' ? (mo.value.data || []) : [];
      setMotoristas(ms.filter((m) => m.statusAtivo !== false)
        .map((m) => ({ value: m.id, label: m.nome || `Motorista ${m.id}` })));

      const ps = pa.status === 'fulfilled' ? (pa.value.data || []) : [];
      setProdutores(ps
        .filter((p) => String(p.tipoParceiro || '').toUpperCase() === 'PRODUTOR')
        .map((p) => ({ value: p.id, label: p.nome || `Parceiro ${p.id}` })));

      const ls = lo.status === 'fulfilled' ? (lo.value.data || []) : [];
      setLocais(ls);
      setLocal((atual) => (ls.includes(atual) ? atual : (ls[0] || '')));
    });
    carregarFila();
    const t = setInterval(() => carregarFila(true), 15000); // mantém a fila atualizada entre operadores
    return () => clearInterval(t);
  }, [carregarFila]);

  useEffect(() => { if (local) localStorage.setItem(LOCAL_KEY, local); }, [local]);

  // Auto-preenche motorista ao escolher o veículo
  const onSelectVeiculo = (opt) => {
    setSelVeiculo(opt);
    if (opt?.motorista?.id) {
      setSelMotorista({ value: opt.motorista.id, label: opt.motorista.nome || `Motorista ${opt.motorista.id}` });
    }
  };

  const registrarChegada = () => {
    if (!selVeiculo) { toast.error('Selecione o veículo.'); return; }
    if (!selMotorista) { toast.error('Selecione o motorista.'); return; }
    setSaving(true);
    api.post('/fila', {
      veiculoId: selVeiculo.value,
      motoristaId: selMotorista.value,
      produtorId: selProdutor?.value ?? null,
      observacao: observacao || null,
    })
      .then((r) => {
        toast.success(`Chegada registrada — senha ${senhaFmt(r.data?.senhaDiaria)}. Faça o checklist.`);
        setSelVeiculo(null); setSelMotorista(null); setSelProdutor(null); setObservacao('');
        carregarFila(true);
      })
      .catch((e) => toast.error(erroApi(e, 'Erro ao registrar chegada.')))
      .finally(() => setSaving(false));
  };

  const acao = (id, endpoint, body, sucesso) => {
    setOcupado(id ?? 'proximo');
    return api.post(endpoint, body || {})
      .then((r) => { toast.success(sucesso(r.data)); carregarFila(true); })
      .catch((e) => toast.error(erroApi(e, 'Não foi possível concluir a operação.')))
      .finally(() => setOcupado(null));
  };

  const exigirLocal = () => {
    if (!local) { toast.error('Escolha o local de chamada.'); return false; }
    return true;
  };

  const chamar = (e) => exigirLocal() && acao(e.id, `/fila/${e.id}/chamar`, { local },
    (d) => `Senha ${senhaFmt(d.senhaDiaria)} chamada para ${d.localChamada}.`);

  const chamarProximo = () => exigirLocal() && acao(null, '/fila/chamar-proximo', { local },
    (d) => `Senha ${senhaFmt(d.senhaDiaria)} (${maskPlaca(d.veiculo?.placa)}) chamada para ${d.localChamada}.`);

  const cancelar = (e) => {
    const motivo = window.prompt(`Motivo do cancelamento da senha ${senhaFmt(e.senhaDiaria)}:`);
    if (motivo === null) return;
    if (!motivo.trim()) { toast.error('Informe o motivo do cancelamento.'); return; }
    acao(e.id, `/fila/${e.id}/cancelar`, { motivo }, () => `Senha ${senhaFmt(e.senhaDiaria)} cancelada.`);
  };

  const hoje = hojeISO();
  const ativos = fila.filter((e) => e.status === 'CHAMADO' || e.status === 'EM_ATENDIMENTO');
  const aguardando = fila.filter((e) => e.status === 'AGUARDANDO');
  const encerrados = fila.filter((e) => e.status === 'FINALIZADO' || e.status === 'CANCELADO');
  // busca só filtra a exibição; contagens e "chamar próximo" continuam sobre a fila inteira
  const casa = (e) => contem(busca, e.veiculo?.placa, maskPlaca(e.veiculo?.placa), e.motorista?.nome, e.produtor?.nome, senhaFmt(e.senhaDiaria));
  const ordenar = (lista) => (ordemFila === 'espera' ? lista
    : [...lista].sort((a, b) => (b.senhaDiaria ?? 0) - (a.senhaDiaria ?? 0)));
  const aptos = aguardando.filter((e) => e.checklistStatus === 'APROVADO').length;
  const ocupacao = Object.fromEntries(ativos.map((e) => [e.localChamada, e]));
  // Veículo que já está na fila (aguardando ou em atendimento) não pode entrar de novo: some do select.
  const naFila = new Set([...ativos, ...aguardando].map((e) => e.veiculo?.id));
  const veiculosLivres = veiculos.filter((v) => !naFila.has(v.value));

  const Card = ({ e }) => {
    const st = STATUS[e.status] || STATUS.AGUARDANDO;
    const ck = CHECKLIST[e.checklistStatus] || CHECKLIST.PENDENTE;
    const encerrado = e.status === 'FINALIZADO' || e.status === 'CANCELADO';
    const ocupadoAqui = ocupado === e.id;
    const podeChamar = e.checklistStatus === 'APROVADO';
    const btn = 'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed';

    return (
      <div className={`flex flex-col gap-3 rounded-xl border border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between ${encerrado ? 'bg-slate-800/20 opacity-70' : 'bg-slate-800/40'}`}>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900 font-mono text-lg font-extrabold text-emerald-400" title="Senha do dia">
            {senhaFmt(e.senhaDiaria)}
            {e.dataReferencia && e.dataReferencia !== hoje && (
              <span className="text-[11px] font-semibold text-amber-400">
                {e.dataReferencia.split('-').reverse().slice(0, 2).join('/')}
              </span>
            )}
          </div>
          <div>
            <p className="text-lg font-bold tracking-wide text-white leading-tight">{maskPlaca(e.veiculo?.placa) || '—'}</p>
            <p className="text-sm text-slate-400">
              {e.motorista?.nome || 'Sem motorista'}{e.produtor?.nome ? ` · ${e.produtor.nome}` : ''}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
              {e.status === 'AGUARDANDO' && (
                <span className="flex items-center gap-1 text-slate-500"><Clock size={11} /> {tempoEspera(e.tempoEsperaSegundos)} na fila</span>
              )}
              {!encerrado && <span className={`rounded-full border px-2 py-0.5 font-semibold ${ck.cls}`}>{ck.label}</span>}
              {e.localChamada && (
                <span className="flex items-center gap-1 rounded-full border border-sky-500/40 px-2 py-0.5 font-semibold text-sky-400">
                  <MapPin size={11} /> {e.localChamada}
                </span>
              )}
              {e.pesagemId && <span className="text-emerald-400">Pesagem PES-{String(e.pesagemId).padStart(6, '0')}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${st.cls}`}>{st.label}</span>

          {e.status === 'AGUARDANDO' && (
            // Próximo passo em destaque: sem checklist aprovado → "Fazer checklist"; aprovado → "Chamar".
            <>
              <button onClick={() => navigate(`/fila/checklist/${e.id}`)}
                className={`${btn} ${podeChamar
                  ? 'border border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'}`}>
                <ClipboardCheck size={14} /> {podeChamar ? 'Ver checklist' : e.checklistStatus === 'REPROVADO' ? 'Refazer checklist' : 'Fazer checklist'}
              </button>
              {podeChamar ? (
                <button onClick={() => chamar(e)} disabled={ocupadoAqui} title={`Chamar para ${local || 'o local escolhido'}`}
                  className={`${btn} bg-sky-600 text-white hover:bg-sky-500`}>
                  <PhoneCall size={14} /> Chamar {local ? `p/ ${local}` : ''}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title="O veículo só pode ser chamado com o checklist aprovado">
                  <Lock size={12} /> chamar após checklist
                </span>
              )}
            </>
          )}
          {e.status === 'CHAMADO' && (
            <>
              <button onClick={() => acao(e.id, `/fila/${e.id}/atender`, null, () => `Senha ${senhaFmt(e.senhaDiaria)} em atendimento.`)}
                disabled={ocupadoAqui} title="O veículo chegou ao local" className={`${btn} bg-cyan-600 text-white hover:bg-cyan-500`}>
                <PlayCircle size={14} /> Iniciar atendimento
              </button>
              <button onClick={() => acao(e.id, `/fila/${e.id}/devolver`, null, () => `Senha ${senhaFmt(e.senhaDiaria)} voltou para a fila.`)}
                disabled={ocupadoAqui} title="Não compareceu: volta a aguardar na mesma posição"
                className={`${btn} border border-slate-700 text-slate-300 hover:bg-slate-700`}>
                <Undo2 size={14} /> Devolver à fila
              </button>
            </>
          )}
          {e.status === 'EM_ATENDIMENTO' && (
            <button onClick={() => navigate(`/pesagem/novo?entrada=${e.id}`)}
              className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}>
              <Scale size={14} /> Registrar pesagem
            </button>
          )}
          {!encerrado && (
            <button onClick={() => cancelar(e)} disabled={ocupadoAqui} title="Cancelar senha" aria-label="Cancelar senha"
              className={`${btn} w-8 justify-center px-0 border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20`}>
              <XCircle size={17} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const Grupo = ({ titulo, itens, vazio }) => (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{titulo} <span className="text-slate-600">({itens.length})</span></p>
      {itens.length === 0 ? <p className="text-sm text-slate-600">{vazio}</p> : itens.map((e) => <Card key={e.id} e={e} />)}
    </div>
  );

  return (
    <div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 pb-5 border-b border-slate-800 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl leading-tight">Fila de Descarga</h1>
            <p className="mt-1 text-sm text-slate-400">Chegada → checklist aprovado → chamada para a balança → pesagem.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/painel-fila" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700">
              <MonitorPlay size={16} /> Painel de chamadas
            </a>
            <button onClick={() => carregarFila()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </div>

        {/* Barra de chamada: local + chamar próximo apto */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className={labelCls}><MapPin size={13} className="mr-1 inline" /> Chamar para</span>
            {locais.map((l) => {
              const quem = ocupacao[l];
              return (
                <button key={l} onClick={() => setLocal(l)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${local === l
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
                  {l}
                  <span className={`ml-2 text-[11px] font-normal ${quem ? 'text-sky-400' : 'text-slate-500'}`}>
                    {quem ? `ocupada · ${senhaFmt(quem.senhaDiaria)}` : 'livre'}
                  </span>
                </button>
              );
            })}
            {locais.length === 0 && <span className="text-sm text-rose-400">Nenhum local configurado.</span>}
          </div>
          <button onClick={chamarProximo} disabled={!local || aptos === 0 || ocupado === 'proximo'}
            title={aptos === 0 ? 'Nenhum veículo com checklist aprovado' : `Chamar a próxima senha apta para ${local}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
            <PhoneCall size={16} /> Chamar próximo apto ({aptos})
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          {/* Registrar chegada */}
          <div className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <PlusCircle size={20} className="text-emerald-400" /> Registrar chegada
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}><Truck size={13} className="mr-1 inline" /> Veículo *</label>
                <Select options={veiculosLivres} value={selVeiculo} onChange={onSelectVeiculo}
                  placeholder="Digite a placa..." styles={selectStyles} {...selectMenuProps} autoFocus
                  noOptionsMessage={() => 'Nenhum veículo livre com essa placa'} />
                <p className="mt-1 text-[11px] text-slate-500">
                  Veículo novo? <button type="button" onClick={() => navigate('/veiculos/novo')} className="font-semibold text-emerald-500 hover:underline">Cadastrar veículo</button>
                  {' · '}<button type="button" onClick={() => navigate('/motoristas/novo')} className="font-semibold text-emerald-500 hover:underline">motorista</button>
                </p>
              </div>
              <div>
                <label className={labelCls}><User size={13} className="mr-1 inline" /> Motorista *</label>
                <Select options={motoristas} value={selMotorista} onChange={setSelMotorista}
                  placeholder="Motorista..." isClearable styles={selectStyles} {...selectMenuProps}
                  noOptionsMessage={() => 'Nenhum motorista'} />
              </div>
              <div>
                <label className={labelCls}><UserCircle size={13} className="mr-1 inline" /> Produtor <span className="text-slate-600">(opcional)</span></label>
                <Select options={produtores} value={selProdutor} onChange={setSelProdutor}
                  placeholder="Produtor..." isClearable styles={selectStyles} {...selectMenuProps}
                  noOptionsMessage={() => 'Nenhum produtor'} />
              </div>
              <div>
                <label className={labelCls}>Observação</label>
                <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2}
                  placeholder="Ex: carga de mandioca in natura"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500" />
              </div>
              <button onClick={registrarChegada} disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50">
                <PlusCircle size={18} /> {saving ? 'Registrando...' : 'Entrar na fila'}
              </button>
            </div>
          </div>

          {/* Painel da fila */}
          <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            {fila.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Truck size={40} className="mx-auto mb-3 opacity-40" />
                Nenhum veículo na fila hoje.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2.5">
                  <CampoBusca value={busca} onChange={setBusca} placeholder="Buscar placa, motorista, produtor ou senha" />
                  <FiltroSelect label="Ordem" value={ordemFila === 'espera' ? '' : ordemFila} onChange={(v) => setOrdemFila(v || 'espera')}
                    todos="Ordem de chegada" options={[{ value: 'recentes', label: 'Mais recentes primeiro' }]} />
                </div>
                <Grupo titulo="Chamados / em atendimento" itens={ordenar(ativos.filter(casa))} vazio={busca ? 'Nada encontrado.' : 'Nenhum veículo chamado.'} />
                <Grupo titulo="Aguardando" itens={ordenar(aguardando.filter(casa))} vazio={busca ? 'Nada encontrado.' : 'Ninguém aguardando.'} />
                {encerrados.length > 0 && <Grupo titulo="Encerrados hoje" itens={ordenar(encerrados.filter(casa))} vazio="Nada encontrado." />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
