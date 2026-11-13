// Red: cancelación del cliente, reenvío a la red y cotizaciones vigentes (retirar / confirmar disponibilidad)
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL;

const headers = () => {
  const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const post = async (ruta, datos = {}) => (await axios.post(`${API}${ruta}`, datos, { headers: headers() })).data;

// Cliente
export const cancelarServicioCliente = (workOrderId, motivo) => post(`/mercado-trabajos/${workOrderId}/cancelar-cliente`, { motivo });
export const resolverCancelado = (workOrderId, action) => post(`/client/resolve-cancelled-work-order/${workOrderId}`, { action }); // reopen | delete
export const dejarDeEsperarTecnico = (quoteId) => post(`/network-quotes/${quoteId}/cancelar-confirmacion`);

// Técnico
export const retirarCotizacion = (quoteId) => post(`/network-quotes/${quoteId}/retirar`);
export const confirmarDisponibilidad = (quoteId, accion) => post(`/network-quotes/${quoteId}/confirmar`, { accion }); // confirmar | declinar

export const errorDeRed = (e, porDefecto = 'No se pudo completar. Inténtalo de nuevo.') => {
  const d = e?.response?.data;
  if (d?.errors) return Object.values(d.errors).flat()[0] || porDefecto;
  return d?.message || d?.error || porDefecto;
};

// Estado de una cotización para mostrarla al cliente
export const cotizacionRetirada = (q) => Boolean(q?.retirada_at);
export const esperandoConfirmacion = (q) => Boolean(q?.confirmacion_pedida_at) && q?.status === 'pending';

// ¿Es anterior al último reenvío a la red? Entonces el técnico confirmará antes de asignarle el trabajo
export const pideConfirmacion = (q, job) => {
  if (!job?.reabierta_at || !q) return false;
  const cotizada = new Date(String(q.cotizada_at || q.created_at || '').replace(' ', 'T'));
  const reabierta = new Date(String(job.reabierta_at).replace(' ', 'T'));
  return !isNaN(cotizada) && !isNaN(reabierta) && cotizada < reabierta;
};
