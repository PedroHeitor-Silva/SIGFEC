import { useState, useEffect, useRef } from 'react';
import { MapPin, User, Truck, Save, ArrowLeft, IdCard, Mail, Phone } from 'lucide-react';
import Select from 'react-select';
import toast from 'react-hot-toast';
import api from '../services/api';
import ValidatedInput from '../components/ValidatedInput';
import { cpfOrCnpj, cpf, email, phone, required, compose } from '../utils/validators';
import { maskTelefone, maskCEP, maskCpfCnpj, maskRG, maskPlaca, maskCNH, maskMoeda, unmaskMoeda, maskPeso, unmaskInteiro } from '../utils/masks';
import { buscarCep } from '../utils/cep';
import useDraft, { DraftIndicator } from '../hooks/useDraft.jsx';
import { getSelectStyles, selectMenuProps } from '../theme/selectStyles';

const selectStyles = getSelectStyles();

const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition';
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2';

const TIPO_LABELS = {
  PARCEIRO: 'Parceiro',
  MOTORISTA: 'Motorista',
  VEICULO: 'Veículo',
  PRODUTO: 'Produto',
  USUARIO: 'Usuário',
};

const TIPO_COLORS = {
  PARCEIRO: 'bg-emerald-500',
  MOTORISTA: 'bg-sky-500',
  VEICULO: 'bg-amber-500',
  PRODUTO: 'bg-violet-500',
  USUARIO: 'bg-rose-500',
};

