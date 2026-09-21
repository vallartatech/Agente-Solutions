import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import Header from '../../../components/Shared/Header';
import ChatModal from '../../../components/Shared/ChatModal';
import { MapPin, DollarSign, Clock, Send, User, FileText, Maximize2, Image as ImageIcon, X, List, Map as MapIcon, MessageCircle } from 'lucide-react';
import '../../../styles/AgenteSolutions/Tecnico/MercadoTrabajos.css';
import { useAuth } from '../../../context/AuthContext';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 21.0181, lng: -89.6242 };
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
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos`);
      if (res.data.success) {
        const jobs = res.data.data.map(order => {
          let myQuote = null;
          let myQuotesHistory = [];
          if (authUser && order.network_quotes) {
            const userQuotes = order.network_quotes.filter(q => q.technician_id === authUser.id);
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
          const zonaTexto = order.zona || order.zona_colonia || order.property?.property_name || 'Zona Metropolitana';
          const displayOwner = (order.owner_name && order.owner_name !== 'Cliente de la Red' && order.owner_name !== 'Cliente Desconocido') ? order.owner_name : (order.owner_name || 'Pedro Pech Koh');

          return {
            id: order.id,
            titulo: `${order.type || 'Mantenimiento'} - ${displayOwner}`,
            lat: rawLat,
            lng: rawLng,
            presupuesto: "A convenir",
            cliente: displayOwner,
            lugar: order.property?.property_name || 'Lugar no especificado',
            zona: zonaTexto,
            calle: order.property?.address || 'Dirección protegida',
            descripcion: order.description,
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
      if (networkJobs.length === 0) setNetworkJobs(mockJobs);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEnviarCotizacion = async () => {
    if (!selectedJob) return;
    if (!quotePrice) {
      alert("Por favor ingresa una propuesta económica.");
      return;
    }
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${selectedJob.id}/cotizar`,
        { price: quotePrice, message: quoteMessage },
        { headers: { Authorization: `Bearer ${localStorage.getItem('agente_token')}` } }
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
    setQuotePrice(job.myQuote ? job.myQuote.price : '');
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
                <div className="mercado-job-card-top">
                  <h4>{job.titulo}</h4>
                  {job.myQuote && (
                    <span className={`mercado-job-badge ${job.myQuote.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                      {job.myQuote.status === 'rejected' ? 'Rechazada' : 'Cotizado'}
                    </span>
                  )}
                </div>
                <div className="mercado-job-meta">
                  <span style={{ color: '#ea580c', fontWeight: '700' }}><MapPin size={12} /> {job.zona}</span>
                  <span><Clock size={11} /> {job.fecha}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '12px' }}>
                  <span style={{ color: '#ea580c', fontWeight: '700' }}>{job.cotizaciones} ofertas enviadas</span>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>{job.cliente}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Modal para Cotizar en 2 Pasos (Responsivo) ─── */}
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
                    {/* Galería de Fotos */}
                    {activePhoto ? (
                      <div className="mercado-photo-gallery">
                        <div
                          className="mercado-premium-image-wrapper"
                          onClick={() => setIsPhotoZoomed(true)}
                          title="Clic para ampliar imagen"
                        >
                          <img src={activePhoto} alt="Evidencia" className="mercado-premium-image" />
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
                        <span>Sin fotografías de evidencia</span>
                      </div>
                    )}

                    {/* Información del Trabajo */}
                    <div className="mercado-premium-text">
                      <h3>{selectedJob.titulo}</h3>
                      <div className="mercado-premium-info-grid">
                        <div className="mercado-info-item full-width" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}>
                          <MapPin size={18} color="#ea580c" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <strong style={{ color: '#ea580c' }}>Zona / Área de Cobertura</strong>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{selectedJob.zona}</span>
                            <div style={{ fontSize: '11px', color: '#9a3412', marginTop: '3px' }}>
                              🔒 La dirección exacta de la casa se te revelará en tu panel de TRABAJOS al ser aceptada tu cotización.
                            </div>
                          </div>
                        </div>

                        <div className="mercado-info-item">
                          <User size={14} className="mercado-icon-blue" />
                          <div><strong>Cliente</strong><span>{selectedJob.cliente}</span></div>
                        </div>

                        <div className="mercado-info-item">
                          <Clock size={14} className="mercado-icon-blue" />
                          <div><strong>Publicado</strong><span>{selectedJob.fecha}</span></div>
                        </div>

                        <div className="mercado-info-item full-width">
                          <FileText size={14} className="mercado-icon-blue" />
                          <div><strong>Descripción del Problema</strong><span>{selectedJob.descripcion}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Botón de Chat Directo con el Cliente (si ya cotizó) */}
                    {selectedJob.myQuote && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setActiveChatQuote({ ...selectedJob.myQuote, jobTitle: selectedJob.titulo, cliente: selectedJob.cliente })}
                          style={{
                            width: '100%',
                            padding: '12px 18px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                          }}
                        >
                          <MessageCircle size={18} />
                          <span>💬 Chat con el Cliente ({selectedJob.cliente})</span>
                        </button>
                      </div>
                    )}

                    {/* Historial de mis Cotizaciones */}
                    {selectedJob.myQuotesHistory && selectedJob.myQuotesHistory.length > 0 && (
                      <div className="mq-history-section">
                        <div className="mq-history-title">📋 Historial de mis Cotizaciones</div>
                        <div className="mq-history-list">
                          {selectedJob.myQuotesHistory.map(q => (
                            <div key={q.id} className={`mq-history-item ${q.status === 'rejected' ? 'is-rejected' : 'is-pending'}`}>
                              <div className="mq-history-item-top">
                                <span className="mq-history-price">
                                  ${parseFloat(q.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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

                <div className="mercado-premium-footer">
                  <button className="mercado-btn-cancel" onClick={() => setShowQuoteModal(false)}>Cerrar</button>
                  <button className="mercado-premium-submit" onClick={() => setQuoteStep(2)}>
                    <DollarSign size={17} />
                    {selectedJob.myQuote ? '✏️ Enviar Nueva Oferta' : '💼 Cotizar Trabajo'}
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
