import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarClock, Pencil, Search, Wrench } from 'lucide-react';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import { nombreEquipo, porFecha, proximaFecha, textoFecha, hoyISO } from './CamposMantenimiento';
import ModalEditarMantenimiento from './ModalEditarMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Mantenimientos programados de una propiedad, por fecha, con buscador y scroll propio.
const MantenimientosDePropiedad = ({ propiedadId }) => {
  const [equipos, setEquipos] = useState([]);
  const [error, setError] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    axios.get(`${API}/properties/${propiedadId}/mantenimiento`, { headers: authHeaders() })
      .then(({ data }) => setEquipos(data || []))
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [propiedadId]);

  const lista = useMemo(() => {
    const texto = normalizar(busqueda);
    return equipos
      .filter((e) => !texto || normalizar(`${e.tipo} ${e.detalle}`).includes(texto))
      .sort(porFecha);
  }, [equipos, busqueda]);

  const hoy = hoyISO();

  return (
    <section className="xp-card xp-panel mt-columna">
      <h3 className="xp-panel-titulo"><Wrench size={18} /> Equipos en mantenimiento ({equipos.length})</h3>
      {equipos.length > 0 && (
        <label className="mt-buscador mt-buscador-columna">
          <Search size={16} />
          <input type="search" placeholder="Buscar equipo..." aria-label="Buscar equipo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
      )}
      <div className="mt-columna-scroll">
      {cargando ? (
        <p className="mt-vacio">Cargando equipos...</p>
      ) : error ? (
        <p className="mt-vacio">No se pudieron cargar los equipos. Recarga la página para intentarlo de nuevo.</p>
      ) : !equipos.length ? (
        <p className="mt-vacio">Esta propiedad no tiene equipos en mantenimiento.</p>
      ) : !lista.length ? (
        <p className="mt-vacio">Ningún equipo coincide con la búsqueda.</p>
      ) : (
      <ul className="mt-lista">
        {lista.map((e) => {
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
      )}
      </div>

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
