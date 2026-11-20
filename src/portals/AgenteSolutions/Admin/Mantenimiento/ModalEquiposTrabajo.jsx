import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { CalendarClock, FileText, History, ImageOff, Layers, MapPin, Wrench, X } from 'lucide-react';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import { textoFecha, tiempoRestante } from './CamposMantenimiento';
import { Cotizacion, ListaHistorial } from './EquiposDelReporte';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Órdenes viejas sin equipos ligados: del levantamiento se toman los de su zona que aparecen en el texto del equipo
const desdeLevantamiento = (survey, zona, equipoTexto) => {
  const zonaN = normalizar(zona);
  const textoN = normalizar(equipoTexto);
  const zonas = [];
  (survey || []).forEach((area) => {
    zonas.push({ nombre: area.name, categorias: area.categories });
    (area.subareas || []).forEach((sub) => zonas.push({ nombre: `${area.name} - ${sub.name}`, categorias: sub.categories }));
  });
  const enZona = zonas.filter((z) => zonaN && (normalizar(z.nombre) === zonaN || normalizar(z.nombre).endsWith(zonaN) || zonaN.endsWith(normalizar(z.nombre))));
  const elementos = enZona.flatMap((z) => Object.values(z.categorias || {}).flat().map((c) => ({
    id: `pc-${c.id}`,
    label: c.sub_category || c.nombre,
    area: z.nombre,
    foto: c.image_path || c.foto,
    levantamiento: {
      categoria: c.category || c.categoria,
      marca: c.brand || c.marca,
      modelo: c.model_or_color || c.modelo,
      serie: c.serial_number,
      estado: c.status || c.estado,
      cantidad: c.quantity || c.cantidad,
      observaciones: c.observations || c.observaciones,
      foto: c.image_path || c.foto,
      foto_secundaria: c.image_path_secondary || c.foto_secundaria,
    },
  })));
  return elementos.filter((e) => e.label && textoN.includes(normalizar(e.label)));
};

const Dato = ({ etiqueta, valor }) => (valor || valor === 0 ? <div><dt>{etiqueta}</dt><dd>{valor}</dd></div> : null);

