import { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarClock, Pencil, Wrench } from 'lucide-react';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import { nombreEquipo, porFecha, proximaFecha, textoFecha, hoyISO } from './CamposMantenimiento';
import ModalEditarMantenimiento from './ModalEditarMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

// Mantenimientos programados de una propiedad, por fecha. Sin equipos no ocupa lugar en la pantalla.
const MantenimientosDePropiedad = ({ propiedadId }) => {
  const [equipos, setEquipos] = useState([]);
  const [error, setError] = useState(false);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    axios.get(`${API}/properties/${propiedadId}/mantenimiento`, { headers: authHeaders() })
      .then(({ data }) => setEquipos(data || []))
      .catch(() => setError(true));
  }, [propiedadId]);

  if (error) {
    return <section className="xp-card xp-panel mt-seccion-propiedad"><p className="mt-vacio">No se pudieron cargar los mantenimientos programados. Recarga la página para intentarlo de nuevo.</p></section>;
  }
  if (!equipos.length) return null;

  const hoy = hoyISO();

  return (
    <section className="xp-card xp-panel mt-seccion-propiedad">
      <h3 className="xp-panel-titulo"><Wrench size={18} /> Mantenimientos programados ({equipos.length})</h3>
      <ul className="mt-lista">
        {[...equipos].sort(porFecha).map((e) => {
          const proxima = proximaFecha(e);
          const vencida = proxima && proxima < hoy;
          return (
            <li key={e.id} className="mt-item">
              {e.foto_equipo_url && <img src={e.foto_equipo_url} alt="" />}
              <div className="mt-item-texto">
                <strong>{nombreEquipo(e)}</strong>
                {e.detalle && <small>{e.detalle}</small>}
              </div>
              <span className={`mt-item-fecha ${vencida ? 'vencida' : ''} ${proxima ? '' : 'sin-fecha'}`}>
                <CalendarClock size={15} />
                {proxima ? `${vencida ? 'Vencido: ' : ''}${textoFecha(proxima)}` : 'Sin fecha'}
              </span>
              <button type="button" className="mt-btn-editar" onClick={() => setEditando(e)}>
                <Pencil size={15} /> Editar
              </button>
            </li>
          );
        })}
      </ul>

      {editando && (
        <ModalEditarMantenimiento
          equipo={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(actualizado) => setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? { ...e, ...actualizado } : e)))}
        />
      )}
    </section>
  );
};

export default MantenimientosDePropiedad;
