import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import Header from '../../../components/Shared/Header';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import ModalServicioAutonomo from './ModalServicioAutonomo';
import ChatModal from '../../../components/Shared/ChatModal';
import '../../../styles/Autonomos/VistaRedAutonomo.css';
import '../../../styles/AgenteSolutions/Tecnico/MercadoTrabajos.css';
import { Plus, MapPin, DollarSign, Clock, CheckCircle, User, Mail, Phone, Calendar, Award, List, Map as MapIcon, MessageCircle, Maximize2, Image as ImageIcon, FileText, X, Trash2 } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 21.0181, lng: -89.6242 }; // Mérida, Yucatán

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


const mockSolicitudes = [
  { id: 1, titulo: "Mantenimiento de 5 Minisplits", lat: 21.0250, lng: -89.6300, presupuesto: "$2,000", estado: "Cotizando", cotizaciones: 3, fecha: "2026-08-11", lugar: "Casa 1", zona: "Col. Itzimná, Mérida", calle: "C. 30 x 7", cotizaciones_list: [], fotos: [] },
  { id: 2, titulo: "Reparación de Fuga de Agua", lat: 21.0100, lng: -89.6200, presupuesto: "A convenir", estado: "Completado", cotizaciones: 1, fecha: "2026-08-09", lugar: "Casa 2", zona: "Col. San Lorenzo, Umán", calle: "C. 20 x 15", cotizaciones_list: [], fotos: [] }
];

