// Red: el cliente sube el acceso a su propiedad para este trabajo (imagen del QR y/o código).
// Aparece hasta que un técnico tiene asignado el trabajo: en algunas propiedades el QR se genera
// con el nombre de quien entra. Vigencia obligatoria de máximo 7 días; se borra sola al vencer
// o cuando el trabajo termina o se cancela.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { KeyRound, QrCode, Plus, Trash2, Eye, UserRound } from 'lucide-react';
import FormularioAcceso from './FormularioAcceso';
import {
  obtenerAccesos, borrarAcceso, errorDeAcceso, textoVigencia,
} from '../Shared/accesoRedApi';
import VisorAccesoRed from '../Shared/VisorAccesoRed';
import '../../../styles/AgenteMarket/Shared/AccesoPropiedad.css';

const ESTADOS_SIN_ACCESO = ['Listo', 'Finalizado', 'Terminado', 'Completado', 'Cancelado', 'Cancelado_Tecnico', 'Cancelado_Cliente', 'Rechazado'];

// "No tiene": se recuerda solo en este navegador, para no volver a preguntar en este trabajo
const claveNoTiene = (id) => `red_acceso_no_tiene_${id}`;
const leerNoTiene = (id) => {
  try { return localStorage.getItem(claveNoTiene(id)) === '1'; } catch { return false; }
};
const guardarNoTiene = (id, valor) => {
  try {
    if (valor) localStorage.setItem(claveNoTiene(id), '1');
    else localStorage.removeItem(claveNoTiene(id));
  } catch { /* sin almacenamiento: solo se vuelve a preguntar */ }
};
// El cliente respondió "No tiene" en el aviso de cotización aceptada
export const marcarSinAcceso = (id) => guardarNoTiene(id, true);

/**
 * - job: el trabajo (solo se muestra con técnico asignado: job.is_accepted)
 * - nombres: quién va a la propiedad (para generar el QR a su nombre)
 * - abrirAlCargar: abre el formulario de una vez (viene de "Agregar acceso" al aceptar la cotización)
 */
const AccesoPropiedadCliente = ({ job, nombres = [], abrirAlCargar = false }) => {
  const [datos, setDatos] = useState(null);
  const [editando, setEditando] = useState(null); // slot que se está agregando
  const [viendo, setViendo] = useState(null);
  const [noTiene, setNoTiene] = useState(() => leerNoTiene(job?.id));
  const panelRef = useRef(null);
  const workOrderId = job?.id;
  const abierto = Boolean(job?.is_accepted) && !ESTADOS_SIN_ACCESO.includes(job.status);

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
    setNoTiene(leerNoTiene(workOrderId));
    if (abierto) cargar();
  }, [cargar, abierto, workOrderId]);

  // Viene de aceptar la cotización con "Agregar acceso": abrir el formulario y llevarlo a la vista
  useEffect(() => {
    if (!abrirAlCargar || !datos?.puede_editar) return;
    const libre = [1, 2].find((s) => !(datos.accesos || []).some((a) => a.slot === s));
    if (!libre) return;
    setNoTiene(false);
    setEditando(libre);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [abrirAlCargar, datos]);

  const cerrarVisor = useCallback(() => setViendo(null), []);

  if (!abierto || !datos) return null;

  const accesos = datos.accesos || [];
  const libre = [1, 2].find((s) => !accesos.some((a) => a.slot === s));
  // Sin accesos y sin responder: se pregunta de forma destacada
  const preguntando = datos.puede_editar && accesos.length === 0 && !editando && !noTiene;
  const quienes = nombres.filter(Boolean);

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

  const responderNoTiene = (valor) => {
    guardarNoTiene(workOrderId, valor);
    setNoTiene(valor);
  };

  return (
    <section ref={panelRef} className={`acr-panel ${preguntando ? 'acr-pregunta' : ''}`}>
      <div className="acr-cab">
        <KeyRound size={18} />
        <div>
          <strong>
            {accesos.length ? 'Acceso a la propiedad' : '¿Tu propiedad tiene algún QR o código de acceso? Agrégalo aquí'}
          </strong>
          <span>
            Para la caseta o el portón, si no vas a estar. El técnico lo verá solo cuando llegue y se borra si el servicio se cancela.
          </span>
        </div>
      </div>

      {/* Algunas propiedades generan el QR con el nombre de quien entra */}
      {quienes.length > 0 && (accesos.length === 0 || editando) && (
        <div className="acr-quien">
          <UserRound size={15} />
          <span>
            Si tu caseta pide un nombre, genera el QR a nombre de <strong>{quienes.join(', ')}</strong>.
          </span>
        </div>
      )}

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
            responderNoTiene(false);
            Swal.fire({ icon: 'success', title: 'Acceso guardado', text: 'El técnico lo verá cuando marque que llegó.', confirmButtonColor: '#f26522' });
          }}
        />
      ) : preguntando ? (
        <div className="acr-opciones">
          <button type="button" className="acr-opcion si" onClick={() => setEditando(libre)}>
            <QrCode size={15} /> Sí, agregarlo
          </button>
          <button type="button" className="acr-opcion" onClick={() => responderNoTiene(true)}>
            No tiene
          </button>
        </div>
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
