import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../../components/Shared/Header';
import { useAuth } from '../../../context/AuthContext';
import ModalCalendarioSolutions from './ModalCalendarioSolutions';

// Página /calendario (a la que llevan las notificaciones): solo muestra el calendario.
// Al cerrarlo se regresa a la pantalla anterior; si se entró directo (push, enlace), al inicio del rol.
const CalendarioSolutions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const cerrar = () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    const role = Number(user?.role_id);
    navigate(role === 0 || role === 1 ? '/VistaRoot' : role === 2 ? '/VistaTecnico' : '/VistaMarket', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', display: 'flex', flexDirection: 'column' }}>
      <Header activeModule="calendario" titulo="CALENDARIO DE VISITAS Y SERVICIOS" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ModalCalendarioSolutions isOpen onClose={cerrar} />
      </div>
    </div>
  );
};

export default CalendarioSolutions;
