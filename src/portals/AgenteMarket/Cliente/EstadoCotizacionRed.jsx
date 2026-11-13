// Red: estado extra de una cotización para el cliente (retirada, esperando confirmación del técnico,
// o "pedirá confirmación" si es de antes de reenviar el trabajo a la red).
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { Hourglass, Undo2, RotateCcw } from 'lucide-react';
import {
  cotizacionRetirada, esperandoConfirmacion, pideConfirmacion, dejarDeEsperarTecnico, errorDeRed,
} from '../Shared/redCancelacionApi';
import '../../../styles/AgenteMarket/Shared/AjusteCotizacion.css';

// ¿Se puede aceptar esta cotización ahora?
export const cotizacionAceptable = (quote) => !cotizacionRetirada(quote) && !esperandoConfirmacion(quote);

const EstadoCotizacionRed = ({ quote, job, onCambio }) => {
  const [ocupado, setOcupado] = useState(false);
  if (!quote) return null;

  if (cotizacionRetirada(quote)) {
    return <div className="aj-estado-cot retirada"><Undo2 size={14} /> El técnico retiró esta cotización</div>;
  }

  if (esperandoConfirmacion(quote)) {
    const dejar = async () => {
      setOcupado(true);
      try {
        const res = await dejarDeEsperarTecnico(quote.id);
        Swal.fire({ icon: 'success', title: 'Listo', text: res.message, confirmButtonColor: '#f26522' });
        onCambio?.();
      } catch (e) {
        Swal.fire('No se pudo completar', errorDeRed(e), 'error');
      } finally {
        setOcupado(false);
      }
    };
    return (
      <div className="aj-estado-cot esperando">
        <Hourglass size={14} />
        <span>Esperando que el técnico confirme que sigue disponible</span>
        <button type="button" className="aj-link" onClick={dejar} disabled={ocupado}>Dejar de esperar</button>
      </div>
    );
  }

  if (quote.status === 'pending' && pideConfirmacion(quote, job)) {
    return <div className="aj-estado-cot anterior"><RotateCcw size={14} /> Cotización anterior: el técnico confirmará si sigue disponible</div>;
  }

  return null;
};

export default EstadoCotizacionRed;
