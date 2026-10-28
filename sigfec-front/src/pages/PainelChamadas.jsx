import { useEffect, useRef, useState } from 'react';
import { MapPin, Truck } from 'lucide-react';
import api from '../services/api';
import { maskPlaca } from '../utils/masks';

/**
 * Painel de chamadas para TV do pátio: mostra para onde cada senha foi chamada.
 * Tela cheia, sem menu; atualiza a cada 5 s e destaca a chamada mais recente.
 */
const C = { bg: '#0B1F1A', card: '#12322A', line: '#23493E', text: '#E7EFE9', muted: '#8FB3A5', accent: '#3FBF9B', call: '#F2C14E' };
const senhaFmt = (n) => `#${String(n ?? 0).padStart(3, '0')}`;

export default function PainelChamadas() {
  const [fila, setFila] = useState([]);
  const [agora, setAgora] = useState(new Date());
  const [erro, setErro] = useState(false);
  const [destaque, setDestaque] = useState(false);
  const ultimaChamada = useRef(null);

  useEffect(() => {
    const carregar = () => api.get('/fila')
      .then((r) => { setFila(r.data || []); setErro(false); })
      .catch(() => setErro(true));
    carregar();
    const t1 = setInterval(carregar, 5000);
    const t2 = setInterval(() => setAgora(new Date()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const chamados = fila
    .filter((e) => e.status === 'CHAMADO')
    .sort((a, b) => String(b.dataHoraChamada).localeCompare(String(a.dataHoraChamada)));
  const emAtendimento = fila.filter((e) => e.status === 'EM_ATENDIMENTO');
  const proximos = fila.filter((e) => e.status === 'AGUARDANDO' && e.checklistStatus === 'APROVADO').slice(0, 5);
  const semChecklist = fila.filter((e) => e.status === 'AGUARDANDO' && e.checklistStatus !== 'APROVADO').length;
  const atual = chamados[0];

  // Pisca por alguns segundos quando surge uma chamada nova.
  useEffect(() => {
    const chave = atual ? `${atual.id}-${atual.dataHoraChamada}` : null;
    if (chave && ultimaChamada.current !== null && chave !== ultimaChamada.current) {
      setDestaque(true);
      const t = setTimeout(() => setDestaque(false), 8000);
      ultimaChamada.current = chave;
      return () => clearTimeout(t);
    }
    ultimaChamada.current = chave;
    return undefined;
  }, [atual]);

  const titulo = { fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: C.muted, margin: 0 };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Arial, sans-serif', padding: '32px 48px', boxSizing: 'border-box' }}>
      <style>{'@keyframes pisca{0%,100%{box-shadow:0 0 0 0 rgba(242,193,78,.0)}50%{box-shadow:0 0 0 14px rgba(242,193,78,.35)}}'}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <p style={{ ...titulo, color: C.accent }}>SIGFEC · Fila de descarga</p>
          <h1 style={{ fontSize: 44, margin: '6px 0 0', color: C.text }}>Chamada de veículos</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 56, fontWeight: 700, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {erro && <p style={{ color: '#F07F7F', margin: 0 }}>Sem conexão com o servidor</p>}
        </div>
      </div>

      {/* Chamada atual */}
      <div style={{
        background: C.card, border: `2px solid ${atual ? C.call : C.line}`, borderRadius: 28, padding: '36px 44px', marginBottom: 28,
        animation: destaque ? 'pisca 1s ease-in-out 8' : 'none',
      }}>
        <p style={titulo}>{atual ? 'Dirija-se agora' : 'Aguardando chamada'}</p>
        {atual ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap', marginTop: 12 }}>
            <div>
              <p style={{ fontSize: 120, fontWeight: 800, margin: 0, lineHeight: 1, color: C.call, fontVariantNumeric: 'tabular-nums' }}>
                {senhaFmt(atual.senhaDiaria)}
              </p>
              <p style={{ fontSize: 44, fontWeight: 700, margin: '10px 0 0', letterSpacing: 2 }}>
                <Truck size={38} style={{ display: 'inline-block', verticalAlign: '-6px', marginRight: 12 }} />{maskPlaca(atual.veiculo?.placa)}
              </p>
              <p style={{ fontSize: 28, color: C.muted, margin: '6px 0 0' }}>{atual.motorista?.nome}</p>
            </div>
            <div style={{ background: C.call, color: '#1A1A1A', borderRadius: 24, padding: '28px 40px', textAlign: 'center', minWidth: 360 }}>
              <p style={{ fontSize: 26, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 2 }}>
                <MapPin size={26} style={{ display: 'inline-block', verticalAlign: '-4px', marginRight: 8 }} />Local
              </p>
              <p style={{ fontSize: 72, fontWeight: 800, margin: '6px 0 0', lineHeight: 1.05 }}>{atual.localChamada}</p>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 40, color: C.muted, margin: '12px 0 0' }}>Nenhum veículo chamado no momento.</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 24, padding: '28px 36px' }}>
          <p style={titulo}>Chamados e em atendimento</p>
          {[...chamados.slice(1), ...emAtendimento].length === 0 && <p style={{ fontSize: 28, color: C.muted }}>—</p>}
          {[...chamados.slice(1), ...emAtendimento].map((e) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.line}`, padding: '16px 0' }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: e.status === 'CHAMADO' ? C.call : C.text, fontVariantNumeric: 'tabular-nums' }}>{senhaFmt(e.senhaDiaria)}</span>
              <span style={{ fontSize: 30, letterSpacing: 1 }}>{maskPlaca(e.veiculo?.placa)}</span>
              <span style={{ fontSize: 30, fontWeight: 700, color: C.accent }}>{e.localChamada}</span>
              <span style={{ fontSize: 22, color: C.muted }}>{e.status === 'CHAMADO' ? 'chamado' : 'na balança'}</span>
            </div>
          ))}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 24, padding: '28px 36px' }}>
          <p style={titulo}>Próximos (checklist aprovado)</p>
          {proximos.length === 0 && <p style={{ fontSize: 28, color: C.muted }}>—</p>}
          {proximos.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.line}`, padding: '16px 0' }}>
              <span style={{ fontSize: 22, color: C.muted, width: 40 }}>{i + 1}º</span>
              <span style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{senhaFmt(e.senhaDiaria)}</span>
              <span style={{ fontSize: 30, letterSpacing: 1 }}>{maskPlaca(e.veiculo?.placa)}</span>
            </div>
          ))}
          {semChecklist > 0 && (
            <p style={{ fontSize: 22, color: C.muted, marginTop: 16 }}>
              {semChecklist} {semChecklist === 1 ? 'veículo aguarda' : 'veículos aguardam'} inspeção da carga.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
