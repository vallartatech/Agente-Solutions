import { CalendarClock, ImageOff, MapPin, Wrench } from 'lucide-react';
import { textoFecha, tiempoRestante } from './CamposMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

// Equipos elegidos en una solicitud: varios trabajos dentro de una misma orden.
// Cada uno con su foto, su área y la fecha en que le toca mantenimiento.
const EquiposDelTrabajo = ({ equipos }) => (
  <>
    <h4 className="xp-subtitulo mt-equipos-trabajo-titulo">
      <Wrench size={14} /> Equipos de esta solicitud <span>{equipos.length}</span>
    </h4>
    <ul className="mt-equipos-trabajo">
      {equipos.map((e) => {
        const restante = e.proxima_fecha ? tiempoRestante(e.proxima_fecha) : null;
        return (
          <li key={e.id} className="mt-equipo-trabajo">
            {e.foto
              ? <img src={e.foto} alt="" loading="lazy" />
              : <span className="mt-renglon-sinfoto" aria-hidden="true"><ImageOff size={18} /></span>}
            <span className="mt-renglon-texto">
              <strong>{e.label}</strong>
              {e.area && <small><MapPin size={12} /> {e.area}</small>}
              {e.detalle && <small>{e.detalle}</small>}
              {restante ? (
                <span className={`mt-restante ${restante.tono}`}>
                  <CalendarClock size={14} /> {restante.texto}
                  <em>{textoFecha(e.proxima_fecha)}</em>
                </span>
              ) : (
                <span className="mt-restante sin-fecha"><CalendarClock size={14} /> Sin fecha</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  </>
);

export default EquiposDelTrabajo;
