// QR de acceso a la propiedad de un trabajo.
// - AccesoQRAdmin: Root/Admin suben hasta 2 QRs en el detalle del trabajo.
// - AccesoQRTecnico: el técnico asignado lo ve en pantalla completa después de confirmar su llegada.
// La imagen nunca tiene URL pública: se descarga con el token y vive solo en memoria mientras está abierta.
// Se elimina sola en el servidor cuando el trabajo (o todo su lote) se finaliza.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { QrCode, Lock, Upload, Trash2, Eye, RefreshCw, X, MapPin, ShieldCheck, Plus, Layers } from 'lucide-react';
import { comprimirImagen } from '../../../components/Shared/comprimirImagen';
import { mostrarAviso, confirmarAccion } from '../../../utils/dialogos';
import '../../../styles/AgenteSolutions/Shared/AccesoQR.css';

const API = import.meta.env.VITE_API_BASE_URL;
const SLOTS = [1, 2];

// "work_order-12" | "wo-12" → work_order · "servicio-5" | "sv-5" | "5" → servicio
export const tipoTrabajo = (valor) => {
  const s = String(valor ?? '').toLowerCase();
  const id = Number(s.match(/\d+/)?.[0]);
  if (!id) return null;
  const tipo = /work[_\s-]*order|^wo-/.test(s) ? 'work_order' : 'servicio';
  return { tipo, id };
};

const base = ({ tipo, id }) => `${API}/trabajos/${tipo}/${id}/acceso-qr`;

const mensajeError = async (error, porDefecto) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try { return JSON.parse(await data.text())?.message || porDefecto; } catch { return porDefecto; }
  }
  return data?.message || Object.values(data?.errors || {})[0]?.[0] || porDefecto;
};

const fechaCorta = (iso) =>
  iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : null;

