// Red: si un técnico le canceló un servicio al cliente, se abre sola la ventana para calificarlo.
// Es obligatoria (no se puede cerrar) y desde ahí el cliente elige reenviar a la red o cancelar el servicio.
// Se monta en varias pantallas del cliente; solo una a la vez muestra la ventana.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import ModalCalificarTecnico from '../../../components/Shared/ModalCalificarTecnico';

const API = import.meta.env.VITE_API_BASE_URL;
const CADA_MS = 15000;

// Evita que dos pantallas montadas a la vez (p. ej. inicio + calendario) abran la ventana dos veces
let ventanaAbierta = false;

// Otras partes de la app pueden pedir que se revise ya (p. ej. el backend dijo "califica primero")
export const revisarCancelacionesPendientes = () => window.dispatchEvent(new Event('red:revisar-cancelaciones'));

const AvisoCancelacionTecnico = ({ onResuelto }) => {
  const [pendiente, setPendiente] = useState(null);
  const propia = useRef(false);

  const revisar = useCallback(async () => {
    if (ventanaAbierta) return;
    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${API}/client/pending-cancellations`, { headers: { Authorization: `Bearer ${token}` } });
      const primera = res.data?.success ? (res.data.cancellations || []).find(c => c.technician?.id && c.work_order_id) : null;
      if (primera && !ventanaAbierta) {
        ventanaAbierta = true;
        propia.current = true;
        setPendiente(primera);
      }
    } catch {
      // Sin conexión: se vuelve a intentar en la siguiente vuelta
    }
  }, []);

  useEffect(() => {
    revisar();
    const intervalo = setInterval(revisar, CADA_MS);
    window.addEventListener('red:revisar-cancelaciones', revisar);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('red:revisar-cancelaciones', revisar);
      if (propia.current) ventanaAbierta = false;
    };
  }, [revisar]);

  if (!pendiente) return null;

  const terminar = (resultado) => {
    ventanaAbierta = false;
    propia.current = false;
    setPendiente(null);
    onResuelto?.(resultado);
  };

  return (
    <ModalCalificarTecnico
      isOpen
      onClose={() => {}}
      technician={pendiente.technician}
      workOrderId={pendiente.work_order_id}
      onlyTime
      isCancellation
      cancellationReason={pendiente.reason}
      onSuccess={terminar}
    />
  );
};

export default AvisoCancelacionTecnico;
