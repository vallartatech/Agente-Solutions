import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Handshake, Loader2, Star, LogIn, Info, Users } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { mostrarAviso } from '../../../utils/dialogos';
import '../../../styles/AgenteMarket/Shared/TecnicoQr.css';

const API = import.meta.env.VITE_API_BASE_URL;

// Al entrar a la app, el login regresa aquí (ver Login.jsx)
export const CLAVE_VOLVER_A = 'agente_volver_a';

/**
 * Botón "Contratar" del perfil de un técnico leído por QR. Contratar = agregarlo a los favoritos del
 * cliente (máximo 3); a sus favoritos les puede mandar solicitudes directas desde "A mis técnicos".
 *  codigo:   qr_codigo del técnico
 *  relacion: { estado, no_disponible, favoritos, limite_favoritos } o null (sin sesión / no es cliente)
 *  enMisTecnicos: true si ya está en esa pantalla (no muestra "Ir a Mis técnicos")
 *  onContratado(): después de agregarlo
 */
const ContratarTecnico = ({ codigo, nombre, relacion, enMisTecnicos = false, onContratado }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);

  if (!user) {
    return (
      <div className="tqr-contratar">
        <p className="tqr-nota"><Info size={15} /> Inicia sesión o crea tu cuenta de cliente para contratar a {nombre || 'este técnico'}.</p>
        <button
          type="button"
          className="tqr-btn tqr-btn-primario tqr-btn-grande"
          onClick={() => {
            try { sessionStorage.setItem(CLAVE_VOLVER_A, `/t/${codigo}`); } catch { /* sin almacenamiento: solo entra */ }
            navigate('/');
          }}
        >
          <LogIn size={18} /> Iniciar sesión para contratar
        </button>
      </div>
    );
  }

  if (!relacion) {
    return <p className="tqr-nota"><Info size={15} /> Solo los clientes de la red pueden contratar técnicos.</p>;
  }

  if (relacion.no_disponible) {
    return <p className="tqr-nota tqr-nota-alerta"><Info size={15} /> Este técnico no está disponible para ti.</p>;
  }

  const irAMisTecnicos = !enMisTecnicos && (
    <button type="button" className="tqr-btn tqr-btn-grande" onClick={() => navigate('/mis-tecnicos')}>
      <Users size={18} /> Ir a Mis técnicos
    </button>
  );

  if (relacion.estado === 'favorito') {
    return (
      <div className="tqr-contratar">
        <p className="tqr-nota tqr-nota-ok"><Star size={15} fill="currentColor" /> Ya es uno de tus técnicos favoritos. Al reportar un problema elige "A mis técnicos" para enviarle la solicitud solo a él.</p>
        {irAMisTecnicos}
      </div>
    );
  }

  const limite = relacion.limite_favoritos || 3;
  if (relacion.favoritos >= limite) {
    return (
      <div className="tqr-contratar">
        <p className="tqr-nota tqr-nota-alerta"><Info size={15} /> Ya tienes {limite} técnicos favoritos. Quita uno en Mis técnicos para poder contratar a {nombre || 'este técnico'}.</p>
        {irAMisTecnicos}
      </div>
    );
  }

  const contratar = async () => {
    setEnviando(true);
    try {
      await axios.post(`${API}/red/qr/${codigo}/contratar`);
      await mostrarAviso(`${nombre || 'El técnico'} ya está en tus favoritos. Al reportar un problema elige "A mis técnicos" para enviarle la solicitud.`, 'success');
      onContratado?.();
    } catch (e) {
      mostrarAviso(e.response?.data?.message || 'No se pudo contratar al técnico. Intenta de nuevo.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="tqr-contratar">
      <p className="tqr-nota"><Star size={15} /> Se agregará a tus favoritos ({relacion.favoritos} de {limite}). Solo a tus favoritos puedes enviarles solicitudes directas.</p>
      <button type="button" className="tqr-btn tqr-btn-primario tqr-btn-grande" onClick={contratar} disabled={enviando}>
        {enviando ? <Loader2 size={18} className="tqr-girar" /> : <Handshake size={18} />} Contratar
      </button>
    </div>
  );
};

export default ContratarTecnico;
