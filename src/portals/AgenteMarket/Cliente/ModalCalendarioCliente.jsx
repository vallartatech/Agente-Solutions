import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
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
  Sparkles,
  ArrowRight,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Star
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

const ModalCalendarioCliente = ({ isOpen, onClose, onSelectJob }) => {
  const { user } = useAuth();

  // Roles de Técnico / Contratista / Admin
  const isTechnician = Boolean(user && [0, 1, 2, 6, 8].includes(Number(user.role_id)));

  // Estados del Calendario
  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalDate, setMiniCalDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month'); // 'month' | 'week' | 'agenda'
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'overdue' | 'today' | 'future' | 'uncoordinated' | 'confirmed' | 'proposed' | 'network'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [networkJobs, setNetworkJobs] = useState([]);

  // Estados del Modal Reciclado de Detalle de Publicación y Cotizaciones
  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [mobileModalTab, setMobileModalTab] = useState('quotes'); // 'details' | 'quotes'
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

  // Estados de Chat de Cliente
  const [clientChatInput, setClientChatInput] = useState('');
  const [sendingClientChat, setSendingClientChat] = useState(false);
  const chatEndRef = useRef(null);

  // Helper para agrupar cotizaciones por técnico
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

  const processOrderToEvent = (order, isAcceptedDirect = false) => {
    const userFullName = user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name) : '';
    
    const coloniaTexto = order.colonia_cercana || order.zona_colonia || order.zona || order.zone || 'Mérida, Yucatán';
    const tituloProblema = order.titulo || (order.type 
      ? `${order.type}${order.equipment ? ' - ' + order.equipment : ''}` 
      : 'Problema / Servicio Solicitado');

    const fotos = (order.fotos && order.fotos.length > 0)
      ? order.fotos 
      : [order.evidence_path, order.evidence_path_2, order.property?.facade_photo_path, order.foto].filter(Boolean);

    const groupedQuotes = order.cotizaciones_list || groupQuotesByTechnician(order.network_quotes || [], order);
    const acceptedQuote = order.myQuote || groupedQuotes.find(q => q.status === 'accepted' || q.is_assigned) || null;

    const isAccepted = Boolean(
      isAcceptedDirect ||
      order.is_accepted ||
      order.status === 'Asignado' ||
      order.status === 'En Progreso' ||
      order.status === 'Terminado' ||
      acceptedQuote ||
      (order.tecnico_id && Number(order.tecnico_id) === Number(user?.id))
    );

    const isGenericOwner = !order.owner_name || 
      order.owner_name === 'Cliente de la Red' || 
      order.owner_name === 'Cliente Desconocido' || 
      order.owner_name === 'Cliente de Prueba';

    const clientName = order.client_name || (!isGenericOwner ? order.owner_name : (order.property?.client?.name || (isTechnician ? 'Cliente' : (userFullName || 'Mi Solicitud'))));
    const assignedTechName = order.assigned_tech_name || acceptedQuote?.technicianName || (order.technician ? `${order.technician.first_name} ${order.technician.last_name || ''}`.trim() : null);
    const agreedPrice = order.agreed_price ? parseFloat(order.agreed_price) : (acceptedQuote?.price ? parseFloat(acceptedQuote.price) : 0);

    // Fecha y hora
    const rawScheduledAt = order.scheduled_at || order.fecha_visita || null;
    const hasScheduledDate = Boolean(rawScheduledAt);

    let eventDate = rawScheduledAt ? new Date(rawScheduledAt) : (order.created_at ? new Date(order.created_at) : new Date());
    if (isNaN(eventDate.getTime())) eventDate = new Date();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayDateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
    const isToday = dateKey === todayDateKey || (hasScheduledDate && eventDate >= todayStart && eventDate <= todayEnd);

    let timeFormatted = 'Por coordinar';
    let hourIndex = 10;
    if (hasScheduledDate) {
      try {
        timeFormatted = eventDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        hourIndex = eventDate.getHours();
      } catch {
        timeFormatted = '10:00 a.m.';
      }
    } else if (order.hora_visita) {
      timeFormatted = order.hora_visita;
    }

    const isCompleted = order.status === 'Terminado' || order.status === 'Listo' || order.status === 'Finalizado';

    // Timing classification
    let timingCategory = 'uncoordinated'; // 'overdue' | 'today' | 'future' | 'uncoordinated' | 'completed' | 'network'
    let timingBadge = '⏳ Por Coordinar';
    let timingRelative = 'Sin fecha agendada';
    let statusType = 'uncoordinated';
    let statusLabel = 'Horario Por Coordinar';

    if (isCompleted) {
      timingCategory = 'completed';
      timingBadge = '✓ Finalizado';
      timingRelative = 'Trabajo Concluido';
      statusType = 'completed';
      statusLabel = 'Trabajo Terminado';
    } else if (!hasScheduledDate) {
      if (!isAccepted && !isTechnician) {
        timingCategory = 'network';
        timingBadge = '🌐 En Red';
        timingRelative = 'Cotizaciones abiertas';
        statusType = 'network';
        statusLabel = 'En Red / Cotizando';
      } else {
        timingCategory = 'uncoordinated';
        timingBadge = '⏳ Por Coordinar';
        timingRelative = 'Coordinación pendiente';
        statusType = 'uncoordinated';
        statusLabel = '⏳ Horario Por Coordinar';
      }
    } else if (eventDate < todayStart) {
      const diffMs = todayStart.getTime() - eventDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const relStr = diffDays === 1 ? 'Ayer' : `Hace ${diffDays} días`;
      timingCategory = 'overdue';
      timingBadge = `🚨 Atrasado (${relStr})`;
      timingRelative = `Atrasado ${diffDays === 1 ? 'desde ayer' : `hace ${diffDays} días`} (${timeFormatted})`;
      statusType = 'overdue';
      statusLabel = `⚠️ Cita Atrasada (${relStr})`;
    } else if (isToday) {
      timingCategory = 'today';
      timingBadge = `⚡ Cita Hoy (${timeFormatted})`;
      timingRelative = `Hoy a las ${timeFormatted}`;
      statusType = 'today';
      statusLabel = `⚡ Cita Programada para Hoy`;
    } else {
      // Future
      const diffMs = eventDate.getTime() - todayEnd.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const relStr = diffDays === 1 ? 'Mañana' : `En ${diffDays} días`;
      timingCategory = 'future';
      timingBadge = `📅 ${relStr} (${timeFormatted})`;
      timingRelative = `${diffDays === 1 ? 'Mañana' : `En ${diffDays} días`} (${timeFormatted})`;
      statusType = 'future';
      statusLabel = `📅 Cita Futura (${relStr})`;
    }

    const timingHumanFull = hasScheduledDate 
      ? eventDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + `, ${timeFormatted}`
      : 'Pendiente de coordinar horario';

    const sched = getJobScheduleStatus({ ...order, cotizaciones_list: groupedQuotes }, acceptedQuote);
    const hasNewTechMessage = groupedQuotes.some(q => q.hasNewTechMessage);
    const lastTechMsg = groupedQuotes.find(q => q.hasNewTechMessage)?.lastMsg || null;

    return {
      ...order,
      id: order.id,
      titulo: tituloProblema,
      tipo: order.type || 'Problema',
      equipo: order.equipment || '',
      presupuesto: agreedPrice > 0 ? `$${agreedPrice.toFixed(2)}` : 'A convenir',
      estado: isAccepted ? (isCompleted ? 'Terminado' : 'Asignado') : (order.status || 'Por Hacer'),
      is_accepted: isAccepted,
      assigned_tech_name: assignedTechName,
      agreed_price: agreedPrice,
      fecha: new Date(order.created_at || Date.now()).toLocaleDateString('es-MX'),
      lugar: order.property_name || order.property?.name || order.property?.property_name || 'Lugar no especificado',
      zona: coloniaTexto,
      colonia: coloniaTexto,
      calle: order.full_address || order.property?.address || 'Dirección confirmada',
      descripcion: limpiarDescripcion(order.description),
      foto: fotos[0] || null,
      fotos: fotos,
      cotizaciones: groupedQuotes.length,
      cotizaciones_list: groupedQuotes,
      cliente: clientName,
      client_name: clientName,
      client_phone: order.client_phone || order.property?.client?.phone || '',
      client_email: order.client_email || order.property?.client?.email || '',
      is_mine: true,
      scheduled_at: rawScheduledAt,
      hasNewTechMessage,
      lastTechMsg,
      // Propiedades de calendario
      calendarDate: eventDate,
      dateKey,
      calendarTime: timeFormatted,
      hourIndex,
      dayOfWeek: eventDate.getDay(),
      timingCategory,
      timingBadge,
      timingRelative,
      timingHumanFull,
      statusType,
      statusLabel,
      isOverdue: timingCategory === 'overdue',
      isToday: timingCategory === 'today',
      isFuture: timingCategory === 'future',
      isUncoordinated: timingCategory === 'uncoordinated',
      isCompleted: timingCategory === 'completed',
    };
  };

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoint = isTechnician 
        ? `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos`
        : `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos?only_mine=1`;

      const res = await axios.get(endpoint, { headers });
      
      if (res.data?.success) {
        const rawAccepted = Array.isArray(res.data.accepted_jobs) ? res.data.accepted_jobs : [];
        const rawData = Array.isArray(res.data.data) ? res.data.data : [];

        const jobMap = new Map();

        // 1. Priorizar trabajos aceptados del técnico
        rawAccepted.forEach(order => {
          const processed = processOrderToEvent(order, true);
          jobMap.set(processed.id, processed);
        });

        // 2. Procesar solicitudes de la red o del cliente
        rawData.forEach(order => {
          if (!jobMap.has(order.id)) {
            const processed = processOrderToEvent(order, false);
            jobMap.set(processed.id, processed);
          }
        });

        const jobs = Array.from(jobMap.values());
        setNetworkJobs(jobs);

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
      console.error("Error fetching jobs in modal calendar", e);
    } finally {
      setLoading(false);
    }
  };

  const checkPendingCancellations = async () => {
    try {
      if (isTechnician) return;
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/client/pending-cancellations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success && res.data?.cancellations?.length > 0) {
        const unhandled = res.data.cancellations.filter(c => {
          const cKey = 'dismissed_cancellation_' + c.cancellation_id;
          const woKey = 'dismissed_cancellation_wo_' + c.work_order_id;
          return !localStorage.getItem(cKey) && !sessionStorage.getItem(cKey) && !localStorage.getItem(woKey) && !sessionStorage.getItem(woKey);
        });
        if (unhandled.length > 0) {
          const first = unhandled[0];
          localStorage.setItem('dismissed_cancellation_' + first.cancellation_id, '1');
          if (first.work_order_id) localStorage.setItem('dismissed_cancellation_wo_' + first.work_order_id, '1');
          sessionStorage.setItem('dismissed_cancellation_' + first.cancellation_id, '1');
          if (first.work_order_id) sessionStorage.setItem('dismissed_cancellation_wo_' + first.work_order_id, '1');

          setRatingTargetTech(first.technician);
          setRatingTargetJob({
            id: first.work_order_id,
            cancellation_id: first.cancellation_id,
            titulo: first.work_order_title,
            cancelled_by_tech: true,
            cancellation_reason: first.reason
          });
          setShowRatingModal(true);
        }
      }
    } catch (e) {
      console.warn("Error checking pending cancellations in calendar:", e);
    }
  };

  const handleCloseRatingModal = async () => {
    if (ratingTargetJob) {
      const cId = ratingTargetJob.cancellation_id;
      const woId = ratingTargetJob.id;
      if (cId) localStorage.setItem('dismissed_cancellation_' + cId, '1');
      if (woId) localStorage.setItem('dismissed_cancellation_wo_' + woId, '1');
      if (cId) sessionStorage.setItem('dismissed_cancellation_' + cId, '1');
      if (woId) sessionStorage.setItem('dismissed_cancellation_wo_' + woId, '1');

      try {
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        if (token && cId) {
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/client/dismiss-cancellation/${cId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch {}
    }
    setShowRatingModal(false);
    setRatingTargetTech(null);
    setRatingTargetJob(null);
  };

  useEffect(() => {
    if (isOpen) {
      fetchJobs();
      checkPendingCancellations();
      const interval = setInterval(() => {
        fetchJobs();
        checkPendingCancellations();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!showQuotesModal || !activeChatQuote?.id) return;

    const pollLiveChat = async () => {
      try {
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${activeChatQuote.id}/chat`, { headers });
        if (res.data?.success && res.data.chat_history) {
          setActiveChatQuote(prev => {
            if (!prev) return prev;
            if (prev.chat_history?.length !== res.data.chat_history.length) {
              return { ...prev, chat_history: res.data.chat_history };
            }
            return prev;
          });
        }
      } catch (e) {}
    };

    const chatInterval = setInterval(pollLiveChat, 1500);
    return () => clearInterval(chatInterval);
  }, [showQuotesModal, activeChatQuote?.id]);

  useEffect(() => {
    if (activeChatQuote) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatQuote?.chat_history]);

  const handleOpenQuotesModal = (job) => {
    setSelectedJobForQuotes(job);
    setActivePhoto(job.fotos?.[0] || job.foto || null);
    setActiveChatQuote(null);
    setMobileModalTab((job.cotizaciones_list && job.cotizaciones_list.length > 0) ? 'quotes' : 'details');
    setShowQuotesModal(true);
  };

  const handleEventClick = (job) => {
    if (onSelectJob) {
      onSelectJob(job);
      return;
    }
    handleOpenQuotesModal(job);
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
      sender_role: isTechnician ? 'Técnico' : 'Cliente',
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
      console.error("Error enviando mensaje", err);
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
        alert("✅ Publicación eliminada con éxito.");
        setShowQuotesModal(false);
        setActiveChatQuote(null);
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
        setActiveChatQuote(null);
        fetchJobs();
      }
    } catch (e) {
      console.error("Error reenviando solicitud a la red:", e);
      alert(e.response?.data?.message || "Hubo un error al reenviar la solicitud a la red.");
    }
  };

  // Filtrado de eventos con todos los criterios de tiempo y búsqueda
  const filteredEvents = useMemo(() => {
    return networkJobs.filter(job => {
      let matchFilter = false;
      if (selectedFilter === 'all') {
        matchFilter = true;
      } else if (selectedFilter === 'overdue') {
        matchFilter = job.timingCategory === 'overdue';
      } else if (selectedFilter === 'today') {
        matchFilter = job.timingCategory === 'today';
      } else if (selectedFilter === 'future') {
        matchFilter = job.timingCategory === 'future';
      } else if (selectedFilter === 'uncoordinated') {
        matchFilter = job.timingCategory === 'uncoordinated';
      } else if (selectedFilter === 'completed') {
        matchFilter = job.timingCategory === 'completed';
      } else if (selectedFilter === 'confirmed') {
        matchFilter = job.statusType === 'confirmed' || job.is_accepted;
      } else if (selectedFilter === 'proposed') {
        matchFilter = job.statusType === 'proposed' || Boolean(job.scheduled_at);
      } else if (selectedFilter === 'network') {
        matchFilter = job.statusType === 'network';
      }

      const matchSearch = searchQuery.trim() === '' ||
        job.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.zona.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.lugar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.cliente && job.cliente.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (job.assigned_tech_name && job.assigned_tech_name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchFilter && matchSearch;
    });
  }, [networkJobs, selectedFilter, searchQuery]);

  // Contadores dinámicos
  const countAll = networkJobs.length;
  const countOverdue = networkJobs.filter(j => j.timingCategory === 'overdue').length;
  const countToday = networkJobs.filter(j => j.timingCategory === 'today').length;
  const countFuture = networkJobs.filter(j => j.timingCategory === 'future').length;
  const countUncoordinated = networkJobs.filter(j => j.timingCategory === 'uncoordinated').length;
  const countConfirmed = networkJobs.filter(j => j.statusType === 'confirmed' || j.is_accepted).length;
  const countNetwork = networkJobs.filter(j => j.statusType === 'network').length;

  // Próxima cita destacada ("Up Next") - Prioriza atrasadas > hoy > futuras
  const upNextJob = useMemo(() => {
    if (networkJobs.length === 0) return null;
    const overdue = networkJobs.filter(j => j.timingCategory === 'overdue');
    if (overdue.length > 0) return overdue[0];
    const today = networkJobs.filter(j => j.timingCategory === 'today');
    if (today.length > 0) return today[0];
    const future = networkJobs.filter(j => j.timingCategory === 'future').sort((a, b) => a.calendarDate - b.calendarDate);
    if (future.length > 0) return future[0];
    const accepted = networkJobs.filter(j => j.is_accepted);
    if (accepted.length > 0) return accepted[0];
    return networkJobs[0];
  }, [networkJobs]);

  // Navegación de mes principal
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => {
    const t = new Date();
    setCurrentDate(t);
    setMiniCalDate(t);
  };

  // Navegación de mini calendario
  const handleMiniPrev = () => setMiniCalDate(new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() - 1, 1));
  const handleMiniNext = () => setMiniCalDate(new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() + 1, 1));

  // Matriz de días del mes principal
  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cells = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
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
      const dateKey = `${thisDate.getFullYear()}-${String(thisDate.getMonth() + 1).padStart(2, '0')}-${String(thisDate.getDate()).padStart(2, '0')}`;
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
      const dateKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
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

  // Matriz de días del mini calendario
  const miniCalMatrix = useMemo(() => {
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cells = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  // Días de la semana seleccionada para la Vista Semanal
  const weekDaysList = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0: Dom
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        dayIndex: i,
        dayName: DAY_NAMES_MINI[i],
        dayNumber: d.getDate(),
        dateKey,
        isToday: dateKey === todayStr
      });
    }
    return days;
  }, [currentDate]);

  // Agrupar eventos para la vista de Agenda
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

  if (!isOpen) return null;

  return (
    <div className="cal-modal-backdrop" onClick={onClose}>
      <div 
        className="modal-calendario-window" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── ENCABEZADO DEL MODAL ── */}
        <div className="modal-cal-topbar">
          <div className="modal-cal-title-wrapper">
            <div className="modal-cal-icon-circle">
              <CalendarIcon size={22} color="#FFFFFF" />
            </div>
            <div className="modal-cal-title-text-box">
              <h2 className="modal-cal-title">
                CALENDARIO <span className="modal-cal-title-extra">DE <span style={{ color: '#FF6600' }}>VISITAS Y SERVICIOS</span></span>
              </h2>
              <span className="modal-cal-subtext">
                Gestión interactiva de citas coordinadas, servicios en red y cotizaciones con técnicos.
              </span>
            </div>
          </div>

          <div className="modal-cal-actions">
            <button 
              className="btn-modal-quick-new"
              onClick={() => setShowNewServiceModal(true)}
              title="Publicar nuevo servicio"
            >
              <PlusCircle size={17} />
              <span className="btn-modal-quick-new-text">Publicar Servicio</span>
            </button>
            <button 
              className="btn-modal-close-window" 
              onClick={onClose} 
              title="Cerrar ventana (Esc)"
              aria-label="Cerrar ventana"
            >
              <X size={20} color="#FFFFFF" strokeWidth={2.8} />
            </button>
          </div>
        </div>

        {/* ── CUERPO PRINCIPAL CON 2 COLUMNAS (Estilo calendaroptions.com) ── */}
        <div className="modal-cal-content-body">
          
          {/* COLUMNA IZQUIERDA: SCHEDULER & VISTAS */}
          <div className="cal-main-col">
            
            {/* Toolbar Superior */}
            <div className="scheduler-toolbar-card">
              <div className="cal-nav-group">
                <button className="btn-cal-today" onClick={handleToday}>
                  Hoy
                </button>

                <div className="cal-arrows">
                  <button className="btn-cal-arrow" onClick={handlePrevMonth} title="Mes anterior">
                    <ChevronLeft size={18} />
                  </button>
                  <button className="btn-cal-arrow" onClick={handleNextMonth} title="Mes siguiente">
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
                    placeholder="Buscar servicio o cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'absolute', right: '8px', color: '#94a3b8' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="cal-view-selector">
                  <button 
                    className={`btn-view-tab ${currentView === 'month' ? 'active' : ''}`}
                    onClick={() => setCurrentView('month')}
                  >
                    Mes
                  </button>
                  <button 
                    className={`btn-view-tab ${currentView === 'week' ? 'active' : ''}`}
                    onClick={() => setCurrentView('week')}
                  >
                    Semana
                  </button>
                  <button 
                    className={`btn-view-tab ${currentView === 'agenda' ? 'active' : ''}`}
                    onClick={() => setCurrentView('agenda')}
                  >
                    Agenda
                  </button>
                </div>
              </div>
            </div>

            {/* Barra de Filtros y Leyenda */}
            <div className="scheduler-legend-bar">
              <span style={{ color: '#94a3b8', fontWeight: 800 }}>Filtrar:</span>
              <button 
                className={`legend-item ${selectedFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('all')}
              >
                Todos ({countAll})
              </button>

              <button 
                className={`legend-item legend-overdue ${selectedFilter === 'overdue' ? 'active' : ''} ${countOverdue > 0 ? 'has-overdue' : ''}`}
                onClick={() => setSelectedFilter(selectedFilter === 'overdue' ? 'all' : 'overdue')}
                title="Citas cuya fecha programada ya pasó y no han concluido"
              >
                <span className="legend-dot dot-overdue"></span>
                <span>🚨 Atrasados {countOverdue > 0 ? `(${countOverdue})` : '(0)'}</span>
              </button>

              <button 
                className={`legend-item legend-today ${selectedFilter === 'today' ? 'active' : ''} ${countToday > 0 ? 'has-today' : ''}`}
                onClick={() => setSelectedFilter(selectedFilter === 'today' ? 'all' : 'today')}
                title="Citas programadas para el día de hoy"
              >
                <span className="legend-dot dot-today"></span>
                <span>⚡ Citas Hoy {countToday > 0 ? `(${countToday})` : '(0)'}</span>
              </button>

              <button 
                className={`legend-item legend-future ${selectedFilter === 'future' ? 'active' : ''}`}
                onClick={() => setSelectedFilter(selectedFilter === 'future' ? 'all' : 'future')}
                title="Citas agendadas para días futuros"
              >
                <span className="legend-dot dot-future"></span>
                <span>📅 Próximos / Futuros {countFuture > 0 ? `(${countFuture})` : '(0)'}</span>
              </button>

              <button 
                className={`legend-item legend-uncoordinated ${selectedFilter === 'uncoordinated' ? 'active' : ''}`}
                onClick={() => setSelectedFilter(selectedFilter === 'uncoordinated' ? 'all' : 'uncoordinated')}
                title="Trabajos asignados sin fecha definida"
              >
                <span className="legend-dot dot-uncoordinated"></span>
                <span>⏳ Por Coordinar {countUncoordinated > 0 ? `(${countUncoordinated})` : '(0)'}</span>
              </button>

              {countNetwork > 0 && (
                <button 
                  className={`legend-item ${selectedFilter === 'network' ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(selectedFilter === 'network' ? 'all' : 'network')}
                >
                  <span className="legend-dot dot-network"></span>
                  <span>🌐 En Red ({countNetwork})</span>
                </button>
              )}
            </div>

            {/* Contenedor del Calendario */}
            <div className="scheduler-canvas-card">
              {loading ? (
                <div className="cal-loading-container">
                  <div className="cal-spinner"></div>
                  <p style={{ fontWeight: 700 }}>Cargando agenda de servicios...</p>
                </div>
              ) : currentView === 'month' ? (
                /* ── VISTA MENSUAL ── */
                <div className="cal-month-grid">
                  <div className="cal-month-header-row">
                    {DAY_NAMES_FULL.map((name, index) => (
                      <div key={index} className="cal-header-cell">
                        <span className="cal-header-day-full">{name}</span>
                        <span className="cal-header-day-short">{name.substring(0, 3)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="cal-month-days-grid">
                    {monthMatrix.map((cell, idx) => (
                      <div 
                        key={idx} 
                        className={`cal-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''}`}
                      >
                        <div className="cal-day-header">
                          <span className="cal-day-number">{cell.dayNumber}</span>
                          {cell.events.length > 0 && (
                            <span className="cal-day-count-badge">
                              {cell.events.length}
                            </span>
                          )}
                        </div>

                        <div className="cal-events-list">
                          {cell.events.map((job) => (
                            <div 
                              key={job.id}
                              className={`cal-event-chip status-${job.statusType} timing-${job.timingCategory}`}
                              onClick={() => handleEventClick(job)}
                              title={`${job.titulo}\n${job.timingBadge}\nHorario: ${job.calendarTime}\nCliente: ${job.cliente}\nDirección: ${job.calle || job.zona}\n(Clic para abrir todos los detalles)`}
                            >
                              <div className="chip-compact-row">
                                {job.timingCategory === 'overdue' && <span className="chip-mini-dot dot-overdue"></span>}
                                {job.timingCategory === 'today' && <span className="chip-mini-dot dot-today"></span>}
                                {job.timingCategory === 'future' && <span className="chip-mini-dot dot-future"></span>}
                                {job.timingCategory === 'uncoordinated' && <span className="chip-mini-dot dot-uncoordinated"></span>}
                                {job.timingCategory === 'completed' && <span className="chip-mini-dot dot-confirmed"></span>}

                                <span className="chip-compact-time">
                                  {job.calendarTime !== 'Por coordinar' ? job.calendarTime : '⏳'}
                                </span>
                                <span className="chip-compact-title">
                                  {job.titulo}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : currentView === 'week' ? (
                /* ── VISTA SEMANAL CON HORAS (Estilo calendaroptions.com) ── */
                <div className="cal-week-view-wrapper">
                  <div className="cal-week-header-row">
                    <div className="cal-header-cell" style={{ width: '60px' }}>HORA</div>
                    {weekDaysList.map((d, i) => (
                      <div key={i} className={`cal-week-day-header ${d.isToday ? 'is-today' : ''}`}>
                        <div className="cal-week-day-name">{d.dayName}</div>
                        <div className="cal-week-day-number">{d.dayNumber}</div>
                      </div>
                    ))}
                  </div>

                  <div className="cal-week-grid-body">
                    {HOURS_LIST.map((hourLabel, hIdx) => {
                      const hourNum = 8 + hIdx; // 8, 9, 10...
                      return (
                        <React.Fragment key={hIdx}>
                          <div className="cal-week-time-label">{hourLabel}</div>
                          {weekDaysList.map((d, dIdx) => {
                            const matchingEvents = filteredEvents.filter(
                              e => e.dateKey === d.dateKey && (e.hourIndex === hourNum || (!e.scheduled_at && hIdx === 2))
                            );
                            return (
                              <div key={dIdx} className="cal-week-slot-cell">
                                {matchingEvents.map(job => (
                                  <div 
                                    key={job.id}
                                    className={`week-event-card status-${job.statusType} timing-${job.timingCategory}`}
                                    onClick={() => handleEventClick(job)}
                                  >
                                    <div style={{ fontWeight: 800, fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <Clock size={10} /> {job.calendarTime}
                                      {job.timingCategory === 'overdue' && <span style={{ color: '#fca5a5' }}>[🚨 Atrasado]</span>}
                                    </div>
                                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {job.titulo}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ── VISTA DE AGENDA REDISEÑADA (ESTILO MODERNO PRO) ── */
                <div className="cal-agenda-view">
                  {agendaGroupedEvents.length === 0 ? (
                    <div className="cal-empty-state">
                      <CalendarDays size={44} color="#64748b" />
                      <h4>No hay servicios en esta fecha</h4>
                      <p>Publica una solicitud para que los técnicos puedan enviarte cotizaciones y coordinar citas.</p>
                    </div>
                  ) : (
                    agendaGroupedEvents.map((group, gIdx) => (
                      <div key={gIdx} className="agenda-day-group">
                        <div className="agenda-date-header">
                          <CalendarDays size={18} color="#FF6600" />
                          {group.dateStr}
                        </div>

                        <div className="agenda-cards-grid">
                          {group.items.map((job) => (
                            <div 
                              key={job.id}
                              className={`agenda-item-card status-${job.statusType} timing-${job.timingCategory}`}
                              onClick={() => handleEventClick(job)}
                            >
                              <div className="agenda-card-top">
                                <div>
                                  <h4 className="agenda-card-title">{job.titulo}</h4>
                                  <span className="agenda-card-subtitle">{job.equipo ? `Equipo: ${job.equipo}` : job.tipo}</span>
                                </div>
                                <span className={`agenda-status-pill pill-${job.statusType} pill-timing-${job.timingCategory}`}>
                                  {job.timingBadge}
                                </span>
                              </div>

                              <div className="agenda-card-info">
                                <div className="agenda-info-row">
                                  <Clock size={13} color={job.timingCategory === 'overdue' ? '#ef4444' : '#ff6600'} />
                                  <strong>Horario:</strong> <span style={{ color: job.timingCategory === 'overdue' ? '#fca5a5' : '#ffffff', fontWeight: 700 }}>{job.calendarTime} ({job.timingRelative})</span>
                                </div>
                                <div className="agenda-info-row">
                                  <MapPin size={13} color="#94a3b8" />
                                  <span>{job.calle || job.zona}</span>
                                </div>
                                <div className="agenda-info-row">
                                  <User size={13} color="#94a3b8" />
                                  <span>Cliente: <strong>{job.cliente}</strong></span>
                                </div>
                                {job.agreed_price > 0 && (
                                  <div className="agenda-info-row">
                                    <DollarSign size={13} color="#4ade80" />
                                    <strong style={{ color: '#4ade80' }}>Presupuesto:</strong> <span style={{ color: '#4ade80', fontWeight: 800 }}>${parseFloat(job.agreed_price).toFixed(2)} MXN</span>
                                  </div>
                                )}
                              </div>

                              <div className="agenda-card-actions">
                                <button 
                                  className="btn-modal-action primary"
                                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(job);
                                  }}
                                >
                                  <span>Abrir Trabajo / Coordinar</span>
                                  <ArrowRight size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: SIDEBAR CON MINI CALENDARIO & UP NEXT */}
          <div className="cal-sidebar-col">
            
            {/* 1. Mini Calendario */}
            <div>
              <div className="sidebar-section-title">
                <span>📅 Calendario Rápido</span>
              </div>
              <div className="mini-cal-card">
                <div className="mini-cal-nav">
                  <span className="mini-cal-title">
                    {MONTH_NAMES[miniCalDate.getMonth()]} {miniCalDate.getFullYear()}
                  </span>
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
                  {DAY_NAMES_MINI.map((d, i) => (
                    <div key={i} className="mini-cal-day-header">{d}</div>
                  ))}
                  {miniCalMatrix.map((cell, idx) => (
                    <button
                      key={idx}
                      className={`mini-cal-day-btn ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''} ${cell.hasEvents ? 'has-events' : ''}`}
                      onClick={() => {
                        const target = new Date(cell.dateKey + 'T12:00:00');
                        setCurrentDate(target);
                        setMiniCalDate(target);
                      }}
                      title={cell.hasEvents ? 'Tiene servicios programados' : ''}
                    >
                      {cell.dayNum}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Tarjeta "Up Next / Próximo Servicio" */}
            <div>
              <div className="sidebar-section-title">
                <span>⚡ Próximo Servicio</span>
              </div>
              {upNextJob ? (
                <div className={`up-next-card ${upNextJob.timingCategory === 'overdue' ? 'is-overdue-alert' : ''}`}>
                  <div className="up-next-badge-row">
                    <span className={`up-next-pill ${upNextJob.timingCategory === 'overdue' ? 'pill-overdue-banner' : ''}`}>
                      {upNextJob.timingCategory === 'overdue' ? '🚨 CITA ATRASADA' : (upNextJob.timingCategory === 'today' ? '⚡ CITA DE HOY' : 'PRÓXIMA CITA')}
                    </span>
                    <span className="up-next-time-tag">
                      <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                      {upNextJob.calendarTime}
                    </span>
                  </div>

                  <h4 className="up-next-title">{upNextJob.titulo}</h4>

                  <div className="up-next-details">
                    <div>📍 {upNextJob.calle || upNextJob.zona}</div>
                    <div>🧑‍💼 {upNextJob.cliente || upNextJob.assigned_tech_name || 'Cliente'}</div>
                    <div style={{ color: upNextJob.timingCategory === 'overdue' ? '#fca5a5' : '#fdba74', fontWeight: 800, fontSize: '0.76rem' }}>
                      📅 {upNextJob.timingHumanFull}
                    </div>
                    {upNextJob.agreed_price > 0 && (
                      <div style={{ color: '#4ade80', fontWeight: 800 }}>💰 ${parseFloat(upNextJob.agreed_price).toFixed(2)} MXN</div>
                    )}
                  </div>

                  <button 
                    className="btn-up-next-action"
                    onClick={() => handleEventClick(upNextJob)}
                  >
                    <MessageCircle size={15} />
                    <span>Abrir Trabajo / Coordinación</span>
                  </button>
                </div>
              ) : (
                <div style={{ padding: '16px', background: '#161f30', borderRadius: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                  No tienes servicios activos por el momento.
                </div>
              )}
            </div>

            {/* 3. Resumen Rápido de Actividad */}
            <div>
              <div className="sidebar-section-title">
                <span>📋 Resumen de Citas ({countAll})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {networkJobs.slice(0, 4).map((job) => (
                  <div 
                    key={job.id}
                    style={{
                      background: '#161f30',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderLeft: `3.5px solid ${job.timingCategory === 'overdue' ? '#ef4444' : (job.timingCategory === 'today' ? '#ff6600' : (job.timingCategory === 'future' ? '#06b6d4' : '#f59e0b'))}`,
                      fontSize: '0.78rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px'
                    }}
                    onClick={() => handleEventClick(job)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.7rem' }}>
                      <span>{job.calendarTime}</span>
                      <span style={{ fontWeight: 800, color: job.timingCategory === 'overdue' ? '#fca5a5' : (job.timingCategory === 'today' ? '#fdba74' : '#6ee7b7') }}>
                        {job.timingBadge}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {job.titulo}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      🧑‍💼 {job.cliente}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* ─── MODAL RECICLADO: DETALLE DE PUBLICACIÓN Y COTIZACIONES (EXACTAMENTE IGUAL A VISTA RED) ─── */}
        {showQuotesModal && selectedJobForQuotes && (
          <div 
            className="mercado-modal-overlay" 
            style={{ zIndex: 1000000000 }}
            onClick={(e) => e.target === e.currentTarget && setShowQuotesModal(false)}
          >
            <div className="mercado-premium-modal">
              <div className="mercado-premium-header">
                <h2>📋 Detalle de Publicación y Cotizaciones</h2>
                <button className="mercado-modal-close" onClick={() => setShowQuotesModal(false)} aria-label="Cerrar modal" title="Cerrar">
                  <X size={18} />
                </button>
              </div>

              {/* BARRA DE PESTAÑAS RESPONSIVAS (SOLO EN MÓVIL) */}
              <div className="mercado-mobile-tab-bar">
                <button 
                  type="button"
                  className={`mercado-mobile-tab-btn ${mobileModalTab === 'quotes' ? 'active' : ''}`}
                  onClick={() => setMobileModalTab('quotes')}
                >
                  <MessageCircle size={15} />
                  <span>Cotizaciones y Chat</span>
                  {selectedJobForQuotes.cotizaciones_list?.length > 0 && (
                    <span className="mercado-tab-count-badge">
                      {selectedJobForQuotes.cotizaciones_list.length}
                    </span>
                  )}
                </button>
                <button 
                  type="button"
                  className={`mercado-mobile-tab-btn ${mobileModalTab === 'details' ? 'active' : ''}`}
                  onClick={() => setMobileModalTab('details')}
                >
                  <FileText size={15} />
                  <span>Detalle Problema</span>
                </button>
              </div>

              <div className="mercado-premium-body">
                {/* Panel Izquierdo: Galería de Fotos e Información del Problema */}
                <div className={`mercado-premium-details ${mobileModalTab === 'details' ? 'mobile-tab-active' : 'mobile-tab-hidden'}`} style={{ flex: '1.05' }}>
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
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '10px 0' }}>
                      {selectedJobForQuotes.titulo}
                    </h3>
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

                      {selectedJobForQuotes.arrived_at && (
                        <div className="mercado-info-item full-width" style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <MapPin size={16} color="#16a34a" />
                          <div>
                            <strong style={{ color: '#166534', fontSize: '12px', display: 'block' }}>📍 Técnico Arribó al Domicilio</strong>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                              {new Date(selectedJobForQuotes.arrived_at).toLocaleString('es-MX', { timeStyle: 'short', dateStyle: 'medium' })}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Botón de Calificación Dual */}
                      {(selectedJobForQuotes.is_accepted || selectedJobForQuotes.status === 'Terminado' || selectedJobForQuotes.status === 'Completado' || selectedJobForQuotes.status === 'Listo' || selectedJobForQuotes.status === 'Asignado') && (
                        <button
                          type="button"
                          onClick={() => {
                            const assignedQuote = selectedJobForQuotes.cotizaciones_list?.find(q => q.is_assigned || q.status === 'accepted');
                            const tech = assignedQuote?.technician || selectedJobForQuotes.tecnico || {
                              id: selectedJobForQuotes.tecnico_id || assignedQuote?.technician_id,
                              name: assignedQuote?.technicianName || 'Técnico Asignado'
                            };
                            setRatingTargetTech(tech);
                            setRatingTargetJob(selectedJobForQuotes);
                            setShowRatingModal(true);
                          }}
                          style={{
                            width: '100%',
                            padding: '11px 16px',
                            background: 'linear-gradient(135deg, #f26522, #ea580c)',
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
                            boxShadow: '0 4px 14px rgba(242, 101, 34, 0.35)',
                            marginTop: '12px'
                          }}
                        >
                          <Sparkles size={16} /> 🌟 Calificar Servicio y Puntualidad
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Panel Derecho: Lista de Cotizaciones O Chat Directo */}
                <div className={`mercado-premium-form ${mobileModalTab === 'quotes' ? 'mobile-tab-active' : 'mobile-tab-hidden'}`}>
                  
                  {/* Vista 1: Lista de Cotizaciones */}
                  {!activeChatQuote && (
                    <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
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

                      {/* Banner de Cancelación por el Técnico con 5 Relojes + Borrar / Reenviar a la Red */}
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
                              width: '40px',
                              height: '40px',
                              borderRadius: '12px',
                              background: '#fee2e2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ef4444',
                              flexShrink: 0
                            }}>
                              <AlertTriangle size={22} />
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: '#991b1b' }}>
                                ⚠️ El técnico canceló este servicio
                              </h4>
                              <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: '1.4' }}>
                                {selectedJobForQuotes.cancellation_reason 
                                  ? `Motivo: "${selectedJobForQuotes.cancellation_reason}"` 
                                  : 'El técnico notificó que no asistirá a la visita acordada.'}
                              </p>
                            </div>
                          </div>

                          {/* 1. Paso 1: Encuesta de 5 Relojes para calcular puntualidad */}
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
                              padding: '12px 16px',
                              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: '800',
                              fontSize: '13.5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                              marginBottom: '12px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Clock size={18} />
                            <span>⏱️ Calificar Puntualidad del Técnico (5 Relojes)</span>
                          </button>

                          {/* 2. Paso 2: Opciones de Resolución (Borrar Solicitud O Enviar a la Red Nuevamente) */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteJob(selectedJobForQuotes.id)}
                              style={{
                                padding: '10px 14px',
                                background: '#ffffff',
                                color: '#dc2626',
                                border: '1.5px solid #fca5a5',
                                borderRadius: '10px',
                                fontWeight: '800',
                                fontSize: '12.5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Trash2 size={15} />
                              <span>Borrar Servicio</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReopenJobInNetwork(selectedJobForQuotes)}
                              style={{
                                padding: '10px 14px',
                                background: 'linear-gradient(135deg, #f26522, #ea580c)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: '800',
                                fontSize: '12.5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(242, 101, 34, 0.35)',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Send size={15} />
                              <span>🌐 Enviar a la Red nuevamente</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Banner de Horario Propuesto */}
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
                                      title="Ver perfil completo del técnico"
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
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                                        <span className="red-quote-role">Técnico Verificado</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '700', color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '6px', border: '1px solid #fde68a' }} title="Calidad del trabajo">
                                          <Star size={11} style={{ fill: '#f59e0b', color: '#f59e0b' }} /> {Number(quote.technician?.rating_stars_avg || 5.0).toFixed(1)}
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '700', color: '#0369a1', background: '#e0f2fe', padding: '1px 6px', borderRadius: '6px', border: '1px solid #bae6fd' }} title="Puntualidad de llegada">
                                          <Clock size={11} color="#0284c7" /> {Number(quote.technician?.rating_time_avg || 5.0).toFixed(1)}
                                        </span>
                                      </div>
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
                                    <div style={{ color: '#dc2626', fontWeight: '800', fontSize: '13px', padding: '6px 0' }}>
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
                                        fontWeight: '800'
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

                  {/* Vista 2: Chat Directo Embebido con el Técnico */}
                  {activeChatQuote && (
                    <div className="red-embedded-chat-wrap">
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

                      {/* Alerta de Mensaje */}
                      {activeChatQuote.hasNewTechMessage && (
                        <div className="mercado-chat-alert-banner">
                          <div className="mercado-chat-alert-icon">🔔</div>
                          <div className="mercado-chat-alert-text">
                            <strong>El Técnico te envió un mensaje:</strong>
                            <span>"{activeChatQuote.displayAlertMsg || activeChatQuote.lastMsg?.message || activeChatQuote.message}"</span>
                          </div>
                        </div>
                      )}

                      {/* Banner de Horario en el Chat */}
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

                      {/* Historial de Mensajes del Chat */}
                      <div className="mercado-chat-messages-area">
                        {(!activeChatQuote.chat_history || activeChatQuote.chat_history.length === 0) ? (
                          <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto', padding: '20px' }}>
                            <MessageCircle size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                            <p style={{ margin: 0, fontSize: '13px' }}>Inicia la conversación con <strong>{activeChatQuote.technicianName}</strong> para coordinar tu servicio.</p>
                          </div>
                        ) : (
                          activeChatQuote.chat_history.map((msg, index) => {
                            const isMe = Number(msg.sender_id) === Number(user?.id) || msg.sender_role === 'Cliente';
                            return (
                              <div
                                key={index}
                                className={`mercado-chat-bubble-row ${isMe ? 'me' : 'other'}`}
                              >
                                <div className={`mercado-chat-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                                  <div className="bubble-sender">{msg.sender_name || (isMe ? 'Tú' : activeChatQuote.technicianName)}</div>
                                  <div className="bubble-text">{msg.message}</div>
                                  <div className="bubble-time">
                                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Input del Chat */}
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

              {/* Footer del Modal */}
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
                      gap: '8px'
                    }}
                  >
                    <Trash2 size={16} /> Cancelar / Eliminar Publicación
                  </button>
                )}

                <button className="mercado-btn-cancel" onClick={() => setShowQuotesModal(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL PARA VISUALIZAR FOTO EN PANTALLA COMPLETA ─── */}
        {isPhotoZoomed && activePhoto && (
          <div 
            className="mercado-modal-overlay" 
            style={{ zIndex: 110000, background: 'rgba(0,0,0,0.92)' }} 
            onClick={() => setIsPhotoZoomed(false)}
          >
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={activePhoto} 
                alt="Zoom Evidencia" 
                style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }} 
              />
              <button 
                onClick={() => setIsPhotoZoomed(false)} 
                style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#ff6600', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ─── MODAL DEL PERFIL DEL TÉCNICO ─── */}
        {showTechModal && selectedTechnicianProfile && (
          <div 
            className="mercado-modal-overlay" 
            style={{ zIndex: 105000 }}
            onClick={(e) => e.target === e.currentTarget && setShowTechModal(false)}
          >
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="red-quote-role" style={{ background: '#fff7ed', padding: '4px 10px', borderRadius: '20px', border: '1px solid #fed7aa' }}>
                        Técnico Verificado
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '800', color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '8px', border: '1px solid #fde68a' }} title="Calidad del trabajo">
                        <Star size={13} style={{ fill: '#f59e0b', color: '#f59e0b' }} /> {Number(selectedTechnicianProfile.rating_stars_avg || 5.0).toFixed(1)} Calidad
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '800', color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: '8px', border: '1px solid #bae6fd' }} title="Puntualidad de llegada">
                        <Clock size={13} color="#0284c7" /> {Number(selectedTechnicianProfile.rating_time_avg || 5.0).toFixed(1)} Puntualidad
                      </span>
                    </div>
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

        {/* ─── MODAL PARA PUBLICAR NUEVO SERVICIO DESDE EL CALENDARIO ─── */}
        {showNewServiceModal && (
          <ModalServicioAutonomo 
            onClose={() => setShowNewServiceModal(false)}
            onSuccess={() => {
              setShowNewServiceModal(false);
              fetchJobs();
            }}
          />
        )}

        {/* ─── MODAL DE CALIFICACIÓN DUAL (RELOJES ⏱️ Y ESTRELLAS ⭐) ─── */}
        {showRatingModal && ratingTargetTech && (
          <ModalCalificarTecnico
            isOpen={showRatingModal}
            onClose={handleCloseRatingModal}
            technician={ratingTargetTech}
            workOrderId={ratingTargetJob?.id}
            serviceId={ratingTargetJob?.service_id}
            scheduledAt={ratingTargetJob?.scheduled_at}
            arrivedAt={ratingTargetJob?.arrived_at}
            onlyTime={Boolean(ratingTargetJob?.cancelled_by_tech || ratingTargetJob?.status === 'Cancelado_Tecnico')}
            isCancellation={Boolean(ratingTargetJob?.cancelled_by_tech || ratingTargetJob?.status === 'Cancelado_Tecnico')}
            cancellationReason={ratingTargetJob?.cancellation_reason || ''}
            onSuccess={() => {
              handleCloseRatingModal();
              fetchJobs();
            }}
          />
        )}

      </div>
    </div>
  );
};

export default ModalCalendarioCliente;
