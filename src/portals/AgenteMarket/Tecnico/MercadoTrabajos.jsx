import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import Header from '../../../components/Shared/Header';
import { MapPin, DollarSign, Clock, Send, User, FileText, Maximize2, Image as ImageIcon, X, List, Map as MapIcon, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import '../../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';
import { useAuth } from '../../../context/AuthContext';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 21.0181, lng: -89.6242 };

const limpiarDescripcion = (rawDesc) => {
  if (!rawDesc) return 'Sin descripción adicional';
  let clean = rawDesc;
  clean = clean.replace(/\[LOTE-[A-Z0-9]+\]\s*(\(\d+\/\d+\))?\s*/gi, '');
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*(otro|Otro|ninguno|Ninguno|n\/a|N\/A)\s*/gi, '');
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*/gi, ' - Equipo: ');
  return clean.trim() || rawDesc;
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const MercadoTrabajos = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDgyTj0X6kgGoMV8NxQGDp4-Nx0bxJd0Hw"
  });

  const [selectedJob, setSelectedJob] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [networkJobs, setNetworkJobs] = useState([]);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteStep, setQuoteStep] = useState(1);
  const [activePhoto, setActivePhoto] = useState(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Embedded Chat State
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef(null);

  const { user: authUser } = useAuth();

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos`, { headers });
      if (res.data.success) {
        const jobs = res.data.data.map(order => {
          let myQuote = null;
          let myQuotesHistory = [];
          if (authUser && order.network_quotes) {
            const userQuotes = order.network_quotes.filter(q => Number(q.technician_id) === Number(authUser.id));
            if (userQuotes.length > 0) {
              userQuotes.sort((a, b) => b.id - a.id);
              myQuote = userQuotes[0];
              myQuotesHistory = userQuotes;
            }
          }
          const fotos = [
            order.evidence_path,
            order.evidence_path_2,
            order.property?.facade_photo_path
          ].filter(Boolean);

          const rawLat = order.lat ? parseFloat(order.lat) : (order.area_lat ? parseFloat(order.area_lat) : (21.0181 + Math.sin(order.id * 17) * 0.025));
          const rawLng = order.lng ? parseFloat(order.lng) : (order.area_lng ? parseFloat(order.area_lng) : (-89.6242 + Math.cos(order.id * 17) * 0.025));
          const coloniaTexto = order.colonia_cercana || order.zona_colonia || order.zona || 'Mérida, Yucatán';
          const tituloProblema = order.type 
            ? `${order.type}${order.equipment ? ' - ' + order.equipment : ''}` 
            : 'Problema / Servicio Solicitado';

          // Detectar último mensaje del cliente en el chat para alertas
          const chatHistory = myQuote?.chat_history || [];
          const lastMsg = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
          const lastClientMsg = (lastMsg && (Number(lastMsg.sender_id) !== Number(authUser?.id) || lastMsg.sender_role === 'Cliente')) ? lastMsg : null;

          return {
            id: order.id,
            titulo: tituloProblema,
            tipo: order.type || 'Problema',
            equipo: order.equipment || '',
            lat: rawLat,
            lng: rawLng,
            presupuesto: "A convenir",
            cliente: order.creator?.name || 'Cliente de la Red',
            lugar: order.property?.property_name || 'Lugar no especificado',
            zona: coloniaTexto,
            colonia: coloniaTexto,
            calle: order.property?.address || 'Dirección protegida',
            descripcion: limpiarDescripcion(order.description),
            foto: fotos[0] || null,
            fotos: fotos,
            fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
            cotizaciones: order.network_quotes_count || 0,
            myQuote,
            myQuotesHistory,
            lastClientMsg,
          };
        });
        setNetworkJobs(jobs);

        // Si tenemos un trabajo seleccionado en el modal, actualizar su estado en vivo
        if (selectedJob) {
          const updated = jobs.find(j => j.id === selectedJob.id);
          if (updated) {
            setSelectedJob(updated);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching jobs", e);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 4000);
    return () => clearInterval(interval);
  }, [authUser]);

  useEffect(() => {
    if (showQuoteModal && quoteStep === 1) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedJob?.myQuote?.chat_history, showQuoteModal, quoteStep]);

  const handleSendEmbeddedChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || sendingChat || !selectedJob) return;

    const textToSend = chatInput.trim();
    setChatInput('');
    setSendingChat(true);

    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      let quoteId = selectedJob.myQuote?.id;

      // Si no existe cotización/chat previo, iniciamos la sesión
      if (!quoteId) {
        const initRes = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${selectedJob.id}/iniciar-chat`,
          {},
          { headers }
        );
        if (initRes.data?.success && initRes.data?.quote) {
          quoteId = initRes.data.quote.id;
        }
      }

      if (quoteId) {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quoteId}/chat`,
          { message: textToSend },
          { headers }
        );
        fetchJobs();
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      alert("No se pudo enviar el mensaje. Intenta de nuevo.");
    } finally {
      setSendingChat(false);
    }
  };

  const handleEnviarCotizacion = async () => {
    if (!selectedJob) return;
    if (!quotePrice) {
      alert("Por favor ingresa una propuesta económica.");
      return;
    }
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${selectedJob.id}/cotizar`,
        { price: quotePrice, message: quoteMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        alert("✅ " + res.data.message);
        setQuoteStep(1);
        setQuotePrice('');
        setQuoteMessage('');
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
      alert("Hubo un error al enviar tu cotización. Intenta de nuevo.");
    }
  };

  const openQuoteModalForJob = (job) => {
    setSelectedJob(job);
    setQuotePrice(job.myQuote && job.myQuote.price > 0 ? job.myQuote.price : '');
    setQuoteMessage(job.myQuote ? job.myQuote.message : '');
    setActivePhoto(job.fotos?.[0] || job.foto || null);
    setQuoteStep(1);
    setShowQuoteModal(true);
  };

  const getStatusLabel = (status) => {
    if (status === 'rejected') return 'Rechazada';
    if (status === 'accepted') return 'Aceptada';
    return 'Pendiente';
  };

  const chatMessages = selectedJob?.myQuote?.chat_history || [];
  const lastClientMsg = selectedJob?.lastClientMsg;

  return (
    <div className="mercado-container">
      <Header title="Mercado de Trabajos" />

      <div className="mercado-content">
        {/* Floating Mobile Toggle Button (Tipo Uber) */}
        <button 
          className="mercado-mobile-toggle-btn"
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
        >
          {mobileDrawerOpen ? (
            <><MapIcon size={16} /> Ver Mapa</>
          ) : (
            <><List size={16} /> Ver Lista ({networkJobs.length})</>
          )}
        </button>

        {/* ─── Map ─── */}
        <div className="mercado-map-section">
          {isLoaded ? (
            <>
              <div className="mercado-map-overlay-badge">
                <span className="mercado-map-live-dot" />
                {networkJobs.length} trabajos disponibles
              </div>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={13}
                options={{ disableDefaultUI: false }}
              >
                {networkJobs.map(job => (
                  <React.Fragment key={job.id}>
                    <Circle
                      center={{ lat: job.lat, lng: job.lng }}
                      radius={550}
                      options={{
                        fillColor: job.lastClientMsg ? '#2563eb' : '#ff6600',
                        fillOpacity: 0.16,
                        strokeColor: job.lastClientMsg ? '#1d4ed8' : '#ea580c',
                        strokeOpacity: 0.7,
                        strokeWeight: 1.5,
                        clickable: true
                      }}
                      onClick={() => openQuoteModalForJob(job)}
                    />
                    <Marker
                      position={{ lat: job.lat, lng: job.lng }}
                      onClick={() => openQuoteModalForJob(job)}
                      title={`Zona: ${job.zona}`}
                      icon={{
                        url: job.lastClientMsg
                          ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                          : (job.myQuote
                            ? (job.myQuote.status === 'rejected'
                              ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                              : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png')
                            : 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png')
                      }}
                    />
                  </React.Fragment>
                ))}

                {selectedJob && !showQuoteModal && (
                  <InfoWindow
                    position={{ lat: selectedJob.lat, lng: selectedJob.lng }}
                    onCloseClick={() => setSelectedJob(null)}
                  >
                    <div className="mercado-info-window">
                      <h4>{selectedJob.titulo}</h4>
                      <p style={{ color: '#ea580c', fontWeight: '700', margin: '4px 0' }}>
                        <MapPin size={12} /> Zona: {selectedJob.zona}
                      </p>
                      <button
                        className="mercado-btn-details"
                        onClick={() => openQuoteModalForJob(selectedJob)}
                      >
                        {selectedJob.myQuote ? '📋 Ver Detalle y Chat' : '💼 Cotizar este trabajo'}
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </>
          ) : (
            <div className="mercado-loading-map">Cargando Mapa...</div>
          )}
        </div>

        {/* ─── Sidebar (Tipo Uber) ─── */}
        <div className={`mercado-sidebar ${mobileDrawerOpen ? 'mobile-open' : ''}`}>
          <div className="mercado-sidebar-header">
            <div 
              className="mercado-mobile-drag-handle" 
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)} 
            />
            <p className="mercado-sidebar-title">🔴 En vivo</p>
            <h2 className="mercado-sidebar-subtitle">Trabajos en la Red</h2>
            <p className="mercado-sidebar-desc">Selecciona un trabajo del mapa o de la lista</p>
          </div>

          <div className="mercado-job-list">
            {networkJobs.length === 0 && (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 20px', fontSize: '14px' }}>
                No hay trabajos disponibles en este momento
              </div>
            )}
            {networkJobs.map(job => (
              <div
                key={job.id}
                className={`mercado-job-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                onClick={() => openQuoteModalForJob(job)}
              >
                {/* 1. Colonia cercana y Badge de Estado */}
                <div className="mercado-job-card-top">
                  <div className="mercado-job-colonia-tag">
                    <MapPin size={13} color="#ea580c" />
                    <span>{job.zona}</span>
                  </div>
                  {job.myQuote ? (
                    <span className={`mercado-job-badge ${job.myQuote.status === 'rejected' ? 'badge-rejected' : (job.myQuote.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`}>
                      {job.myQuote.status === 'rejected' ? 'Rechazada' : (job.myQuote.price > 0 ? `$${parseFloat(job.myQuote.price).toLocaleString('es-MX')}` : 'Chat Iniciado')}
                    </span>
                  ) : (
                    <span className="mercado-job-badge-disponible">Disponible</span>
                  )}
                </div>

                {/* 2. Problema Solicitado */}
                <h4 className="mercado-job-card-title">{job.titulo}</h4>
                <p className="mercado-job-card-desc">{job.descripcion}</p>

                {/* 3. ALERTA DE MENSAJE DEL CLIENTE */}
                {job.lastClientMsg && (
                  <div className="mercado-job-msg-alert">
                    <span className="mercado-msg-dot-pulse" />
                    <span>💬 <strong>Mensaje del Cliente:</strong> "{job.lastClientMsg.message}"</span>
                  </div>
                )}

                {/* Footer del Cuadrito */}
                <div className="mercado-job-card-footer">
                  <span className="mercado-ofertas-count">{job.cotizaciones} ofertas enviadas</span>
                  <span className="mercado-fecha-tag"><Clock size={11} /> {job.fecha}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MODAL PREMIUM 2 COLUMNAS (DETALLES + CHAT INTEGRADO) ─── */}
      {showQuoteModal && selectedJob && (
        <div className="mercado-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowQuoteModal(false)}>
          <div className="mercado-premium-modal" style={{ maxWidth: '1080px' }}>
            
            {/* ══════════════════════════════════════════════════
                PASO 1: DETALLES DEL TRABAJO + CHAT DIRECTO EMBEBIDO
            ══════════════════════════════════════════════════ */}
            {quoteStep === 1 && (
              <>
                <div className="mercado-premium-header">
                  <h2>💼 Detalle del Trabajo y Chat</h2>
                  <span className="mercado-modal-close" onClick={() => setShowQuoteModal(false)}>×</span>
                </div>

                <div className="mercado-premium-body">
                  {/* Columna Izquierda: Información, Fotos y Mi Oferta */}
                  <div className="mercado-premium-details" style={{ flex: '1.05' }}>
                    {/* Galería de Fotos / Evidencias del Problema */}
                    {activePhoto ? (
                      <div className="mercado-photo-gallery">
                        <div
                          className="mercado-premium-image-wrapper"
                          onClick={() => setIsPhotoZoomed(true)}
                          title="Clic para ampliar imagen"
                        >
                          <img src={activePhoto} alt="Evidencia del problema" className="mercado-premium-image" />
                          <div className="mercado-image-zoom-badge">
                            <Maximize2 size={12} /> Clic para ampliar foto
                          </div>
                        </div>

                        {selectedJob.fotos && selectedJob.fotos.length > 1 && (
                          <div className="mercado-thumbnails-row">
                            {selectedJob.fotos.map((f, idx) => (
                              <div
                                key={idx}
                                className={`mercado-thumb-item ${activePhoto === f ? 'active' : ''}`}
                                onClick={() => setActivePhoto(f)}
                              >
                                <img src={f} alt={`Evidencia ${idx + 1}`} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mercado-no-photo-placeholder">
                        <ImageIcon size={36} color="#94a3b8" />
                        <span>Sin fotografías de evidencia adjuntas</span>
                      </div>
                    )}

                    {/* Información del Trabajo */}
                    <div className="mercado-premium-text">
                      {/* 1. Colonia Cercana */}
                      <div className="mercado-info-item full-width" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '14px', padding: '12px 14px' }}>
                        <MapPin size={20} color="#ea580c" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong style={{ color: '#ea580c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                            Colonia Cercana
                          </strong>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{selectedJob.zona}</span>
                          <div style={{ fontSize: '11px', color: '#9a3412', marginTop: '3px' }}>
                            🔒 La dirección exacta de la casa se te revelará una vez que el trabajo sea aceptado.
                          </div>
                        </div>
                      </div>

                      {/* 2. Problema Solicitado */}
                      <div className="mercado-info-item full-width" style={{ marginTop: '10px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <FileText size={17} color="#ea580c" />
                          <strong style={{ color: '#0f172a', fontSize: '14.5px', fontWeight: '800' }}>
                            {selectedJob.titulo}
                          </strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-line', background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                          {selectedJob.descripcion}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                          <span><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> Publicado: {selectedJob.fecha}</span>
                          <span style={{ fontWeight: '600', color: '#ea580c' }}>{selectedJob.cotizaciones} ofertas enviadas</span>
                        </div>
                      </div>

                      {/* 3. Mi Oferta Actual Card */}
                      <div style={{ marginTop: '12px', background: selectedJob.myQuote?.status === 'rejected' ? '#fff1f2' : (selectedJob.myQuote?.status === 'accepted' ? '#f0fdf4' : '#fff7ed'), border: `1.5px solid ${selectedJob.myQuote?.status === 'rejected' ? '#fecdd3' : (selectedJob.myQuote?.status === 'accepted' ? '#bbf7d0' : '#fed7aa')}`, borderRadius: '14px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: selectedJob.myQuote?.status === 'rejected' ? '#e11d48' : '#ea580c', letterSpacing: '0.5px' }}>
                            📋 Mi Propuesta Económica
                          </span>
                          {selectedJob.myQuote && (
                            <span className={`mercado-job-badge ${selectedJob.myQuote.status === 'rejected' ? 'badge-rejected' : (selectedJob.myQuote.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`}>
                              {getStatusLabel(selectedJob.myQuote.status)}
                            </span>
                          )}
                        </div>

                        {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? (
                          <>
                            <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>
                              ${parseFloat(selectedJob.myQuote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                            {selectedJob.myQuote.message && (
                              <div style={{ fontSize: '12.5px', color: '#475569', fontStyle: 'italic', marginTop: '4px' }}>
                                "{selectedJob.myQuote.message}"
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            Aún no has enviado una cotización económica a este trabajo.
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setQuoteStep(2)}
                          style={{
                            width: '100%',
                            marginTop: '10px',
                            padding: '10px 14px',
                            background: 'linear-gradient(135deg, #ff6600 0%, #ea580c 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 3px 10px rgba(234, 88, 12, 0.25)'
                          }}
                        >
                          <DollarSign size={16} />
                          <span>{selectedJob.myQuote && selectedJob.myQuote.price > 0 ? '✏️ Modificar Oferta' : '💼 Enviar Cotización'}</span>
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Columna Derecha: CHAT DIRECTO EMBEBIDO */}
                  <div className="mercado-embedded-chat-panel">
                    {/* Header del Chat */}
                    <div className="mercado-chat-header">
                      <div className="mercado-chat-header-title">
                        <h3><MessageCircle size={18} color="#ea580c" /> Conversación con el Cliente</h3>
                      </div>
                      <div className="mercado-chat-online-badge">
                        <span className="mercado-chat-online-dot" /> En línea
                      </div>
                    </div>

                    {/* Alerta de Mensaje si el cliente escribió */}
                    {lastClientMsg && (
                      <div className="mercado-chat-alert-banner">
                        <div className="mercado-chat-alert-icon">🔔</div>
                        <div className="mercado-chat-alert-text">
                          <strong>El Cliente te envió un mensaje:</strong>
                          <span>"{lastClientMsg.message}"</span>
                        </div>
                      </div>
                    )}

                    {/* Stream de Mensajes */}
                    <div className="mercado-chat-messages-container">
                      {chatMessages.length === 0 ? (
                        <div className="mercado-chat-empty-state">
                          <div className="icon-wrap">
                            <MessageCircle size={26} />
                          </div>
                          <p>Inicia el chat con el cliente</p>
                          <span>Escribe aquí abajo para aclarar dudas, acordar detalles o confirmar cuándo puedes acudir.</span>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => {
                          const isMe = Number(msg.sender_id) === Number(authUser?.id) || msg.sender_role === 'Técnico de la Red' || msg.sender_role === 'Técnico';
                          return (
                            <div
                              key={idx}
                              className={`mercado-chat-bubble-row ${isMe ? 'sent' : 'received'}`}
                            >
                              <span className="mercado-chat-bubble-sender">
                                {isMe ? 'Tú (Técnico)' : (msg.sender_name || 'Cliente')}
                              </span>
                              <div className="mercado-chat-bubble">
                                {msg.message}
                              </div>
                              <span className="mercado-chat-bubble-time">
                                {formatTime(msg.created_at)}
                              </span>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input Bar integrado */}
                    <form onSubmit={handleSendEmbeddedChat} className="mercado-chat-input-bar">
                      <input
                        type="text"
                        placeholder="Escribe un mensaje al cliente..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={sendingChat}
                      />
                      <button
                        type="submit"
                        className="mercado-chat-send-btn"
                        disabled={sendingChat || !chatInput.trim()}
                      >
                        <Send size={15} />
                        <span>{sendingChat ? 'Enviando...' : 'Enviar'}</span>
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mercado-premium-footer" style={{ justifyContent: 'space-between' }}>
                  <button className="mercado-btn-cancel" onClick={() => setShowQuoteModal(false)}>Cerrar Ventana</button>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    💬 Escribe directamente en el chat o modifica tu cotización.
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════
                PASO 2: FORMULARIO DE COTIZACIÓN
            ══════════════════════════════════════════════════ */}
            {quoteStep === 2 && (
              <>
                <div className="mercado-premium-header">
                  <h2>💰 {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? 'Modificar Oferta Económica' : 'Enviar Cotización'}</h2>
                  <span className="mercado-modal-close" onClick={() => setShowQuoteModal(false)}>×</span>
                </div>

                <div className="mercado-premium-body">
                  <div className="mercado-premium-form" style={{ width: '100%', padding: '24px' }}>
                    {/* Resumen compacto del trabajo */}
                    <div className="mq-compact-summary">
                      <div className="mq-compact-title">{selectedJob.titulo}</div>
                      <div className="mq-compact-meta">
                        <span><MapPin size={13} color="#ea580c" /> {selectedJob.zona}</span>
                        <span><User size={13} color="#3b82f6" /> {selectedJob.cliente}</span>
                      </div>
                    </div>

                    {/* Alerta si fue rechazada */}
                    {selectedJob.myQuote && selectedJob.myQuote.status === 'rejected' && (
                      <div className="mq-rejection-warning">
                        <span className="mq-rejection-icon">⚠️</span>
                        <div className="mq-rejection-text">
                          <strong>Tu última oferta (${selectedJob.myQuote.price}) fue rechazada</strong>
                          <p>Puedes mejorar tu precio o enviar un mensaje para llegar a un acuerdo con el cliente.</p>
                        </div>
                      </div>
                    )}

                    <div className="mercado-form-group" style={{ marginTop: '16px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', display: 'block' }}>
                        Propuesta Económica ($ MXN) *
                      </label>
                      <div className="mercado-input-wrapper">
                        <DollarSign size={18} className="mercado-input-icon" />
                        <input
                          type="number"
                          placeholder="Ej. 350"
                          className="mercado-premium-input"
                          value={quotePrice}
                          onChange={(e) => setQuotePrice(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="mercado-form-group" style={{ marginTop: '16px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', display: 'block' }}>
                        Mensaje para el cliente
                      </label>
                      <textarea
                        placeholder="Ej. Hola Pedro, puedo ir hoy a revisarlo por este precio..."
                        className="mercado-premium-textarea"
                        value={quoteMessage}
                        onChange={(e) => setQuoteMessage(e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                <div className="mercado-premium-footer">
                  <button className="mercado-btn-cancel" onClick={() => setQuoteStep(1)}>
                    ← Volver al Chat y Detalle
                  </button>
                  <button className="mercado-premium-submit" onClick={handleEnviarCotizacion}>
                    <Send size={16} />
                    {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? 'Actualizar Oferta' : 'Enviar Cotización'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ─── Lightbox Fullscreen Zoom Modal ─── */}
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
    </div>
  );
};

export default MercadoTrabajos;
