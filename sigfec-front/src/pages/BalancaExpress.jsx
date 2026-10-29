import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Save, Scale, ChevronDown, Truck, Wheat, Activity, Plug, PlugZap, Radio, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Logo from '../components/Logo';
import useBalancaSerial from '../hooks/useBalancaSerial.jsx';

const inputCls = 'w-full rounded-xl border-2 border-slate-700 bg-slate-800/80 px-6 py-5 text-3xl font-mono font-bold text-white text-center placeholder:text-slate-600 outline-none focus:border-emerald-500 focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/20 transition';

export default function BalancaExpress() {
  const navigate = useNavigate();
  const [produtores, setProdutores] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [produtoId, setProdutoId] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [produtorId, setProdutorId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');
  const [pesoBruto, setPesoBruto] = useState('');
  const [pesoTara, setPesoTara] = useState('');
  const [impureza, setImpureza] = useState('8');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [now, setNow] = useState(new Date());
  const balanca = useBalancaSerial();
  const [autoFill, setAutoFill] = useState(true);

  // Auto-preenche pesoBruto enquanto balança lê (se autoFill ligado)
  useEffect(() => {
    if (!autoFill) return;
    if (!balanca.connected && !balanca.mockMode) return;
    if (balanca.weight > 0) {
      setPesoBruto(String(balanca.weight.toFixed(2)));
    }
  }, [balanca.weight, balanca.connected, balanca.mockMode, autoFill]);

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Promise.allSettled([
      api.get('/parceiros'),
      api.get('/veiculos'),
      api.get('/produtos'),
    ]).then(([par, vei, pro]) => {
      const allParceiros = par.status === 'fulfilled' ? (par.value.data || []) : [];
      setProdutores(allParceiros.filter((p) => String(p.tipoParceiro || '').toUpperCase() === 'PRODUTOR'));
      setVeiculos(vei.status === 'fulfilled' ? (vei.value.data || []) : []);
      setProdutos(pro.status === 'fulfilled' ? (pro.value.data || []) : []);
    });
  }, []);

  // Auto-fill tara ao trocar veículo
  useEffect(() => {
    if (!veiculoId) return;
    const v = veiculos.find((x) => String(x.id) === String(veiculoId));
    if (v?.tara && !pesoTara) setPesoTara(String(v.tara));
  }, [veiculoId, veiculos]);

  // ESC sai
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') navigate('/pesagem');
      if (e.key === 'F10') handleSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const pesoLiquido = useMemo(() => {
    const b = parseFloat(pesoBruto), t = parseFloat(pesoTara);
    return Number.isNaN(b) || Number.isNaN(t) ? 0 : Math.max(0, b - t);
  }, [pesoBruto, pesoTara]);

  const pesoFinal = useMemo(() => {
    const i = parseFloat(impureza);
    return Math.max(0, pesoLiquido * (1 - Math.min(Math.max(Number.isNaN(i) ? 0 : i, 0), 100) / 100));
  }, [pesoLiquido, impureza]);

  const handleSubmit = async () => {
    if (!produtorId) { toast.error('Selecione o produtor'); return; }
    const b = parseFloat(pesoBruto), t = parseFloat(pesoTara);
    if (Number.isNaN(b) || Number.isNaN(t) || b < t) { toast.error('Pesos inválidos'); return; }
    setSaving(true);
    try {
      await api.post('/pesagens', {
        produtor: { id: Number(produtorId) },
        veiculo: veiculoId ? { id: Number(veiculoId) } : null,
        produto: produtoId ? { id: Number(produtoId) } : null,
        pesoBruto: b, pesoTara: t,
        percentualImpureza: parseFloat(impureza) || 0,
      });
      toast.success(`Pesagem #${savedCount + 1} registrada!`);
      setSavedCount((n) => n + 1);
      // reset rápido pra próxima carga
      setPesoBruto('');
      setVeiculoId('');
      setPesoTara('');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3 min-w-0">
          <Logo size={28} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Modo Express</p>
            <p className="text-sm font-bold text-white truncate">Balança</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Status balança serial */}
          {(balanca.connected || balanca.mockMode) ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
              <Radio size={12} className="text-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                {balanca.mockMode ? 'Simulação' : 'Balança Ativa'}
              </span>
              <button type="button"
                onClick={balanca.mockMode ? balanca.stopMock : balanca.disconnect}
                className="text-[10px] text-slate-500 hover:text-rose-400 transition">
                ×
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5">
              {balanca.supported && (
                <button type="button" onClick={() => balanca.connect()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400 transition"
                  title="Conectar balança via porta serial (Web Serial API)">
                  <Plug size={12} /> Conectar Balança
                </button>
              )}
              <button type="button" onClick={balanca.startMock}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:border-amber-500/30 hover:text-amber-400 transition"
                title="Simular leitura para demonstração">
                <Zap size={12} /> Mock
              </button>
            </div>
          )}
          <div className="text-right">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500">Pesagens</p>
            <p className="text-lg sm:text-2xl font-bold font-mono text-emerald-400">{savedCount}</p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Horário</p>
            <p className="text-2xl font-bold font-mono text-white tabular-nums">
              {now.toLocaleTimeString('pt-BR')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/pesagem')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-semibold text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition"
            title="Esc"
          >
            <X size={16} /> <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Display gigante peso líquido */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-800 bg-gradient-to-b from-emerald-500/5 to-transparent px-4 sm:px-8 py-6 sm:py-10"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 sm:gap-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400 mb-2">Peso Líquido</p>
            <motion.p
              key={pesoLiquido}
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
              className="text-5xl sm:text-7xl lg:text-9xl font-black font-mono text-white tabular-nums leading-none break-all"
            >
              {pesoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xl sm:text-2xl lg:text-3xl text-emerald-400 ml-2 sm:ml-3">kg</span>
            </motion.p>
            <p className="mt-3 text-xs sm:text-sm text-slate-500">
              Após impureza: <span className="text-amber-400 font-bold font-mono">{pesoFinal.toFixed(2)} kg</span>
            </p>
          </div>

          {/* Leitura ao vivo da balança serial */}
          {(balanca.connected || balanca.mockMode) && (
            <div className="hidden md:block rounded-xl border border-emerald-500/30 bg-slate-900/80 backdrop-blur p-4 min-w-[240px]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <PlugZap size={11} /> Leitura ao vivo
                </p>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={autoFill} onChange={(e) => setAutoFill(e.target.checked)}
                    className="h-3 w-3 rounded border-slate-700 bg-slate-800 accent-emerald-500" />
                  <span className="text-[9px] uppercase tracking-widest text-slate-500">Auto-fill</span>
                </label>
              </div>
              <p className="text-4xl font-bold font-mono text-emerald-400 tabular-nums">
                {balanca.weight.toFixed(2)}
                <span className="text-sm text-slate-500 ml-1">kg</span>
              </p>
              <p className="mt-2 text-[10px] text-slate-600">
                Modo: <span className="text-slate-400">{balanca.mockMode ? 'Simulação' : 'Serial (USB/RS-232)'}</span>
              </p>
            </div>
          )}

          {!balanca.connected && !balanca.mockMode && (
            <div className="hidden lg:block shrink-0">
              <Scale size={140} className="text-emerald-500/10" strokeWidth={1} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Form */}
      <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Coluna esquerda — pesos */}
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">
                  <span>Peso Bruto (kg)</span>
                  {(balanca.connected || balanca.mockMode) && autoFill && (
                    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400">
                      <Radio size={9} className="animate-pulse" /> via balança
                    </span>
                  )}
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={pesoBruto}
                  onChange={(e) => setPesoBruto(e.target.value)}
                  placeholder="0,00"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-sky-400 mb-2">
                  Tara (kg)
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={pesoTara}
                  onChange={(e) => setPesoTara(e.target.value)}
                  placeholder="0,00"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-rose-400 mb-2">
                Impureza (%)
              </label>
              <input
                type="number" step="0.1" min="0" max="100"
                value={impureza}
                onChange={(e) => setImpureza(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 text-2xl font-mono font-bold text-white text-center outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 transition"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !produtorId || !pesoBruto || !pesoTara}
              className="w-full rounded-xl bg-emerald-600 py-7 text-2xl font-black uppercase tracking-widest text-white hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition shadow-2xl shadow-emerald-900/50 flex items-center justify-center gap-3"
              title="F10"
            >
              <Save size={28} />
              {saving ? 'Salvando...' : 'Registrar Pesagem'}
              <kbd className="ml-3 rounded border-2 border-emerald-300 bg-emerald-700 px-3 py-1 text-xs font-mono">F10</kbd>
            </button>
          </div>

          {/* Coluna direita — selects */}
          <div className="space-y-4">
            <SelectField
              label="Produtor"
              icon={Activity}
              accent="emerald"
              value={produtorId}
              onChange={setProdutorId}
              options={produtores.map((p) => ({ value: p.id, label: p.nome }))}
              placeholder="Selecione produtor..."
              required
            />
            <SelectField
              label="Veículo"
              icon={Truck}
              accent="sky"
              value={veiculoId}
              onChange={setVeiculoId}
              options={veiculos.map((v) => ({ value: v.id, label: `${v.placa} — ${v.modelo || 'sem modelo'}` }))}
              placeholder="Selecione veículo..."
            />
            <SelectField
              label="Produto"
              icon={Wheat}
              accent="amber"
              value={produtoId}
              onChange={setProdutoId}
              options={produtos.map((p) => ({ value: p.id, label: p.nome }))}
              placeholder="Selecione produto..."
            />

            {/* Hint atalhos */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center justify-between"><span>Salvar</span><kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono">F10</kbd></div>
              <div className="flex items-center justify-between"><span>Sair</span><kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono">Esc</kbd></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, icon: Icon, accent, value, onChange, options, placeholder, required }) {
  const A = {
    emerald: 'border-emerald-500/30 text-emerald-400',
    sky: 'border-sky-500/30 text-sky-400',
    amber: 'border-amber-500/30 text-amber-400',
  }[accent];
  return (
    <div>
      <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2 ${A.split(' ')[1]}`}>
        <Icon size={12} /> {label}{required && ' *'}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-lg border bg-slate-800 px-4 py-3 pr-10 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-emerald-500/30 transition ${value ? A : 'border-slate-700'}`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
    </div>
  );
}
