import { Check, X, CalendarClock, UserRound, ImageOff, FileText, ChevronRight, Hammer, ClipboardList } from 'lucide-react';
import {
  calcularFlujo, etiquetaEstado, etiquetaTipo, fechaHora, dinero, totalCotizacion, nombreTecnicos,
} from './flujoTrabajo';

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
      {cotizaciones.map((c) => (
        <button type="button" key={c.id} className="xp-fila" onClick={() => onAbrir?.(c)}>
          <span className="xp-fila-icono"><FileText size={18} /></span>
          <span className="xp-fila-texto">
            <strong>{c.folio ? `Cotización #${c.folio}` : `Cotización ${c.id}`}</strong>
            <small>
              {[c._trabajo?.titulo, fechaHora(c.created_at)].filter(Boolean).join(' · ')}
            </small>
          </span>
          <span className="xp-fila-fin">
            {dinero(totalCotizacion(c)) && <strong>{dinero(totalCotizacion(c))}</strong>}
            <Chip tono={tonoCotizacion(c)}>{c.status || 'Pendiente'}</Chip>
          </span>
        </button>
      ))}
    </div>
  );
};

export const LineaTiempo = ({ eventos, onSelect, vacio = 'Sin movimientos todavía.' }) => {
  if (!eventos.length) return <p className="xp-vacio">{vacio}</p>;
  return (
    <ol className="xp-timeline">
      {eventos.map((e, i) => (
        <li key={i} className={`xp-evento ${e.tono || 'slate'}`}>
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
                  <a key={j} href={f} target="_blank" rel="noopener noreferrer" onClick={(ev) => ev.stopPropagation()}>
                    <img src={f} alt="" loading="lazy" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};
