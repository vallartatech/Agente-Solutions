// Red: el cliente cancela un trabajo asignado (antes de que comience) y después elige
// reenviarlo a la red o cancelarlo por completo.
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { Ban, Globe, XCircle } from 'lucide-react';
import { cancelarServicioCliente, resolverCancelado, errorDeRed } from '../Shared/redCancelacionApi';
import { revisarCancelacionesPendientes } from './AvisoCancelacionTecnico';
import '../../../styles/AgenteMarket/Shared/AjusteCotizacion.css';

const pedirMotivo = async () => {
  const { isConfirmed, value } = await Swal.fire({
    title: '¿Por qué cancelas el servicio?',
    text: 'Se lo enviaremos al técnico. Después podrás reenviar la solicitud a la red o cancelarla por completo.',
    input: 'textarea',
    inputPlaceholder: 'Ej. Ya se resolvió el problema / Cambié de fecha / Encontré otra opción',
    inputAttributes: { maxlength: 1000 },
    showCancelButton: true,
    confirmButtonText: 'Cancelar servicio',
    cancelButtonText: 'Volver',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    inputValidator: (v) => (!v || v.trim().length < 5 ? 'Escribe el motivo (al menos 5 letras).' : undefined),
  });
  return isConfirmed ? value.trim() : null;
};

/**
 * job: trabajo de la red del cliente (status, id, cancellation_reason).
 * onCambio(): recargar la lista; onCerrar(): cerrar el detalle (opcional).
 */
const CancelacionServicioCliente = ({ job, onCambio, onCerrar }) => {
  const [ocupado, setOcupado] = useState(false);
  if (!job?.id) return null;

  const cancelar = async () => {
    const motivo = await pedirMotivo();
    if (!motivo) return;
    setOcupado(true);
    try {
      const res = await cancelarServicioCliente(job.id, motivo);
      await Swal.fire({ icon: 'success', title: 'Servicio cancelado', text: res.message, confirmButtonColor: '#f26522' });
      onCambio?.();
    } catch (e) {
      Swal.fire('No se pudo cancelar', errorDeRed(e), 'error');
    } finally {
      setOcupado(false);
    }
  };

  const resolver = async (action) => {
    if (action === 'delete') {
      const { isConfirmed } = await Swal.fire({
        title: '¿Cancelar por completo?',
        text: 'La solicitud se cierra y ya no la verán los técnicos. Quedará en tu historial.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Cancelar por completo',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
      });
      if (!isConfirmed) return;
    }
    setOcupado(true);
    try {
      const res = await resolverCancelado(job.id, action);
      await Swal.fire({ icon: 'success', title: action === 'reopen' ? 'Reenviado a la red' : 'Servicio cancelado', text: res.message, confirmButtonColor: '#f26522' });
      onCambio?.();
      if (action === 'delete') onCerrar?.();
    } catch (e) {
      // El técnico canceló y todavía no lo califica: se abre la ventana obligatoria
      if (e?.response?.data?.reason === 'calificacion_pendiente') {
        revisarCancelacionesPendientes();
        Swal.fire({ icon: 'info', title: 'Primero califica al técnico', text: errorDeRed(e), confirmButtonColor: '#f26522' });
      } else {
        Swal.fire('No se pudo completar', errorDeRed(e), 'error');
      }
    } finally {
      setOcupado(false);
    }
  };

  // Lo canceló el cliente o el técnico: elegir qué sigue
  const canceloElTecnico = job.status === 'Cancelado_Tecnico';
  if (job.status === 'Cancelado_Cliente' || canceloElTecnico) {
    return (
      <div className="aj-cliente">
        <div className="aj-propuesta cancelado">
          <div className="aj-propuesta-cab">
            <Ban size={18} />
            <strong>{canceloElTecnico ? 'El técnico canceló este servicio' : 'Cancelaste este servicio'}</strong>
          </div>
          {job.cancellation_reason && <p className="aj-propuesta-motivo"><b>Motivo:</b> {job.cancellation_reason}</p>}
          <p className="aj-propuesta-motivo">
            Si lo reenvías a la red, podrás elegir una de las cotizaciones que otros técnicos ya te enviaron (si siguen disponibles) o esperar nuevas.
          </p>
          <div className="aj-propuesta-acciones">
            <button type="button" className="aj-btn primario" onClick={() => resolver('reopen')} disabled={ocupado}>
              <Globe size={16} /> Reenviar a la red
            </button>
            <button type="button" className="aj-btn peligro" onClick={() => resolver('delete')} disabled={ocupado}>
              <XCircle size={16} /> Cancelar por completo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Asignado y sin comenzar: se puede cancelar
  if (job.status === 'Asignado') {
    return (
      <button type="button" className="aj-btn peligro aj-btn-cancelar-servicio" onClick={cancelar} disabled={ocupado}>
        <Ban size={15} /> {ocupado ? 'Cancelando…' : 'Cancelar servicio'}
      </button>
    );
  }

  return null;
};

export default CancelacionServicioCliente;
