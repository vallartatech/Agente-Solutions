import { lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { esTecnicoRed } from '../../utils/entorno';
import CasaLoader from './CasaLoader';

// Cada entorno tiene su propio perfil; se cargan solo cuando se usan
// (así el CSS de un entorno no se descarga en el otro).
const PerfilTecnicoSolutions = lazy(() => import('../../portals/AgenteSolutions/Tecnico/PerfilTecnico'));
const PerfilTecnicoRed = lazy(() => import('../../portals/AgenteMarket/Tecnico/PerfilTecnico'));
const PerfilCliente = lazy(() => import('../../portals/AgenteMarket/Cliente/PerfilCliente'));

const Profile = () => {
  const { user } = useAuth();
  const roleId = Number(user?.role_id);

  let perfil;
  if (roleId === 2) {
    // Técnico Agente (interno)
    perfil = <PerfilTecnicoSolutions />;
  } else if (esTecnicoRed(user)) {
    // Técnicos de la red: 6 Técnico independiente, 7 Contratista, 8 Técnico de cuadrilla
    perfil = <PerfilTecnicoRed />;
  } else {
    // Clientes, propietarios y administradores (0, 1, 3, 4, 5)
    perfil = <PerfilCliente />;
  }

  return <Suspense fallback={<CasaLoader />}>{perfil}</Suspense>;
};

export default Profile;
