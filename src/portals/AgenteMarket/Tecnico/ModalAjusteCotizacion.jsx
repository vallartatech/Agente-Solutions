// Red: el técnico propone un nuevo precio para una cotización ya aceptada.
// Dos formas: solo cambiar el precio, o desglosar servicios y materiales (el total se calcula solo).
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Camera, Send, ArrowRight } from 'lucide-react';
import { proponerAjuste, errorDeAjuste, dinero, totalFilas } from '../Shared/ajusteCotizacionApi';
import '../../../styles/AgenteMarket/Shared/AjusteCotizacion.css';

const MAX_FOTOS = 4;
const MAX_MB = 12;
const filaVacia = () => ({ id: `${Date.now()}-${Math.random()}`, descripcion: '', cantidad: 1, precio: '' });

const TablaFilas = ({ titulo, filas, setFilas, placeholder }) => {
  const cambiar = (id, campo, valor) => setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  return (
    <div className="aj-tabla">
      <div className="aj-tabla-cab">
        <span>{titulo}</span>
        <span className="aj-tabla-total">{dinero(totalFilas(filas))}</span>
      </div>
      {filas.map((f) => (
        <div key={f.id} className="aj-fila">
          <input
            className="aj-input aj-fila-desc"
            placeholder={placeholder}
            value={f.descripcion}
            maxLength={200}
            onChange={(e) => cambiar(f.id, 'descripcion', e.target.value)}
          />
          <input
            className="aj-input aj-fila-cant"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            aria-label="Cantidad"
            value={f.cantidad}
            onChange={(e) => cambiar(f.id, 'cantidad', e.target.value)}
          />
          <input
            className="aj-input aj-fila-precio"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="$ c/u"
            aria-label="Precio unitario"
            value={f.precio}
            onChange={(e) => cambiar(f.id, 'precio', e.target.value)}
          />
          <button
            type="button"
            className="aj-icono-btn"
            title="Quitar fila"
            onClick={() => setFilas((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== f.id) : [filaVacia()]))}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" className="aj-link" onClick={() => setFilas((prev) => [...prev, filaVacia()])}>
        <Plus size={14} /> Agregar fila
      </button>
    </div>
  );
};

const ModalAjusteCotizacion = ({ workOrderId, precioVigente, onClose, onEnviado }) => {
  const [modo, setModo] = useState('precio'); // 'precio' | 'desglose'
  const [precio, setPrecio] = useState('');
  const [motivo, setMotivo] = useState('');
  const [servicios, setServicios] = useState([filaVacia()]);
  const [materiales, setMateriales] = useState([filaVacia()]);
  const [fotos, setFotos] = useState([]); // { file, url }
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  // Liberar las vistas previas al cerrar
  useEffect(() => () => fotos.forEach((f) => URL.revokeObjectURL(f.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const limpiar = (filas) => filas
    .filter((f) => f.descripcion.trim() || Number(f.precio) > 0)
    .map((f) => ({ descripcion: f.descripcion.trim(), cantidad: Number(f.cantidad) || 1, precio: Number(f.precio) || 0 }));

  const desglose = useMemo(() => {
    if (modo !== 'desglose') return null;
    const s = limpiar(servicios);
    const m = limpiar(materiales);
    return s.length || m.length ? { servicios: s, materiales: m } : null;
  }, [modo, servicios, materiales]);

  const total = modo === 'desglose'
    ? totalFilas(desglose?.servicios) + totalFilas(desglose?.materiales)
    : Number(precio) || 0;
  const diferencia = total - Number(precioVigente || 0);

  const agregarFotos = (e) => {
    const nuevas = Array.from(e.target.files || []);
    e.target.value = '';
    const pesadas = nuevas.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (pesadas.length) setError(`Cada foto debe pesar menos de ${MAX_MB} MB.`);
    const validas = nuevas.filter((f) => f.size <= MAX_MB * 1024 * 1024 && f.type.startsWith('image/'));
    setFotos((prev) => [...prev, ...validas.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_FOTOS));
  };

  const quitarFoto = (i) => setFotos((prev) => {
    URL.revokeObjectURL(prev[i].url);
    return prev.filter((_, idx) => idx !== i);
  });

  const enviar = async () => {
    setError('');
    if (modo === 'desglose' && !desglose) return setError('Agrega al menos una fila con descripción y precio.');
    if (!(total > 0)) return setError('Escribe el nuevo precio.');
    if (Math.abs(diferencia) < 0.01) return setError('El nuevo precio es igual al vigente.');
    if (motivo.trim().length < 5) return setError('Explica al cliente por qué cambia el precio.');

    setEnviando(true);
    try {
      const res = await proponerAjuste(workOrderId, {
        precio: Math.round(total * 100) / 100,
        motivo: motivo.trim(),
        desglose,
        fotos: fotos.map((f) => f.file),
      });
      onEnviado?.(res);
    } catch (e) {
      setError(errorDeAjuste(e, 'No se pudo enviar el ajuste. Inténtalo de nuevo.'));
      setEnviando(false);
    }
  };

  return createPortal(
    <div className="aj-overlay" onClick={() => !enviando && onClose()}>
      <div className="aj-modal" role="dialog" aria-modal="true" aria-labelledby="aj-modal-titulo" onClick={(e) => e.stopPropagation()}>
        <header className="aj-modal-cab">
          <div>
            <h3 id="aj-modal-titulo">Ajustar cotización</h3>
            <p>El cliente debe aceptar el nuevo precio. La cotización anterior queda en el historial.</p>
          </div>
          <button type="button" className="aj-icono-btn" onClick={onClose} disabled={enviando} title="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="aj-modal-cuerpo">
          <div className="aj-segmento" role="tablist">
            <button type="button" role="tab" aria-selected={modo === 'precio'} className={modo === 'precio' ? 'activo' : ''} onClick={() => setModo('precio')}>
              Solo cambiar precio
            </button>
            <button type="button" role="tab" aria-selected={modo === 'desglose'} className={modo === 'desglose' ? 'activo' : ''} onClick={() => setModo('desglose')}>
              Desglosar materiales
            </button>
          </div>

          {modo === 'precio' ? (
            <label className="aj-campo">
              <span>Nuevo precio total</span>
              <input
                className="aj-input aj-input-grande"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                autoFocus
              />
            </label>
          ) : (
            <>
              <TablaFilas titulo="Servicios / mano de obra" filas={servicios} setFilas={setServicios} placeholder="Ej. Cambio de compresor" />
              <TablaFilas titulo="Materiales" filas={materiales} setFilas={setMateriales} placeholder="Ej. Gas R410A (kg)" />
            </>
          )}

          <div className="aj-comparacion">
            <div>
              <span>Precio vigente</span>
              <strong>{dinero(precioVigente)}</strong>
            </div>
            <ArrowRight size={18} />
            <div>
              <span>Nuevo precio</span>
              <strong className="nuevo">{dinero(total)}</strong>
            </div>
            {total > 0 && Math.abs(diferencia) >= 0.01 && (
              <span className={`aj-diferencia ${diferencia > 0 ? 'sube' : 'baja'}`}>
                {diferencia > 0 ? '+' : '−'}{dinero(Math.abs(diferencia))}
              </span>
            )}
          </div>

          <label className="aj-campo">
            <span>Motivo del ajuste</span>
            <textarea
              className="aj-input"
              rows={3}
              maxLength={1000}
              placeholder="Ej. Al revisar, el compresor está dañado y hay que cambiarlo; no basta con la recarga de gas."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </label>

          <div className="aj-campo">
            <span>Fotos del problema <em>(opcional, hasta {MAX_FOTOS})</em></span>
            <div className="aj-fotos">
              {fotos.map((f, i) => (
                <div key={f.url} className="aj-foto">
                  <img src={f.url} alt={`Foto ${i + 1}`} />
                  <button type="button" className="aj-foto-quitar" onClick={() => quitarFoto(i)} title="Quitar foto">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {fotos.length < MAX_FOTOS && (
                <label className="aj-foto aj-foto-agregar">
                  <Camera size={20} />
                  <span>Agregar</span>
                  <input type="file" accept="image/*" multiple hidden onChange={agregarFotos} />
                </label>
              )}
            </div>
          </div>

          {error && <p className="aj-error" role="alert">{error}</p>}
        </div>

        <footer className="aj-modal-pie">
          <button type="button" className="aj-btn secundario" onClick={onClose} disabled={enviando}>Cancelar</button>
          <button type="button" className="aj-btn primario" onClick={enviar} disabled={enviando}>
            <Send size={15} /> {enviando ? 'Enviando…' : 'Enviar al cliente'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default ModalAjusteCotizacion;