const VistaRedAutonomo = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedJobForQuotes, setSelectedJobForQuotes] = useState(null);
  const [selectedTechnicianProfile, setSelectedTechnicianProfile] = useState(null);
  const [showTechModal, setShowTechModal] = useState(false);
  const [activeChatQuote, setActiveChatQuote] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [networkJobs, setNetworkJobs] = useState([]);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos`);
      if (res.data.success) {
        const jobs = res.data.data.map(order => {
          const rawLat = order.lat ? parseFloat(order.lat) : (order.area_lat ? parseFloat(order.area_lat) : (21.0181 + Math.sin(order.id * 17) * 0.025));
          const rawLng = order.lng ? parseFloat(order.lng) : (order.area_lng ? parseFloat(order.area_lng) : (-89.6242 + Math.cos(order.id * 17) * 0.025));
          const zonaTexto = order.zona || order.zona_colonia || order.property?.property_name || 'Zona Metropolitana';
          const authUserName = user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name) : 'Pedro Pech Koh';
          const displayOwner = (order.owner_name && order.owner_name !== 'Cliente de la Red' && order.owner_name !== 'Cliente Desconocido') ? order.owner_name : authUserName;

          const fotos = [
            order.evidence_path,
            order.evidence_path_2,
            order.property?.facade_photo_path
          ].filter(Boolean);

          return {
            id: order.id,
            titulo: `${order.type || 'Mantenimiento'} - ${displayOwner}`,
            lat: rawLat,
            lng: rawLng,
            presupuesto: "A convenir",
            estado: order.status || 'Por Hacer',
            fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
            lugar: order.property?.property_name || 'Lugar no especificado',
            zona: zonaTexto,
            calle: order.property?.address || 'Dirección no especificada',
            descripcion: limpiarDescripcion(order.description),
            foto: fotos[0] || null,
            fotos: fotos,
            cotizaciones: order.network_quotes_count || 0,
            cotizaciones_list: order.network_quotes || [],
            cliente: displayOwner
          };
        });
        setNetworkJobs(jobs);
      }
    } catch (e) {
      console.error("Error fetching network jobs, falling back to mock", e);
      if (networkJobs.length === 0) setNetworkJobs(mockSolicitudes);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRejectQuote = async (quoteId) => {
    if (!window.confirm("¿Estás seguro de que deseas rechazar esta cotización?")) return;
    
    try {
      const token = localStorage.getItem('agente_token');
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quoteId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert("Cotización rechazada. El técnico ha sido notificado para mejorar su oferta.");
        fetchJobs();
        setShowQuotesModal(false);
      }
    } catch (e) {
      console.error(e);
      alert("Hubo un error al rechazar la cotización.");
    }
  };

  const handleAcceptQuote = async (quote) => {
    const techName = quote.technician ? `${quote.technician.first_name} ${quote.technician.last_name}` : 'este técnico';
    if (!window.confirm(`¿Confirmas que deseas ACEPTAR la cotización de $${parseFloat(quote.price).toFixed(2)} de ${techName}? El trabajo le será asignado de inmediato.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('agente_token');
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quote.id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert("🎉 " + res.data.message);
        setShowQuotesModal(false);
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
      alert("Hubo un error al aceptar la cotización. Intenta de nuevo.");
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar y cancelar esta publicación de la Red? Ya no será visible para los técnicos ni recibirá más cotizaciones.")) {
      return;
    }

    try {
      const token = localStorage.getItem('agente_token');
      const res = await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        alert("✅ Publicación eliminada y cancelada con éxito.");
        setShowQuotesModal(false);
        setSelectedJob(null);
        fetchJobs();
      } else {
        alert(res.data?.message || "Hubo un error al eliminar.");
      }
    } catch (e) {
      console.error("Error al eliminar publicación:", e);
      alert("Hubo un error al eliminar la publicación de la Red.");
    }
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDgyTj0X6kgGoMV8NxQGDp4-Nx0bxJd0Hw"
  });

  const openQuotesModal = (job) => {
    setSelectedJobForQuotes(job);
    setActivePhoto(job.fotos?.[0] || job.foto || null);
    setShowQuotesModal(true);
  };

  return (
    <div className="mercado-container">
      <Header title="Red de Autónomos / Mis Publicaciones" />
      
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

        {/* ─── Map Section ─── */}
        <div className="mercado-map-section">
          {isLoaded ? (
            <>
              <div className="mercado-map-overlay-badge">
                <span className="mercado-map-live-dot" />
                {networkJobs.length} publicaciones activas
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
                        fillColor: job.cotizaciones > 0 ? '#16a34a' : '#ff6600',
                        fillOpacity: 0.16,
                        strokeColor: job.cotizaciones > 0 ? '#15803d' : '#ea580c',
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
                        url: job.cotizaciones > 0 
                          ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
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
                      <p style={{ margin: '4px 0', fontWeight: 'bold', color: '#ff6600' }}>{selectedJob.estado}</p>
                      <p style={{ color: '#ea580c', fontWeight: '700' }}><MapPin size={11} /> {selectedJob.zona}</p>
                      <p><Clock size={11} /> {selectedJob.fecha}</p>
                      <button 
                        className="mercado-btn-details"
                        onClick={() => openQuotesModal(selectedJob)}
                      >
                        Ver {selectedJob.cotizaciones} {selectedJob.cotizaciones === 1 ? 'Cotización' : 'Cotizaciones'}
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
            {/* Grab handle for mobile touch / tap */}
            <div 
              className="mercado-mobile-drag-handle" 
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)} 
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p className="mercado-sidebar-title">🔴 En vivo</p>
              <button 
                className="red-btn-publish"
                onClick={() => setShowModal(true)}
              >
                <Plus size={16} /> Publicar Problema
              </button>
            </div>
            <h2 className="mercado-sidebar-subtitle">Mis Publicaciones</h2>
            <p className="mercado-sidebar-desc">Tus reportes publicados en el mapa de la red</p>
          </div>

          <div className="mercado-job-list">
            {networkJobs.length === 0 && (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 20px', fontSize: '14px' }}>
                No tienes publicaciones activas en la red. Haz clic en "Publicar Problema" para crear una.
              </div>
            )}
            {networkJobs.map(job => (
              <div
                key={job.id}
                className={`mercado-job-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                onClick={() => openQuotesModal(job)}
              >
                <div className="mercado-job-card-top">
                  <h4>{job.titulo}</h4>
                  <span className="mercado-job-badge badge-pending">
                    {job.estado}
                  </span>
                </div>
                <div className="mercado-job-meta">
                  <span style={{ color: '#ea580c', fontWeight: '700' }}><MapPin size={11} /> {job.zona}</span>
                  <span><Clock size={11} /> {job.fecha}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '12px' }}>
                  <span style={{ color: '#ea580c', fontWeight: '800' }}>
                    {job.cotizaciones} {job.cotizaciones === 1 ? 'oferta recibida' : 'ofertas recibidas'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteJob(job.id);
                      }}
                      title="Eliminar publicación"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px',
                        borderRadius: '6px',
                        transition: 'color 0.2s'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <Trash2 size={15} />
                    </button>
                    <span style={{ color: '#ff6600', fontWeight: '700', cursor: 'pointer' }}>
                      Ver ofertas →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal para Crear / Publicar Servicio */}
      {showModal && (
        <ModalServicioAutonomo 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            fetchJobs();
          }}
        />
      )}

      {/* ─── MODAL DE DETALLE DE PUBLICACIÓN Y COTIZACIONES RECIBIDAS (DISEÑO PREMIUM UNIFICADO) ─── */}
      {showQuotesModal && selectedJobForQuotes && (
        <div className="mercado-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowQuotesModal(false)}>
          <div className="mercado-premium-modal">
            <div className="mercado-premium-header">
              <h2>📋 Detalle de Publicación y Cotizaciones</h2>
              <span className="mercado-modal-close" onClick={() => setShowQuotesModal(false)}>×</span>
            </div>

            <div className="mercado-premium-body">
              {/* Left panel: Info & Photo Gallery */}
              <div className="mercado-premium-details">
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

                    {selectedJobForQuotes.fotos && selectedJobForQuotes.fotos.length > 1 && (
                      <div className="mercado-thumbnails-row">
                        {selectedJobForQuotes.fotos.map((f, idx) => (
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

                <div className="mercado-premium-text">
                  <h3>{selectedJobForQuotes.titulo}</h3>
                  <div className="mercado-premium-info-grid">
                    <div className="mercado-info-item full-width" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}>
                      <MapPin size={18} color="#ea580c" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: '#ea580c' }}>Zona / Área de Cobertura</strong>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{selectedJobForQuotes.zona}</span>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                          📍 Dirección: {selectedJobForQuotes.calle}
                        </div>
                      </div>
                    </div>
                    <div className="mercado-info-item">
                      <User size={14} className="mercado-icon-blue" />
                      <div><strong>Publicado por</strong><span>{selectedJobForQuotes.cliente}</span></div>
                    </div>
                    <div className="mercado-info-item">
                      <Clock size={14} className="mercado-icon-blue" />
                      <div><strong>Fecha</strong><span>{selectedJobForQuotes.fecha}</span></div>
                    </div>
                    <div className="mercado-info-item full-width">
                      <FileText size={14} className="mercado-icon-blue" />
                      <div><strong>Problema</strong><span>{selectedJobForQuotes.descripcion || 'Sin descripción adicional'}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right panel: Quotes list */}
              <div className="mercado-premium-form" style={{ background: '#ffffff', overflowY: 'auto' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 Cotizaciones de Técnicos
                    <span style={{ fontSize: '12px', background: '#ff6600', color: '#ffffff', padding: '2px 8px', borderRadius: '12px' }}>
                      {selectedJobForQuotes.cotizaciones_list?.length || 0}
                    </span>
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Revisa las propuestas de los técnicos. Puedes chatear con ellos o aceptar la mejor oferta.
                  </p>
                </div>

                {(!selectedJobForQuotes.cotizaciones_list || selectedJobForQuotes.cotizaciones_list.length === 0) ? (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 20px', background: '#fffaf5', borderRadius: '16px', border: '2px dashed #fed7aa', margin: '20px 0' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>⏳</div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Aún no hay cotizaciones</p>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Los técnicos de la red te notificarán en cuanto envíen su propuesta.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {selectedJobForQuotes.cotizaciones_list.map((quote) => (
                      <div key={quote.id} className="red-quote-card">
                        <div className="red-quote-header">
                          <div className="red-quote-tech">
                            <div 
                              className="red-quote-avatar" 
                              onClick={() => {
                                setSelectedTechnicianProfile(quote.technician);
                                setShowTechModal(true);
                              }}
                              title="Ver perfil completo y especialidades del técnico"
                            >
                              {quote.technician?.first_name?.charAt(0) || 'T'}
                            </div>
                            <div>
                              <h4 
                                style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a', cursor: 'pointer' }}
                                onClick={() => {
                                  setSelectedTechnicianProfile(quote.technician);
                                  setShowTechModal(true);
                                }}
                              >
                                {quote.technician?.first_name} {quote.technician?.last_name}
                              </h4>
                              <span className="red-quote-role">Técnico Verificado</span>
                            </div>
                          </div>
                          <div className="red-quote-price" style={{ color: '#ea580c' }}>
                            ${parseFloat(quote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        {quote.message && (
                          <div className="red-quote-message">
                            "{quote.message}"
                          </div>
                        )}

                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                          📅 Recibida: {new Date(quote.created_at).toLocaleString('es-MX')}
                        </div>

                        <div className="red-quote-actions">
                          {quote.status === 'rejected' ? (
                            <div style={{ color: '#dc2626', fontWeight: '800', fontSize: '13px', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              ❌ Oferta Rechazada
                            </div>
                          ) : (
                            <>
                              <button 
                                className="red-btn-reject" 
                                onClick={() => handleRejectQuote(quote.id)}
                              >
                                Rechazar
                              </button>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  type="button"
                                  className="red-btn-contact" 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    color: '#ffffff',
                                    border: 'none',
                                    boxShadow: '0 3px 8px rgba(37, 99, 235, 0.25)'
                                  }}
                                  onClick={() => setActiveChatQuote({ ...quote, jobTitle: selectedJobForQuotes?.titulo })}
                                >
                                  <MessageCircle size={15} /> Chat
                                </button>
                                <button 
                                  type="button"
                                  className="red-btn-accept" 
                                  onClick={() => handleAcceptQuote(quote)}
                                >
                                  ✓ Aceptar Oferta
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mercado-premium-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className="mercado-btn-delete-publication" 
                onClick={() => handleDeleteJob(selectedJobForQuotes.id)}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#dc2626',
                  border: '1.5px solid #fca5a5',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = '#dc2626';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  e.currentTarget.style.color = '#dc2626';
                  e.currentTarget.style.borderColor = '#fca5a5';
                }}
              >
                <Trash2 size={16} /> Cancelar / Eliminar Publicación
              </button>

              <button className="mercado-btn-cancel" onClick={() => setShowQuotesModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DEL PERFIL DEL TÉCNICO ─── */}
      {showTechModal && selectedTechnicianProfile && (
        <div className="mercado-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowTechModal(false)}>
          <div className="mercado-premium-modal" style={{ maxWidth: '480px' }}>
            <div className="mercado-premium-header">
              <h2>👤 Perfil del Técnico</h2>
              <span className="mercado-modal-close" onClick={() => setShowTechModal(false)}>×</span>
            </div>
            <div className="mercado-premium-body" style={{ flexDirection: 'column', padding: '24px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ 
                  width: '68px', 
                  height: '68px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #ff6600, #ea580c)', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '26px', 
                  fontWeight: '800',
                  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)'
                }}>
                  {selectedTechnicianProfile.first_name?.charAt(0) || 'T'}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    {selectedTechnicianProfile.first_name} {selectedTechnicianProfile.last_name}
                  </h3>
                  <span className="red-quote-role" style={{ background: '#fff7ed', padding: '4px 10px', borderRadius: '20px', border: '1px solid #fed7aa' }}>
                    Técnico Verificado
                  </span>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '10px', fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={15} color="#ea580c" />
                  <strong>Correo:</strong> {selectedTechnicianProfile.email || 'No disponible'}
                </div>
                <div style={{ marginBottom: '10px', fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={15} color="#ea580c" />
                  <strong>Teléfono:</strong> {selectedTechnicianProfile.phone_number || 'No disponible'}
                </div>
                {selectedTechnicianProfile.birth_date && (
                  <div style={{ fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={15} color="#ea580c" />
                    <strong>Fecha de Nacimiento:</strong> {new Date(selectedTechnicianProfile.birth_date).toLocaleDateString('es-MX')}
                  </div>
                )}
              </div>

              <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} color="#ea580c" /> Especialidades Verificadas
              </h4>
              {selectedTechnicianProfile.specialties && selectedTechnicianProfile.specialties.length > 0 ? (
                <div className="red-quote-specialties" style={{ marginTop: 0 }}>
                  {selectedTechnicianProfile.specialties.map(spec => (
                    <span key={spec.id} className="red-specialty-badge">
                      ✓ {spec.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0, fontSize: '13px' }}>No ha registrado especialidades adicionales.</p>
              )}
            </div>
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

      {/* ─── MODAL DE CHAT EN VIVO CON EL TÉCNICO ─── */}
      {activeChatQuote && (
        <ChatModal
          quoteId={activeChatQuote.id}
          isNetworkQuote={true}
          jobTitle={activeChatQuote.jobTitle || 'Trabajo en la Red'}
          otherPartyName={
            activeChatQuote.technician?.first_name 
              ? `${activeChatQuote.technician.first_name} ${activeChatQuote.technician.last_name || ''}`
              : (activeChatQuote.technician?.name || 'Técnico de la Red')
          }
          otherPartyRole="Técnico de la Red"
          initialMessages={activeChatQuote.chat_history || []}
          onClose={() => setActiveChatQuote(null)}
        />
      )}
    </div>
  );
};

export default VistaRedAutonomo;