const TarjetaEquipo = ({ equipo, onVerFoto }) => {
  const l = equipo.levantamiento || {};
  const restante = equipo.proxima_fecha ? tiempoRestante(equipo.proxima_fecha) : null;
  const fotos = [...new Set([equipo.foto, l.foto, l.foto_secundaria, equipo.foto_datos].filter(Boolean))];
  const estado = equipo.estado === 'aceptado' ? 'Contratado' : equipo.estado === 'no_aceptado' ? 'No contratado' : null;
  const conDatosDeMantenimiento = 'historial' in equipo;

  return (
    <article className="mt-et-equipo">
      <header className="mt-et-cabecera">
        {fotos[0] ? (
          <button type="button" className="mt-et-foto" onClick={() => onVerFoto?.(fotos[0])} aria-label={`Ver foto de ${equipo.label}`}>
            <img src={fotos[0]} alt="" loading="lazy" />
          </button>
        ) : (
          <span className="mt-et-foto sin-foto" aria-hidden="true"><ImageOff size={22} /></span>
        )}
        <div className="mt-et-titulo">
          <h3>{equipo.label}</h3>
          {equipo.area && <small><MapPin size={12} /> {equipo.area}</small>}
          {equipo.detalle && <small>{equipo.detalle}</small>}
          {conDatosDeMantenimiento && (restante ? (
            <span className={`mt-restante ${restante.tono}`}><CalendarClock size={14} /> {restante.texto}<em>{textoFecha(equipo.proxima_fecha)}</em></span>
          ) : (
            <span className="mt-restante sin-fecha"><CalendarClock size={14} /> Sin fecha de mantenimiento</span>
          ))}
        </div>
        {estado && <span className={`mt-carrito-cot-estado ${equipo.estado === 'aceptado' ? 'si' : 'no'}`}>{estado}</span>}
      </header>

      {Object.values(l).some(Boolean) && (
        <dl className="mt-ficha-datos mt-et-datos">
          <Dato etiqueta="Categoría" valor={l.categoria} />
          <Dato etiqueta="Marca" valor={l.marca} />
          <Dato etiqueta="Modelo / color" valor={l.modelo} />
          <Dato etiqueta="No. de serie" valor={l.serie} />
          <Dato etiqueta="Estado" valor={l.estado} />
          <Dato etiqueta="Cantidad" valor={l.cantidad} />
          {l.observaciones && <div className="ancho"><dt>Observaciones</dt><dd>{l.observaciones}</dd></div>}
        </dl>
      )}

      {fotos.length > 1 && (
        <div className="mt-et-galeria">
          {fotos.slice(1).map((f) => (
            <button key={f} type="button" onClick={() => onVerFoto?.(f)} aria-label="Ver foto">
              <img src={f} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {conDatosDeMantenimiento && (
        <>
          <section className="mt-ficha-seccion">
            <h4><FileText size={14} /> Cotización</h4>
            {equipo.cotizacion
              ? <Cotizacion cotizacion={equipo.cotizacion} />
              : <p className="mt-rep-nota">El técnico aún no cotiza este equipo.</p>}
          </section>
          <section className="mt-ficha-seccion mt-rep-historial">
            <h4><History size={14} /> Historial del equipo</h4>
            <ListaHistorial historial={equipo.historial} realizados={equipo.mantenimientos_realizados} />
          </section>
        </>
      )}
    </article>
  );
};

// Equipos con los que se está trabajando en una orden (solo lectura): sus datos del levantamiento,
// su próxima fecha, su cotización y su historial. Reemplaza al inventario completo de la propiedad.
const ModalEquiposTrabajo = ({ ordenId, propiedadId, zona, equipoTexto, direccion, onClose }) => {
  const [equipos, setEquipos] = useState(null);
  // Visor propio: este modal va encima del de la orden y el visor de la página quedaría detrás
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState(false);
  const cerrarRef = useRef(null);

  useEffect(() => {
    let vigente = true;
    const headers = authHeaders();
    const cargar = async () => {
      try {
        let lista = [];
        if (/^\d+$/.test(String(ordenId))) {
          const { data } = await axios.get(`${API}/work-orders/${ordenId}/elementos`, { headers });
          lista = Array.isArray(data) ? data : [];
        }
        if (!lista.length && propiedadId) {
          const { data } = await axios.get(`${API}/propiedades/${propiedadId}/survey`, { headers });
          lista = desdeLevantamiento(data, zona, equipoTexto);
        }
        if (vigente) setEquipos(lista);
      } catch {
        if (vigente) setError(true);
      }
    };
    cargar();
    return () => { vigente = false; };
  }, [ordenId, propiedadId, zona, equipoTexto]);

  useEffect(() => {
    cerrarRef.current?.focus();
    const alTeclear = (e) => {
      if (e.key !== 'Escape') return;
      setFoto((actual) => {
        if (!actual) onClose();
        return null;
      });
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onClose]);

  return createPortal(
    <div className="mt-ficha-fondo mt-et-fondo" onClick={onClose}>
      <div className="mt-et" role="dialog" aria-modal="true" aria-labelledby="mt-et-titulo" onClick={(e) => e.stopPropagation()}>
        <header className="mt-et-head">
          <span className="mt-et-head-icono"><Layers size={20} /></span>
          <div>
            <h2 id="mt-et-titulo">Equipos del trabajo</h2>
            {direccion && <p><MapPin size={13} /> {direccion}</p>}
          </div>
          <button type="button" ref={cerrarRef} className="mt-et-cerrar" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>

        <div className="mt-et-cuerpo">
          {error ? (
            <p className="mt-vacio">No se pudieron cargar los equipos de este trabajo.</p>
          ) : !equipos ? (
            <p className="mt-vacio">Cargando equipos...</p>
          ) : !equipos.length ? (
            <div className="mt-et-vacio">
              <Wrench size={26} />
              <p>Este trabajo no tiene equipos ligados al levantamiento.</p>
              {(zona || equipoTexto) && <small>{[zona, equipoTexto].filter(Boolean).join(' · ')}</small>}
            </div>
          ) : (
            equipos.map((e) => <TarjetaEquipo key={e.id} equipo={e} onVerFoto={setFoto} />)
          )}
        </div>
      </div>
      {foto && (
        <div className="mt-et-visor" onClick={(e) => { e.stopPropagation(); setFoto(null); }}>
          <img src={foto} alt="Foto del equipo" />
          <button type="button" className="mt-et-cerrar" aria-label="Cerrar foto"><X size={18} /></button>
        </div>
      )}
    </div>,
    document.body,
  );
};

export default ModalEquiposTrabajo;
