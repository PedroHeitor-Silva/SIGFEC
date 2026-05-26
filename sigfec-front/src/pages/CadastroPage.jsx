/* eslint-disable react/prop-types */
import { useNavigate } from 'react-router-dom';
import CadastroDinamico from './CadastroDinamico';

const BACK_PATH = {
  PARCEIRO: '/parceiros',
  MOTORISTA: '/motoristas',
  VEICULO: '/veiculos',
  PRODUTO: '/produtos',
  USUARIO: '/usuarios',
};

export default function CadastroPage({ tipo }) {
  const navigate = useNavigate();
  return <CadastroDinamico tipo={tipo} onBack={() => navigate(BACK_PATH[tipo] || '/cadastros')} />;
}
