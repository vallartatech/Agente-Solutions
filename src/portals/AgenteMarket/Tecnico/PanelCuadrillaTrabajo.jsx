import { useState } from 'react';
import axios from 'axios';
import { HardHat, Users, Phone, Loader2, X, Check, CalendarClock } from 'lucide-react';
import { mostrarAviso } from '../../../utils/dialogos';
import '../../../styles/AgenteMarket/Tecnico/PanelCuadrillaTrabajo.css';

const API = import.meta.env.VITE_API_BASE_URL;

const fechaCorta = (valor) => {
  const d = new Date(String(valor).replace(' ', 'T'));
  return isNaN(d.getTime())
    ? String(valor)
    : d.toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// Mismo día que la visita de este trabajo: se marca para que el contratista lo note
const mismoDia = (a, b) => Boolean(a && b) && String(a).slice(0, 10) === String(b).slice(0, 10);

/**
 * Cuadrilla en el detalle de un trabajo del tablero.
 * - Técnico de cuadrilla: el trabajo es de su contratista (él cobra y habla con el cliente) y con quién va.
 * - Contratista (titular): quién va a la casa y "Asignar a mi cuadrilla" (él mismo y/o sus técnicos).
 */
const PanelCuadrillaTrabajo = ({ job, onCambio }) => {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [datos, setDatos] = useState(null);
  const [elegidos, setElegidos] = useState([]);

  if (!job) return null;
  const equipo = job.equipo_cuadrilla || [];

  if (job.es_cuadrilla) {
    const companeros = equipo.filter(p => !p.es_titular);
    return (
      <div className="rd-panel pct-panel pct-cuadrilla">
        <h3 className="rd-titulo"><HardHat size={16} /> Trabajo de tu contratista</h3>
        {job.contratista && (
          <div className="pct-persona">
            <span className="pct-avatar">{(job.contratista.nombre || 'C').charAt(0).toUpperCase()}</span>
            <div>
              <strong>{job.contratista.nombre}</strong>
              <small>Él cobra y habla con el cliente. Si no puedes ir, avísale a él.</small>
            </div>
            {job.contratista.telefono && (
              <button type="button" className="rd-btn-oscuro" onClick={() => window.open(`tel:${job.contratista.telefono}`)}>
                <Phone size={14} /> Llamar
              </button>
            )}
          </div>
        )}
        {companeros.length > 1 && (
          <p className="pct-nota"><Users size={14} /> Van: {companeros.map(p => p.nombre).join(', ')}</p>
        )}
      </div>
    );
  }

  if (!job.puede_asignar_cuadrilla) {
    // Trabajo ya cerrado del contratista: solo quién fue
    if (equipo.length > 1) {
      return (
        <div className="rd-panel pct-panel">
          <h3 className="rd-titulo"><Users size={16} /> Quién fue</h3>
          <p className="pct-nota">{equipo.map(p => p.nombre).join(', ')}</p>
        </div>
      );
    }
    return null;
  }

  const abrir = async () => {
    setAbierto(true);
    setCargando(true);
    try {
      const { data } = await axios.get(`${API}/mercado-trabajos/${job.id}/cuadrilla`);
      setDatos(data);
      setElegidos(data.equipo || []);
    } catch (e) {
      setAbierto(false);
      mostrarAviso(e.response?.data?.error || 'No se pudo cargar tu cuadrilla.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const alternar = (id) => setElegidos(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const guardar = async () => {
    setGuardando(true);
    try {
      const { data } = await axios.post(`${API}/mercado-trabajos/${job.id}/cuadrilla`, { tecnicos: elegidos });
      mostrarAviso(data?.message || 'Listo: el equipo quedó actualizado.', 'success');
      setAbierto(false);
      onCambio?.();
    } catch (e) {
      mostrarAviso(e.response?.data?.error || e.response?.data?.message || 'No se pudo guardar el equipo.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const yo = datos?.contratista_id;

  return (
    <div className="rd-panel pct-panel">
      <h3 className="rd-titulo"><HardHat size={16} /> ¿Quién va a la casa?</h3>
      <p className="pct-nota">
        {equipo.length > 0 ? equipo.map(p => (p.es_titular ? `${p.nombre} (tú)` : p.nombre)).join(', ') : 'Todavía no eliges quién va.'}
      </p>
      <button type="button" className="rd-btn-oscuro pct-btn-asignar" onClick={abrir}>
        <Users size={15} /> Asignar a mi cuadrilla
      </button>

      {abierto && (
        <div className="pct-fondo" onClick={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div className="pct-modal" role="dialog" aria-modal="true" aria-label="Asignar a mi cuadrilla">
            <div className="pct-modal-cabeza">
              <h3><Users size={18} /> Asignar a mi cuadrilla</h3>
              <button type="button" className="pct-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>

            {cargando || !datos ? (
              <div className="pct-cargando"><Loader2 size={22} className="pct-girar" /> Cargando tu cuadrilla...</div>
            ) : (
              <>
                {datos.scheduled_at && (
                  <p className="pct-visita"><CalendarClock size={15} /> Visita: {fechaCorta(datos.scheduled_at)}</p>
                )}
                <ul className="pct-lista">
                  <li>
                    <label className={`pct-opcion ${elegidos.includes(yo) ? 'elegido' : ''}`}>
                      <input type="checkbox" checked={elegidos.includes(yo)} onChange={() => alternar(yo)} />
                      <div>
                        <strong>Yo voy</strong>
                        {datos.ocupado_contratista?.length > 0 && (
                          <small>Ocupado: {datos.ocupado_contratista.map(fechaCorta).join(' · ')}</small>
                        )}
                      </div>
                    </label>
                  </li>
                  {datos.miembros.map(m => {
                    const choca = m.ocupado.some(f => mismoDia(f, datos.scheduled_at));
                    return (
                      <li key={m.id}>
                        <label className={`pct-opcion ${elegidos.includes(m.id) ? 'elegido' : ''} ${!m.perfil_listo ? 'bloqueado' : ''}`}>
                          <input
                            type="checkbox"
                            checked={elegidos.includes(m.id)}
                            disabled={!m.perfil_listo && !elegidos.includes(m.id)}
                            onChange={() => alternar(m.id)}
                          />
                          <div>
                            <strong>{m.nombre}</strong>
                            {!m.perfil_listo && <small className="pct-alerta">Su perfil profesional aún no está validado</small>}
                            {m.ocupado.length > 0 && (
                              <small className={choca ? 'pct-alerta' : ''}>
                                {choca ? 'Ese día ya está ocupado: ' : 'Ocupado: '}{m.ocupado.map(fechaCorta).join(' · ')}
                              </small>
                            )}
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {datos.miembros.length === 0 && (
                  <p className="pct-nota">Aún no tienes técnicos activos en tu cuadrilla. Agrégalos en &quot;Mi cuadrilla&quot;.</p>
                )}
                <div className="pct-pie">
                  <button type="button" className="pct-btn-sec" onClick={() => setAbierto(false)}>Cancelar</button>
                  <button type="button" className="pct-btn" onClick={guardar} disabled={guardando || elegidos.length === 0}>
                    {guardando ? <Loader2 size={15} className="pct-girar" /> : <Check size={15} />} Guardar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelCuadrillaTrabajo;
