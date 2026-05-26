import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Users, MapPin, Phone, IdCard, Mail } from 'lucide-react';
import ValidatedInput from '../components/ValidatedInput';
import { cpfOrCnpj, email as emailV, phone as phoneV, cep as cepV, required, compose } from '../utils/validators';
import toast, { Toaster } from 'react-hot-toast';
import Select from 'react-select';
import api from '../services/api';
import { estados, cidades } from '../mockData';
import { maskCpfCnpj, maskTelefone, maskRG, maskCEP } from '../utils/masks';
import { buscarCep } from '../utils/cep';
import useDraft, { DraftIndicator } from '../hooks/useDraft.jsx';

const LOCAL_KEY = '@sigfec:parceiros';

const selectStyles = {
  control: (p, s) => ({
    ...p,
    backgroundColor: '#1e293b',
    borderColor: s.isFocused ? '#10b981' : '#334155',
    borderRadius: '0.5rem',
    color: 'white',
    padding: '2px',
    minHeight: '48px',
    boxShadow: s.isFocused ? '0 0 0 3px rgba(16,185,129,0.12)' : 'none',
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
  noOptionsMessage: (p) => ({ ...p, color: '#64748b' }),
};

// Props comuns: renderiza menu em portal no body (não corta no container)
const selectMenuProps = {
  menuPortalTarget: typeof document !== 'undefined' ? document.body : null,
  menuPosition: 'fixed',
};

const inputCls = (err) =>
  `mt-2 w-full rounded-lg border bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition ${
    err ? 'border-red-500' : 'border-slate-700 focus:border-emerald-500'
  }`;

const estadoOptions = estados
  ? estados.map((e) => ({ value: e.sigla, label: `${e.nome} — ${e.sigla}` }))
  : [];

// Field wrapper definido FORA do componente pai pra preservar identidade
// entre renders (evita unmount/remount → perda de foco no input).
function Field({ label, name, children, err, submitted, errors }) {
  const showErr = submitted && (err || errors?.[name]);
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {showErr && <span className="mt-1 block text-xs text-red-400">{err || errors?.[name]}</span>}
    </label>
  );
}

export default function CadastroParceiro() {
  const navigate = useNavigate();
  const numeroRef = useRef(null);
  const [form, setForm, draft] = useDraft('cadastro-parceiro', {
    nome: '', documento: '', rg: '', inscricao_estadual: '', tipo_parceiro: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '',
    telefone: '', email: '',
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [estadoSel, setEstadoSel] = useState(null);
  const [cidadeSel, setCidadeSel] = useState(null);
  const [cidadeOpts, setCidadeOpts] = useState([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);

  const MASK_FIELDS = {
    documento: maskCpfCnpj, telefone: maskTelefone, rg: maskRG,
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const fn = MASK_FIELDS[name];
    setForm((p) => ({ ...p, [name]: fn ? fn(value) : value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: undefined }));
  };

  const fetchCidades = async (sigla, cidadeNome = null) => {
    setLoadingCidades(true);
    try {
      const { data } = await api.get(`/cidades/estado/${sigla}`);
      const opts = Array.isArray(data)
        ? data.map((c) => ({ value: c.id || c, label: c.nome || c })).filter((o) => o.label)
        : [];
      setCidadeOpts(opts);
      if (cidadeNome) {
        const match = opts.find((o) => o.label === cidadeNome);
        if (match) setCidadeSel(match);
      }
    } catch {
      const fallback = (cidades[sigla] || []).map((c) => ({ value: c, label: c }));
      setCidadeOpts(fallback);
      if (cidadeNome) {
        const m = fallback.find((o) => o.label === cidadeNome);
        if (m) setCidadeSel(m);
      }
    } finally {
      setLoadingCidades(false);
    }
  };

  const handleEstado = async (opt) => {
    setEstadoSel(opt);
    setCidadeSel(null);
    setCidadeOpts([]);
    if (opt) await fetchCidades(opt.value);
  };

  const handleCep = async (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    setForm((p) => ({ ...p, cep: maskCEP(raw) }));
    if (raw.length !== 8) return;
    setLoadingCep(true);
    const r = await buscarCep(raw);
    setLoadingCep(false);
    if (!r.ok) {
      // offline ou CEP inválido — não trava, usuário preenche manual
      toast(r.error, { icon: r.offline ? '📶' : '⚠️' });
      numeroRef.current?.focus();
      return;
    }
    setForm((p) => ({ ...p, logradouro: r.data.logradouro, bairro: r.data.bairro }));
    const uf = estadoOptions.find((o) => o.value === r.data.uf);
    if (uf) { setEstadoSel(uf); await fetchCidades(uf.value, r.data.localidade); }
    numeroRef.current?.focus();
  };

  const validate = () => {
    const e = {};
    ['nome', 'documento', 'tipo_parceiro', 'telefone', 'email'].forEach((f) => { if (!form[f]) e[f] = 'Obrigatório'; });
    if (!estadoSel) e.estado = 'Obrigatório';
    if (!cidadeSel) e.cidade = 'Obrigatório';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSubmitted(true);
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); toast.error('Preencha os campos obrigatórios.'); return; }

    const payload = {
      nome: form.nome, documento: form.documento, rg: form.rg,
      inscricaoEstadual: form.inscricao_estadual, tipoParceiro: form.tipo_parceiro,
      endereco: { cep: form.cep, logradouro: form.logradouro, numero: form.numero, complemento: form.complemento, bairro: form.bairro, cidade: cidadeSel ? { id: cidadeSel.value } : null },
      telefone: form.telefone, email: form.email,
    };

    setSaving(true);
    try {
      await api.post('/parceiros', payload);
    } catch {
      const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      const nextId = local.length ? Math.max(...local.map((x) => Number(x.id) || 0)) + 1 : 1;
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...local, { id: nextId, ...payload, dataCadastro: new Date().toISOString() }]));
    }
    toast.success('Parceiro salvo!');
    draft.clear();
    navigate('/parceiros');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-1 rounded-full bg-emerald-500" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cadastros</p>
            <h1 className="text-2xl font-bold text-white">Novo Parceiro</h1>
            <div className="mt-1.5">
              <DraftIndicator savedAt={draft.savedAt} onClear={draft.clear} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/parceiros')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
        >
          <ArrowLeft size={15} /> Voltar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identificação */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-emerald-500">
            <Users size={16} className="text-emerald-400" />
            <span className="text-sm font-bold text-white">Identificação</span>
          </div>
          <div className="p-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field submitted={submitted} errors={errors} label="Nome / Razão Social" name="nome">
              <input name="nome" value={form.nome} onChange={handleChange} placeholder="Nome completo ou razão social" className={inputCls(submitted && errors.nome)} required />
            </Field>
            <ValidatedInput
              label="CPF / CNPJ"
              name="documento"
              value={form.documento}
              onChange={handleChange}
              icon={IdCard}
              validate={compose(required, cpfOrCnpj)}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              maxLength={18}
              required
            />
            <Field submitted={submitted} errors={errors} label="RG" name="rg">
              <input name="rg" value={form.rg} onChange={handleChange} placeholder="RG" className={inputCls(false)} />
            </Field>
            <Field submitted={submitted} errors={errors} label="Inscrição Estadual" name="inscricao_estadual">
              <input name="inscricao_estadual" value={form.inscricao_estadual} onChange={handleChange} placeholder="Inscrição estadual" className={inputCls(false)} />
            </Field>
            <Field submitted={submitted} errors={errors} label="Tipo de Parceiro" name="tipo_parceiro">
              <select name="tipo_parceiro" value={form.tipo_parceiro} onChange={handleChange} className={inputCls(submitted && errors.tipo_parceiro)}>
                <option value="">Selecione o tipo</option>
                <option value="PRODUTOR">Produtor</option>
                <option value="CLIENTE">Cliente</option>
                <option value="FORNECEDOR">Fornecedor</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Localização */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-sky-500">
            <MapPin size={16} className="text-sky-400" />
            <span className="text-sm font-bold text-white">Localização</span>
            {loadingCep && <span className="ml-auto text-xs text-slate-500 animate-pulse">Buscando CEP...</span>}
          </div>
          <div className="p-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field submitted={submitted} errors={errors} label="CEP" name="cep">
              <input name="cep" value={form.cep} onChange={handleCep} placeholder="00000-000" maxLength={9} className={inputCls(submitted && errors.cep)} />
            </Field>
            <Field submitted={submitted} errors={errors} label="Logradouro" name="logradouro">
              <input name="logradouro" value={form.logradouro} onChange={handleChange} placeholder="Rua, Avenida..." className={inputCls(submitted && errors.logradouro)} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field submitted={submitted} errors={errors} label="Número" name="numero">
                <input ref={numeroRef} name="numero" value={form.numero} onChange={handleChange} placeholder="S/N" className={inputCls(submitted && errors.numero)} />
              </Field>
              <div className="col-span-2">
                <Field submitted={submitted} errors={errors} label="Bairro" name="bairro">
                  <input name="bairro" value={form.bairro} onChange={handleChange} placeholder="Bairro" className={inputCls(submitted && errors.bairro)} />
                </Field>
              </div>
            </div>
            <Field submitted={submitted} errors={errors} label="Complemento" name="complemento">
              <input name="complemento" value={form.complemento} onChange={handleChange} placeholder="Apto, sala, bloco" className={inputCls(false)} />
            </Field>
            <Field submitted={submitted} errors={errors} label="Estado" name="estado" err={submitted && errors.estado}>
              <div className="mt-2">
                <Select options={estadoOptions} value={estadoSel} onChange={handleEstado} styles={selectStyles} {...selectMenuProps} placeholder="Selecione..." isClearable />
              </div>
            </Field>
            <Field submitted={submitted} errors={errors} label="Cidade" name="cidade" err={submitted && errors.cidade}>
              <div className="mt-2">
                <Select options={cidadeOpts} value={cidadeSel} onChange={setCidadeSel} styles={selectStyles} {...selectMenuProps} placeholder={estadoSel ? 'Selecione a cidade' : 'Selecione o estado primeiro'} isDisabled={!estadoSel} isLoading={loadingCidades} isSearchable isClearable />
              </div>
            </Field>
          </div>
        </div>

        {/* Contato */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-violet-500">
            <Phone size={16} className="text-violet-400" />
            <span className="text-sm font-bold text-white">Contato</span>
          </div>
          <div className="p-6 grid gap-5 sm:grid-cols-2">
            <ValidatedInput
              label="Telefone"
              name="telefone"
              type="tel"
              value={form.telefone}
              onChange={handleChange}
              icon={Phone}
              validate={compose(required, phoneV)}
              placeholder="(99) 99999-9999"
              required
            />
            <ValidatedInput
              label="E-mail"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              icon={Mail}
              validate={compose(required, emailV)}
              placeholder="nome@empresa.com"
              required
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={() => navigate('/parceiros')} className="rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-lg shadow-emerald-900/40">
            <Save size={15} /> {saving ? 'Salvando...' : 'Salvar Parceiro'}
          </button>
        </div>
      </form>
    </div>
  );
}
