// Red: ajuste de una cotización ya aceptada (el técnico propone un nuevo precio, el dueño responde)
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL;

const headers = () => {
  const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// { ajustes, precio_original, precio_vigente, ajuste_pendiente, ajuste_por_decidir, puede_ajustar, puede_responder }
export const obtenerAjustes = async (workOrderId) =>
  (await axios.get(`${API}/mercado-trabajos/${workOrderId}/ajustes`, { headers: headers() })).data;

// datos: { precio, motivo, desglose: {servicios, materiales} | null, fotos: File[], archivo: File | null, conIva }
export const proponerAjuste = async (workOrderId, { precio, motivo, desglose, fotos, archivo, conIva }) => {
  const form = new FormData();
  form.append('precio', String(precio));
  form.append('motivo', motivo);
  if (desglose) form.append('desglose', JSON.stringify(desglose));
  if (archivo) form.append('archivo', archivo);
  form.append('con_iva', conIva ? '1' : '0');
  (fotos || []).forEach((f) => form.append('fotos[]', f));
  return (await axios.post(`${API}/mercado-trabajos/${workOrderId}/ajustes`, form, { headers: headers() })).data;
};

export const responderAjuste = async (ajusteId, accion) =>
  (await axios.post(`${API}/ajustes-cotizacion/${ajusteId}/responder`, { accion }, { headers: headers() })).data;

export const retirarAjuste = async (ajusteId) =>
  (await axios.post(`${API}/ajustes-cotizacion/${ajusteId}/retirar`, {}, { headers: headers() })).data;

export const decidirTrasRechazo = async (ajusteId, decision) =>
  (await axios.post(`${API}/ajustes-cotizacion/${ajusteId}/decidir`, { decision }, { headers: headers() })).data;

// Mensaje de error legible del backend (validación de Laravel o mensaje propio)
export const errorDeAjuste = (e, porDefecto = 'No se pudo completar. Inténtalo de nuevo.') => {
  const d = e?.response?.data;
  if (d?.errors) return Object.values(d.errors).flat()[0] || porDefecto;
  return d?.message || d?.error || porDefecto;
};

export const dinero = (valor) =>
  `$${Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const IVA = 0.16;

export const totalFilas = (filas) =>
  (filas || []).reduce((acc, f) => acc + (Number(f.cantidad) || 0) * (Number(f.precio) || 0), 0);

export const ESTADO_AJUSTE = {
  pending: { texto: 'Esperando al cliente', tono: 'pendiente' },
  accepted: { texto: 'Aceptado', tono: 'aceptado' },
  rejected: { texto: 'Rechazado', tono: 'rechazado' },
  retirado: { texto: 'Retirado', tono: 'retirado' },
};

export const fechaCorta = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};
