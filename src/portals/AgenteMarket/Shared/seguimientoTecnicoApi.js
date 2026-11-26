// Red: el cliente ve en su mapa al técnico que va en camino (de "Iniciar ruta" a "Llegué al lugar").
// El técnico manda su ubicación mientras la app está abierta; el cliente la consulta cada ~15 s.
import { useEffect, useRef } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL;
const ENVIAR_CADA_MS = 15000;     // reenvío periódico aunque no se mueva (el cliente ve que sigue activo)
const SEPARACION_MIN_MS = 5000;   // nunca más seguido que esto
const MOVIMIENTO_M = 50;          // si avanzó más de esto, se manda antes

const encabezados = () => {
  const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const distanciaMetros = (a, b) => {
  if (!a || !b) return null;
  const R = 6371000;
  const rad = (v) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Minutos aproximados de llegada en ciudad (línea recta × 1.4 a ~28 km/h). */
export const minutosEstimados = (desde, hasta) => {
  const m = distanciaMetros(desde, hasta);
  if (m == null) return null;
  return Math.max(1, Math.round(((m * 1.4) / 1000 / 28) * 60));
};

export const enviarUbicacionRuta = (trabajoId, { lat, lng, precision }) =>
  axios.post(`${API}/mercado-trabajos/${trabajoId}/ubicacion`,
    { lat, lng, precision_m: precision ?? null },
    { headers: encabezados() });

export const detenerUbicacionRuta = (trabajoId) =>
  axios.delete(`${API}/mercado-trabajos/${trabajoId}/ubicacion`, { headers: encabezados() }).catch(() => {});

export const obtenerTecnicosEnCamino = async () => {
  const res = await axios.get(`${API}/seguimiento-tecnicos`, { headers: encabezados() });
  return res.data?.success ? (res.data.data || []) : [];
};

/**
 * Técnico: comparte su ubicación con el cliente de cada trabajo en `trabajoIds` (los que ya
 * tienen "Iniciar ruta" y no "Llegué"). Al salir un trabajo de la lista se deja de compartir.
 */
export const useCompartirUbicacionRuta = (trabajoIds, posicion) => {
  const ultimoEnvio = useRef({});      // id -> { t, pos }
  const detenidos = useRef(new Set()); // el servidor dijo que ya no va en camino
  const posRef = useRef(posicion);
  posRef.current = posicion;
  const clave = [...new Set(trabajoIds)].sort().join(',');

  // Envía a los trabajos activos si pasó el tiempo o se movió lo suficiente
  const enviar = useRef(null);
  enviar.current = (forzar = false) => {
    const pos = posRef.current;
    if (!pos || !clave) return;
    const ahora = Date.now();
    clave.split(',').forEach((id) => {
      if (detenidos.current.has(id)) return;
      const previo = ultimoEnvio.current[id];
      const transcurrido = previo ? ahora - previo.t : Infinity;
      if (transcurrido < SEPARACION_MIN_MS) return;
      const movido = previo ? distanciaMetros(previo.pos, pos) : Infinity;
      if (!forzar && transcurrido < ENVIAR_CADA_MS && movido < MOVIMIENTO_M) return;
      ultimoEnvio.current[id] = { t: ahora, pos };
      enviarUbicacionRuta(id, pos)
        .then((r) => { if (r.data?.compartiendo === false) detenidos.current.add(id); })
        .catch(() => { /* sin señal: se reintenta en el siguiente ciclo */ });
    });
  };

  // Al moverse
  useEffect(() => { enviar.current(); }, [posicion?.lat, posicion?.lng]);

  // Cada 15 s, y al volver a la app
  useEffect(() => {
    if (!clave) return undefined;
    enviar.current(true);
    const intervalo = setInterval(() => enviar.current(true), ENVIAR_CADA_MS);
    const alVolver = () => { if (document.visibilityState === 'visible') enviar.current(true); };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [clave]);

  // Trabajos que salieron de la lista (llegó, se canceló): se deja de compartir en el servidor
  const anteriores = useRef([]);
  useEffect(() => {
    const actuales = clave ? clave.split(',') : [];
    anteriores.current.filter((id) => !actuales.includes(id)).forEach((id) => {
      delete ultimoEnvio.current[id];
      detenidos.current.delete(id);
      detenerUbicacionRuta(id);
    });
    anteriores.current = actuales;
  }, [clave]);
};
