// Red: panel del tablero del técnico para ajustar la cotización ya aceptada
// (proponer, ver si el cliente respondió, decidir tras un rechazo e historial).
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { FilePenLine, Hourglass, XCircle, CheckCircle2, Undo2 } from 'lucide-react';
import {
  obtenerAjustes, retirarAjuste, decidirTrasRechazo, errorDeAjuste, dinero,
} from '../Shared/ajusteCotizacionApi';
import HistorialAjustes from '../Shared/HistorialAjustes';
import ModalAjusteCotizacion from './ModalAjusteCotizacion';
import '../../../styles/AgenteMarket/Shared/AjusteCotizacion.css';

const confirmar = async (titulo, texto, boton) => (await Swal.fire({
  title: titulo,
  text: texto,
  icon: 'question',
  showCancelButton: true,
  confirmButtonText: boton,
  cancelButtonText: 'Volver',
  confirmButtonColor: '#f26522',
  cancelButtonColor: '#64748b',
})).isConfirmed;

/**
 * onCambio(resumen): para que el tablero actualice el precio y sepa si hay un ajuste pendiente.
 * onCancelado(): el técnico canceló sin penalización tras el rechazo.
 */
const AjusteCotizacionTecnico = ({ job, completado, iniciado, onCambio, onCancelado }) => {
  const [datos, setDatos] = useState(null);
  const [abrirModal, setAbrirModal] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const aplicar = useCallback((res) => {
    setDatos(res);
    onCambio?.(res);
  }, [onCambio]);

  const cargar = useCallback(async () => {
    if (!job?.id) return;
    try {
      aplicar(await obtenerAjustes(job.id));
    } catch {
      setDatos(null); // sin la tabla o sin acceso: el panel no se muestra
    }
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDatos(null);
    cargar();
  }, [cargar]);

  if (!datos || datos.precio_vigente === null || datos.precio_vigente === undefined) return null;

  const pendiente = datos.ajuste_pendiente;
  const porDecidir = datos.ajuste_por_decidir;
  const ajustado = Math.abs(Number(datos.precio_vigente) - Number(datos.precio_original)) >= 0.01;

  const retirar = async () => {
    if (!await confirmar('¿Retirar el ajuste?', `El precio seguirá en ${dinero(datos.precio_vigente)}.`, 'Retirar')) return;
    setOcupado(true);
    try {
      aplicar(await retirarAjuste(pendiente.id));
    } catch (e) {
      Swal.fire('No se pudo retirar', errorDeAjuste(e), 'error');
    } finally {
      setOcupado(false);
    }
  };

  const decidir = async (decision) => {
    const textos = decision === 'continuar'
      ? ['¿Continuar con el precio vigente?', `Harás el trabajo por ${dinero(datos.precio_vigente)}.`, 'Continuar']
      : ['¿Cancelar el servicio?', 'Se cancela sin penalización y le avisamos al cliente para que pueda publicarlo de nuevo.', 'Cancelar servicio'];
    if (!await confirmar(...textos)) return;
    setOcupado(true);
    try {
      const res = await decidirTrasRechazo(porDecidir.id, decision);
      if (res.cancelado) {
        await Swal.fire({ icon: 'success', title: 'Servicio cancelado', text: res.message, confirmButtonColor: '#f26522' });
        onCancelado?.();
        return;
      }
      aplicar(res);
    } catch (e) {
      Swal.fire('No se pudo guardar', errorDeAjuste(e), 'error');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="rd-panel aj-panel">
      {pendiente && (
        <div className="aj-aviso pendiente">
          <Hourglass size={17} />
          <div>
            <strong>Ajuste v{pendiente.version} enviado: {dinero(pendiente.precio_anterior)} → {dinero(pendiente.precio)}</strong>
            <span>
              Esperando que el cliente lo acepte.
              {iniciado ? ' Puedes seguir trabajando mientras responde.' : ' Podrás comenzar el trabajo cuando responda.'}
            </span>
          </div>
          <button type="button" className="aj-link" onClick={retirar} disabled={ocupado}>
            <Undo2 size={14} /> Retirar
          </button>
        </div>
      )}

      {porDecidir && (
        <div className="aj-aviso rechazado">
          <XCircle size={17} />
          <div>
            <strong>El cliente rechazó el ajuste de {dinero(porDecidir.precio)}</strong>
            <span>Decide si haces el trabajo con el precio vigente o cancelas sin penalización.</span>
            <div className="aj-aviso-acciones">
              <button type="button" className="aj-btn primario" onClick={() => decidir('continuar')} disabled={ocupado}>
                Continuar con {dinero(datos.precio_vigente)}
              </button>
              <button type="button" className="aj-btn peligro" onClick={() => decidir('cancelar')} disabled={ocupado}>
                Cancelar sin penalización
              </button>
            </div>
          </div>
        </div>
      )}

      {!pendiente && !porDecidir && ajustado && (
        <div className="aj-aviso aceptado">
          <CheckCircle2 size={17} />
          <div>
            <strong>Precio ajustado a {dinero(datos.precio_vigente)}</strong>
            <span>La cotización original era de {dinero(datos.precio_original)}.</span>
          </div>
        </div>
      )}

      {datos.puede_ajustar && !completado && (
        <button type="button" className="aj-btn-ajustar" onClick={() => setAbrirModal(true)}>
          <FilePenLine size={16} />
          <span>
            <strong>Ajustar cotización</strong>
            <small>¿El problema es más grande? Propón un nuevo precio al cliente.</small>
          </span>
        </button>
      )}

      <HistorialAjustes ajustes={datos.ajustes} precioOriginal={datos.precio_original} />

      {abrirModal && (
        <ModalAjusteCotizacion
          workOrderId={job.id}
          precioVigente={datos.precio_vigente}
          onClose={() => setAbrirModal(false)}
          onEnviado={(res) => {
            setAbrirModal(false);
            aplicar(res);
            Swal.fire({ icon: 'success', title: 'Ajuste enviado', text: res.message, confirmButtonColor: '#f26522' });
          }}
        />
      )}
    </div>
  );
};

export default AjusteCotizacionTecnico;
