// Red: formulario de un acceso a la propiedad (imagen del QR y/o código, vigencia de máximo 7 días).
// - Con workOrderId lo guarda en ese trabajo (detalle del trabajo).
// - Con borrador solo lo valida y lo devuelve: "Reportar problema" lo guarda en cada trabajo al publicar.
import React, { useEffect, useState } from 'react';
import { X, Upload, ShieldCheck } from 'lucide-react';
import { guardarAcceso, errorDeAcceso, OPCIONES_VIGENCIA, MAX_DIAS_ACCESO } from '../Shared/accesoRedApi';
import '../../../styles/AgenteMarket/Shared/AccesoPropiedad.css';

// 'YYYY-MM-DDTHH:mm' en hora local, para <input type="datetime-local">
const aLocal = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const FormularioAcceso = ({ workOrderId, slot, borrador = false, onGuardado, onCancelar }) => {
  const [label, setLabel] = useState('');
  const [codigo, setCodigo] = useState('');
  const [note, setNote] = useState('');
  const [imagen, setImagen] = useState(null);
  const [vista, setVista] = useState(null);
  const [dias, setDias] = useState(1);
  const [fecha, setFecha] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => vista && URL.revokeObjectURL(vista), [vista]);

  const elegirImagen = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return setError('El QR debe ser una imagen JPG, PNG o WEBP.');
    if (f.size > 5 * 1024 * 1024) return setError('La imagen no debe pesar más de 5 MB.');
    setError('');
    setImagen(f);
    setVista(URL.createObjectURL(f));
  };

  const vence = () => {
    if (dias === 'fecha') return fecha ? new Date(fecha) : null;
    return new Date(Date.now() + dias * 24 * 3600 * 1000);
  };

  const guardar = async () => {
    setError('');
    if (!imagen && !codigo.trim()) return setError('Sube la imagen del QR o escribe el código de acceso.');
    const validUntil = vence();
    if (!validUntil || isNaN(validUntil)) return setError('Elige hasta cuándo es válido el acceso.');
    if (validUntil <= new Date()) return setError('La vigencia debe ser una fecha futura.');
    if (validUntil > new Date(Date.now() + MAX_DIAS_ACCESO * 24 * 3600 * 1000 + 60000)) {
      return setError(`Por seguridad, el acceso puede durar máximo ${MAX_DIAS_ACCESO} días.`);
    }
    const datos = { slot, imagen, codigo: codigo.trim(), label: label.trim(), note: note.trim(), validUntil };
    if (borrador) return onGuardado(datos);
    setGuardando(true);
    try {
      const res = await guardarAcceso(workOrderId, datos);
      onGuardado(res);
    } catch (e) {
      setError(await errorDeAcceso(e, 'No se pudo guardar el acceso.'));
      setGuardando(false);
    }
  };

  const ahora = new Date();
  return (
    <div className="acr-form">
      <label className="acr-campo">
        <span>Nombre del acceso <em>(opcional)</em></span>
        <input className="acr-input" maxLength={80} placeholder="Ej. Caseta, Edificio, Portón" value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>

      <div className="acr-campo">
        <span>Imagen del QR</span>
        {vista ? (
          <div className="acr-vista">
            <img src={vista} alt="Vista previa del QR" />
            <button type="button" className="acr-icono-btn" onClick={() => { setImagen(null); setVista(null); }} title="Quitar imagen"><X size={14} /></button>
          </div>
        ) : (
          <label className="acr-subir">
            <Upload size={18} /> Subir captura o foto del QR
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={elegirImagen} />
          </label>
        )}
      </div>

      <label className="acr-campo">
        <span>Código de acceso <em>(PIN, número de caseta…)</em></span>
        <input className="acr-input" maxLength={120} placeholder="Ej. 4821#" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="off" />
      </label>

      <div className="acr-campo">
        <span>¿Hasta cuándo es válido?</span>
        <div className="acr-chips" role="radiogroup">
          {OPCIONES_VIGENCIA.map((o) => (
            <button key={o.dias} type="button" role="radio" aria-checked={dias === o.dias} className={dias === o.dias ? 'activo' : ''} onClick={() => setDias(o.dias)}>
              {o.texto}
            </button>
          ))}
          <button type="button" role="radio" aria-checked={dias === 'fecha'} className={dias === 'fecha' ? 'activo' : ''} onClick={() => setDias('fecha')}>
            Elegir fecha
          </button>
        </div>
        {dias === 'fecha' && (
          <input
            className="acr-input"
            type="datetime-local"
            min={aLocal(ahora)}
            max={aLocal(new Date(ahora.getTime() + MAX_DIAS_ACCESO * 24 * 3600 * 1000))}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        )}
        <small className="acr-ayuda"><ShieldCheck size={13} /> Por seguridad vence en máximo {MAX_DIAS_ACCESO} días y se borra al terminar el trabajo.</small>
      </div>

      <label className="acr-campo">
        <span>Indicaciones <em>(opcional)</em></span>
        <textarea className="acr-input" rows={2} maxLength={500} placeholder="Ej. Muéstralo en la caseta; pregunta por Don José." value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error && <p className="acr-error" role="alert">{error}</p>}

      <div className="acr-acciones">
        <button type="button" className="acr-btn secundario" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button type="button" className="acr-btn primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : borrador ? 'Agregar acceso' : 'Guardar acceso'}
        </button>
      </div>
    </div>
  );
};

export default FormularioAcceso;
