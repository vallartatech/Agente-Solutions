import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';
import OneSignal from 'react-onesignal';
import '../../../styles/AgenteSolutions/Shared/CalendarioSolutions.css';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  PlusCircle,
  MessageCircle,
  Maximize2,
  Image as ImageIcon,
  FileText,
  X,
  Send,
  CheckCircle,
  Search,
  AlertTriangle,
  Wrench,
  ExternalLink,
  Save,
  Check,
  CalendarDays,
  Trash2,
  Bell,
  BellRing
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

const ModalCalendarioSolutions = ({ isOpen, onClose, onSelectJob }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const roleId = Number(user?.role_id ?? 0);
  const isAdmin = roleId === 0 || roleId === 1;
  const isTechnician = roleId === 2 || roleId === 6 || roleId === 8;
  const isClient = roleId === 3;

  // Estados del Calendario
  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalDate, setMiniCalDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month'); // 'month' | 'week' | 'agenda'
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'overdue' | 'today' | 'future' | 'uncoordinated' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [workOrdersList, setWorkOrdersList] = useState([]);
  const [noticesList, setNoticesList] = useState([]);
  const [birthdaysList, setBirthdaysList] = useState([]);
  const [tecnicosList, setTecnicosList] = useState([]);

  // Estados del Modal de Detalle
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  // Estados de Avisos del Equipo y Cumpleaños
  const [showCreateNoticeModal, setShowCreateNoticeModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [submittingNotice, setSubmittingNotice] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '',
    type: 'fumigacion',
    description: '',
    color: '#10b981',
    notify_team: true
  });

  // Estados de edición de Cita / Técnico (Admins)
  const [editTecnicoId, setEditTecnicoId] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [savingChanges, setSavingChanges] = useState(false);

  // Helper para procesar orden o servicio a un evento estándar de calendario
  const processOrderToEvent = useCallback((order, isDirectService = false) => {
    const rawScheduled = order.scheduled_at || order.scheduled_start || order.fecha_visita || null;
    const hasScheduledDate = Boolean(rawScheduled);

    let eventDate = rawScheduled ? new Date(rawScheduled) : (order.created_at ? new Date(order.created_at) : new Date());
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

    const normStatus = String(order.status || '').toLowerCase();
    const isCompleted = normStatus === 'terminado' || normStatus === 'listo' || normStatus === 'finalizado' || normStatus === 'completado';

    let timingCategory = 'uncoordinated';
    let timingBadge = '⏳ Por Coordinar';
    let timingRelative = 'Sin fecha agendada';
    let statusLabel = 'Horario Por Coordinar';
    let statusType = 'uncoordinated';

    if (isCompleted) {
      timingCategory = 'completed';
      timingBadge = '✓ Finalizado';
      timingRelative = 'Trabajo Concluido';
      statusLabel = 'Trabajo Terminado';
      statusType = 'confirmed';
    } else if (!hasScheduledDate) {
      timingCategory = 'uncoordinated';
      timingBadge = '⏳ Por Coordinar';
      timingRelative = 'Coordinación pendiente';
      statusLabel = '⏳ Horario Por Coordinar';
      statusType = 'uncoordinated';
    } else if (eventDate < todayStart) {
      const diffMs = todayStart.getTime() - eventDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      timingCategory = 'overdue';
      timingBadge = '🚨 Atrasada';
      timingRelative = `Atrasada por ${diffDays} día${diffDays > 1 ? 's' : ''}`;
      statusLabel = `⚠️ Cita Vencida (${diffDays}d)`;
      statusType = 'overdue';
    } else if (isToday) {
      timingCategory = 'today';
      timingBadge = '⚡ Hoy';
      timingRelative = `Hoy a las ${timeFormatted}`;
      statusLabel = `🔥 Cita Hoy (${timeFormatted})`;
      statusType = 'today';
    } else {
      const diffMs = eventDate.getTime() - todayEnd.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      timingCategory = 'future';
      timingBadge = '📅 Próxima';
      timingRelative = diffDays <= 7 ? `En ${diffDays} día${diffDays > 1 ? 's' : ''}` : `El ${eventDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;
      statusLabel = `En ${diffDays} día${diffDays > 1 ? 's' : ''} (${timeFormatted})`;
      statusType = 'future';
    }

    // Resolver técnico
    let assignedTechName = '';
    let techId = order.tecnico_id || order.assigned_to || null;
    if (order.tecnico) {
      assignedTechName = `${order.tecnico.first_name || ''} ${order.tecnico.last_name || ''}`.trim() || order.tecnico.name || '';
      techId = order.tecnico.id;
    } else if (order.technician) {
      assignedTechName = `${order.technician.first_name || ''} ${order.technician.last_name || ''}`.trim() || order.technician.name || '';
      techId = order.technician.id;
    } else if (order.technicians && order.technicians.length > 0) {
      const firstT = order.technicians[0];
      assignedTechName = `${firstT.first_name || ''} ${firstT.last_name || ''}`.trim() || firstT.name || '';
      techId = firstT.id;
    }

    // Resolver cliente
    let clientName = 'Cliente';
    let clientPhone = '';
    if (order.property?.client) {
      const c = order.property.client;
      clientName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || 'Cliente';
      clientPhone = c.phone || c.phone_number || '';
    } else if (order.client_name) {
      clientName = order.client_name;
    } else if (order.owner_name) {
      clientName = order.owner_name;
    }

    // Resolver fotos
    const facadePhoto = order.property?.facade_photo_path || order.property?.facade_photo || null;
    const fotos = Array.from(new Set([
      order.evidence_path,
      order.evidence_path_2,
      order.foto,
      facadePhoto
    ].filter(Boolean)));

    const titulo = order.title || (order.type 
      ? `${order.type}${order.equipment ? ' - ' + order.equipment : ''}` 
      : 'Servicio / Levantamiento');

    const calle = order.property?.address || order.full_address || 'Dirección de la propiedad';
    const zona = order.property?.property_name || order.zone || order.zona || 'Propiedad';

    const isNetworkJob = Boolean(order.publish_network == 1 || (order.networkQuotes && order.networkQuotes.length > 0));

    return {
      id: order.id,
      rawOrder: order,
      isDirectService,
      isNetworkJob,
      titulo,
      type: order.type || 'Servicio',
      equipment: order.equipment || order.item_affected || '',
      zone: zona,
      zona,
      calle,
      descripcion: limpiarDescripcion(order.description),
      status: order.status || 'Por Hacer',
      priority: order.priority || 'Normal',
      calendarDate: eventDate,
      dateKey,
      hourIndex,
      calendarHour: hourIndex,
      calendarTime: timeFormatted,
      scheduled_at: rawScheduled,
      hasScheduledDate,
      assigned_tech_name: assignedTechName,
      tecnico_id: techId,
      cliente: clientName,
      clientPhone,
      fotos,
      foto: fotos[0] || null,
      timingCategory,
      timingBadge,
      timingRelative,
      statusLabel,
      statusType,
      isOverdue: timingCategory === 'overdue',
      isToday: timingCategory === 'today',
      isFuture: timingCategory === 'future',
      isUncoordinated: timingCategory === 'uncoordinated',
      isCompleted: timingCategory === 'completed',
      cotizaciones_list: order.networkQuotes || order.cotizaciones_list || []
    };
  }, []);

  // Helper para procesar un aviso o evento a un objeto estándar de calendario
  const processNoticeToEvent = useCallback((notice) => {
    const dateStr = notice.event_date;
    const timeStr = notice.start_time ? notice.start_time.substring(0, 5) : 'Todo el día';
    const hourNum = notice.start_time ? parseInt(notice.start_time.split(':')[0], 10) : 9;

    let eventDate = new Date(`${dateStr}T${notice.start_time || '09:00:00'}`);
    if (isNaN(eventDate.getTime())) eventDate = new Date();

    const type = notice.type || 'aviso';
    let badge = '📢 Aviso';
    if (type === 'fumigacion') badge = '🐜 Fumigación';
    else if (type === 'reunion') badge = '👥 Reunión';
    else if (type === 'mantenimiento') badge = '🔧 Mantto.';
    else if (type === 'otro') badge = '📌 Evento';

    const now = new Date();
    const todayDateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return {
      id: `notice_${notice.id}`,
      noticeId: notice.id,
      isNotice: true,
      rawNotice: notice,
      titulo: notice.title,
      type: notice.type,
      color: notice.color || '#10b981',
      descripcion: notice.description || 'Sin notas adicionales',
      calendarDate: eventDate,
      dateKey: dateStr,
      hourIndex: hourNum,
      calendarHour: hourNum,
      calendarTime: timeStr,
      scheduled_at: notice.start_time ? `${dateStr} ${notice.start_time}` : null,
      hasScheduledDate: Boolean(notice.start_time),
      assigned_tech_name: '',
      cliente: notice.creator ? `${notice.creator.first_name || ''} ${notice.creator.last_name || ''}`.trim() : (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Administración'),
      creator: notice.creator || user,
      statusType: 'notice',
      timingCategory: 'notice',
      timingBadge: badge,
      timingRelative: badge,
      statusLabel: notice.title,
      isOverdue: false,
      isToday: dateStr === todayDateKey,
      isFuture: false,
      isUncoordinated: false,
      isCompleted: false,
    };
  }, [user]);

  // ── COMPUTAR allEvents REACTIVAMENTE (Evita re-fetch loops al navegar de mes o cerrar modales) ──
  const allEvents = useMemo(() => {
    const list = [...workOrdersList, ...noticesList];
    const currentYear = currentDate.getFullYear();
    const now = new Date();
    const todayDateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Proyectar cumpleaños en el año actual y adyacentes
    [currentYear - 1, currentYear, currentYear + 1].forEach(yr => {
      birthdaysList.forEach(bday => {
        const monthStr = String(bday.month).padStart(2, '0');
        const dayStr = String(bday.day).padStart(2, '0');
        const dateKey = `${yr}-${monthStr}-${dayStr}`;
        const bdayDate = new Date(yr, bday.month - 1, bday.day, 9, 0, 0);

        list.push({
          id: `bday_${bday.user_id}_${yr}`,
          isBirthday: true,
          bdayUser: bday,
          titulo: `🎂 Cumpleaños de ${bday.name}`,
          type: 'cumpleanos',
          color: '#ec4899',
          descripcion: `¡Hoy es el cumpleaños de ${bday.name}! Felicitaciones del equipo Agente Solutions.`,
          calendarDate: bdayDate,
          dateKey,
          hourIndex: 9,
          calendarHour: 9,
          calendarTime: 'Todo el día',
          scheduled_at: null,
          hasScheduledDate: false,
          assigned_tech_name: '',
          cliente: bday.name,
          statusType: 'birthday',
          timingCategory: 'birthday',
          timingBadge: '🎂 Cumpleaños',
          timingRelative: `Cumpleaños de ${bday.name}`,
          statusLabel: `🎂 ${bday.name}`,
          isOverdue: false,
          isToday: dateKey === todayDateKey,
          isFuture: false,
          isUncoordinated: false,
          isCompleted: false,
        });
      });
    });

    return list;
  }, [workOrdersList, noticesList, birthdaysList, currentDate]);

  // Carga de datos para Admin y Técnicos de Solutions (Sin ecosistema externo de Agente Market)
  const fetchSolutionsData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [resWorkOrders, resTecnicos, resTecServicios, resEvents, resBirthdays] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/work-orders/all`, { headers }).catch(e => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios/tecnicos`, { headers }).catch(e => ({ data: [] })),
        (isTechnician && user?.id)
          ? axios.get(`${import.meta.env.VITE_API_BASE_URL}/tecnico/${user.id}/servicios`, { headers }).catch(e => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/calendar/events`, { headers }).catch(e => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/calendar/birthdays`, { headers }).catch(e => ({ data: [] }))
      ]);

      const rawOrders = Array.isArray(resWorkOrders.data) ? resWorkOrders.data : [];
      const rawTechs = Array.isArray(resTecnicos.data) ? resTecnicos.data : [];
      setTecnicosList(rawTechs);

      const teamTechIds = new Set(rawTechs.map(t => Number(t.id)));
      const eventMap = new Map();

      // 1. Procesar todas las Work Orders internas de Solutions (excluyendo el otro ecosistema de Agente Market)
      rawOrders.forEach(wo => {
        const isMarketBroadcast = Boolean(
          wo.publish_network == 1 ||
          wo.publish_network === true ||
          wo.is_from_network ||
          wo.is_network_service
        );

        // Si es publicación al mercado abierto de la red freelance, solo incluirla si nuestro técnico o admin interactuó
        if (isMarketBroadcast) {
          const hasOurTech = wo.tecnico_id && teamTechIds.has(Number(wo.tecnico_id));
          const hasOurTechInList = wo.technicians && wo.technicians.some(t => teamTechIds.has(Number(t.id)));
          const isCreatedByMe = Number(wo.user_id) === Number(user?.id) || Number(wo.created_by) === Number(user?.id);
          if (!hasOurTech && !hasOurTechInList && !isCreatedByMe) {
            return;
          }
        }

        // Si el usuario tiene tenant_id (e.g. Raúl Rivera tenant 15), descartar de otros tenants externos
        if (user?.tenant_id) {
          const myTenant = Number(user.tenant_id);
          const orderTenant = wo.tenant_id ? Number(wo.tenant_id) : null;
          const propTenant = wo.property?.tenant_id ? Number(wo.property.tenant_id) : null;
          if (orderTenant && orderTenant !== myTenant && propTenant !== myTenant) {
            return;
          }
        } else if (isAdmin) {
          // Si es ROOT (rol 0) o tenant null, descartar órdenes pertenecientes a otros tenants externos de marketplace (6, 13) si no tienen técnico nuestro
          if (wo.tenant_id && [6, 13].includes(Number(wo.tenant_id)) && !wo.tecnico_id) {
            return;
          }
        }

        // Si es técnico de Solutions, solo las que le corresponden
        if (isTechnician && !isAdmin) {
          const isAssignedToMe = Number(wo.tecnico_id) === Number(user?.id) || 
            (wo.technicians && wo.technicians.some(t => Number(t.id) === Number(user?.id)));
          if (!isAssignedToMe) return;
        }

        const ev = processOrderToEvent(wo, false);
        eventMap.set(`wo_${ev.id}`, ev);
      });

      // 2. Si hay servicios del técnico de la ruta /tecnico/{id}/servicios
      if (resTecServicios && Array.isArray(resTecServicios.data)) {
        resTecServicios.data.forEach(srv => {
          const key = `wo_${srv.id}`;
          if (!eventMap.has(key)) {
            const ev = processOrderToEvent(srv, true);
            eventMap.set(key, ev);
          }
        });
      }

      setWorkOrdersList(Array.from(eventMap.values()));

      // 3. Procesar Avisos / Eventos del Calendario
      const rawNotices = Array.isArray(resEvents.data) ? resEvents.data : [];
      const noticesArr = rawNotices.map(notice => processNoticeToEvent(notice));
      setNoticesList(noticesArr);

      // 4. Cumpleaños
      const rawBirthdays = Array.isArray(resBirthdays.data) ? resBirthdays.data : [];
      setBirthdaysList(rawBirthdays);

      // Si había un trabajo seleccionado, actualizarlo funcionalmente
      setSelectedJob(prev => {
        if (!prev) return null;
        const allCurrent = [...Array.from(eventMap.values()), ...noticesArr];
        const updated = allCurrent.find(e => e.id === prev.id);
        return updated || prev;
      });

      setHasLoadedOnce(true);
    } catch (err) {
      console.error("Error cargando eventos en ModalCalendarioSolutions:", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isTechnician, user?.id, user?.tenant_id, processOrderToEvent, processNoticeToEvent]);

  useEffect(() => {
    if (isOpen) {
      fetchSolutionsData(hasLoadedOnce);
    }
  }, [isOpen]);

  // Selección de día / navegación
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setMiniCalDate(now);
  };

  // Abrir detalle de evento de trabajo
  const handleOpenDetailModal = (job) => {
    setSelectedJob(job);
    setActivePhoto(job.fotos?.[0] || job.foto || null);
    setEditTecnicoId(job.tecnico_id || '');
    setEditScheduledAt(job.scheduled_at ? job.scheduled_at.substring(0, 16) : '');
    setShowDetailModal(true);
  };

  const handleEventClick = (job) => {
    if (job.isBirthday) {
      Swal.fire({
        title: `🎂 ¡Cumpleaños de ${job.bdayUser.name}!`,
        html: `
          <div style="text-align: center; font-size: 0.95rem; color: #334155; padding: 10px 0;">
            ${job.bdayUser.profile_picture ? `<img src="${job.bdayUser.profile_picture}" alt="${job.bdayUser.name}" style="width: 84px; height: 84px; border-radius: 50%; object-fit: cover; margin: 0 auto 14px; border: 3px solid #ec4899; box-shadow: 0 4px 14px rgba(236,72,153,0.35); display: block;" />` : ''}
            <div style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${job.bdayUser.name}</div>
            <div style="color: #64748b; font-weight: 600; margin-bottom: 14px;">${job.bdayUser.role_id === 1 ? '👑 Administrador' : '🛠️ Técnico Especialista'}</div>
            <div style="background: #fdf2f8; border: 1.5px solid #fbcfe8; border-radius: 12px; padding: 12px; color: #be185d; font-weight: 700; font-size: 0.92rem;">
              🎉 ¡Felicitemos a nuestro compañero de equipo en su día especial!
            </div>
          </div>
        `,
        confirmButtonText: '¡Felicidades!',
        confirmButtonColor: '#ec4899'
      });
      return;
    }

    if (job.isNotice) {
      setSelectedNotice(job);
      return;
    }

    if (onSelectJob) {
      onSelectJob(job);
      return;
    }
    handleOpenDetailModal(job);
  };

  // Gestión de Avisos y Fumigaciones
  const handleOpenCreateNotice = (customDate = null) => {
    setNoticeForm({
      title: '',
      event_date: customDate || new Date().toISOString().split('T')[0],
      start_time: '',
      type: 'fumigacion',
      description: '',
      color: '#10b981',
      notify_team: true
    });
    setShowCreateNoticeModal(true);
  };

  const handleCreateNotice = async (e) => {
    if (e) e.preventDefault();
    if (!noticeForm.title.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Título requerido',
        text: 'Por favor ingresa un título para el aviso o fumigación.'
      });
      return;
    }
    if (!noticeForm.event_date) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha requerida',
        text: 'Por favor selecciona la fecha del evento.'
      });
      return;
    }

    try {
      setSubmittingNotice(true);
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const payload = {
        title: noticeForm.title.trim(),
        event_date: noticeForm.event_date,
        start_time: noticeForm.start_time || null,
        type: noticeForm.type,
        description: noticeForm.description?.trim() || null,
        color: noticeForm.color,
        notify_team: noticeForm.notify_team
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/calendar/events`,
        payload,
        { headers }
      );

      if (res.status === 200 || res.status === 201 || res.data?.success) {
        const savedEvent = res.data?.event || {
          ...payload,
          id: Date.now(),
          creator: user
        };
        const newNoticeEvent = processNoticeToEvent(savedEvent);

        // Actualización optimista inmediata: aparece al instante en el calendario (0ms)
        setNoticesList(prev => [newNoticeEvent, ...prev.filter(n => n.noticeId !== newNoticeEvent.noticeId)]);
        setShowCreateNoticeModal(false);

        Swal.fire({
          icon: 'success',
          title: '¡Aviso Publicado!',
          text: noticeForm.notify_team
            ? 'El evento se guardó en el calendario y se envió la notificación push al equipo.'
            : 'El evento se ha guardado correctamente en el calendario.',
          timer: 2200,
          showConfirmButton: false
        });

        // Sincronización silenciosa en background sin bloquear la interfaz
        fetchSolutionsData(true);
      }
    } catch (err) {
      console.error("Error al crear aviso de calendario:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error al publicar',
        text: err.response?.data?.error || err.response?.data?.message || 'No se pudo crear el aviso.'
      });
    } finally {
      setSubmittingNotice(false);
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar este aviso?',
      text: 'Esta acción no se puede deshacer y retirará el aviso del calendario.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    try {
      // Remoción optimista inmediata del calendario
      setNoticesList(prev => prev.filter(n => n.noticeId !== noticeId));
      setSelectedNotice(null);

      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/calendar/events/${noticeId}`,
        { headers }
      );

      if (res.status === 200 || res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Aviso Eliminado',
          timer: 1600,
          showConfirmButton: false
        });
        fetchSolutionsData(true);
      }
    } catch (err) {
      console.error("Error al eliminar aviso:", err);
      // Si falló, resincronizar
      fetchSolutionsData(true);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || 'No se pudo eliminar el aviso.'
      });
    }
  };

  // Guardar asignación y horario para Admins
  const handleSaveAssignment = async () => {
    if (!selectedJob) return;
    try {
      setSavingChanges(true);
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const payload = {};
      if (editTecnicoId) {
        payload.tecnico_id = Number(editTecnicoId);
      }
      if (editScheduledAt) {
        payload.scheduled_at = editScheduledAt;
      }

      const res = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/work-orders/${selectedJob.id}/assign`,
        payload,
        { headers }
      );

      if (res.status === 200 || res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Cita y Técnico Actualizados',
          text: 'Los cambios se han guardado exitosamente en el calendario.',
          timer: 2000,
          showConfirmButton: false
        });
        await fetchSolutionsData();
      }
    } catch (err) {
      console.error("Error al guardar asignación de orden:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error al actualizar',
        text: err.response?.data?.message || 'No se pudo guardar la asignación.'
      });
    } finally {
      setSavingChanges(false);
    }
  };

  // Filtrado de eventos
  const filteredEvents = useMemo(() => {
    let result = [...allEvents];

    if (selectedFilter === 'notices') result = result.filter(e => e.isNotice);
    else if (selectedFilter === 'birthdays') result = result.filter(e => e.isBirthday);
    else if (selectedFilter === 'overdue') result = result.filter(e => e.isOverdue && !e.isNotice && !e.isBirthday);
    else if (selectedFilter === 'today') result = result.filter(e => e.isToday);
    else if (selectedFilter === 'future') result = result.filter(e => e.isFuture && !e.isNotice && !e.isBirthday);
    else if (selectedFilter === 'uncoordinated') result = result.filter(e => e.isUncoordinated && !e.isNotice && !e.isBirthday);
    else if (selectedFilter === 'completed') result = result.filter(e => e.isCompleted && !e.isNotice && !e.isBirthday);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.titulo?.toLowerCase().includes(q) ||
        e.cliente?.toLowerCase().includes(q) ||
        e.calle?.toLowerCase().includes(q) ||
        e.zona?.toLowerCase().includes(q) ||
        e.assigned_tech_name?.toLowerCase().includes(q) ||
        e.descripcion?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allEvents, selectedFilter, searchQuery]);

  // Contadores
  const countAll = allEvents.length;
  const countNotices = allEvents.filter(e => e.isNotice).length;
  const countBirthdays = allEvents.filter(e => e.isBirthday && e.calendarDate.getFullYear() === currentDate.getFullYear()).length;
  const countOverdue = allEvents.filter(e => e.isOverdue).length;
  const countToday = allEvents.filter(e => e.isToday).length;
  const countFuture = allEvents.filter(e => e.isFuture).length;
  const countUncoordinated = allEvents.filter(e => e.isUncoordinated).length;

  // Próximo servicio destacado (Up Next)
  const upNextJob = useMemo(() => {
    const overdue = allEvents.filter(e => e.isOverdue).sort((a, b) => a.calendarDate - b.calendarDate);
    if (overdue.length > 0) return overdue[0];

    const today = allEvents.filter(e => e.isToday && !e.isCompleted).sort((a, b) => a.calendarDate - b.calendarDate);
    if (today.length > 0) return today[0];

    const future = allEvents.filter(e => e.isFuture).sort((a, b) => a.calendarDate - b.calendarDate);
    if (future.length > 0) return future[0];

    return null;
  }, [allEvents]);

  // Matriz de días del mes (ARRAY PLANO idéntico a CalendarioCliente)
  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cells = [];

    // Días del mes previo
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

    // Días del mes actual
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

    // Días del mes siguiente para completar la cuadrícula de 7 columnas
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

  // Días de la semana para vista 'week'
  const weekDaysList = useMemo(() => {
    const current = new Date(currentDate);
    const dayOfWeek = current.getDay();
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - dayOfWeek);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const days = [];
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

  // Mini calendario matrix
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
        hasEvents: allEvents.some(j => j.dateKey === dateKey)
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
        hasEvents: allEvents.some(j => j.dateKey === dateKey)
      });
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({
        dayNum: i,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        hasEvents: allEvents.some(j => j.dateKey === dateKey)
      });
    }

    return cells;
  }, [miniCalDate, allEvents]);

  if (!isOpen) return null;

  return createPortal(
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
                Gestión interactiva de citas, visitas técnicas y servicios coordinados de Agente Solutions.
              </span>
            </div>
          </div>

          <div className="modal-cal-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {isAdmin && (
              <>
                <button 
                  className="btn-modal-quick-notice"
                  onClick={() => handleOpenCreateNotice()}
                  title="Publicar Aviso, Fumigación o Evento para el equipo"
                >
                  <PlusCircle size={15} />
                  <span className="btn-modal-quick-notice-text">
                    <span className="btn-text-full">+ Publicar Aviso</span>
                    <span className="btn-text-short">+ Aviso</span>
                  </span>
                </button>

                <button 
                  className="btn-modal-quick-new"
                  onClick={() => {
                    onClose();
                    navigate('/tablero-servicios');
                  }}
                  title="Gestionar en Tablero de Servicios"
                >
                  <CalendarDays size={15} />
                  <span className="btn-modal-quick-new-text">
                    <span className="btn-text-full">Tablero Servicios</span>
                    <span className="btn-text-short">Tablero</span>
                  </span>
                </button>
              </>
            )}
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

                <div className="cal-arrows">
                  <button className="btn-cal-arrow" onClick={handlePrevMonth} title="Mes anterior">
                    <ChevronLeft size={18} />
                  </button>
                  <button className="btn-cal-arrow" onClick={handleNextMonth} title="Mes siguiente">
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="cal-current-title">
                  <CalendarIcon size={18} color="#FF6600" />
                  <span>{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                </div>
              </div>

              <div className="cal-controls-right">
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
                className={`legend-item legend-notice ${selectedFilter === 'notices' ? 'active' : ''}`}
                onClick={() => setSelectedFilter(selectedFilter === 'notices' ? 'all' : 'notices')}
                title="Avisos generales, fumigaciones y eventos del equipo"
              >
                <span className="legend-dot dot-notice"></span>
                <span>📢 Avisos ({countNotices})</span>
              </button>

              <button 
                className={`legend-item legend-birthday ${selectedFilter === 'birthdays' ? 'active' : ''}`}
                onClick={() => setSelectedFilter(selectedFilter === 'birthdays' ? 'all' : 'birthdays')}
                title="Cumpleaños detectados de administradores y técnicos"
              >
                <span className="legend-dot dot-birthday"></span>
                <span>🎂 Cumpleaños ({countBirthdays})</span>
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
                title="Citas y avisos programados para el día de hoy"
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
                <span>📅 Próximos {countFuture > 0 ? `(${countFuture})` : '(0)'}</span>
              </button>

              <button 
                className={`legend-item legend-uncoordinated ${selectedFilter === 'uncoordinated' ? 'active' : ''}`}
                onClick={() => setSelectedFilter(selectedFilter === 'uncoordinated' ? 'all' : 'uncoordinated')}
                title="Trabajos asignados sin fecha definida"
              >
                <span className="legend-dot dot-uncoordinated"></span>
                <span>⏳ Por Coordinar {countUncoordinated > 0 ? `(${countUncoordinated})` : '(0)'}</span>
              </button>
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
                          if (cell.events.length > 0) {
                            handleEventClick(cell.events[0]);
                          } else if (isAdmin) {
                            handleOpenCreateNotice(cell.dateKey);
                          }
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

                        <div className="cal-events-list">
                          {cell.events.map((job) => (
                            <div 
                              key={job.id}
                              className={`cal-event-chip status-${job.statusType} timing-${job.timingCategory}`}
                              style={job.isNotice ? { borderLeftColor: job.color, background: `${job.color}25` } : (job.isBirthday ? { borderLeftColor: '#ec4899', background: 'rgba(236,72,153,0.25)' } : {})}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(job);
                              }}
                              title={`${job.titulo}\n${job.timingBadge}\nHorario: ${job.calendarTime}`}
                            >
                              <div className="chip-compact-row">
                                {job.isBirthday ? (
                                  <span style={{ fontSize: '0.72rem', lineHeight: 1 }}>🎂</span>
                                ) : job.isNotice ? (
                                  <span style={{ fontSize: '0.72rem', lineHeight: 1 }}>
                                    {job.type === 'fumigacion' ? '🐜' : (job.type === 'reunion' ? '👥' : (job.type === 'mantenimiento' ? '🔧' : '📢'))}
                                  </span>
                                ) : (
                                  <>
                                    {job.timingCategory === 'overdue' && <span className="chip-mini-dot dot-overdue"></span>}
                                    {job.timingCategory === 'today' && <span className="chip-mini-dot dot-today"></span>}
                                    {job.timingCategory === 'future' && <span className="chip-mini-dot dot-future"></span>}
                                    {job.timingCategory === 'uncoordinated' && <span className="chip-mini-dot dot-uncoordinated"></span>}
                                    {job.timingCategory === 'completed' && <span className="chip-mini-dot dot-confirmed"></span>}
                                  </>
                                )}

                                <span className="chip-compact-time" style={job.isBirthday ? { color: '#fbcfe8' } : (job.isNotice ? { color: job.color } : {})}>
                                  {job.hasScheduledDate ? job.calendarTime : (job.isBirthday || job.isNotice ? '📌' : '⏳')}
                                </span>
                                <span className="chip-compact-title" style={job.isBirthday ? { color: '#fdf2f8' } : {}}>
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
                      const hourNum = 8 + hIdx;
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
                                    style={job.isNotice ? { borderLeftColor: job.color, background: `${job.color}25` } : (job.isBirthday ? { borderLeftColor: '#ec4899', background: 'rgba(236,72,153,0.25)' } : {})}
                                    onClick={() => handleEventClick(job)}
                                  >
                                    <div style={{ fontWeight: 800, fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      {job.isBirthday ? '🎂' : (job.isNotice ? (job.type === 'fumigacion' ? '🐜' : '📢') : <Clock size={10} />)} {job.calendarTime}
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
                /* ── VISTA DE AGENDA ── */
                <div className="cal-agenda-view">
                  {agendaGroupedEvents.length === 0 ? (
                    <div className="cal-empty-state">
                      <CalendarDays size={44} color="#64748b" />
                      <h4>No hay servicios en esta fecha</h4>
                      <p>No se encontraron visitas técnicas ni órdenes programadas para este periodo.</p>
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
                              style={job.isNotice ? { borderLeft: `4px solid ${job.color}`, background: 'rgba(15, 23, 42, 0.65)' } : (job.isBirthday ? { borderLeft: '4px solid #ec4899', background: 'rgba(236,72,153,0.1)' } : {})}
                              onClick={() => handleEventClick(job)}
                            >
                              <div className="agenda-card-top">
                                <div>
                                  <h4 className="agenda-card-title">{job.titulo}</h4>
                                  <span className="agenda-card-subtitle">
                                    {job.isBirthday ? 'Día de Cumpleaños' : (job.isNotice ? (job.type === 'fumigacion' ? 'Fumigación de Instalaciones' : 'Aviso al Equipo') : (job.equipment ? `Equipo: ${job.equipment}` : job.type))}
                                  </span>
                                </div>
                                <span 
                                  className={`agenda-status-pill pill-${job.statusType} pill-timing-${job.timingCategory}`}
                                  style={job.isNotice ? { background: `${job.color}30`, color: job.color } : (job.isBirthday ? { background: 'rgba(236,72,153,0.25)', color: '#f472b6' } : {})}
                                >
                                  {job.timingBadge}
                                </span>
                              </div>

                              <div className="agenda-card-info">
                                <div className="agenda-info-row">
                                  <Clock size={13} color={job.isBirthday ? '#ec4899' : (job.isNotice ? job.color : (job.timingCategory === 'overdue' ? '#ef4444' : '#ff6600'))} />
                                  <strong>Horario:</strong> <span style={{ color: '#ffffff', fontWeight: 700 }}>{job.calendarTime}</span>
                                </div>
                                {job.descripcion && (
                                  <div className="agenda-info-row">
                                    <FileText size={13} color="#94a3b8" />
                                    <span style={{ color: '#cbd5e1' }}>{job.descripcion}</span>
                                  </div>
                                )}
                                {!job.isNotice && !job.isBirthday && (
                                  <>
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
                                  </>
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
                                  {job.isBirthday ? 'Ver Cumpleañero' : (job.isNotice ? 'Ver Aviso' : 'Ver Detalles')}
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
            
            {/* 1. Mini Calendario */}
            <div className="mini-calendar-card">
              <div className="mini-cal-header">
                <span className="mini-cal-title">
                  <CalendarIcon size={14} color="#38BDF8" style={{ display: 'inline', marginRight: '6px' }} />
                  Calendario Rápido
                </span>
              </div>
              <div className="mini-cal-sub-header">
                <span className="mini-cal-month-name">{MONTH_NAMES[miniCalDate.getMonth()]} {miniCalDate.getFullYear()}</span>
                <div className="mini-cal-arrows">
                  <button onClick={() => setMiniCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setMiniCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                    <ChevronRight size={14} />
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
                    <div>🧑‍💼 {upNextJob.cliente || 'Cliente'}</div>
                    {upNextJob.assigned_tech_name && (
                      <div>🧑‍🔧 Técnico: {upNextJob.assigned_tech_name}</div>
                    )}
                    <div style={{ color: upNextJob.timingCategory === 'overdue' ? '#fca5a5' : '#fdba74', fontWeight: 800, fontSize: '0.76rem' }}>
                      📅 {upNextJob.timingRelative}
                    </div>
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
              )}
            </div>

            {/* 3. Resumen Rápido de Actividad */}
            <div>
              <div className="sidebar-section-title">
                <span>📋 Resumen de Citas ({countAll})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allEvents.slice(0, 4).map((job) => (
                  <div 
                    key={job.id}
                    className="sidebar-summary-card"
                    style={{
                      borderLeft: `3.5px solid ${job.timingCategory === 'overdue' ? '#ef4444' : (job.timingCategory === 'today' ? '#ff6600' : (job.timingCategory === 'future' ? '#06b6d4' : '#f59e0b'))}`
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

        {/* ─── MODAL DE DETALLE Y GESTIÓN DE ORDEN DE TRABAJO ─── */}
        {showDetailModal && selectedJob && (
          <div 
            className="mercado-modal-overlay" 
            style={{ zIndex: 1000000000 }}
            onClick={(e) => e.target === e.currentTarget && setShowDetailModal(false)}
          >
            <div className="mercado-premium-modal" style={{ maxWidth: '980px', width: '95%' }}>
              <div className="mercado-premium-header">
                <h2>📋 Detalle de Orden de Trabajo #{selectedJob.id}</h2>
                <button className="mercado-modal-close" onClick={() => setShowDetailModal(false)} aria-label="Cerrar modal">
                  <X size={18} />
                </button>
              </div>

              <div className="mercado-premium-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '24px' }}>
                
                {/* LADO IZQUIERDO: DETALLES Y FOTOS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedJob.fotos && selectedJob.fotos.length > 0 ? (
                    <div>
                      <div 
                        className="mercado-main-photo-wrapper"
                        onClick={() => setIsPhotoZoomed(true)}
                        style={{ height: '240px', borderRadius: '16px', overflow: 'hidden', cursor: 'zoom-in' }}
                      >
                        <img 
                          src={activePhoto || selectedJob.fotos[0]} 
                          alt="Evidencia" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      {selectedJob.fotos.length > 1 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          {selectedJob.fotos.map((f, i) => (
                            <img 
                              key={i} 
                              src={f} 
                              alt="thumb" 
                              onClick={() => setActivePhoto(f)}
                              style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: activePhoto === f ? '2px solid #f97316' : '1px solid #ddd' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ height: '160px', background: '#f1f5f9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '8px' }}>
                      <ImageIcon size={36} />
                      <span>Sin fotografías adjuntas</span>
                    </div>
                  )}

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedJob.titulo}
                    </h3>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#475569' }}>
                      {selectedJob.descripcion}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#334155' }}>
                      <div>📍 <strong>Propiedad:</strong> {selectedJob.zona}</div>
                      <div>🏠 <strong>Dirección:</strong> {selectedJob.calle}</div>
                      <div>🧑‍💼 <strong>Cliente:</strong> {selectedJob.cliente} {selectedJob.clientPhone ? `(${selectedJob.clientPhone})` : ''}</div>
                      <div>⚡ <strong>Prioridad:</strong> {selectedJob.priority}</div>
                    </div>
                  </div>
                </div>

                {/* LADO DERECHO: GESTIÓN DE CITAS Y TÉCNICO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div className="solutions-wo-card">
                    <div className="solutions-wo-header">
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Estado de la Orden</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{selectedJob.status}</div>
                      </div>
                      <span className="solutions-wo-status-badge" style={{
                        background: selectedJob.isCompleted ? '#dcfce7' : (selectedJob.isOverdue ? '#fee2e2' : '#ffedd5'),
                        color: selectedJob.isCompleted ? '#166534' : (selectedJob.isOverdue ? '#991b1b' : '#9a3412')
                      }}>
                        {selectedJob.timingBadge}
                      </span>
                    </div>

                    {/* Formulario de Asignación de Técnico */}
                    <div className="solutions-wo-field-group">
                      <label className="solutions-wo-field-label">Técnico Asignado</label>
                      {isAdmin ? (
                        <select 
                          className="solutions-wo-input"
                          value={editTecnicoId}
                          onChange={(e) => setEditTecnicoId(e.target.value)}
                        >
                          <option value="">-- Sin técnico asignado --</option>
                          {tecnicosList.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.first_name} {t.last_name || ''} ({t.email})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                          🧑‍🔧 {selectedJob.assigned_tech_name || 'Sin asignar'}
                        </div>
                      )}
                    </div>

                    {/* Fecha y Hora de la Cita */}
                    <div className="solutions-wo-field-group">
                      <label className="solutions-wo-field-label">Fecha y Hora Programada</label>
                      {isAdmin ? (
                        <input 
                          type="datetime-local"
                          className="solutions-wo-input"
                          value={editScheduledAt}
                          onChange={(e) => setEditScheduledAt(e.target.value)}
                        />
                      ) : (
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                          📅 {selectedJob.hasScheduledDate ? new Date(selectedJob.scheduled_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' }) : 'Horario Por Coordinar'}
                        </div>
                      )}
                    </div>

                    {/* Botón de Guardar para Admin */}
                    {isAdmin && (
                      <div style={{ marginTop: '10px' }}>
                        <button 
                          className="solutions-btn-primary"
                          onClick={handleSaveAssignment}
                          disabled={savingChanges}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <Save size={16} />
                          <span>{savingChanges ? 'Guardando...' : 'Guardar Horario y Técnico'}</span>
                        </button>
                      </div>
                    )}

                    {/* Acciones para Técnico */}
                    {isTechnician && (
                      <div className="solutions-wo-actions">
                        <button 
                          className="solutions-btn-primary"
                          onClick={() => {
                            setShowDetailModal(false);
                            onClose();
                            navigate(`/trabajo-propiedad/${selectedJob.id}`);
                          }}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <Wrench size={16} />
                          <span>Ir al Trabajo y Realizar Servicio</span>
                        </button>
                      </div>
                    )}

                    {/* Ir a tablero */}
                    <div style={{ marginTop: '8px' }}>
                      <button 
                        className="solutions-btn-secondary"
                        onClick={() => {
                          setShowDetailModal(false);
                          onClose();
                          navigate(isAdmin ? '/tablero-servicios' : '/trabajos-tecnico');
                        }}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <ExternalLink size={16} />
                        <span>Abrir en Tablero Completo</span>
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            </div>
          </div>
        )}

        {/* Modal de Zoom de Foto */}
        {isPhotoZoomed && activePhoto && (
          <div 
            className="mercado-photo-zoom-overlay" 
            style={{ position: 'fixed', inset: 0, zIndex: 1000000050, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setIsPhotoZoomed(false)}
          >
            <img 
              src={activePhoto} 
              alt="Zoom" 
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} 
            />
          </div>
        )}

        {/* ── MODAL SUBMODAL: CREAR AVISO O FUMIGACIÓN ── */}
        {showCreateNoticeModal && (
          <div 
            className="solutions-submodal-overlay"
            onClick={() => setShowCreateNoticeModal(false)}
          >
            <div 
              className="solutions-submodal-window"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="submodal-header">
                <div className="submodal-title-row">
                  <div className="submodal-icon-badge" style={{ background: noticeForm.color }}>
                    <CalendarDays size={20} color="#ffffff" />
                  </div>
                  <div>
                    <h3>Publicar Aviso o Evento</h3>
                    <p>Se mostrará en el calendario de todo el equipo (Admins y Técnicos)</p>
                  </div>
                </div>
                <button 
                  className="btn-submodal-close"
                  onClick={() => setShowCreateNoticeModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateNotice}>
                <div className="submodal-body">
                  {/* Tipo de Evento */}
                  <div className="notice-field">
                    <label>Tipo de Evento</label>
                    <div className="notice-type-grid">
                      {[
                        { key: 'fumigacion', label: '🐜 Fumigación', color: '#10b981' },
                        { key: 'aviso', label: '📢 Aviso', color: '#f97316' },
                        { key: 'reunion', label: '👥 Reunión', color: '#3b82f6' },
                        { key: 'mantenimiento', label: '🔧 Mantto.', color: '#8b5cf6' },
                        { key: 'otro', label: '📌 Otro', color: '#06b6d4' }
                      ].map(t => (
                        <button
                          key={t.key}
                          type="button"
                          className={`notice-type-pill ${noticeForm.type === t.key ? 'active' : ''}`}
                          onClick={() => setNoticeForm(prev => ({ ...prev, type: t.key, color: t.color }))}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Título */}
                  <div className="notice-field">
                    <label>Título del Evento *</label>
                    <input 
                      type="text"
                      className="notice-input"
                      placeholder="Ej: Fumigación general de oficinas, Junta técnica..."
                      value={noticeForm.title}
                      onChange={(e) => setNoticeForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Fecha y Hora */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="notice-field">
                      <label>Fecha del Evento *</label>
                      <input 
                        type="date"
                        className="notice-input"
                        value={noticeForm.event_date}
                        onChange={(e) => setNoticeForm(prev => ({ ...prev, event_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="notice-field">
                      <label>Hora (Opcional)</label>
                      <input 
                        type="time"
                        className="notice-input"
                        value={noticeForm.start_time}
                        onChange={(e) => setNoticeForm(prev => ({ ...prev, start_time: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Color del Evento */}
                  <div className="notice-field">
                    <label>Color Identificador</label>
                    <div className="notice-color-grid">
                      {['#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'].map(c => (
                        <div 
                          key={c}
                          className={`notice-color-dot ${noticeForm.color === c ? 'active' : ''}`}
                          style={{ background: c }}
                          onClick={() => setNoticeForm(prev => ({ ...prev, color: c }))}
                        >
                          {noticeForm.color === c && <Check size={16} color="#ffffff" strokeWidth={3} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="notice-field">
                    <label>Detalles o Indicaciones</label>
                    <textarea 
                      className="notice-textarea"
                      placeholder="Ej: Despejar escritorios y guardar alimentos antes de las 18:00 hrs..."
                      value={noticeForm.description}
                      onChange={(e) => setNoticeForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {/* Switch de Notificación Push */}
                  <div 
                    className="notice-toggle-card"
                    onClick={() => setNoticeForm(prev => ({ ...prev, notify_team: !prev.notify_team }))}
                  >
                    <div className="notice-toggle-text">
                      <span className="notice-toggle-title">🔔 Notificar al Equipo (Push)</span>
                      <span className="notice-toggle-sub">Envía alerta instantánea a celulares y computadoras del equipo vía OneSignal</span>
                    </div>
                    <div className={`notice-switch ${noticeForm.notify_team ? 'on' : ''}`}>
                      <div className="notice-switch-knob" />
                    </div>
                  </div>

                  {/* Alerta de activación Push si el dispositivo no tiene permisos concedidos */}
                  {noticeForm.notify_team && typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                    <div className="notice-push-warning-box">
                      <div className="notice-push-warning-text">
                        <BellRing size={16} color="#f97316" />
                        <span>Este celular o navegador aún no tiene activadas las notificaciones Push.</span>
                      </div>
                      <button
                        type="button"
                        className="notice-push-quick-btn"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            if (typeof OneSignal?.Notifications?.requestPermission === 'function') {
                              await OneSignal.Notifications.requestPermission();
                            } else if (typeof OneSignal?.Slidedown?.promptPush === 'function') {
                              await OneSignal.Slidedown.promptPush({ force: true });
                            } else if ('Notification' in window) {
                              await Notification.requestPermission();
                            }
                            if (typeof OneSignal?.User?.PushSubscription?.optIn === 'function') {
                              await OneSignal.User.PushSubscription.optIn();
                            }
                            if (user?.id && typeof OneSignal?.login === 'function') {
                              await OneSignal.login(String(user.id));
                            }
                            if (Notification.permission === 'granted') {
                              Swal.fire({
                                icon: 'success',
                                title: '¡Push Activado!',
                                text: 'Este dispositivo ahora recibirá notificaciones en su pantalla.',
                                timer: 2000,
                                showConfirmButton: false
                              });
                            }
                          } catch (err) {
                            console.warn("Error al activar push:", err);
                          }
                        }}
                      >
                        Activar en mi Celular
                      </button>
                    </div>
                  )}
                </div>

                <div className="submodal-footer">
                  <button 
                    type="button"
                    className="btn-submodal-cancel"
                    onClick={() => setShowCreateNoticeModal(false)}
                    disabled={submittingNotice}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="btn-submodal-submit"
                    disabled={submittingNotice}
                  >
                    <Send size={16} />
                    <span>{submittingNotice ? 'Publicando...' : 'Publicar Evento'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL SUBMODAL: DETALLE Y ELIMINACIÓN DE AVISO ── */}
        {selectedNotice && (
          <div 
            className="solutions-submodal-overlay"
            onClick={() => setSelectedNotice(null)}
          >
            <div 
              className="solutions-submodal-window"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="submodal-header">
                <div className="submodal-title-row">
                  <div className="submodal-icon-badge" style={{ background: selectedNotice.color || '#f97316' }}>
                    <CalendarDays size={20} color="#ffffff" />
                  </div>
                  <div>
                    <h3>Detalle del Evento</h3>
                    <p>{selectedNotice.timingBadge}</p>
                  </div>
                </div>
                <button 
                  className="btn-submodal-close"
                  onClick={() => setSelectedNotice(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="submodal-body">
                <div className="notice-detail-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span 
                      className="notice-detail-badge"
                      style={{ background: `${selectedNotice.color || '#f97316'}25`, color: selectedNotice.color || '#f97316' }}
                    >
                      {selectedNotice.timingBadge}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                      📅 {selectedNotice.dateKey}
                    </span>
                  </div>

                  <h2 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                    {selectedNotice.titulo}
                  </h2>

                  <div className="notice-detail-meta">
                    <div className="notice-detail-meta-item">
                      <Clock size={16} color="#94a3b8" />
                      <span>Horario: <strong style={{ color: '#ffffff' }}>{selectedNotice.calendarTime}</strong></span>
                    </div>

                    {selectedNotice.creator && (
                      <div className="notice-detail-meta-item">
                        <User size={16} color="#94a3b8" />
                        <span>Publicado por: <strong style={{ color: '#ffffff' }}>{selectedNotice.creator.first_name} {selectedNotice.creator.last_name || ''}</strong></span>
                      </div>
                    )}
                  </div>

                  {selectedNotice.descripcion && (
                    <div style={{ marginTop: '6px', background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, marginBottom: '6px' }}>Indicaciones / Notas:</div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#e2e8f0', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                        {selectedNotice.descripcion}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="submodal-footer" style={{ justifyContent: isAdmin ? 'space-between' : 'flex-end' }}>
                {isAdmin && (
                  <button 
                    type="button"
                    className="btn-notice-delete"
                    onClick={() => handleDeleteNotice(selectedNotice.noticeId)}
                  >
                    <Trash2 size={16} />
                    <span>Eliminar Aviso</span>
                  </button>
                )}
                <button 
                  type="button"
                  className="btn-submodal-cancel"
                  onClick={() => setSelectedNotice(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default ModalCalendarioSolutions;
