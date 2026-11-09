// Resumen corto de técnicos para las tarjetas de cotización (GET /tecnicos/resumenes?ids=…).
// Las tarjetas que se pintan juntas piden su técnico casi al mismo tiempo: se juntan en una
// sola petición y el resultado queda en memoria unos minutos.
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL;
const VIGENCIA_MS = 5 * 60 * 1000;

const cache = new Map();    // id -> { data, at }
const enVuelo = new Map();  // id -> Promise<data>
let cola = new Map();       // id -> resolve (pendientes de pedir)
let temporizador = null;

const vaciarCola = async () => {
  const lote = cola;
  cola = new Map();
  temporizador = null;
  let datos = {};
  try {
    const res = await axios.get(`${API}/tecnicos/resumenes`, { params: { ids: [...lote.keys()].join(',') } });
    datos = res.data?.data || {};
  } catch {
    // Sin resumen la tarjeta muestra solo el botón del perfil
  }
  lote.forEach((resolve, id) => {
    const data = datos[String(id)] || null;
    cache.set(id, { data, at: Date.now() });
    enVuelo.delete(id);
    resolve(data);
  });
};

export const obtenerResumen = (id) => {
  const clave = Number(id);
  if (!clave) return Promise.resolve(null);
  const guardado = cache.get(clave);
  if (guardado && Date.now() - guardado.at < VIGENCIA_MS) return Promise.resolve(guardado.data);
  if (enVuelo.has(clave)) return enVuelo.get(clave);

  const promesa = new Promise((resolve) => cola.set(clave, resolve));
  enVuelo.set(clave, promesa);
  if (!temporizador) temporizador = setTimeout(vaciarCola, 30);
  return promesa;
};

/** { resumen, cargando } del técnico con ese id. */
export const useResumenTecnico = (id) => {
  const clave = Number(id) || null;
  const [estado, setEstado] = useState(() => {
    const guardado = clave ? cache.get(clave) : null;
    return { resumen: guardado?.data ?? null, cargando: Boolean(clave) && !guardado };
  });

  useEffect(() => {
    if (!clave) {
      setEstado({ resumen: null, cargando: false });
      return undefined;
    }
    let vivo = true;
    obtenerResumen(clave).then((resumen) => { if (vivo) setEstado({ resumen, cargando: false }); });
    return () => { vivo = false; };
  }, [clave]);

  return estado;
};
