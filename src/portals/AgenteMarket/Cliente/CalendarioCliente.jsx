import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../../components/Shared/Header';
import { useAuth } from '../../../context/AuthContext';
import ModalCalendarioCliente from './ModalCalendarioCliente';

// Página /calendario de Agente Market (a la que llevan las notificaciones): solo muestra el calendario.
// Copia de CalendarioSolutions. Al cerrarlo se regresa a la pantalla anterior; si se entró directo
// (push, enlace), al inicio del rol.
const CalendarioCliente = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const cerrar = () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    const role = Number(user?.role_id);
    navigate(role === 6 || role === 8 ? '/mercado-trabajos' : '/VistaMarket', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', display: 'flex', flexDirection: 'column' }}>
      <Header activeModule="calendario" titulo="CALENDARIO DE VISITAS Y SERVICIOS" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ModalCalendarioCliente isOpen onClose={cerrar} />
      </div>
    </div>
  );
};

export default CalendarioCliente;
