/* eslint-disable react/prop-types */
/**
 * MOCKUP /mockup — Direção A: Corporate Clean azul (shadcn + Tremor inspired)
 * Página isolada — usa estilos próprios, NÃO depende do tema dark do resto.
 * Tudo wrapped em <div data-mockup> com forced light styles.
 */
import { useState } from 'react';
import {
  Search, Plus, Bell, Settings, ChevronDown, Filter, MoreHorizontal,
  TrendingUp, TrendingDown, Wallet, Package, Truck, Beaker,
  CheckCircle2, AlertTriangle, Pencil, Trash2, Eye,
  ArrowUpRight, Wheat, DollarSign,
} from 'lucide-react';

// ============ Tokens ============
const C = {
  bg:       '#f8fafc',
  card:     '#ffffff',
  border:   '#e5e7eb',
  borderLt: '#f1f5f9',
  text:     '#0f172a',
  text2:    '#475569',
  text3:    '#94a3b8',
  primary:  '#1d4ed8',
  primary2: '#1e40af',
  primaryBg:'#eff6ff',
  primaryBd:'#bfdbfe',
  success:  '#15803d',
  successBg:'#f0fdf4',
  warning:  '#b45309',
  warningBg:'#fffbeb',
  danger:   '#b91c1c',
  dangerBg: '#fef2f2',
};

const styles = {
  page: {
    minHeight: '100vh', background: C.bg, color: C.text,
    fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
    fontSize: 14, fontFeatureSettings: '"ss01","cv11"', WebkitFontSmoothing: 'antialiased',
  },
  card: {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 8, boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
  },
};

// ============ Mini componentes ============
function Btn({ kind = 'primary', icon: Icon, children, sm }) {
  const map = {
    primary:   { bg: C.primary, color: '#fff', border: 'transparent' },
    secondary: { bg: '#fff', color: C.text, border: C.border },
    ghost:     { bg: 'transparent', color: C.text2, border: 'transparent' },
    danger:    { bg: C.danger, color: '#fff', border: 'transparent' },
  };
  const m = map[kind];
  return (
    <button style={{
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      padding: sm ? '6px 12px' : '8px 14px', borderRadius: 6,
      fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center',
      gap: 6, cursor: 'pointer',
    }}>
      {Icon && <Icon size={14} strokeWidth={2} />}
      {children}
    </button>
  );
}

function Badge({ tone = 'neutral', children, dot }) {
  const map = {
    success: { bg: C.successBg, color: C.success, border: '#bbf7d0' },
    warning: { bg: C.warningBg, color: C.warning, border: '#fde68a' },
    danger:  { bg: C.dangerBg,  color: C.danger,  border: '#fecaca' },
    info:    { bg: C.primaryBg, color: C.primary, border: C.primaryBd },
    neutral: { bg: '#f1f5f9',   color: C.text2,   border: C.border },
  };
  const m = map[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: 999, background: m.color }} />}
      {children}
    </span>
  );
}

function KPI({ label, value, delta, trend, icon: Icon }) {
  const up = trend === 'up';
  const flat = trend === 'flat';
  return (
    <div style={{ ...styles.card, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: 12, color: C.text2, fontWeight: 500, margin: 0 }}>{label}</p>
        <div style={{
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: C.primaryBg, border: `1px solid ${C.primaryBd}`, borderRadius: 6, color: C.primary,
        }}>
          <Icon size={14} />
        </div>
      </div>
      <p style={{ fontSize: 24, fontWeight: 600, color: C.text, margin: '8px 0 0', letterSpacing: -0.5 }}>{value}</p>
      {delta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Badge tone={flat ? 'neutral' : up ? 'success' : 'danger'}>
            {!flat && (up ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}
            {delta}
          </Badge>
          <span style={{ fontSize: 11, color: C.text3 }}>vs mês anterior</span>
        </div>
      )}
    </div>
  );
}

