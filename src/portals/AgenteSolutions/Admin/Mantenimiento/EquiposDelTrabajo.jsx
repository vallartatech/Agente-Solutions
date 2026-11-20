import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarCheck, CalendarClock, ChevronRight, FileText, History, ImageOff, MapPin, Wrench, X } from 'lucide-react';
import { textoFecha, tiempoRestante } from './CamposMantenimiento';
import { fechaHora } from '../Expediente/flujoTrabajo';
import { Cotizacion } from './EquiposDelReporte';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const Fecha = ({ fecha }) => {
  const restante = fecha ? tiempoRestante(fecha) : null;
  return restante ? (
    <span className={`mt-restante ${restante.tono}`}>
      <CalendarClock size={14} /> {restante.texto}
      <em>{textoFecha(fecha)}</em>
    </span>
  ) : (
    <span className="mt-restante sin-fecha"><CalendarClock size={14} /> Sin fecha</span>
  );
};

// Ficha de un equipo: foto grande, datos, próxima fecha, su cotización e historial
const FichaEquipo = ({ equipo, onCerrar }) => {
  const cerrarRef = useRef(null);

  useEffect(() => {
    cerrarRef.current?.focus();
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  const historial = equipo.historial || [];
  const realizados = equipo.mantenimientos_realizados || [];
  const estado = equipo.estado === 'aceptado' ? 'Contratado' : equipo.estado === 'no_aceptado' ? 'No contratado' : null;

  return createPortal(
    <div className="mt-ficha-fondo" onClick={onCerrar}>
      <div className="mt-ficha" role="dialog" aria-modal="true" aria-labelledby="mt-ficha-titulo" onClick={(e) => e.stopPropagation()}>
        <button type="button" ref={cerrarRef} className="mt-ficha-cerrar" onClick={onCerrar} aria-label="Cerrar">
          <X size={18} />
        </button>

        {equipo.foto
          ? <img className="mt-ficha-foto" src={equipo.foto} alt={equipo.label} />
          : <div className="mt-ficha-foto sin-foto" aria-hidden="true"><ImageOff size={34} /><span>Sin foto</span></div>}

        <div className="mt-ficha-cuerpo">
          <div className="mt-ficha-encabezado">
            <h3 id="mt-ficha-titulo"><Wrench size={17} /> {equipo.label}</h3>
            {estado && <span className={`mt-carrito-cot-estado ${equipo.estado === 'aceptado' ? 'si' : 'no'}`}>{estado}</span>}
          </div>

          <dl className="mt-ficha-datos">
            <div><dt>Área</dt><dd>{equipo.area || 'Sin área'}</dd></div>
            <div><dt>Próximo mantenimiento</dt><dd><Fecha fecha={equipo.proxima_fecha} /></dd></div>
            {equipo.detalle && <div className="ancho"><dt>Detalle</dt><dd>{equipo.detalle}</dd></div>}
          </dl>

          <section className="mt-ficha-seccion">
            <h4><FileText size={14} /> Cotización</h4>
            {equipo.cotizacion
              ? <Cotizacion cotizacion={equipo.cotizacion} />
              : <p className="mt-rep-nota">El técnico aún no cotiza este equipo.</p>}
          </section>

          <section className="mt-ficha-seccion mt-rep-historial">
            <h4><History size={14} /> Historial del equipo</h4>
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
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// Equipos elegidos en una solicitud: varios trabajos dentro de una misma orden.
// Al tocar uno se abre su ficha con todo su detalle.
const EquiposDelTrabajo = ({ equipos }) => {
  const [abierto, setAbierto] = useState(null);
  const cerrar = useCallback(() => setAbierto(null), []);

  return (
    <>
      <h4 className="xp-subtitulo mt-equipos-trabajo-titulo">
        <Wrench size={14} /> Equipos de esta solicitud <span>{equipos.length}</span>
      </h4>
      <ul className="mt-equipos-trabajo">
        {equipos.map((e) => (
          <li key={e.id}>
            <button type="button" className="mt-equipo-trabajo" onClick={() => setAbierto(e)} aria-label={`Ver detalle de ${e.label}`}>
              {e.foto
                ? <img src={e.foto} alt="" loading="lazy" />
                : <span className="mt-renglon-sinfoto" aria-hidden="true"><ImageOff size={18} /></span>}
              <span className="mt-renglon-texto">
                <strong>{e.label}</strong>
                {e.area && <small><MapPin size={12} /> {e.area}</small>}
                {e.detalle && <small>{e.detalle}</small>}
                <Fecha fecha={e.proxima_fecha} />
              </span>
              <ChevronRight size={18} className="mt-equipo-trabajo-flecha" />
            </button>
          </li>
        ))}
      </ul>
      {abierto && <FichaEquipo equipo={abierto} onCerrar={cerrar} />}
    </>
  );
};

export default EquiposDelTrabajo;
