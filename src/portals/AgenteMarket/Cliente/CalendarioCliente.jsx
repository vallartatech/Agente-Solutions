import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Shared/Header';
import ModalServicioAutonomo from '../Admin/ModalServicioAutonomo';
import ModalCalificarTecnico from '../../../components/Shared/ModalCalificarTecnico';
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
  Award,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES_FULL = [
  'DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'
];

const DAY_NAMES_MINI = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const HOURS_LIST = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM'
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
  const [miniCalDate, setMiniCalDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month'); // 'month' | 'week' | 'agenda'
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [networkJobs, setNetworkJobs] = useState([]);

  // Modal cotizaciones reciclado
  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [selectedJobForQuotes, setSelectedJobForQuotes] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [activeChatQuote, setActiveChatQuote] = useState(null);
  const [selectedTechnicianProfile, setSelectedTechnicianProfile] = useState(null);
  const [showTechModal, setShowTechModal] = useState(false);
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTargetTech, setRatingTargetTech] = useState(null);
  const [ratingTargetJob, setRatingTargetJob] = useState(null);

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
          let hourIndex = 10;
          if (order.scheduled_at) {
            try {
              const d = new Date(order.scheduled_at);
              timeFormatted = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
              hourIndex = d.getHours();
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
            hourIndex,
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

  const handleReopenJobInNetwork = async (job) => {
    if (!job?.id) return;
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${job.id}/reabrir-red`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data?.success) {
        alert("🌐 " + res.data.message);
        setShowQuotesModal(false);
        fetchJobs();
      }
    } catch (e) {
      console.error("Error reenviando solicitud a la red:", e);
      alert(e.response?.data?.message || "Hubo un error al reenviar la solicitud a la red.");
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

  const upNextJob = useMemo(() => {
    if (networkJobs.length === 0) return null;
    const confirmed = networkJobs.filter(j => j.statusType === 'confirmed');
    if (confirmed.length > 0) return confirmed[0];
    const proposed = networkJobs.filter(j => j.statusType === 'proposed');
    if (proposed.length > 0) return proposed[0];
    return networkJobs[0];
  }, [networkJobs]);

  const handleMiniPrev = () => setMiniCalDate(new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() - 1, 1));
  const handleMiniNext = () => setMiniCalDate(new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() + 1, 1));

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

  const miniCalMatrix = useMemo(() => {
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);
    const cells = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dateKey = d.toISOString().slice(0, 10);
      cells.push({
        dayNum,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        hasEvents: networkJobs.some(j => j.dateKey === dateKey)
      });
    }

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const dateKey = d.toISOString().slice(0, 10);
      cells.push({
        dayNum,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
        hasEvents: networkJobs.some(j => j.dateKey === dateKey)
      });
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateKey = d.toISOString().slice(0, 10);
      cells.push({
        dayNum,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        hasEvents: networkJobs.some(j => j.dateKey === dateKey)
      });
    }

    return cells;
  }, [miniCalDate, networkJobs]);

  const agendaGroupedEvents = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => a.calendarDate - b.calendarDate);
    const groups = {};
    sorted.forEach(ev => {
      if (!groups[ev.dateKey]) {
        groups[ev.dateKey] = {
          dateStr: ev.calendarDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          items: []
        };
      }
      groups[ev.dateKey].items.push(ev);
    });
    return Object.values(groups);
  }, [filteredEvents]);

  return (
    <div className="calendario-page-container">
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <Header rolTexto="CLIENTE PARTICULAR" titulo="CALENDARIO DE VISITAS Y SERVICIOS" />

      <main className="calendario-main-wrapper">
        <div className="modal-cal-content-body" style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Columna Principal */}
          <div className="cal-main-col">
            <div className="scheduler-toolbar-card">
              <div className="cal-nav-group">
                <button className="btn-cal-today" onClick={() => setCurrentDate(new Date())}>
                  Hoy
                </button>
                <div className="cal-arrows">
                  <button className="btn-cal-arrow" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                    <ChevronLeft size={18} />
                  </button>
                  <button className="btn-cal-arrow" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                    <ChevronRight size={18} />
                  </button>
                </div>
                <h3 className="cal-current-date-title">
                  <CalendarDays size={20} color="#FF6600" />
                  {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
              </div>

              <div className="cal-controls-right">
                <div className="cal-search-box">
                  <Search size={15} className="cal-search-icon" />
                  <input 
                    type="text"
                    placeholder="Buscar servicio..."
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

            {/* Grid Mes o Agenda */}
            <div className="scheduler-canvas-card">
              {loading ? (
                <div className="cal-loading-container">
                  <div className="cal-spinner"></div>
                  <p>Cargando calendario...</p>
                </div>
              ) : currentView === 'month' ? (
                <div className="cal-month-grid">
                  <div className="cal-month-header-row">
                    {DAY_NAMES_FULL.map((name, index) => (
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
                                <span className="chip-time-tag"><Clock size={10} /> {job.calendarTime}</span>
                              </div>
                              <span className="chip-title">{job.titulo}</span>
                              <span className="chip-tech"><User size={9} /> {job.assigned_tech_name || (job.cotizaciones > 0 ? `${job.cotizaciones} oferta(s)` : 'En espera')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="cal-agenda-view">
                  {agendaGroupedEvents.map((group, gIdx) => (
                    <div key={gIdx} className="agenda-day-group">
                      <div className="agenda-date-header">
                        <CalendarDays size={18} color="#FF6600" />
                        {group.dateStr}
                      </div>

                      <div className="agenda-cards-grid">
                        {group.items.map((job) => (
                          <div key={job.id} className={`agenda-item-card status-${job.statusType}`} onClick={() => handleOpenQuotesModal(job)}>
                            <div className="agenda-card-top">
                              <h4 className="agenda-card-title">{job.titulo}</h4>
                              <span className={`agenda-status-pill pill-${job.statusType}`}>{job.statusLabel}</span>
                            </div>
                            <div className="agenda-card-info">
                              <div>⏰ {job.calendarTime}</div>
                              <div>📍 {job.zona}</div>
                              <div>🧑‍🔧 {job.assigned_tech_name || `${job.cotizaciones} oferta(s)`}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Lateral */}
          <div className="cal-sidebar-col">
            <div>
              <div className="sidebar-section-title"><span>📅 Calendario Rápido</span></div>
              <div className="mini-cal-card">
                <div className="mini-cal-nav">
                  <span className="mini-cal-title">{MONTH_NAMES[miniCalDate.getMonth()]} {miniCalDate.getFullYear()}</span>
                  <div className="mini-cal-arrows">
                    <button className="mini-cal-arrow-btn" onClick={handleMiniPrev} title="Mes anterior" aria-label="Mes anterior">
                      <ChevronLeft size={16} color="#FFFFFF" strokeWidth={2.6} />
                    </button>
                    <button className="mini-cal-arrow-btn" onClick={handleMiniNext} title="Mes siguiente" aria-label="Mes siguiente">
                      <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.6} />
                    </button>
                  </div>
                </div>
                <div className="mini-cal-grid">
                  {DAY_NAMES_MINI.map((d, i) => (<div key={i} className="mini-cal-day-header">{d}</div>))}
                  {miniCalMatrix.map((cell, idx) => (
                    <button key={idx} className={`mini-cal-day-btn ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''} ${cell.hasEvents ? 'has-events' : ''}`}>
                      {cell.dayNum}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {upNextJob && (
              <div>
                <div className="sidebar-section-title"><span>⚡ Próximo Servicio</span></div>
                <div className="up-next-card">
                  <span className="up-next-pill">PRÓXIMA CITA</span>
                  <h4 className="up-next-title">{upNextJob.titulo}</h4>
                  <div className="up-next-details">
                    <div>📍 {upNextJob.zona}</div>
                    <div>🧑‍🔧 {upNextJob.assigned_tech_name || 'Técnico de la Red'}</div>
                  </div>
                  <button className="btn-up-next-action" onClick={() => handleOpenQuotesModal(upNextJob)}>
                    <MessageCircle size={15} /> Ver Cotizaciones
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Reciclado */}
      {showQuotesModal && selectedJobForQuotes && (
        <div className="mercado-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowQuotesModal(false)}>
          <div className="mercado-premium-modal" style={{ maxWidth: '1080px' }}>
            <div className="mercado-premium-header">
              <h2>📋 Detalle de Publicación y Cotizaciones</h2>
              <span className="mercado-modal-close" onClick={() => setShowQuotesModal(false)}>×</span>
            </div>
            <div className="mercado-premium-body">
              <div className="mercado-premium-details" style={{ flex: '1.05' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>{selectedJobForQuotes.titulo}</h3>
                <p>{selectedJobForQuotes.descripcion}</p>
                <div>📍 {selectedJobForQuotes.zona} - {selectedJobForQuotes.calle}</div>
              </div>
              <div className="mercado-premium-form" style={{ background: '#ffffff', padding: '20px' }}>
                {/* Banner de Cancelación por el Técnico */}
                {(selectedJobForQuotes.cancelled_by_tech || selectedJobForQuotes.status === 'Cancelado_Tecnico') && (
                  <div style={{
                    marginBottom: '18px',
                    padding: '16px',
                    background: 'linear-gradient(145deg, #fef2f2, #fff1f2)',
                    borderRadius: '16px',
                    border: '2px solid #fecaca',
                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ef4444',
                        flexShrink: 0
                      }}>
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: '800', color: '#991b1b' }}>
                          ⚠️ El técnico canceló este servicio
                        </h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: '#7f1d1d', lineHeight: '1.4' }}>
                          {selectedJobForQuotes.cancellation_reason 
                            ? `Motivo: "${selectedJobForQuotes.cancellation_reason}"` 
                            : 'El técnico notificó que no asistirá a la visita acordada.'}
                        </p>
                      </div>
                    </div>

                    {/* 1. Paso 1: Encuesta de 5 Relojes */}
                    <button
                      type="button"
                      onClick={() => {
                        const tech = selectedJobForQuotes.cancelled_technician || selectedJobForQuotes.tecnico || {
                          id: selectedJobForQuotes.cancelled_technician_id || selectedJobForQuotes.tecnico_id,
                          name: selectedJobForQuotes.assigned_tech_name || 'Técnico Asignado'
                        };
                        setRatingTargetTech(tech);
                        setRatingTargetJob(selectedJobForQuotes);
                        setShowRatingModal(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                        marginBottom: '10px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Clock size={16} />
                      <span>⏱️ Calificar Puntualidad del Técnico (5 Relojes)</span>
                    </button>

                    {/* 2. Paso 2: Opciones de Resolución */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteJob(selectedJobForQuotes.id)}
                        style={{
                          padding: '9px 12px',
                          background: '#ffffff',
                          color: '#dc2626',
                          border: '1.5px solid #fca5a5',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Borrar Servicio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReopenJobInNetwork(selectedJobForQuotes)}
                        style={{
                          padding: '9px 12px',
                          background: 'linear-gradient(135deg, #f26522, #ea580c)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(242, 101, 34, 0.35)'
                        }}
                      >
                        <Send size={14} />
                        <span>🌐 Enviar a la Red</span>
                      </button>
                    </div>
                  </div>
                )}

                <h4>Cotizaciones ({selectedJobForQuotes.cotizaciones_list?.length || 0})</h4>
                {selectedJobForQuotes.cotizaciones_list?.map((quote) => (
                  <div key={quote.id} className="red-quote-card" style={{ marginBottom: '10px' }}>
                    <div className="red-quote-header">
                      <strong>{quote.technicianName}</strong>
                      <span>${quote.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mercado-premium-footer" style={{ padding: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="mercado-btn-cancel" onClick={() => setShowQuotesModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showNewServiceModal && (
        <ModalServicioAutonomo 
          onClose={() => setShowNewServiceModal(false)}
          onSuccess={() => {
            setShowNewServiceModal(false);
            fetchJobs();
          }}
        />
      )}

      {/* Modal Calificar Técnico */}
      {showRatingModal && ratingTargetTech && (
        <ModalCalificarTecnico
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setRatingTargetTech(null);
            setRatingTargetJob(null);
          }}
          technician={ratingTargetTech}
          workOrderId={ratingTargetJob?.id}
          serviceId={ratingTargetJob?.service_id}
          scheduledAt={ratingTargetJob?.scheduled_at}
          arrivedAt={ratingTargetJob?.arrived_at}
          onlyTime={Boolean(ratingTargetJob?.cancelled_by_tech || ratingTargetJob?.status === 'Cancelado_Tecnico')}
          isCancellation={Boolean(ratingTargetJob?.cancelled_by_tech || ratingTargetJob?.status === 'Cancelado_Tecnico')}
          cancellationReason={ratingTargetJob?.cancellation_reason || ''}
          onSuccess={() => {
            fetchJobs();
          }}
        />
      )}
    </div>
  );
};

export default CalendarioCliente;
