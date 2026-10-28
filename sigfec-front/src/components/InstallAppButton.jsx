import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInstalarApp, rodandoComoApp, ehIOS } from '../pwa';

/** Botão "Instalar app" da barra superior. Some quando o SIGFEC já está aberto como app. */
export default function InstallAppButton({ theme }) {
  const { podeInstalar, instalar } = useInstalarApp();
  if (rodandoComoApp()) return null;

  const ios = ehIOS();
  if (!podeInstalar && !ios) return null;

  const onClick = async () => {
    if (podeInstalar) {
      if (await instalar()) toast.success('SIGFEC instalado! Abra pelo ícone na tela inicial.');
      return;
    }
    toast('No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".', { icon: '📱', duration: 7000 });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title="Instalar o SIGFEC como aplicativo"
      className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition"
      style={{
        color: '#1ABB9C',
        background: theme === 'dark' ? 'rgba(26,187,156,0.12)' : 'rgba(26,187,156,0.10)',
        border: '1px solid rgba(26,187,156,0.35)',
      }}
    >
      <Download size={16} />
      <span className="hidden sm:inline">Instalar app</span>
    </button>
  );
}
