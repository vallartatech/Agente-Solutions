// Red: el técnico arma la nueva cotización (ajuste) con el mismo formato que el cotizador de
// Agente Solutions (CreateQuotationModal): registro manual de conceptos y materiales, o cargar archivo.
// Copia propia de Market (no se importa nada de lo interno). El cliente debe aceptar el nuevo precio.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Camera, Upload, Calculator, FileText, ArrowRight } from 'lucide-react';
import { proponerAjuste, errorDeAjuste, dinero, totalFilas, IVA } from '../Shared/ajusteCotizacionApi';
import '../../../styles/AgenteMarket/Tecnico/ModalAjusteCotizacion.css';

const MAX_FOTOS = 4;
const MAX_MB_FOTO = 12;
const MAX_MB_ARCHIVO = 10;
const filaVacia = () => ({ id: `${Date.now()}-${Math.random()}`, desc: '', cant: 1, precio: '' });

// Filas con descripción o precio, en el formato que guarda el backend
const limpiar = (filas) => filas
  .filter((f) => f.desc.trim() || Number(f.precio) > 0)
  .map((f) => ({ descripcion: f.desc.trim(), cantidad: Number(f.cant) || 1, precio: Number(f.precio) || 0 }));

const SeccionFilas = ({ titulo, etiqueta, etiquetaPrecio, placeholder, textoAgregar, filas, setFilas }) => {
  const cambiar = (id, campo, valor) => setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  const quitar = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : [filaVacia()]));

  return (
    <>
      <h4 className="ajc-section-title">{titulo}</h4>
      {filas.map((f) => (
        <div key={f.id} className="ajc-row">
          <div className="ajc-row-main">
            <label className="ajc-label">{etiqueta}</label>
            <input className="ajc-input" placeholder={placeholder} maxLength={200} value={f.desc} onChange={(e) => cambiar(f.id, 'desc', e.target.value)} />
          </div>
          <div className="ajc-row-nums">
            <div className="ajc-row-num">
              <label className="ajc-label">Cant.</label>
              <input type="number" min="0" step="any" inputMode="decimal" className="ajc-input center" value={f.cant} onChange={(e) => cambiar(f.id, 'cant', e.target.value)} />
            </div>
            <div className="ajc-row-num">
              <label className="ajc-label">{etiquetaPrecio}</label>
              <input type="number" min="0" step="any" inputMode="decimal" className="ajc-input right" value={f.precio} onChange={(e) => cambiar(f.id, 'precio', e.target.value)} />
            </div>
            <button type="button" className="ajc-trash-btn" onClick={() => quitar(f.id)} aria-label="Eliminar fila"><Trash2 size={18} /></button>
          </div>
          {Number(f.cant) * Number(f.precio) > 0 && (
            <span className="ajc-row-sub">Subtotal: {dinero(Number(f.cant) * Number(f.precio))}</span>
          )}
        </div>
      ))}
      <button type="button" className="ajc-add-btn" onClick={() => setFilas((prev) => [...prev, filaVacia()])}>
        <Plus size={16} /> {textoAgregar}
      </button>
    </>
  );
};

