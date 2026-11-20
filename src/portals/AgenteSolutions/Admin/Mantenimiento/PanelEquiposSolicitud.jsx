import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarClock, CheckCircle2, ChevronLeft, ImageOff, MapPin, ShoppingCart, Wrench } from 'lucide-react';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import { nombreEquipo, proximaFecha, textoFecha, tiempoRestante } from './CamposMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const SIN_AREA = 'Sin área';

// Equipos de la propiedad para una solicitud de mantenimiento, agrupados por área, con su foto
// y la fecha en que les toca mantenimiento (o "Sin fecha"). Se eligen como en un carrito;
// `carrito` son los renglones elegidos.
// En responsivo es un panel lateral que se abre con la flecha (`abierto`, `onCerrar`).
const PanelEquiposSolicitud = ({ propiedad, carrito, onChange, abierto = false, onCerrar, ocultos = [] }) => {
  const [equipos, setEquipos] = useState([]);
  const [elementos, setElementos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const headers = authHeaders();
    // Cada lista por su lado: si una falla, la otra se sigue pudiendo elegir
    Promise.allSettled([
      axios.get(`${API}/properties/${propiedad.id}/mantenimiento`, { headers }),
      axios.get(`${API}/properties/${propiedad.id}/elementos`, { headers }),
    ])
      .then(([resEquipos, resElementos]) => {
        if (resEquipos.status === 'fulfilled') setEquipos(resEquipos.value.data || []);
        if (resElementos.status === 'fulfilled') setElementos(resElementos.value.data || []);
        setError(resEquipos.status === 'rejected' || resElementos.status === 'rejected');
      })
      .finally(() => setCargando(false));
  }, [propiedad.id]);

  // Equipos en mantenimiento primero (con su fecha); luego los del levantamiento que aún no están en mantenimiento.
  // Un equipo en mantenimiento que viene del levantamiento toma el área y la foto de ese elemento.
  const renglones = useMemo(() => {
    const porComponente = new Map(elementos.map((c) => [String(c.id), c]));
    const yaEnMantenimiento = new Set(equipos.map((e) => String(e.property_component_id || '')).filter(Boolean));
    return [
      ...equipos.map((e) => {
        const origen = porComponente.get(String(e.property_component_id || ''));
        return {
          clave: `equipo-${e.id}`,
          tipo: 'equipo',
          id: e.id,
          label: nombreEquipo(e),
          detalle: e.detalle || null,
          area: origen?.area || SIN_AREA,
          foto: e.foto_equipo_url || origen?.image_path || null,
          fecha: proximaFecha(e),
        };
      }),
      ...elementos
        .filter((c) => !yaEnMantenimiento.has(String(c.id)))
        .map((c) => ({
          clave: `elemento-${c.id}`,
          tipo: 'elemento',
          id: c.id,
          label: c.label,
          detalle: [c.brand, c.model_or_color].filter(Boolean).join(' · ') || null,
          area: c.area || SIN_AREA,
          foto: c.image_path || null,
          fecha: null,
        })),
    ];
  }, [equipos, elementos]);

  // Los que ya van en otro trabajo del lote no se ofrecen de nuevo
  const disponibles = renglones.filter((r) => !ocultos.includes(r.clave));

  // Por área (alfabético, "Sin área" al final); dentro, primero lo que vence antes y lo sin fecha al final
  const areas = useMemo(() => {
    const grupos = new Map();
    disponibles.forEach((r) => {
      if (!grupos.has(r.area)) grupos.set(r.area, []);
      grupos.get(r.area).push(r);
    });
    return [...grupos.entries()]
      .sort(([a], [b]) => (a === SIN_AREA) - (b === SIN_AREA) || a.localeCompare(b, 'es'))
      .map(([area, lista]) => [area, lista.sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'))]);
  }, [disponibles]);

  const alternar = (renglon) => onChange(
    carrito.some((r) => r.clave === renglon.clave)
      ? carrito.filter((r) => r.clave !== renglon.clave)
      : [...carrito, renglon]
  );

  const direccion = propiedad.address || propiedad.direccion || 'Sin dirección registrada';

  return (
    <aside className={`rp-modal mt-panel-equipos ${abierto ? 'abierto' : ''}`} onClick={(e) => e.stopPropagation()} aria-label="Equipos de la propiedad">
      <div className="mt-panel-equipos-cabecera">
        <h3>
          <Wrench size={17} /> Equipos de la propiedad
          <button type="button" className="mt-panel-cerrar" onClick={onCerrar} aria-label="Cerrar lista de equipos">
            <ChevronLeft size={20} />
          </button>
        </h3>
        <p><MapPin size={14} /> {direccion}</p>
      </div>

      <div className="mt-panel-equipos-lista">
        {cargando ? (
          <p className="mt-vacio">Cargando equipos...</p>
        ) : error && !disponibles.length ? (
          <p className="mt-vacio">No se pudieron cargar los equipos. Cierra y vuelve a abrir la solicitud.</p>
        ) : !disponibles.length ? (
          <p className="mt-vacio">{renglones.length ? 'Todos los equipos ya van en otro trabajo de este lote.' : 'Esta propiedad no tiene equipos registrados. Puedes describir el trabajo en el formulario.'}</p>
        ) : areas.map(([area, lista]) => (
          <section key={area} className="mt-area-grupo">
            <h4 className="mt-area-titulo"><MapPin size={13} /> {area} <span>{lista.length}</span></h4>
            {lista.map((r) => {
              const on = carrito.some((c) => c.clave === r.clave);
              const restante = r.fecha ? tiempoRestante(r.fecha) : null;
              return (
                <button key={r.clave} type="button" className={`mt-renglon ${on ? 'on' : ''}`} onClick={() => alternar(r)} aria-pressed={on}>
                  <span className="mt-casilla">{on && <CheckCircle2 size={18} />}</span>
                  {r.foto
                    ? <img src={r.foto} alt="" loading="lazy" />
                    : <span className="mt-renglon-sinfoto" aria-hidden="true"><ImageOff size={18} /></span>}
                  <span className="mt-renglon-texto">
                    <strong>{r.label}</strong>
                    {r.detalle && <small>{r.detalle}</small>}
                    {restante ? (
                      <span className={`mt-restante ${restante.tono}`}>
                        <CalendarClock size={14} /> {restante.texto}
                        <em>{textoFecha(r.fecha)}</em>
                      </span>
                    ) : (
                      <span className="mt-restante sin-fecha"><CalendarClock size={14} /> Sin fecha</span>
                    )}
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>

      {error && disponibles.length > 0 && <p className="mt-aviso-parcial">Algunos equipos no se pudieron cargar. Cierra y vuelve a abrir la solicitud.</p>}

      <p className={`mt-carrito ${carrito.length ? 'con-items' : ''}`}>
        <ShoppingCart size={16} />
        {carrito.length
          ? `${carrito.length} ${carrito.length === 1 ? 'equipo elegido: se piden las 4 evidencias normales' : 'equipos elegidos: antes y después de cada uno'}`
          : 'Elige los equipos para este mantenimiento'}
      </p>
    </aside>
  );
};

export default PanelEquiposSolicitud;
