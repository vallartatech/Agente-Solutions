import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import Header from '../../../components/Shared/Header';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import ModalServicioAutonomo from './ModalServicioAutonomo';
import '../../../styles/AgenteMarket/Admin/VistaRedAutonomo.css';
import '../../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';
import { Plus, MapPin, DollarSign, Clock, CheckCircle, User, Mail, Phone, Calendar, Award, List, Map as MapIcon, MessageCircle, Maximize2, Image as ImageIcon, FileText, X, Trash2, Send, ChevronLeft } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 21.0181, lng: -89.6242 }; // Mérida, Yucatán

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
  const [activeTab, setActiveTab] = useState('en_red'); // 'en_red' | 'aceptados'

  // Client Chat Input State
  const [clientChatInput, setClientChatInput] = useState('');
  const [sendingClientChat, setSendingClientChat] = useState(false);
  const chatEndRef = useRef(null);

  // Helper para determinar el estado de la visita y re-coordinación
  const getJobScheduleStatus = (job, activeQuote) => {
    const quotes = job?.cotizaciones_list || [];
    const targetQuote = activeQuote || quotes.find(q => q.status === 'accepted' || q.is_assigned) || quotes[0];
    const msgs = targetQuote?.chat_history || [];

    const scheduleResponses = msgs.filter(m => m.is_schedule_response);
    const lastScheduleResponse = scheduleResponses.length > 0 ? scheduleResponses[scheduleResponses.length - 1] : null;

    const scheduleProposals = msgs.filter(m => m.is_schedule);
    const lastScheduleProposal = scheduleProposals.length > 0 ? scheduleProposals[scheduleProposals.length - 1] : null;

    const isRescheduleRequested = Boolean(
      lastScheduleResponse &&
      lastScheduleResponse.schedule_confirmed === false &&
      (!lastScheduleProposal || new Date(lastScheduleResponse.created_at) >= new Date(lastScheduleProposal.created_at))
    );

    const isScheduleConfirmed = Boolean(
      lastScheduleResponse &&
      lastScheduleResponse.schedule_confirmed === true &&
      (!lastScheduleProposal || new Date(lastScheduleResponse.created_at) >= new Date(lastScheduleProposal.created_at))
    );

    const isPendingClientConfirm = Boolean(
      job?.scheduled_at &&
      !isScheduleConfirmed &&
      !isRescheduleRequested
    );

    return {
      isRescheduleRequested,
      isScheduleConfirmed,
      isPendingClientConfirm,
      lastScheduleResponse,
      lastScheduleProposal
    };
  };

  // Agrupar cotizaciones por técnico para consolidar el chat y ofertas
  const groupQuotesByTechnician = (quotesList, order) => {
    if (!Array.isArray(quotesList)) return [];
    const techMap = new Map();

    quotesList.forEach(quote => {
      const techId = quote.technician_id || quote.technician?.id;
      if (!techId) return;

      const techName = quote.technician?.first_name 
        ? `${quote.technician.first_name} ${quote.technician.last_name || ''}`.trim()
        : (quote.technician?.name || 'Técnico de la Red');

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
          (quote.message && quote.message.trim().length > 0)
        );
        const displayAlertMsg = lastMsg?.message || quote.message || '';

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
          if (quote.message) existing.message = quote.message;
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
        existing.displayAlertMsg = lastMsg?.message || existing.message || '';
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

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos?only_mine=1`, { headers });
      
      if (res.data.success) {
        const userFullName = user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name) : '';

        // Filtrar estrictamente solo las publicaciones creadas por este usuario autónomo
        const rawFiltered = res.data.data.filter(order => {
          if (!user) return false;
          if (user.role_id === 0) return true; // SuperAdmin / Root puede ver todas
          if (order.is_mine === true) return true;

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
        });

        const jobs = rawFiltered.map(order => {
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

          const groupedQuotes = groupQuotesByTechnician(order.network_quotes || [], order);
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
            estado: isAccepted ? (order.status === 'Terminado' ? 'Terminado' : 'Asignado') : (order.status || 'Por Hacer'),
            is_accepted: isAccepted,
            assigned_tech_name: assignedTechName,
            agreed_price: agreedPrice,
            fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
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
            hasNewTechMessage,
            lastTechMsg,
          };
        });

        setNetworkJobs(jobs);

        // Si tenemos un trabajo seleccionado, actualizar en vivo
        if (selectedJobForQuotes) {
          const updated = jobs.find(j => j.id === selectedJobForQuotes.id);
          if (updated) {
            setSelectedJobForQuotes(updated);
            if (activeChatQuote) {
              const updatedActiveQuote = updated.cotizaciones_list.find(q => (q.technician_id || q.technician?.id) === (activeChatQuote.technician_id || activeChatQuote.technician?.id));
              if (updatedActiveQuote) {
                setActiveChatQuote(updatedActiveQuote);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching network jobs", e);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Polling de alta frecuencia (1.5s) para el modal de cotizaciones y chat en vivo
  useEffect(() => {
    if (!showQuotesModal) return;

    const pollLiveQuotesAndChat = async () => {
      // 1. Si está viendo el chat directo con un técnico, sincronizar su chat en tiempo real
      if (activeChatQuote?.id) {
        try {
          const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${activeChatQuote.id}/chat`, { headers });
          if (res.data?.success && res.data.chat_history) {
            setActiveChatQuote(prev => {
              if (!prev) return prev;
              const currentLen = prev.chat_history?.length || 0;
              const newLen = res.data.chat_history.length;
              if (currentLen !== newLen || JSON.stringify(prev.chat_history) !== JSON.stringify(res.data.chat_history)) {
                return {
                  ...prev,
                  chat_history: res.data.chat_history
                };
              }
              return prev;
            });
          }
        } catch (e) {
          // silent polling
        }
      } else {
        // 2. Si está en la lista de cotizaciones, refrescar cada 2.5s para detectar nuevas ofertas o mensajes
        fetchJobs();
      }
    };

    const liveInterval = setInterval(pollLiveQuotesAndChat, 1500);
    return () => clearInterval(liveInterval);
  }, [showQuotesModal, activeChatQuote?.id]);

  useEffect(() => {
    if (activeChatQuote) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatQuote?.chat_history]);

  const handleSendClientChat = async (e) => {
    if (e) e.preventDefault();
    if (!clientChatInput.trim() || sendingClientChat || !activeChatQuote) return;

    const textToSend = clientChatInput.trim();
    setClientChatInput('');
    setSendingClientChat(true);

    // Actualización optimista instantánea (0ms)
    const userFullName = user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user.name || 'Tú (Cliente)')) : 'Tú (Cliente)';
    const optimisticMessage = {
      sender_id: user?.id,
      sender_name: userFullName,
      sender_role: 'Cliente',
      message: textToSend,
      created_at: new Date().toISOString()
    };

    setActiveChatQuote(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        chat_history: [...(prev.chat_history || []), optimisticMessage]
      };
    });

    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/network-quotes/${activeChatQuote.id}/chat`,
        { message: textToSend },
        { headers }
      );
      if (res.data?.chat_history) {
        setActiveChatQuote(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            chat_history: res.data.chat_history
          };
        });
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      alert("No se pudo enviar el mensaje. Intenta de nuevo.");
    } finally {
      setSendingClientChat(false);
    }
  };

  const handleRejectQuote = async (quoteId) => {
    if (!window.confirm("¿Estás seguro de que deseas rechazar esta cotización?")) return;
    
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quoteId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert("Cotización rechazada. El técnico ha sido notificado para mejorar su oferta.");
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
      alert("Hubo un error al rechazar la cotización.");
    }
  };

  const handleResponderVisita = async (action) => {
    if (!selectedJobForQuotes?.id) return;
    let msg = '';
    if (action === 'reschedule') {
      msg = prompt("Escribe una breve nota sobre qué horario te queda mejor:");
      if (msg === null) return;
    }
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${selectedJobForQuotes.id}/responder-visita-cliente`,
        { action, message: msg },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        alert("✅ " + res.data.message);
        fetchJobs();
      }
    } catch (e) {
      console.error("Error respondiendo visita", e);
      alert("Hubo un error al responder. Intenta de nuevo.");
    }
  };

  const handleAcceptQuote = async (quote) => {
    const techName = quote.technicianName || (quote.technician ? `${quote.technician.first_name} ${quote.technician.last_name}` : 'este técnico');
    if (!window.confirm(`¿Confirmas que deseas ACEPTAR la cotización de $${parseFloat(quote.price).toFixed(2)} de ${techName}? El trabajo le será asignado de inmediato.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quote.id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert("🎉 " + res.data.message);
        setActiveTab('aceptados');
        setShowQuotesModal(false);
        setActiveChatQuote(null);
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
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        alert("✅ Publicación eliminada y cancelada con éxito.");
        setShowQuotesModal(false);
        setSelectedJob(null);
        setActiveChatQuote(null);
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
    setActiveChatQuote(null);
    setShowQuotesModal(true);
  };

  const enRedJobs = networkJobs.filter(j => !j.is_accepted);
  const aceptadosJobs = networkJobs.filter(j => j.is_accepted);
  const displayedJobs = activeTab === 'en_red' ? enRedJobs : aceptadosJobs;

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
            <><List size={16} /> Ver Lista ({displayedJobs.length})</>
          )}
        </button>

        {/* ─── Map Section ─── */}
        <div className="mercado-map-section">
          {isLoaded ? (
            <>
              <div className="mercado-map-overlay-badge">
                <span className="mercado-map-live-dot" />
                {activeTab === 'en_red' ? `${enRedJobs.length} en red` : `${aceptadosJobs.length} asignados`}
              </div>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={13}
                options={{ disableDefaultUI: false }}
              >
                {displayedJobs.map(job => (
                  <React.Fragment key={job.id}>
                    <Circle
                      center={{ lat: job.lat, lng: job.lng }}
                      radius={550}
                      options={{
                        fillColor: job.is_accepted ? '#16a34a' : (job.hasNewTechMessage ? '#2563eb' : (job.cotizaciones > 0 ? '#16a34a' : '#ff6600')),
                        fillOpacity: 0.16,
                        strokeColor: job.is_accepted ? '#15803d' : (job.hasNewTechMessage ? '#1d4ed8' : (job.cotizaciones > 0 ? '#15803d' : '#ea580c')),
                        strokeWeight: 1.5,
                        clickable: true
                      }}
                      onClick={() => openQuotesModal(job)}
                    />
                    <Marker
                      position={{ lat: job.lat, lng: job.lng }}
                      onClick={() => openQuotesModal(job)}
                      title={job.is_accepted ? `Asignado: ${job.titulo}` : `Zona: ${job.zona}`}
                      icon={{
                        url: job.is_accepted
                          ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                          : (job.hasNewTechMessage
                            ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                            : (job.cotizaciones > 0 
                              ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                              : 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'))
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
                      <p style={{ margin: '4px 0', fontWeight: 'bold', color: selectedJob.is_accepted ? '#16a34a' : '#ff6600' }}>
                        {selectedJob.is_accepted ? '✓ Asignado a Técnico' : selectedJob.estado}
                      </p>
                      <p style={{ color: '#ea580c', fontWeight: '700' }}><MapPin size={11} /> {selectedJob.zona}</p>
                      <p><Clock size={11} /> {selectedJob.fecha}</p>
                      <button 
                        className="mercado-btn-details"
                        onClick={() => openQuotesModal(selectedJob)}
                      >
                        {selectedJob.is_accepted ? 'Ver Detalle y Coordinación' : `Ver ${selectedJob.cotizaciones} ${selectedJob.cotizaciones === 1 ? 'Cotización' : 'Cotizaciones'}`}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p className="mercado-sidebar-title">🔴 Panel Cliente</p>
              <button 
                className="red-btn-publish"
                onClick={() => setShowModal(true)}
              >
                <Plus size={16} /> Publicar Problema
              </button>
            </div>
            <h2 className="mercado-sidebar-subtitle">Mis Publicaciones</h2>
            <p className="mercado-sidebar-desc">Tus reportes en la red y servicios asignados</p>
          </div>

          {/* Selector de Pestañas (En Red vs Asignados) */}
          <div className="mercado-sidebar-tabs">
            <button
              type="button"
              className={`mercado-tab-btn ${activeTab === 'en_red' ? 'active' : ''}`}
              onClick={() => setActiveTab('en_red')}
            >
              🌐 En Red
              <span className="mercado-tab-badge">{enRedJobs.length}</span>
            </button>
            <button
              type="button"
              className={`mercado-tab-btn tab-accepted ${activeTab === 'aceptados' ? 'active' : ''}`}
              onClick={() => setActiveTab('aceptados')}
            >
              ✓ Asignados
              <span className="mercado-tab-badge">{aceptadosJobs.length}</span>
            </button>
          </div>

          <div className="mercado-job-list">
            {displayedJobs.length === 0 && (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 20px', fontSize: '14px' }}>
                {activeTab === 'en_red' ? (
                  <>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '700', color: '#0f172a' }}>No tienes publicaciones abiertas en la red</p>
                    <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>Haz clic en "Publicar Problema" para solicitar cotizaciones de técnicos.</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '700', color: '#0f172a' }}>No tienes trabajos asignados</p>
                    <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>Cuando aceptes la cotización de un técnico, tu servicio aparecerá aquí para coordinar visita y chatear directamente.</span>
                  </>
                )}
              </div>
            )}

            {displayedJobs.map(job => (
              <div
                key={job.id}
                className={`mercado-job-card ${selectedJobForQuotes?.id === job.id ? 'active' : ''}`}
                onClick={() => openQuotesModal(job)}
              >
                <div className="mercado-job-card-top">
                  <h4>{job.titulo}</h4>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {job.is_urgent ? (
                      <span className="mercado-urgency-badge urgent">⚡ Urgente</span>
                    ) : (job.scheduled_at || job.priority === 'Programado') ? (
                      <span className="mercado-urgency-badge scheduled">📅 Programado</span>
                    ) : null}
                    <span className={`mercado-job-badge ${job.is_accepted ? 'badge-accepted' : 'badge-pending'}`}>
                      {job.is_accepted ? 'Asignado a Técnico' : job.estado}
                    </span>
                  </div>
                </div>

                {job.is_accepted && job.assigned_tech_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#16a34a', margin: '4px 0 2px 0' }}>
                    <User size={13} color="#16a34a" />
                    <span>Técnico: {job.assigned_tech_name}</span>
                    {job.agreed_price > 0 && (
                      <span style={{ color: '#ea580c', marginLeft: 'auto' }}>
                        ${job.agreed_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                )}

                <div className="mercado-job-meta">
                  <span style={{ color: '#ea580c', fontWeight: '700' }}><MapPin size={11} /> {job.zona}</span>
                  <span><Clock size={11} /> {job.fecha}</span>
                </div>

                {/* HORARIO DE VISITA / ESTADO */}
                {job.scheduled_at && (() => {
                  const sched = getJobScheduleStatus(job);
                  if (sched.isRescheduleRequested) {
                    return (
                      <div style={{ fontSize: '11.5px', padding: '6px 10px', borderRadius: '8px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚠️</span>
                        <span><strong>Re-coordinación:</strong> Solicitaste cambio de horario</span>
                      </div>
                    );
                  }
                  if (sched.isScheduleConfirmed) {
                    return (
                      <div style={{ fontSize: '11.5px', padding: '6px 10px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✅</span>
                        <span><strong>Visita Confirmada:</strong> {new Date(job.scheduled_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ fontSize: '11.5px', padding: '6px 10px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📅</span>
                      <span><strong>Visita Propuesta:</strong> {new Date(job.scheduled_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })} (Por confirmar)</span>
                    </div>
                  );
                })()}

                {/* ALERTA DE NUEVO MENSAJE DE TÉCNICO */}
                {job.hasNewTechMessage && (
                  <div className="red-publication-msg-alert">
                    <span className="red-msg-dot-pulse" />
                    <span>💬 <strong>Mensaje de técnico:</strong> "{job.lastTechMsg?.message}"</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '12px' }}>
                  <span style={{ color: job.is_accepted ? '#16a34a' : '#ea580c', fontWeight: '800' }}>
                    {job.is_accepted ? '✓ Asignación Activa' : `${job.cotizaciones} ${job.cotizaciones === 1 ? 'oferta recibida' : 'ofertas recibidas'}`}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {job.is_mine && !job.is_accepted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id);
                        }}
                        title="Eliminar mi publicación"
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
                    )}
                    <span style={{ color: job.is_accepted ? '#16a34a' : '#ff6600', fontWeight: '700', cursor: 'pointer' }}>
                      {job.is_accepted ? 'Ver coordinación →' : 'Ver ofertas →'}
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

      {/* ─── MODAL DE DETALLE DE PUBLICACIÓN Y COTIZACIONES (DISEÑO PREMIUM UNIFICADO) ─── */}
      {showQuotesModal && selectedJobForQuotes && (
        <div className="mercado-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowQuotesModal(false)}>
          <div className="mercado-premium-modal" style={{ maxWidth: '1080px' }}>
            <div className="mercado-premium-header">
              <h2>📋 Detalle de Publicación y Cotizaciones</h2>
              <span className="mercado-modal-close" onClick={() => setShowQuotesModal(false)}>×</span>
            </div>

            <div className="mercado-premium-body">
              {/* Left panel: Info & Photo Gallery */}
              <div className="mercado-premium-details" style={{ flex: '1.05' }}>
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
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '10px 0' }}>{selectedJobForQuotes.titulo}</h3>
                  <div className="mercado-premium-info-grid">
                    <div className="mercado-info-item full-width" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '12px', padding: '12px 14px' }}>
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

                    {selectedJobForQuotes.scheduled_at && (() => {
                      const sched = getJobScheduleStatus(selectedJobForQuotes, activeChatQuote);
                      if (sched.isRescheduleRequested) {
                        return (
                          <div className="mercado-info-item full-width" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Clock size={16} color="#ea580c" />
                              <strong style={{ color: '#c2410c', fontSize: '13px' }}>⚠️ Solicitud de Re-coordinación Enviada</strong>
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#7c2d12' }}>
                              Has solicitado acordar otro horario. Esperando que el técnico proponga una nueva fecha y hora.
                            </div>
                          </div>
                        );
                      }
                      if (sched.isScheduleConfirmed) {
                        return (
                          <div className="mercado-info-item full-width" style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CheckCircle size={16} color="#16a34a" />
                              <strong style={{ color: '#166534', fontSize: '13px' }}>✅ Horario de Visita Confirmado</strong>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                              {new Date(selectedJobForQuotes.scheduled_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="mercado-info-item full-width" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} color="#2563eb" />
                            <strong style={{ color: '#1e40af', fontSize: '13px' }}>📅 Horario Propuesto por el Técnico</strong>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                            {new Date(selectedJobForQuotes.scheduled_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleResponderVisita('confirm')}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '800',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              ✓ Confirmar Horario
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResponderVisita('reschedule')}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: '#ffffff',
                                color: '#ea580c',
                                border: '1.5px solid #fed7aa',
                                borderRadius: '8px',
                                fontWeight: '800',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              💬 Re-coordinar
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Right panel: Quotes list OR Embedded Live Chat */}
              <div className="mercado-premium-form" style={{ background: '#ffffff', overflowY: 'auto', padding: 0, display: 'flex', flexDirection: 'column' }}>
                
                {/* ─── VISTA 1: LISTA DE COTIZACIONES DE TÉCNICOS ─── */}
                {!activeChatQuote && (
                  <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📋 Cotizaciones de Técnicos
                        <span style={{ fontSize: '12px', background: '#ff6600', color: '#ffffff', padding: '2px 8px', borderRadius: '12px' }}>
                          {selectedJobForQuotes.cotizaciones_list?.length || 0}
                        </span>
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Revisa las propuestas de los técnicos. Puedes chatear con ellos o coordinar los detalles del servicio.
                      </p>
                    </div>

                    {/* Banner de Horario Propuesto si ya hay fecha fijada */}
                    {selectedJobForQuotes.scheduled_at && (() => {
                      const sched = getJobScheduleStatus(selectedJobForQuotes);
                      if (sched.isRescheduleRequested) {
                        return (
                          <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#fff7ed', borderRadius: '12px', border: '1.5px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>⚠️</span>
                            <div>
                              <strong style={{ fontSize: '12px', color: '#c2410c', display: 'block' }}>Solicitud de Re-coordinación Enviada:</strong>
                              <span style={{ fontSize: '12.5px', color: '#7c2d12' }}>
                                Esperando que el técnico proponga un nuevo horario.
                              </span>
                            </div>
                          </div>
                        );
                      }
                      if (sched.isScheduleConfirmed) {
                        return (
                          <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>✅</span>
                            <div>
                              <strong style={{ fontSize: '12px', color: '#166534', display: 'block' }}>Horario de Visita Confirmado:</strong>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                                {new Date(selectedJobForQuotes.scheduled_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#eff6ff', borderRadius: '12px', border: '1.5px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>📅</span>
                            <div>
                              <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block' }}>Horario de Visita Propuesto:</strong>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                                {new Date(selectedJobForQuotes.scheduled_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleResponderVisita('confirm')}
                              style={{
                                padding: '6px 12px',
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: '800',
                                fontSize: '11.5px',
                                cursor: 'pointer'
                              }}
                            >
                              ✓ Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResponderVisita('reschedule')}
                              style={{
                                padding: '6px 10px',
                                background: '#ffffff',
                                color: '#ea580c',
                                border: '1px solid #fed7aa',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '11.5px',
                                cursor: 'pointer'
                              }}
                            >
                              Re-coordinar
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {(!selectedJobForQuotes.cotizaciones_list || selectedJobForQuotes.cotizaciones_list.length === 0) ? (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 20px', background: '#fffaf5', borderRadius: '16px', border: '2px dashed #fed7aa', margin: '20px 0' }}>
                        <div style={{ fontSize: '36px', marginBottom: '10px' }}>⏳</div>
                        <p style={{ margin: '0 0 6px 0', fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Aún no hay cotizaciones</p>
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Los técnicos de la red te notificarán en cuanto envíen su propuesta.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {selectedJobForQuotes.cotizaciones_list.map((quote) => {
                          const isAcceptedQuote = Boolean(
                            quote.status === 'accepted' || 
                            quote.is_assigned || 
                            (selectedJobForQuotes.is_accepted && Number(selectedJobForQuotes.tecnico_id) === Number(quote.technician_id || quote.technician?.id))
                          );
                          return (
                            <div 
                              key={quote.id} 
                              className="red-quote-card"
                              style={isAcceptedQuote ? { border: '2px solid #86efac', background: '#f0fdf4' } : {}}
                            >
                              <div className="red-quote-header">
                                <div className="red-quote-tech">
                                  <div 
                                    className="red-quote-avatar" 
                                    onClick={() => {
                                      setSelectedTechnicianProfile(quote.technician);
                                      setShowTechModal(true);
                                    }}
                                    style={isAcceptedQuote ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}
                                    title="Ver perfil completo y especialidades del técnico"
                                  >
                                    {quote.technician?.first_name?.charAt(0) || 'T'}
                                  </div>
                                  <div>
                                    <h4 
                                      style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                      onClick={() => {
                                        setSelectedTechnicianProfile(quote.technician);
                                        setShowTechModal(true);
                                      }}
                                    >
                                      {quote.technicianName}
                                      {isAcceptedQuote && (
                                        <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', border: '1px solid #86efac' }}>
                                          ✓ Asignado
                                        </span>
                                      )}
                                    </h4>
                                    <span className="red-quote-role">Técnico Verificado</span>
                                  </div>
                                </div>
                                <div className="red-quote-price" style={{ color: isAcceptedQuote ? '#16a34a' : '#ea580c' }}>
                                  {quote.price > 0 ? `$${parseFloat(quote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Chat Iniciado'}
                                </div>
                              </div>

                              {quote.message && (
                                <div className="red-quote-message">
                                  "{quote.message}"
                                </div>
                              )}

                              {/* ALERTA DE MENSAJE DEL TÉCNICO EN LA TARJETA */}
                              {quote.hasNewTechMessage && (
                                <div className="red-quote-msg-alert">
                                  <span className="red-msg-dot-pulse" />
                                  <div>
                                    <strong>Mensaje de {quote.technicianName}:</strong>
                                    <div>"{quote.displayAlertMsg}"</div>
                                  </div>
                                </div>
                              )}

                              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                                📅 Última interacción: {new Date(quote.created_at).toLocaleString('es-MX')}
                              </div>

                              <div className="red-quote-actions">
                                {isAcceptedQuote ? (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: '#dcfce7',
                                    border: '1.5px solid #86efac',
                                    borderRadius: '8px',
                                    color: '#15803d',
                                    fontWeight: '800',
                                    fontSize: '12px'
                                  }}>
                                    <CheckCircle size={14} /> Oferta Aceptada
                                  </div>
                                ) : quote.status === 'rejected' ? (
                                  <div style={{ color: '#dc2626', fontWeight: '800', fontSize: '13px', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ❌ Oferta Rechazada
                                  </div>
                                ) : !selectedJobForQuotes.is_accepted ? (
                                  <button 
                                    className="red-btn-reject" 
                                    onClick={() => handleRejectQuote(quote.id)}
                                  >
                                    Rechazar
                                  </button>
                                ) : null}

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    type="button"
                                    className="red-btn-contact" 
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '6px',
                                      background: quote.hasNewTechMessage ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : (isAcceptedQuote ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #0284c7, #0369a1)'),
                                      color: '#ffffff',
                                      border: 'none',
                                      fontWeight: '800',
                                      boxShadow: isAcceptedQuote ? '0 3px 8px rgba(22, 163, 74, 0.25)' : '0 3px 8px rgba(2, 132, 199, 0.25)'
                                    }}
                                    onClick={() => setActiveChatQuote(quote)}
                                  >
                                    <MessageCircle size={15} /> 
                                    <span>Chat ({quote.chat_history?.length || 0})</span>
                                  </button>

                                  {!isAcceptedQuote && !selectedJobForQuotes.is_accepted && quote.status !== 'rejected' && quote.price > 0 && (
                                    <button 
                                      type="button"
                                      className="red-btn-accept" 
                                      onClick={() => handleAcceptQuote(quote)}
                                    >
                                      ✓ Aceptar Oferta
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── VISTA 2: CHAT DIRECTO EMBEBIDO CON EL TÉCNICO SELECCIONADO ─── */}
                {activeChatQuote && (
                  <div className="red-embedded-chat-wrap">
                    {/* Header del Chat */}
                    <div className="red-chat-top-header">
                      <button className="back-btn" onClick={() => setActiveChatQuote(null)}>
                        <ChevronLeft size={16} /> Ver todas las ofertas
                      </button>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                          {activeChatQuote.technicianName}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: '800' }}>
                          {activeChatQuote.price > 0 ? `Oferta: $${parseFloat(activeChatQuote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Chat Activo'}
                        </span>
                      </div>
                    </div>

                    {/* Alerta si el técnico envió un mensaje */}
                    {activeChatQuote.hasNewTechMessage && (
                      <div className="mercado-chat-alert-banner">
                        <div className="mercado-chat-alert-icon">🔔</div>
                        <div className="mercado-chat-alert-text">
                          <strong>El Técnico te envió un mensaje:</strong>
                          <span>"{activeChatQuote.displayAlertMsg || activeChatQuote.lastMsg?.message || activeChatQuote.message}"</span>
                        </div>
                      </div>
                    )}

                    {/* Banner de Horario Propuesto con Botones de Confirmación */}
                    {selectedJobForQuotes.scheduled_at && (() => {
                      const sched = getJobScheduleStatus(selectedJobForQuotes, activeChatQuote);
                      if (sched.isRescheduleRequested) {
                        return (
                          <div style={{ padding: '10px 16px', background: '#fff7ed', borderBottom: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px' }}>⚠️</span>
                            <div>
                              <strong style={{ fontSize: '12px', color: '#c2410c', display: 'block' }}>Solicitud de Re-coordinación Enviada</strong>
                              <span style={{ fontSize: '12px', color: '#7c2d12' }}>Esperando que el técnico proponga un nuevo horario.</span>
                            </div>
                          </div>
                        );
                      }
                      if (sched.isScheduleConfirmed) {
                        return (
                          <div style={{ padding: '10px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px' }}>✅</span>
                              <div>
                                <strong style={{ fontSize: '12px', color: '#166534', display: 'block' }}>Horario de Visita Confirmado</strong>
                                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>{new Date(selectedJobForQuotes.scheduled_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                              </div>
                            </div>
                            <CountdownVisita targetDate={selectedJobForQuotes.scheduled_at} isCompact={true} />
                          </div>
                        );
                      }
                      return (
                        <div style={{ padding: '10px 16px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px' }}>📅</span>
                            <div>
                              <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block' }}>Horario de Visita Propuesto:</strong>
                              <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                                {new Date(selectedJobForQuotes.scheduled_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleResponderVisita('confirm')}
                              style={{
                                padding: '6px 12px',
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: '800',
                                fontSize: '11.5px',
                                cursor: 'pointer'
                              }}
                            >
                              ✓ Confirmar Horario
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResponderVisita('reschedule')}
                              style={{
                                padding: '6px 10px',
                                background: '#ffffff',
                                color: '#ea580c',
                                border: '1px solid #fed7aa',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '11.5px',
                                cursor: 'pointer'
                              }}
                            >
                              Re-coordinar
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Stream de Mensajes */}
                    <div className="mercado-chat-messages-container">
                      {(!activeChatQuote.chat_history || activeChatQuote.chat_history.length === 0) ? (
                        <div className="mercado-chat-empty-state">
                          <div className="icon-wrap">
                            <MessageCircle size={26} />
                          </div>
                          <p>Inicia la conversación</p>
                          <span>Escribe a {activeChatQuote.technicianName} para acordar precio, horarios o dudas sobre el servicio.</span>
                        </div>
                      ) : (
                        activeChatQuote.chat_history.map((msg, idx) => {
                          const isClient = Number(msg.sender_id) === Number(user?.id) || msg.sender_role === 'Cliente' || msg.sender_role === 'Usuario';
                          return (
                            <div
                              key={idx}
                              className={`mercado-chat-bubble-row ${isClient ? 'sent' : 'received'}`}
                            >
                              <span className="mercado-chat-bubble-sender">
                                {isClient ? 'Tú (Cliente)' : (msg.sender_name || 'Técnico')}
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

                    {/* Quick Action Banner inside Chat */}
                    {(activeChatQuote.status === 'accepted' || activeChatQuote.is_assigned || selectedJobForQuotes.is_accepted) ? (
                      <div style={{ padding: '8px 16px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#166534', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle size={14} color="#16a34a" /> Cotización Aceptada: ${parseFloat(activeChatQuote.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: '11px', color: '#15803d', fontWeight: '800', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                          Técnico Asignado
                        </span>
                      </div>
                    ) : (activeChatQuote.price > 0 && activeChatQuote.status !== 'rejected' && (
                      <div style={{ padding: '8px 16px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#166534', fontWeight: '700' }}>
                          Propuesta de {activeChatQuote.technicianName}: ${parseFloat(activeChatQuote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          className="red-btn-accept"
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                          onClick={() => handleAcceptQuote(activeChatQuote)}
                        >
                          ✓ Aceptar Esta Oferta
                        </button>
                      </div>
                    ))}

                    {/* Input Bar integrado */}
                    <form onSubmit={handleSendClientChat} className="mercado-chat-input-bar">
                      <input
                        type="text"
                        placeholder={`Escribe un mensaje a ${activeChatQuote.technicianName}...`}
                        value={clientChatInput}
                        onChange={(e) => setClientChatInput(e.target.value)}
                        disabled={sendingClientChat}
                      />
                      <button
                        type="submit"
                        className="mercado-chat-send-btn"
                        disabled={sendingClientChat || !clientChatInput.trim()}
                      >
                        <Send size={15} />
                        <span>{sendingClientChat ? 'Enviando...' : 'Enviar'}</span>
                      </button>
                    </form>
                  </div>
                )}

              </div>
            </div>

            <div className="mercado-premium-footer" style={{ display: 'flex', justifyContent: selectedJobForQuotes?.is_mine ? 'space-between' : 'flex-end', alignItems: 'center', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
              {selectedJobForQuotes?.is_mine && (
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
              )}

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
    </div>
  );
};

export default VistaRedAutonomo;
