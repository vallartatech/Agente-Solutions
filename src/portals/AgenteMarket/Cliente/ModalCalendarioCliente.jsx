import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import HojaCitasMovil from '../../../components/Shared/HojaCitasMovil';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import ModalServicioAutonomo from '../Admin/ModalServicioAutonomo';
import ModalCalificarTecnico from '../../../components/Shared/ModalCalificarTecnico';
import '../../../styles/AgenteMarket/Admin/VistaRedAutonomo.css';
import '../../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';
// Diseño copiado del calendario de Agente Solutions (CalendarioSolutions.css), con su propia clase .cal-market
import '../../../styles/AgenteMarket/Cliente/CalendarioMarket.css';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  CalendarDays,
  PlusCircle,
  MessageCircle,
  FileText,
  X,
  Search,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Siren,
  Zap,
  Hourglass,
  Globe,
  Wrench,
  ClipboardList
} from 'lucide-react';

import AvisoCancelacionTecnico from './AvisoCancelacionTecnico';
import DetallePublicacionRed from './DetallePublicacionRed';
// ── Agenda de Agente Market ──
// Misma interfaz que el calendario de Agente Solutions (ModalCalendarioSolutions), con los datos de la red:
// trabajos de /mercado-trabajos, cotizaciones y chat de /network-quotes, publicar servicio y calificar técnicos.
// No usa avisos, cumpleaños ni mantenimientos: son datos del equipo interno.

// Íconos de línea (en lugar de emojis) por estado del trabajo; toman el color del texto
const ICONO_TIEMPO = { overdue: Siren, today: Zap, future: CalendarDays, uncoordinated: Hourglass, completed: CheckCircle2, network: Globe };

const IconoEvento = ({ job, size = 12 }) => {
  const Icono = ICONO_TIEMPO[job.timingCategory] || Clock;
  return <Icono size={size} strokeWidth={2.4} className="cal-ico" aria-hidden="true" />;
};

// Color de cada evento (mismo que sus puntos de la leyenda): puntos del mes en celular y hoja del día
const COLOR_TIEMPO = { overdue: '#ef4444', today: '#ff6600', future: '#06b6d4', uncoordinated: '#eab308', completed: '#10b981', network: '#3b82f6' };
const colorEvento = (job) => COLOR_TIEMPO[job.timingCategory] || '#94a3b8';

// Segunda línea en la hoja del día: quién y en qué estado está
const detalleEvento = (job) =>
  [job.cliente, job.assigned_tech_name && `Técnico: ${job.assigned_tech_name}`, job.timingBadge].filter(Boolean).join(' · ');

// ¿Le corresponde a este técnico? El trabajo está asignado a él
const esAsignadoA = (evento, userId) => {
  const yo = Number(userId);
  if (!yo) return false;
  return Number(evento.tecnico_id) === yo || (evento.technicians || []).some(t => Number(t.id) === yo);
};

// Opciones del menú "Filtrar" ("En red" solo aparece si hay publicaciones en red)
const FILTROS_CALENDARIO = [
  { key: 'all', label: 'Todos', Icon: CalendarIcon },
  { key: 'overdue', label: 'Atrasados', Icon: Siren, dot: 'dot-overdue' },
  { key: 'today', label: 'Citas hoy', Icon: Zap, dot: 'dot-today' },
  { key: 'future', label: 'Próximos', Icon: CalendarDays, dot: 'dot-future' },
  { key: 'uncoordinated', label: 'Por coordinar', Icon: Hourglass, dot: 'dot-uncoordinated' },
  { key: 'network', label: 'En red', Icon: Globe, dot: 'dot-network' },
];

