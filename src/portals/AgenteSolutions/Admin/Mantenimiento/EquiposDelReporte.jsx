import { CalendarCheck, ExternalLink, FileText, History, ImageOff, MapPin } from 'lucide-react';
import { dinero, fechaHora } from '../Expediente/flujoTrabajo';
import { textoFecha } from './CamposMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

// Renglones de la cotización (manual): servicios y materiales
const partidas = (concept) => {
  let c = concept;
  if (typeof c === 'string') {
    try { c = JSON.parse(c); } catch { return []; }
  }
  if (Array.isArray(c)) return c;
  return [...(c?.servicios || c?.conceptos || []), ...(c?.materiales || [])];
};

export const Cotizacion = ({ cotizacion }) => {
  const filas = partidas(cotizacion.concept).filter((p) => p.descripcion || p.desc || p.concepto);
  return (
    <details className="mt-rep-cot">
      <summary>
        <FileText size={14} /> Ver cotización · <strong>{dinero(cotizacion.total) || '$0.00'}</strong> · {cotizacion.status || 'Pendiente'}
      </summary>
      {filas.length > 0 && (
        <ul>
          {filas.map((p, i) => (
            <li key={i}>
              <span>{Number(p.cantidad || p.cant || 1)} × {p.descripcion || p.desc || p.concepto}</span>
              <strong>{dinero((Number(p.cantidad || p.cant || 1)) * Number(p.precio || 0)) || '$0.00'}</strong>
            </li>
          ))}
        </ul>
      )}
      {cotizacion.file_path && (
        <a href={cotizacion.file_path} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Abrir archivo de la cotización</a>
      )}
    </details>
  );
};

// Reporte de una orden con varios equipos: cada equipo con su información, si se contrató,
// su cotización (también la de los no contratados, como evidencia) y su historial.
const EquiposDelReporte = ({ elementos }) => (
  <div className="mt-rep-equipos">
    {elementos.map((el) => {
      const noContratado = el.estado === 'no_aceptado';
      const historial = el.historial || [];
      const realizados = el.mantenimientos_realizados || [];
      return (
        <article key={el.id} className={`mt-rep-equipo ${noContratado ? 'no-contratado' : ''}`}>
          <header>
            {el.foto
              ? <img src={el.foto} alt="" />
              : <span className="mt-renglon-sinfoto" aria-hidden="true"><ImageOff size={18} /></span>}
            <div className="mt-renglon-texto">
              <strong>{el.label}</strong>
              {el.area && <small><MapPin size={12} /> {el.area}</small>}
              {el.detalle && <small>{el.detalle}</small>}
            </div>
            {/* Antes de finalizar el carrito todavía no se sabe si se contrata */}
            {['aceptado', 'no_aceptado'].includes(el.estado) && (
              <span className={`mt-carrito-cot-estado ${noContratado ? 'no' : 'si'}`}>
                {noContratado ? 'No contratado' : 'Contratado'}
              </span>
            )}
          </header>

          {el.cotizacion
            ? <Cotizacion cotizacion={el.cotizacion} />
            : <p className="mt-rep-nota">Sin cotización registrada.</p>}

          <div className="mt-rep-historial">
            <h5><History size={13} /> Historial del equipo</h5>
            {historial.length || realizados.length ? (
              <ul>
                {realizados.map((v, i) => (
                  <li key={`m-${i}`}><CalendarCheck size={13} /> Mantenimiento realizado · {textoFecha(v.fecha)}</li>
                ))}
                {historial.map((o) => (
                  <li key={`o-${o.work_order_id}`}>
                    <FileText size={13} /> {o.tipo || 'Trabajo'} #{o.work_order_id} · {fechaHora(o.fecha)} · {o.status}
                    {!o.contratado && ' (no contratado)'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-rep-nota">Este es el primer servicio registrado de este equipo.</p>
            )}
          </div>
        </article>
      );
    })}
  </div>
);

export default EquiposDelReporte;
