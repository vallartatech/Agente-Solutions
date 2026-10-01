import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import Header from '../../../components/Shared/Header';
import ChatModal from '../../../components/Shared/ChatModal';
import { MapPin, DollarSign, Clock, Send, User, FileText, Maximize2, Image as ImageIcon, X, List, Map as MapIcon, MessageCircle } from 'lucide-react';
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
  // Quitar prefijo de lote tipo [LOTE-XXXX] (1/1)
  clean = clean.replace(/\[LOTE-[A-Z0-9]+\]\s*(\(\d+\/\d+\))?\s*/gi, '');
  // Quitar [EQUIPO AFECTADO]: otro o Otro
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*(otro|Otro|ninguno|Ninguno|n\/a|N\/A)\s*/gi, '');
  // Si tiene un equipo válido, formatearlo limpio
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*/gi, ' - Equipo: ');
  return clean.trim() || rawDesc;
};

const darkMapStyles = [];

const mockJobs = [
  { id: 1, titulo: "Instalación de Ventilador de Techo", lat: 21.0250, lng: -89.6300, presupuesto: "$500", cliente: "María Gómez", descripcion: "Necesito instalar un ventilador nuevo en la sala.", fecha: "Hoy", lugar: "Casa 1", zona: "Col. Itzimná, Mérida", cotizaciones: 0, myQuote: null, myQuotesHistory: [], fotos: [] },
  { id: 2, titulo: "Mantenimiento Minisplit 12000 BTU", lat: 21.0100, lng: -89.6200, presupuesto: "A convenir", cliente: "Roberto Carlos", descripcion: "El aire acondicionado tira agua y no enfría bien.", fecha: "Mañana", lugar: "Casa 2", zona: "Col. San Ramón Norte, Mérida", cotizaciones: 0, myQuote: null, myQuotesHistory: [], fotos: [] },
];

