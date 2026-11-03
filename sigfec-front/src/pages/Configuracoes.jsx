/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import {
  Save, RotateCcw, RefreshCw, PlugZap, Building2, ListChecks, Beaker, DollarSign, Bell, ShieldCheck, CreditCard,
  CheckCircle2, AlertCircle, KeyRound, Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ModuleHeader } from '../theme/modules.jsx';
import { recarregarConfigPublica } from '../utils/configPublica';

/** Ícone de cada grupo (os grupos e os parâmetros vêm da API). */
const ICONES = {
  'Empresa': Building2,
  'Fila do pátio': ListChecks,
  'Laboratório e produção': Beaker,
  'Vendas e financeiro': DollarSign,
  'Alertas': Bell,
  'Segurança': ShieldCheck,
  'Integração Asaas (PIX / Boleto)': CreditCard,
};

const ROTULO_OPCAO = { SANDBOX: 'Sandbox (testes)', PRODUCAO: 'Produção (cobranças reais)' };

const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-800 py-2 px-3 text-sm text-white outline-none focus:border-emerald-500 transition disabled:opacity-50';

const erroDe = (err) => err?.response?.data?.error || err?.response?.data?.message
  || (err?.response ? `Erro ${err.response.status} no servidor.` : 'Servidor fora do ar.');

