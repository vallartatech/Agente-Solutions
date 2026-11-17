import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  MapPin, Clock, CheckCircle, User, Calendar, MessageCircle, Maximize2, Image as ImageIcon,
  FileText, X, Trash2, Send, ChevronLeft, ChevronRight, Check, ClipboardList, Star, Sparkles
} from 'lucide-react';
import PanelChatLateral from '../../../components/Shared/PanelChatLateral';
import CurriculumTecnico from '../Shared/CurriculumTecnico';
import ResumenTecnico, { FotoTecnico, InsigniaTecnico } from '../Shared/ResumenTecnico';
import AjusteCotizacionCliente from './AjusteCotizacionCliente';
import CancelacionServicioCliente from './CancelacionServicioCliente';
import AccesoPropiedadCliente from './AccesoPropiedadCliente';
import EstadoCotizacionRed, { cotizacionAceptable } from './EstadoCotizacionRed';
import { pideConfirmacion } from '../Shared/redCancelacionApi';
import { mostrarAviso, confirmarAccion, pedirTexto } from '../../../utils/dialogos';
import '../../../styles/AgenteMarket/Admin/VistaRedAutonomo.css';
import '../../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';

const authHeaders = () => {
  const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

// "3:15 p.m." a partir de 'YYYY-MM-DD HH:MM:SS' (hora de Mérida)
const horaCorta = (valor) => {
  if (!valor) return '';
  const d = new Date(String(valor).replace(' ', 'T'));
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const techDe = (q) => q?.technician_id || q?.technician?.id;

// Estado de la visita (propuesta, re-coordinación o confirmada) según el chat de la oferta
export const getJobScheduleStatus = (job, activeQuote) => {
  const quotes = job?.cotizaciones_list || [];
  const targetQuote = activeQuote || quotes.find(q => q.status === 'accepted' || q.is_assigned) || quotes[0];
  const msgs = targetQuote?.chat_history || [];

  const scheduleResponses = msgs.filter(m => m.is_schedule_response);
  const lastScheduleResponse = scheduleResponses.length > 0 ? scheduleResponses[scheduleResponses.length - 1] : null;
  const scheduleProposals = msgs.filter(m => m.is_schedule);
  const lastScheduleProposal = scheduleProposals.length > 0 ? scheduleProposals[scheduleProposals.length - 1] : null;

  const respuestaVigente = lastScheduleResponse &&
    (!lastScheduleProposal || new Date(lastScheduleResponse.created_at) >= new Date(lastScheduleProposal.created_at));
  const isRescheduleRequested = Boolean(respuestaVigente && lastScheduleResponse.schedule_confirmed === false);
  const isScheduleConfirmed = Boolean(respuestaVigente && lastScheduleResponse.schedule_confirmed === true);

  return {
    isRescheduleRequested,
    isScheduleConfirmed,
    isPendingClientConfirm: Boolean(job?.scheduled_at && !isScheduleConfirmed && !isRescheduleRequested),
    lastScheduleResponse,
    lastScheduleProposal
  };
};

/**
 * Detalle de Publicación y Cotizaciones del cliente de la Red.
 * Un solo diseño y las mismas acciones en el mapa de la Red y en el calendario.
 *
 * - job: trabajo ya procesado (titulo, zona, calle, fotos, cotizaciones_list, is_accepted, status...)
 * - onRefresh: recarga los trabajos del padre (el job llega actualizado por props)
 * - onAceptada: se llama después de aceptar una oferta (antes de cerrar)
 * - onCalificar: opcional; muestra el botón para calificar al técnico asignado
 */
const DetallePublicacionRed = ({ job, user, onClose, onRefresh, onAceptada, onCalificar }) => {
  const [activePhoto, setActivePhoto] = useState(job?.fotos?.[0] || job?.foto || null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [activeChatQuote, setActiveChatQuote] = useState(null);
  const [chatAbierto, setChatAbierto] = useState(false);
  const [perfilTecnico, setPerfilTecnico] = useState(null);
  const [showTechModal, setShowTechModal] = useState(false);
  const cerrarCurriculum = useCallback(() => setShowTechModal(false), []);
  const [clientChatInput, setClientChatInput] = useState('');
  const [sendingClientChat, setSendingClientChat] = useState(false);
  const [confirmandoLlegada, setConfirmandoLlegada] = useState(false);
  const [llegadaConfirmadaAt, setLlegadaConfirmadaAt] = useState(null);
  const chatEndRef = useRef(null);

  const refrescar = useCallback(() => onRefresh?.(), [onRefresh]);
  const refrescarRef = useRef(refrescar);
  refrescarRef.current = refrescar;

  const verPerfil = (quote) => {
    setPerfilTecnico(quote.technician || { id: techDe(quote) });
    setShowTechModal(true);
  };

  // Al llegar el trabajo actualizado, refrescar también la oferta del chat abierto
  useEffect(() => {
    setActiveChatQuote(prevQ => {
      if (!prevQ) return prevQ;
      const updated = (job?.cotizaciones_list || []).find(q => techDe(q) === techDe(prevQ));
      if (!updated) return prevQ;
      const prevLen = prevQ.chat_history?.length || 0;
      const newLen = updated.chat_history?.length || 0;
      return newLen >= prevLen ? updated : { ...updated, chat_history: prevQ.chat_history };
    });
  }, [job]);

  // Sondeo en vivo: el chat abierto o, si no hay chat, la lista de ofertas
  useEffect(() => {
    const sondear = async () => {
      if (!activeChatQuote?.id) {
        refrescarRef.current();
        return;
      }
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${activeChatQuote.id}/chat`, { headers: authHeaders() });
        if (res.data?.success && res.data.chat_history) {
          setActiveChatQuote(prev => {
            if (!prev) return prev;
            if (JSON.stringify(prev.chat_history) === JSON.stringify(res.data.chat_history)) return prev;
            return { ...prev, chat_history: res.data.chat_history };
          });
        }
      } catch {
        // sondeo silencioso
      }
    };
    const intervalo = setInterval(sondear, 1500);
    return () => clearInterval(intervalo);
  }, [activeChatQuote?.id]);

  useEffect(() => {
    if (activeChatQuote && chatAbierto) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatQuote?.chat_history, chatAbierto]);

  if (!job) return null;

  const llegadaConfirmada = job.arrival_confirmed_at || llegadaConfirmadaAt;
  const cancelado = String(job.status || '').startsWith('Cancelado');

  const handleSendClientChat = async (e) => {
    if (e) e.preventDefault();
    if (!clientChatInput.trim() || sendingClientChat || !activeChatQuote) return;

    const textToSend = clientChatInput.trim();
    setClientChatInput('');
    setSendingClientChat(true);

    const userFullName = user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user.name || 'Tú (Cliente)')) : 'Tú (Cliente)';
    const optimisticMessage = {
      sender_id: user?.id,
      sender_name: userFullName,
      sender_role: 'Cliente',
      message: textToSend,
      created_at: new Date().toISOString()
    };
    setActiveChatQuote(prev => prev ? { ...prev, chat_history: [...(prev.chat_history || []), optimisticMessage] } : prev);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/network-quotes/${activeChatQuote.id}/chat`,
        { message: textToSend },
        { headers: authHeaders() }
      );
      if (res.data?.chat_history) {
        setActiveChatQuote(prev => prev ? { ...prev, chat_history: res.data.chat_history } : prev);
      }
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
      mostrarAviso('No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setSendingClientChat(false);
    }
  };

  const handleRejectQuote = async (quoteId) => {
    if (!await confirmarAccion('¿Estás seguro de que deseas rechazar esta cotización?')) return;
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quoteId}/reject`, {}, { headers: authHeaders() });
      if (res.data.success) {
        mostrarAviso('Cotización rechazada. El técnico ha sido notificado para mejorar su oferta.');
        refrescar();
      }
    } catch (e) {
      console.error(e);
      mostrarAviso('Hubo un error al rechazar la cotización.');
    }
  };

  const handleResponderVisita = async (action) => {
    let msg = '';
    if (action === 'reschedule') {
      msg = await pedirTexto('Escribe una breve nota sobre qué horario te queda mejor:');
      if (msg === null) return;
    }
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${job.id}/responder-visita-cliente`,
        { action, message: msg },
        { headers: authHeaders() }
      );
      if (res.data.success) {
        mostrarAviso('✅ ' + res.data.message);
        refrescar();
      }
    } catch (e) {
      console.error('Error respondiendo visita', e);
      mostrarAviso('Hubo un error al responder. Intenta de nuevo.');
    }
  };

  const handleAcceptQuote = async (quote) => {
    const techName = quote.technicianName || (quote.technician ? `${quote.technician.first_name} ${quote.technician.last_name || ''}`.trim() : 'este técnico');
    // Cotización de antes de reenviar a la red: el técnico confirma primero que sigue disponible
    const conConfirmacion = pideConfirmacion(quote, job);
    if (!await confirmarAccion(conConfirmacion
      ? `Le pediremos a ${techName} que confirme que sigue disponible con su cotización de $${parseFloat(quote.price).toFixed(2)}. Cuando confirme, el trabajo quedará asignado. ¿Continuar?`
      : `¿Confirmas que deseas ACEPTAR la cotización de $${parseFloat(quote.price).toFixed(2)} de ${techName}? El trabajo le será asignado de inmediato.`)) {
      return;
    }
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quote.id}/accept`, {}, { headers: authHeaders() });
      if (res.data.success && res.data.requiere_confirmacion) {
        mostrarAviso('⏳ ' + res.data.message);
        refrescar();
        return;
      }
      if (res.data.success) {
        mostrarAviso('🎉 ' + res.data.message);
        onAceptada?.(job);
        refrescar();
        onClose();
      }
    } catch (e) {
      console.error(e);
      mostrarAviso(e.response?.data?.message || 'Hubo un error al aceptar la cotización. Intenta de nuevo.');
    }
  };

  const handleDeleteJob = async () => {
    if (!await confirmarAccion('¿Estás seguro de que deseas eliminar y cancelar esta publicación de la Red? Ya no será visible para los técnicos ni recibirá más cotizaciones.')) return;
    try {
      const res = await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${job.id}`, { headers: authHeaders() });
      if (res.data?.success) {
        mostrarAviso('✅ Publicación eliminada y cancelada con éxito.');
        refrescar();
        onClose();
      } else {
        mostrarAviso(res.data?.message || 'Hubo un error al eliminar.');
      }
    } catch (e) {
      console.error('Error al eliminar publicación:', e);
      mostrarAviso('Hubo un error al eliminar la publicación de la Red.');
    }
  };

  // Solicitud dirigida a un favorito: abrirla a toda la red
  const handleReabrirEnRed = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${job.id}/reabrir-red`, {}, { headers: authHeaders() });
      if (res.data?.success) {
        mostrarAviso('🌐 ' + res.data.message);
        refrescar();
        onClose();
      }
    } catch (e) {
      console.error('Error reenviando solicitud a la red:', e);
      mostrarAviso(e.response?.data?.message || 'Hubo un error al reenviar la solicitud a la red.');
    }
  };

  // El técnico marcó "Llegué al lugar": el dueño confirma que ya está aquí y autoriza que comience
  const handleConfirmarLlegada = async () => {
    if (confirmandoLlegada) return;
    if (!await confirmarAccion('¿Confirmas que el técnico ya está en tu propiedad? Con esto podrá comenzar el trabajo.')) return;
    setConfirmandoLlegada(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/work-orders/work_order-${job.id}/client-confirm-arrival`,
        {},
        { headers: authHeaders() }
      );
      if (res.data?.success) {
        setLlegadaConfirmadaAt(res.data.arrival_confirmed_at || new Date().toISOString());
        mostrarAviso('✅ ' + res.data.message);
        refrescar();
      }
    } catch (e) {
      console.error('Error confirmando la llegada', e);
      mostrarAviso(e.response?.data?.error || 'No se pudo confirmar la llegada. Inténtalo de nuevo.');
    } finally {
      setConfirmandoLlegada(false);
    }
  };

  const puedeCalificar = onCalificar && (job.is_accepted || ['Terminado', 'Completado', 'Listo', 'Asignado'].includes(job.status));

  return (
    <>
      <div className="mercado-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="mercado-premium-modal red-detalle-publicacion" style={{ maxWidth: '1080px' }}>
          <div className="mercado-premium-header">
            <h2><ClipboardList size={20} color="#f26522" /> Detalle de Publicación y Cotizaciones</h2>
            <span className="mercado-modal-close" onClick={onClose}>×</span>
          </div>

          <div className="mercado-premium-body">
            {/* Panel izquierdo: fotos e información */}
            <div className="mercado-premium-details" style={{ flex: '1.05' }}>
              {activePhoto ? (
                <div className="mercado-photo-gallery">
                  <div className="mercado-premium-image-wrapper" onClick={() => setIsPhotoZoomed(true)} title="Clic para ampliar imagen">
                    <img src={activePhoto} alt="Evidencia" className="mercado-premium-image" />
                    <div className="mercado-image-zoom-badge">
                      <Maximize2 size={12} /> Clic para ampliar foto
                    </div>
                  </div>

                  {job.fotos && job.fotos.length > 1 && (
                    <div className="mercado-thumbnails-row">
                      {job.fotos.map((f, idx) => (
                        <div key={idx} className={`mercado-thumb-item ${activePhoto === f ? 'active' : ''}`} onClick={() => setActivePhoto(f)}>
                          <img src={f} alt={`Evidencia ${idx + 1}`} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mercado-no-photo-placeholder">
                  <ImageIcon size={36} color="#94a3b8" />
                  <span>Sin fotografías de evidencia</span>
                </div>
              )}

              <div className="mercado-premium-text">
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '10px 0' }}>{job.titulo}</h3>
                <div className="mercado-premium-info-grid">
                  <div className="red-dato red-dato-ancho">
                    <span className="red-dato-icono"><MapPin size={15} /></span>
                    <div>
                      <small>Zona / Área de cobertura</small>
                      <strong>{job.zona}</strong>
                      {job.calle && <span>{job.calle}</span>}
                    </div>
                  </div>
                  <div className="red-dato">
                    <span className="red-dato-icono"><User size={15} /></span>
                    <div>
                      <small>Publicado por</small>
                      <strong>{job.cliente}</strong>
                    </div>
                  </div>
                  <div className="red-dato">
                    <span className="red-dato-icono"><Clock size={15} /></span>
                    <div>
                      <small>Fecha</small>
                      <strong>{job.fecha}</strong>
                    </div>
                  </div>
                  <div className="red-dato red-dato-ancho">
                    <span className="red-dato-icono"><FileText size={15} /></span>
                    <div>
                      <small>Problema</small>
                      <strong className="red-dato-normal">
                        {(() => {
                          // Con la visita ya confirmada, la fecha solo se muestra una vez (a la derecha, "Visita confirmada")
                          const desc = job.descripcion || '';
                          const confirmada = job.scheduled_at && getJobScheduleStatus(job, activeChatQuote).isScheduleConfirmed;
                          const limpia = confirmada ? desc.replace(/\n*\s*\[FECHA \/ HORARIO DESEADO\]:[^\n]*/g, '').trim() : desc;
                          return limpia || 'Sin descripción adicional';
                        })()}
                      </strong>
                    </div>
                  </div>
                </div>

                {puedeCalificar && (
                  <button type="button" className="red-btn-calificar" onClick={() => onCalificar(job)}>
                    <Sparkles size={16} /> Calificar servicio y puntualidad
                  </button>
                )}
              </div>
            </div>

            {/* Panel derecho: proceso del servicio y ofertas */}
            <div className="mercado-premium-form" style={{ background: '#ffffff', overflowY: 'auto', padding: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="red-lista-cotizaciones" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                {/* El técnico ya llegó: el dueño confirma para que comience */}
                {job.arrived_at && (
                  <div className={`cl-llegada ${llegadaConfirmada ? 'confirmada' : ''}`}>
                    <span className="cl-llegada-icono">
                      {llegadaConfirmada ? <CheckCircle size={18} /> : <MapPin size={18} />}
                    </span>
                    <div className="cl-llegada-txt">
                      <strong>{llegadaConfirmada ? 'Confirmaste la llegada del técnico' : 'El técnico ya llegó a tu propiedad'}</strong>
                      <span>
                        Llegó a las {horaCorta(job.arrived_at)}
                        {llegadaConfirmada
                          ? ` · confirmada a las ${horaCorta(llegadaConfirmada)}. Ya puede comenzar el trabajo.`
                          : '. Confírmalo para que pueda comenzar el trabajo.'}
                      </span>
                    </div>
                    {!llegadaConfirmada && (
                      <button type="button" className="cl-llegada-btn" onClick={handleConfirmarLlegada} disabled={confirmandoLlegada}>
                        <CheckCircle size={15} /> {confirmandoLlegada ? 'Confirmando…' : 'Confirmar llegada'}
                      </button>
                    )}
                  </div>
                )}

                {/* El técnico propone un nuevo precio para la cotización aceptada */}
                {job.is_accepted && (
                  <AjusteCotizacionCliente key={job.id} workOrderId={job.id} onCambio={refrescar} />
                )}
                {/* Después de cancelar: elegir si se reenvía a la red o se cancela por completo.
                    El botón "Cancelar servicio" va en la oferta aceptada, debajo del chat */}
                {cancelado && (
                  <CancelacionServicioCliente job={job} onCambio={refrescar} onCerrar={onClose} />
                )}
                {/* QR o código para entrar a la propiedad (vence en máx. 7 días) */}
                <AccesoPropiedadCliente key={`acceso-${job.id}`} job={job} />

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClipboardList size={17} color="#f26522" /> Cotizaciones de Técnicos
                    <span style={{ fontSize: '12px', background: '#ff6600', color: '#ffffff', padding: '2px 8px', borderRadius: '12px' }}>
                      {job.cotizaciones_list?.length || 0}
                    </span>
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Revisa las propuestas de los técnicos. Puedes chatear con ellos o coordinar los detalles del servicio.
                  </p>
                </div>

                {/* Solicitud enviada solo a un técnico favorito */}
                {job.tecnico_dirigido_id && !job.is_accepted && !cancelado && (
                  <div className="red-dirigida">
                    <span>
                      <Star size={15} fill="currentColor" />
                      Enviada solo a tu técnico favorito {job.tecnico_dirigido_nombre}. Si no te responde o prefieres más opciones, ábrela a toda la red.
                    </span>
                    <button type="button" onClick={handleReabrirEnRed}>Abrir a toda la red</button>
                  </div>
                )}

                {(!job.cotizaciones_list || job.cotizaciones_list.length === 0) ? (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 20px', background: '#fffaf5', borderRadius: '16px', border: '2px dashed #fed7aa', margin: '20px 0' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>⏳</div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Aún no hay cotizaciones</p>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                      {job.tecnico_dirigido_id
                        ? `${job.tecnico_dirigido_nombre || 'Tu técnico'} te notificará en cuanto envíe su propuesta.`
                        : 'Los técnicos de la red te notificarán en cuanto envíen su propuesta.'}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {job.cotizaciones_list.map((quote) => {
                      const isAcceptedQuote = Boolean(
                        quote.status === 'accepted' ||
                        quote.is_assigned ||
                        (job.is_accepted && Number(job.tecnico_id) === Number(techDe(quote)))
                      );
                      return (
                        <div key={quote.id} className="red-quote-card" style={isAcceptedQuote ? { border: '2px solid #86efac', background: '#f0fdf4' } : {}}>
                          <div className="red-quote-header">
                            <div className="red-quote-tech">
                              <div
                                className="red-quote-avatar"
                                onClick={() => verPerfil(quote)}
                                style={isAcceptedQuote ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}
                                title="Ver perfil completo y especialidades del técnico"
                              >
                                <FotoTecnico tecnicoId={techDe(quote)} inicial={quote.technician?.first_name?.charAt(0) || 'T'} />
                              </div>
                              <div>
                                <h4
                                  style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                  onClick={() => verPerfil(quote)}
                                >
                                  {quote.technicianName}
                                  {isAcceptedQuote && (
                                    <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', border: '1px solid #86efac' }}>
                                      ✓ Asignado
                                    </span>
                                  )}
                                </h4>
                                <InsigniaTecnico tecnicoId={techDe(quote)} />
                              </div>
                            </div>
                            <div className="red-quote-price" style={{ color: isAcceptedQuote ? '#16a34a' : '#ea580c' }}>
                              {quote.price > 0 ? `$${parseFloat(quote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Chat Iniciado'}
                            </div>
                          </div>

                          {/* Currículum simplificado: calificación, experiencia y especialidades */}
                          <ResumenTecnico tecnicoId={techDe(quote)} onVerCompleto={() => verPerfil(quote)} />

                          {quote.message && (
                            <div className="red-quote-bloque">
                              <small>Propuesta del técnico</small>
                              <p>{quote.message}</p>
                            </div>
                          )}

                          {/* Último mensaje del técnico, si no es la misma propuesta */}
                          {quote.hasNewTechMessage && quote.chat_history?.length > 0 && quote.displayAlertMsg !== quote.message && (
                            <div className="red-quote-bloque red-quote-bloque-mensaje">
                              <small><span className="red-msg-dot-pulse" /> Último mensaje</small>
                              <p>{quote.displayAlertMsg}</p>
                            </div>
                          )}

                          {/* Horario de visita propuesto por el técnico asignado: confirmar o re-coordinar aquí mismo */}
                          {isAcceptedQuote && job.scheduled_at && (() => {
                            const sched = getJobScheduleStatus(job, quote);
                            const fechaTxt = new Date(job.scheduled_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
                            if (sched.isScheduleConfirmed) {
                              return (
                                <div className="red-visita red-visita-ok">
                                  <small><CheckCircle size={13} /> Visita confirmada</small>
                                  <strong>{fechaTxt}</strong>
                                </div>
                              );
                            }
                            if (sched.isRescheduleRequested) {
                              return (
                                <div className="red-visita red-visita-espera">
                                  <small><Clock size={13} /> Pediste otro horario</small>
                                  <span>Esperando que el técnico proponga una nueva fecha. Puedes platicarlo en el chat.</span>
                                </div>
                              );
                            }
                            return (
                              <div className="red-visita red-visita-pendiente">
                                <small><Calendar size={13} /> El técnico propone visitarte</small>
                                <strong>{fechaTxt}</strong>
                                <div className="red-visita-acciones">
                                  <button type="button" className="red-visita-btn confirmar" onClick={() => handleResponderVisita('confirm')}>
                                    <Check size={14} /> Confirmar horario
                                  </button>
                                  <button type="button" className="red-visita-btn otro" onClick={() => handleResponderVisita('reschedule')}>
                                    <MessageCircle size={14} /> Proponer otro
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Estado y acciones de esta oferta */}
                          <div className="red-quote-pie">
                            <span className="red-quote-fecha">
                              <Clock size={12} /> {new Date(quote.created_at).toLocaleString('es-MX')}
                            </span>

                            {isAcceptedQuote && (
                              <div className="red-quote-estado aceptada"><CheckCircle size={14} /> Oferta aceptada</div>
                            )}
                            {!isAcceptedQuote && quote.status === 'rejected' && !quote.retirada_at && (
                              <div className="red-quote-estado rechazada"><X size={14} /> Oferta rechazada</div>
                            )}

                            <div className="red-quote-acciones">
                              {!isAcceptedQuote && !job.is_accepted && quote.status !== 'rejected' && quote.price > 0
                                && cotizacionAceptable(quote) && !cancelado && (
                                <button type="button" className="red-btn-accept" onClick={() => handleAcceptQuote(quote)}>
                                  <Check size={15} /> Aceptar oferta
                                </button>
                              )}
                              <button type="button" className="red-btn-contact" onClick={() => { setActiveChatQuote(quote); setChatAbierto(true); }}>
                                <MessageCircle size={15} /> Chat ({quote.chat_history?.length || 0})
                              </button>
                              {!isAcceptedQuote && quote.status !== 'rejected' && !job.is_accepted && (
                                <button type="button" className="red-btn-reject" onClick={() => handleRejectQuote(quote.id)}>
                                  Rechazar
                                </button>
                              )}
                            </div>
                            {/* Cancelar el servicio asignado (antes de que comience), debajo del chat */}
                            {isAcceptedQuote && job.status === 'Asignado' && (
                              <CancelacionServicioCliente job={job} onCambio={refrescar} onCerrar={onClose} />
                            )}
                          </div>
                          {!isAcceptedQuote && <EstadoCotizacionRed quote={quote} job={job} onCambio={refrescar} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mercado-premium-footer" style={{ display: 'flex', justifyContent: job.is_mine ? 'space-between' : 'flex-end', alignItems: 'center', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
            {job.is_mine && !['Asignado', 'En Progreso', 'Cancelado_Cliente'].includes(job.status) && (
              <button type="button" className="mercado-btn-delete-publication red-btn-eliminar-publicacion" onClick={handleDeleteJob}>
                <Trash2 size={16} /> Cancelar / Eliminar Publicación
              </button>
            )}
            <button className="mercado-btn-cancel" onClick={onClose}>Cerrar</button>
          </div>

          {/* Conversaciones: panel lateral izquierdo que se muestra y oculta con su pestaña */}
          {!showTechModal && !isPhotoZoomed && (
            <PanelChatLateral
              abierto={chatAbierto}
              onToggle={() => setChatAbierto(v => !v)}
              contador={(job.cotizaciones_list || []).filter(q => q.hasNewTechMessage).length}
            >
              {activeChatQuote ? (
                <div className="red-embedded-chat-wrap">
                  <div className="red-chat-top-header">
                    <button className="back-btn" onClick={() => setActiveChatQuote(null)}>
                      <ChevronLeft size={16} /> Conversaciones
                    </button>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{activeChatQuote.technicianName}</strong>
                      <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: '800' }}>
                        {activeChatQuote.price > 0 ? `Oferta: $${parseFloat(activeChatQuote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Chat Activo'}
                      </span>
                    </div>
                  </div>

                  <div className="mercado-chat-messages-container">
                    {(!activeChatQuote.chat_history || activeChatQuote.chat_history.length === 0) ? (
                      <div className="mercado-chat-empty-state">
                        <div className="icon-wrap"><MessageCircle size={26} /></div>
                        <p>Inicia la conversación</p>
                        <span>Escribe a {activeChatQuote.technicianName} para acordar precio, horarios o dudas sobre el servicio.</span>
                      </div>
                    ) : (
                      activeChatQuote.chat_history.map((msg, idx) => {
                        const isClient = Number(msg.sender_id) === Number(user?.id) || msg.sender_role === 'Cliente' || msg.sender_role === 'Usuario';
                        return (
                          <div key={idx} className={`mercado-chat-bubble-row ${isClient ? 'sent' : 'received'}`}>
                            <span className="mercado-chat-bubble-sender">{isClient ? 'Tú (Cliente)' : (msg.sender_name || 'Técnico')}</span>
                            <div className="mercado-chat-bubble">{msg.message}</div>
                            <span className="mercado-chat-bubble-time">{formatTime(msg.created_at)}</span>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {(activeChatQuote.status === 'accepted' || activeChatQuote.is_assigned || job.is_accepted) ? (
                    <div className="red-chat-oferta">
                      <span className="red-chat-oferta-texto">
                        <CheckCircle size={14} /> Cotización aceptada: ${parseFloat(activeChatQuote.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="red-chat-oferta-chip">Técnico asignado</span>
                    </div>
                  ) : (activeChatQuote.price > 0 && activeChatQuote.status !== 'rejected' && (
                    <div className="red-chat-oferta">
                      <span className="red-chat-oferta-texto">
                        Propuesta de {activeChatQuote.technicianName}: ${parseFloat(activeChatQuote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                      <button type="button" className="red-chat-oferta-aceptar" onClick={() => handleAcceptQuote(activeChatQuote)}>
                        <Check size={14} /> Aceptar oferta
                      </button>
                    </div>
                  ))}

                  <form onSubmit={handleSendClientChat} className="mercado-chat-input-bar">
                    <input
                      type="text"
                      placeholder={`Escribe un mensaje a ${activeChatQuote.technicianName}...`}
                      value={clientChatInput}
                      onChange={(e) => setClientChatInput(e.target.value)}
                      disabled={sendingClientChat}
                    />
                    <button type="submit" className="mercado-chat-send-btn" disabled={sendingClientChat || !clientChatInput.trim()}>
                      <Send size={15} />
                      <span>{sendingClientChat ? 'Enviando...' : 'Enviar'}</span>
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="red-conv-head"><MessageCircle size={16} /> Conversaciones</div>
                  <div className="red-conv-lista">
                    {(job.cotizaciones_list || []).length === 0 ? (
                      <p className="red-conv-vacio">Aún no hay técnicos con quienes conversar en esta publicación.</p>
                    ) : (
                      job.cotizaciones_list.map((quote) => {
                        const ultimo = quote.chat_history?.[quote.chat_history.length - 1];
                        return (
                          <button key={quote.id} type="button" className="red-conv-item" onClick={() => setActiveChatQuote(quote)}>
                            <span className="red-conv-avatar">{quote.technician?.first_name?.charAt(0) || 'T'}</span>
                            <span className="red-conv-texto">
                              <strong>{quote.technicianName}</strong>
                              <small>{ultimo?.message || 'Sin mensajes todavía'}</small>
                            </span>
                            {quote.hasNewTechMessage && <span className="red-msg-dot-pulse" />}
                            <ChevronRight size={16} className="red-conv-flecha" />
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </PanelChatLateral>
          )}
        </div>
      </div>

      {/* Currículum del técnico */}
      {showTechModal && perfilTecnico?.id && (
        <CurriculumTecnico tecnicoId={perfilTecnico.id} respaldo={perfilTecnico} onCerrar={cerrarCurriculum} />
      )}

      {/* Foto en pantalla completa */}
      {isPhotoZoomed && activePhoto && (
        <div className="mercado-lightbox-overlay" onClick={() => setIsPhotoZoomed(false)}>
          <div className="mercado-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="mercado-lightbox-close" onClick={() => setIsPhotoZoomed(false)} title="Cerrar imagen">
              <X size={26} />
            </button>
            <img src={activePhoto} alt="Evidencia en tamaño completo" className="mercado-lightbox-img" />
          </div>
        </div>
      )}
    </>
  );
};

export default DetallePublicacionRed;
