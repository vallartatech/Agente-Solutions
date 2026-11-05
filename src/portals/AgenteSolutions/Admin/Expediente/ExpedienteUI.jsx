import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Check, X, CalendarClock, UserRound, ImageOff, FileText, ChevronRight, ChevronLeft, ChevronDown, Download, Hammer, ClipboardList,
  HardHat, RefreshCw, CornerDownRight, Folder, FolderOpen,
} from 'lucide-react';
import {
  calcularFlujo, etiquetaEstado, etiquetaTipo, fechaHora, dinero, totalCotizacion, nombreTecnicos,
  esActivo, origenCotizacion, cadenasCotizaciones, nombreCotizacion,
} from './flujoTrabajo';
import { esVideoUrl } from '../../../../utils/evidencia';

export const Chip = ({ tono = 'slate', children }) => <span className={`xp-chip ${tono}`}>{children}</span>;

// Barra de progreso por pasos, basada en el flujo real del trabajo
export const FlujoBarra = ({ trabajo, compacta = false }) => {
  const { pasos, hechos, total } = calcularFlujo(trabajo);

  if (compacta) {
    return (
      <div className="xp-flujo-mini" title={`${hechos} de ${total} pasos`}>
        {pasos.map((p) => <span key={p.key} className={`seg ${p.estado}`} />)}
      </div>
    );
  }

  return (
    <ol className="xp-flujo">
      {pasos.map((p, i) => (
        <li key={p.key} className={`xp-paso ${p.estado}`}>
          <span className="xp-paso-punto">
            {p.estado === 'hecho' ? <Check size={14} strokeWidth={3} /> : p.estado === 'error' ? <X size={14} strokeWidth={3} /> : i + 1}
          </span>
          <span className="xp-paso-label">{p.label}</span>
          {p.detalle && <span className="xp-paso-detalle">{p.detalle}</span>}
        </li>
      ))}
    </ol>
  );
};

export const TrabajoCard = ({ trabajo, onClick }) => {
  const estado = etiquetaEstado(trabajo);
  const foto = trabajo.fotos?.[0];
  const IconoTipo = trabajo.kind === 'levantamiento' ? ClipboardList : Hammer;

  return (
    <button type="button" className="xp-card xp-trabajo-card" onClick={onClick}>
      <div className="xp-trabajo-foto">
        {foto ? <img src={foto} alt="" loading="lazy" /> : <span className="xp-trabajo-sinfoto"><ImageOff size={26} /></span>}
        <span className="xp-trabajo-tipo"><IconoTipo size={13} /> {etiquetaTipo(trabajo.kind)}</span>
      </div>
      <div className="xp-trabajo-cuerpo">
        <Chip tono={estado.tono}>{estado.texto}</Chip>
        <h4>{trabajo.titulo || 'Sin título'}</h4>
        {trabajo.descripcion && <p className="xp-trabajo-desc">{trabajo.descripcion}</p>}
        <div className="xp-trabajo-meta">
          <span><CalendarClock size={14} /> {fechaHora(trabajo.created_at) || 'Sin fecha'}</span>
          <span><UserRound size={14} /> {nombreTecnicos(trabajo)}</span>
        </div>
        <FlujoBarra trabajo={trabajo} compacta />
      </div>
      <ChevronRight size={18} className="xp-trabajo-flecha" />
    </button>
  );
};

const tonoCotizacion = (c) => {
  const s = String(c.status || '').toLowerCase();
  if (['pagado', 'aceptada', 'aprobado', 'aprobada'].includes(s)) return 'green';
  if (s.includes('rechaz')) return 'red';
  return 'amber';
};

