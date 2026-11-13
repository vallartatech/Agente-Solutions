import { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Home, User, AlertCircle, CalendarClock } from 'lucide-react';
import { mostrarAviso } from '../../utils/dialogos';
import CampoFechaHora from './CampoFechaHora';
import { fechaPreferidaLegible } from '../../utils/fechaPreferida';
import '../../styles/AgenteSolutions/Admin/VistaPropiedades.css';
import '../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';
import '../../styles/AgenteMarket/Shared/SelectorFechaRed.css';

/**
 * Solicitar levantamiento desde la Red.
 * El cliente no elige técnico: la solicitud la recibe el Root de Agente Solutions, que asigna a un
 * técnico interno. Antes de enviar se avisa que la valoración tiene costo.
 *
 * - `propiedad`: propiedad ya elegida (menú de una tarjeta). Sin ella se muestra un selector con
 *   `propiedades`, preseleccionando `propiedadIdInicial` si viene.
 * - `onSuccess`: se llama al cerrar la pantalla de éxito.
 */
const nombreDe = (p) => p?.nombre_propiedad || p?.property_name || p?.direccion || (p?.id ? `Propiedad #${p.id}` : 'Propiedad');

// 'YYYY-MM-DD' de hoy en hora local (la visita no puede pedirse para un día pasado)
const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ModalSolicitarLevantamientoRed = ({ propiedad = null, propiedades = [], propiedadIdInicial = '', onClose, onSuccess }) => {
  const [propiedadId, setPropiedadId] = useState(String(propiedad?.id || propiedadIdInicial || ''));
  const [supervisor, setSupervisor] = useState('');
  // Fecha y hora en que el cliente quiere la visita ('YYYY-MM-DDTHH:MM'); el Root la ajusta con el técnico
  const [fechaPreferida, setFechaPreferida] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  const elegida = propiedad || propiedades.find(p => String(p.id) === String(propiedadId)) || null;

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (!propiedadId) {
      mostrarAviso('Selecciona la propiedad para la que quieres el levantamiento.');
      return;
    }
    if (!fechaPreferida) {
      mostrarAviso('Selecciona la fecha y hora en que quieres la visita.');
      return;
    }
    if (new Date(fechaPreferida) < new Date()) {
      mostrarAviso('Selecciona una fecha y hora que aún no haya pasado.');
      return;
    }

    setEnviando(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const sesion = JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData || {};
      const nombreUsuario = `${sesion.first_name || ''} ${sesion.last_name || ''}`.trim();

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/servicios`,
        {
          property_id: Number(propiedadId),
          title: 'Levantamiento Inicial',
          description: 'Solicitud de visita técnica para registro inicial de la propiedad.',
          priority: 'Media',
          supervisor_name: supervisor.trim() || nombreUsuario || 'El propietario',
          preferred_start: `${fechaPreferida.replace('T', ' ')}:00`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200 || res.status === 201) {
        setExito(true);
      } else {
        mostrarAviso(res.data?.message || 'No se pudo solicitar el levantamiento.');
      }
    } catch (error) {
      console.error('Error al solicitar levantamiento:', error);
      mostrarAviso(error.response?.data?.message || 'Hubo un error al solicitar el levantamiento.');
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = () => {
    if (exito) {
      if (onSuccess) onSuccess();
      else onClose?.();
    } else {
      onClose?.();
    }
  };

  const pasos = [
    'Asignamos a un técnico de Agente Solutions.',
    'Confirmamos la cita con el técnico según tu preferencia.',
    'Al terminar, verás el levantamiento en tu propiedad.',
  ];

  return createPortal(
    <div className="rp-overlay" onClick={cerrar}>
      <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rp-header">
          <div className="rp-header-text">
            <span className="rp-tag">NUEVO SERVICIO</span>
            <h2 className="rp-title">Solicitar Levantamiento</h2>
          </div>
          <button type="button" className="rp-close" onClick={cerrar} aria-label="Cerrar">
            <X size={18} color="#ffffff" strokeWidth={2.6} />
          </button>
        </div>

        {!exito ? (
          <form className="rp-form" onSubmit={enviar}>
            {propiedad ? (
              <p className="xp-rp-propiedad">
                <Home size={15} color="#ff8c42" />
                {nombreDe(propiedad)}
              </p>
            ) : (
              <div className="rp-group">
                <label className="rp-label"><Home size={16} color="#ff8c42" /> Propiedad *</label>
                <select
                  className="xp-rp-input"
                  value={propiedadId}
                  onChange={(e) => setPropiedadId(e.target.value)}
                  required
                >
                  <option value="">Selecciona una propiedad...</option>
                  {propiedades.map(p => (
                    <option key={p.id} value={p.id}>{nombreDe(p)}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="rp-group">
              <label className="rp-label"><CalendarClock size={16} color="#ff8c42" /> ¿Cuándo quieres la visita? *</label>
              <CampoFechaHora
                type="datetime-local"
                value={fechaPreferida}
                min={hoyLocal()}
                onChange={(e) => setFechaPreferida(e.target.value)}
                className="campo-fecha-red"
                overlayClassName="mdtp-tema-red"
                placeholder="Elige fecha y hora"
                required
              />
              <small>Agente Solutions confirmará la cita con el técnico según tu preferencia.</small>
            </div>

            <div className="rp-group">
              <label className="rp-label"><User size={16} color="#ff8c42" /> Supervisor en sitio (Opcional)</label>
              <input
                type="text"
                className="xp-rp-input"
                placeholder="Ej. Juan Pérez (Conserje)"
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
              />
              <small>Si el dueño no estará en la propiedad, asigna a alguien responsable de atender la visita.</small>
            </div>

            <p className="sl-aviso-costo">
              <AlertCircle size={16} />
              <span>La valoración tiene un costo que se te informará al confirmar la visita.</span>
            </p>

            <div className="rp-footer">
              <button type="submit" className="xp-btn-primary" disabled={enviando || (!propiedad && !propiedades.length)}>
                {enviando ? 'Solicitando...' : 'Solicitar levantamiento'}
              </button>
            </div>
          </form>
        ) : (
          <div className="rp-form sl-success">
            {/* Palomita animada: el círculo se dibuja, luego la palomita y un destello alrededor */}
            <div className="sl-check" aria-hidden="true">
              <span className="sl-check-halo" />
              <svg viewBox="0 0 52 52">
                <circle className="sl-check-ring" cx="26" cy="26" r="24" />
                <path className="sl-check-mark" d="M15 27.5l7.2 7.2L37.5 19" />
              </svg>
            </div>

            <h2 className="sl-anim" style={{ '--d': '0.55s' }}>¡Levantamiento solicitado!</h2>
            <p className="sl-anim" style={{ '--d': '0.65s' }}>
              Recibimos tu solicitud. El equipo de Agente Solutions asignará a un técnico para la visita.
            </p>

            <div className="sl-anim" style={{ '--d': '0.75s', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
              <span className="sl-prop-chip">
                <Home size={14} />
                {nombreDe(elegida)}
              </span>
              {fechaPreferida && (
                <span className="sl-prop-chip">
                  <CalendarClock size={14} />
                  {fechaPreferidaLegible(fechaPreferida)}
                </span>
              )}
            </div>

            <ol className="sl-pasos">
              {pasos.map((paso, i) => (
                <li key={i} className="sl-anim" style={{ '--d': `${0.85 + i * 0.1}s` }}>
                  <span className="sl-paso-num">{i + 1}</span>
                  {paso}
                </li>
              ))}
            </ol>

            <p className="sl-aviso-costo sl-anim" style={{ '--d': '1.2s' }}>
              <AlertCircle size={16} />
              <span>La valoración tiene un costo que se te informará al confirmar la visita.</span>
            </p>

            <div className="rp-footer sl-anim" style={{ '--d': '1.3s' }}>
              <button type="button" className="xp-btn-primary" onClick={cerrar}>
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ModalSolicitarLevantamientoRed;
