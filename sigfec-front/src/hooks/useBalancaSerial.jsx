/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Web Serial API hook para leitura de balança industrial.
 *
 * Protocolo padrão Toledo/Filizola/Urano: balança envia ASCII contínuo
 * tipo "ST,GS,+   1234.50 kg" ou "+001234.5\r\n".
 * Regex parser pega o primeiro número decimal positivo da string.
 *
 * Retorna:
 * - supported: bool — navegador suporta Web Serial API
 * - connected: bool
 * - mockMode: bool — gera leituras simuladas para demo/dev
 * - weight: number — último peso lido (kg)
 * - status: 'idle' | 'connecting' | 'reading' | 'error'
 * - connect(), disconnect(), startMock(), stopMock()
 */
export default function useBalancaSerial() {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const [connected, setConnected] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [weight, setWeight] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const mockTimerRef = useRef(null);
  const bufferRef = useRef('');

  const parseLine = (line) => {
    // Procura primeiro número decimal positivo
    const m = line.match(/[+]?(\d{1,6}(?:[.,]\d{1,3})?)/);
    if (!m) return null;
    const v = parseFloat(m[1].replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  };

  const readLoop = async (reader) => {
    setStatus('reading');
    try {
      while (reader === readerRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        bufferRef.current += value;
        // separa por \r\n ou \n
        const lines = bufferRef.current.split(/\r?\n/);
        bufferRef.current = lines.pop() ?? '';
        for (const line of lines) {
          const w = parseLine(line.trim());
          if (w != null) setWeight(w);
        }
      }
    } catch (err) {
      if (reader === readerRef.current) {
        setStatus('error');
        setError(err.message || 'Erro de leitura');
      }
    }
  };

  const connect = useCallback(async (baudRate = 9600) => {
    if (!supported) { setError('Web Serial API não suportado neste navegador.'); return; }
    setStatus('connecting');
    setError(null);
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate, dataBits: 8, parity: 'none', stopBits: 1 });
      portRef.current = port;

      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable).catch(() => {/* port closed */});
      const reader = decoder.readable.getReader();
      readerRef.current = reader;
      setConnected(true);
      readLoop(reader);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Falha ao conectar');
      setConnected(false);
    }
  }, [supported]);

  const disconnect = useCallback(async () => {
    const reader = readerRef.current;
    readerRef.current = null;
    if (reader) {
      try { await reader.cancel(); } catch {/* */}
      try { reader.releaseLock(); } catch {/* */}
    }
    if (portRef.current) {
      try { await portRef.current.close(); } catch {/* */}
      portRef.current = null;
    }
    setConnected(false);
    setStatus('idle');
  }, []);

  // Modo simulado para demo / desenvolvimento sem hardware
  const startMock = useCallback(() => {
    if (mockTimerRef.current) return;
    setMockMode(true);
    setStatus('reading');
    let base = 12000 + Math.random() * 8000;
    let direction = 1;
    mockTimerRef.current = setInterval(() => {
      // Simula caminhão subindo na balança: peso oscila e estabiliza
      const variation = (Math.random() - 0.5) * 50;
      base += direction * (Math.random() * 200) + variation;
      base = Math.max(5000, Math.min(45000, base));
      if (Math.random() < 0.05) direction *= -1;
      setWeight(Number(base.toFixed(2)));
    }, 600);
  }, []);

  const stopMock = useCallback(() => {
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current);
      mockTimerRef.current = null;
    }
    setMockMode(false);
    setStatus('idle');
    setWeight(0);
  }, []);

  // Cleanup
  useEffect(() => () => {
    disconnect();
    if (mockTimerRef.current) clearInterval(mockTimerRef.current);
  }, [disconnect]);

  return {
    supported, connected, mockMode, weight, status, error,
    connect, disconnect, startMock, stopMock,
  };
}