export default function CadastroDinamico({ tipo = 'PARCEIRO', onBack }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm, draft] = useDraft(`cadastro-${tipo}`, {
    nome: '', documento: '', email: '', telefone: '', cep: '', logradouro: '', bairro: '', numero: '',
    inscricaoEstadual: '', rg: '', tipoParceiro: '', limiteCredito: '',
    cnh: '', categoriaCnh: '', validadeCnh: '', statusAtivoMotorista: true,
    placa: '', marca: '', tara: '', capacidadeKg: '', tipoVeiculo: '',
    eixos: '', motoristaId: '', dataLicenciamento: '', statusAtivoVeiculo: true, observacao: '',
    unidadeMedida: '', categoria: '', login: '', senha: '', perfilAcesso: '',
  });
  const [estados, setEstados] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [estadoSel, setEstadoSel] = useState(null);
  const [cidadeSel, setCidadeSel] = useState(null);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [motoristas, setMotoristas] = useState([]);
  const numeroRef = useRef(null);

  useEffect(() => {
    api.get('/estados')
      .then(({ data }) => setEstados(data.map((e) => ({ value: e.sigla, label: e.nome }))))
      .catch(() => {});
  }, []);

  // Carrega motoristas para o vínculo no cadastro de veículo
  useEffect(() => {
    if (tipo !== 'VEICULO') return;
    api.get('/motoristas')
      .then(({ data }) => setMotoristas(data || []))
      .catch(() => {});
  }, [tipo]);

  const handleEstado = async (opt) => {
    setEstadoSel(opt);
    setCidadeSel(null);
    if (!opt) return;
    setLoadingCidades(true);
    try {
      const { data } = await api.get(`/cidades/estado/${opt.value}`);
      setCidades(data.map((c) => ({ value: c.id, label: c.nome })));
    } catch { toast.error('Falha ao carregar cidades.'); }
    finally { setLoadingCidades(false); }
  };

  const handleCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    const r = await buscarCep(cep);
    if (!r.ok) {
      toast(r.error, { icon: r.offline ? '📶' : '⚠️' });
      numeroRef.current?.focus();
      return;
    }
    setForm((p) => ({ ...p, logradouro: r.data.logradouro, bairro: r.data.bairro }));
    const uf = estados.find((e) => e.value === r.data.uf);
    if (uf) handleEstado(uf);
    numeroRef.current?.focus();
  };

  const MASK_FIELDS = {
    telefone: maskTelefone, cep: maskCEP, documento: maskCpfCnpj,
    rg: maskRG, placa: maskPlaca, cnh: maskCNH,
    tara: maskPeso, capacidadeKg: maskPeso, eixos: (v) => String(v ?? '').replace(/\D/g, '').slice(0, 2),
    limiteCredito: maskMoeda, precoBase: maskMoeda,
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const fn = MASK_FIELDS[name];
    setForm((p) => ({ ...p, [name]: fn ? fn(value) : value }));
  };

  const buildPayload = () => {
    const endereco = hasLocation
      ? { cep: form.cep, logradouro: form.logradouro, numero: form.numero, bairro: form.bairro, cidade: cidadeSel ? { id: cidadeSel.value } : null }
      : null;

    switch (tipo) {
      case 'PARCEIRO':
        return {
          path: '/parceiros',
          body: {
            nome: form.nome, documento: form.documento, email: form.email, telefone: form.telefone,
            tipoParceiro: form.tipoParceiro, inscricaoEstadual: form.inscricaoEstadual, rg: form.rg,
            limiteCredito: form.limiteCredito ? unmaskMoeda(form.limiteCredito) : null,
            endereco,
          },
        };
      case 'MOTORISTA':
        return {
          path: '/motoristas',
          body: {
            nome: form.nome, documento: form.documento, email: form.email, telefone: form.telefone,
            cnh: form.cnh,
            categoriaCnh: form.categoriaCnh || null,
            validadeCnh: form.validadeCnh || null,
            statusAtivo: form.statusAtivoMotorista,
          },
        };
      case 'VEICULO':
        return {
          path: '/veiculos',
          body: {
            placa: form.placa,
            marca: form.marca || null,
            modelo: form.nome,
            tara: form.tara ? unmaskInteiro(form.tara) : null,
            capacidadeKg: form.capacidadeKg ? unmaskInteiro(form.capacidadeKg) : null,
            tipoVeiculo: form.tipoVeiculo || null,
            eixos: form.eixos ? Number(form.eixos) : null,
            motorista: form.motoristaId ? { id: Number(form.motoristaId) } : null,
            dataLicenciamento: form.dataLicenciamento || null,
            statusAtivo: form.statusAtivoVeiculo,
            observacao: form.observacao || null,
          },
        };
      case 'PRODUTO':
        return {
          path: '/produtos',
          body: {
            nome: form.nome,
            categoria: form.categoria,
            unidadeMedida: form.unidadeMedida || 'KG',
            precoBase: form.precoBase ? unmaskMoeda(form.precoBase) : 0,
          },
        };
      case 'USUARIO':
        return {
          path: '/usuarios',
          body: {
            nome: form.nome, documento: form.documento, email: form.email, telefone: form.telefone,
            login: form.login, senha: form.senha, perfilAcesso: form.perfilAcesso, statusAtivo: true,
          },
        };
      default:
        return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) { toast.error('Tipo de cadastro inválido.'); return; }
    setLoading(true);
    try {
      await api.post(payload.path, payload.body);
      toast.success(`${TIPO_LABELS[tipo]} cadastrado com sucesso!`);
      draft.clear();
      onBack?.();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.statusText || 'Erro ao salvar.';
      toast.error(`Falha: ${msg}`);
    } finally { setLoading(false); }
  };

  const hasLocation = ['PARCEIRO', 'MOTORISTA'].includes(tipo);
  const color = TIPO_COLORS[tipo] || 'bg-emerald-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`h-10 w-1 rounded-full ${color}`} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cadastros</p>
            <h1 className="text-2xl font-bold text-white">Novo {TIPO_LABELS[tipo]}</h1>
            <div className="mt-1.5">
              <DraftIndicator savedAt={draft.savedAt} onClear={draft.clear} />
            </div>
          </div>
        </div>
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">
          <ArrowLeft size={15} /> Voltar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identificação */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 ${color.replace('bg-', 'border-l-')}`}>
            <User size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-white">Identificação</span>
          </div>
          <div className="p-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className={labelCls}>{
                tipo === 'VEICULO' ? 'Modelo'
                : tipo === 'PRODUTO' ? 'Nome do Produto'
                : tipo === 'PARCEIRO' ? 'Nome Completo / Razão Social'
                : 'Nome Completo'
              }</span>
              <input name="nome" value={form.nome} onChange={handleChange} className={inputCls}
                placeholder={tipo === 'VEICULO' ? 'Ex: R450, FH540...' : 'Digite o nome...'} required />
            </label>

            {/* Documento (Pessoa) — todos que herdam Pessoa */}
            {['PARCEIRO', 'MOTORISTA', 'USUARIO'].includes(tipo) && (
              <ValidatedInput
                label={tipo === 'PARCEIRO' ? 'CPF / CNPJ' : 'CPF'}
                name="documento"
                value={form.documento}
                onChange={handleChange}
                icon={IdCard}
                validate={compose(required, tipo === 'PARCEIRO' ? cpfOrCnpj : cpf)}
                placeholder={tipo === 'PARCEIRO' ? '000.000.000-00 ou 00.000.000/0000-00' : '000.000.000-00'}
                maxLength={tipo === 'PARCEIRO' ? 18 : 14}
                required
              />
            )}

            {tipo !== 'VEICULO' && tipo !== 'PRODUTO' && (
              <ValidatedInput
                label="E-mail"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                icon={Mail}
                validate={email}
                placeholder="exemplo@sigfec.com"
              />
            )}

            {['PARCEIRO', 'MOTORISTA', 'USUARIO'].includes(tipo) && (
              <ValidatedInput
                label="Telefone"
                name="telefone"
                type="tel"
                value={form.telefone}
                onChange={handleChange}
                icon={Phone}
                validate={phone}
                placeholder="(99) 99999-9999"
              />
            )}

            {tipo === 'PARCEIRO' && (<>
              <label className="block">
                <span className={labelCls}>Tipo de Parceiro</span>
                <select name="tipoParceiro" value={form.tipoParceiro} onChange={handleChange} className={inputCls} required>
                  <option value="">Selecione...</option>
                  <option value="PRODUTOR">Produtor</option>
                  <option value="CLIENTE">Cliente</option>
                  <option value="FORNECEDOR">Fornecedor</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Inscrição Estadual</span>
                <input name="inscricaoEstadual" value={form.inscricaoEstadual} onChange={handleChange} className={inputCls} placeholder="IE (se PJ)" />
              </label>
              <label className="block">
                <span className={labelCls}>RG</span>
                <input name="rg" value={form.rg} onChange={handleChange} className={inputCls} placeholder="RG (se PF)" />
              </label>
              <label className="block">
                <span className={labelCls}>Limite de Crédito (R$)</span>
                <input type="text" inputMode="numeric" name="limiteCredito" value={form.limiteCredito} onChange={handleChange} className={inputCls} placeholder="0,00" />
              </label>
            </>)}

            {tipo === 'MOTORISTA' && (<>
              <label className="block">
                <span className={labelCls}>Registro CNH</span>
                <input name="cnh" value={form.cnh} onChange={handleChange} className={inputCls} placeholder="Número da habilitação" required />
              </label>
              <label className="block">
                <span className={labelCls}>Categoria CNH</span>
                <select name="categoriaCnh" value={form.categoriaCnh} onChange={handleChange} className={inputCls}>
                  <option value="">Selecione...</option>
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                  <option value="D">D</option><option value="E">E</option>
                  <option value="AB">AB</option><option value="AC">AC</option>
                  <option value="AD">AD</option><option value="AE">AE</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Validade CNH</span>
                <input type="date" name="validadeCnh" value={form.validadeCnh} onChange={handleChange} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Status</span>
                <select name="statusAtivoMotorista"
                  value={form.statusAtivoMotorista ? 'true' : 'false'}
                  onChange={(e) => setForm((p) => ({ ...p, statusAtivoMotorista: e.target.value === 'true' }))}
                  className={inputCls}>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </label>
            </>)}

            {tipo === 'VEICULO' && (<>
              <label className="block">
                <span className={labelCls}>Placa</span>
                <input name="placa" value={form.placa} onChange={handleChange} className={`${inputCls} uppercase`} placeholder="ABC-1D23" />
              </label>
              <label className="block">
                <span className={labelCls}>Marca</span>
                <input name="marca" value={form.marca} onChange={handleChange} className={inputCls} placeholder="Ex: Scania, Volvo" />
              </label>
              <label className="block">
                <span className={labelCls}>Tipo</span>
                <select name="tipoVeiculo" value={form.tipoVeiculo} onChange={handleChange} className={inputCls}>
                  <option value="">Selecione...</option>
                  <option value="TOCO">Toco</option>
                  <option value="TRUCK">Truck</option>
                  <option value="CARRETA">Carreta</option>
                  <option value="BITREM">Bitrem</option>
                  <option value="RODOTREM">Rodotrem</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Eixos</span>
                <input type="text" inputMode="numeric" name="eixos" value={form.eixos} onChange={handleChange} className={inputCls} placeholder="Ex: 9" />
              </label>
              <label className="block">
                <span className={labelCls}>Tara (kg)</span>
                <input type="text" inputMode="numeric" name="tara" value={form.tara} onChange={handleChange} className={`${inputCls} font-mono`} placeholder="Ex: 18.500" />
              </label>
              <label className="block">
                <span className={labelCls}>Capacidade (kg)</span>
                <input type="text" inputMode="numeric" name="capacidadeKg" value={form.capacidadeKg} onChange={handleChange} className={`${inputCls} font-mono`} placeholder="Ex: 74.000" />
              </label>
              <label className="block">
                <span className={labelCls}>Motorista</span>
                <select name="motoristaId" value={form.motoristaId} onChange={handleChange} className={inputCls}>
                  <option value="">Selecione...</option>
                  {motoristas.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Licenciamento</span>
                <input type="date" name="dataLicenciamento" value={form.dataLicenciamento} onChange={handleChange} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Status</span>
                <select name="statusAtivoVeiculo"
                  value={form.statusAtivoVeiculo ? 'true' : 'false'}
                  onChange={(e) => setForm((p) => ({ ...p, statusAtivoVeiculo: e.target.value === 'true' }))}
                  className={inputCls}>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </label>
              <label className="block sm:col-span-2 lg:col-span-3">
                <span className={labelCls}>Observação</span>
                <input name="observacao" value={form.observacao} onChange={handleChange} className={inputCls} placeholder="Ex: Autorizado para transporte de fécula e mandioca" />
              </label>
            </>)}

            {tipo === 'PRODUTO' && (<>
              <label className="block">
                <span className={labelCls}>Categoria (Fecularia Loanda)</span>
                <select name="categoria" value={form.categoria} onChange={handleChange} className={inputCls} required>
                  <option value="">Selecione...</option>
                  <option value="MANDIOCA">Mandioca (Matéria-prima)</option>
                  <option value="FECULA">Fécula de Mandioca</option>
                  <option value="TAPIOCA">Tapioca</option>
                  <option value="POLVILHO_DOCE">Polvilho Doce</option>
                  <option value="POLVILHO_AZEDO_GRANULADO">Polvilho Azedo Granulado</option>
                  <option value="POLVILHO_AZEDO_PO">Polvilho Azedo em Pó</option>
                  <option value="DEXTRINA">Dextrina</option>
                  <option value="RESIDUO_FIBROSO">Resíduo Fibroso (Ração)</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Unidade de Medida</span>
                <select name="unidadeMedida" value={form.unidadeMedida} onChange={handleChange} className={inputCls} required>
                  <option value="">Selecione...</option>
                  <option value="KG">Quilograma (kg)</option>
                  <option value="SACO_25KG">Saco 25 kg</option>
                  <option value="SACO_50KG">Saco 50 kg</option>
                  <option value="TONELADA">Tonelada (t)</option>
                </select>
                <span className="mt-1.5 block text-[11px] text-slate-500">
                  Unidade fixa do produto — vale para estoque, venda e produção.
                </span>
              </label>
              <label className="block">
                <span className={labelCls}>Preço Base (R$)</span>
                <input type="text" inputMode="numeric" name="precoBase" value={form.precoBase || ''} onChange={handleChange} className={inputCls} placeholder="0,00" />
              </label>
            </>)}

            {tipo === 'USUARIO' && (<>
              <label className="block">
                <span className={labelCls}>Login de Acesso</span>
                <input name="login" value={form.login} onChange={handleChange} className={inputCls} placeholder="usuario.sigfec" required />
              </label>
              <label className="block">
                <span className={labelCls}>Senha</span>
                <input type="password" name="senha" value={form.senha} onChange={handleChange} className={inputCls} placeholder="••••••••" required />
              </label>
              <label className="block">
                <span className={labelCls}>Perfil de Acesso</span>
                <select name="perfilAcesso" value={form.perfilAcesso} onChange={handleChange} className={inputCls} required>
                  <option value="">Selecione...</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="BALANCA">Operador de Balança</option>
                  <option value="LABORATORIO">Laboratório</option>
                  <option value="PRODUCAO">Produção</option>
                  <option value="FINANCEIRO">Financeiro</option>
                </select>
              </label>
            </>)}
          </div>
        </div>

        {/* Localização */}
        {hasLocation && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 border-l-2 border-l-sky-500">
              <MapPin size={16} className="text-sky-400" />
              <span className="text-sm font-bold text-white">Localização</span>
            </div>
            <div className="p-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className={labelCls}>CEP</span>
                <input name="cep" value={form.cep} onChange={handleChange} onBlur={handleCep} className={inputCls} placeholder="00000-000" />
              </label>
              <label className="block">
                <span className={labelCls}>Logradouro</span>
                <input name="logradouro" value={form.logradouro} onChange={handleChange} className={inputCls} placeholder="Rua, Av..." />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className={labelCls}>Nº</span>
                  <input ref={numeroRef} name="numero" value={form.numero} onChange={handleChange} className={inputCls} placeholder="S/N" />
                </label>
                <label className="block col-span-2">
                  <span className={labelCls}>Bairro</span>
                  <input name="bairro" value={form.bairro} onChange={handleChange} className={inputCls} placeholder="Bairro" />
                </label>
              </div>
              <label className="block">
                <span className={labelCls}>Estado (UF)</span>
                <div className="mt-1">
                  <Select options={estados} value={estadoSel} onChange={handleEstado} styles={selectStyles} {...selectMenuProps} isSearchable placeholder="Selecione..." />
                </div>
              </label>
              <label className="block">
                <span className={labelCls}>Cidade</span>
                <div className="mt-1">
                  <Select options={cidades} value={cidadeSel} onChange={setCidadeSel} styles={selectStyles} {...selectMenuProps} isSearchable isLoading={loadingCidades} isDisabled={!estadoSel} placeholder={estadoSel ? 'Selecione a cidade' : 'Selecione o estado'} />
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onBack} className="rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition">
            Descartar
          </button>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-lg shadow-emerald-900/40">
            <Save size={15} /> {loading ? 'Salvando...' : `Cadastrar ${TIPO_LABELS[tipo]}`}
          </button>
        </div>
      </form>
    </div>
  );
}