const useAccesoQR = (trabajo) => {
  const [info, setInfo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const clave = trabajo ? `${trabajo.tipo}-${trabajo.id}` : null;

  const cargar = useCallback(async () => {
    if (!trabajo) { setCargando(false); return; }
    try {
      const res = await axios.get(base(trabajo));
      setInfo(res.data);
    } catch {
      setInfo(null);
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  useEffect(() => { cargar(); }, [cargar]);
  return { info, setInfo, cargando, recargar: cargar };
};

// ----------------------------------------------------------------- Visor en pantalla completa

const VisorQR = ({ trabajo, qr, titulo, onCerrar }) => {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);
  const ruta = `${base(trabajo)}/${qr.slot}/imagen`;

  useEffect(() => {
    let url = null;
    let wakeLock = null;
    let vivo = true;

    axios.get(ruta, { responseType: 'blob' })
      .then((res) => {
        if (!vivo) return;
        url = URL.createObjectURL(res.data);
        setSrc(url);
      })
      .catch(async (e) => vivo && setError(await mensajeError(e, 'No se pudo abrir el QR.')));

    // Mantiene la pantalla encendida mientras se escanea
    navigator.wakeLock?.request?.('screen').then((w) => { wakeLock = w; }).catch(() => {});
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    document.body.style.overflow = 'hidden';

    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
      wakeLock?.release?.().catch(() => {});
      window.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = '';
    };
  }, [ruta, onCerrar]);

  // Portal al body: las tarjetas con backdrop-filter atraparían el position: fixed
  return createPortal(
    <div className="aqr-visor" role="dialog" aria-modal="true" aria-label="QR de acceso">
      <button type="button" className="aqr-visor-cerrar" onClick={onCerrar} aria-label="Cerrar">
        <X size={26} />
      </button>
      <div className="aqr-visor-cuerpo">
        <p className="aqr-visor-titulo">{qr.label || titulo || 'QR de acceso'}</p>
        <div className="aqr-visor-marco">
          {src ? (
            <img src={src} alt="QR de acceso" draggable={false} onContextMenu={(e) => e.preventDefault()} />
          ) : error ? (
            <p className="aqr-visor-error">{error}</p>
          ) : (
            <div className="aqr-spinner" />
          )}
        </div>
        {qr.note && <p className="aqr-visor-nota">{qr.note}</p>}
        <p className="aqr-visor-pie"><ShieldCheck size={14} /> Uso exclusivo para este trabajo · Se elimina al finalizarlo</p>
      </div>
    </div>,
    document.body
  );
};

// ----------------------------------------------------------------- Admin / Root

const FormularioQR = ({ trabajo, slot, existente, onGuardado, onCancelar }) => {
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState(null);
  const [label, setLabel] = useState(existente?.label || '');
  const [note, setNote] = useState(existente?.note || '');
  const [vigencia, setVigencia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => () => vista && URL.revokeObjectURL(vista), [vista]);

  const elegir = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f);
    setVista(URL.createObjectURL(f));
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!archivo) { mostrarAviso('Selecciona la imagen del QR.'); return; }
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append('slot', slot);
      fd.append('imagen', await comprimirImagen(archivo));
      if (label.trim()) fd.append('label', label.trim());
      if (note.trim()) fd.append('note', note.trim());
      if (vigencia) fd.append('valid_until', new Date(vigencia).toISOString());
      const res = await axios.post(base(trabajo), fd);
      onGuardado(res.data);
      mostrarAviso('✅ QR de acceso guardado.');
    } catch (err) {
      mostrarAviso(await mensajeError(err, 'No se pudo guardar el QR.'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="aqr-form" onSubmit={guardar}>
      <button type="button" className={`aqr-drop ${vista ? 'con-imagen' : ''}`} onClick={() => inputRef.current?.click()}>
        {vista ? <img src={vista} alt="Vista previa del QR" /> : (
          <>
            <Upload size={22} />
            <span>Toca para elegir la imagen o foto del QR</span>
            <small>JPG, PNG o WEBP · máx. 5 MB</small>
          </>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={elegir} />

      <label className="aqr-campo">
        <span>Etiqueta <em>(opcional)</em></span>
        <input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder={slot === 1 ? 'Ej. Acceso principal' : 'Ej. Estacionamiento'} />
      </label>
      <label className="aqr-campo">
        <span>Indicaciones para el técnico <em>(opcional)</em></span>
        <textarea value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Mostrar en recepción de la torre B" />
      </label>
      <label className="aqr-campo">
        <span>Válido hasta <em>(opcional)</em></span>
        <input type="datetime-local" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
      </label>

      <div className="aqr-form-acciones">
        <button type="button" className="aqr-btn ghost" onClick={onCancelar} disabled={enviando}>Cancelar</button>
        <button type="submit" className="aqr-btn primario" disabled={enviando || !archivo}>
          {enviando ? 'Guardando…' : existente ? 'Reemplazar QR' : 'Guardar QR'}
        </button>
      </div>
    </form>
  );
};

export const AccesoQRAdmin = ({ tipo, id }) => {
  const trabajo = tipo && id ? { tipo, id } : null;
  const { info, setInfo, cargando } = useAccesoQR(trabajo);
  const [editando, setEditando] = useState(null); // slot en edición
  const [viendo, setViendo] = useState(null);
  const cerrarVisor = useCallback(() => setViendo(null), []);

  if (!trabajo || cargando || !info) return null;

  const porSlot = Object.fromEntries((info.qrs || []).map((q) => [q.slot, q]));

  const eliminar = async (slot) => {
    if (!(await confirmarAccion('¿Eliminar este QR de acceso? Los técnicos ya no podrán verlo.'))) return;
    try {
      const res = await axios.delete(`${base(trabajo)}/${slot}`);
      setInfo(res.data);
    } catch (err) {
      mostrarAviso(await mensajeError(err, 'No se pudo eliminar el QR.'), 'error');
    }
  };

  // Trabajo cerrado: no hay nada que gestionar
  if (info.cerrado) {
    return (
      <section className="xp-card xp-panel aqr-panel">
        <h3 className="xp-panel-titulo"><QrCode size={18} /> Acceso con QR</h3>
        <p className="aqr-ayuda"><ShieldCheck size={14} /> Trabajo finalizado: los QR de acceso se eliminan automáticamente.</p>
      </section>
    );
  }

  const slotsVisibles = SLOTS.filter((s) => s === 1 || porSlot[1] || porSlot[s] || editando === s);

  return (
    <section className="xp-card xp-panel aqr-panel">
      <h3 className="xp-panel-titulo"><QrCode size={18} /> Acceso con QR</h3>
      <p className="aqr-ayuda">
        Si el edificio pide un QR para entrar, súbelo aquí. Los técnicos asignados lo verán al confirmar su llegada y
        <strong> se elimina automáticamente al finalizar el trabajo.</strong>
      </p>
      {info.es_lote && (
        <p className="aqr-lote"><Layers size={14} /> Aplica a las {info.trabajos_en_lote} órdenes de este lote.</p>
      )}

      <div className="aqr-slots">
        {slotsVisibles.map((slot) => {
          const qr = porSlot[slot];
          if (editando === slot) {
            return (
              <FormularioQR
                key={slot}
                trabajo={trabajo}
                slot={slot}
                existente={qr}
                onGuardado={(data) => { setInfo(data); setEditando(null); }}
                onCancelar={() => setEditando(null)}
              />
            );
          }
          if (!qr) {
            return slot === 1 ? (
              <button key={slot} type="button" className="aqr-agregar" onClick={() => setEditando(slot)}>
                <Upload size={18} /> Subir QR de acceso
              </button>
            ) : (
              <button key={slot} type="button" className="aqr-agregar secundario" onClick={() => setEditando(slot)}>
                <Plus size={16} /> Agregar un segundo QR (opcional)
              </button>
            );
          }
          return (
            <div key={slot} className="aqr-item">
              <span className="aqr-item-icono"><QrCode size={22} /></span>
              <div className="aqr-item-texto">
                <strong>{qr.label || `QR ${slot}`}</strong>
                {qr.note && <small>{qr.note}</small>}
                <small className="aqr-item-meta">
                  {qr.valid_until ? `Válido hasta ${fechaCorta(qr.valid_until)}` : 'Sin vigencia'} · Subido {fechaCorta(qr.updated_at)}
                </small>
              </div>
              <div className="aqr-item-acciones">
                <button type="button" title="Ver" onClick={() => setViendo(qr)}><Eye size={17} /></button>
                <button type="button" title="Reemplazar" onClick={() => setEditando(slot)}><RefreshCw size={17} /></button>
                <button type="button" title="Eliminar" className="peligro" onClick={() => eliminar(slot)}><Trash2 size={17} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {viendo && <VisorQR trabajo={trabajo} qr={viendo} onCerrar={cerrarVisor} />}
    </section>
  );
};

// ----------------------------------------------------------------- Técnico

export const AccesoQRTecnico = ({ compositeId }) => {
  const trabajo = tipoTrabajo(compositeId);
  const { info, cargando, recargar } = useAccesoQR(trabajo);
  const [viendo, setViendo] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const cerrarVisor = useCallback(() => setViendo(null), []);

  if (!trabajo || cargando || !info || !info.cantidad || info.cerrado) return null;

  const confirmarLlegada = async () => {
    if (!(await confirmarAccion('¿Confirmas que ya llegaste a la propiedad?'))) return;
    setConfirmando(true);
    let latitude = null;
    let longitude = null;
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation
          ? navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true })
          : reject(new Error('sin gps'))
      );
      ({ latitude, longitude } = pos.coords);
    } catch {
      // La llegada se registra igual; el backend guarda la hora aunque no haya coordenadas
    }
    try {
      await axios.post(`${API}/work-orders/${encodeURIComponent(compositeId)}/confirm-arrival`, { latitude, longitude });
      await recargar();
      mostrarAviso('📍 ¡Llegada confirmada! Ya puedes mostrar el QR.');
    } catch (err) {
      mostrarAviso(await mensajeError(err, 'No se pudo registrar la llegada. Intenta de nuevo.'), 'error');
    } finally {
      setConfirmando(false);
    }
  };

  if (info.bloqueado) {
    return (
      <div className="tp-card aqr-tecnico bloqueado">
        <span className="aqr-tecnico-icono"><Lock size={22} /></span>
        <div className="aqr-tecnico-texto">
          <strong>Este trabajo requiere QR de acceso</strong>
          <small>Se mostrará cuando confirmes tu llegada a la propiedad.</small>
        </div>
        <button type="button" className="aqr-btn primario" onClick={confirmarLlegada} disabled={confirmando}>
          <MapPin size={16} /> {confirmando ? 'Confirmando…' : 'Ya llegué'}
        </button>
      </div>
    );
  }

  return (
    <div className="tp-card aqr-tecnico">
      <span className="aqr-tecnico-icono"><QrCode size={22} /></span>
      <div className="aqr-tecnico-texto">
        <strong>QR de acceso a la propiedad</strong>
        <small>Muéstralo en la entrada. Se elimina al finalizar el trabajo.</small>
      </div>
      <div className="aqr-tecnico-botones">
        {info.qrs.map((qr) => (
          <button key={qr.slot} type="button" className="aqr-btn primario" onClick={() => setViendo(qr)}>
            <QrCode size={16} /> {info.qrs.length > 1 ? (qr.label || `QR ${qr.slot}`) : 'Mostrar QR'}
          </button>
        ))}
      </div>
      {viendo && <VisorQR trabajo={trabajo} qr={viendo} onCerrar={cerrarVisor} />}
    </div>
  );
};
