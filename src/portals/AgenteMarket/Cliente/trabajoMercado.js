// Agente Market: arma el "trabajo" que usa DetallePublicacionRed a partir de una orden de
// GET /mercado-trabajos?only_mine=1&con_terminados=1. Lo usan el Mercado (VistaRedAutonomo)
// y el detalle del Tablero global (DetalleTrabajoMercado).
import { limpiarPropuesta } from '../Shared/versionesCotizacionChat';

// Estados con el reporte ya enviado por el técnico
export const ESTADOS_TERMINADO = ['Listo', 'Por Aprobar', 'Finalizado', 'Terminado', 'Completado'];

export const limpiarDescripcion = (rawDesc) => {
  if (!rawDesc) return 'Sin descripción adicional';
  let clean = rawDesc;
  clean = clean.replace(/\[LOTE-[A-Z0-9]+\]\s*(\(\d+\/\d+\))?\s*/gi, '');
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*(otro|Otro|ninguno|Ninguno|n\/a|N\/A)\s*/gi, '');
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*/gi, ' - Equipo: ');
  return clean.trim() || rawDesc;
};

const nombreCompleto = (user) => (user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name) : '');

// Agrupar cotizaciones por técnico para consolidar el chat y ofertas
export const agruparCotizaciones = (quotesList, order, user) => {
  if (!Array.isArray(quotesList)) return [];
  const techMap = new Map();

  quotesList.forEach(quote => {
    const techId = quote.technician_id || quote.technician?.id;
    if (!techId) return;

    const techName = quote.technician?.first_name
      ? `${quote.technician.first_name} ${quote.technician.last_name || ''}`.trim()
      : (quote.technician?.name || 'Técnico del Mercado');

    const isThisQuoteAccepted = Boolean(
      quote.status === 'accepted' ||
      (order && (order.status === 'Asignado' || order.status === 'En Progreso' || order.status === 'Terminado') && Number(order.tecnico_id) === Number(techId))
    );

    const existing = techMap.get(techId);
    if (!existing) {
      const msgs = quote.chat_history || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      const hasNewTechMessage = Boolean(
        (lastMsg && Number(lastMsg.sender_id) !== Number(user?.id) && lastMsg.sender_role !== 'Cliente') ||
        limpiarPropuesta(quote.message).length > 0
      );
      const displayAlertMsg = limpiarPropuesta(lastMsg?.message || quote.message);

      techMap.set(techId, {
        ...quote,
        status: isThisQuoteAccepted ? 'accepted' : quote.status,
        is_assigned: isThisQuoteAccepted,
        allQuotes: [quote],
        lastMsg,
        hasNewTechMessage,
        displayAlertMsg,
        technicianName: techName,
      });
    } else {
      existing.allQuotes.push(quote);
      if (isThisQuoteAccepted) {
        existing.status = 'accepted';
        existing.is_assigned = true;
      }
      if (quote.id > existing.id || (quote.price > 0 && existing.price == 0)) {
        existing.id = quote.id;
        if (quote.price > 0) existing.price = quote.price;
        if (limpiarPropuesta(quote.message)) existing.message = quote.message;
        if (quote.status === 'accepted' || existing.is_assigned) {
          existing.status = 'accepted';
          existing.is_assigned = true;
        } else if (existing.status !== 'accepted') {
          existing.status = quote.status;
        }
        existing.created_at = quote.created_at;
      }
      if (quote.chat_history && (!existing.chat_history || quote.chat_history.length > existing.chat_history.length)) {
        existing.chat_history = quote.chat_history;
      }
      const msgs = existing.chat_history || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      existing.lastMsg = lastMsg;
      existing.hasNewTechMessage = Boolean(
        (lastMsg && Number(lastMsg.sender_id) !== Number(user?.id) && lastMsg.sender_role !== 'Cliente') ||
        (existing.message && existing.message.trim().length > 0)
      );
      existing.displayAlertMsg = limpiarPropuesta(lastMsg?.message || existing.message);
    }
  });

  const result = Array.from(techMap.values());
  result.sort((a, b) => {
    if (a.is_assigned || a.status === 'accepted') return -1;
    if (b.is_assigned || b.status === 'accepted') return 1;
    return b.id - a.id;
  });

  return result;
};

// Solo las publicaciones creadas por este usuario
export const esPublicacionDelUsuario = (order, user) => {
  if (!user) return false;
  if (user.role_id === 0) return true; // SuperAdmin / Root puede ver todas
  if (order.is_mine === true) return true;

  const userFullName = nombreCompleto(user);
  const matchesTenant = Boolean(user.tenant_id && (
    order.tenant_id == user.tenant_id ||
    order.owner_tenant_id == user.tenant_id ||
    order.property?.tenant_id == user.tenant_id
  ));
  const matchesUser = Boolean(
    order.owner_user_id == user.id ||
    order.client_id == user.id ||
    order.property?.client?.user_id == user.id ||
    order.user_id == user.id
  );
  const matchesEmail = Boolean(
    user.email && (
      order.property?.client?.email?.toLowerCase() === user.email.toLowerCase() ||
      order.client?.email?.toLowerCase() === user.email.toLowerCase()
    )
  );
  const matchesName = Boolean(
    order.owner_name && userFullName && (
      order.owner_name.toLowerCase().trim() === userFullName.toLowerCase().trim() ||
      order.owner_name.toLowerCase().includes(userFullName.toLowerCase()) ||
      userFullName.toLowerCase().includes(order.owner_name.toLowerCase())
    )
  );

  return matchesTenant || matchesUser || matchesEmail || matchesName;
};

