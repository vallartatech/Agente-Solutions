// Lógica compartida del expediente de una propiedad:
// pasos del flujo, etiquetas de estado e historial de cada trabajo.

export const API = import.meta.env.VITE_API_BASE_URL;

export const authHeaders = () => {
  const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const FINALIZADOS = ['listo', 'finalizado', 'terminado', 'completado', 'completed'];
const CANCELADOS = ['rechazado', 'cancelado', 'cancelado_tecnico'];
const EN_PROCESO = ['en proceso', 'en progreso'];

const norm = (s) => String(s || '').trim().toLowerCase();

export const esFinalizado = (t) => FINALIZADOS.includes(norm(t.status));
export const esCancelado = (t) => CANCELADOS.includes(norm(t.status));
export const esActivo = (t) => !esFinalizado(t) && !esCancelado(t);

const cotAprobada = (c) =>
  ['aceptada', 'aprobado', 'aprobada', 'pagado', 'accepted', 'approved'].includes(norm(c.status)) ||
  cotPagada(c);

const cotPagada = (c) =>
  norm(c.status) === 'pagado' ||
  ['validado', 'approved'].includes(norm(c.payment_status)) ||
  Boolean(c.cash_confirmed) || Boolean(c.advance_paid) || Boolean(c.remaining_paid);

const llegoAlSitio = (t) => t.arrival_status === 'EN_SITIO' || Boolean(t.arrived_at);

// Devuelve { pasos: [{ key, label, estado: 'hecho'|'actual'|'pendiente'|'error', detalle }], actual, total }
export const calcularFlujo = (t) => {
  const cots = t.cotizaciones || [];
  const tieneTecnico = (t.tecnicos || []).length > 0;
  const finalizado = esFinalizado(t);
  const segundaVisita = norm(t.status).includes('segunda visita');

  let defs;
  if (t.kind === 'levantamiento') {
    defs = [
      { key: 'solicitud', label: 'Solicitud', hecho: true },
      { key: 'tecnico', label: 'Técnico asignado', hecho: tieneTecnico },
      { key: 'visita', label: 'Visita programada', hecho: Boolean(t.scheduled_at) && tieneTecnico },
      { key: 'sitio', label: 'Levantamiento', hecho: llegoAlSitio(t) || EN_PROCESO.includes(norm(t.status)) },
      { key: 'fin', label: 'Finalizado', hecho: finalizado },
    ];
  } else {
    defs = [
      { key: 'solicitud', label: 'Solicitud', hecho: true },
      { key: 'tecnico', label: 'Técnico asignado', hecho: tieneTecnico },
      { key: 'visita', label: 'Visita programada', hecho: Boolean(t.scheduled_at) },
      { key: 'sitio', label: 'En sitio', hecho: llegoAlSitio(t) },
      ...(segundaVisita ? [{ key: 'segunda', label: 'Segunda visita', hecho: norm(t.status) === 'segunda visita programada' }] : []),
      { key: 'cotizacion', label: 'Cotización', hecho: cots.some(cotAprobada), parcial: cots.length > 0 },
      { key: 'pago', label: 'Pago', hecho: cots.some(cotPagada) },
      { key: 'proceso', label: 'En proceso', hecho: EN_PROCESO.includes(norm(t.status)) },
      { key: 'fin', label: 'Finalizado', hecho: finalizado },
    ];
  }

  // Un trabajo finalizado completa todos los pasos aunque se hayan saltado (ej. sin cotización)
  if (finalizado) defs.forEach((d) => { d.hecho = true; });
  // Si un paso posterior ya ocurrió, los anteriores se dan por cumplidos
  for (let i = defs.length - 1, visto = false; i >= 0; i--) {
    if (visto) defs[i].hecho = true;
    else if (defs[i].hecho) visto = true;
  }

  const idxActual = defs.findIndex((d) => !d.hecho);
  const cancelado = esCancelado(t);
  const pasos = defs.map((d, i) => ({
    key: d.key,
    label: d.label,
    estado: d.hecho ? 'hecho' : i === idxActual ? (cancelado ? 'error' : 'actual') : 'pendiente',
    detalle: d.key === 'cotizacion' && !d.hecho && d.parcial ? 'En revisión' : null,
  }));

  const hechos = defs.filter((d) => d.hecho).length;
  return { pasos, hechos, total: defs.length, actual: idxActual === -1 ? null : pasos[idxActual] };
};

export const etiquetaEstado = (t) => {
  if (esFinalizado(t)) return { texto: 'Finalizado', tono: 'green' };
  if (esCancelado(t)) return { texto: t.status || 'Cancelado', tono: 'red' };
  const { actual } = calcularFlujo(t);
  if (norm(t.prioridad) === 'urgente') return { texto: `SOS · ${actual?.label || t.status}`, tono: 'red' };
  if (!actual) return { texto: t.status || 'Pendiente', tono: 'slate' };
  if (actual.key === 'fin') return { texto: 'En proceso', tono: 'orange' };
  const tonos = { tecnico: 'violet', visita: 'amber', sitio: 'blue', segunda: 'amber', cotizacion: 'amber', pago: 'amber', proceso: 'orange' };
  return { texto: `Pendiente: ${actual.label}`, tono: tonos[actual.key] || 'slate' };
};

export const etiquetaTipo = (kind) =>
  ({ trabajo: 'Trabajo', levantamiento: 'Levantamiento', servicio: 'Servicio' }[kind] || 'Trabajo');

export const fechaHora = (v) => {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
};

export const dinero = (n) =>
  n === null || n === undefined || n === '' || Number.isNaN(Number(n))
    ? null
    : Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export const totalCotizacion = (c) => c.total ?? c.total_amount ?? c.amount ?? null;

export const nombreTecnicos = (t) =>
  (t.tecnicos || []).map((x) => x.nombre).filter(Boolean).join(', ') || 'Sin técnico asignado';

// Historial de un trabajo: eventos reales ordenados por fecha
export const construirHistorial = (t) => {
  const ev = [];
  const add = (fecha, titulo, texto, extra = {}) => { if (fecha) ev.push({ fecha, titulo, texto, ...extra }); };

  add(t.created_at, `${etiquetaTipo(t.kind)} solicitado`, t.descripcion, { fotos: t.fotos, tono: 'orange' });
  if ((t.tecnicos || []).length) add(t.created_at, 'Técnico asignado', nombreTecnicos(t), { tono: 'violet', sinHora: true });
  add(t.scheduled_at, 'Visita programada', 'Fecha acordada para la visita.', { tono: 'amber' });
  add(t.arrived_at, 'Técnico en sitio', 'El técnico confirmó su llegada con GPS.', { tono: 'blue' });
  if (t.second_visit_proposed_date) {
    add(t.updated_at, 'Segunda visita', t.second_visit_reason || `Propuesta para ${t.second_visit_proposed_date}`, { tono: 'amber' });
  }
  (t.cotizaciones || []).forEach((c) => {
    const monto = dinero(totalCotizacion(c));
    add(c.created_at, `Cotización ${c.folio ? `#${c.folio}` : ''}`.trim(), [c.status, monto].filter(Boolean).join(' · '), { tono: 'amber' });
    if (cotPagada(c)) add(c.cash_confirmed_at || c.advance_paid_at || c.updated_at, 'Pago registrado', monto, { tono: 'green' });
  });
  (t.reportes || []).forEach((r) => {
    add(r.created_at, `Reporte de ${r.tecnico_nombre || 'técnico'}`, r.description, { fotos: r.image_url ? [r.image_url] : [], tono: 'blue' });
  });
  if (esFinalizado(t)) add(t.updated_at, 'Trabajo finalizado', null, { tono: 'green' });
  if (esCancelado(t)) add(t.updated_at, t.status, null, { tono: 'red' });

  return ev.sort((a, b) => new Date(String(a.fecha).replace(' ', 'T')) - new Date(String(b.fecha).replace(' ', 'T')));
};