// Fecha local YYYY-MM-DD (toISOString usa UTC y en la noche de México ya marca el día siguiente)
const toLocalDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// "Viernes 16 de octubre"
const formatFechaLarga = (dateKey) => {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  const text = new Date(y, m - 1, d)
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(',', '');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// "26 abr – 2 may 2026" / "4 – 10 oct 2026"
const weekRangeLabel = (start, end) => {
  const month = (d) => d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${month(end)} ${end.getFullYear()}`;
  }
  const startYear = start.getFullYear() !== end.getFullYear() ? ` ${start.getFullYear()}` : '';
  return `${start.getDate()} ${month(start)}${startYear} – ${end.getDate()} ${month(end)} ${end.getFullYear()}`;
};

const memberName = (m) => `${m?.first_name || ''} ${m?.last_name || ''}`.trim() || 'Usuario';
const memberInitials = (m) => memberName(m).split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

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

// Lo cancelado o rechazado ya no es una cita: no aparece en la agenda.
// "Cancelado_Tecnico" sí aparece: el cliente debe borrarlo o reenviarlo a la red desde el detalle.
const ESTADOS_CANCELADOS = ['rechazado', 'cancelado'];
const estaCancelada = (orden) => ESTADOS_CANCELADOS.includes(String(orden.status || '').trim().toLowerCase());

// Último punto tocado en pantalla: de ahí "sale" el calendario al abrirse
// (así funciona con cualquier botón que lo abra, sin pasar referencias)
let ultimoToqueCal = null;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => {
    ultimoToqueCal = { x: e.clientX, y: e.clientY };
  }, true);
}

const ModalCalendarioCliente = ({ isOpen, onClose: onCloseProp, onSelectJob }) => {
  // ── Animación de cierre: se encoge hacia donde se abrió y luego avisa al padre ──
  const [calCerrando, setCalCerrando] = useState(false);
  const calVentanaRef = useRef(null);
  const calCierreTimer = useRef(null);

  const onClose = () => {
    if (calCerrando) return;
    setCalCerrando(true);
    clearTimeout(calCierreTimer.current);
    calCierreTimer.current = setTimeout(() => {
      setCalCerrando(false);
      onCloseProp?.();
    }, 300);
  };

  useEffect(() => () => clearTimeout(calCierreTimer.current), []);

  // Colocar el origen de la animación sobre la ventana
  useLayoutEffect(() => {
    if (!isOpen) return;
    const win = calVentanaRef.current;
    if (!win) return;
    const r = win.getBoundingClientRect();
    const o = ultimoToqueCal || { x: r.left + r.width / 2, y: r.top };
    win.style.setProperty('--cal-ox', `${o.x - r.left}px`);
    win.style.setProperty('--cal-oy', `${o.y - r.top}px`);
  }, [isOpen]);

  const { user } = useAuth();

  // Roles de Técnico / Contratista / Admin
  const isTechnician = Boolean(user && [0, 1, 2, 6, 8].includes(Number(user.role_id)));

  // Estados del Calendario
  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalDate, setMiniCalDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month'); // 'month' | 'week' | 'agenda'
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'overdue' | 'today' | 'future' | 'uncoordinated' | 'network'

  // Menú "Filtrar" junto al buscador
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  // Botón con la foto del técnico: se combina con el filtro del menú y con la búsqueda
  const [soloMios, setSoloMios] = useState(false);
  const [fotoFallida, setFotoFallida] = useState(false);
  const filtroRef = useRef(null);
  useEffect(() => {
    if (!filtroAbierto) return;
    const cerrar = (e) => { if (!filtroRef.current?.contains(e.target)) setFiltroAbierto(false); };
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('touchstart', cerrar, { passive: true });
    return () => {
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('touchstart', cerrar);
    };
  }, [filtroAbierto]);

  // Selector de mes/año al tocar el título
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const monthPickerRef = useRef(null);
  useEffect(() => {
    if (!showMonthPicker) return;
    const onPointerDown = (e) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target)) setShowMonthPicker(false);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setShowMonthPicker(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showMonthPicker]);

  // Día abierto en la hoja "todo lo del día" (dateKey) al tocar una fecha con servicios
  const [diaAbierto, setDiaAbierto] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [networkJobs, setNetworkJobs] = useState([]);

  // Detalle de Publicación y Cotizaciones (componente compartido con el mapa de la Red)
  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [selectedJobForQuotes, setSelectedJobForQuotes] = useState(null);
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTargetTech, setRatingTargetTech] = useState(null);
  const [ratingTargetJob, setRatingTargetJob] = useState(null);

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

    const normStatus = String(order.status || '').trim().toLowerCase();
    const isCompleted = normStatus === 'terminado' || normStatus === 'listo' || normStatus === 'finalizado' || normStatus === 'completado';

    // Clasificación por tiempo (mismos textos que el calendario de Agente Solutions)
    let timingCategory = 'uncoordinated'; // 'overdue' | 'today' | 'future' | 'uncoordinated' | 'completed' | 'network'
    let timingBadge = 'Por Coordinar';
    let timingRelative = 'Sin fecha agendada';
    let statusType = 'uncoordinated';
    let statusLabel = 'Horario Por Coordinar';

    if (isCompleted) {
      timingCategory = 'completed';
      timingBadge = 'Finalizado';
      timingRelative = 'Trabajo Concluido';
      statusType = 'completed';
      statusLabel = 'Trabajo Terminado';
    } else if (normStatus === 'por aprobar') {
      // El técnico ya terminó; no cuenta como atrasada mientras se aprueba
      timingCategory = 'completed';
      timingBadge = 'Por aprobar';
      timingRelative = 'Esperando aprobación';
      statusType = 'completed';
      statusLabel = 'Pendiente de aprobación';
    } else if (!hasScheduledDate) {
      if (!isAccepted && !isTechnician) {
        timingCategory = 'network';
        timingBadge = 'En red';
        timingRelative = 'Cotizaciones abiertas';
        statusType = 'network';
        statusLabel = 'En Red / Cotizando';
      } else {
        timingCategory = 'uncoordinated';
        timingBadge = 'Por Coordinar';
        timingRelative = 'Coordinación pendiente';
        statusType = 'uncoordinated';
        statusLabel = 'Horario Por Coordinar';
      }
    } else if (eventDate < todayStart) {
      const diffMs = todayStart.getTime() - eventDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      timingCategory = 'overdue';
      timingBadge = 'Atrasada';
      timingRelative = `Atrasada por ${diffDays} día${diffDays > 1 ? 's' : ''}`;
      statusType = 'overdue';
      statusLabel = `Cita Vencida (${diffDays}d)`;
    } else if (isToday) {
      timingCategory = 'today';
      timingBadge = 'Hoy';
      timingRelative = `Hoy a las ${timeFormatted}`;
      statusType = 'today';
      statusLabel = `Cita Hoy (${timeFormatted})`;
    } else {
      const diffMs = eventDate.getTime() - todayEnd.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      timingCategory = 'future';
      timingBadge = 'Próxima';
      timingRelative = diffDays <= 7 ? `En ${diffDays} día${diffDays > 1 ? 's' : ''}` : `El ${eventDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;
      statusType = 'future';
      statusLabel = `En ${diffDays} día${diffDays > 1 ? 's' : ''} (${timeFormatted})`;
    }

    const timingHumanFull = hasScheduledDate 
      ? eventDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + `, ${timeFormatted}`
      : 'Pendiente de coordinar horario';

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
      // Solicitud enviada solo a un técnico favorito (null si está abierta a toda la red)
      tecnico_dirigido_id: order.tecnico_dirigido_id || null,
      tecnico_dirigido_nombre: order.tecnico_dirigido_nombre || null,
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
      hasScheduledDate,
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
      isNetwork: timingCategory === 'network',
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
          if (estaCancelada(order)) return;
          const processed = processOrderToEvent(order, true);
          jobMap.set(processed.id, processed);
        });

        // 2. Procesar solicitudes de la red o del cliente
        rawData.forEach(order => {
          if (estaCancelada(order)) return;
          if (!jobMap.has(order.id)) {
            const processed = processOrderToEvent(order, false);
            jobMap.set(processed.id, processed);
          }
        });

        const jobs = Array.from(jobMap.values());
        setNetworkJobs(jobs);

        // El detalle abierto recibe el trabajo actualizado
        setSelectedJobForQuotes(prevSel => (prevSel ? (jobs.find(j => j.id === prevSel.id) || prevSel) : prevSel));
      }
    } catch (e) {
      console.error("Error fetching jobs in modal calendar", e);
    } finally {
      setLoading(false);
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
      const interval = setInterval(() => {
        fetchJobs();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleOpenQuotesModal = (job) => {
    setSelectedJobForQuotes(job);
    setShowQuotesModal(true);
  };

  const handleEventClick = (job) => {
    if (onSelectJob) {
      onSelectJob(job);
      return;
    }
    handleOpenQuotesModal(job);
  };

  // Filtrado de eventos (menú "Filtrar" + "solo míos" + búsqueda)
  const applyFilters = useCallback((events) => {
    let result = [...events];

    if (soloMios) result = result.filter(e => esAsignadoA(e, user?.id));

    if (selectedFilter === 'overdue') result = result.filter(e => e.isOverdue);
    else if (selectedFilter === 'today') result = result.filter(e => e.isToday);
    else if (selectedFilter === 'future') result = result.filter(e => e.isFuture);
    else if (selectedFilter === 'uncoordinated') result = result.filter(e => e.isUncoordinated);
    else if (selectedFilter === 'completed') result = result.filter(e => e.isCompleted);
    else if (selectedFilter === 'network') result = result.filter(e => e.isNetwork);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.titulo?.toLowerCase().includes(q) ||
        e.cliente?.toLowerCase().includes(q) ||
        e.calle?.toLowerCase().includes(q) ||
        e.zona?.toLowerCase().includes(q) ||
        e.lugar?.toLowerCase().includes(q) ||
        e.assigned_tech_name?.toLowerCase().includes(q) ||
        e.descripcion?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedFilter, searchQuery, soloMios, user?.id]);

  const filteredEvents = useMemo(() => applyFilters(networkJobs), [networkJobs, applyFilters]);

  // Contadores
  const countAll = networkJobs.length;
  const countMios = networkJobs.filter(e => esAsignadoA(e, user?.id)).length;
  const countOverdue = networkJobs.filter(e => e.isOverdue).length;
  const countToday = networkJobs.filter(e => e.isToday).length;
  const countFuture = networkJobs.filter(e => e.isFuture).length;
  const countUncoordinated = networkJobs.filter(e => e.isUncoordinated).length;
  const countNetwork = networkJobs.filter(e => e.isNetwork).length;
  const conteoFiltro = {
    all: countAll, overdue: countOverdue, today: countToday, future: countFuture,
    uncoordinated: countUncoordinated, network: countNetwork,
  };
  const filtrosVisibles = FILTROS_CALENDARIO.filter(f => f.key !== 'network' || countNetwork > 0 || selectedFilter === 'network');
  const fotoUsuario = user?.profile_picture_url || user?.profile_picture || user?.avatar_url || user?.foto || null;
  const filtroActual = FILTROS_CALENDARIO.find(f => f.key === selectedFilter) || FILTROS_CALENDARIO[0];

  // Próximo servicio destacado (Up Next)
  const upNextJob = useMemo(() => {
    const overdue = networkJobs.filter(e => e.isOverdue).sort((a, b) => a.calendarDate - b.calendarDate);
    if (overdue.length > 0) return overdue[0];

    const today = networkJobs.filter(e => e.isToday && !e.isCompleted).sort((a, b) => a.calendarDate - b.calendarDate);
    if (today.length > 0) return today[0];

    const future = networkJobs.filter(e => e.isFuture).sort((a, b) => a.calendarDate - b.calendarDate);
    if (future.length > 0) return future[0];

    return null;
  }, [networkJobs]);

  // Lista de trabajos pendientes en el mismo orden de prioridad que "Próximo Servicio"
  const trabajosProximos = useMemo(() => {
    const porFecha = (a, b) => a.calendarDate - b.calendarDate;
    return [
      ...networkJobs.filter(e => e.isOverdue).sort(porFecha),
      ...networkJobs.filter(e => e.isToday && !e.isCompleted && !e.isOverdue).sort(porFecha),
      ...networkJobs.filter(e => e.isFuture).sort(porFecha),
    ];
  }, [networkJobs]);

  // Selección de día / navegación: en Semana las flechas avanzan 7 días, en Mes un mes
  const handlePrevMonth = () => {
    setCurrentDate(prev => currentView === 'week'
      ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7)
      : new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => currentView === 'week'
      ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7)
      : new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const toggleMonthPicker = () => {
    setPickerYear(currentDate.getFullYear());
    setShowMonthPicker(prev => !prev);
  };

  const handlePickMonth = (monthIndex) => {
    const picked = new Date(pickerYear, monthIndex, 1);
    setCurrentDate(picked);
    setMiniCalDate(picked);
    setShowMonthPicker(false);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setMiniCalDate(now);
  };

  // Matriz de días del mes
  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const todayStr = toLocalDateKey(new Date());
    const cells = [];
    const celda = (date, dayNumber, isCurrentMonth) => {
      const dateKey = toLocalDateKey(date);
      return {
        dayNumber,
        dateKey,
        isCurrentMonth,
        isToday: dateKey === todayStr,
        events: filteredEvents.filter(e => e.dateKey === dateKey)
      };
    };

    // Días del mes previo
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      cells.push(celda(new Date(year, month - 1, dayNum), dayNum, false));
    }

    // Días del mes actual
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      cells.push(celda(new Date(year, month, dayNum), dayNum, true));
    }

    // Días del mes siguiente para completar la cuadrícula de 7 columnas
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push(celda(new Date(year, month + 1, i), i, false));
    }

    return cells;
  }, [currentDate, filteredEvents]);

  // Días de la semana para vista 'week'
  const weekDaysList = useMemo(() => {
    const current = new Date(currentDate);
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - current.getDay());
    const todayStr = toLocalDateKey(new Date());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateKey = toLocalDateKey(d);
      days.push({
        dayIndex: i,
        date: d,
        dayName: DAY_NAMES_MINI[i],
        dayNumber: d.getDate(),
        dateKey,
        isToday: dateKey === todayStr
      });
    }
    return days;
  }, [currentDate]);

  // Agenda: solo de hoy en adelante. Los trabajos pendientes con fecha pasada (atrasados,
  // por coordinar o en red, que usan su fecha de publicación) se agrupan arriba.
  const agendaGroupedEvents = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    const isPendingPast = (e) => e.dateKey < todayKey && !e.isCompleted && (e.isOverdue || e.isUncoordinated || e.isNetwork);
    const base = networkJobs.filter(e => e.dateKey >= todayKey || isPendingPast(e));
    const sorted = applyFilters(base).sort((a, b) => a.calendarDate - b.calendarDate);

    const groups = [];
    const overdue = sorted.filter(e => isPendingPast(e) && e.isOverdue);
    const uncoordinated = sorted.filter(e => isPendingPast(e) && e.isUncoordinated);
    const enRed = sorted.filter(e => isPendingPast(e) && e.isNetwork);
    if (overdue.length > 0) {
      groups.push({ key: 'overdue', isOverdueGroup: true, dateStr: `Atrasados (${overdue.length})`, items: overdue });
    }
    if (uncoordinated.length > 0) {
      groups.push({ key: 'uncoordinated', isOverdueGroup: true, dateStr: `Por coordinar (${uncoordinated.length})`, items: uncoordinated });
    }
    if (enRed.length > 0) {
      groups.push({ key: 'network', isNetworkGroup: true, dateStr: `En red, cotizando (${enRed.length})`, items: enRed });
    }

    const byDate = {};
    sorted.filter(e => e.dateKey >= todayKey).forEach(ev => {
      if (!byDate[ev.dateKey]) {
        const label = ev.calendarDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        byDate[ev.dateKey] = {
          key: ev.dateKey,
          dateStr: ev.dateKey === todayKey ? `Hoy · ${label}` : label,
          items: []
        };
        groups.push(byDate[ev.dateKey]);
      }
      byDate[ev.dateKey].items.push(ev);
    });
    return groups;
  }, [networkJobs, applyFilters]);

  // Mini calendario
  const miniCalMatrix = useMemo(() => {
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const todayStr = toLocalDateKey(new Date());
    const cells = [];
    const celda = (date, dayNum, isCurrentMonth) => {
      const dateKey = toLocalDateKey(date);
      return {
        dayNum,
        dateKey,
        isCurrentMonth,
        isToday: dateKey === todayStr,
        hasEvents: networkJobs.some(j => j.dateKey === dateKey)
      };
    };

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      cells.push(celda(new Date(year, month - 1, dayNum), dayNum, false));
    }
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      cells.push(celda(new Date(year, month, dayNum), dayNum, true));
    }
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push(celda(new Date(year, month + 1, i), i, false));
    }

    return cells;
  }, [miniCalDate, networkJobs]);

  if (!isOpen) return null;

  // Tarjeta del próximo servicio (se usa en el sidebar de PC y en el panel móvil)
  const tarjetaProximo = upNextJob ? (
    <div className={`up-next-card ${upNextJob.timingCategory === 'overdue' ? 'is-overdue-alert' : ''}`}>
      <div className="up-next-badge-row">
        <span className={`up-next-pill ${upNextJob.timingCategory === 'overdue' ? 'pill-overdue-banner' : ''}`}>
          <IconoEvento job={upNextJob} size={12} /> {upNextJob.timingCategory === 'overdue' ? 'CITA ATRASADA' : (upNextJob.timingCategory === 'today' ? 'CITA DE HOY' : 'PRÓXIMA CITA')}
        </span>
        <span className="up-next-time-tag">
          <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
          {upNextJob.calendarTime}
        </span>
      </div>

      <h4 className="up-next-title">{upNextJob.titulo}</h4>

      <div className="up-next-details">
        <div className="cal-ico-text"><MapPin size={13} className="cal-ico" /> {upNextJob.calle || upNextJob.zona}</div>
        <div className="cal-ico-text"><User size={13} className="cal-ico" /> {upNextJob.cliente || 'Cliente'}</div>
        {upNextJob.assigned_tech_name && (
          <div className="cal-ico-text"><Wrench size={13} className="cal-ico" /> Técnico: {upNextJob.assigned_tech_name}</div>
        )}
        <div style={{ color: upNextJob.timingCategory === 'overdue' ? '#fca5a5' : '#fdba74', fontWeight: 800, fontSize: '0.76rem' }}>
          <span className="cal-ico-text"><CalendarDays size={13} className="cal-ico" /> {upNextJob.timingRelative}</span>
        </div>
        {upNextJob.agreed_price > 0 && (
          <div className="cal-ico-text" style={{ color: '#4ade80', fontWeight: 800 }}><DollarSign size={13} className="cal-ico" /> ${parseFloat(upNextJob.agreed_price).toFixed(2)} MXN</div>
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
    <div className="sidebar-glass-card">
      No tienes servicios activos pendientes por coordinar.
    </div>
  );

  // Fila compacta de una cita (resumen)
  const renderResumenCita = (job) => (
    <div
      key={job.id}
      className="sidebar-summary-card"
      style={{ borderLeft: `3.5px solid ${colorEvento(job)}` }}
      onClick={() => handleEventClick(job)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.7rem' }}>
        <span>{job.calendarTime}</span>
        <span style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', color: job.timingCategory === 'overdue' ? '#fca5a5' : (job.timingCategory === 'today' ? '#fdba74' : '#6ee7b7') }}>
          <IconoEvento job={job} size={11} /> {job.timingBadge}
        </span>
      </div>
      <div style={{ fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {job.titulo}
      </div>
      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
        <span className="cal-ico-text"><User size={11} className="cal-ico" /> {job.cliente}</span>
      </div>
    </div>
  );


  return (
    <>
      {/* El técnico canceló: calificarlo es obligatorio (fuera del fondo del calendario para no cerrarlo) */}
      {!isTechnician && <AvisoCancelacionTecnico onResuelto={() => fetchJobs()} />}
      {createPortal(
    <div className={`cal-modal-backdrop ${calCerrando ? 'is-cerrando' : ''}`} onClick={onClose}>
      <div
        ref={calVentanaRef}
        className={`modal-calendario-window cal-market cal-genie ${calCerrando ? 'is-cerrando' : ''}`}
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

          <div className="modal-cal-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              className="btn-modal-quick-new"
              onClick={() => setShowNewServiceModal(true)}
              title="Publicar nuevo servicio en la red"
            >
              <PlusCircle size={15} />
              <span className="btn-modal-quick-new-text">
                <span className="btn-text-full">Publicar Servicio</span>
                <span className="btn-text-short">Publicar</span>
              </span>
            </button>
            <button
              className="btn-modal-close-window"
              onClick={onClose}
              title="Cerrar ventana (Esc)"
              aria-label="Cerrar ventana"
            >
              <X size={18} color="#FFFFFF" strokeWidth={2.8} />
            </button>
          </div>
        </div>

        {/* ── CUERPO PRINCIPAL CON 2 COLUMNAS ── */}
        <div className="modal-cal-content-body">

          {/* COLUMNA IZQUIERDA: SCHEDULER & VISTAS */}
          <div className="cal-main-col">

            {/* Toolbar Superior */}
            <div className="scheduler-toolbar-card">
              <div className="cal-nav-group">
                <button className="btn-cal-today" onClick={handleToday}>
                  Hoy
                </button>

                {currentView !== 'agenda' && (
                  <div className="cal-arrows">
                    <button className="btn-cal-arrow" onClick={handlePrevMonth} title={currentView === 'week' ? 'Semana anterior' : 'Mes anterior'}>
                      <ChevronLeft size={18} />
                    </button>
                    <button className="btn-cal-arrow" onClick={handleNextMonth} title={currentView === 'week' ? 'Semana siguiente' : 'Mes siguiente'}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}

                {currentView === 'agenda' ? (
                  <div className="cal-current-title">
                    <CalendarIcon size={18} color="#FF6600" />
                    <span>Próximos eventos</span>
                  </div>
                ) : (
                  <div className="cal-title-picker" ref={monthPickerRef}>
                    <button
                      type="button"
                      className={`cal-current-title cal-title-btn ${showMonthPicker ? 'open' : ''}`}
                      onClick={toggleMonthPicker}
                      aria-haspopup="dialog"
                      aria-expanded={showMonthPicker}
                      title="Elegir mes y año"
                    >
                      <CalendarIcon size={18} color="#FF6600" />
                      <span>
                        {currentView === 'week' && weekDaysList.length === 7
                          ? weekRangeLabel(weekDaysList[0].date, weekDaysList[6].date)
                          : `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                      </span>
                      <ChevronDown size={16} className="cal-title-caret" />
                    </button>

                    {showMonthPicker && (
                      <div className="cal-month-picker" role="dialog" aria-label="Elegir mes y año">
                        <div className="cal-month-picker-year">
                          <button type="button" onClick={() => setPickerYear(y => y - 1)} aria-label="Año anterior">
                            <ChevronLeft size={16} />
                          </button>
                          <span>{pickerYear}</span>
                          <button type="button" onClick={() => setPickerYear(y => y + 1)} aria-label="Año siguiente">
                            <ChevronRight size={16} />
                          </button>
                        </div>
                        <div className="cal-month-picker-grid">
                          {MONTH_NAMES.map((name, idx) => {
                            const now = new Date();
                            const isSelected = idx === currentDate.getMonth() && pickerYear === currentDate.getFullYear();
                            const isCurrent = idx === now.getMonth() && pickerYear === now.getFullYear();
                            return (
                              <button
                                key={name}
                                type="button"
                                className={`cal-month-picker-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                                onClick={() => handlePickMonth(idx)}
                              >
                                {name.substring(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          className="cal-month-picker-today"
                          onClick={() => { handleToday(); setShowMonthPicker(false); }}
                        >
                          Ir a hoy
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="cal-controls-right">
                {/* Filtros (atrasados, hoy, próximos, en red...) en un menú para no llenar la pantalla */}
                <div className="cal-filtro-wrap" ref={filtroRef}>
                  <button
                    type="button"
                    className={`cal-filtro-btn ${selectedFilter !== 'all' ? 'con-filtro' : ''} ${filtroAbierto ? 'abierto' : ''}`}
                    onClick={() => setFiltroAbierto(v => !v)}
                    aria-label={`Filtrar: ${filtroActual.label}`}
                    aria-haspopup="menu"
                    aria-expanded={filtroAbierto}
                  >
                    <SlidersHorizontal size={15} strokeWidth={2.4} />
                    <span>{filtroActual.key === 'all' ? 'Filtrar' : filtroActual.label}</span>
                    <span className="cal-filtro-count">{conteoFiltro[filtroActual.key]}</span>
                    <ChevronDown size={14} strokeWidth={2.6} />
                  </button>
                  {filtroAbierto && (
                    <div className="cal-filtro-menu" role="menu">
                      {filtrosVisibles.map(({ key, label, Icon, dot }) => (
                        <button
                          key={key}
                          type="button"
                          role="menuitemradio"
                          aria-checked={selectedFilter === key}
                          className={`cal-filtro-item ${selectedFilter === key ? 'on' : ''} ${key === 'overdue' && countOverdue > 0 ? 'alerta' : ''}`}
                          onClick={() => { setSelectedFilter(key); setFiltroAbierto(false); }}
                        >
                          {dot ? <span className={`legend-dot ${dot}`} /> : <span className="cal-filtro-dot-vacio" />}
                          <Icon size={15} strokeWidth={2.4} />
                          <span className="cal-filtro-label">{label}</span>
                          <span className="cal-filtro-num">{conteoFiltro[key]}</span>
                          {selectedFilter === key && <Check size={14} strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Solo lo asignado a mí (técnicos: el mercado también trae trabajos abiertos de otros) */}
                {isTechnician && (
                  <button
                    type="button"
                    className={`cal-mios-btn ${soloMios ? 'on' : ''}`}
                    onClick={() => setSoloMios(v => !v)}
                    aria-pressed={soloMios}
                    aria-label={`Ver solo lo asignado a mí (${countMios})`}
                    title={soloMios ? 'Ver todo' : 'Ver solo lo asignado a mí'}
                  >
                    {fotoUsuario && !fotoFallida
                      ? <img src={fotoUsuario} alt="" onError={() => setFotoFallida(true)} />
                      : <span>{memberInitials(user)}</span>}
                    <em className="cal-mios-cuenta">{countMios}</em>
                  </button>
                )}

                {/* Búsqueda rápida */}
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

                {/* Switcher de Vistas: Mes | Semana | Agenda */}
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

            {/* Contenedor Canvas del Calendario */}
            <div className="scheduler-canvas-card">
              {loading ? (
                <div className="cal-loading-container" style={{ padding: '60px', textAlign: 'center', color: '#cbd5e1' }}>
                  <div className="cal-spinner"></div>
                  <p style={{ fontWeight: 700, marginTop: '12px' }}>Cargando agenda de servicios...</p>
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
                        onClick={() => {
                          if (cell.events.length > 0) setDiaAbierto(cell.dateKey);
                        }}
                      >
                        <div className="cal-day-header">
                          <span className="cal-day-number">{cell.dayNumber}</span>
                          {cell.events.length > 0 && (
                            <span className="cal-day-count-badge">
                              {cell.events.length}
                            </span>
                          )}
                        </div>

                        {/* En celular el texto no cabe: un punto de color por evento (máx. 3) y "+N" */}
                        {cell.events.length > 0 && (
                          <div className="cal-day-dots" aria-hidden="true">
                            {cell.events.slice(0, 3).map(job => (
                              <span key={job.id} className="cal-day-dot" style={{ background: colorEvento(job) }} />
                            ))}
                            {cell.events.length > 3 && <span className="cal-day-more">+{cell.events.length - 3}</span>}
                          </div>
                        )}

                        <div className="cal-events-list">
                          {cell.events.map((job) => (
                            <div
                              key={job.id}
                              className={`cal-event-chip status-${job.statusType} timing-${job.timingCategory}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(job);
                              }}
                              title={`${job.titulo}\n${job.timingBadge}\nHorario: ${job.calendarTime}`}
                            >
                              <div className="chip-compact-row">
                                {job.timingCategory === 'overdue' && <span className="chip-mini-dot dot-overdue"></span>}
                                {job.timingCategory === 'today' && <span className="chip-mini-dot dot-today"></span>}
                                {job.timingCategory === 'future' && <span className="chip-mini-dot dot-future"></span>}
                                {job.timingCategory === 'uncoordinated' && <span className="chip-mini-dot dot-uncoordinated"></span>}
                                {job.timingCategory === 'completed' && <span className="chip-mini-dot dot-confirmed"></span>}
                                {job.timingCategory === 'network' && <span className="chip-mini-dot dot-network"></span>}

                                <span className="chip-compact-time">
                                  {job.hasScheduledDate ? job.calendarTime : <IconoEvento job={job} size={10} />}
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
                /* ── VISTA SEMANAL CON HORAS ── */
                <div className="cal-week-view-wrapper">
                  <div className="cal-week-header-row">
                    <div className="cal-header-cell cal-week-hour-head">HORA</div>
                    {weekDaysList.map((d, i) => (
                      <div key={i} className={`cal-week-day-header ${d.isToday ? 'is-today' : ''}`}>
                        <div className="cal-week-day-name">{d.dayName}</div>
                        <div className="cal-week-day-number">{d.dayNumber}</div>
                      </div>
                    ))}
                  </div>

                  <div className="cal-week-grid-body">
                    {/* Fila "Todo el día": trabajos sin fecha agendada (por coordinar o en red) */}
                    <div className="cal-week-time-label cal-week-allday-label">Todo el día</div>
                    {weekDaysList.map((d, dIdx) => (
                      <div key={`allday-${dIdx}`} className={`cal-week-slot-cell cal-week-allday-cell ${d.isToday ? 'is-today' : ''}`}>
                        {filteredEvents.filter(e => e.dateKey === d.dateKey && !e.scheduled_at).map(job => (
                          <div
                            key={job.id}
                            className={`week-event-card status-${job.statusType} timing-${job.timingCategory}`}
                            onClick={() => handleEventClick(job)}
                            title={job.titulo}
                          >
                            <div className="week-event-title">{job.titulo}</div>
                          </div>
                        ))}
                      </div>
                    ))}

                    {HOURS_LIST.map((hourLabel, hIdx) => {
                      const hourNum = 8 + hIdx;
                      const firstHour = 8;
                      const lastHour = 8 + HOURS_LIST.length - 1;
                      // Las citas fuera del rango visible se acomodan en la primera/última fila
                      const slotHour = (h) => Math.min(Math.max(h, firstHour), lastHour);
                      return (
                        <React.Fragment key={hIdx}>
                          <div className="cal-week-time-label">{hourLabel}</div>
                          {weekDaysList.map((d, dIdx) => {
                            const matchingEvents = filteredEvents.filter(
                              e => e.dateKey === d.dateKey && e.scheduled_at && slotHour(e.hourIndex) === hourNum
                            );
                            return (
                              <div key={dIdx} className={`cal-week-slot-cell ${d.isToday ? 'is-today' : ''}`}>
                                {matchingEvents.map(job => (
                                  <div
                                    key={job.id}
                                    className={`week-event-card status-${job.statusType} timing-${job.timingCategory}`}
                                    onClick={() => handleEventClick(job)}
                                    title={job.titulo}
                                  >
                                    <div className="week-event-time">
                                      <Clock size={10} /> {job.calendarTime}
                                      {job.timingCategory === 'overdue' && <Siren size={10} className="cal-ico" style={{ color: '#fca5a5' }} />}
                                    </div>
                                    <div className="week-event-title">
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
                /* ── VISTA DE AGENDA ── */
                <div className="cal-agenda-view">
                  {agendaGroupedEvents.length === 0 ? (
                    <div className="cal-empty-state">
                      <CalendarDays size={44} color="#64748b" />
                      <h4>No hay servicios próximos</h4>
                      <p>{isTechnician
                        ? 'No tienes visitas ni trabajos de hoy en adelante.'
                        : 'Publica una solicitud para que los técnicos te envíen cotizaciones y coordinen la cita.'}</p>
                    </div>
                  ) : (
                    agendaGroupedEvents.map((group) => (
                      <div key={group.key} className="agenda-day-group">
                        <div className={`agenda-date-header ${group.isOverdueGroup ? 'is-overdue-group' : ''}`}>
                          {group.isOverdueGroup
                            ? <AlertTriangle size={18} color="#ef4444" />
                            : group.isNetworkGroup
                              ? <Globe size={18} color="#3b82f6" />
                              : <CalendarDays size={18} color="#FF6600" />}
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
                                  <span className="agenda-card-subtitle">
                                    {job.equipo ? `Equipo: ${job.equipo}` : job.tipo}
                                  </span>
                                </div>
                                <span className={`agenda-status-pill pill-${job.statusType} pill-timing-${job.timingCategory}`}>
                                  <IconoEvento job={job} size={11} /> {job.timingBadge}
                                </span>
                              </div>

                              <div className="agenda-card-info">
                                <div className="agenda-info-row">
                                  <Clock size={13} color={job.timingCategory === 'overdue' ? '#ef4444' : '#ff6600'} />
                                  <strong>Horario:</strong> <span style={{ color: '#ffffff', fontWeight: 700 }}>{job.calendarTime}</span>
                                </div>
                                {job.descripcion && (
                                  <div className="agenda-info-row">
                                    <FileText size={13} color="#94a3b8" />
                                    <span style={{ color: '#cbd5e1' }}>{job.descripcion}</span>
                                  </div>
                                )}
                                <div className="agenda-info-row">
                                  <MapPin size={13} color="#94a3b8" />
                                  <span>{job.calle || job.zona}</span>
                                </div>
                                <div className="agenda-info-row">
                                  <User size={13} color="#94a3b8" />
                                  <span>Cliente: <strong>{job.cliente}</strong></span>
                                </div>
                                {job.assigned_tech_name && (
                                  <div className="agenda-info-row">
                                    <Wrench size={13} color="#38bdf8" />
                                    <span>Técnico: <strong style={{ color: '#38bdf8' }}>{job.assigned_tech_name}</strong></span>
                                  </div>
                                )}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(job);
                                  }}
                                >
                                  Ver Detalles
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

          {/* COLUMNA DERECHA: SIDEBAR */}
          <div className="cal-sidebar-col">

            {/* 1. Mini Calendario (solo PC) */}
            <div className="mini-calendar-card cal-solo-pc">
              <div className="mini-cal-header">
                <span className="mini-cal-title">
                  <CalendarIcon size={14} color="#38BDF8" style={{ display: 'inline', marginRight: '6px' }} />
                  Calendario Rápido
                </span>
              </div>
              <div className="mini-cal-sub-header">
                <span className="mini-cal-month-name">{MONTH_NAMES[miniCalDate.getMonth()]} {miniCalDate.getFullYear()}</span>
                <div className="mini-cal-arrows">
                  <button
                    type="button"
                    className="cal-mini-flecha"
                    title="Mes anterior"
                    aria-label="Mes anterior"
                    onClick={() => setMiniCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="cal-mini-flecha"
                    title="Mes siguiente"
                    aria-label="Mes siguiente"
                    onClick={() => setMiniCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="mini-cal-grid">
                {DAY_NAMES_MINI.map((d, i) => (
                  <div key={i} className="mini-day-name">{d}</div>
                ))}
                {miniCalMatrix.map((c, i) => (
                  <div
                    key={i}
                    className={`mini-day-cell ${!c.isCurrentMonth ? 'other-month' : ''} ${c.isToday ? 'is-today' : ''} ${c.hasEvents ? 'has-events' : ''}`}
                    onClick={() => {
                      if (c.isCurrentMonth) {
                        setCurrentDate(new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), c.dayNum));
                      }
                    }}
                  >
                    {c.dayNum}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Tarjeta "Up Next / Próximo Servicio" (solo PC) */}
            <div className="cal-solo-pc">
              <div className="sidebar-section-title">
                <span className="cal-ico-text"><Zap size={15} className="cal-ico" /> Próximo Servicio</span>
              </div>
              {tarjetaProximo}
            </div>

            {/* 3. Resumen Rápido de Actividad (solo PC) */}
            <div className="cal-solo-pc">
              <div className="sidebar-section-title">
                <span className="cal-ico-text"><ClipboardList size={15} className="cal-ico" /> Resumen de Citas ({countAll})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {networkJobs.slice(0, 4).map(renderResumenCita)}
              </div>
            </div>

          </div>

        </div>

        {/* Solo celular: hoja inferior con trabajos próximos y resumen de citas */}
        <HojaCitasMovil
          proximos={trabajosProximos}
          citas={networkJobs}
          tarjetaProximo={tarjetaProximo}
          renderCita={renderResumenCita}
        />

        {/* ── HOJA DEL DÍA: todo lo de una fecha, legible también en celular ── */}
        {diaAbierto && (() => {
          const eventosDia = filteredEvents
            .filter(e => e.dateKey === diaAbierto)
            .sort((a, b) => (a.hasScheduledDate === b.hasScheduledDate
              ? a.calendarDate - b.calendarDate
              : (a.hasScheduledDate ? 1 : -1)));
          const cerrarDia = () => setDiaAbierto(null);

          return createPortal(
            <div className="solutions-submodal-overlay nq-overlay" onClick={cerrarDia}>
              <div className="nq-window nq-light cal-dia-window" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="cal-dia-title">
                <div className="nq-header">
                  <span className="nq-header-badge" aria-hidden="true"><CalendarDays size={18} /></span>
                  <div className="nq-header-text">
                    <h3 id="cal-dia-title">{formatFechaLarga(diaAbierto)}</h3>
                    <p>{eventosDia.length} servicio{eventosDia.length === 1 ? '' : 's'}</p>
                  </div>
                  <button type="button" className="nq-close" onClick={cerrarDia} aria-label="Cerrar">
                    <X size={18} />
                  </button>
                </div>

                <div className="nq-body cal-dia-body">
                  {eventosDia.length === 0 ? (
                    <p className="cal-dia-empty">No hay servicios este día con el filtro actual.</p>
                  ) : (
                    <ul className="cal-dia-list">
                      {eventosDia.map(job => (
                        <li key={job.id}>
                          <button
                            type="button"
                            className="cal-dia-item"
                            style={{ '--ev-color': colorEvento(job) }}
                            onClick={() => { cerrarDia(); handleEventClick(job); }}
                          >
                            <span className="cal-dia-ico"><IconoEvento job={job} size={16} /></span>
                            <span className="cal-dia-main">
                              <span className="cal-dia-title">{job.titulo}</span>
                              {detalleEvento(job) && <span className="cal-dia-sub">{detalleEvento(job)}</span>}
                            </span>
                            <span className="cal-dia-time">{job.calendarTime}</span>
                            <ChevronRight size={16} className="cal-dia-chevron" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>,
            document.body
          );
        })()}

        {/* ─── DETALLE DE PUBLICACIÓN Y COTIZACIONES (mismo diseño y acciones que el mapa de la Red) ─── */}
        {showQuotesModal && selectedJobForQuotes && (
          <DetallePublicacionRed
            key={selectedJobForQuotes.id}
            job={selectedJobForQuotes}
            user={user}
            onClose={() => setShowQuotesModal(false)}
            onRefresh={fetchJobs}
            onCalificar={(job) => {
              const assignedQuote = job.cotizaciones_list?.find(q => q.is_assigned || q.status === 'accepted');
              const tech = assignedQuote?.technician || job.tecnico || {
                id: job.tecnico_id || assignedQuote?.technician_id,
                name: assignedQuote?.technicianName || 'Técnico Asignado'
              };
              setRatingTargetTech(tech);
              setRatingTargetJob(job);
              setShowRatingModal(true);
            }}
          />
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
    </div>,
    document.body
      )}
    </>
  );
};

export default ModalCalendarioCliente;
