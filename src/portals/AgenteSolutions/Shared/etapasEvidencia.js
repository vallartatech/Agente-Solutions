// Etapas de la evidencia de un trabajo. Las comparten la galería del técnico y el panel de reportes del admin.
// `stage` es la columna en la BD; `tag` es la etiqueta que se sigue escribiendo en la descripción
// para las evidencias viejas y para las pantallas de la red (AgenteMarket), que aún la usan.
export const ETAPAS_EVIDENCIA = [
  {
    key: 'ANTES',
    stage: 'antes',
    title: '1. ANTES DE INICIAR',
    tag: '[ANTES]',
    required: true,
    badgeColor: '#e11d48',
    placeholderTecnico: 'Describe el estado inicial de la propiedad o equipo antes de trabajar...',
    placeholderAdmin: 'Escribe la descripción de las condiciones iniciales...'
  },
  {
    key: 'DURANTE',
    stage: 'durante',
    title: '2. DURANTE EL PROCESO',
    tag: '[DURANTE]',
    required: true,
    badgeColor: '#ea580c',
    placeholderTecnico: 'Describe el procedimiento o desarme que se realizó durante el servicio...',
    placeholderAdmin: 'Escribe la descripción del avance o procedimiento en proceso...'
  },
  {
    key: 'DESPUES',
    stage: 'despues',
    title: '3. DESPUÉS DE FINALIZAR',
    tag: '[DESPUÉS]',
    required: true,
    badgeColor: '#16a34a',
    placeholderTecnico: 'Describe el resultado final y las pruebas tras concluir el trabajo...',
    placeholderAdmin: 'Escribe la descripción del resultado final tras concluir...'
  },
  {
    key: 'EXTRA',
    stage: 'extra',
    title: '4. ADICIONAL / EXTRA',
    tag: '[EXTRA]',
    required: false,
    badgeColor: '#64748b',
    placeholderTecnico: 'Agrega cualquier detalle, prueba, foto o video adicional relevante (Opcional)...',
    placeholderAdmin: 'Observaciones o evidencia adicional (opcional)...',
    permiteVideo: true
  },
  {
    // Comprobante firmado/sellado que entrega la empresa: se muestra como requerido, pero no bloquea
    // finalizar (si falta, el admin puede validar "sin ticket" y queda su nombre)
    key: 'TICKET',
    stage: 'ticket',
    title: '5. TICKET DE CONFORMIDAD',
    tag: '[TICKET]',
    required: false,
    marcaRequerido: true,
    esTicket: true,
    badgeColor: '#7c3aed',
    placeholderTecnico: 'Folio o comentario del ticket firmado / sellado por la empresa (opcional)...',
    placeholderAdmin: 'Folio o comentario del ticket firmado / sellado por la empresa (opcional)...'
  }
];

// A partir de 2 elementos solo se piden ANTES y DESPUÉS por cada uno (el ticket sigue siendo uno por trabajo)
export const MINIMO_POR_ELEMENTO = 2;
export const esPorElemento = (elementos) => (elementos?.length || 0) >= MINIMO_POR_ELEMENTO;
export const etapasDelTrabajo = (etapas, elementos) => (esPorElemento(elementos)
  ? etapas.filter(e => ['antes', 'despues', 'ticket'].includes(e.stage))
  : etapas);
export const evidenciasDelElemento = (reportes, elementoId) =>
  (reportes || []).filter(r => Number(r.work_order_component_id) === Number(elementoId));
// Cuántas evidencias obligatorias (antes y después) tiene un elemento
export const avanceDelElemento = (reportes, elementoId) => {
  const propias = evidenciasDelElemento(reportes, elementoId);
  return ['antes', 'despues'].filter(stage => propias.some(r => r.stage === stage)).length;
};

const ETIQUETAS = /\[(ANTES|DURANTE|DESPUÉS|DESPUES|EXTRA|TICKET)\]/gi;

// Descripción sin la etiqueta de etapa
export const limpiarEtiqueta = (desc) => (desc || '').replace(ETIQUETAS, '').trim();

// ¿La evidencia pertenece a esta etapa? Primero por la columna `stage`; las viejas, por su etiqueta
export const esDeEtapa = (r, etapa) => {
  if (r?.stage) return r.stage === etapa.stage;
  const desc = (r?.description || '').toUpperCase();
  return desc.includes(etapa.tag) || (etapa.key === 'DESPUES' && desc.includes('[DESPUES]'));
};

// La primera evidencia de la etapa. Las viejas sin etiqueta ocupan, en orden de creación,
// las etapas libres de evidencia (nunca la del ticket).
export const evidenciaDeEtapa = (reportes, etapa) => {
  if (!reportes?.length) return null;
  const propia = reportes.find(r => esDeEtapa(r, etapa));
  if (propia || etapa.esTicket) return propia || null;

  const sinEtapa = reportes
    .filter(r => !ETAPAS_EVIDENCIA.some(e => esDeEtapa(r, e)))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const libres = ETAPAS_EVIDENCIA.filter(e => !e.esTicket && !reportes.some(r => esDeEtapa(r, e)));
  const posicion = libres.findIndex(e => e.key === etapa.key);
  return posicion !== -1 ? (sinEtapa[posicion] || null) : null;
};
