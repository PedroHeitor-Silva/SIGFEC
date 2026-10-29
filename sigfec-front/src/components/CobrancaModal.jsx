/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, Check, QrCode, Barcode, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const fmtMoeda = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

/**
 * Modal de geração de cobrança real (Asaas) para uma Conta a Receber.
 * Props: open, onClose, conta, onUpdated(contaAtualizada)
 */
export default function CobrancaModal({ open, onClose, conta, onUpdated }) {
  const [dados, setDados] = useState(null);   // conta atualizada com dados de cobrança
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState('');

  useEffect(() => {
    if (open) {
      setDados(conta || null);
      setErro('');
      setCopiado('');
      setLoading(false);
    }
  }, [open, conta]);

  if (typeof document === 'undefined') return null;

  const gerar = async (tipo) => {
    setLoading(true);
    setErro('');
    try {
      const path = tipo === 'PIX'
        ? `/contas-receber/${conta.id}/gerar-pix`
        : `/contas-receber/${conta.id}/gerar-boleto`;
      const { data } = await api.post(path);
      setDados(data);
      onUpdated?.(data);
      toast.success(tipo === 'PIX' ? 'Cobrança PIX gerada.' : 'Boleto gerado.');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Falha ao gerar cobrança.';
      setErro(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copiar = async (texto, qual) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      toast.success('Copiado.');
      setTimeout(() => setCopiado(''), 2500);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const temPix = dados?.qrCodePix || dados?.copiaEColaPix;
  const temBoleto = dados?.linkBoleto || dados?.linhaDigitavel;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <FileText size={14} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Gerar Cobrança</h3>
                  <p className="text-[11px] text-slate-500">
                    Conta #{conta?.id} — {conta?.cliente?.nome || ''}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition">
                <X size={14} />
              </button>
            </div>

            <div className="p-6">
              {/* Valor */}
              <div className="text-center mb-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Valor</p>
                <p className="mt-1 text-3xl font-black text-white font-mono">{fmtMoeda(conta?.valorOriginal)}</p>
              </div>

              {/* Botões gerar */}
              {!temPix && !temBoleto && (
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" disabled={loading} onClick={() => gerar('PIX')}
                    className="flex flex-col items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition">
                    {loading ? <Loader2 size={22} className="animate-spin" /> : <QrCode size={22} />}
                    <span className="text-sm font-bold">Gerar PIX</span>
                  </button>
                  <button type="button" disabled={loading} onClick={() => gerar('BOLETO')}
                    className="flex flex-col items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 p-5 text-sky-400 hover:bg-sky-500/20 disabled:opacity-50 transition">
                    {loading ? <Loader2 size={22} className="animate-spin" /> : <Barcode size={22} />}
                    <span className="text-sm font-bold">Gerar Boleto</span>
                  </button>
                </div>
              )}

              {loading && (temPix || temBoleto) && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-400">
                  <Loader2 size={16} className="animate-spin" /> Processando...
                </div>
              )}

              {erro && (
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                  {erro}
                </div>
              )}

              {/* Resultado PIX */}
              {temPix && (
                <div className="mt-2 flex flex-col items-center">
                  {dados.qrCodePix && (
                    <div className="rounded-xl bg-white p-3">
                      <img
                        src={dados.qrCodePix.startsWith('data:')
                          ? dados.qrCodePix
                          : `data:image/png;base64,${dados.qrCodePix}`}
                        alt="QR Code PIX" className="w-52 h-52" />
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-slate-500 text-center">
                    Escaneie no app do banco ou copie o código
                  </p>
                  {dados.copiaEColaPix && (
                    <div className="mt-2 w-full">
                      <div className="rounded-lg border border-slate-700 bg-slate-800 p-2.5">
                        <p className="text-[11px] font-mono text-slate-400 break-all line-clamp-3">
                          {dados.copiaEColaPix}
                        </p>
                      </div>
                      <button type="button" onClick={() => copiar(dados.copiaEColaPix, 'pix')}
                        className={`mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                          copiado === 'pix'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}>
                        {copiado === 'pix' ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar código PIX</>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Resultado Boleto */}
              {temBoleto && (
                <div className="mt-2 space-y-3">
                  {dados.linhaDigitavel && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Linha Digitável</p>
                      <div className="rounded-lg border border-slate-700 bg-slate-800 p-2.5">
                        <p className="text-[11px] font-mono text-slate-300 break-all">{dados.linhaDigitavel}</p>
                      </div>
                      <button type="button" onClick={() => copiar(dados.linhaDigitavel, 'boleto')}
                        className={`mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                          copiado === 'boleto'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'bg-sky-600 text-white hover:bg-sky-500'
                        }`}>
                        {copiado === 'boleto' ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar linha digitável</>}
                      </button>
                    </div>
                  )}
                  {dados.linkBoleto && (
                    <a href={dados.linkBoleto} target="_blank" rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition">
                      <FileText size={15} /> Abrir boleto (PDF)
                    </a>
                  )}
                </div>
              )}

              {(temPix || temBoleto) && dados.statusPagamento && (
                <p className="mt-4 text-center text-[11px] uppercase tracking-widest text-slate-600">
                  Status Asaas: {dados.statusPagamento}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
