import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Scale, Truck, Package, User, FileText,
  Gauge, Crosshair, Wifi, Activity,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Select from 'react-select';
import api from '../services/api';
import { pesoFromNumber, maskPlaca, maskPeso, unmaskInteiro } from '../utils/masks';
import { getSelectStyles, selectMenuProps } from '../theme/selectStyles';

const inputCls = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-xl font-bold text-white tabular-nums placeholder:text-slate-500 placeholder:font-normal outline-none transition font-mono'; // pesos: grandes para conferência rápida
const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-400';

const numPesagem = (n) => `PES-${String(n).padStart(6, '0')}`;

export default function TelaPesagem() {
  const [produtores, setProdutores] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [selProdutor, setSelProdutor] = useState(null);
  const [selVeiculo, setSelVeiculo] = useState(null);
  const [selProduto, setSelProduto] = useState(null);
  const [pesoBruto, setPesoBruto] = useState('');
  const [tara, setTara] = useState('');
  const [impureza, setImpureza] = useState(8);
  const [observacao, setObservacao] = useState('');
  const [pesoBalanca, setPesoBalanca] = useState(0); // simulado — futura integração Web Serial
  const [proximoNum, setProximoNum] = useState(1);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // Pesagem vinda da fila (/pesagem/novo?entrada=ID): veículo e produtor vêm da senha.
  const [params] = useSearchParams();
  const entradaId = params.get('entrada');
  const [entrada, setEntrada] = useState(null);
  const entradaInvalida = !!entrada && entrada.status !== 'EM_ATENDIMENTO';

  useEffect(() => {
    if (!entradaId) return;
    api.get(`/fila/${entradaId}`)
      .then((r) => setEntrada(r.data))
      .catch((e) => toast.error(e?.response?.data?.error || 'Senha da fila não encontrada.'));
  }, [entradaId]);

  // Preenche veículo/tara/produtor da senha assim que as listas carregarem.
  useEffect(() => {
    if (!entrada) return;
    const v = veiculos.find((o) => o.value === entrada.veiculo?.id);
    if (v) { setSelVeiculo(v); if (v.tara != null) setTara(String(v.tara)); }
    if (entrada.produtor) {
      setSelProdutor(produtores.find((o) => o.value === entrada.produtor.id)
        || { value: entrada.produtor.id, label: entrada.produtor.nome });
    }
  }, [entrada, veiculos, produtores]);

  const agora = useMemo(() => new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), []);
  const selectStyles = useMemo(() => getSelectStyles(), []);

  useEffect(() => {
    Promise.allSettled([
      api.get('/parceiros'), api.get('/veiculos'), api.get('/produtos'), api.get('/pesagens'),
    ]).then(([pa, ve, pr, pe]) => {
      const parceiros = pa.status === 'fulfilled' ? (pa.value.data || []) : [];
      setProdutores(parceiros
        .filter((p) => String(p.tipoParceiro || '').toUpperCase() === 'PRODUTOR')
        .map((p) => ({ value: p.id, label: p.nome || `Parceiro ${p.id}` })));

      const vs = ve.status === 'fulfilled' ? (ve.value.data || []) : [];
      setVeiculos(vs.filter((v) => v.statusAtivo !== false).map((v) => ({
        value: v.id, label: `${maskPlaca(v.placa)}${v.modelo ? ' — ' + v.modelo : ''}`,
        tara: v.tara, placa: v.placa, motorista: v.motorista?.nome,
      })));

      const ps = pr.status === 'fulfilled' ? (pr.value.data || []) : [];
      setProdutos(ps.map((p) => ({ value: p.id, label: p.nome })));

      const todas = pe.status === 'fulfilled' ? (pe.value.data || []) : [];
      const maxId = todas.reduce((m, p) => Math.max(m, p.id || 0), 0);
      setProximoNum(maxId + 1);
    });
  }, []);

  const handleVeiculo = (opt) => {
    setSelVeiculo(opt);
    if (opt && opt.tara != null) setTara(String(opt.tara));
  };

  const capturarPeso = () => {
    if (pesoBalanca > 0) { setPesoBruto(maskPeso(String(pesoBalanca))); toast.success('Peso capturado da balança.'); }
    else toast('Balança sem leitura. Integração ainda não conectada.', { icon: '⚖️' });
  };

  // valores numéricos a partir das strings mascaradas
  const brutoNum = useMemo(() => unmaskInteiro(pesoBruto), [pesoBruto]);
  const taraNum = useMemo(() => unmaskInteiro(tara), [tara]);

  const pesoLiquido = useMemo(() => Math.max(0, brutoNum - taraNum), [brutoNum, taraNum]);

  const descontoImpureza = useMemo(() => {
    const imp = Math.min(Math.max(parseFloat(impureza) || 0, 0), 100);
    return pesoLiquido * (imp / 100);
  }, [pesoLiquido, impureza]);

  const pesoFinal = useMemo(() => Math.max(0, pesoLiquido - descontoImpureza), [pesoLiquido, descontoImpureza]);

  // Validação
  const erros = useMemo(() => {
    const e = [];
    if (!selProdutor) e.push('Selecione o produtor.');
    const i = parseFloat(impureza);
    if (brutoNum <= 0) e.push('Informe o peso bruto.');
    if (taraNum < 0) e.push('Informe a tara.');
    if (brutoNum > 0 && taraNum > 0 && brutoNum <= taraNum) e.push('Peso bruto deve ser maior que a tara.');
    if (Number.isNaN(i) || i < 0) e.push('Impureza inválida.');
    if (pesoFinal < 0) e.push('Peso final não pode ser negativo.');
    if (entradaInvalida) e.push('A senha da fila precisa estar em atendimento na balança.');
    return e;
  }, [selProdutor, brutoNum, taraNum, impureza, pesoFinal, entradaInvalida]);

  const valido = erros.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valido) { toast.error(erros[0]); return; }
    setSaving(true);
    try {
      await api.post(`/pesagens${entradaId ? `?entradaFila=${entradaId}` : ''}`, {
        produtor: { id: selProdutor.value },
        veiculo: selVeiculo ? { id: selVeiculo.value } : null,
        produto: selProduto ? { id: selProduto.value } : null,
        pesoBruto: brutoNum,
        pesoTara: taraNum,
        percentualImpureza: parseFloat(impureza) || 0,
      });
      toast.success(entradaId ? 'Pesagem registrada — senha finalizada na fila.' : 'Pesagem registrada com sucesso.');
      navigate(entradaId ? '/fila' : '/pesagem');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível salvar a pesagem.');
    } finally { setSaving(false); }
  };

  const Step = ({ n, label }) => (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-400">{n}</span>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-1 rounded-full bg-amber-500" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Módulo Balança · {numPesagem(proximoNum)}</p>
            <h1 className="text-2xl font-bold text-white">Nova Pesagem de Carga</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">{agora}</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate(entradaId ? '/fila' : '/pesagem')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition">
          <ArrowLeft size={15} /> Voltar
        </button>
      </div>

      {entrada && (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border p-4 text-sm ${entradaInvalida
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'}`}>
          <span className="font-mono font-bold">Senha #{String(entrada.senhaDiaria ?? 0).padStart(3, '0')}</span>
          <span>{maskPlaca(entrada.veiculo?.placa)} · {entrada.motorista?.nome}</span>
          {entrada.localChamada && <span>{entrada.localChamada}</span>}
          <span className="font-semibold">
            {entradaInvalida
              ? `Não é possível pesar: a senha está ${entrada.status.toLowerCase().replace('_', ' ')}.`
              : 'Ao salvar, a senha é finalizada na fila.'}
          </span>
        </div>
      )}

      {/* Bloco BALANÇA */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Gauge size={28} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Peso na Balança</p>
              <p className="text-4xl font-black text-white font-mono tracking-tight">
                {pesoBalanca.toLocaleString('pt-BR')}<span className="text-lg text-slate-500 ml-1">kg</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-400">
              <Activity size={12} /> Aguardando integração
            </span>
            <button type="button" onClick={capturarPeso}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 active:scale-95 transition">
              <Crosshair size={15} /> Capturar Peso
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-600">
          A leitura automática via balança serial (Web Serial) será conectada futuramente. Por ora, informe o peso manualmente ou use "Capturar Peso".
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-3">
        {/* Coluna esquerda — 2/3 */}
        <div className="xl:col-span-2 space-y-5">
          {/* Etapa 1 — Dados da carga */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
            <Step n="1" label="Dados da Carga" />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}><User size={11} className="inline mr-1" />Produtor Rural *</span>
                <div className="mt-2">
                  <Select value={selProdutor} onChange={setSelProdutor} options={produtores} isDisabled={!!entrada?.produtor}
                    styles={selectStyles} {...selectMenuProps} placeholder="Pesquisar produtor..." />
                </div>
              </label>
              <label className="block">
                <span className={labelCls}><Package size={11} className="inline mr-1" />Produto / Tipo de Carga</span>
                <div className="mt-2">
                  <Select value={selProduto} onChange={setSelProduto} options={produtos}
                    styles={selectStyles} {...selectMenuProps} isClearable placeholder="Ex: Mandioca..." />
                </div>
              </label>
              <label className="block">
                <span className={labelCls}><Truck size={11} className="inline mr-1" />Veículo</span>
                <div className="mt-2">
                  <Select value={selVeiculo} onChange={handleVeiculo} options={veiculos} isDisabled={!!entrada}
                    styles={selectStyles} {...selectMenuProps} isClearable placeholder="Selecione (preenche a tara)..." />
                </div>
              </label>
              <label className="block">
                <span className={labelCls}>Motorista / Placa</span>
                <div className="mt-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400">
                  {selVeiculo ? (
                    <span>{selVeiculo.motorista || 'Sem motorista'} · <span className="font-mono">{maskPlaca(selVeiculo.placa)}</span></span>
                  ) : <span className="text-slate-600">Selecione um veículo</span>}
                </div>
              </label>
            </div>
          </div>

          {/* Etapa 2 — Pesos */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
            <Step n="2" label="Pesos e Descontos" />
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={labelCls}>Peso Bruto (kg) *</span>
                <input type="text" inputMode="numeric" value={pesoBruto} onChange={(e) => setPesoBruto(maskPeso(e.target.value))} placeholder="0" className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Tara (kg) * {selVeiculo && <span className="text-emerald-400 normal-case lowercase">auto</span>}</span>
                <input type="text" inputMode="numeric" value={tara} onChange={(e) => setTara(maskPeso(e.target.value))} placeholder="0" className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Impureza (%)</span>
                <input type="number" min="0" max="100" step="0.1" value={impureza} onChange={(e) => setImpureza(e.target.value)} placeholder="8" className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className={labelCls}><FileText size={11} className="inline mr-1" />Observações</span>
              <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2}
                placeholder="Notas sobre a carga (opcional)..."
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition resize-none" />
            </label>
          </div>
        </div>

        {/* Coluna direita — Resumo (Etapa 3) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 flex flex-col self-start sticky top-24">
          <Step n="3" label="Resumo Final" />
          <div className="space-y-1 mt-5 flex-1">
            {[
              { label: 'Peso Bruto', value: pesoFromNumber(brutoNum) },
              { label: 'Tara', value: `− ${pesoFromNumber(taraNum)}` },
              { label: 'Peso Líquido', value: pesoFromNumber(pesoLiquido), strong: true },
              { label: `Impureza (${parseFloat(impureza) || 0}%)`, value: `− ${pesoFromNumber(descontoImpureza)}` },
            ].map((row) => (
              <div key={row.label} className="flex justify-between py-2.5 border-b border-dashed border-slate-800">
                <span className="text-sm text-slate-500">{row.label}</span>
                <span className={`text-sm font-mono ${row.strong ? 'font-bold text-white' : 'text-slate-300'}`}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Peso Final destacado */}
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Peso Final</p>
            <p className="text-3xl font-black text-white font-mono tracking-tight mt-1">{pesoFromNumber(pesoFinal)}</p>
          </div>

          {/* Erros */}
          {erros.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 space-y-0.5">
              {erros.map((er, i) => (
                <p key={i} className="text-[11px] text-amber-400">• {er}</p>
              ))}
            </div>
          )}

          <button type="submit" disabled={saving || !valido}
            className="mt-5 w-full rounded-lg bg-emerald-600 py-4 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition">
            <Save size={15} className="inline mr-2" />
            {saving ? 'Salvando...' : 'Finalizar Registro'}
          </button>
        </div>
      </form>
    </div>
  );
}
