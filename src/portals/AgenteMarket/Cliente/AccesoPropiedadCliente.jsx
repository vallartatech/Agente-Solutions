// Red: el cliente sube el acceso a su propiedad para este trabajo (imagen del QR y/o código).
// Vigencia obligatoria de máximo 7 días; se borra sola al vencer o cuando el trabajo termina o se cancela.
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { KeyRound, QrCode, Plus, Trash2, Eye, X, Upload, ShieldCheck } from 'lucide-react';
import {
  obtenerAccesos, guardarAcceso, borrarAcceso, errorDeAcceso, textoVigencia,
  OPCIONES_VIGENCIA, MAX_DIAS_ACCESO,
} from '../Shared/accesoRedApi';
import VisorAccesoRed from '../Shared/VisorAccesoRed';
import '../../../styles/AgenteMarket/Shared/AccesoPropiedad.css';

const ESTADOS_SIN_ACCESO = ['Listo', 'Finalizado', 'Terminado', 'Completado', 'Cancelado', 'Cancelado_Tecnico', 'Cancelado_Cliente', 'Rechazado'];

// 'YYYY-MM-DDTHH:mm' en hora local, para <input type="datetime-local">
const aLocal = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const FormularioAcceso = ({ workOrderId, slot, onGuardado, onCancelar }) => {
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
    setGuardando(true);
    try {
      const res = await guardarAcceso(workOrderId, { slot, imagen, codigo: codigo.trim(), label: label.trim(), note: note.trim(), validUntil });
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
          {guardando ? 'Guardando…' : 'Guardar acceso'}
        </button>
      </div>
    </div>
  );
};

const AccesoPropiedadCliente = ({ job }) => {
  const [datos, setDatos] = useState(null);
  const [editando, setEditando] = useState(null); // slot que se está agregando
  const [viendo, setViendo] = useState(null);
  const workOrderId = job?.id;
  const abierto = job && !ESTADOS_SIN_ACCESO.includes(job.status);

  const cargar = useCallback(async () => {
    if (!workOrderId) return;
    try {
      setDatos(await obtenerAccesos(workOrderId));
    } catch {
      setDatos(null);
    }
  }, [workOrderId]);

  useEffect(() => {
    setDatos(null);
    setEditando(null);
    if (abierto) cargar();
  }, [cargar, abierto]);

  const cerrarVisor = useCallback(() => setViendo(null), []);

  if (!abierto || !datos) return null;

  const accesos = datos.accesos || [];
  const libre = [1, 2].find((s) => !accesos.some((a) => a.slot === s));

  const borrar = async (slot) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Quitar este acceso?', text: 'El técnico ya no podrá verlo.', icon: 'question',
      showCancelButton: true, confirmButtonText: 'Quitar', cancelButtonText: 'Volver',
      confirmButtonColor: '#dc2626', cancelButtonColor: '#64748b',
    });
    if (!isConfirmed) return;
    try {
      setDatos(await borrarAcceso(workOrderId, slot));
    } catch (e) {
      Swal.fire('No se pudo quitar', await errorDeAcceso(e), 'error');
    }
  };

  return (
    <section className="acr-panel">
      <div className="acr-cab">
        <KeyRound size={18} />
        <div>
          <strong>Acceso a la propiedad</strong>
          <span>¿Hay caseta o QR para entrar? Déjalo aquí si no vas a estar. El técnico lo verá solo cuando llegue.</span>
        </div>
      </div>

      {accesos.map((a) => (
        <div key={a.slot} className="acr-item">
          <span className="acr-item-icono">{a.tiene_imagen ? <QrCode size={18} /> : <KeyRound size={18} />}</span>
          <div className="acr-item-txt">
            <strong>{a.label || (a.tiene_imagen ? 'QR de acceso' : 'Código de acceso')}</strong>
            {a.codigo && <span className="acr-codigo">{a.codigo}</span>}
            <span className="acr-vence">{textoVigencia(a.valid_until)}</span>
          </div>
          {a.tiene_imagen && (
            <button type="button" className="acr-icono-btn" onClick={() => setViendo(a)} title="Ver QR"><Eye size={15} /></button>
          )}
          {datos.puede_editar && (
            <button type="button" className="acr-icono-btn peligro" onClick={() => borrar(a.slot)} title="Quitar acceso"><Trash2 size={15} /></button>
          )}
        </div>
      ))}

      {editando ? (
        <FormularioAcceso
          workOrderId={workOrderId}
          slot={editando}
          onCancelar={() => setEditando(null)}
          onGuardado={(res) => {
            setDatos(res);
            setEditando(null);
            Swal.fire({ icon: 'success', title: 'Acceso guardado', text: 'El técnico lo verá cuando marque que llegó.', confirmButtonColor: '#f26522' });
          }}
        />
      ) : datos.puede_editar && libre && (
        <button type="button" className="acr-agregar" onClick={() => setEditando(libre)}>
          <Plus size={16} /> {accesos.length ? 'Agregar otro acceso' : 'Agregar QR o código de acceso'}
        </button>
      )}

      {viendo && <VisorAccesoRed workOrderId={workOrderId} acceso={viendo} onCerrar={cerrarVisor} />}
    </section>
  );
};

export default AccesoPropiedadCliente;
