import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Shared/Header';
import ModalServicioAutonomo from '../Admin/ModalServicioAutonomo';
import '../../../styles/AgenteMarket/Admin/VistaRedAutonomo.css';
import '../../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';
import '../../../styles/AgenteMarket/Cliente/CalendarioCliente.css';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  CalendarDays,
  PlusCircle,
  MessageCircle,
  Maximize2,
  Image as ImageIcon,
  FileText,
  X,
  Trash2,
  Send,
  CheckCircle,
  Search,
  Award
} from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = [
  'DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'
];

const limpiarDescripcion = (rawDesc) => {
  if (!rawDesc) return 'Sin descripción adicional';
  let clean = rawDesc;
  clean = clean.replace(/\[LOTE-[A-Z0-9]+\]\s*(\(\d+\/\d+\))?\s*/gi, '');
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*(otro|Otro|ninguno|Ninguno|n\/a|N\/A)\s*/gi, '');
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*/gi, ' - Equipo: ');
  return clean.trim() || rawDesc;
};

const CalendarioCliente = () => {
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [networkJobs, setNetworkJobs] = useState([]);

  // Estados del modal reciclado de cotizaciones
  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [selectedJobForQuotes, setSelectedJobForQuotes] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [activeChatQuote, setActiveChatQuote] = useState(null);
  const [selectedTechnicianProfile, setSelectedTechnicianProfile] = useState(null);
  const [showTechModal, setShowTechModal] = useState(false);
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);

  // Chat
  const [clientChatInput, setClientChatInput] = useState('');
  const [sendingClientChat, setSendingClientChat] = useState(false);
  const chatEndRef = useRef(null);

  const groupQuotesByTechnician = (quotesList, order) => {
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

    return {
      isRescheduleRequested,
      isScheduleConfirmed
    };
  };

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos?only_mine=1`, { headers });
      
      if (res.data?.success && Array.isArray(res.data.data)) {
        const userFullName = user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name) : '';

        const jobs = res.data.data.map(order => {
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

          let eventDateStr = order.scheduled_at || order.fecha_visita || order.due_date || order.created_at;
          let eventDate = new Date(eventDateStr);
          if (isNaN(eventDate.getTime())) eventDate = new Date();

          let timeFormatted = 'Por definir';
          if (order.scheduled_at) {
            try {
              timeFormatted = new Date(order.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            } catch {
              timeFormatted = '10:00 a.m.';
            }
          } else if (order.hora_visita) {
            timeFormatted = order.hora_visita;
          }

          const sched = getJobScheduleStatus({ ...order, cotizaciones_list: groupedQuotes }, acceptedQuote);
          let statusType = 'network';
          let statusLabel = 'En Red / Cotizando';

          if (sched.isScheduleConfirmed || isAccepted) {
            statusType = 'confirmed';
            statusLabel = 'Visita Confirmada';
          } else if (order.scheduled_at) {
            statusType = 'proposed';
            statusLabel = 'Horario Propuesto';
          }

          return {
            id: order.id,
            titulo: tituloProblema,
            tipo: order.type || 'Problema',
            equipo: order.equipment || '',
            presupuesto: agreedPrice > 0 ? `$${agreedPrice.toFixed(2)}` : 'A convenir',
            estado: isAccepted ? (order.status === 'Terminado' ? 'Terminado' : 'Asignado') : (order.status || 'Por Hacer'),
            is_accepted: isAccepted,
            assigned_tech_name: assignedTechName,
            agreed_price: agreedPrice,
            fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
            lugar: order.property?.name || order.property?.property_name || 'Lugar no especificado',
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
            scheduled_at: order.scheduled_at,
            hasNewTechMessage,
            lastTechMsg,
            calendarDate: eventDate,
            dateKey: eventDate.toISOString().slice(0, 10),
            calendarTime: timeFormatted,
            statusType,
            statusLabel
          };
        });

        setNetworkJobs(jobs);

        if (selectedJobForQuotes) {
          const updated = jobs.find(j => j.id === selectedJobForQuotes.id);
          if (updated) {
            setSelectedJobForQuotes(updated);
            if (activeChatQuote) {
              const updatedActiveQuote = updated.cotizaciones_list.find(q => (q.technician_id || q.technician?.id) === (activeChatQuote.technician_id || activeChatQuote.technician?.id));
              if (updatedActiveQuote) setActiveChatQuote(updatedActiveQuote);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching jobs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenQuotesModal = (job) => {
    setSelectedJobForQuotes(job);
    setActivePhoto(job.fotos?.[0] || job.foto || null);
    setActiveChatQuote(null);
    setShowQuotesModal(true);
  };

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
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/network-quotes/${activeChatQuote.id}/chat`,
        { message: textToSend },
        { headers }
      );
      if (res.data?.chat_history) {
        setActiveChatQuote(prev => prev ? { ...prev, chat_history: res.data.chat_history } : prev);
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      alert("No se pudo enviar el mensaje.");
    } finally {
      setSendingClientChat(false);
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
    }
  };

  const handleAcceptQuote = async (quote) => {
    const techName = quote.technicianName || 'este técnico';
    if (!window.confirm(`¿Confirmas que deseas ACEPTAR la cotización de $${parseFloat(quote.price).toFixed(2)} de ${techName}?`)) return;
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quote.id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert("🎉 " + res.data.message);
        setShowQuotesModal(false);
        setActiveChatQuote(null);
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
      alert("Hubo un error al aceptar la cotización.");
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
        alert("Cotización rechazada.");
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar y cancelar esta publicación de la Red?")) return;
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        alert("✅ Publicación eliminada.");
        setShowQuotesModal(false);
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredEvents = useMemo(() => {
    return networkJobs.filter(job => {
      const matchFilter = selectedFilter === 'all' || job.statusType === selectedFilter;
      const matchSearch = searchQuery.trim() === '' ||
        job.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.zona.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.lugar.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [networkJobs, selectedFilter, searchQuery]);

  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);
    const cells = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateKey = prevDate.toISOString().slice(0, 10);
      cells.push({
        dayNumber: dayNum,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        events: filteredEvents.filter(e => e.dateKey === dateKey)
      });
    }

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const thisDate = new Date(year, month, dayNum);
      const dateKey = thisDate.toISOString().slice(0, 10);
      cells.push({
        dayNumber: dayNum,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
        events: filteredEvents.filter(e => e.dateKey === dateKey)
      });
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateKey = nextDate.toISOString().slice(0, 10);
      cells.push({
        dayNumber: i,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        events: filteredEvents.filter(e => e.dateKey === dateKey)
      });
    }

    return cells;
  }, [currentDate, filteredEvents]);

  return (
    <div className="calendario-page-container">
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <Header rolTexto="CLIENTE PARTICULAR" titulo="CALENDARIO DE VISITAS Y SERVICIOS" />

      <main className="calendario-main-wrapper">
        <div className="cal-hero-header">
          <div className="cal-hero-title-group">
            <h2>
              <CalendarIcon size={28} color="#FF6600" />
              <span>Agenda y Calendario de <span className="hero-accent">Servicios</span></span>
            </h2>
            <p className="cal-hero-subtitle">
              Visualiza en tiempo real las fechas de visita coordinadas con tus técnicos, cotizaciones y trabajos activos.
            </p>
          </div>

          <div className="cal-hero-actions">
            <button 
              className="btn-nueva-solicitud"
              onClick={() => setShowNewServiceModal(true)}
            >
              <PlusCircle size={18} />
              Publicar Nuevo Servicio
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="scheduler-toolbar-card">
          <div className="cal-nav-group">
            <button className="btn-cal-today" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </button>
            <div className="cal-arrows">
              <button className="btn-cal-arrow" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                <ChevronLeft size={20} />
              </button>
              <button className="btn-cal-arrow" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                <ChevronRight size={20} />
              </button>
            </div>
            <h3 className="cal-current-date-title">
              <CalendarDays size={22} color="#FF6600" />
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
          </div>

          <div className="cal-controls-right">
            <div className="cal-search-box">
              <Search size={16} className="cal-search-icon" />
              <input 
                type="text"
                placeholder="Buscar servicio o técnico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="cal-view-selector">
              <button className={`btn-view-tab ${currentView === 'month' ? 'active' : ''}`} onClick={() => setCurrentView('month')}>
                Mes
              </button>
              <button className={`btn-view-tab ${currentView === 'agenda' ? 'active' : ''}`} onClick={() => setCurrentView('agenda')}>
                Agenda
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="scheduler-legend-bar">
          <span style={{ color: '#0f172a', fontWeight: 800 }}>Filtrar:</span>
          <button className={`legend-item ${selectedFilter === 'all' ? 'active' : ''}`} onClick={() => setSelectedFilter('all')}>
            Todos ({networkJobs.length})
          </button>
          <button className={`legend-item ${selectedFilter === 'confirmed' ? 'active' : ''}`} onClick={() => setSelectedFilter(selectedFilter === 'confirmed' ? 'all' : 'confirmed')}>
            <span className="legend-dot dot-confirmed"></span>
            <span>Visitas Confirmadas</span>
          </button>
          <button className={`legend-item ${selectedFilter === 'proposed' ? 'active' : ''}`} onClick={() => setSelectedFilter(selectedFilter === 'proposed' ? 'all' : 'proposed')}>
            <span className="legend-dot dot-proposed"></span>
            <span>Horarios Propuestos</span>
          </button>
          <button className={`legend-item ${selectedFilter === 'network' ? 'active' : ''}`} onClick={() => setSelectedFilter(selectedFilter === 'network' ? 'all' : 'network')}>
            <span className="legend-dot dot-network"></span>
            <span>En Red / Cotizando</span>
          </button>
        </div>

        {/* Grid de Mes */}
        <div className="scheduler-canvas-card">
          {loading ? (
            <div className="cal-loading-container">
              <div className="cal-spinner"></div>
              <p style={{ fontWeight: 700 }}>Cargando calendario...</p>
            </div>
          ) : (
            <div className="cal-month-grid">
              <div className="cal-month-header-row">
                {DAY_NAMES.map((name, index) => (
                  <div key={index} className="cal-header-cell">{name}</div>
                ))}
              </div>

              <div className="cal-month-days-grid">
                {monthMatrix.map((cell, idx) => (
                  <div key={idx} className={`cal-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''}`}>
                    <div className="cal-day-header">
                      <span className="cal-day-number">{cell.dayNumber}</span>
                      {cell.events.length > 0 && (
                        <span className="cal-day-count-badge">{cell.events.length}</span>
                      )}
                    </div>
                    <div className="cal-events-list">
                      {cell.events.map((job) => (
                        <div 
                          key={job.id} 
                          className={`cal-event-chip status-${job.statusType}`}
                          onClick={() => handleOpenQuotesModal(job)}
                        >
                          <div className="chip-time-row">
                            <span className="chip-time-tag"><Clock size={11} /> {job.calendarTime}</span>
                          </div>
                          <span className="chip-title">{job.titulo}</span>
                          <span className="chip-tech"><User size={10} /> {job.assigned_tech_name || (job.cotizaciones > 0 ? `${job.cotizaciones} oferta(s)` : 'En espera')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Reciclado de Cotizaciones */}
      {showQuotesModal && selectedJobForQuotes && (
        <div className="mercado-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowQuotesModal(false)}>
          <div className="mercado-premium-modal" style={{ maxWidth: '1080px' }}>
            <div className="mercado-premium-header">
              <h2>📋 Detalle de Publicación y Cotizaciones</h2>
              <span className="mercado-modal-close" onClick={() => setShowQuotesModal(false)}>×</span>
            </div>

            <div className="mercado-premium-body">
              <div className="mercado-premium-details" style={{ flex: '1.05' }}>
                {activePhoto ? (
                  <div className="mercado-photo-gallery">
                    <div className="mercado-premium-image-wrapper" onClick={() => setIsPhotoZoomed(true)}>
                      <img src={activePhoto} alt="Evidencia" className="mercado-premium-image" />
                      <div className="mercado-image-zoom-badge"><Maximize2 size={12} /> Clic para ampliar</div>
                    </div>
                  </div>
                ) : (
                  <div className="mercado-no-photo-placeholder"><ImageIcon size={36} color="#94a3b8" /><span>Sin fotos</span></div>
                )}
                <div className="mercado-premium-text">
                  <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '10px 0' }}>{selectedJobForQuotes.titulo}</h3>
                  <div className="mercado-premium-info-grid">
                    <div className="mercado-info-item full-width" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '12px', padding: '12px' }}>
                      <MapPin size={18} color="#ea580c" />
                      <div><strong>Zona / Dirección:</strong> <span>{selectedJobForQuotes.zona} - {selectedJobForQuotes.calle}</span></div>
                    </div>
                    <div className="mercado-info-item full-width">
                      <FileText size={14} className="mercado-icon-blue" />
                      <div><strong>Problema:</strong> <span>{selectedJobForQuotes.descripcion}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mercado-premium-form" style={{ background: '#ffffff', overflowY: 'auto', padding: 0 }}>
                {!activeChatQuote ? (
                  <div style={{ padding: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '800' }}>
                      Cotizaciones de Técnicos ({selectedJobForQuotes.cotizaciones_list?.length || 0})
                    </h4>
                    {selectedJobForQuotes.cotizaciones_list?.map((quote) => (
                      <div key={quote.id} className="red-quote-card" style={{ marginBottom: '12px' }}>
                        <div className="red-quote-header">
                          <div className="red-quote-tech">
                            <div className="red-quote-avatar">{quote.technicianName?.charAt(0) || 'T'}</div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>{quote.technicianName}</h4>
                              <span className="red-quote-role">Técnico Verificado</span>
                            </div>
                          </div>
                          <div className="red-quote-price">${parseFloat(quote.price || 0).toFixed(2)}</div>
                        </div>
                        {quote.message && <div className="red-quote-message">"{quote.message}"</div>}
                        <div className="red-quote-actions" style={{ marginTop: '10px' }}>
                          <button type="button" className="red-btn-contact" onClick={() => setActiveChatQuote(quote)}>
                            <MessageCircle size={15} /> Chat ({quote.chat_history?.length || 0})
                          </button>
                          {!selectedJobForQuotes.is_accepted && quote.price > 0 && (
                            <button type="button" className="red-btn-accept" onClick={() => handleAcceptQuote(quote)}>
                              ✓ Aceptar Oferta
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="red-embedded-chat-wrap">
                    <div className="red-chat-top-header">
                      <button className="back-btn" onClick={() => setActiveChatQuote(null)}>
                        <ChevronLeft size={16} /> Volver a ofertas
                      </button>
                      <strong>{activeChatQuote.technicianName}</strong>
                    </div>
                    <div className="mercado-chat-messages-area">
                      {activeChatQuote.chat_history?.map((msg, index) => {
                        const isMe = Number(msg.sender_id) === Number(user?.id) || msg.sender_role === 'Cliente';
                        return (
                          <div key={index} className={`mercado-chat-bubble-row ${isMe ? 'me' : 'other'}`}>
                            <div className={`mercado-chat-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                              <div className="bubble-text">{msg.message}</div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleSendClientChat} className="mercado-chat-input-bar">
                      <input
                        type="text"
                        placeholder="Escribe un mensaje..."
                        value={clientChatInput}
                        onChange={(e) => setClientChatInput(e.target.value)}
                      />
                      <button type="submit" className="mercado-chat-send-btn"><Send size={15} /></button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            <div className="mercado-premium-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px' }}>
              <button className="mercado-btn-cancel" onClick={() => setShowQuotesModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Servicio */}
      {showNewServiceModal && (
        <ModalServicioAutonomo 
          onClose={() => setShowNewServiceModal(false)}
          onSuccess={() => {
            setShowNewServiceModal(false);
            fetchJobs();
          }}
        />
      )}
    </div>
  );
};

export default CalendarioCliente;
