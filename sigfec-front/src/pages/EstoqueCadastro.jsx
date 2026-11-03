import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { unidadeLabel } from '../utils/unidades';

const inputCls = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition';
const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-400';

export default function EstoqueCadastro() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [form, setForm] = useState({
    produtoId: '',
    quantidadeAtual: '',
    quantidadeMinima: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/produtos')
      .then(({ data }) => setProdutos((data || []).filter((p) => p.categoria !== 'MANDIOCA')))
      .catch(() => toast.error('Falha ao carregar produtos.'));
  }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const produtoSel = produtos.find((p) => String(p.id) === String(form.produtoId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.produtoId) { toast.error('Selecione o produto.'); return; }
    setSaving(true);
    try {
      await api.post('/estoque', {
        produto: { id: Number(form.produtoId) },
        quantidadeAtual: form.quantidadeAtual ? Number(form.quantidadeAtual) : 0,
        quantidadeMinima: form.quantidadeMinima ? Number(form.quantidadeMinima) : 0,
      });
      toast.success('Estoque registrado.');
      navigate('/estoque');
    } catch (err) {
      const msg = err?.response?.data;
      toast.error(msg?.error || (typeof msg === 'string' ? msg : 'Falha ao salvar.'));
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
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Estoque</p>
            <h1 className="text-2xl font-bold text-white">Novo Registro de Estoque</h1>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/estoque')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">
          <ArrowLeft size={15} /> Voltar
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-sky-500">
          <Package size={16} className="text-sky-400" />
          <span className="text-sm font-bold text-white">Dados do Estoque</span>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <label className="block">
            <span className={labelCls}>Produto</span>
            <select name="produtoId" value={form.produtoId} onChange={handleChange} className={inputCls} required>
              <option value="">Selecione o produto...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} — {p.categoria}</option>
              ))}
            </select>
            {produtoSel && (
              <span className="mt-1.5 block text-[11px] text-slate-500">
                Categoria: <span className="text-sky-400">{produtoSel.categoria}</span>
                {' • '}Unidade: <span className="text-sky-400">{unidadeLabel(produtoSel.unidadeMedida)}</span>
              </span>
            )}
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>
                Quantidade Atual {produtoSel?.unidadeMedida && `(${unidadeLabel(produtoSel.unidadeMedida)})`}
              </span>
              <input type="number" min="0" step="0.01" name="quantidadeAtual" value={form.quantidadeAtual}
                onChange={handleChange} placeholder="0" className={`${inputCls} font-mono`} />
            </label>
            <label className="block">
              <span className={labelCls}>
                Quantidade Mínima {produtoSel?.unidadeMedida && `(${unidadeLabel(produtoSel.unidadeMedida)})`}
              </span>
              <input type="number" min="0" step="0.01" name="quantidadeMinima" value={form.quantidadeMinima}
                onChange={handleChange} placeholder="0" className={`${inputCls} font-mono`} />
            </label>
          </div>

          <p className="text-[11px] text-slate-600 leading-5">
            Quantidade mínima dispara alerta de estoque baixo. O saldo inicial entra no Kardex como ajuste;
            depois ele cai automaticamente nas vendas e sobe quando lotes de produção são finalizados.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/estoque')}
              className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-700 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
              <Save size={15} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