export const ListaCotizaciones = ({ cotizaciones, onAbrir, vacio = 'No hay cotizaciones.' }) => {
  if (!cotizaciones.length) return <p className="xp-vacio">{vacio}</p>;
  return (
    <div className="xp-lista">
      {cadenasCotizaciones(cotizaciones).map(({ cotizacion: c, nivel }) => {
        const origen = origenCotizacion(c, cotizaciones);
        const monto = dinero(totalCotizacion(c));
        return (
          <button
            type="button"
            key={c.id}
            className={`xp-fila xp-cot-fila ${nivel ? 'derivada' : ''}`}
            style={nivel ? { '--xp-nivel': Math.min(nivel, 3) } : undefined}
            onClick={() => onAbrir?.(c)}
          >
            {nivel > 0 && <CornerDownRight size={16} className="xp-cot-rama" aria-hidden="true" />}
            <span className={`xp-fila-icono xp-cot-icono ${origen.key}`}>
              {origen.key === 'tecnico' ? <HardHat size={18} /> : origen.key === 'recotizacion' ? <RefreshCw size={18} /> : <FileText size={18} />}
            </span>
            <span className="xp-fila-texto">
              <strong>{nombreCotizacion(c)}</strong>
              <span className="xp-cot-meta">
                <Chip tono={origen.tono}>{origen.texto}</Chip>
                <small>
                  {[origen.padre && `Basada en la ${nombreCotizacion(origen.padre).toLowerCase()}`, fechaHora(c.created_at)].filter(Boolean).join(' · ')}
                </small>
              </span>
            </span>
            <span className="xp-fila-fin">
              {monto && <strong>{monto}</strong>}
              <Chip tono={tonoCotizacion(c)}>{c.status || 'Pendiente'}</Chip>
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Fecha de la cotización más reciente de un trabajo (para ordenar las carpetas)
const ultimaCotizacion = (t) =>
  Math.max(0, ...(t.cotizaciones || []).map((c) => new Date(String(c.created_at || '').replace(' ', 'T')).getTime() || 0));

// Cotizaciones de la propiedad agrupadas en una carpeta por trabajo
export const CarpetasCotizaciones = ({ trabajos, onAbrir, onVerTrabajo, vacio = 'No hay cotizaciones.' }) => {
  const conCotizaciones = trabajos
    .filter((t) => (t.cotizaciones || []).length)
    .sort((a, b) => ultimaCotizacion(b) - ultimaCotizacion(a));
  // Pocas carpetas: todas abiertas. Muchas: solo las de trabajos en curso
  const [abiertas, setAbiertas] = useState(() => new Set(
    conCotizaciones.filter((t, i) => conCotizaciones.length <= 3 || esActivo(t) || i === 0).map((t) => t.uid)
  ));

  if (!conCotizaciones.length) return <p className="xp-vacio">{vacio}</p>;

  const alternar = (uid) => setAbiertas((prev) => {
    const sig = new Set(prev);
    if (sig.has(uid)) sig.delete(uid); else sig.add(uid);
    return sig;
  });

  return (
    <div className="xp-carpetas">
      {conCotizaciones.map((t) => {
        const abierta = abiertas.has(t.uid);
        const estado = etiquetaEstado(t);
        const n = t.cotizaciones.length;
        return (
          <div key={t.uid} className={`xp-carpeta ${abierta ? 'abierta' : ''}`}>
            <div className="xp-carpeta-head">
              <button type="button" className="xp-carpeta-toggle" onClick={() => alternar(t.uid)} aria-expanded={abierta}>
                <span className="xp-carpeta-icono">{abierta ? <FolderOpen size={20} /> : <Folder size={20} />}</span>
                <span className="xp-carpeta-texto">
                  <strong>{t.titulo}</strong>
                  <span className="xp-chips">
                    <Chip tono="slate">{etiquetaTipo(t.kind)}</Chip>
                    <Chip tono={estado.tono}>{estado.texto}</Chip>
                    <small>{n} {n === 1 ? 'cotización' : 'cotizaciones'}</small>
                  </span>
                </span>
                <ChevronDown size={18} className="xp-carpeta-flecha" />
              </button>
              {onVerTrabajo && (
                <button type="button" className="xp-carpeta-ir" onClick={() => onVerTrabajo(t)}>
                  Ver trabajo <ChevronRight size={15} />
                </button>
              )}
            </div>
            {abierta && (
              <div className="xp-carpeta-cuerpo">
                <ListaCotizaciones cotizaciones={t.cotizaciones} onAbrir={(c) => onAbrir?.(c, t)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Agrupa los eventos por fecha: Hoy, Ayer y después por mes ("Noviembre 2026")
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const grupoFecha = (fecha) => {
  const d = new Date(String(fecha || '').replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return { key: 'sin-fecha', titulo: 'Sin fecha' };
  const dia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const hoy = new Date();
  const diff = Math.round((dia(hoy) - dia(d)) / 86400000);
  const corta = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  if (diff === 0) return { key: 'hoy', titulo: 'Hoy', sub: corta };
  if (diff === 1) return { key: 'ayer', titulo: 'Ayer', sub: corta };
  if (diff === -1) return { key: 'manana', titulo: 'Mañana', sub: corta };
  return { key: `${d.getFullYear()}-${d.getMonth()}`, titulo: `${MESES[d.getMonth()]} ${d.getFullYear()}` };
};

const EventoTiempo = ({ e, onSelect, onFoto }) => (
  <li className={`xp-evento ${e.tono || 'slate'}`}>
    <span className="xp-evento-punto" />
    <div
      className={`xp-evento-cuerpo ${onSelect ? 'clicable' : ''}`}
      onClick={onSelect ? () => onSelect(e) : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (k) => k.key === 'Enter' && onSelect(e) : undefined}
    >
      <div className="xp-evento-top">
        <strong>{e.titulo}</strong>
        {!e.sinHora && <small>{fechaHora(e.fecha)}</small>}
      </div>
      {e.contexto && <span className="xp-evento-contexto">{e.contexto}</span>}
      {e.texto && <p>{e.texto}</p>}
      {e.fotos?.length > 0 && (
        <div className="xp-evento-fotos">
          {e.fotos.map((f, j) => (
            <button key={j} type="button" onClick={(ev) => { ev.stopPropagation(); onFoto(e.fotos, j); }} aria-label={`Ver foto ${j + 1}`}>
              <img src={f} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  </li>
);

export const LineaTiempo = ({ eventos, onSelect, vacio = 'Sin movimientos todavía.' }) => {
  const grupos = [];
  const porKey = new Map();
  eventos.forEach((e) => {
    const g = grupoFecha(e.fecha);
    if (!porKey.has(g.key)) {
      const nuevo = { ...g, eventos: [] };
      porKey.set(g.key, nuevo);
      grupos.push(nuevo);
    }
    porKey.get(g.key).eventos.push(e);
  });

  // Solo el grupo más reciente abierto; el resto se despliega a demanda
  const [abiertos, setAbiertos] = useState(() => new Set(grupos.length ? [grupos[0].key] : []));
  const [visor, setVisor] = useState(null);
  const cerrarVisor = useCallback(() => setVisor(null), []);

  if (!eventos.length) return <p className="xp-vacio">{vacio}</p>;

  const alternar = (key) => setAbiertos((prev) => {
    const sig = new Set(prev);
    if (sig.has(key)) sig.delete(key); else sig.add(key);
    return sig;
  });
  const todosAbiertos = grupos.every((g) => abiertos.has(g.key));

  return (
    <div className="xp-historial">
      {grupos.length > 1 && (
        <button
          type="button"
          className="xp-historial-todo"
          onClick={() => setAbiertos(todosAbiertos ? new Set() : new Set(grupos.map((g) => g.key)))}
        >
          {todosAbiertos ? 'Contraer todo' : 'Expandir todo'}
        </button>
      )}
      {grupos.map((g) => {
        const abierto = abiertos.has(g.key);
        return (
          <section key={g.key} className={`xp-historial-grupo ${abierto ? 'abierto' : ''}`}>
            <button type="button" className="xp-historial-head" onClick={() => alternar(g.key)} aria-expanded={abierto}>
              <CalendarClock size={16} />
              <strong>{g.titulo}</strong>
              {g.sub && <span className="xp-historial-sub">{g.sub}</span>}
              <span className="xp-historial-n">{g.eventos.length} {g.eventos.length === 1 ? 'movimiento' : 'movimientos'}</span>
              <ChevronDown size={18} className="xp-historial-flecha" />
            </button>
            {abierto && (
              <ol className="xp-timeline">
                {g.eventos.map((e, i) => (
                  <EventoTiempo key={i} e={e} onSelect={onSelect} onFoto={(fotos, inicio) => setVisor({ fotos, inicio })} />
                ))}
              </ol>
            )}
          </section>
        );
      })}
      {visor && <VisorFotos fotos={visor.fotos} inicio={visor.inicio} onClose={cerrarVisor} />}
    </div>
  );
};

// Descarga la foto como archivo. Se baja como blob porque el atributo `download`
// se ignora cuando la imagen vive en otro dominio (Cloudinary).
const descargarFoto = async (url) => {
  const ext = (url.split('?')[0].match(/\.(jpe?g|png|gif|webp|heic)$/i) || [])[1] || 'jpg';
  const nombre = `evidencia-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.${ext}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const blobUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
};

// Visor de fotos a pantalla completa dentro de la misma vista (flechas, teclado y deslizar)
export const VisorFotos = ({ fotos, inicio = 0, onClose }) => {
  const [indice, setIndice] = useState(inicio);
  const toqueX = useRef(null);
  const total = fotos.length;
  const ir = useCallback((paso) => setIndice((i) => (i + paso + total) % total), [total]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') ir(1);
      else if (e.key === 'ArrowLeft') ir(-1);
    };
    window.addEventListener('keydown', onKey);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, [ir, onClose]);

  const url = fotos[indice];

  return createPortal(
    <div
      className="xp-visor"
      role="dialog"
      aria-modal="true"
      aria-label="Visor de imágenes"
      onClick={onClose}
      onTouchStart={(e) => { toqueX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (toqueX.current === null || total < 2) return;
        const dx = e.changedTouches[0].clientX - toqueX.current;
        toqueX.current = null;
        if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
      }}
    >
      <div className="xp-visor-barra" onClick={(e) => e.stopPropagation()}>
        <span className="xp-visor-contador">{total > 1 ? `${indice + 1} / ${total}` : ''}</span>
        <div className="xp-visor-acciones">
          <button type="button" className="xp-visor-btn" aria-label="Descargar foto" title="Descargar" onClick={() => descargarFoto(url)}>
            <Download size={20} />
          </button>
          <button type="button" className="xp-visor-btn" aria-label="Cerrar" title="Cerrar" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
      </div>

      {total > 1 && (
        <button type="button" className="xp-visor-btn xp-visor-nav prev" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); ir(-1); }}>
          <ChevronLeft size={26} />
        </button>
      )}
      {esVideoUrl(url) ? (
        <video key={url} src={url} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} />
      ) : (
        <img key={url} src={url} alt={`Evidencia ${indice + 1}`} onClick={(e) => e.stopPropagation()} />
      )}
      {total > 1 && (
        <button type="button" className="xp-visor-btn xp-visor-nav next" aria-label="Foto siguiente" onClick={(e) => { e.stopPropagation(); ir(1); }}>
          <ChevronRight size={26} />
        </button>
      )}
    </div>,
    document.body
  );
};
