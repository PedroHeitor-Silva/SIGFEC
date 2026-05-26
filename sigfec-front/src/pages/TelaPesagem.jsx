import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Select from 'react-select';
import api from '../services/api';

const selectStyles = {
  control: (p, s) => ({
    ...p,
    backgroundColor: '#1e293b',
    borderColor: s.isFocused ? '#10b981' : '#334155',
    borderRadius: '0.5rem',
    color: 'white',
    padding: '2px',
    boxShadow: s.isFocused ? '0 0 0 1px #10b981' : 'none',
    '&:hover': { borderColor: '#10b981' },
  }),
  menu: (p) => ({ ...p, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem' }),
  menuPortal: (p) => ({ ...p, zIndex: 9999 }),
  menuList: (p) => ({ ...p, maxHeight: '260px' }),
  option: (p, s) => ({
    ...p,
    backgroundColor: s.isSelected ? '#059669' : s.isFocused ? '#064e3b' : 'transparent',
    color: 'white',
    cursor: 'pointer',
  }),
  singleValue: (p) => ({ ...p, color: 'white' }),
  placeholder: (p) => ({ ...p, color: '#64748b' }),
  input: (p) => ({ ...p, color: 'white' }),
};

const selectMenuProps = {
  menuPortalTarget: typeof document !== 'undefined' ? document.body : null,
  menuPosition: 'fixed',
};

const inputCls = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-lg text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition';

export default function TelaPesagem() {
  const [produtores, setProdutores] = useState([]);
  const [selectedProdutor, setSelectedProdutor] = useState(null);
  const [loadingProdutores, setLoadingProdutores] = useState(true);
  const [pesoBruto, setPesoBruto] = useState('');
  const [tara, setTara] = useState('');
  const [impureza, setImpureza] = useState(8);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/parceiros')
      .then(({ data }) => {
        const parceiros = Array.isArray(data) ? data : [];
        setProdutores(
          parceiros
            .filter((p) => String(p.tipoParceiro || p.tipo_parceiro || '').toUpperCase() === 'PRODUTOR')
            .map((p) => ({ value: p.id, label: p.nome || `Parceiro ${p.id}` }))
        );
      })
      .catch(() => toast.error('Não foi possível carregar os produtores.'))
      .finally(() => setLoadingProdutores(false));
  }, []);

  const pesoLiquido = useMemo(() => {
    const b = parseFloat(pesoBruto), t = parseFloat(tara);
    return Number.isNaN(b) || Number.isNaN(t) ? 0 : Math.max(0, b - t);
  }, [pesoBruto, tara]);

  const pesoFinal = useMemo(() => {
    const imp = parseFloat(impureza);
    return Math.max(0, pesoLiquido * (1 - Math.min(Math.max(Number.isNaN(imp) ? 0 : imp, 0), 100) / 100));
  }, [pesoLiquido, impureza]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProdutor) { toast.error('Selecione um produtor.'); return; }
    const b = parseFloat(pesoBruto), t = parseFloat(tara), i = parseFloat(impureza);
    if (Number.isNaN(b) || Number.isNaN(t) || Number.isNaN(i)) { toast.error('Preencha todos os campos numéricos.'); return; }
    if (b < t) { toast.error('Peso bruto deve ser maior que a tara.'); return; }
    setSaving(true);
    try {
      await api.post('/pesagens', {
        produtor: { id: selectedProdutor.value },
        pesoBruto: b, pesoTara: t, percentualImpureza: i,
        dataHoraEntrada: new Date().toISOString(),
      });
      toast.success('Pesagem salva com sucesso.');
      navigate('/pesagem');
    } catch {
      toast.error('Não foi possível salvar a pesagem.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-1 rounded-full bg-emerald-500" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Módulo Balança</p>
            <h1 className="text-2xl font-bold text-white">Nova Pesagem de Carga</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/pesagem')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
        >
          <ArrowLeft size={15} /> Voltar
        </button>
      </div>

      {/* Display peso líquido */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-5 flex items-center justify-between gap-6">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">Peso Líquido</p>
        <p className="text-5xl font-bold font-mono text-white">{pesoLiquido.toFixed(2)}<span className="text-xl text-slate-400 ml-1">kg</span></p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-2">
        {/* Dados de campo */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-4">Dados de Campo</p>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Produtor Rural</span>
            <div className="mt-2">
              <Select
                value={selectedProdutor}
                onChange={setSelectedProdutor}
                options={produtores}
                styles={selectStyles}
                {...selectMenuProps}
                placeholder={loadingProdutores ? 'Carregando...' : 'Pesquisar produtor...'}
                isDisabled={loadingProdutores}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Peso Bruto (kg)</span>
            <input type="number" min="0" step="0.01" value={pesoBruto} onChange={(e) => setPesoBruto(e.target.value)} placeholder="0.00" className={inputCls} />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tara do Veículo (kg)</span>
            <input type="number" min="0" step="0.01" value={tara} onChange={(e) => setTara(e.target.value)} placeholder="0.00" className={inputCls} />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Impureza (%)</span>
            <input type="number" min="0" max="100" step="0.1" value={impureza} onChange={(e) => setImpureza(e.target.value)} placeholder="0.0" className={inputCls} />
          </label>
        </div>

        {/* Resumo */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 flex flex-col">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-4 mb-5">Resumo da Carga</p>

          <div className="space-y-3 flex-1">
            {[
              { label: 'Peso Bruto', value: `${parseFloat(pesoBruto) || 0} kg` },
              { label: 'Tara', value: `${parseFloat(tara) || 0} kg` },
              { label: 'Peso Líquido', value: `${pesoLiquido.toFixed(2)} kg`, highlight: true },
              { label: `Impureza (${impureza}%)`, value: `−${(pesoLiquido - pesoFinal).toFixed(2)} kg` },
              { label: 'Peso Final', value: `${pesoFinal.toFixed(2)} kg`, accent: true },
            ].map((row) => (
              <div key={row.label} className="flex justify-between py-2.5 border-b border-dashed border-slate-800">
                <span className="text-sm text-slate-500">{row.label}</span>
                <span className={`text-sm font-bold font-mono ${row.accent ? 'text-emerald-400' : 'text-white'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full rounded-lg bg-emerald-600 py-4 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
          >
            <Save size={15} className="inline mr-2" />
            {saving ? 'Salvando...' : 'Finalizar Registro'}
          </button>
        </div>
      </form>
    </div>
  );
}
