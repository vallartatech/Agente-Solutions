import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { HardHat, Users, UserCheck, LogOut, Loader2, Clock, Send } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { mostrarAviso } from '../../../utils/dialogos';
import logo from '../../../assets/Logo4.png';
import '../../../styles/AgenteMarket/Tecnico/MiCuadrilla.css';

const API = import.meta.env.VITE_API_BASE_URL;

/**
 * Técnico de cuadrilla que quedó sin cuadrilla (su contratista lo quitó o no aceptó su registro).
 * Conserva su cuenta y su historial; desde aquí se une a otra cuadrilla con un código o pide trabajar
 * como técnico independiente (mientras los cobros estén en pausa, lo activa Root).
 */
const SinCuadrilla = () => {
  const navigate = useNavigate();
  const { user, logoutGlobal } = useAuth();
  const [estado, setEstado] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(null); // 'unirme' | 'independiente'

  const cargar = async () => {
    try {
      const { data } = await axios.get(`${API}/cuadrilla/mi-estado`);
      setEstado(data);
      // Ya lo aceptaron en otra cuadrilla o Root lo volvió independiente: a iniciar sesión de nuevo
      if (!data.sin_cuadrilla) {
        logoutGlobal();
        navigate('/', { replace: true });
      }
    } catch {
      setEstado({ sin_cuadrilla: true, solicitud: null });
    }
  };

  // Solo al abrir (logoutGlobal cambia en cada render del contexto)
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const unirme = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    setEnviando('unirme');
    try {
      const { data } = await axios.post(`${API}/cuadrilla/unirme`, { codigo: codigo.trim() });
      mostrarAviso(data.message, 'success');
      setCodigo('');
      cargar();
    } catch (err) {
      mostrarAviso(err.response?.data?.error || err.response?.data?.message || 'No se pudo enviar tu solicitud.', 'error');
    } finally {
      setEnviando(null);
    }
  };

  const pedirIndependiente = async () => {
    setEnviando('independiente');
    try {
      const { data } = await axios.post(`${API}/cuadrilla/solicitar-independiente`);
      mostrarAviso(data.message, 'success');
    } catch (err) {
      mostrarAviso(err.response?.status === 429
        ? 'Ya enviaste esta solicitud. Te contactaremos pronto.'
        : (err.response?.data?.error || 'No se pudo enviar tu solicitud.'), 'error');
    } finally {
      setEnviando(null);
    }
  };

  const salir = async () => {
    try { await axios.post(`${API}/logout`); } catch { /* la sesión se cierra igual */ }
    logoutGlobal();
    navigate('/', { replace: true });
  };

  const rechazado = user?.approval_status === 'rechazado_cuadrilla';

  return (
    <div className="mc-pagina">
      <main className="mc-contenido">
        <div className="mc-fila-botones" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <img src={logo} alt="Agente Market" style={{ height: 40, width: 'auto' }} />
          <button type="button" className="mc-btn mc-btn-suave" style={{ flex: '0 0 auto' }} onClick={salir}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>

        <div className="mc-titulo">
          <HardHat size={28} />
          <div>
            <h1>Hola, {user?.first_name || 'técnico'}</h1>
            <p>
              {rechazado
                ? 'El contratista no aceptó tu solicitud para unirte a su cuadrilla.'
                : 'Ya no perteneces a la cuadrilla de tu contratista. Tu cuenta y tu historial se conservan.'}
            </p>
          </div>
        </div>

        {!estado ? (
          <div className="mc-cargando"><Loader2 size={28} className="mc-girar" /> Cargando...</div>
        ) : (
          <section className="mc-resumen">
            <article className="mc-tarjeta">
              <span className="mc-etiqueta"><Users size={16} /> Unirme a otra cuadrilla</span>
              {estado.solicitud ? (
                <div className="mc-aviso" style={{ background: '#fffbeb', color: '#b45309', marginBottom: 0 }}>
                  <Clock size={18} />
                  <span>
                    Tu solicitud a {estado.solicitud.contratista || 'un contratista'} está en su Sala de espera.
                    Te avisaremos cuando te acepte. Puedes mandar otra si te equivocaste de código.
                  </span>
                </div>
              ) : (
                <small className="mc-nota">Pídele su código a tu nuevo contratista. Tu solicitud le llega a su Sala de espera.</small>
              )}
              <form onSubmit={unirme} className="mc-fila-botones">
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Código de la cuadrilla"
                  aria-label="Código de la cuadrilla"
                  style={{ flex: '1 1 160px', minHeight: 42, padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', font: 'inherit' }}
                />
                <button type="submit" className="mc-btn mc-btn-principal" disabled={!codigo.trim() || enviando !== null}>
                  {enviando === 'unirme' ? <Loader2 size={16} className="mc-girar" /> : <Send size={16} />} Enviar
                </button>
              </form>
            </article>

            <article className="mc-tarjeta">
              <span className="mc-etiqueta"><UserCheck size={16} /> Trabajar por mi cuenta</span>
              <small className="mc-nota">
                Como técnico independiente cotizas en la red y recibes tus propios trabajos. Le avisaremos al equipo
                de Agente Market para activar tu cuenta.
              </small>
              <button type="button" className="mc-btn mc-btn-suave" disabled={enviando !== null} onClick={pedirIndependiente}>
                {enviando === 'independiente' ? <Loader2 size={16} className="mc-girar" /> : <UserCheck size={16} />} Quiero ser independiente
              </button>
            </article>
          </section>
        )}
      </main>
    </div>
  );
};

export default SinCuadrilla;
