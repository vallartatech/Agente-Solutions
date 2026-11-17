// Red: cuando el técnico modifica el horario de la visita, al cliente se le abre sola una ventana
// avisándole del cambio (antes → ahora) para que lo confirme o proponga otro.
// Se basa en la notificación pendiente "red_horario_modificado": al cerrarla queda leída y no vuelve a salir.
// Se monta en varias pantallas del cliente; solo una a la vez muestra la ventana.
import { useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { mostrarAviso, pedirTexto } from '../../../utils/dialogos';

const API = import.meta.env.VITE_API_BASE_URL;
const CADA_MS = 15000;
const NARANJA = '#f26522';
const GRIS = '#94a3b8';

let ventanaAbierta = false;

const authHeaders = () => {
  const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : null;
};

const escapar = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fechaLarga = (valor) => {
  if (!valor) return '';
  const d = new Date(String(valor).replace(' ', 'T'));
  return isNaN(d.getTime()) ? '' : d.toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true });
};

const AvisoCambioHorario = ({ onResuelto }) => {
  // En ref: el padre pasa una función nueva en cada render y no debe reiniciar el sondeo
  const onResueltoRef = useRef(onResuelto);
  onResueltoRef.current = onResuelto;

  const revisar = useCallback(async () => {
    if (ventanaAbierta || Swal.isVisible()) return;
    const headers = authHeaders();
    if (!headers) return;

    let aviso = null;
    try {
      const { data } = await axios.get(`${API}/notifications/unread`, { headers });
      const lista = Array.isArray(data?.notifications) ? data.notifications : (Array.isArray(data) ? data : (data?.data || []));
      aviso = lista.find(n => (n.data?.alert_type || n.alert_type) === 'red_horario_modificado');
    } catch {
      return; // sin conexión: se reintenta en la siguiente vuelta
    }
    if (!aviso || ventanaAbierta || Swal.isVisible()) return;
    ventanaAbierta = true;

    const d = aviso.data || aviso;
    const antes = fechaLarga(d.horario_anterior);
    const ahora = fechaLarga(d.horario_nuevo);

    const r = await Swal.fire({
      icon: 'info',
      title: 'El técnico modificó el horario',
      html: `
        <div style="text-align:left;font-size:0.92rem;color:#334155;line-height:1.55;">
          <p style="margin:0 0 10px;"><strong>${escapar(d.tecnico_name || 'Tu técnico')}</strong> cambió la hora de la visita de <strong>${escapar(d.trabajo || 'tu servicio')}</strong>.</p>
          ${antes ? `<div style="padding:8px 12px;border-radius:12px;background:#f1f5f9;margin-bottom:6px;"><small style="color:#64748b;">Antes</small><br><span style="text-decoration:line-through;color:#64748b;">${escapar(antes)}</span></div>` : ''}
          <div style="padding:8px 12px;border-radius:12px;background:#fff7ed;border:1.5px solid #fed7aa;"><small style="color:#c2410c;">Nuevo horario</small><br><strong style="color:#0f172a;">${escapar(ahora)}</strong></div>
          ${d.nota ? `<p style="margin:10px 0 0;color:#475569;">Nota del técnico: “${escapar(d.nota)}”</p>` : ''}
        </div>`,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Confirmar nuevo horario',
      denyButtonText: 'Proponer otro',
      cancelButtonText: 'Lo reviso después',
      confirmButtonColor: NARANJA,
      denyButtonColor: '#0f172a',
      cancelButtonColor: GRIS,
      allowOutsideClick: false,
    });

    // Visto: la notificación no vuelve a abrir la ventana
    try {
      await axios.put(`${API}/notifications/${aviso.id}/read`, {}, { headers });
    } catch {
      // si falla, se mostrará de nuevo en la siguiente vuelta
    }

    let accion = null;
    let nota = '';
    if (r.isConfirmed) accion = 'confirm';
    if (r.isDenied) {
      nota = await pedirTexto('Escribe una breve nota sobre qué horario te queda mejor:');
      if (nota !== null) accion = 'reschedule';
    }

    if (accion && d.work_order_id) {
      try {
        const res = await axios.post(
          `${API}/mercado-trabajos/${d.work_order_id}/responder-visita-cliente`,
          { action: accion, message: nota || '' },
          { headers }
        );
        if (res.data?.success) await mostrarAviso('✅ ' + res.data.message);
      } catch {
        await mostrarAviso('Hubo un error al responder el horario. Puedes hacerlo desde el detalle del servicio.');
      }
    }

    ventanaAbierta = false;
    window.dispatchEvent(new Event('notif_update'));
    onResueltoRef.current?.();
  }, []);

  useEffect(() => {
    revisar();
    const intervalo = setInterval(revisar, CADA_MS);
    return () => clearInterval(intervalo);
  }, [revisar]);

  return null;
};

export default AvisoCambioHorario;
