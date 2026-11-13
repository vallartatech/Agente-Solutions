// Red: acceso a la propiedad de un trabajo (QR y/o código). Sube el dueño; el técnico lo ve al marcar "Llegué".
// axios ya lleva el token (AuthContext pone el header Authorization global).
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL;
const ruta = (workOrderId) => `${API}/red/trabajos/${workOrderId}/acceso`;

export const MAX_DIAS_ACCESO = 7;
export const OPCIONES_VIGENCIA = [
  { dias: 1, texto: '1 día' },
  { dias: 2, texto: '2 días' },
  { dias: 3, texto: '3 días' },
  { dias: 7, texto: '7 días' },
];

// { accesos, puede_editar, puede_ver, disponible_al_llegar, cerrado, max_dias }
export const obtenerAccesos = async (workOrderId) => (await axios.get(ruta(workOrderId))).data;

export const guardarAcceso = async (workOrderId, { slot, imagen, codigo, label, note, validUntil }) => {
  const fd = new FormData();
  fd.append('slot', String(slot));
  if (imagen) fd.append('imagen', imagen);
  if (codigo) fd.append('codigo', codigo);
  if (label) fd.append('label', label);
  if (note) fd.append('note', note);
  fd.append('valid_until', validUntil.toISOString());
  return (await axios.post(ruta(workOrderId), fd)).data;
};

export const borrarAcceso = async (workOrderId, slot) => (await axios.delete(`${ruta(workOrderId)}/${slot}`)).data;

// Imagen protegida: se pide con sesión y se muestra como blob
export const cargarImagenAcceso = async (workOrderId, slot) =>
  URL.createObjectURL((await axios.get(`${ruta(workOrderId)}/${slot}/imagen`, { responseType: 'blob' })).data);

export const errorDeAcceso = async (e, porDefecto = 'No se pudo completar. Inténtalo de nuevo.') => {
  let d = e?.response?.data;
  if (d instanceof Blob) {
    try { d = JSON.parse(await d.text()); } catch { d = null; }
  }
  if (d?.errors) return Object.values(d.errors).flat()[0] || porDefecto;
  return d?.message || porDefecto;
};

// "Vence en 1 día 4 h" / "Vence hoy a las 6:00 p.m."
export const textoVigencia = (iso) => {
  if (!iso) return '';
  const fin = new Date(iso);
  if (isNaN(fin)) return '';
  const ms = fin - Date.now();
  if (ms <= 0) return 'Vencido';
  const horas = Math.floor(ms / 3600000);
  const hora = fin.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  if (horas < 24) {
    const esHoy = fin.toDateString() === new Date().toDateString();
    return `Vence ${esHoy ? 'hoy' : 'mañana'} a las ${hora}`;
  }
  const dias = Math.floor(horas / 24);
  return `Vence en ${dias} día${dias === 1 ? '' : 's'}${horas % 24 ? ` ${horas % 24} h` : ''} (${fin.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}, ${hora})`;
};
