// Red: el dueño ve el ajuste de precio que propone el técnico y lo acepta o lo rechaza
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { ArrowRight, Check, X, FilePenLine, CheckCircle2, Hourglass } from 'lucide-react';
import { obtenerAjustes, responderAjuste, errorDeAjuste, dinero } from '../Shared/ajusteCotizacionApi';
import HistorialAjustes, { ArchivoAjuste, DesgloseAjuste, FotosAjuste } from '../Shared/HistorialAjustes';
import '../../../styles/AgenteMarket/Shared/AjusteCotizacion.css';

const AjusteCotizacionCliente = ({ workOrderId, onCambio }) => {
  const [datos, setDatos] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    if (!workOrderId) return;
    try {
      setDatos(await obtenerAjustes(workOrderId));
    } catch {
      setDatos(null);
    }
  }, [workOrderId]);

  useEffect(() => {
    setDatos(null);
    cargar();
  }, [cargar]);

  if (!datos?.ajustes?.length) return null;

  const pendiente = datos.ajuste_pendiente;
  const porDecidir = datos.ajuste_por_decidir;
  const ajustado = Math.abs(Number(datos.precio_vigente) - Number(datos.precio_original)) >= 0.01;

  const responder = async (accion) => {
    const acepta = accion === 'aceptar';
    const { isConfirmed } = await Swal.fire({
      title: acepta ? '¿Aceptar el nuevo precio?' : '¿Rechazar el ajuste?',
      text: acepta
        ? `El precio del trabajo pasará de ${dinero(pendiente.precio_anterior)} a ${dinero(pendiente.precio)}.`
        : `El precio sigue en ${dinero(pendiente.precio_anterior)}. El técnico decidirá si continúa con ese precio o cancela el servicio.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: acepta ? 'Aceptar precio' : 'Rechazar',
      cancelButtonText: 'Volver',
      confirmButtonColor: acepta ? '#16a34a' : '#dc2626',
      cancelButtonColor: '#64748b',
    });
    if (!isConfirmed) return;

    setOcupado(true);
    try {
      const res = await responderAjuste(pendiente.id, accion);
      setDatos(res);
      onCambio?.(res);
      Swal.fire({ icon: 'success', title: acepta ? 'Precio aceptado' : 'Ajuste rechazado', text: res.message, confirmButtonColor: '#f26522' });
    } catch (e) {
      Swal.fire('No se pudo responder', errorDeAjuste(e), 'error');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="aj-cliente">
      {pendiente ? (
        <div className="aj-propuesta">
          <div className="aj-propuesta-cab">
            <FilePenLine size={18} />
            <strong>El técnico propone ajustar el precio</strong>
          </div>

          <div className="aj-comparacion">
            <div>
              <span>Precio aceptado</span>
              <strong className="tachado">{dinero(pendiente.precio_anterior)}</strong>
            </div>
            <ArrowRight size={18} />
            <div>
              <span>Nuevo precio</span>
              <strong className="nuevo">{dinero(pendiente.precio)}</strong>
            </div>
          </div>

          <p className="aj-propuesta-motivo"><b>Motivo:</b> {pendiente.motivo}</p>
          <ArchivoAjuste ajuste={pendiente} />
          <DesgloseAjuste desglose={pendiente.desglose} conIva={pendiente.con_iva} />
          <FotosAjuste fotos={pendiente.fotos} />

          <div className="aj-propuesta-acciones">
            <button type="button" className="aj-btn exito" onClick={() => responder('aceptar')} disabled={ocupado}>
              <Check size={16} /> Aceptar nuevo precio
            </button>
            <button type="button" className="aj-btn secundario" onClick={() => responder('rechazar')} disabled={ocupado}>
              <X size={16} /> Rechazar
            </button>
          </div>
          <span className="aj-nota">El técnico no comenzará el trabajo hasta que respondas.</span>
        </div>
      ) : porDecidir ? (
        <div className="aj-aviso pendiente">
          <Hourglass size={17} />
          <div>
            <strong>Rechazaste el ajuste de {dinero(porDecidir.precio)}</strong>
            <span>El técnico decidirá si continúa con {dinero(datos.precio_vigente)} o cancela el servicio. Te avisaremos.</span>
          </div>
        </div>
      ) : ajustado ? (
        <div className="aj-aviso aceptado">
          <CheckCircle2 size={17} />
          <div>
            <strong>Precio vigente: {dinero(datos.precio_vigente)}</strong>
            <span>La cotización original era de {dinero(datos.precio_original)}.</span>
          </div>
        </div>
      ) : null}

      <HistorialAjustes ajustes={datos.ajustes} precioOriginal={datos.precio_original} />
    </div>
  );
};

export default AjusteCotizacionCliente;
