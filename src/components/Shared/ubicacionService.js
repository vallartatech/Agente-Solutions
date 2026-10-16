import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL;

// Estado de ubicación del usuario actual (consentimiento, permiso de mapa, quién lo puede ver).
// Se cachea una sola petición por sesión de página; refrescarEstadoUbicacion() la invalida.
let estadoPromise = null;
let estadoSesion = null;
const listeners = new Set();

export const obtenerEstadoUbicacion = () => {
  // La caché pertenece a la sesión: si cambia el token (otro usuario), se vuelve a pedir
  const sesion = axios.defaults.headers.common['Authorization'] || null;
  if (sesion !== estadoSesion) {
    estadoPromise = null;
    estadoSesion = sesion;
  }
  if (!estadoPromise) {
    estadoPromise = axios.get(`${API}/ubicacion/estado`)
      .then(res => res.data)
      .catch(() => {
        estadoPromise = null;
        return { tracked_role: false, consent: false, can_view_map: false, viewers: [] };
      });
  }
  return estadoPromise;
};

export const refrescarEstadoUbicacion = () => {
  estadoPromise = null;
  return obtenerEstadoUbicacion().then(estado => {
    listeners.forEach(fn => fn(estado));
    return estado;
  });
};

export const suscribirEstadoUbicacion = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const cambiarConsentimientoUbicacion = async (enabled) => {
  await axios.post(`${API}/ubicacion/consentimiento`, { enabled });
  return refrescarEstadoUbicacion();
};

const leerPosicion = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Este navegador no permite obtener la ubicación.'));
    return;
  }
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000
  });
});

export const enviarPosicion = (coords, source = 'live', workOrderId = null) =>
  axios.post(`${API}/ubicacion`, {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy ?? null,
    source,
    work_order_id: workOrderId
  });

// Registra la ubicación en un momento clave (p. ej. al finalizar un trabajo).
// Nunca lanza error: si no hay consentimiento o GPS, simplemente no registra.
export const reportarUbicacion = async (source, workOrderId = null) => {
  try {
    const estado = await obtenerEstadoUbicacion();
    if (!estado.tracked_role || !estado.consent) return;
    const pos = await leerPosicion();
    await enviarPosicion(pos.coords, source, workOrderId);
  } catch (err) {
    console.warn('[Ubicación] No se pudo registrar:', err?.message || err);
  }
};
