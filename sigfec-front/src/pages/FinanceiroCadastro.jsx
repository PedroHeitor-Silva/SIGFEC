import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { maskMoeda, unmaskMoeda } from '../utils/masks';
import { maxParcelas, dividirParcelas } from '../utils/formasPagamento';

const fmtMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
/** Vencimento da parcela i (mesma regra do backend: +1 mês por parcela). */
const vencimentoParcela = (iso, i) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + i);
  return d.toLocaleDateString('pt-BR');
};

const inputCls = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition';
const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-400';

export default function FinanceiroCadastro() {
  const [tipo, setTipo] = useState('RECEBER');
  const [parceiros, setParceiros] = useState([]);
  const [form, setForm] = useState({
    parceiroId: '', valorOriginal: '', dataEmissao: '', dataVencimento: '',
    statusFinanceiro: 'ABERTO', descricao: '', parcelas: 1,
  });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/parceiros').then(({ data }) => setParceiros(data || [])).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: name === 'valorOriginal' ? maskMoeda(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.parceiroId) { toast.error('Selecione um parceiro.'); return; }
    setSaving(true);

    const parceiroRef = { id: Number(form.parceiroId) };
    const body = {
      valorOriginal: unmaskMoeda(form.valorOriginal),
      dataEmissao: form.dataEmissao || null,
      dataVencimento: form.dataVencimento,
      descricao: form.descricao,
      ...(tipo === 'PAGAR' ? { fornecedor: parceiroRef } : { cliente: parceiroRef }),
    };

    try {
      const n = Number(form.parcelas) || 1;
      await api.post(`/financeiro/${tipo === 'PAGAR' ? 'pagar' : 'receber'}`, body, { params: n > 1 ? { parcelas: n } : undefined });
      toast.success(n > 1 ? `Lançamento salvo em ${n} parcelas.` : 'Lançamento salvo.');
      navigate('/financeiro');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-1 rounded-full bg-emerald-500" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Financeiro</p>
            <h1 className="text-2xl font-bold text-white">Novo Lançamento</h1>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/financeiro')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">
          <ArrowLeft size={15} /> Voltar
        </button>
      </div>

      {/* Tipo selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setTipo('RECEBER')}
          className={`flex items-center justify-center gap-3 rounded-xl border p-4 transition ${
            tipo === 'RECEBER'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <TrendingUp size={18} />
          <div className="text-left">
            <p className="text-sm font-bold">Conta a Receber</p>
            <p className="text-[11px] uppercase tracking-wider opacity-70">Cliente paga</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTipo('PAGAR')}
          className={`flex items-center justify-center gap-3 rounded-xl border p-4 transition ${
            tipo === 'PAGAR'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <TrendingDown size={18} />
          <div className="text-left">
            <p className="text-sm font-bold">Conta a Pagar</p>
            <p className="text-[11px] uppercase tracking-wider opacity-70">Pagar fornecedor</p>
          </div>
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className={labelCls}>{tipo === 'PAGAR' ? 'Fornecedor' : 'Cliente'}</span>
            <select name="parceiroId" value={form.parceiroId} onChange={handleChange} className={inputCls} required>
              <option value="">Selecione...</option>
              {parceiros.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} — {p.documento || 'sem doc'}</option>
              ))}
            </select>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Valor (R$)</span>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">R$</span>
                <input type="text" inputMode="numeric" name="valorOriginal" value={form.valorOriginal} onChange={handleChange}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition" required />
              </div>
            </label>
            <div className="block">
              <span className={labelCls}>Status</span>
              <p className="mt-2 text-sm text-slate-400">
                Todo título novo entra <b>em aberto</b> (ou atrasado, se já vencido). A quitação é registrada pela ação <b>Baixa</b> na listagem.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Data de Emissão</span>
              <input type="date" name="dataEmissao" value={form.dataEmissao} onChange={handleChange} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Vencimento</span>
              <input type="date" name="dataVencimento" value={form.dataVencimento} onChange={handleChange} className={inputCls} required />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className={labelCls}>Descrição</span>
              <input type="text" name="descricao" value={form.descricao} onChange={handleChange} placeholder="Referência / nota fiscal / observações" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Parcelas</span>
              <select name="parcelas" value={form.parcelas} onChange={handleChange} className={inputCls}>
                {Array.from({ length: maxParcelas() }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n === 1 ? '1x (único)' : `${n}x mensais`}</option>
                ))}
              </select>
            </label>
          </div>

          {Number(form.parcelas) > 1 && unmaskMoeda(form.valorOriginal) > 0 && (
            <div className="rounded-lg border border-slate-800">
              <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800">
                {form.parcelas} parcelas — a 1ª no vencimento informado, as demais mês a mês
              </p>
              <ul className="grid sm:grid-cols-2 divide-y divide-slate-800/60">
                {dividirParcelas(unmaskMoeda(form.valorOriginal), form.parcelas).map((v, i) => (
                  <li key={i} className="flex justify-between px-4 py-1.5 text-xs">
                    <span className="text-slate-400">{i + 1}ª · {vencimentoParcela(form.dataVencimento, i)}</span>
                    <span className="font-mono font-semibold text-white">{fmtMoeda(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/financeiro')} className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-700 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
              <Save size={15} /> {saving ? 'Salvando...' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
