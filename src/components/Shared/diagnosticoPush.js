import axios from 'axios';
import Swal from 'sweetalert2';
import { iniciarOneSignal, estaSuscritoOneSignal, revincularUsuarioOneSignal } from './oneSignalPush';

const API = import.meta.env.VITE_API_BASE_URL;

// Estado push de este dispositivo y de la cuenta en OneSignal (lo consulta el servidor)
const leerEstado = async () => {
  const permiso = typeof Notification === 'undefined' ? 'no-soportado' : Notification.permission;
  const sdk = await iniciarOneSignal();
  const suscrito = sdk && estaSuscritoOneSignal();
  let servidor = null;
  try {
    const res = await axios.get(`${API}/notifications/push-status`);
    servidor = res.data;
  } catch {
    servidor = { ok: false, error: 'No se pudo consultar al servidor.' };
  }
  return { permiso, sdk, suscrito, servidor };
};

const fila = (ok, texto) => `<li style="margin:6px 0">${ok ? '✅' : '❌'} ${texto}</li>`;

/**
 * "Revisar mi dispositivo": explica por qué no llegan las push a este usuario y,
 * si el dispositivo está suscrito pero no ligado a su cuenta, lo vuelve a vincular.
 */
export const revisarDispositivoPush = async (userId) => {
  Swal.fire({ title: 'Revisando…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  const e = await leerEstado();
  const srv = e.servidor || {};
  const ligadoEnServidor = srv.ok && srv.activos > 0;

  const lista = [
    fila(e.permiso === 'granted', e.permiso === 'denied'
      ? 'El navegador <b>bloqueó</b> las notificaciones de este sitio (actívalas en el candado de la barra de direcciones)'
      : 'Permiso de notificaciones del navegador'),
    fila(e.sdk, e.sdk ? 'OneSignal cargó en esta página' : 'OneSignal no cargó (¿bloqueador de anuncios o Brave Shields?)'),
    fila(e.suscrito, 'Este dispositivo está suscrito'),
    fila(ligadoEnServidor, srv.ok
      ? (ligadoEnServidor
        ? `Tu cuenta tiene ${srv.activos} dispositivo${srv.activos === 1 ? '' : 's'} listo${srv.activos === 1 ? '' : 's'} para recibir avisos`
        : 'Tu cuenta <b>no tiene ningún dispositivo vinculado</b> en OneSignal')
      : `No se pudo revisar tu cuenta: ${srv.error || 'error desconocido'}`),
  ].join('');

  // Se puede reparar si el navegador ya dio permiso y OneSignal cargó
  const reparable = e.permiso === 'granted' && e.sdk && !ligadoEnServidor;

  const r = await Swal.fire({
    icon: ligadoEnServidor ? 'success' : 'warning',
    title: ligadoEnServidor ? 'Tu dispositivo está bien' : 'Este dispositivo no recibe avisos',
    html: `<ul style="list-style:none;padding:0;margin:0;text-align:left;font-size:0.92rem">${lista}</ul>`
      + (ligadoEnServidor
        ? '<p style="margin-top:12px;font-size:0.85rem;color:#64748b">Si el aviso no llegó a otras personas, cada una debe revisar su dispositivo desde su cuenta.</p>'
        : ''),
    showCancelButton: reparable,
    confirmButtonText: reparable ? 'Vincular este dispositivo' : 'Entendido',
    cancelButtonText: 'Cerrar',
    confirmButtonColor: '#f97316',
  });

  if (!reparable || !r.isConfirmed) return;

  Swal.fire({ title: 'Vinculando…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  await revincularUsuarioOneSignal(userId);
  // OneSignal tarda unos segundos en reflejar el vínculo
  await new Promise(res => setTimeout(res, 2500));
  const despues = await leerEstado();
  const listo = despues.servidor?.ok && despues.servidor.activos > 0;
  Swal.fire({
    icon: listo ? 'success' : 'error',
    title: listo ? '¡Dispositivo vinculado!' : 'Aún no quedó vinculado',
    text: listo
      ? 'Desde ahora te llegarán los avisos en este dispositivo.'
      : 'Recarga la página y vuelve a tocar "Activar" en la campanita. Si sigue igual, revisa que el navegador no bloquee OneSignal.',
    confirmButtonColor: '#f97316',
  });
};
