// Notificaciones push en la app de iPhone (Capacitor). El push web de OneSignal no funciona dentro
// de la app, así que el plugin oficial pide permiso y entrega el token de APNs, y el backend lo da de
// alta en OneSignal a nombre del usuario (external_id). Así le llegan los mismos avisos que en la web.
import axios from 'axios';
import { PushNotifications } from '@capacitor/push-notifications';
import { esIOS, URL_PUBLICA } from '../../plataforma';

const CLAVE = 'agente_push_ios'; // { userId, subscriptionId }
const ESPERA_TOKEN_MS = 15000;

const leerGuardado = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || 'null');
  } catch {
    return null;
  }
};

// Pide el token a iOS (llega por el evento "registration")
const pedirToken = () => new Promise((resolve, reject) => {
  let listo = false;
  const handles = [];
  const terminar = (fn, valor) => {
    if (listo) return;
    listo = true;
    handles.forEach((h) => h.then((x) => x.remove()).catch(() => {}));
    fn(valor);
  };
  handles.push(PushNotifications.addListener('registration', (t) => terminar(resolve, t.value)));
  handles.push(PushNotifications.addListener('registrationError', (e) => terminar(reject, new Error(e?.error || 'registrationError'))));
  setTimeout(() => terminar(reject, new Error('iOS no entregó el token de notificaciones')), ESPERA_TOKEN_MS);
  PushNotifications.register().catch((e) => terminar(reject, e));
});

/** Pide permiso (solo la primera vez) y liga este iPhone al usuario para recibir sus avisos. */
export const registrarPushNativo = async (userId) => {
  if (!esIOS || !userId) return false;
  try {
    let permiso = await PushNotifications.checkPermissions();
    if (permiso.receive === 'prompt' || permiso.receive === 'prompt-with-rationale') {
      permiso = await PushNotifications.requestPermissions();
    }
    if (permiso.receive !== 'granted') return false;

    const token = await pedirToken();
    const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/push/ios/registrar`, { token });
    localStorage.setItem(CLAVE, JSON.stringify({ userId: String(userId), subscriptionId: data?.subscription_id || null }));
    return Boolean(data?.ok);
  } catch (error) {
    console.warn('[Push iOS] No se pudo registrar el dispositivo:', error);
    return false;
  }
};

/**
 * Al cerrar sesión: este iPhone deja de recibir los avisos de esa cuenta.
 * Se llama ANTES de borrar el token de acceso; aquí se toma en el momento.
 */
export const darDeBajaPushNativo = () => {
  if (!esIOS) return;
  const guardado = leerGuardado();
  localStorage.removeItem(CLAVE);
  const autorizacion = axios.defaults.headers.common['Authorization'];
  if (!guardado?.subscriptionId || !autorizacion) return;
  axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/push/ios/baja`,
    { subscription_id: guardado.subscriptionId },
    { headers: { Authorization: autorizacion } }
  ).catch((error) => console.warn('[Push iOS] No se pudo dar de baja el dispositivo:', error));
};

/**
 * Al tocar un aviso se abre su pantalla. OneSignal manda la URL en custom.u; si es de la app
 * (https://app.agentesolutions.com.mx/...) se navega a esa ruta dentro de la app.
 * Devuelve una función para quitar el listener.
 */
export const escucharToquesPush = (navegar) => {
  if (!esIOS) return () => {};
  const handle = PushNotifications.addListener('pushNotificationActionPerformed', (accion) => {
    const datos = accion?.notification?.data || {};
    const custom = typeof datos.custom === 'string' ? (() => { try { return JSON.parse(datos.custom); } catch { return {}; } })() : (datos.custom || {});
    const url = custom.u || datos.url;
    if (!url) return;
    try {
      const destino = new URL(url, URL_PUBLICA);
      if (destino.origin === new URL(URL_PUBLICA).origin) {
        navegar(destino.pathname + destino.search + destino.hash);
      }
    } catch {
      // URL inválida: se queda en la pantalla actual
    }
  });
  return () => { handle.then((h) => h.remove()).catch(() => {}); };
};
