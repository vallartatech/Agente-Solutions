import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  X, FileText, HardHat, RefreshCw, Info, Paperclip, ExternalLink, Layers, StickyNote, Lock, Hammer, CornerDownRight,
} from 'lucide-react';
import { Chip, VisorFotos } from './ExpedienteUI';
import {
  API, authHeaders, dinero, fechaHora, totalCotizacion,
  origenCotizacion, cadenasCotizaciones, nombreCotizacion, folioCotizacion,
} from './flujoTrabajo';
import { mostrarAviso } from '../../../../utils/dialogos';
import '../../../../styles/AgenteSolutions/Admin/VistaPropiedades.css';
import '../../../../styles/Shared/LiquidGlass.css';
import '../../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';

const tonoEstado = (c) => {
  const s = String(c.status || '').toLowerCase();
  if (['pagado', 'aceptada', 'aprobado', 'aprobada'].includes(s)) return 'green';
  if (s.includes('rechaz')) return 'red';
  return 'amber';
};

const leerConcepto = (concept) => {
  if (!concept) return null;
  if (typeof concept === 'object') return concept;
  try { return JSON.parse(concept); } catch { return null; }
};

const num = (v) => parseFloat(v || 0) || 0;
const conDatos = (lista, campos) => (lista || []).filter((x) => campos.some((k) => x?.[k]));

