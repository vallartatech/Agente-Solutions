import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import FichaTecnicoQr from './FichaTecnicoQr';
import ContratarTecnico from './ContratarTecnico';
import logo from '../../../assets/logo.png';
import '../../../styles/AgenteMarket/Shared/TecnicoQr.css';

const API = import.meta.env.VITE_API_BASE_URL;

// Página a la que lleva el QR del técnico (/t/:codigo). Se abre aunque no haya sesión:
// muestra el perfil público y, para contratar, pide entrar y regresa aquí.
const PerfilQrPublico = () => {
  const { codigo } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [relacion, setRelacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = () => {
    setCargando(true);
    axios.get(`${API}/red/qr/${codigo}`)
      .then((r) => { setPerfil(r.data.data); setRelacion(r.data.relacion || null); setError(null); })
      .catch((e) => setError(e.response?.status === 404
        ? 'Este código QR no corresponde a ningún técnico de la red.'
        : 'No se pudo cargar el perfil. Revisa tu conexión e intenta de nuevo.'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [codigo, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tqr-pagina">
      <header className="tqr-pagina-barra">
        {user ? (
          <button type="button" className="tqr-btn" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Volver</button>
        ) : <span />}
        <img src={logo} alt="Agente Solutions" className="tqr-pagina-logo" />
      </header>

      <main className="tqr-pagina-tarjeta">
        {cargando ? (
          <div className="tqr-cargando"><Loader2 size={26} className="tqr-girar" /> Cargando perfil…</div>
        ) : error ? (
          <div className="tqr-cargando tqr-error"><AlertCircle size={26} /> {error}</div>
        ) : (
          <>
            <FichaTecnicoQr perfil={perfil} conQr={false} />
            <div className="tqr-pagina-pie">
              <ContratarTecnico
                codigo={codigo}
                nombre={perfil.nombre}
                relacion={relacion}
                onContratado={() => navigate('/mis-tecnicos')}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PerfilQrPublico;