// ============ Showcase ============
export default function MockupShowcase() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div style={styles.page} data-mockup>
      {/* Topo do mockup */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, maxWidth: 1400, margin: '0 auto' }}>
          <strong style={{ fontSize: 16, color: C.text }}>SIGFEC — Mockup visual</strong>
          <span style={{ fontSize: 12, color: C.text3 }}>Direção A • Corporate Clean azul</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {['dashboard', 'listagem', 'formulario', 'login'].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: tab === t ? C.primary : '#fff',
                  color: tab === t ? '#fff' : C.text2,
                  border: `1px solid ${tab === t ? C.primary : C.border}`,
                  cursor: 'pointer', textTransform: 'capitalize',
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        {tab === 'dashboard' && <DashboardMock />}
        {tab === 'listagem' && <ListaMock />}
        {tab === 'formulario' && <FormMock />}
        {tab === 'login' && <LoginMock />}
      </div>
    </div>
  );
}

// ============ DASHBOARD ============
function DashboardMock() {
  return (
    <div>
      {/* Layout com sidebar fake */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        <FakeSidebar />
        <div>
          <PageHeader title="Dashboard" subtitle="Visão geral da operação — atualizado há 2 min" />

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 }}>
            <KPI label="Entrada hoje"  value="124,5 t" delta="+12%" trend="up"   icon={Truck} />
            <KPI label="Em produção"   value="8 lotes"  delta="+2"   trend="up"   icon={Package} />
            <KPI label="A receber"     value="R$ 184.250,00" delta="-3%" trend="down" icon={Wallet} />
            <KPI label="Renda média"   value="478 g"   delta="0%"   trend="flat" icon={Beaker} />
          </div>

          {/* Charts grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>
            <ChartCard />
            <RecentList />
          </div>

          {/* Tabela compacta */}
          <div style={{ marginTop: 16 }}>
            <MiniTable />
          </div>
        </div>
      </div>
    </div>
  );
}

