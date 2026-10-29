import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Printer, Save, Beaker, Droplets, FlaskConical, Sun,
  Plus, Trash2, Scale,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const inputCls = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition';
const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-400';

const novaAmostra = (n) => ({ numeroAmostra: n, rendaGramas: '' });

export default function LaboratorioForm() {
  const [pesagens, setPesagens] = useState([]);
  const [form, setForm] = useState({
    cargaId: '',
    umidade: '', ph: '', acidez: '', granulometria: '', cor: '',
    metodoSecagem: '', observacao: '',
  });
  // Mínimo 2 amostras (regra: ≤15t → 2, >15t → 3-4)
  const [amostras, setAmostras] = useState([novaAmostra(1), novaAmostra(2)]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/pesagens')
      .then(({ data }) => setPesagens((data || []).filter((p) => p.gramasAmido == null))) // só cargas sem laudo
      .catch(() => toast.error('Falha ao carregar pesagens.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedCarga = pesagens.find((p) => String(p.id) === String(form.cargaId));
  const pesoLiquido = selectedCarga ? Number(selectedCarga.pesoLiquido || 0) : 0;
  const toneladas = pesoLiquido / 1000;

  // Carga >15t exige 3+ amostras
  const minAmostras = toneladas > 15 ? 3 : 2;

  // Renda média (sem descarte)
  const rendaMedia = useMemo(() => {
    const validas = amostras.map((a) => Number(a.rendaGramas)).filter((v) => v > 0);
    if (!validas.length) return 0;
    return validas.reduce((s, v) => s + v, 0) / validas.length;
  }, [amostras]);

  const classificacao = useMemo(() => {
    if (rendaMedia >= 500) return { label: 'APROVADO', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (rendaMedia >= 350) return { label: 'APROVADO COM DESCONTO', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (rendaMedia > 0) return { label: 'REPROVADO', cls: 'text-red-400 bg-red-500/10 border-red-500/20' };
    return { label: 'AGUARDANDO', cls: 'text-slate-400 bg-slate-700 border-slate-600' };
  }, [rendaMedia]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const setAmostra = (idx, value) => {
    setAmostras((prev) => prev.map((a, i) => i === idx ? { ...a, rendaGramas: value } : a));
  };

  const addAmostra = () => {
    if (amostras.length >= 4) { toast.error('Máximo de 4 amostras.'); return; }
    setAmostras((prev) => [...prev, novaAmostra(prev.length + 1)]);
  };

  const removeAmostra = (idx) => {
    if (amostras.length <= 2) { toast.error('Mínimo de 2 amostras.'); return; }
    setAmostras((prev) => prev.filter((_, i) => i !== idx).map((a, i) => ({ ...a, numeroAmostra: i + 1 })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cargaId) { toast.error('Selecione a carga.'); return; }
    const validas = amostras.filter((a) => Number(a.rendaGramas) > 0);
    if (validas.length < minAmostras) {
      toast.error(`Carga de ${toneladas.toFixed(1)}t exige no mínimo ${minAmostras} amostras.`);
      return;
    }
    setSaving(true);
    try {
      await api.post(`/laboratorio/pesagem/${form.cargaId}`, {
        amostras: validas.map((a, i) => ({ numeroAmostra: i + 1, rendaGramas: Number(a.rendaGramas) })),
        umidade: form.umidade ? Number(form.umidade) : null,
        ph: form.ph ? Number(form.ph) : null,
        acidez: form.acidez ? Number(form.acidez) : null,
        granulometria: form.granulometria ? Number(form.granulometria) : null,
        cor: form.cor || null,
        metodoSecagem: form.metodoSecagem || null,
        observacao: form.observacao || null,
      });
      toast.success('Laudo finalizado. Conta a pagar do produtor gerada no financeiro.');
      navigate('/laboratorio');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível finalizar o laudo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-1 rounded-full bg-fuchsia-500" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Laboratório</p>
            <h1 className="text-2xl font-bold text-white">Análise de Renda</h1>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/laboratorio')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition">
          <ArrowLeft size={15} /> Voltar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identificação */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-fuchsia-500">
            <Beaker size={16} className="text-fuchsia-400" />
            <span className="text-sm font-bold text-white">Identificação da Carga</span>
          </div>
          <div className="p-6">
            <label className="block">
              <span className={labelCls}>Carga (Pesagem)</span>
              <select name="cargaId" value={form.cargaId} onChange={handleChange} disabled={loading} className={inputCls} required>
                <option value="">{loading ? 'Carregando...' : 'Selecione a carga'}</option>
                {pesagens.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} • {p.produtorNome || 'Produtor não informado'} • {Number(p.pesoFinal ?? p.pesoLiquido ?? 0).toLocaleString('pt-BR')} kg
                  </option>
                ))}
              </select>
            </label>
            {selectedCarga && (
              <p className="mt-2 text-xs text-slate-500">
                Peso líquido: <span className="text-white font-mono">{toneladas.toFixed(2)} t</span>
                {' • '}Amostras mínimas: <span className="text-fuchsia-400 font-bold">{minAmostras}</span>
                {toneladas > 15 && <span className="text-amber-400"> (carga acima de 15t)</span>}
              </p>
            )}
          </div>
        </div>

        {/* Amostras balança hidrostática */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-emerald-500">
            <Scale size={16} className="text-emerald-400" />
            <span className="text-sm font-bold text-white">Amostras — Balança Hidrostática</span>
            <span className="ml-auto text-[11px] uppercase tracking-widest text-slate-600">Renda em gramas</span>
          </div>
          <div className="p-6 space-y-3">
            {amostras.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-sm font-bold text-emerald-400">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <input
                    type="number" min="0" max="700" step="0.01"
                    value={a.rendaGramas}
                    onChange={(e) => setAmostra(i, e.target.value)}
                    placeholder="Renda lida na balança (g) — ex: 480.00"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white font-mono placeholder:text-slate-500 outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <button type="button" onClick={() => removeAmostra(i)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Remover amostra">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addAmostra}
              disabled={amostras.length >= 4}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 disabled:opacity-40 transition">
              <Plus size={13} /> Adicionar Amostra ({amostras.length}/4)
            </button>
            <p className="text-[11px] text-slate-600 leading-5">
              Renda = leitura da balança hidrostática para amostra-padrão de 5 kg de raízes.
              Faixa típica: 280–650 g. <strong className="text-slate-400">Nenhuma amostra é descartada</strong> — média de todas (norma ABAM).
            </p>
          </div>
        </div>

        {/* Físico-química */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-sky-500">
            <Droplets size={16} className="text-sky-400" />
            <span className="text-sm font-bold text-white">Análise Físico-Química</span>
            <span className="ml-auto text-[11px] uppercase tracking-widest text-slate-600">Opcional</span>
          </div>
          <div className="p-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Umidade (%)</span>
              <input type="number" min="0" max="100" step="0.01" name="umidade" value={form.umidade} onChange={handleChange} placeholder="0.00" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>pH</span>
              <input type="number" min="0" max="14" step="0.01" name="ph" value={form.ph} onChange={handleChange} placeholder="0.00" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Acidez (mL NaOH/100g)</span>
              <input type="number" min="0" step="0.01" name="acidez" value={form.acidez} onChange={handleChange} placeholder="0.00" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Granulometria (mesh)</span>
              <input type="number" min="0" name="granulometria" value={form.granulometria} onChange={handleChange} placeholder="80" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Cor</span>
              <input type="text" name="cor" value={form.cor} onChange={handleChange} placeholder="Branco / Off-white" className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sun size={11} /> Método Secagem
              </span>
              <select name="metodoSecagem" value={form.metodoSecagem} onChange={handleChange} className={inputCls}>
                <option value="">Selecione...</option>
                <option value="SOLAR">Secagem Solar</option>
                <option value="AUTOMATIZADA">Automatizada</option>
              </select>
            </label>
          </div>
        </div>

        {/* Observação */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <label className="block">
            <span className={labelCls}>Observação</span>
            <input name="observacao" value={form.observacao} onChange={handleChange} placeholder="Notas técnicas, anomalias..." className={inputCls} />
          </label>
        </div>

        {/* Resultado renda */}
        <div className={`rounded-xl border p-6 flex items-center justify-between gap-6 ${classificacao.cls.split(' ')[2]} ${classificacao.cls.split(' ')[1]}`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${classificacao.cls.split(' ')[0]}`}>Renda Média</p>
            <p className="mt-2 text-5xl font-bold font-mono text-white">
              {rendaMedia.toFixed(2)}<span className="text-2xl text-slate-400"> g</span>
            </p>
            <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${classificacao.cls}`}>
              {classificacao.label}
            </span>
          </div>
          <div className="hidden sm:block text-xs text-slate-500 leading-5 text-right">
            <p className="font-semibold text-slate-400 mb-1">Classificação por renda</p>
            <p>≥500g: APROVADO</p>
            <p>≥350g: APROVADO C/ DESCONTO</p>
            <p>&lt;350g: REPROVADO</p>
            <p className="mt-2 text-slate-600">Pagamento = peso(t) × renda × preço/g</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button"
            onClick={() => { toast.success('Enviando para impressão.'); window.print(); }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition">
            <Printer size={15} /> Imprimir Etiqueta
          </button>
          <button type="submit" disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
            <Save size={15} /> {saving ? 'Finalizando...' : 'Finalizar Laudo'}
          </button>
        </div>
      </form>
    </div>
  );
}