// Tabla de partidas (conceptos o materiales)
const TablaPartidas = ({ titulo, filas, nombre, precio }) => {
  if (!filas.length) return null;
  return (
    <div className="xp-cot-tabla">
      <h5>{titulo}</h5>
      <table>
        <thead>
          <tr><th>Descripción</th><th>Cant.</th><th>Precio U.</th><th>Importe</th></tr>
        </thead>
        <tbody>
          {filas.map((f, i) => {
            const cant = num(f.cantidad || f.cant || 1);
            const pu = num(precio(f));
            return (
              <tr key={i}>
                <td>{nombre(f)}</td>
                <td>{cant}</td>
                <td>{dinero(pu)}</td>
                <td>{dinero(pu * cant)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const Partidas = ({ detalle }) => {
  const conceptos = (d) => conDatos(d.conceptos || d.servicios, ['descripcion', 'precio_u', 'precio']);
  const materiales = (d) => conDatos(d.materiales, ['nombre', 'descripcion', 'costo_u', 'precio']);
  const bloque = (d) => (
    <>
      <TablaPartidas titulo="Servicios / conceptos" filas={conceptos(d)} nombre={(c) => c.descripcion} precio={(c) => c.precio_u || c.precio} />
      <TablaPartidas titulo="Materiales" filas={materiales(d)} nombre={(m) => m.nombre || m.descripcion} precio={(m) => m.costo_u || m.precio} />
    </>
  );

  if (detalle.isUnifiedBatch && Array.isArray(detalle.seccionesLote)) {
    return detalle.seccionesLote.map((sec, i) => (
      <div key={i} className="xp-cot-seccion">
        <h4><Layers size={15} /> {sec.titulo || `Servicio #${i + 1}`}</h4>
        {bloque(sec)}
      </div>
    ));
  }
  return bloque(detalle);
};

// Detalle de una cotización dentro del expediente, sin salir de la propiedad
const ModalCotizacion = ({ cotizacion, trabajo, onClose }) => {
  const navigate = useNavigate();
  const todas = trabajo?.cotizaciones || [cotizacion];
  const [actual, setActual] = useState(cotizacion);
  const [verFoto, setVerFoto] = useState(false);
  const [abriendoPdf, setAbriendoPdf] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !verFoto) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, verFoto]);

  const origen = origenCotizacion(actual, todas);
  const detalle = leerConcepto(actual.concept);
  const monto = dinero(totalCotizacion(actual));
  const archivo = actual.file_path;
  const esArchivo = actual.type === 'archivo' || (!detalle && archivo);
  const derivadas = todas.filter((x) => x.parent_id && String(x.parent_id) === String(actual.id));

  // La vista de impresión usa el mismo formato que la lista general de cotizaciones
  const verPdf = async () => {
    if (esArchivo && archivo) {
      window.open(archivo, '_blank', 'noopener');
      return;
    }
    const pestana = window.open('', '_blank');
    setAbriendoPdf(true);
    try {
      const res = await axios.get(`${API}/cotizaciones`, { headers: authHeaders() });
      const lista = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const completa = lista.find((x) => String(x.id) === String(actual.id));
      if (!completa) throw new Error('no encontrada');
      localStorage.setItem('cotizacion_para_imprimir', JSON.stringify(completa));
      if (pestana) pestana.location.href = '/imprimir-cotizacion';
      else window.open('/imprimir-cotizacion', '_blank');
    } catch {
      pestana?.close();
      mostrarAviso('No se pudo preparar el PDF de esta cotización.', 'error');
    } finally {
      setAbriendoPdf(false);
    }
  };

  const IconoOrigen = origen.key === 'tecnico' ? HardHat : origen.key === 'recotizacion' ? RefreshCw : FileText;

  return createPortal(
    <>
      <div className="rp-overlay" onClick={onClose}>
        <div className="rp-modal xp-cot-modal" role="dialog" aria-modal="true" aria-label={nombreCotizacion(actual)} onClick={(e) => e.stopPropagation()}>
          <div className="rp-header">
            <div className="rp-header-text">
              <span className="xp-chips">
                <span className="rp-tag">DETALLE DE COTIZACIÓN</span>
                <Chip tono={tonoEstado(actual)}>{actual.status || 'Pendiente'}</Chip>
              </span>
              <h2 className="rp-title">{folioCotizacion(actual)}</h2>
            </div>
            <button type="button" className="rp-close" onClick={onClose} aria-label="Cerrar">
              <X size={18} color="#ffffff" strokeWidth={2.6} />
            </button>
          </div>

          <div className="xp-cot-cuerpo">
            {/* De dónde salió esta cotización */}
            <div className={`xp-cot-origen ${origen.key}`}>
              <span className={`xp-cot-icono ${origen.key}`}><IconoOrigen size={20} /></span>
              <div>
                <strong>{origen.texto}</strong>
                <p>{origen.detalle}</p>
                {origen.padre && (
                  <button type="button" className="xp-cot-enlace" onClick={() => setActual(origen.padre)}>
                    <CornerDownRight size={14} /> Basada en la {nombreCotizacion(origen.padre).toLowerCase()}
                  </button>
                )}
                {derivadas.map((d) => (
                  <button key={d.id} type="button" className="xp-cot-enlace" onClick={() => setActual(d)}>
                    <RefreshCw size={14} /> Se generó la {nombreCotizacion(d).toLowerCase()} a partir de esta
                  </button>
                ))}
              </div>
            </div>

            <dl className="xp-datos">
              <div><dt>Total</dt><dd>{monto || '—'}</dd></div>
              <div><dt>Fecha</dt><dd>{fechaHora(actual.created_at) || '—'}</dd></div>
              <div><dt>Trabajo</dt><dd>{trabajo?.titulo || '—'}</dd></div>
              <div><dt>Vigencia</dt><dd>{actual.validity_days ? `${actual.validity_days} días` : '—'}</dd></div>
            </dl>

            {/* Todas las versiones del trabajo, para moverse entre ellas */}
            {todas.length > 1 && (
              <>
                <h4 className="xp-subtitulo"><Hammer size={13} /> Cotizaciones de este trabajo</h4>
                <div className="xp-cot-versiones">
                  {cadenasCotizaciones(todas).map(({ cotizacion: c, nivel }) => {
                    const o = origenCotizacion(c, todas);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`xp-cot-version ${String(c.id) === String(actual.id) ? 'on' : ''}`}
                        style={{ '--xp-nivel': Math.min(nivel, 3) }}
                        onClick={() => setActual(c)}
                      >
                        {nivel > 0 && <CornerDownRight size={13} />}
                        <span>{nombreCotizacion(c)}</span>
                        <Chip tono={o.tono}>{o.texto}</Chip>
                        <em>{dinero(totalCotizacion(c))}</em>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <h4 className="xp-subtitulo"><FileText size={13} /> Partidas</h4>
            {detalle ? (
              <Partidas detalle={detalle} />
            ) : esArchivo && archivo ? (
              <a className="xp-cot-archivo" href={archivo} target="_blank" rel="noopener noreferrer">
                <Paperclip size={16} /> Cotización en archivo adjunto <ExternalLink size={14} />
              </a>
            ) : (
              <p className="xp-vacio xp-vacio-inline"><Info size={16} /> Esta cotización no tiene partidas registradas.</p>
            )}

            {actual.observations && (
              <>
                <h4 className="xp-subtitulo"><StickyNote size={13} /> Observaciones</h4>
                <p className="xp-descripcion">{actual.observations}</p>
              </>
            )}

            {actual.internal_observations && (
              <>
                <h4 className="xp-subtitulo"><Lock size={13} /> Notas internas (no las ve el cliente)</h4>
                <p className="xp-descripcion xp-cot-interna">{actual.internal_observations}</p>
              </>
            )}

            {actual.evidence_photo_path && (
              <>
                <h4 className="xp-subtitulo">Evidencia</h4>
                <div className="xp-galeria">
                  <button type="button" className="xp-galeria-item" onClick={() => setVerFoto(true)} aria-label="Ver evidencia">
                    <img src={actual.evidence_photo_path} alt="Evidencia de la cotización" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="rp-footer xp-cot-footer">
            <button type="button" className="xp-btn-glass" onClick={verPdf} disabled={abriendoPdf}>
              <FileText size={17} /> {abriendoPdf ? 'Preparando...' : esArchivo ? 'Ver archivo' : 'Ver PDF'}
            </button>
            <button
              type="button"
              className="xp-btn-primary"
              onClick={() => navigate(`/vista-cotizaciones?quote_id=${actual.id}`)}
              title="Recotizar, enviar al cliente o registrar pagos"
            >
              Gestionar cotización <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>

      {verFoto && actual.evidence_photo_path && (
        <VisorFotos fotos={[actual.evidence_photo_path]} onClose={() => setVerFoto(false)} />
      )}
    </>,
    document.body
  );
};

export default ModalCotizacion;