function FakeSidebar() {
  const items = [
    { l: 'Dashboard', active: true },
    { l: 'Pesagem' },
    { l: 'Laboratório' },
    { l: 'Lotes' },
    { l: 'Estoque' },
    { l: 'Vendas' },
    { l: 'Financeiro' },
    { l: 'Cadastros' },
  ];
  return (
    <aside style={{ ...styles.card, padding: 8, height: 'fit-content', position: 'sticky', top: 20 }}>
      <div style={{ padding: '8px 10px 12px', borderBottom: `1px solid ${C.borderLt}`, marginBottom: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>SIGFEC</p>
        <p style={{ fontSize: 11, color: C.text3, margin: '2px 0 0' }}>Fecularia Loanda</p>
      </div>
      <p style={{ fontSize: 10, color: C.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, padding: '4px 10px' }}>Operação</p>
      {items.map((it) => (
        <div key={it.l} style={{
          padding: '7px 10px', fontSize: 13, fontWeight: 500,
          color: it.active ? C.primary : C.text2,
          background: it.active ? C.primaryBg : 'transparent',
          borderRadius: 6, marginBottom: 2, cursor: 'pointer',
          borderLeft: it.active ? `2px solid ${C.primary}` : '2px solid transparent', paddingLeft: 12,
        }}>{it.l}</div>
      ))}
    </aside>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
      <div>
        <p style={{ fontSize: 11, color: C.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>Geral / Dashboard</p>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: C.text, margin: '4px 0 0', letterSpacing: -0.3 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: C.text3, margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {action || (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="secondary" icon={Filter} sm>Filtros</Btn>
          <Btn kind="primary" icon={Plus} sm>Nova entrada</Btn>
        </div>
      )}
    </div>
  );
}

function ChartCard() {
  // Sparkline bar synthetic
  const data = [42, 55, 48, 67, 72, 58, 81, 76, 90, 85, 92, 105];
  const max = Math.max(...data);
  return (
    <div style={{ ...styles.card, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>Recebimento de mandioca</p>
          <p style={{ fontSize: 11, color: C.text3, margin: '2px 0 0' }}>Toneladas por dia • últimos 12 dias</p>
        </div>
        <Badge tone="success" dot>Crescendo</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160 }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: '100%', height: `${(v / max) * 100}%`,
              background: i === data.length - 1 ? C.primary : C.primaryBg,
              border: `1px solid ${i === data.length - 1 ? C.primary2 : C.primaryBd}`,
              borderRadius: '4px 4px 0 0',
            }} />
            <span style={{ fontSize: 10, color: C.text3 }}>{14 + i}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentList() {
  const items = [
    { user: 'João Silva',     when: 'agora',    text: 'Pesagem #1248 concluída — 23,4 t' },
    { user: 'Maria Souza',    when: '5 min',    text: 'Lote LOT-2026-00012 finalizado' },
    { user: 'Carlos Lima',    when: '12 min',   text: 'Análise renda — APROVADO (512 g)' },
    { user: 'Sistema',        when: '34 min',   text: 'Estoque mínimo: Polvilho Doce' },
    { user: 'Ana Pereira',    when: '1 h',      text: 'Venda #340 faturada — R$ 18.500' },
  ];
  return (
    <div style={{ ...styles.card, padding: 0, height: '100%' }}>
      <div style={{ padding: 16, borderBottom: `1px solid ${C.borderLt}` }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>Atividade recente</p>
      </div>
      <div>
        {items.map((it, i) => (
          <div key={i} style={{
            padding: 14, borderBottom: i === items.length - 1 ? 'none' : `1px solid ${C.borderLt}`,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 999, background: C.primaryBg,
              color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, flexShrink: 0,
            }}>{it.user.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{it.text}</p>
              <p style={{ fontSize: 11, color: C.text3, margin: '2px 0 0' }}>{it.user} • {it.when}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTable() {
  const rows = [
    { id: 'LOT-2026-00014', prod: 'Fécula de Mandioca', qtd: '200 sacos', status: 'success', label: 'Finalizado' },
    { id: 'LOT-2026-00015', prod: 'Polvilho Azedo',     qtd: '120 sacos', status: 'info',    label: 'Em produção' },
    { id: 'LOT-2026-00016', prod: 'Tapioca',            qtd: '80 sacos',  status: 'warning', label: 'Aguardando' },
  ];
  return (
    <div style={{ ...styles.card }}>
      <div style={{ padding: 16, borderBottom: `1px solid ${C.borderLt}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>Lotes recentes</p>
        <a style={{ fontSize: 12, color: C.primary, fontWeight: 500, textDecoration: 'none' }}>Ver todos →</a>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead style={{ background: '#fafbfc' }}>
          <tr>
            {['Código', 'Produto', 'Quantidade', 'Status', ''].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borderLt}`, fontFamily: 'monospace', color: C.text }}>{r.id}</td>
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borderLt}`, color: C.text }}>{r.prod}</td>
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borderLt}`, color: C.text }}>{r.qtd}</td>
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borderLt}` }}><Badge tone={r.status} dot>{r.label}</Badge></td>
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borderLt}`, textAlign: 'right' }}>
                <button style={{ background: 'transparent', border: 'none', color: C.text3, cursor: 'pointer', padding: 4 }}><MoreHorizontal size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ LISTAGEM ============
function ListaMock() {
  const rows = [
    { id: 1, nome: 'Cooperativa Loanda', cpf: '12.345.678/0001-90', tel: '(44) 99988-7766', cidade: 'Loanda - PR', status: 'success', label: 'Ativo' },
    { id: 2, nome: 'José da Silva Filho', cpf: '012.345.678-90',     tel: '(44) 99955-1212', cidade: 'Querência - PR', status: 'success', label: 'Ativo' },
    { id: 3, nome: 'Agro Santa Maria',   cpf: '98.765.432/0001-10', tel: '(44) 99877-3344', cidade: 'Marilena - PR', status: 'warning', label: 'Pendente' },
    { id: 4, nome: 'Distribuidora Norte', cpf: '11.222.333/0001-44', tel: '(44) 99800-5566', cidade: 'Paranavaí - PR', status: 'danger',  label: 'Inativo' },
    { id: 5, nome: 'Fazenda São João',    cpf: '999.888.777-66',     tel: '(44) 99700-7788', cidade: 'Loanda - PR', status: 'success', label: 'Ativo' },
  ];
  return (
    <div>
      <PageHeader
        title="Parceiros"
        subtitle="Clientes, fornecedores e produtores cadastrados"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="secondary" icon={Filter} sm>Filtros</Btn>
            <Btn kind="primary" icon={Plus} sm>Novo parceiro</Btn>
          </div>
        }
      />

      <div style={{ ...styles.card, marginTop: 20 }}>
        {/* Search bar */}
        <div style={{ padding: 16, borderBottom: `1px solid ${C.borderLt}`, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.text3 }} />
            <input placeholder="Buscar por nome, CPF/CNPJ ou cidade"
              style={{ width: '100%', padding: '7px 12px 7px 32px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text, background: '#fff' }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Todos', 'Produtor', 'Cliente', 'Fornecedor'].map((t, i) => (
              <button key={t} style={{
                padding: '5px 10px', fontSize: 12, fontWeight: 500, borderRadius: 6,
                background: i === 0 ? C.primaryBg : 'transparent',
                color: i === 0 ? C.primary : C.text2,
                border: `1px solid ${i === 0 ? C.primaryBd : C.border}`,
                cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: C.text3 }}>{rows.length} registros</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#fafbfc' }}>
            <tr>
              {['Nome', 'CPF/CNPJ', 'Telefone', 'Cidade', 'Status', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ background: '#fff' }}>
                <td style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borderLt}`, color: C.text, fontWeight: 500 }}>{r.nome}</td>
                <td style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borderLt}`, color: C.text2, fontFamily: 'monospace', fontSize: 12 }}>{r.cpf}</td>
                <td style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borderLt}`, color: C.text2 }}>{r.tel}</td>
                <td style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borderLt}`, color: C.text2 }}>{r.cidade}</td>
                <td style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borderLt}` }}><Badge tone={r.status} dot>{r.label}</Badge></td>
                <td style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borderLt}`, textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 2 }}>
                    {[Eye, Pencil, Trash2].map((I, i) => (
                      <button key={i} style={{ background: 'transparent', border: 'none', padding: 6, borderRadius: 4, color: C.text3, cursor: 'pointer' }}><I size={14} /></button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginação */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.borderLt}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.text3 }}>Mostrando 1–5 de 47</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['‹', '1', '2', '3', '›'].map((p, i) => (
              <button key={p} style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 4,
                background: i === 1 ? C.primary : '#fff',
                color: i === 1 ? '#fff' : C.text2,
                border: `1px solid ${i === 1 ? C.primary : C.border}`,
                cursor: 'pointer',
              }}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ FORMULÁRIO ============
function FormMock() {
  const inputStyle = {
    width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6,
    fontSize: 13, color: C.text, background: '#fff', outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 6 };
  const reqMark = <span style={{ color: C.danger, marginLeft: 2 }}>*</span>;

  return (
    <div>
      <PageHeader title="Novo Parceiro" subtitle="Cadastro de cliente, fornecedor ou produtor" action={null} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginTop: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Seção 1 */}
          <div style={{ ...styles.card, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borderLt}`, background: '#fafbfc' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>Identificação</p>
              <p style={{ fontSize: 11, color: C.text3, margin: '2px 0 0' }}>Dados principais do parceiro</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nome / Razão Social{reqMark}</label>
                <input style={inputStyle} placeholder="Cooperativa Loanda" defaultValue="Cooperativa Loanda Ltda" />
              </div>
              <div>
                <label style={labelStyle}>CPF / CNPJ{reqMark}</label>
                <input style={inputStyle} placeholder="000.000.000-00" defaultValue="12.345.678/0001-90" />
              </div>
              <div>
                <label style={labelStyle}>Tipo{reqMark}</label>
                <select style={inputStyle}>
                  <option>Produtor</option><option>Cliente</option><option>Fornecedor</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input style={inputStyle} type="email" placeholder="contato@empresa.com" />
              </div>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input style={inputStyle} placeholder="(00) 00000-0000" defaultValue="(44) 99988-7766" />
              </div>
            </div>
          </div>

          {/* Seção 2 */}
          <div style={{ ...styles.card, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borderLt}`, background: '#fafbfc' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>Endereço</p>
              <p style={{ fontSize: 11, color: C.text3, margin: '2px 0 0' }}>Localização do parceiro</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '120px 1fr 120px', gap: 16 }}>
              <div>
                <label style={labelStyle}>CEP{reqMark}</label>
                <input style={inputStyle} placeholder="00000-000" defaultValue="87900-000" />
              </div>
              <div>
                <label style={labelStyle}>Logradouro{reqMark}</label>
                <input style={inputStyle} defaultValue="Av. Souza Naves" />
              </div>
              <div>
                <label style={labelStyle}>Número</label>
                <input style={inputStyle} defaultValue="1234" />
              </div>
              <div style={{ gridColumn: '1 / 3' }}>
                <label style={labelStyle}>Bairro</label>
                <input style={inputStyle} defaultValue="Centro" />
              </div>
              <div>
                <label style={labelStyle}>UF</label>
                <input style={inputStyle} defaultValue="PR" />
              </div>
            </div>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <Btn kind="ghost">Cancelar</Btn>
            <Btn kind="secondary">Salvar rascunho</Btn>
            <Btn kind="primary" icon={CheckCircle2}>Salvar parceiro</Btn>
          </div>
        </div>

        {/* Sidebar de ajuda */}
        <aside style={{ ...styles.card, padding: 18, height: 'fit-content', position: 'sticky', top: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>Dicas</p>
          <ul style={{ fontSize: 12, color: C.text2, margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Use CNPJ se for pessoa jurídica.</li>
            <li>CEP preenche endereço automático.</li>
            <li>Campos com <span style={{ color: C.danger }}>*</span> são obrigatórios.</li>
          </ul>
          <hr style={{ border: 0, borderTop: `1px solid ${C.borderLt}`, margin: '14px 0' }} />
          <p style={{ fontSize: 11, color: C.text3, margin: 0 }}>
            Você pode editar a qualquer momento depois pelo botão <strong>Editar</strong> na listagem.
          </p>
        </aside>
      </div>
    </div>
  );
}

// ============ LOGIN ============
function LoginMock() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, minHeight: 560, ...styles.card, overflow: 'hidden' }}>
      {/* Esquerda */}
      <div style={{ background: '#fafbfc', padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: C.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>S</div>
          <span style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>SIGFEC</span>
        </div>
        <div>
          <p style={{ fontSize: 11, color: C.primary, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', margin: 0 }}>Sistema de gestão industrial</p>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: C.text, margin: '8px 0 12px', letterSpacing: -0.4, lineHeight: 1.2 }}>Gestão completa para fecularia.</h1>
          <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, maxWidth: 360 }}>
            Pesagem, laboratório, produção, estoque, vendas e financeiro integrados em uma única plataforma corporativa.
          </p>
        </div>
        <div style={{ fontSize: 11, color: C.text3 }}>© 2026 SIGFEC — Fecularia Loanda • v1.0</div>
      </div>

      {/* Direita */}
      <div style={{ padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text, margin: 0, letterSpacing: -0.3 }}>Entrar</h2>
        <p style={{ fontSize: 13, color: C.text3, margin: '4px 0 24px' }}>Use suas credenciais para acessar.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.text, display: 'block', marginBottom: 6 }}>Usuário</label>
            <input placeholder="admin" defaultValue="admin"
              style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text, background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.text, display: 'block', marginBottom: 6 }}>Senha</label>
            <input type="password" placeholder="••••••••" defaultValue="••••••••"
              style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text, background: '#fff' }} />
          </div>
          <button style={{
            marginTop: 6, padding: '10px 16px', background: C.primary, color: '#fff', border: 'none',
            borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            Entrar <ArrowUpRight size={14} />
          </button>
        </div>

        <hr style={{ border: 0, borderTop: `1px solid ${C.border}`, margin: '24px 0 16px' }} />
        <div style={{ fontSize: 11, color: C.text3, padding: 10, background: '#fafbfc', border: `1px solid ${C.borderLt}`, borderRadius: 6 }}>
          Credenciais teste: <code style={{ color: C.primary, fontFamily: 'monospace' }}>admin</code> / <code style={{ color: C.primary, fontFamily: 'monospace' }}>admin</code>
        </div>
      </div>
    </div>
  );
}