const fmtQuando = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export default function Configuracoes() {
  const [itens, setItens] = useState([]);
  const [valores, setValores] = useState({}); // o que está no formulário (segredo: vazio = não mexer)
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [teste, setTeste] = useState(null);
  const [testando, setTestando] = useState(false);

  const aplicar = (lista) => {
    setItens(lista);
    setValores(Object.fromEntries(lista.map((i) => [i.chave, i.tipo === 'SEGREDO' ? '' : (i.valor ?? '')])));
  };

  const carregar = () => {
    setCarregando(true);
    setErro('');
    api.get('/configuracoes')
      .then(({ data }) => aplicar(Array.isArray(data) ? data : []))
      .catch((err) => setErro(erroDe(err)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => { carregar(); }, []);

  const grupos = useMemo(() => {
    const m = new Map();
    itens.forEach((i) => { if (!m.has(i.grupo)) m.set(i.grupo, []); m.get(i.grupo).push(i); });
    return [...m.entries()];
  }, [itens]);

  /** Só envia o que mudou (segredo: só quando digitado um valor novo). */
  const alterados = useMemo(() => {
    const out = {};
    itens.forEach((i) => {
      const v = valores[i.chave] ?? '';
      if (i.tipo === 'SEGREDO') { if (v.trim()) out[i.chave] = v.trim(); return; }
      if (v !== (i.valor ?? '')) out[i.chave] = v;
    });
    return out;
  }, [itens, valores]);
  const qtdAlterados = Object.keys(alterados).length;

  const salvar = async () => {
    if (!qtdAlterados) return;
    setSalvando(true);
    try {
      const { data } = await api.put('/configuracoes', alterados);
      aplicar(data);
      recarregarConfigPublica();
      setTeste(null);
      toast.success(qtdAlterados === 1 ? 'Parâmetro salvo.' : `${qtdAlterados} parâmetros salvos.`);
    } catch (err) {
      toast.error(erroDe(err));
    } finally {
      setSalvando(false);
    }
  };

  /** Volta um parâmetro ao padrão do sistema (valor vazio no servidor). */
  const restaurar = async (item) => {
    try {
      const { data } = await api.put('/configuracoes', { [item.chave]: '' });
      aplicar(data);
      recarregarConfigPublica();
      toast.success(`"${item.rotulo}" voltou ao padrão.`);
    } catch (err) {
      toast.error(erroDe(err));
    }
  };

  const testarAsaas = async () => {
    if (alterados['asaas.api-key'] || alterados['asaas.ambiente']) {
      toast('Salve as alterações do Asaas antes de testar.', { icon: '💾' });
      return;
    }
    setTestando(true);
    try {
      const { data } = await api.post('/configuracoes/asaas/testar');
      setTeste(data);
    } catch (err) {
      setTeste({ ok: false, mensagem: erroDe(err) });
    } finally {
      setTestando(false);
    }
  };

  const set = (chave, v) => setValores((s) => ({ ...s, [chave]: v }));

  return (
    <div className="pb-24">
      <ModuleHeader
        moduleKey="configuracoes"
        title="Configurações do sistema"
        subtitle="Dados da empresa, regras operacionais e integrações. Só administradores veem esta tela; cada alteração fica registrada na auditoria."
        action={(
          <button type="button" onClick={carregar} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition">
            <RefreshCw size={16} /> Recarregar
          </button>
        )}
      />

      {carregando && <p className="text-sm text-slate-400">Carregando parâmetros…</p>}

      {erro && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-400">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Não foi possível carregar as configurações.</p>
            <p>{erro}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {grupos.map(([grupo, lista]) => {
          const Icone = ICONES[grupo] || Settings;
          const asaas = grupo.startsWith('Integração Asaas');
          return (
            <section key={grupo} className={`rounded-xl border border-slate-800 bg-slate-900 p-5 ${asaas ? 'xl:col-span-2' : ''}`}>
              <header className="flex items-center gap-3 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500"><Icone size={18} /></span>
                <h2 className="text-base font-bold text-white">{grupo}</h2>
              </header>

              <div className={`grid gap-4 ${asaas ? 'md:grid-cols-3' : grupo === 'Empresa' ? 'sm:grid-cols-2' : ''}`}>
                {lista.map((item) => (
                  <Campo key={item.chave} item={item} valor={valores[item.chave] ?? ''} onChange={(v) => set(item.chave, v)}
                    onRestaurar={() => restaurar(item)} alterado={item.chave in alterados} />
                ))}
              </div>

              {asaas && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="button" onClick={testarAsaas} disabled={testando}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-violet-500/40 bg-violet-500/15 text-sm font-semibold text-violet-400 hover:bg-violet-500/25 transition disabled:opacity-50">
                    <PlugZap size={16} /> {testando ? 'Testando…' : 'Testar conexão com o Asaas'}
                  </button>
                  {teste && (
                    <p className={`flex items-start gap-2 text-sm font-medium ${teste.ok ? 'text-emerald-500' : 'text-rose-400'}`}>
                      {teste.ok ? <CheckCircle2 size={17} className="shrink-0 mt-0.5" /> : <AlertCircle size={17} className="shrink-0 mt-0.5" />}
                      {teste.mensagem}
                    </p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Barra fixa de salvar — aparece quando há alteração */}
      {qtdAlterados > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-3 lg:pl-[304px]">
          <div className="flex flex-wrap items-center justify-end gap-3 max-w-7xl mx-auto">
            <span className="text-sm text-slate-300 mr-auto">
              <strong className="text-white">{qtdAlterados}</strong> {qtdAlterados === 1 ? 'alteração não salva' : 'alterações não salvas'}
            </span>
            <button type="button" onClick={() => aplicar(itens)} disabled={salvando}
              className="h-10 px-4 rounded-lg border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">
              Descartar
            </button>
            <button type="button" onClick={salvar} disabled={salvando}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-bold text-white shadow transition disabled:opacity-50">
              <Save size={16} /> {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ item, valor, onChange, onRestaurar, alterado }) {
  const id = `cfg-${item.chave}`;
  const limites = item.minimo != null && item.maximo != null ? `${item.minimo} a ${item.maximo}` : null;

  let controle;
  if (item.tipo === 'OPCAO') {
    controle = (
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {(item.opcoes || []).map((o) => <option key={o} value={o}>{ROTULO_OPCAO[o] || o}</option>)}
      </select>
    );
  } else if (item.tipo === 'LISTA') {
    controle = (
      <textarea id={id} rows={4} value={valor} onChange={(e) => onChange(e.target.value)} className={`${inputCls} font-mono`} />
    );
  } else if (item.tipo === 'SEGREDO') {
    controle = (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <KeyRound size={14} className={item.configurado ? 'text-emerald-500' : 'text-slate-500'} />
          {item.configurado
            ? <span className="text-slate-300">Configurado <code className="text-slate-400">{item.valor}</code></span>
            : <span className="text-amber-500 font-semibold">Não configurado</span>}
        </div>
        <input id={id} type="password" autoComplete="new-password" value={valor} onChange={(e) => onChange(e.target.value)}
          placeholder={item.configurado ? 'Digite para substituir' : 'Cole aqui'} className={inputCls} />
      </div>
    );
  } else {
    const numero = item.tipo === 'INTEIRO' || item.tipo === 'PERCENTUAL';
    controle = (
      <div className="relative">
        <input id={id} type={numero ? 'number' : 'text'} inputMode={numero ? 'decimal' : undefined}
          min={item.minimo ?? undefined} max={item.maximo ?? undefined} step={item.tipo === 'PERCENTUAL' ? '0.1' : undefined}
          value={valor} onChange={(e) => onChange(e.target.value)} placeholder={item.padrao || ''}
          className={`${inputCls} ${item.tipo === 'PERCENTUAL' ? 'pr-8' : ''}`} />
        {item.tipo === 'PERCENTUAL' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>}
      </div>
    );
  }

  return (
    <div className={item.tipo === 'LISTA' ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="flex items-center gap-2 mb-1.5 text-sm font-semibold text-slate-200">
        {item.rotulo}
        {alterado && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-500">alterado</span>}
      </label>
      {controle}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        {item.ajuda && <span>{item.ajuda}</span>}
        {limites && <span>Faixa: {limites}{item.tipo === 'PERCENTUAL' ? '%' : ''}.</span>}
        {item.tipo === 'LISTA' && <span>Um por linha.</span>}
      </div>
      {item.personalizado && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span>Alterado{item.atualizadoPor ? ` por ${item.atualizadoPor}` : ''}{item.atualizadoEm ? ` em ${fmtQuando(item.atualizadoEm)}` : ''}.</span>
          {item.tipo !== 'SEGREDO' || item.padrao ? (
            <button type="button" onClick={onRestaurar} className="inline-flex items-center gap-1 font-semibold text-sky-500 hover:underline">
              <RotateCcw size={12} /> Voltar ao padrão{item.tipo !== 'SEGREDO' && item.padrao ? ` (${item.padrao.replace(/\n/g, ', ')})` : ''}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
