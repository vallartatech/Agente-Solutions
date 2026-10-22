import { useEffect, useState } from 'react';
import axios from 'axios';

// Contador de mensajes sin leer del chat del equipo.
// Una sola consulta compartida por toda la app (encabezados, barra móvil...) cada 20 s,
// y al instante cuando alguien dispara el evento 'chats-actualizados'.
const API = import.meta.env.VITE_API_BASE_URL;
const INTERVALO = 20000;

let total = 0;
let timer = null;
const oyentes = new Set();

const consultar = async () => {
  try {
    const res = await axios.get(`${API}/chats/no-leidos`);
    total = Number(res.data?.total) || 0;
    oyentes.forEach(fn => fn(total));
  } catch {
    /* sin conexión o sin sesión: se mantiene el último valor */
  }
};

const suscribir = (fn) => {
  oyentes.add(fn);
  fn(total);
  if (!timer) {
    consultar();
    timer = setInterval(consultar, INTERVALO);
    window.addEventListener('chats-actualizados', consultar);
  }
  return () => {
    oyentes.delete(fn);
    if (!oyentes.size) {
      clearInterval(timer);
      timer = null;
      window.removeEventListener('chats-actualizados', consultar);
    }
  };
};

export const avisarChatsActualizados = () => window.dispatchEvent(new Event('chats-actualizados'));

export const useChatNoLeidos = (activo = true) => {
  const [n, setN] = useState(total);
  useEffect(() => (activo ? suscribir(setN) : undefined), [activo]);
  return activo ? n : 0;
};
