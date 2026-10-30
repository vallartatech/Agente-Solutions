import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarClock, CheckCircle2, MapPin, ShoppingCart, Wrench } from 'lucide-react';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import { nombreEquipo, proximaFecha, textoFecha, tiempoRestante } from './CamposMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

// Equipos de la propiedad para una solicitud de mantenimiento: lo agendado (con su cuenta regresiva)
// y lo del levantamiento. Se eligen como en un carrito; `carrito` son los renglones elegidos.
const PanelEquiposSolicitud = ({ propiedad, carrito, onChange }) => {
  const [equipos, setEquipos] = useState([]);
  const [elementos, setElementos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const headers = authHeaders();
    Promise.all([
      axios.get(`${API}/properties/${propiedad.id}/mantenimiento`, { headers }),
      axios.get(`${API}/properties/${propiedad.id}/elementos`, { headers }),
    ])
      .then(([resEquipos, resElementos]) => {
        setEquipos(resEquipos.data || []);
        setElementos(resElementos.data || []);
      })
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [propiedad.id]);

  // Primero lo que vence antes; lo que no tiene fecha, al final
  const renglones = useMemo(() => [
    ...equipos.map((e) => ({
      clave: `equipo-${e.id}`,
      tipo: 'equipo',
      id: e.id,
      label: nombreEquipo(e),
      lugar: e.detalle || null,
      foto: e.foto_equipo_url,
      fecha: proximaFecha(e),
    })),
    ...elementos.map((c) => ({
      clave: `elemento-${c.id}`,
      tipo: 'elemento',
      id: c.id,
      label: c.label,
      lugar: c.area,
      area: c.area,
      foto: null,
      fecha: null,
    })),
  ].sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999')), [equipos, elementos]);

  const alternar = (renglon) => onChange(
    carrito.some((r) => r.clave === renglon.clave)
      ? carrito.filter((r) => r.clave !== renglon.clave)
      : [...carrito, renglon]
  );

  const direccion = propiedad.address || propiedad.direccion || 'Sin dirección registrada';

  return (
    <aside className="rp-modal mt-panel-equipos" onClick={(e) => e.stopPropagation()} aria-label="Equipos de la propiedad">
      <div className="mt-panel-equipos-cabecera">
        <h3><Wrench size={17} /> Equipos de la propiedad</h3>
        <p><MapPin size={14} /> {direccion}</p>
      </div>

      <div className="mt-panel-equipos-lista">
        {cargando ? (
          <p className="mt-vacio">Cargando equipos...</p>
        ) : error ? (
          <p className="mt-vacio">No se pudieron cargar los equipos. Cierra y vuelve a abrir la solicitud.</p>
        ) : !renglones.length ? (
          <p className="mt-vacio">Esta propiedad no tiene equipos registrados. Puedes describir el trabajo en el formulario.</p>
        ) : renglones.map((r) => {
          const on = carrito.some((c) => c.clave === r.clave);
          const restante = r.fecha ? tiempoRestante(r.fecha) : null;
          return (
            <button key={r.clave} type="button" className={`mt-renglon ${on ? 'on' : ''}`} onClick={() => alternar(r)} aria-pressed={on}>
              <span className="mt-casilla">{on && <CheckCircle2 size={18} />}</span>
              {r.foto && <img src={r.foto} alt="" />}
              <span className="mt-renglon-texto">
                <strong>{r.label}</strong>
                {r.lugar && <small>{r.lugar}</small>}
                {restante ? (
                  <span className={`mt-restante ${restante.tono}`}>
                    <CalendarClock size={14} /> {restante.texto}
                    <em>{textoFecha(r.fecha)}</em>
                  </span>
                ) : (
                  <span className="mt-restante sin-fecha">Sin fecha agendada</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className={`mt-carrito ${carrito.length ? 'con-items' : ''}`}>
        <ShoppingCart size={16} />
        {carrito.length
          ? `${carrito.length} ${carrito.length === 1 ? 'equipo elegido: se piden las 4 evidencias normales' : 'equipos elegidos: antes y después de cada uno'}`
          : 'Elige los equipos para este servicio'}
      </p>
    </aside>
  );
};

export default PanelEquiposSolicitud;