const ModalAjusteCotizacion = ({ workOrderId, precioVigente, version, onClose, onEnviado }) => {
  const [tab, setTab] = useState('manual'); // 'manual' | 'archivo'
  const [conceptos, setConceptos] = useState([filaVacia()]);
  const [materiales, setMateriales] = useState([filaVacia()]);
  const [conIva, setConIva] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [precioArchivo, setPrecioArchivo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fotos, setFotos] = useState([]); // { file, url }
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  // Liberar las vistas previas al cerrar
  useEffect(() => () => fotos.forEach((f) => URL.revokeObjectURL(f.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar con Escape
  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && !enviando && onClose();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [enviando, onClose]);

  const desglose = useMemo(() => {
    const s = limpiar(conceptos);
    const m = limpiar(materiales);
    return s.length || m.length ? { servicios: s, materiales: m } : null;
  }, [conceptos, materiales]);

  const subtotal = totalFilas(desglose?.servicios) + totalFilas(desglose?.materiales);
  const iva = conIva ? subtotal * IVA : 0;
  const total = tab === 'manual' ? Math.round((subtotal + iva) * 100) / 100 : (Number(precioArchivo) || 0);
  const diferencia = total - Number(precioVigente || 0);

  const agregarFotos = (e) => {
    const nuevas = Array.from(e.target.files || []);
    e.target.value = '';
    if (nuevas.some((f) => f.size > MAX_MB_FOTO * 1024 * 1024)) setError(`Cada foto debe pesar menos de ${MAX_MB_FOTO} MB.`);
    const validas = nuevas.filter((f) => f.size <= MAX_MB_FOTO * 1024 * 1024 && f.type.startsWith('image/'));
    setFotos((prev) => [...prev, ...validas.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_FOTOS));
  };

  const quitarFoto = (i) => setFotos((prev) => {
    URL.revokeObjectURL(prev[i].url);
    return prev.filter((_, idx) => idx !== i);
  });

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!/(pdf|jpe?g|png|webp)$/i.test(f.type) && !/\.(pdf|jpe?g|png|webp)$/i.test(f.name)) return setError('El archivo debe ser PDF o imagen (JPG, PNG, WEBP).');
    if (f.size > MAX_MB_ARCHIVO * 1024 * 1024) return setError(`El archivo debe pesar menos de ${MAX_MB_ARCHIVO} MB.`);
    setError('');
    setArchivo(f);
  };

  const enviar = async () => {
    setError('');
    if (tab === 'manual' && !desglose) return setError('Agrega al menos un concepto o material con su precio.');
    if (tab === 'archivo' && !archivo) return setError('Selecciona el archivo de la cotización.');
    if (!(total > 0)) return setError(tab === 'manual' ? 'Escribe los precios de los conceptos o materiales.' : 'Escribe el total de la cotización.');
    if (Math.abs(diferencia) < 0.01) return setError('El nuevo precio es igual al vigente.');
    if (motivo.trim().length < 5) return setError('Explica al cliente por qué cambia el precio.');

    setEnviando(true);
    try {
      const res = await proponerAjuste(workOrderId, {
        precio: total,
        motivo: motivo.trim(),
        desglose: tab === 'manual' ? desglose : null,
        archivo: tab === 'archivo' ? archivo : null,
        conIva: tab === 'manual' && conIva,
        fotos: fotos.map((f) => f.file),
      });
      onEnviado?.(res);
    } catch (e) {
      setError(errorDeAjuste(e, 'No se pudo enviar la cotización. Inténtalo de nuevo.'));
      setEnviando(false);
    }
  };

  return createPortal(
    <div className="ajc-overlay" onClick={() => !enviando && onClose()}>
      <div className="ajc-card" role="dialog" aria-modal="true" aria-labelledby="ajc-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="ajc-header">
          <div className="ajc-header-txt">
            <span className="ajc-header-icon"><Calculator size={20} strokeWidth={2.4} /></span>
            <div>
              <h2 id="ajc-titulo">NUEVA COTIZACIÓN{version ? ` (V${version})` : ''}</h2>
              <p>El cliente debe aceptar el nuevo precio. La cotización de {dinero(precioVigente)} queda en el historial.</p>
            </div>
          </div>
          <button type="button" className="ajc-close" onClick={onClose} disabled={enviando} aria-label="Cerrar"><X size={20} strokeWidth={2.6} /></button>
        </div>

        <div className="ajc-body">
          <div className="ajc-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'manual'} className={`ajc-tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
              REGISTRO MANUAL
            </button>
            <button type="button" role="tab" aria-selected={tab === 'archivo'} className={`ajc-tab ${tab === 'archivo' ? 'active' : ''}`} onClick={() => setTab('archivo')}>
              CARGAR ARCHIVO
            </button>
          </div>

          {tab === 'manual' ? (
            <>
              <SeccionFilas
                titulo="1. CONCEPTOS DE SERVICIO" etiqueta="Descripción del Servicio" etiquetaPrecio="Precio U. ($)"
                placeholder="Ej. Cambio de compresor..." textoAgregar="AGREGAR CONCEPTO"
                filas={conceptos} setFilas={setConceptos}
              />
              <SeccionFilas
                titulo="2. MATERIALES" etiqueta="Nombre del Material" etiquetaPrecio="Costo U. ($)"
                placeholder="Ej. Gas refrigerante R410A..." textoAgregar="AGREGAR MATERIAL"
                filas={materiales} setFilas={setMateriales}
              />
            </>
          ) : (
            <>
              <div className="ajc-file-zone">
                <Upload size={44} className="ajc-file-icon" />
                <p className="ajc-file-text">
                  {archivo ? <><FileText size={15} /> {archivo.name}</> : 'Sube tu cotización en PDF o una foto (JPG, PNG, WEBP).'}
                </p>
                <label className="ajc-btn primary">
                  {archivo ? 'CAMBIAR ARCHIVO' : 'SELECCIONAR ARCHIVO'}
                  <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={elegirArchivo} />
                </label>
              </div>
              <label className="ajc-label" htmlFor="ajc-total-archivo">Total de la cotización ($)</label>
              <input
                id="ajc-total-archivo" type="number" min="0" step="any" inputMode="decimal"
                className="ajc-input right ajc-total-input" placeholder="0.00"
                value={precioArchivo} onChange={(e) => setPrecioArchivo(e.target.value)}
              />
            </>
          )}

          <h4 className="ajc-section-title">{tab === 'manual' ? '3.' : '1.'} MOTIVO DEL AJUSTE</h4>
          <textarea
            className="ajc-input ajc-textarea"
            maxLength={1000}
            placeholder="Explica al cliente por qué cambia el precio. Ej. Al revisar, el compresor está dañado; no basta con la recarga de gas."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />

          <h4 className="ajc-section-title">{tab === 'manual' ? '4.' : '2.'} EVIDENCIA FOTOGRÁFICA <em>(opcional, hasta {MAX_FOTOS})</em></h4>
          <div className="ajc-fotos">
            {fotos.map((f, i) => (
              <div key={f.url} className="ajc-foto">
                <img src={f.url} alt={`Foto ${i + 1}`} />
                <button type="button" className="ajc-foto-quitar" onClick={() => quitarFoto(i)} aria-label="Quitar foto"><X size={12} /></button>
              </div>
            ))}
            {fotos.length < MAX_FOTOS && (
              <label className="ajc-foto ajc-foto-agregar">
                <Camera size={20} />
                <span>Agregar</span>
                <input type="file" accept="image/*" multiple hidden onChange={agregarFotos} />
              </label>
            )}
          </div>

          {error && <p className="ajc-error" role="alert">{error}</p>}
        </div>

        <div className="ajc-summary">
          {tab === 'manual' && (
            <>
              <div className="ajc-sum-line"><span>Subtotal (Servicios + Materiales)</span><strong>{dinero(subtotal)}</strong></div>
              <label className="ajc-iva">
                <input type="checkbox" checked={conIva} onChange={(e) => setConIva(e.target.checked)} />
                <span>Agregar IVA (16%)</span>
                <strong>{conIva ? dinero(iva) : '—'}</strong>
              </label>
            </>
          )}
          <div className="ajc-sum-total">
            <div className="ajc-comparacion">
              <span>Antes {dinero(precioVigente)}</span>
              <ArrowRight size={14} />
              {total > 0 && Math.abs(diferencia) >= 0.01 && (
                <em className={diferencia > 0 ? 'sube' : 'baja'}>{diferencia > 0 ? '+' : '−'}{dinero(Math.abs(diferencia))}</em>
              )}
            </div>
            <div className="ajc-total-wrap">
              <span>TOTAL A COBRAR AL CLIENTE</span>
              <h3 className="ajc-total">{dinero(total)}</h3>
            </div>
          </div>
          <div className="ajc-footer-btns">
            <button type="button" className="ajc-btn secondary" onClick={onClose} disabled={enviando}>CANCELAR</button>
            <button type="button" className="ajc-btn primary" onClick={enviar} disabled={enviando}>
              {enviando ? 'ENVIANDO…' : 'ENVIAR AL CLIENTE'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalAjusteCotizacion;