const MercadoTrabajos = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDgyTj0X6kgGoMV8NxQGDp4-Nx0bxJd0Hw"
  });

  const [selectedJob, setSelectedJob] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [activeChatQuote, setActiveChatQuote] = useState(null);
  const [networkJobs, setNetworkJobs] = useState([]);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteStep, setQuoteStep] = useState(1);
  const [activePhoto, setActivePhoto] = useState(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
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
          };
        });
        setNetworkJobs(jobs);
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

  const handleAbrirChat = async (job) => {
    if (!job) return;
    try {
      if (job.myQuote) {
        setActiveChatQuote({ 
          ...job.myQuote, 
          jobTitle: job.titulo, 
          cliente: job.cliente || 'Cliente' 
        });
        return;
      }
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${job.id}/iniciar-chat`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data?.success && res.data?.quote) {
        setActiveChatQuote({ 
          ...res.data.quote, 
          jobTitle: job.titulo, 
          cliente: job.cliente || 'Cliente' 
        });
        fetchJobs();
      }
    } catch (err) {
      console.error("Error al abrir chat:", err);
      alert("No se pudo iniciar el chat con el cliente. Intenta nuevamente.");
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
        setShowQuoteModal(false);
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
                options={{ styles: darkMapStyles, disableDefaultUI: false }}
              >
                {networkJobs.map(job => (
                  <React.Fragment key={job.id}>
                    {/* Círculo de área / colonia de cobertura */}
                    <Circle
                      center={{ lat: job.lat, lng: job.lng }}
                      radius={550}
                      options={{
                        fillColor: '#ff6600',
                        fillOpacity: 0.16,
                        strokeColor: '#ea580c',
                        strokeOpacity: 0.7,
                        strokeWeight: 1.5,
                        clickable: true
                      }}
                      onClick={() => setSelectedJob(job)}
                    />
                    <Marker
                      position={{ lat: job.lat, lng: job.lng }}
                      onClick={() => setSelectedJob(job)}
                      title={`Zona: ${job.zona}`}
                      icon={{
                        url: job.myQuote
                          ? (job.myQuote.status === 'rejected'
                            ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                            : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png')
                          : 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'
                      }}
                    />
                  </React.Fragment>
                ))}

                {selectedJob && (
                  <InfoWindow
                    position={{ lat: selectedJob.lat, lng: selectedJob.lng }}
                    onCloseClick={() => setSelectedJob(null)}
                  >
                    <div className="mercado-info-window">
                      <h4>{selectedJob.titulo}</h4>
                      <p style={{ color: '#ea580c', fontWeight: '700', margin: '4px 0' }}>
                        <MapPin size={12} /> Zona: {selectedJob.zona}
                      </p>
                      <div style={{ fontSize: '11px', color: '#64748b', background: '#fff7ed', padding: '5px 8px', borderRadius: '6px', border: '1px solid #fed7aa', margin: '6px 0', lineHeight: 1.3 }}>
                        🔒 <strong>Área aproximada</strong><br/>Dirección exacta visible al ser asignado
                      </div>
                      <button
                        className="mercado-btn-details"
                        onClick={() => openQuoteModalForJob(selectedJob)}
                      >
                        {selectedJob.myQuote
                          ? (selectedJob.myQuote.status === 'rejected' ? '⚠ Revisar Rechazo' : '📋 Ver mi Cotización')
                          : '💼 Cotizar este trabajo'}
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

        {/* ─── Sidebar / Bottom Drawer (Tipo Uber) ─── */}
        <div className={`mercado-sidebar ${mobileDrawerOpen ? 'mobile-open' : ''}`}>
          <div className="mercado-sidebar-header">
            {/* Grab handle for mobile gesture / tap */}
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
                    <span className={`mercado-job-badge ${job.myQuote.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                      {job.myQuote.status === 'rejected' ? 'Rechazada' : (job.myQuote.price > 0 ? `$${parseFloat(job.myQuote.price).toLocaleString('es-MX')}` : 'Chat Activo')}
                    </span>
                  ) : (
                    <span className="mercado-job-badge-disponible">Disponible</span>
                  )}
                </div>

                {/* 2. Problema Solicitado */}
                <h4 className="mercado-job-card-title">{job.titulo}</h4>
                <p className="mercado-job-card-desc">{job.descripcion}</p>

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

      {/* ─── Modal para Detalle y Cotización (Responsivo) ─── */}
      {showQuoteModal && selectedJob && (
        <div className="mercado-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowQuoteModal(false)}>
          <div className="mercado-premium-modal">
            
            {/* ══════════════════════════════════════════════════
                PASO 1: DETALLES DEL TRABAJO
            ══════════════════════════════════════════════════ */}
            {quoteStep === 1 && (
              <>
                <div className="mercado-premium-header">
                  <h2>💼 Detalle del Trabajo</h2>
                  <span className="mercado-modal-close" onClick={() => setShowQuoteModal(false)}>×</span>
                </div>

                <div className="mercado-premium-body">
                  <div className="mercado-premium-details" style={{ width: '100%', borderRight: 'none' }}>
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
                      <div className="mercado-info-item full-width" style={{ marginTop: '12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <FileText size={18} color="#ea580c" />
                          <strong style={{ color: '#0f172a', fontSize: '15px', fontWeight: '800' }}>
                            {selectedJob.titulo}
                          </strong>
                        </div>
                        <div style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.55', whiteSpace: 'pre-line', background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                          {selectedJob.descripcion}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11.5px', color: '#64748b' }}>
                          <span><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Publicado: {selectedJob.fecha}</span>
                          <span style={{ fontWeight: '600', color: '#ea580c' }}>{selectedJob.cotizaciones} ofertas enviadas</span>
                        </div>
                      </div>

                      {/* 3. Botón de Chat en Vivo con el Cliente */}
                      <div style={{ marginTop: '14px' }}>
                        <button
                          type="button"
                          onClick={() => handleAbrirChat(selectedJob)}
                          style={{
                            width: '100%',
                            padding: '13px 18px',
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <MessageCircle size={18} />
                          <span>💬 Chat con el Cliente</span>
                        </button>
                      </div>

                      {/* Historial de mis Cotizaciones */}
                      {selectedJob.myQuotesHistory && selectedJob.myQuotesHistory.length > 0 && (
                        <div className="mq-history-section" style={{ marginTop: '14px' }}>
                          <div className="mq-history-title">📋 Mi Oferta Actual</div>
                          <div className="mq-history-list">
                            {selectedJob.myQuotesHistory.map(q => (
                              <div key={q.id} className={`mq-history-item ${q.status === 'rejected' ? 'is-rejected' : 'is-pending'}`}>
                                <div className="mq-history-item-top">
                                  <span className="mq-history-price">
                                    {q.price > 0 ? `$${parseFloat(q.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Chat Iniciado'}
                                  </span>
                                  <span className={`mq-history-status ${q.status}`}>{getStatusLabel(q.status)}</span>
                                </div>
                                {q.message && <div className="mq-history-message">"{q.message}"</div>}
                                <div className="mq-history-date">{new Date(q.created_at).toLocaleString('es-MX')}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mercado-premium-footer">
                  <button className="mercado-btn-cancel" onClick={() => setShowQuoteModal(false)}>Cerrar</button>
                  <button className="mercado-premium-submit" onClick={() => setQuoteStep(2)}>
                    <DollarSign size={17} />
                    {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? '✏️ Modificar Oferta' : '💼 Cotizar Trabajo'}
                  </button>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════
                PASO 2: FORMULARIO DE COTIZACIÓN
            ══════════════════════════════════════════════════ */}
            {quoteStep === 2 && (
              <>
                <div className="mercado-premium-header">
                  <h2>💰 {selectedJob.myQuote ? 'Enviar Nueva Oferta' : 'Cotizar Trabajo'}</h2>
                  <span className="mercado-modal-close" onClick={() => setShowQuoteModal(false)}>×</span>
                </div>

                <div className="mercado-premium-body">
                  <div className="mercado-premium-form" style={{ width: '100%' }}>
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
                          <strong>Tu última oferta fue rechazada</strong>
                          <p>Revisa las condiciones y envía una nueva propuesta competitiva.</p>
                        </div>
                      </div>
                    )}

                    <div className="mercado-form-group" style={{ marginTop: '14px' }}>
                      <label>Propuesta Económica ($)</label>
                      <div className="mercado-input-wrapper">
                        <DollarSign size={18} className="mercado-input-icon" />
                        <input
                          type="number"
                          placeholder="Ej. 800"
                          className="mercado-premium-input"
                          value={quotePrice}
                          onChange={(e) => setQuotePrice(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="mercado-form-group">
                      <label>Mensaje para el cliente</label>
                      <textarea
                        placeholder="Hola, tengo experiencia en esto. Puedo ir hoy mismo..."
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
                    ← Volver al Detalle
                  </button>
                  <button className="mercado-premium-submit" onClick={handleEnviarCotizacion}>
                    <Send size={16} />
                    {selectedJob.myQuote ? 'Enviar Nueva Oferta' : 'Enviar Cotización'}
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

      {/* ─── MODAL DE CHAT EN VIVO CON EL CLIENTE ─── */}
      {activeChatQuote && (
        <ChatModal
          quoteId={activeChatQuote.id}
          isNetworkQuote={true}
          jobTitle={activeChatQuote.jobTitle || 'Trabajo en la Red'}
          otherPartyName={activeChatQuote.cliente || selectedJob?.cliente || 'Cliente'}
          otherPartyRole="Cliente / Autónomo"
          initialMessages={activeChatQuote.chat_history || []}
          onClose={() => setActiveChatQuote(null)}
        />
      )}
    </div>
  );
};

export default MercadoTrabajos;
