import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import Header from '../../../components/Shared/Header';
import { MapPin, DollarSign, Clock, Send, User, FileText, Maximize2, Image as ImageIcon, X, List, Map as MapIcon, MessageCircle, AlertCircle, CheckCircle2, Phone, Calendar, ChevronLeft, ExternalLink } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('disponibles'); // 'disponibles' | 'aceptados'
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [acceptedTabMode, setAcceptedTabMode] = useState('coordinacion'); // 'coordinacion' | 'chat'
  
  // Embedded Chat State
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef(null);

  // Visit Scheduling State
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const { user: authUser } = useAuth();

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos`, { headers });
      if (res.data.success) {
        // 1. Trabajos Disponibles en la Red
        const jobs = (res.data.data || []).map(order => {
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
            priority: order.priority || 'Normal',
            is_urgent: Boolean(order.is_urgent || order.priority === 'Urgente' || order.type === 'SOS'),
            scheduled_at: order.scheduled_at,
            is_accepted: false,
            myQuote,
            myQuotesHistory,
            lastClientMsg,
          };
        });
        setNetworkJobs(jobs);

        // 2. Trabajos Aceptados / Asignados para este Técnico
        const accepted = (res.data.accepted_jobs || []).map(order => {
          const chatHistory = order.myQuote?.chat_history || [];
          const lastMsg = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
          const lastClientMsg = (lastMsg && (Number(lastMsg.sender_id) !== Number(authUser?.id) || lastMsg.sender_role === 'Cliente')) ? lastMsg : null;

          return {
            ...order,
            is_accepted: true,
            zona: order.zone || 'Mérida, Yucatán',
            calle: order.full_address,
            descripcion: limpiarDescripcion(order.description),
            fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
            cotizaciones: 1,
            lastClientMsg,
          };
        });
        setAcceptedJobs(accepted);

        // Si tenemos un trabajo seleccionado en el modal, actualizar su estado en vivo
        if (selectedJob) {
          const updated = [...jobs, ...accepted].find(j => j.id === selectedJob.id);
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
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [authUser]);

  // Polling de alta frecuencia (1.5s) para chat en tiempo real cuando el modal está abierto
  useEffect(() => {
    if (!showQuoteModal || !selectedJob || quoteStep !== 1) return;

    const pollLiveChat = async () => {
      const quoteId = selectedJob.myQuote?.id;
      if (!quoteId) return;

      try {
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quoteId}/chat`, { headers });
        if (res.data?.success && res.data.chat_history) {
          setSelectedJob(prev => {
            if (!prev || !prev.myQuote) return prev;
            const currentLen = prev.myQuote.chat_history?.length || 0;
            const newLen = res.data.chat_history.length;
            if (currentLen !== newLen || JSON.stringify(prev.myQuote.chat_history) !== JSON.stringify(res.data.chat_history)) {
              return {
                ...prev,
                myQuote: {
                  ...prev.myQuote,
                  chat_history: res.data.chat_history
                }
              };
            }
            return prev;
          });
        }
      } catch (e) {
        // silent polling
      }
    };

    const liveInterval = setInterval(pollLiveChat, 1500);
    return () => clearInterval(liveInterval);
  }, [showQuoteModal, selectedJob?.myQuote?.id, quoteStep]);

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

    // Actualización optimista instantánea (0ms)
    const myName = authUser ? (authUser.first_name ? `${authUser.first_name} ${authUser.last_name || ''}`.trim() : (authUser.name || 'Tú (Técnico)')) : 'Tú (Técnico)';
    const optimisticMessage = {
      sender_id: authUser?.id,
      sender_name: myName,
      sender_role: 'Técnico',
      message: textToSend,
      created_at: new Date().toISOString()
    };

    setSelectedJob(prev => {
      if (!prev) return prev;
      const currentQuote = prev.myQuote || { chat_history: [] };
      return {
        ...prev,
        myQuote: {
          ...currentQuote,
          chat_history: [...(currentQuote.chat_history || []), optimisticMessage]
        }
      };
    });

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
        const chatRes = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quoteId}/chat`,
          { message: textToSend },
          { headers }
        );
        if (chatRes.data?.chat_history) {
          setSelectedJob(prev => {
            if (!prev || !prev.myQuote) return prev;
            return {
              ...prev,
              myQuote: {
                ...prev.myQuote,
                chat_history: chatRes.data.chat_history
              }
            };
          });
        }
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

  const handleProgramarVisita = async (jobId) => {
    if (!scheduleDate) {
      alert("Por favor selecciona una fecha y hora para la visita.");
      return;
    }
    setSavingSchedule(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${jobId}/programar-visita`,
        { scheduled_at: scheduleDate, notes: scheduleNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        alert("✅ " + res.data.message);
        setScheduleNotes('');
        fetchJobs();
      }
    } catch (e) {
      console.error("Error programando visita", e);
      alert("Hubo un error al programar la visita. Intenta de nuevo.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const openQuoteModalForJob = (job) => {
    setSelectedJob(job);
    setQuotePrice(job.myQuote && job.myQuote.price > 0 ? job.myQuote.price : '');
    setQuoteMessage(job.myQuote ? job.myQuote.message : '');
    setActivePhoto(job.fotos?.[0] || job.foto || null);
    if (job.scheduled_at) {
      const d = new Date(job.scheduled_at);
      if (!isNaN(d.getTime())) {
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setScheduleDate(localIso);
      }
    } else {
      // Default to next day 10:00 AM
      const nextDay = new Date(Date.now() + 86400000);
      nextDay.setHours(10, 0, 0, 0);
      const localIso = new Date(nextDay.getTime() - nextDay.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setScheduleDate(localIso);
    }
    setScheduleNotes('');
    setAcceptedTabMode('coordinacion');
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
                {activeTab === 'disponibles' ? `${networkJobs.length} disponibles` : `${acceptedJobs.length} aceptados`}
              </div>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={13}
                options={{ disableDefaultUI: false }}
              >
                {/* Marcadores de Trabajos Disponibles */}
                {activeTab === 'disponibles' && networkJobs.map(job => (
                  <React.Fragment key={job.id}>
                    <Circle
                      center={{ lat: job.lat, lng: job.lng }}
                      radius={550}
                      options={{
                        fillColor: job.is_urgent ? '#ef4444' : (job.lastClientMsg ? '#2563eb' : '#ff6600'),
                        fillOpacity: 0.16,
                        strokeColor: job.is_urgent ? '#dc2626' : (job.lastClientMsg ? '#1d4ed8' : '#ea580c'),
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
                        url: job.is_urgent
                          ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                          : (job.lastClientMsg
                            ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                            : (job.myQuote ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'))
                      }}
                    />
                  </React.Fragment>
                ))}

                {/* Marcadores de Trabajos Aceptados */}
                {activeTab === 'aceptados' && acceptedJobs.map(job => (
                  <Marker
                    key={`acc-${job.id}`}
                    position={{ lat: job.lat, lng: job.lng }}
                    onClick={() => openQuoteModalForJob(job)}
                    title={`Trabajo Aceptado: ${job.titulo}`}
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    }}
                  />
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
                        {selectedJob.is_accepted ? '✅ Ver Detalle y Visita' : (selectedJob.myQuote ? '📋 Ver Detalle y Chat' : '💼 Cotizar este trabajo')}
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
            <p className="mercado-sidebar-title">🔴 Panel Técnico</p>
            <h2 className="mercado-sidebar-subtitle">Mercado de la Red</h2>
            <p className="mercado-sidebar-desc">Cotiza trabajos o gestiona tus servicios aceptados</p>
          </div>

          {/* Selector de Pestañas (Disponibles vs Aceptados) */}
          <div className="mercado-sidebar-tabs">
            <button
              type="button"
              className={`mercado-tab-btn ${activeTab === 'disponibles' ? 'active' : ''}`}
              onClick={() => setActiveTab('disponibles')}
            >
              🌐 Disponibles
              <span className="mercado-tab-badge">{networkJobs.length}</span>
            </button>
            <button
              type="button"
              className={`mercado-tab-btn tab-accepted ${activeTab === 'aceptados' ? 'active' : ''}`}
              onClick={() => setActiveTab('aceptados')}
            >
              ✓ Aceptados
              <span className="mercado-tab-badge">{acceptedJobs.length}</span>
            </button>
          </div>

          <div className="mercado-job-list">
            {/* PESTAÑA 1: TRABAJOS DISPONIBLES */}
            {activeTab === 'disponibles' && (
              <>
                {networkJobs.length === 0 && (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 20px', fontSize: '14px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                    No hay trabajos disponibles para cotizar en este momento.
                  </div>
                )}
                {networkJobs.map(job => (
                  <div
                    key={job.id}
                    className={`mercado-job-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                    onClick={() => openQuoteModalForJob(job)}
                  >
                    {/* 1. Colonia cercana, Urgencia y Badge de Estado */}
                    <div className="mercado-job-card-top">
                      <div className="mercado-job-colonia-tag">
                        <MapPin size={13} color="#ea580c" />
                        <span>{job.zona}</span>
                      </div>
                      
                      {job.is_urgent && (
                        <span className="mercado-urgency-badge urgent">⚡ Urgente</span>
                      )}
                      
                      {job.myQuote ? (
                        <span className={`mercado-job-badge ${job.myQuote.status === 'rejected' ? 'badge-rejected' : (job.myQuote.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`}>
                          {job.myQuote.status === 'rejected' ? 'Rechazada' : (job.myQuote.price > 0 ? `$${parseFloat(job.myQuote.price).toLocaleString('es-MX')}` : 'Chat')}
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
              </>
            )}

            {/* PESTAÑA 2: TRABAJOS ACEPTADOS / GANADOS */}
            {activeTab === 'aceptados' && (
              <>
                {acceptedJobs.length === 0 && (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 20px', fontSize: '14px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                    <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Sin trabajos aceptados aún</strong>
                    Envía cotizaciones a los trabajos disponibles para ganar servicios.
                  </div>
                )}
                {acceptedJobs.map(job => (
                  <div
                    key={`acc-${job.id}`}
                    className={`mercado-accepted-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                    onClick={() => openQuoteModalForJob(job)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', background: '#dcfce7', color: '#16a34a', padding: '3px 8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        ✓ OFERTA ACEPTADA
                      </span>
                      <span className="mercado-accepted-price-tag">
                        ${parseFloat(job.agreed_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <h4 className="mercado-job-card-title" style={{ color: '#0f172a', marginBottom: '4px' }}>
                      {job.titulo}
                    </h4>

                    <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '700', marginBottom: '6px' }}>
                      📍 {job.full_address}
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                      👤 Cliente: <strong>{job.client_name}</strong> {job.client_phone && `(${job.client_phone})`}
                    </div>

                    {/* Estado de Programación de Visita */}
                    <div style={{ fontSize: '11.5px', padding: '6px 10px', borderRadius: '8px', background: job.scheduled_at ? '#eff6ff' : '#fff7ed', border: `1px solid ${job.scheduled_at ? '#bfdbfe' : '#fed7aa'}`, color: job.scheduled_at ? '#1d4ed8' : '#c2410c', fontWeight: '700', marginBottom: '8px' }}>
                      {job.scheduled_at 
                        ? `📅 Visita: ${new Date(job.scheduled_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`
                        : `⚠️ Pendiente programar hora de llegada`}
                    </div>

                    {/* Alerta de mensaje */}
                    {job.lastClientMsg && (
                      <div className="mercado-job-msg-alert">
                        <span className="mercado-msg-dot-pulse" />
                        <span>💬 <strong>Mensaje del Cliente:</strong> "{job.lastClientMsg.message}"</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
                      <span>Fecha: {job.fecha}</span>
                      <span style={{ color: '#16a34a', fontWeight: '800' }}>Ver detalles y coordinar →</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL PREMIUM 2 COLUMNAS (DETALLES + CHAT INTEGRADO) ─── */}
      {showQuoteModal && selectedJob && (
        <div className="mercado-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowQuoteModal(false)}>
          <div className="mercado-premium-modal" style={{ maxWidth: '1080px' }}>
            
            {/* ══════════════════════════════════════════════════
                PASO 1: DETALLES DEL TRABAJO / COORDINACIÓN / CHAT
            ══════════════════════════════════════════════════ */}
            {quoteStep === 1 && (
              <>
                <div className="mercado-premium-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <h2 style={{ margin: 0 }}>
                      {selectedJob.is_accepted ? '✅ Trabajo Aceptado & Coordinación' : '💼 Detalle del Trabajo y Chat'}
                    </h2>
                  </div>

                  {/* Selector de Pestañas en el Header si el trabajo está Aceptado */}
                  {selectedJob.is_accepted && (
                    <div className="mercado-modal-header-tabs">
                      <button
                        type="button"
                        className={`mercado-modal-header-tab ${acceptedTabMode === 'coordinacion' ? 'active' : ''}`}
                        onClick={() => setAcceptedTabMode('coordinacion')}
                      >
                        <Clock size={14} /> Coordinación & Horario
                      </button>
                      <button
                        type="button"
                        className={`mercado-modal-header-tab ${acceptedTabMode === 'chat' ? 'active' : ''}`}
                        onClick={() => setAcceptedTabMode('chat')}
                      >
                        <MessageCircle size={14} /> Chat con el Cliente ({chatMessages.length})
                        {lastClientMsg && <span className="mercado-tab-alert-dot" />}
                      </button>
                    </div>
                  )}

                  <span className="mercado-modal-close" onClick={() => setShowQuoteModal(false)}>×</span>
                </div>

                <div className="mercado-premium-body">
                  {/* ─────────────────────────────────────────────────────────────
                      CASO A: TRABAJO ACEPTADO - VISTA DE COORDINACIÓN Y HORARIO
                  ───────────────────────────────────────────────────────────── */}
                  {selectedJob.is_accepted && acceptedTabMode === 'coordinacion' && (
                    <>
                      {/* Columna Izquierda: Galería de Fotos y Problema Reportado */}
                      <div className="mercado-premium-details" style={{ flex: '0.95', gap: '14px' }}>
                        {/* Galería de Fotos */}
                        {activePhoto ? (
                          <div className="mercado-photo-gallery">
                            <div
                              className="mercado-premium-image-wrapper"
                              onClick={() => setIsPhotoZoomed(true)}
                              title="Clic para ampliar imagen"
                              style={{ height: '200px' }}
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
                          <div className="mercado-no-photo-placeholder" style={{ height: '140px' }}>
                            <ImageIcon size={32} color="#94a3b8" />
                            <span>Sin fotografías de evidencia adjuntas</span>
                          </div>
                        )}

                        {/* Detalle del Problema Solicitado */}
                        <div className="mercado-problem-detail-box">
                          <div className="mercado-problem-detail-header">
                            <FileText size={18} color="#ea580c" />
                            <span>{selectedJob.titulo}</span>
                          </div>
                          <div className="mercado-problem-detail-desc">
                            {selectedJob.descripcion}
                          </div>
                          <div className="mercado-problem-detail-footer">
                            <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Solicitado: {selectedJob.fecha}</span>
                            <span style={{ fontWeight: '700', color: '#16a34a' }}>✓ Servicio Asignado a Ti</span>
                          </div>
                        </div>
                      </div>

                      {/* Columna Derecha: HORARIO HERO, DIRECCIÓN ESPACIOSA Y ACCESO AL CHAT */}
                      <div className="mercado-premium-form" style={{ flex: '1.25', padding: '20px 24px', gap: '14px' }}>
                        
                        {/* 1. SECCIÓN HERO: PROGRAMAR HORA DE IDA / VISITA */}
                        <div className="mercado-hero-scheduler-box">
                          <div className="mercado-hero-scheduler-header">
                            <strong>
                              <Clock size={18} color="#16a34a" /> Programar Hora de Llegada / Visita
                            </strong>
                            {selectedJob.scheduled_at ? (
                              <span className="mercado-hero-scheduler-badge">
                                ✓ Programada
                              </span>
                            ) : (
                              <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                                Pendiente
                              </span>
                            )}
                          </div>

                          <div className="mercado-hero-scheduler-status">
                            {selectedJob.scheduled_at ? (
                              <>📅 Horario propuesto: <strong>{new Date(selectedJob.scheduled_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}</strong></>
                            ) : (
                              <>⚠️ Selecciona cuándo acudirás al domicilio para que el cliente confirme el horario:</>
                            )}
                          </div>

                          <div className="mercado-hero-scheduler-input-row">
                            <input
                              type="datetime-local"
                              className="mercado-hero-scheduler-input"
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                            />
                            <button
                              type="button"
                              className="mercado-hero-scheduler-btn"
                              onClick={() => handleProgramarVisita(selectedJob.id)}
                              disabled={savingSchedule}
                            >
                              <Clock size={16} />
                              <span>{savingSchedule ? 'Guardando...' : (selectedJob.scheduled_at ? '✏️ Modificar Hora' : '📅 Proponer Hora de Ida')}</span>
                            </button>
                          </div>
                        </div>

                        {/* 2. DIRECCIÓN EXACTA Y CONTACTO DIRECTO */}
                        <div className="mercado-accepted-address-box">
                          <div className="mercado-address-header">
                            <span className="mercado-address-label">
                              📍 DIRECCIÓN COMPLETA DEL CLIENTE
                            </span>
                            <button
                              type="button"
                              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedJob.full_address)}`, '_blank')}
                              className="mercado-maps-btn"
                            >
                              <ExternalLink size={12} /> Abrir Maps ↗
                            </button>
                          </div>

                          <div className="mercado-address-text">
                            {selectedJob.full_address}
                          </div>

                          {selectedJob.property_name && selectedJob.property_name !== selectedJob.full_address && (
                            <div className="mercado-address-property-name">
                              Propiedad: {selectedJob.property_name}
                            </div>
                          )}

                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Cliente: <strong style={{ color: '#0f172a' }}>{selectedJob.client_name}</strong>
                          </div>

                          {/* Botones de WhatsApp y Llamada amplios */}
                          <div className="mercado-contact-actions-row">
                            {selectedJob.client_phone ? (
                              <>
                                <a
                                  href={`https://wa.me/52${selectedJob.client_phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mercado-contact-action-btn whatsapp"
                                >
                                  <MessageCircle size={17} />
                                  <span>WhatsApp ({selectedJob.client_phone})</span>
                                </a>
                                <a
                                  href={`tel:${selectedJob.client_phone}`}
                                  className="mercado-contact-action-btn call"
                                >
                                  <Phone size={16} />
                                  <span>Llamar</span>
                                </a>
                              </>
                            ) : (
                              <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                Teléfono directo no disponible. Utiliza el chat interno.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. MONTO ACORDADO GANADO */}
                        <div className="mercado-accepted-price-box">
                          <span className="mercado-accepted-price-label">Monto Aceptado del Trabajo:</span>
                          <span className="mercado-accepted-price-val">
                            ${parseFloat(selectedJob.agreed_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                          </span>
                        </div>

                        {/* 4. BOTÓN DESTACADO PARA ABRIR EL CHAT */}
                        <div>
                          {lastClientMsg && (
                            <div className="mercado-chat-alert-banner" style={{ marginBottom: '8px' }}>
                              <div className="mercado-chat-alert-icon">🔔</div>
                              <div className="mercado-chat-alert-text">
                                <strong>Mensaje reciente del Cliente:</strong>
                                <span>"{lastClientMsg.message}"</span>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            className="mercado-open-chat-card-btn"
                            onClick={() => setAcceptedTabMode('chat')}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <MessageCircle size={18} />
                              <span>Abrir Conversación con el Cliente ({chatMessages.length})</span>
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: '900' }}>→</span>
                          </button>
                        </div>

                      </div>
                    </>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CASO B: TRABAJO ACEPTADO - VISTA DE CHAT DIRECTO
                  ───────────────────────────────────────────────────────────── */}
                  {selectedJob.is_accepted && acceptedTabMode === 'chat' && (
                    <>
                      {/* Columna Izquierda: Botón de volver y Resumen Rápido */}
                      <div className="mercado-premium-details" style={{ flex: '0.85', gap: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setAcceptedTabMode('coordinacion')}
                          style={{
                            padding: '10px 14px',
                            background: '#ffffff',
                            color: '#ea580c',
                            border: '1.5px solid #fed7aa',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 6px rgba(234, 88, 12, 0.1)'
                          }}
                        >
                          <ChevronLeft size={16} /> Volver a Coordinación y Horario
                        </button>

                        <div className="mercado-accepted-address-box">
                          <span className="mercado-address-label">📍 Ubicación</span>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                            {selectedJob.full_address}
                          </div>
                          {selectedJob.client_phone && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                              <a
                                href={`https://wa.me/52${selectedJob.client_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mercado-contact-action-btn whatsapp"
                                style={{ padding: '6px 10px', fontSize: '11.5px' }}
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          )}
                        </div>

                        {selectedJob.scheduled_at && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '12px', fontSize: '12px', color: '#166534' }}>
                            <strong>📅 Hora de Visita:</strong>
                            <div>{new Date(selectedJob.scheduled_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                          </div>
                        )}

                        <div className="mercado-accepted-price-box" style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Monto:</span>
                          <span style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a' }}>
                            ${parseFloat(selectedJob.agreed_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Columna Derecha: CHAT INTEGRADO */}
                      <div className="mercado-embedded-chat-panel" style={{ flex: '1.25' }}>
                        <div className="mercado-chat-header">
                          <div className="mercado-chat-header-title">
                            <h3><MessageCircle size={18} color="#ea580c" /> Chat con {selectedJob.client_name}</h3>
                          </div>
                          <div className="mercado-chat-online-badge">
                            <span className="mercado-chat-online-dot" /> En línea
                          </div>
                        </div>

                        {/* Stream de Mensajes */}
                        <div className="mercado-chat-messages-container">
                          {chatMessages.length === 0 ? (
                            <div className="mercado-chat-empty-state">
                              <div className="icon-wrap">
                                <MessageCircle size={26} />
                              </div>
                              <p>Inicia el chat con el cliente</p>
                              <span>Escribe aquí abajo para aclarar dudas, avisar que vas en camino o confirmar el servicio.</span>
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
                    </>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CASO C: TRABAJO ABIERTO EN LA RED (DISPONIBLE PARA COTIZAR)
                  ───────────────────────────────────────────────────────────── */}
                  {!selectedJob.is_accepted && (
                    <>
                      {/* Columna Izquierda: Información, Fotos y Mi Oferta */}
                      <div className="mercado-premium-details" style={{ flex: '1.05', gap: '14px' }}>
                        {activePhoto ? (
                          <div className="mercado-photo-gallery">
                            <div
                              className="mercado-premium-image-wrapper"
                              onClick={() => setIsPhotoZoomed(true)}
                              title="Clic para ampliar imagen"
                              style={{ height: '200px' }}
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
                          <div className="mercado-no-photo-placeholder" style={{ height: '140px' }}>
                            <ImageIcon size={32} color="#94a3b8" />
                            <span>Sin fotografías de evidencia adjuntas</span>
                          </div>
                        )}

                        {/* Zona / Colonia aproximada */}
                        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <MapPin size={20} color="#ea580c" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <strong style={{ color: '#ea580c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                              Colonia Cercana
                            </strong>
                            <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{selectedJob.zona}</span>
                            <div style={{ fontSize: '11px', color: '#9a3412', marginTop: '3px' }}>
                              🔒 La dirección exacta se te revelará una vez que el cliente acepte tu cotización.
                            </div>
                          </div>
                        </div>

                        {/* Problema Solicitado */}
                        <div className="mercado-problem-detail-box">
                          <div className="mercado-problem-detail-header">
                            <FileText size={17} color="#ea580c" />
                            <span>{selectedJob.titulo}</span>
                          </div>
                          <div className="mercado-problem-detail-desc">
                            {selectedJob.descripcion}
                          </div>
                          <div className="mercado-problem-detail-footer">
                            <span><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> Publicado: {selectedJob.fecha}</span>
                            <span style={{ fontWeight: '600', color: '#ea580c' }}>{selectedJob.cotizaciones} ofertas enviadas</span>
                          </div>
                        </div>

                        {/* Mi Propuesta Económica */}
                        <div style={{ background: selectedJob.myQuote?.status === 'rejected' ? '#fff1f2' : (selectedJob.myQuote?.status === 'accepted' ? '#f0fdf4' : '#fff7ed'), border: `1.5px solid ${selectedJob.myQuote?.status === 'rejected' ? '#fecdd3' : (selectedJob.myQuote?.status === 'accepted' ? '#bbf7d0' : '#fed7aa')}`, borderRadius: '14px', padding: '14px' }}>
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

                      {/* Columna Derecha: CHAT DIRECTO EMBEBIDO PARA CONSULTAR ANTES DE COTIZAR */}
                      <div className="mercado-embedded-chat-panel" style={{ flex: '1' }}>
                        <div className="mercado-chat-header">
                          <div className="mercado-chat-header-title">
                            <h3><MessageCircle size={18} color="#ea580c" /> Consultar con el Cliente</h3>
                          </div>
                          <div className="mercado-chat-online-badge">
                            <span className="mercado-chat-online-dot" /> En línea
                          </div>
                        </div>

                        {lastClientMsg && (
                          <div className="mercado-chat-alert-banner">
                            <div className="mercado-chat-alert-icon">🔔</div>
                            <div className="mercado-chat-alert-text">
                              <strong>El Cliente te envió un mensaje:</strong>
                              <span>"{lastClientMsg.message}"</span>
                            </div>
                          </div>
                        )}

                        <div className="mercado-chat-messages-container">
                          {chatMessages.length === 0 ? (
                            <div className="mercado-chat-empty-state">
                              <div className="icon-wrap">
                                <MessageCircle size={26} />
                              </div>
                              <p>Inicia el chat con el cliente</p>
                              <span>Escribe aquí para aclarar detalles sobre el trabajo o coordinar tu cotización.</span>
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
                    </>
                  )}
                </div>

                <div className="mercado-premium-footer" style={{ justifyContent: 'space-between' }}>
                  <button className="mercado-btn-cancel" onClick={() => setShowQuoteModal(false)}>Cerrar Ventana</button>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedJob.is_accepted 
                      ? '✅ Coordina la hora de visita y confirma con el cliente por WhatsApp o chat.'
                      : '💬 Escribe directamente en el chat o envía tu propuesta económica.'}
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