export const armarTrabajoMercado = (order, user) => {
  const userFullName = nombreCompleto(user);
  const rawLat = order.lat ? parseFloat(order.lat) : (order.area_lat ? parseFloat(order.area_lat) : (21.0181 + Math.sin(order.id * 17) * 0.025));
  const rawLng = order.lng ? parseFloat(order.lng) : (order.area_lng ? parseFloat(order.area_lng) : (-89.6242 + Math.cos(order.id * 17) * 0.025));
  const coloniaTexto = order.colonia_cercana || order.zona_colonia || order.zona || 'Mérida, Yucatán';
  const tituloProblema = order.type
    ? `${order.type}${order.equipment ? ' - ' + order.equipment : ''}`
    : 'Problema / Servicio Solicitado';

  const isGenericOwner = !order.owner_name ||
    order.owner_name === 'Cliente de la Red' ||
    order.owner_name === 'Cliente Desconocido' ||
    order.owner_name === 'Cliente de Prueba';

  const displayOwner = !isGenericOwner ? order.owner_name : (userFullName || 'Mi Solicitud');

  const fotos = [
    order.evidence_path,
    order.evidence_path_2,
    order.property?.facade_photo_path
  ].filter(Boolean);

  const groupedQuotes = agruparCotizaciones(order.network_quotes || [], order, user);
  const hasNewTechMessage = groupedQuotes.some(q => q.hasNewTechMessage);
  const lastTechMsg = groupedQuotes.find(q => q.hasNewTechMessage)?.lastMsg || null;

  const acceptedQuote = groupedQuotes.find(q => q.status === 'accepted' || q.is_assigned) || null;
  const isAccepted = Boolean(
    order.status === 'Asignado' ||
    order.status === 'En Progreso' ||
    order.status === 'Terminado' ||
    acceptedQuote ||
    order.tecnico_id
  );
  // El técnico ya envió el reporte (Listo / Por Aprobar / Finalizado…)
  const terminado = ESTADOS_TERMINADO.includes(order.status);

  const assignedTechName = acceptedQuote?.technicianName || (order.technician ? `${order.technician.first_name} ${order.technician.last_name || ''}`.trim() : null);
  const agreedPrice = acceptedQuote?.price ? parseFloat(acceptedQuote.price) : 0;

  return {
    id: order.id,
    titulo: tituloProblema,
    tipo: order.type || 'Problema',
    equipo: order.equipment || '',
    lat: rawLat,
    lng: rawLng,
    presupuesto: "A convenir",
    estado: terminado ? 'Finalizado' : (isAccepted ? 'Asignado' : (order.status || 'Por Hacer')),
    terminado,
    // Reporte enviado que el cliente todavía no confirma
    reporte_por_confirmar: Boolean(terminado && order.report_sent_at && !order.client_confirmed_at),
    // Estado real y datos de cancelación / reenvío a la red
    status: order.status,
    tecnico_id: order.tecnico_id,
    cancellation_reason: order.cancellation_reason,
    reabierta_at: order.reabierta_at,
    is_accepted: isAccepted,
    assigned_tech_name: assignedTechName,
    agreed_price: agreedPrice,
    fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
    created_at: order.created_at,
    lugar: order.property?.property_name || 'Lugar no especificado',
    zona: coloniaTexto,
    colonia: coloniaTexto,
    calle: order.property?.address || 'Dirección no especificada',
    descripcion: limpiarDescripcion(order.description),
    foto: fotos[0] || null,
    fotos: fotos,
    cotizaciones: groupedQuotes.length,
    cotizaciones_list: groupedQuotes,
    cliente: displayOwner,
    is_mine: true,
    priority: order.priority || 'Normal',
    is_urgent: Boolean(order.is_urgent || order.priority === 'Urgente' || order.type === 'SOS'),
    scheduled_at: order.scheduled_at,
    // Llegada del técnico (el cliente la confirma) y solicitud dirigida a un favorito
    arrived_at: order.arrived_at || null,
    arrival_confirmed_at: order.arrival_confirmed_at || null,
    // Horario en la cotización (solicitudes nuevas): tardanza, re-programación y "nadie cotizó"
    flujo_horario: Boolean(order.flujo_horario),
    fecha_deseada: order.fecha_deseada || null,
    hora_deseada: order.hora_deseada || null,
    ruta_iniciada_at: order.ruta_iniciada_at || null,
    aviso_tardanza_at: order.aviso_tardanza_at || null,
    sin_tecnico_avisado_at: order.sin_tecnico_avisado_at || null,
    reprogramacion_propuesta: order.reprogramacion_propuesta || null,
    tecnico_dirigido_id: order.tecnico_dirigido_id || null,
    tecnico_dirigido_nombre: order.tecnico_dirigido_nombre || null,
    service_id: order.service_id,
    // Quién va a la casa (el contratista y/o los técnicos de su cuadrilla)
    equipo_en_sitio: order.equipo_en_sitio || [],
    hasNewTechMessage,
    lastTechMsg,
  };
};
