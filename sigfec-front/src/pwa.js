/**
 * PWA — registro do service worker e convite de instalação ("Instalar app").
 * O service worker só é registrado no build de produção (npm run app): no modo dev
 * ele guardaria em cache o código-fonte e atrapalharia o recarregamento do Vite.
 */
import { useEffect, useState } from 'react';

let convite = null; // evento beforeinstallprompt guardado até o usuário clicar
const ouvintes = new Set();
const avisar = () => ouvintes.forEach((fn) => fn(convite));

export function iniciarPWA() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    convite = e;
    avisar();
  });
  window.addEventListener('appinstalled', () => { convite = null; avisar(); });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker não registrado:', err));
    });
  }
}

/** Já está aberto como app instalado (tela cheia, sem barra do navegador)? */
export const rodandoComoApp = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** iPhone/iPad: o Safari não tem botão de instalar, só "Adicionar à Tela de Início". */
export const ehIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export function useInstalarApp() {
  const [evento, setEvento] = useState(convite);
  useEffect(() => {
    ouvintes.add(setEvento);
    return () => ouvintes.delete(setEvento);
  }, []);

  const instalar = async () => {
    if (!evento) return false;
    evento.prompt();
    const { outcome } = await evento.userChoice;
    convite = null;
    avisar();
    return outcome === 'accepted';
  };

  return { podeInstalar: !!evento, instalar };
}
