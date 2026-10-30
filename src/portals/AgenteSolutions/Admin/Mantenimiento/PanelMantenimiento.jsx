import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { CalendarClock, Trash2, Wrench } from 'lucide-react';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import { textoFecha } from './cicloMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

// Equipos con mantenimiento de una propiedad. Es independiente del levantamiento.
const PanelMantenimiento = ({ propiedadId }) => {
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(() => {
    setError(false);
    return axios.get(`${API}/properties/${propiedadId}/mantenimiento`, { headers: authHeaders() })
      .then(({ data }) => setEquipos(data || []))
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [propiedadId]);

  useEffect(() => { cargar(); }, [cargar]);

  const darDeBaja = async (equipo) => {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: '¿Quitar del programa?',
      text: `"${equipo.tipo}" dejará de aparecer en el calendario. Las órdenes ya creadas no cambian.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      reverseButtons: true,
    });
    if (!isConfirmed) return;
    try {
      await axios.delete(`${API}/mantenimiento/equipos/${equipo.id}`, { headers: authHeaders() });
      setEquipos((prev) => prev.filter((e) => e.id !== equipo.id));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo quitar', text: err.response?.data?.error || 'Intenta de nuevo.', confirmButtonColor: '#f26522' });
    }
  };

  return (
    <section className="xp-card xp-panel">
      <h3 className="xp-panel-titulo"><Wrench size={18} /> Equipos programados y próximas fechas</h3>

      {cargando ? (
        <p className="mt-panel-vacio">Cargando equipos...</p>
      ) : error ? (
        <p className="mt-panel-vacio">No se pudieron cargar los equipos. Recarga la página para intentarlo de nuevo.</p>
      ) : !equipos.length ? (
        <p className="mt-panel-vacio">Esta propiedad todavía no tiene equipos con mantenimiento programado.</p>
      ) : (
        <ul className="mt-lista">
          {equipos.map((e) => {
            const proxima = e.visits?.[0]?.fecha_programada;
            return (
              <li key={e.id} className="mt-lista-item">
                {e.foto_equipo_url && <img src={e.foto_equipo_url} alt="" />}
                <div className="mt-lista-texto">
                  <strong>{e.cantidad > 1 ? `${e.cantidad} × ${e.tipo}` : e.tipo}</strong>
                  {e.veces_al_ano ? (
                    <span>
                      <CalendarClock size={13} /> {e.veces_al_ano} {e.veces_al_ano === 1 ? 'vez' : 'veces'} al año
                      {proxima && ` · próxima: ${textoFecha(proxima)}`}
                    </span>
                  ) : (
                    <span className="mt-sin-ciclo">Sin ciclo: márcalo arriba para programarlo</span>
                  )}
                  {e.detalle && <small>{e.detalle}</small>}
                </div>
                <button type="button" className="mt-quitar" onClick={() => darDeBaja(e)} aria-label={`Quitar ${e.tipo} del programa`}>
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default PanelMantenimiento;
