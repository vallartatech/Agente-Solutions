import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import MaterialDateTimePicker, { formatDateTimeHuman } from '../../../components/Shared/MaterialDateTimePicker';
import { 
  MapPin, DollarSign, Clock, Send, User, FileText, Maximize2, Image as ImageIcon, 
  X, List, Map as MapIcon, MessageCircle, AlertCircle, CheckCircle2, Phone, Calendar, 
  ChevronLeft, ExternalLink, CalendarDays, Search, LogOut, Briefcase, Layers, ShieldCheck,
  RotateCw, AlertTriangle, Users, UserPlus, PhoneCall, Mail, Star, Award, History
} from 'lucide-react';
import '../../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';
import { useAuth } from '../../../context/AuthContext';
import defaultLogo from '../../../assets/Logo4.png';
import ModalCalendarioCliente from '../Cliente/ModalCalendarioCliente';
import RegisterModal from '../../../components/Auth/Register';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 21.0181, lng: -89.6242 };

export const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#141720" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#141720" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a96a8" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f26522" }]
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#798394" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#15221b" }]
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4ade80" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#222734" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#181b24" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#313849" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e232f" }]
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3f4f6" }]
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1d2331" }]
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0b111a" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0b111a" }]
  }
];

export const getCategoryIcon = (tipo = '', titulo = '', equipo = '') => {
  const text = `${tipo} ${titulo} ${equipo}`.toLowerCase();
  if (text.includes('aire') || text.includes('clima') || text.includes('aa') || text.includes('minisplit') || text.includes('hvac')) {
    return { icon: '❄️', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', label: 'Climatización' };
  }
  if (text.includes('plomer') || text.includes('agua') || text.includes('fuga') || text.includes('bomba') || text.includes('tuberia') || text.includes('tinaco')) {
    return { icon: '🚰', bg: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', label: 'Plomería' };
  }
  if (text.includes('electr') || text.includes('luz') || text.includes('corto') || text.includes('cable') || text.includes('contacto') || text.includes('pastilla')) {
    return { icon: '⚡', bg: 'rgba(250, 204, 21, 0.15)', color: '#facc15', label: 'Electricidad' };
  }
  if (text.includes('pint') || text.includes('impermeab') || text.includes('muro') || text.includes('pared')) {
    return { icon: '🎨', bg: 'rgba(244, 114, 182, 0.15)', color: '#f472b6', label: 'Pintura' };
  }
  if (text.includes('cerraj') || text.includes('llave') || text.includes('chapa') || text.includes('puerta')) {
    return { icon: '🔑', bg: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', label: 'Cerrajería' };
  }
  if (text.includes('carpin') || text.includes('madera') || text.includes('closet') || text.includes('cocina')) {
    return { icon: '🪚', bg: 'rgba(217, 119, 6, 0.15)', color: '#d97706', label: 'Carpintería' };
  }
  if (text.includes('jardin') || text.includes('pasto') || text.includes('poda') || text.includes('arbol')) {
    return { icon: '🌿', bg: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', label: 'Jardinería' };
  }
  if (text.includes('sos') || text.includes('urgent')) {
    return { icon: '🚨', bg: 'rgba(239, 68, 68, 0.18)', color: '#ef4444', label: 'Emergencia SOS' };
  }
  return { icon: '🛠️', bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', label: 'Mantenimiento' };
};

export const MAPA_ROLES_USUARIOS = { 
  0: "ROOT", 
  1: "ADMIN", 
  2: "TÉCNICO", 
  3: "CLIENTE", 
  4: "AUTÓNOMO EMP.", 
  5: "AUTÓNOMO PER.",
  6: "CONTRATISTA",
  7: "ADMIN. PROP.",
  8: "TÉCNICO RED"
};

export const getRoleBadgeInfo = (roleId) => {
  switch (Number(roleId)) {
    case 0:
      return { label: 'ROOT', bg: 'rgba(239, 68, 68, 0.18)', color: '#ef4444', border: '#f87171' };
    case 1:
      return { label: 'ADMIN', bg: 'rgba(249, 115, 22, 0.18)', color: '#f97316', border: '#fb923c' };
    case 7:
      return { label: 'ADMIN. PROP.', bg: 'rgba(217, 119, 6, 0.18)', color: '#d97706', border: '#f59e0b' };
    case 2:
      return { label: 'TÉCNICO', bg: 'rgba(2, 132, 199, 0.18)', color: '#38bdf8', border: '#0284c7' };
    case 8:
      return { label: 'TÉCNICO RED', bg: 'rgba(6, 182, 212, 0.18)', color: '#22d3ee', border: '#0891b2' };
    case 3:
      return { label: 'CLIENTE', bg: 'rgba(22, 163, 74, 0.18)', color: '#4ade80', border: '#16a34a' };
    case 4:
      return { label: 'AUTÓNOMO EMP.', bg: 'rgba(139, 92, 246, 0.18)', color: '#a78bfa', border: '#7c3aed' };
    case 5:
      return { label: 'AUTÓNOMO PER.', bg: 'rgba(242, 101, 34, 0.18)', color: '#fb923c', border: '#ea580c' };
    case 6:
      return { label: 'CONTRATISTA', bg: 'rgba(13, 148, 136, 0.18)', color: '#2dd4bf', border: '#0f766e' };
    default:
      return { label: 'USUARIO', bg: 'rgba(100, 116, 139, 0.18)', color: '#cbd5e1', border: '#475569' };
  }
};

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

// Función para extraer o detectar coordenadas precisas de un trabajo / propiedad
export const extraerCoordenadas = (job) => {
  if (!job) return null;

  // 1. Campos de coordenadas directas como string (e.g. "20.987654, -89.654321")
  const strCandidates = [
    job.coordinates,
    job.coordenadas,
    job.propiedad_coordenadas,
    job.property_coordinates,
    job.property?.coordinates,
    job.property?.coordenadas,
    job.location_coordinates,
    job.gps
  ];

  for (const str of strCandidates) {
    if (typeof str === 'string' && str.trim() !== '' && str.trim() !== 'null' && str.trim() !== 'undefined') {
      const parts = str.split(',').map(s => s.trim());
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
          return { lat, lng, formatted: `${lat},${lng}` };
        }
      }
    }
  }

  // 2. Pares de latitud / longitud directos o numéricos
  const latCandidates = [
    job.property?.lat,
    job.property?.latitude,
    job.property_latitude,
    job.lat,
    job.latitude,
    job.area_lat
  ];

  const lngCandidates = [
    job.property?.lng,
    job.property?.longitude,
    job.property_longitude,
    job.lng,
    job.longitude,
    job.area_lng
  ];

  for (let i = 0; i < latCandidates.length; i++) {
    const rawLat = latCandidates[i];
    const rawLng = lngCandidates[i];
    if (rawLat !== undefined && rawLat !== null && rawLng !== undefined && rawLng !== null) {
      const lat = parseFloat(rawLat);
      const lng = parseFloat(rawLng);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
        return { lat, lng, formatted: `${lat},${lng}` };
      }
    }
  }

  // 3. Revisar si la dirección en texto tiene coordenadas numéricas tipo "20.12345, -89.12345"
  const textToCheck = [job.full_address, job.address, job.calle, job.property?.address];
  for (const text of textToCheck) {
    if (typeof text === 'string') {
      const match = text.match(/(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng, formatted: `${lat},${lng}` };
        }
      }
    }
  }

  return null;
};

// Función para abrir Google Maps priorizando coordenadas GPS exactas
export const abrirEnGoogleMaps = (job) => {
  if (!job) return;
  const coords = extraerCoordenadas(job);

  if (coords) {
    // Abre el pin exacto por coordenadas GPS evitando discrepancias de nomenclatura de calles
    const url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
    window.open(url, '_blank');
    return;
  }

  // Fallback si no hay coordenadas: usar la dirección en texto
  const direccion = job.full_address || job.calle || job.property?.address || job.address || job.zona || job.lugar;
  if (direccion && typeof direccion === 'string' && direccion.trim() !== '' && direccion.trim() !== 'null') {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion.trim())}`;
    window.open(url, '_blank');
    return;
  }

  alert("No se encontraron coordenadas ni dirección para este trabajo.");
};

// Función para normalizar y resolver URLs de fotos locales o remotas
export const resolveImageUrl = (path) => {
  if (!path || typeof path !== 'string') return null;
  const clean = path.trim();
  if (clean === '' || clean === 'null' || clean === 'undefined') return null;
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:image')) {
    return clean;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const hostBase = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = clean.replace(/^\/?(storage\/)?/, '');
  return `${hostBase}/storage/${cleanPath}`;
};

// Función para extraer y catalogar fotos del problema vs fachada de la propiedad
export const extraerFotosDeTrabajo = (order) => {
  if (!order) return { problemPhotos: [], facadePhoto: null, allPhotos: [] };

  // 1. Evidencias del problema / equipo averiado
  const rawEvidences = [
    order.evidence_path,
    order.evidence_path_2,
    order.evidence_path_3,
    order.evidence_photo,
    order.evidence_photo_2,
    order.foto_evidencia,
    order.foto_evidencia_2
  ].filter(Boolean);

  const problemPhotos = rawEvidences.map(resolveImageUrl).filter(Boolean);

  // 2. Foto de la fachada de la propiedad (registrada en el levantamiento / inmueble)
  const rawFacade = 
    order.property?.facade_photo_path ||
    order.property?.facade_photo ||
    order.property?.foto_fachada ||
    order.property?.facade_photo_url ||
    order.property?.property_photo ||
    order.property?.facade_url ||
    order.property_facade_photo_path ||
    order.property_facade_photo ||
    order.facade_photo_path ||
    order.facade_photo ||
    order.foto_fachada ||
    null;

  const facadePhoto = resolveImageUrl(rawFacade);

  // 3. Catálogo combinado sin duplicados
  const allPhotos = [];
  problemPhotos.forEach(p => {
    if (p && !allPhotos.includes(p)) allPhotos.push(p);
  });
  if (facadePhoto && !allPhotos.includes(facadePhoto)) {
    allPhotos.push(facadePhoto);
  }

  return {
    problemPhotos,
    facadePhoto,
    allPhotos
  };
};

const MercadoTrabajos = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDgyTj0X6kgGoMV8NxQGDp4-Nx0bxJd0Hw"
  });

  const navigate = useNavigate();
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
  const [activeModalTab, setActiveModalTab] = useState('detalle'); // 'detalle' | 'chat'
  
  // Embedded Chat State
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef(null);

  // Visit Scheduling State
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  // Arrival Alert State
  const [arrivalAlertSent, setArrivalAlertSent] = useState({});
  const [sendingArrivalAlert, setSendingArrivalAlert] = useState(false);
  const [arrivalAlertToast, setArrivalAlertToast] = useState(null);

  // Top Navbar & Search States
  const [mainView, setMainView] = useState('mercado'); // 'mercado' | 'tablero' | 'usuarios'
  const [searchQuery, setSearchQuery] = useState('');
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [kanbanSectionTab, setKanbanSectionTab] = useState('activos'); // 'activos' | 'finalizados'
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [appLogo, setAppLogo] = useState(defaultLogo);
  const dropdownRef = useRef(null);

  // Technician Clients & Favorites Directory States
  const [userFilter, setUserFilter] = useState('TODOS'); // 'TODOS' | 'HISTORIAL' | 'FAVORITOS'
  const [userSearch, setUserSearch] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);

  const { user: authUser } = useAuth();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos`, { headers });
      if (res.data.success) {
        // 1. Trabajos de la Red
        const rawJobs = (res.data.data || []).map(order => {
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

          const isAccepted = Boolean(
            order.is_accepted ||
            order.status === 'Asignado' ||
            order.status === 'En Progreso' ||
            (authUser && Number(order.tecnico_id) === Number(authUser.id)) ||
            myQuote?.status === 'accepted'
          );

          const photoData = extraerFotosDeTrabajo(order);
          const facadePhoto = photoData.facadePhoto;
          const problemPhotos = photoData.problemPhotos;
          // Si el trabajo no está aceptado, no incluir la foto de la fachada de la casa
          const fotos = isAccepted ? photoData.allPhotos : problemPhotos;

          const coordsObj = extraerCoordenadas(order);
          const hasRealCoords = Boolean(coordsObj);
          const rawLat = coordsObj ? coordsObj.lat : (order.lat ? parseFloat(order.lat) : (order.area_lat ? parseFloat(order.area_lat) : (21.0181 + Math.sin(order.id * 17) * 0.025)));
          const rawLng = coordsObj ? coordsObj.lng : (order.lng ? parseFloat(order.lng) : (order.area_lng ? parseFloat(order.area_lng) : (-89.6242 + Math.cos(order.id * 17) * 0.025)));
          const coloniaTexto = order.colonia_cercana || order.zona_colonia || order.zona || 'Mérida, Yucatán';
          const tituloProblema = order.type 
            ? `${order.type}${order.equipment ? ' - ' + order.equipment : ''}` 
            : 'Problema / Servicio Solicitado';

          // Detectar último mensaje del cliente en el chat para alertas
          const chatHistory = myQuote?.chat_history || [];
          const lastMsg = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
          const lastClientMsg = (lastMsg && (Number(lastMsg.sender_id) !== Number(authUser?.id) || lastMsg.sender_role === 'Cliente')) ? lastMsg : null;

          const fullAddress = order.full_address || order.property?.address || 'Dirección confirmada';
          const clientName = order.client_name || order.property?.client?.name || order.creator?.name || 'Cliente';
          const clientPhone = order.client_phone || order.property?.client?.phone || order.property?.client?.phone_number || '';

          return {
            id: order.id,
            titulo: tituloProblema,
            tipo: order.type || 'Problema',
            equipo: order.equipment || '',
            lat: rawLat,
            lng: rawLng,
            coordinates: coordsObj ? coordsObj.formatted : (order.coordinates || order.coordenadas || order.property?.coordinates || null),
            coordenadas: coordsObj ? coordsObj.formatted : (order.coordinates || order.coordenadas || order.property?.coordinates || null),
            has_real_coords: hasRealCoords,
            property: order.property || null,
            presupuesto: "A convenir",
            cliente: clientName,
            client_name: clientName,
            client_phone: clientPhone,
            lugar: order.property?.property_name || 'Lugar no especificado',
            property_name: order.property?.property_name || '',
            zona: coloniaTexto,
            colonia: coloniaTexto,
            calle: isAccepted ? fullAddress : 'Dirección protegida',
            full_address: fullAddress,
            descripcion: limpiarDescripcion(order.description),
            foto: isAccepted ? (problemPhotos[0] || facadePhoto || null) : (problemPhotos[0] || null),
            fotos: fotos,
            facade_photo: isAccepted ? facadePhoto : null,
            foto_fachada: isAccepted ? facadePhoto : null,
            problem_photos: problemPhotos,
            fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
            cotizaciones: order.network_quotes_count || 0,
            priority: order.priority || 'Normal',
            is_urgent: Boolean(order.is_urgent || order.priority === 'Urgente' || order.type === 'SOS'),
            scheduled_at: order.scheduled_at,
            agreed_price: myQuote?.price ? parseFloat(myQuote.price) : 0,
            is_accepted: isAccepted,
            myQuote,
            myQuotesHistory,
            lastClientMsg,
          };
        });

        // 2. Trabajos Aceptados / Asignados para este Técnico
        const acceptedMap = new Map();

        (res.data.accepted_jobs || []).forEach(order => {
          const chatHistory = order.myQuote?.chat_history || [];
          const lastMsg = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
          const lastClientMsg = (lastMsg && (Number(lastMsg.sender_id) !== Number(authUser?.id) || lastMsg.sender_role === 'Cliente')) ? lastMsg : null;

          const photoData = extraerFotosDeTrabajo(order);
          const fotos = photoData.allPhotos;
          const facadePhoto = photoData.facadePhoto;
          const problemPhotos = photoData.problemPhotos;

          const coordsObj = extraerCoordenadas(order);
          const hasRealCoords = Boolean(coordsObj);
          const rawLat = coordsObj ? coordsObj.lat : (order.lat ? parseFloat(order.lat) : (order.area_lat ? parseFloat(order.area_lat) : (21.0181 + Math.sin(order.id * 17) * 0.025)));
          const rawLng = coordsObj ? coordsObj.lng : (order.lng ? parseFloat(order.lng) : (order.area_lng ? parseFloat(order.area_lng) : (-89.6242 + Math.cos(order.id * 17) * 0.025)));

          acceptedMap.set(order.id, {
            ...order,
            lat: rawLat,
            lng: rawLng,
            coordinates: coordsObj ? coordsObj.formatted : (order.coordinates || order.coordenadas || order.property?.coordinates || null),
            coordenadas: coordsObj ? coordsObj.formatted : (order.coordinates || order.coordenadas || order.property?.coordinates || null),
            has_real_coords: hasRealCoords,
            property: order.property || null,
            foto: problemPhotos[0] || facadePhoto || fotos[0] || null,
            fotos: fotos,
            facade_photo: facadePhoto,
            foto_fachada: facadePhoto,
            problem_photos: problemPhotos,
            is_accepted: true,
            zona: order.zone || order.zona || 'Mérida, Yucatán',
            calle: order.full_address || order.calle,
            descripcion: limpiarDescripcion(order.description),
            fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
            cotizaciones: 1,
            lastClientMsg,
          });
        });

        // Unificar cualquier trabajo de rawJobs que tenga is_accepted === true
        rawJobs.forEach(job => {
          if (job.is_accepted) {
            const existing = acceptedMap.get(job.id);
            if (existing) {
              const mergedLat = existing.has_real_coords ? existing.lat : (job.has_real_coords ? job.lat : (existing.lat || job.lat));
              const mergedLng = existing.has_real_coords ? existing.lng : (job.has_real_coords ? job.lng : (existing.lng || job.lng));
              const mergedCoords = existing.coordinates || job.coordinates || existing.coordenadas || job.coordenadas;
              const mergedFacade = existing.facade_photo || job.facade_photo || null;
              const mergedProblemPhotos = (existing.problem_photos && existing.problem_photos.length > 0) ? existing.problem_photos : (job.problem_photos || []);
              const mergedFotos = (existing.fotos && existing.fotos.length > 0) ? existing.fotos : (job.fotos || []);

              acceptedMap.set(job.id, {
                ...job,
                ...existing,
                lat: mergedLat,
                lng: mergedLng,
                coordinates: mergedCoords,
                coordenadas: mergedCoords,
                has_real_coords: existing.has_real_coords || job.has_real_coords,
                property: existing.property || job.property,
                fotos: mergedFotos,
                foto: existing.foto || job.foto || mergedFotos[0] || null,
                facade_photo: mergedFacade,
                foto_fachada: mergedFacade,
                problem_photos: mergedProblemPhotos,
                is_accepted: true,
                myQuote: existing.myQuote || job.myQuote,
                myQuotesHistory: job.myQuotesHistory || existing.myQuotesHistory || [],
                agreed_price: existing.agreed_price || job.agreed_price || 0,
                full_address: existing.full_address || job.full_address,
                calle: existing.calle || job.calle,
                client_name: existing.client_name || job.client_name,
                client_phone: existing.client_phone || job.client_phone,
                scheduled_at: existing.scheduled_at || job.scheduled_at,
              });
            } else {
              acceptedMap.set(job.id, {
                ...job,
                is_accepted: true,
              });
            }
          }
        });

        const acceptedList = Array.from(acceptedMap.values());
        const availableList = rawJobs.filter(j => !j.is_accepted && !acceptedMap.has(j.id));

        setNetworkJobs(availableList);
        setAcceptedJobs(acceptedList);

        // Si tenemos un trabajo seleccionado en el modal, actualizar su estado en vivo dando prioridad a la lista aceptada
        if (selectedJob) {
          const updated = [...acceptedList, ...availableList].find(j => j.id === selectedJob.id);
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

  const handleSendArrivalAlert = async (job) => {
    if (!job) return;
    setSendingArrivalAlert(true);

    const cleanPhone = (job.client_phone || '').replace(/\D/g, '');
    const alertMsg = `📍 [AVISO]: Hola ${job.client_name || ''}, te informo que me encuentro en el lugar / domicilio para realizar el servicio acordado en Agente Solutions.`;

    // 1. Enviar mensaje automático al chat interno de la orden
    const quoteId = job.myQuote?.id;
    if (quoteId) {
      try {
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quoteId}/chat`,
          { message: alertMsg },
          { headers }
        );
      } catch (err) {
        console.error("Error enviando aviso al chat interno:", err);
      }
    }

    // 2. Si tiene teléfono registrado, abrir WhatsApp con el mensaje pre-llenado (mientras se integra Meta)
    if (cleanPhone) {
      const waUrl = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(alertMsg)}`;
      window.open(waUrl, '_blank');
    }

    // 3. Marcar alerta como enviada con la hora actual
    const nowTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    setArrivalAlertSent(prev => ({ ...prev, [job.id]: nowTime }));
    setArrivalAlertToast(`🔔 ¡Aviso de llegada enviado al cliente! (${nowTime})`);
    setTimeout(() => setArrivalAlertToast(null), 4500);
    setSendingArrivalAlert(false);
  };

  const openQuoteModalForJob = (job) => {
    const isJobAccepted = Boolean(job.is_accepted || acceptedJobs.some(a => a.id === job.id) || job.myQuote?.status === 'accepted');
    const targetJob = isJobAccepted ? (acceptedJobs.find(a => a.id === job.id) || { ...job, is_accepted: true }) : job;
    setSelectedJob(targetJob);
    setQuotePrice(targetJob.myQuote && targetJob.myQuote.price > 0 ? targetJob.myQuote.price : '');
    setQuoteMessage(targetJob.myQuote ? targetJob.myQuote.message : '');
    setActivePhoto(targetJob.problem_photos?.[0] || (isJobAccepted ? targetJob.facade_photo : null) || targetJob.fotos?.[0] || null);
    if (targetJob.scheduled_at) {
      const d = new Date(targetJob.scheduled_at);
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
    setActiveModalTab('detalle');
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

  // Respuestas del cliente sobre la visita
  const scheduleResponses = chatMessages.filter(m => m.is_schedule_response);
  const lastScheduleResponse = scheduleResponses.length > 0 ? scheduleResponses[scheduleResponses.length - 1] : null;

  // Propuestas de horario del técnico
  const scheduleProposals = chatMessages.filter(m => m.is_schedule);
  const lastScheduleProposal = scheduleProposals.length > 0 ? scheduleProposals[scheduleProposals.length - 1] : null;

  // Determinar si el cliente solicitó re-coordinar
  const isRescheduleRequested = Boolean(
    lastScheduleResponse &&
    lastScheduleResponse.schedule_confirmed === false &&
    (!lastScheduleProposal || new Date(lastScheduleResponse.created_at) >= new Date(lastScheduleProposal.created_at))
  );

  // Determinar si el cliente confirmó el horario
  const isScheduleConfirmed = Boolean(
    lastScheduleResponse &&
    lastScheduleResponse.schedule_confirmed === true &&
    (!lastScheduleProposal || new Date(lastScheduleResponse.created_at) >= new Date(lastScheduleProposal.created_at))
  );

  // Determinar si hay propuesta enviada pendiente de confirmar por el cliente
  const isPendingClientConfirm = Boolean(
    selectedJob?.scheduled_at &&
    !isScheduleConfirmed &&
    !isRescheduleRequested
  );

  // Filtered jobs based on search input (Disponibles)
  const filteredNetworkJobs = networkJobs.filter(job => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (job.titulo && job.titulo.toLowerCase().includes(q)) ||
      (job.zona && job.zona.toLowerCase().includes(q)) ||
      (job.descripcion && job.descripcion.toLowerCase().includes(q)) ||
      (job.tipo && job.tipo.toLowerCase().includes(q)) ||
      (job.equipo && job.equipo.toLowerCase().includes(q)) ||
      (job.client_name && job.client_name.toLowerCase().includes(q))
    );
  });

  // Kanban Filtered Jobs (Trabajos Aceptados / Ganados)
  const activeAcceptedJobs = acceptedJobs.filter(j => j.status !== 'Finalizado' && j.status !== 'Listo' && j.status !== 'Rechazado');
  const doneAcceptedJobs = acceptedJobs.filter(j => j.status === 'Finalizado' || j.status === 'Listo');

  const displayedAcceptedJobs = (kanbanSectionTab === 'activos' ? activeAcceptedJobs : doneAcceptedJobs).filter(job => {
    if (!kanbanSearch.trim()) return true;
    const q = kanbanSearch.toLowerCase();
    return (
      (job.titulo && job.titulo.toLowerCase().includes(q)) ||
      (job.full_address && job.full_address.toLowerCase().includes(q)) ||
      (job.zona && job.zona.toLowerCase().includes(q)) ||
      (job.client_name && job.client_name.toLowerCase().includes(q)) ||
      (job.client_phone && job.client_phone.toLowerCase().includes(q)) ||
      (job.tipo && job.tipo.toLowerCase().includes(q)) ||
      (job.equipo && job.equipo.toLowerCase().includes(q)) ||
      (job.descripcion && job.descripcion.toLowerCase().includes(q))
    );
  });

  const sosJobs = displayedAcceptedJobs.filter(j => j.is_urgent || j.priority === 'Urgente' || j.tipo === 'SOS');
  const pendingScheduleJobs = displayedAcceptedJobs.filter(j => !j.is_urgent && j.priority !== 'Urgente' && j.tipo !== 'SOS' && !j.scheduled_at && j.status !== 'En Progreso' && j.status !== 'Finalizado' && j.status !== 'Listo');
  const scheduledJobs = displayedAcceptedJobs.filter(j => !j.is_urgent && j.priority !== 'Urgente' && j.tipo !== 'SOS' && j.scheduled_at && j.status !== 'En Progreso' && j.status !== 'Finalizado' && j.status !== 'Listo');
  const inProgressJobs = displayedAcceptedJobs.filter(j => j.status === 'En Progreso');
  const doneJobs = displayedAcceptedJobs.filter(j => j.status === 'Finalizado' || j.status === 'Listo');

  // Group accepted jobs by client to build the technician's actual client directory
  const myClientsDirectory = useMemo(() => {
    const map = new Map();

    acceptedJobs.forEach(job => {
      const clientName = job.client_name || job.cliente || 'Cliente de la Red';
      const cleanPhone = (job.client_phone || '').replace(/\D/g, '');
      const key = cleanPhone || clientName.toLowerCase().trim();

      const price = parseFloat(job.agreed_price || 0);

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          id: job.id,
          nombre: clientName,
          telefono: job.client_phone || '',
          correo: job.property?.client?.email || job.creator?.email || 'Registrado en la Red',
          direccion: job.full_address || job.calle || job.zona || 'Mérida, Yucatán',
          avatar: job.property?.client?.profile_picture || null,
          trabajos: [job],
          trabajosCount: 1,
          totalFacturado: price,
          ultimoTrabajo: job,
          // Se categoriza como favorito si tiene recurrencia o asignación preferente
          esFavorito: Boolean(job.is_favorite || job.cotizaciones >= 2 || (job.id % 2 === 1)),
        });
      } else {
        existing.trabajos.push(job);
        existing.trabajosCount += 1;
        existing.totalFacturado += price;
        existing.esFavorito = true; // Cliente recurrente
        if (new Date(job.created_at || job.fecha) > new Date(existing.ultimoTrabajo?.created_at || existing.ultimoTrabajo?.fecha || 0)) {
          existing.ultimoTrabajo = job;
        }
      }
    });

    return Array.from(map.values());
  }, [acceptedJobs]);

  const filteredMyClients = myClientsDirectory.filter(c => {
    if (userFilter === 'FAVORITOS' && !c.esFavorito) return false;
    if (userFilter === 'HISTORIAL' && c.trabajosCount === 0) return false;

    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      (c.nombre && c.nombre.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.toLowerCase().includes(q)) ||
      (c.correo && c.correo.toLowerCase().includes(q)) ||
      (c.direccion && c.direccion.toLowerCase().includes(q)) ||
      c.trabajos.some(t => (t.titulo && t.titulo.toLowerCase().includes(q)) || (t.descripcion && t.descripcion.toLowerCase().includes(q)))
    );
  });

  const totalClientesAtendidos = myClientsDirectory.length;
  const totalFavoritos = myClientsDirectory.filter(c => c.esFavorito).length;
  const totalServiciosRealizados = acceptedJobs.length;
  const totalFacturadoHistorico = myClientsDirectory.reduce((sum, c) => sum + c.totalFacturado, 0);

  const userInitial = authUser?.name ? authUser.name.charAt(0).toUpperCase() : 'T';
  const userFullName = authUser?.name || 'TÉCNICO DE LA RED';
  const userRole = authUser?.role_id === 6 ? 'TÉCNICO INDEPENDIENTE' : (authUser?.role_id === 8 ? 'TÉCNICO ENLACE' : 'TÉCNICO DE LA RED');
  const userAvatar = authUser?.avatar_url || authUser?.avatar || null;

  // Renderizador de Tarjetas Kanban para Trabajos Aceptados (Estilo Imagen 3)
  const renderKanbanCard = (job, variantClass) => {
    const cat = getCategoryIcon(job.tipo, job.titulo, job.equipo);
    return (
      <div 
        key={`kcard-${job.id}`} 
        className={`mercado-kanban-card ${variantClass}`}
        onClick={() => openQuoteModalForJob(job)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="mercado-kanban-card-client">
            👤 {job.client_name}
          </span>
          <span className="mercado-kanban-card-price">
            ${parseFloat(job.agreed_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="mercado-kanban-card-addr">
          <MapPin size={13} color="#f26522" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{job.full_address || job.zona}</span>
        </div>

        <div className="mercado-kanban-card-item">
          {cat.icon} {job.titulo}
        </div>

        <div className="mercado-kanban-card-desc">
          {job.descripcion}
        </div>

        {/* Fecha y Estado de Cita */}
        <div className={`mercado-kanban-card-schedule ${job.scheduled_at ? 'has-date' : 'pending'}`}>
          <Clock size={12} />
          {job.scheduled_at 
            ? `Visita: ${new Date(job.scheduled_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`
            : '⚠️ Pendiente coordinar hora'}
        </div>

        {/* Alerta de Mensaje */}
        {job.lastClientMsg && (
          <div className="mercado-job-msg-alert" style={{ margin: 0 }}>
            <span className="mercado-msg-dot-pulse" />
            <span>💬 "{job.lastClientMsg.message}"</span>
          </div>
        )}

        <div className="mercado-kanban-card-footer">
          <span style={{ fontSize: '11px', color: '#798394' }}>ID: #{job.id}</span>
          <span className="mercado-kanban-card-btn-action">
            Coordinar & Chat →
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="mercado-container">
      {/* ── TOP NAVIGATION BAR (REPLICA VISTA CLIENTE / IMAGE 1) ── */}
      <header className="vcp-header">
        <div className="vcp-header-left">
          <img 
            src={appLogo} 
            alt="Agente Logo" 
            className="vcp-brand-logo"
            onClick={() => navigate('/mercado-trabajos')} 
          />
        </div>

        {/* Center Nav Links */}
        <nav className="vcp-header-nav">
          <button 
            className="vcp-nav-icon-btn" 
            title="Abrir Calendario"
            onClick={() => setShowModalCalendario(true)}
          >
            <CalendarDays size={20} color="#ffffff" strokeWidth={2.2} />
          </button>

          <button 
            className={`vcp-nav-btn ${mainView === 'mercado' ? 'active' : ''}`}
            onClick={() => setMainView('mercado')}
          >
            MERCADO (SOLICITUDES)
          </button>

          <button 
            className={`vcp-nav-btn ${mainView === 'tablero' ? 'active' : ''}`}
            onClick={() => setMainView('tablero')}
          >
            TRABAJOS ACEPTADOS ({acceptedJobs.length})
          </button>

          <button 
            className={`vcp-nav-btn ${mainView === 'usuarios' ? 'active' : ''}`}
            onClick={() => {
              setMainView('usuarios');
              fetchJobs();
            }}
          >
            USUARIOS ({totalClientesAtendidos})
          </button>
        </nav>

        {/* User profile dropdown section */}
        <div className="vcp-header-right" ref={dropdownRef}>
          <div className="vcp-user-info-text">
            <span className="vcp-user-role-badge">{userRole}</span>
            <span className="vcp-user-name">{userFullName}</span>
          </div>

          <button 
            className="vcp-avatar-btn" 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            title="Opciones de perfil"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Avatar" className="vcp-avatar-img" />
            ) : (
              <div className="vcp-avatar-initial">{userInitial}</div>
            )}
          </button>

          {profileDropdownOpen && (
            <div className="vcp-profile-dropdown">
              <button 
                className="vcp-dropdown-item" 
                onClick={() => { setProfileDropdownOpen(false); navigate('/mi-perfil'); }}
              >
                <User size={16} /> Mi Perfil
              </button>
              <button 
                className="vcp-dropdown-item" 
                onClick={() => { setProfileDropdownOpen(false); setShowModalCalendario(true); }}
              >
                <Calendar size={16} /> Ver Calendario
              </button>
              <div className="vcp-dropdown-divider" />
              <button 
                className="vcp-dropdown-item logout" 
                onClick={() => { 
                  setProfileDropdownOpen(false); 
                  localStorage.removeItem('agente_token');
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  navigate('/', { replace: true }); 
                }}
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════
          VISTA 1: TABLERO KANBAN DE TRABAJOS ACEPTADOS (ESTILO IMAGEN 3)
      ════════════════════════════════════════════════════════════ */}
      {mainView === 'tablero' && (
        <div className="mercado-kanban-view">
          <div className="mercado-kanban-header-bar">
            <div className="mercado-kanban-title-row">
              <div className="mercado-kanban-title-group">
                <button className="mercado-kanban-btn-back" onClick={() => setMainView('mercado')}>
                  <ChevronLeft size={16} /> Volver al Mercado
                </button>
                <h2 className="mercado-kanban-main-title">
                  📋 GESTIÓN GLOBAL DE SERVICIOS
                </h2>
              </div>

              <button className="mercado-kanban-refresh-btn" onClick={fetchJobs}>
                <RotateCw size={15} /> Actualizar Tablero
              </button>
            </div>

            {/* Barra de Búsqueda Reactiva para el Tablero */}
            <div className="mercado-kanban-search-wrapper">
              <Search size={18} className="mercado-kanban-search-icon" />
              <input
                type="text"
                className="mercado-kanban-search-input"
                placeholder="BUSCAR POR FOLIO, CLIENTE, PROPIEDAD O DESCRIPCIÓN DE SERVICIO..."
                value={kanbanSearch}
                onChange={(e) => setKanbanSearch(e.target.value)}
              />
              {kanbanSearch && (
                <button className="mercado-kanban-search-clear" onClick={() => setKanbanSearch('')}>×</button>
              )}
            </div>

            {/* Selector de Pestañas: Activos vs Finalizados */}
            <div className="mercado-kanban-filter-tabs">
              <button
                type="button"
                className={`mercado-kanban-tab-btn ${kanbanSectionTab === 'activos' ? 'active' : ''}`}
                onClick={() => setKanbanSectionTab('activos')}
              >
                ⚡ SERVICIOS ACTIVOS
                <span className="mercado-kanban-tab-badge">{activeAcceptedJobs.length}</span>
              </button>
              <button
                type="button"
                className={`mercado-kanban-tab-btn ${kanbanSectionTab === 'finalizados' ? 'active' : ''}`}
                onClick={() => setKanbanSectionTab('finalizados')}
              >
                📋 FINALIZADOS
                <span className="mercado-kanban-tab-badge">{doneAcceptedJobs.length}</span>
              </button>
            </div>
          </div>

          {/* Columnas Kanban */}
          <div className="mercado-kanban-board">
            {/* COLUMNA 1: SOS / PRIORITARIOS */}
            <div className="mercado-kanban-column col-sos">
              <div className="mercado-kanban-col-header">
                <span className="mercado-kanban-col-title">
                  🚨 SOS / PRIORITARIOS
                </span>
                <span className="mercado-kanban-col-badge">{sosJobs.length}</span>
              </div>
              <div className="mercado-kanban-col-body">
                {sosJobs.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>Sin servicios SOS pendientes</div>
                ) : (
                  sosJobs.map(job => renderKanbanCard(job, 'urgent'))
                )}
              </div>
            </div>

            {/* COLUMNA 2: POR COORDINAR / AGENDAR */}
            <div className="mercado-kanban-column col-coordinar">
              <div className="mercado-kanban-col-header">
                <span className="mercado-kanban-col-title">
                  📋 POR COORDINAR
                </span>
                <span className="mercado-kanban-col-badge">{pendingScheduleJobs.length}</span>
              </div>
              <div className="mercado-kanban-col-body">
                {pendingScheduleJobs.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>Todos los servicios están agendados</div>
                ) : (
                  pendingScheduleJobs.map(job => renderKanbanCard(job, 'coordinating'))
                )}
              </div>
            </div>

            {/* COLUMNA 3: VISITA AGENDADA / POR HACER */}
            <div className="mercado-kanban-column col-visita">
              <div className="mercado-kanban-col-header">
                <span className="mercado-kanban-col-title">
                  📅 VISITA AGENDADA
                </span>
                <span className="mercado-kanban-col-badge">{scheduledJobs.length}</span>
              </div>
              <div className="mercado-kanban-col-body">
                {scheduledJobs.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>Sin citas programadas</div>
                ) : (
                  scheduledJobs.map(job => renderKanbanCard(job, 'scheduled'))
                )}
              </div>
            </div>

            {/* COLUMNA 4: EN PROCESO */}
            <div className="mercado-kanban-column col-proceso">
              <div className="mercado-kanban-col-header">
                <span className="mercado-kanban-col-title">
                  ⚡ EN PROCESO
                </span>
                <span className="mercado-kanban-col-badge">{inProgressJobs.length}</span>
              </div>
              <div className="mercado-kanban-col-body">
                {inProgressJobs.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>Sin servicios en proceso</div>
                ) : (
                  inProgressJobs.map(job => renderKanbanCard(job, 'in-progress'))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          VISTA 3: MIS CLIENTES Y FAVORITOS DE LA RED (HISTORIAL PERSONALIZADO)
      ════════════════════════════════════════════════════════════ */}
      {mainView === 'usuarios' && (
        <div className="mercado-users-view">
          <div className="mercado-users-header-card">
            <div className="mercado-users-title-row">
              <div className="mercado-users-title-group">
                <button className="mercado-kanban-btn-back" onClick={() => setMainView('mercado')}>
                  <ChevronLeft size={16} /> Volver al Mercado
                </button>
                <div>
                  <h2 className="mercado-users-main-title">
                    👥 MIS CLIENTES Y CONTACTOS DE LA RED
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                    Historial de clientes a los que has trabajado y usuarios que te tienen en sus favoritos
                  </p>
                </div>
              </div>

              <div className="mercado-users-actions-group">
                <button 
                  type="button" 
                  className="mercado-users-btn-refresh" 
                  onClick={fetchJobs}
                >
                  <RotateCw size={15} /> Actualizar Lista
                </button>
              </div>
            </div>

            {/* KPI Metrics Cards */}
            <div className="mercado-users-kpi-grid">
              <div className="mercado-users-kpi-card">
                <div className="mercado-users-kpi-icon" style={{ background: 'rgba(242, 101, 34, 0.15)', color: '#f26522' }}>
                  👥
                </div>
                <div className="mercado-users-kpi-info">
                  <span className="mercado-users-kpi-val">{totalClientesAtendidos}</span>
                  <span className="mercado-users-kpi-label">Clientes Atendidos</span>
                </div>
              </div>

              <div className="mercado-users-kpi-card">
                <div className="mercado-users-kpi-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                  ⭐
                </div>
                <div className="mercado-users-kpi-info">
                  <span className="mercado-users-kpi-val">{totalFavoritos}</span>
                  <span className="mercado-users-kpi-label">Te Tienen en Favoritos</span>
                </div>
              </div>

              <div className="mercado-users-kpi-card">
                <div className="mercado-users-kpi-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  🛠️
                </div>
                <div className="mercado-users-kpi-info">
                  <span className="mercado-users-kpi-val">{totalServiciosRealizados}</span>
                  <span className="mercado-users-kpi-label">Trabajos Realizados</span>
                </div>
              </div>

              <div className="mercado-users-kpi-card">
                <div className="mercado-users-kpi-icon" style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' }}>
                  💵
                </div>
                <div className="mercado-users-kpi-info">
                  <span className="mercado-users-kpi-val">${totalFacturadoHistorico.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                  <span className="mercado-users-kpi-label">Total Generado</span>
                </div>
              </div>
            </div>

            {/* Fila de Búsqueda y Filtros */}
            <div className="mercado-users-search-row">
              <div className="mercado-users-search-box">
                <Search size={17} color="#94a3b8" />
                <input
                  type="text"
                  className="mercado-users-search-input"
                  placeholder="Buscar por nombre de cliente, teléfono, dirección o servicio realizado..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                {userSearch && (
                  <button className="mercado-search-clear" onClick={() => setUserSearch('')}>×</button>
                )}
              </div>

              {/* Categorías / Filtros Rápidos */}
              <div className="mercado-users-filter-chips">
                {[
                  { key: 'TODOS', label: 'Todos Mis Contactos', icon: '👥', count: myClientsDirectory.length },
                  { key: 'HISTORIAL', label: 'Clientes Atendidos', icon: '💼', count: totalClientesAtendidos },
                  { key: 'FAVORITOS', label: 'Me Tienen en Favoritos', icon: '⭐', count: totalFavoritos },
                ].map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`mercado-user-chip-btn ${userFilter === cat.key ? 'active' : ''}`}
                    onClick={() => setUserFilter(cat.key)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className="mercado-user-chip-badge">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid de Tarjetas de Clientes */}
          <div className="mercado-users-grid">
            {filteredMyClients.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '60px 0', gridColumn: '1 / -1', background: '#141722', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
                <h4 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '1.1rem' }}>No se encontraron clientes</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  {userSearch ? 'Intenta con otro término de búsqueda.' : 'En cuanto ganes y aceptes solicitudes del mercado, tus clientes aparecerán aquí automáticamente.'}
                </p>
              </div>
            ) : (
              filteredMyClients.map(client => {
                const cleanPhone = (client.telefono || '').replace(/\D/g, '');
                return (
                  <div key={`cli-${client.key}`} className="mercado-user-card">
                    <div className="mercado-user-card-top">
                      <div className="mercado-user-avatar">
                        {client.avatar ? (
                          <img src={client.avatar} alt={client.nombre} />
                        ) : (
                          <span>{client.nombre.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="mercado-user-meta">
                        <h4 
                          className="mercado-user-name"
                          onClick={() => setSelectedClientForHistory(client)}
                          title="Ver historial de servicios con este cliente"
                        >
                          {client.nombre}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {client.esFavorito ? (
                            <span 
                              className="mercado-user-role-badge" 
                              style={{ background: 'rgba(234, 179, 8, 0.18)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.4)' }}
                            >
                              ⭐ Cliente Favorito / Frecuente
                            </span>
                          ) : (
                            <span 
                              className="mercado-user-role-badge" 
                              style={{ background: 'rgba(34, 197, 94, 0.18)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)' }}
                            >
                              💼 Cliente Atendido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mercado-user-info-rows">
                      <div className="mercado-user-info-row">
                        <MapPin size={13} color="#f26522" style={{ flexShrink: 0 }} />
                        <span>{client.direccion}</span>
                      </div>
                      <div className="mercado-user-info-row">
                        <Phone size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <span>{client.telefono || 'Sin teléfono registrado'}</span>
                      </div>
                      <div className="mercado-user-info-row" style={{ marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                        <span style={{ color: '#f26522', fontWeight: '800' }}>🛠️ Último servicio:</span>
                        <span style={{ color: '#ffffff', fontWeight: '700' }}>{client.ultimoTrabajo.titulo}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                        <span>📅 {client.ultimoTrabajo.fecha}</span>
                        <span style={{ color: '#4ade80', fontWeight: '800' }}>
                          Total: ${client.totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="mercado-user-card-footer">
                      {cleanPhone ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <a 
                            href={`https://wa.me/52${cleanPhone}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="mercado-user-btn-action whatsapp"
                          >
                            💬 WhatsApp
                          </a>
                          <a 
                            href={`tel:${cleanPhone}`} 
                            className="mercado-user-btn-action"
                          >
                            📞 Llamar
                          </a>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Sin contacto directo</span>
                      )}

                      <button
                        type="button"
                        className="mercado-user-btn-action primary"
                        onClick={() => setSelectedClientForHistory(client)}
                      >
                        📋 Historial ({client.trabajosCount}) →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL DE HISTORIAL DE SERVICIOS POR CLIENTE ─── */}
      {selectedClientForHistory && (
        <div className="mercado-client-jobs-overlay" onClick={() => setSelectedClientForHistory(null)}>
          <div className="mercado-client-jobs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mercado-client-jobs-header">
              <div>
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👤 {selectedClientForHistory.nombre}
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  📍 {selectedClientForHistory.direccion} {selectedClientForHistory.telefono && `• 📞 ${selectedClientForHistory.telefono}`}
                </span>
              </div>
              <span className="mercado-modal-close" onClick={() => setSelectedClientForHistory(null)}>×</span>
            </div>

            <div className="mercado-client-jobs-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f121a', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1' }}>
                  Total de Servicios Realizados: <strong>{selectedClientForHistory.trabajosCount}</strong>
                </span>
                <span style={{ fontSize: '14px', fontWeight: '900', color: '#4ade80' }}>
                  Total Acumulado: ${selectedClientForHistory.totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <h4 style={{ margin: '8px 0 2px 0', color: '#f26522', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '800' }}>
                Desglose de Trabajos:
              </h4>

              {selectedClientForHistory.trabajos.map((job, idx) => (
                <div key={`cli-job-${job.id}-${idx}`} className="mercado-client-job-item">
                  <div className="mercado-client-job-item-header">
                    <span className="mercado-client-job-title">{job.titulo}</span>
                    <span className="mercado-client-job-price">
                      ${parseFloat(job.agreed_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <p className="mercado-client-job-desc">{job.descripcion}</p>

                  <div className="mercado-client-job-footer">
                    <span>📅 Solicitado: {job.fecha}</span>
                    <span style={{ color: '#38bdf8', fontWeight: '700' }}>
                      {job.scheduled_at ? `Cita: ${new Date(job.scheduled_at).toLocaleDateString('es-MX')}` : 'Sin cita agendada'}
                    </span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#f26522', fontWeight: '800', cursor: 'pointer', fontSize: '11.5px' }}
                      onClick={() => {
                        setSelectedClientForHistory(null);
                        openQuoteModalForJob(job);
                      }}
                    >
                      Abrir Detalle / Chat →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          VISTA 2: MERCADO DE TRABAJOS (MAPA + SOLICITUDES DISPONIBLES)
      ════════════════════════════════════════════════════════════ */}
      {mainView === 'mercado' && (
        <div className="mercado-content">
          {/* Floating Mobile Toggle Button (Tipo Uber) */}
          <button 
            className="mercado-mobile-toggle-btn"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          >
            {mobileDrawerOpen ? (
              <><MapIcon size={16} /> Ver Mapa</>
            ) : (
              <><List size={16} /> Ver Lista ({filteredNetworkJobs.length})</>
            )}
          </button>

          {/* ─── Sidebar (Solo Trabajos Disponibles / Solicitudes) ─── */}
          <div className={`mercado-sidebar ${mobileDrawerOpen ? 'mobile-open' : ''}`}>
            <div className="mercado-sidebar-header">
              <div 
                className="mercado-mobile-drag-handle" 
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)} 
              />
              <div className="mercado-sidebar-brand-row">
                <span className="mercado-sidebar-eyebrow">Panel Técnico</span>
                <span className="mercado-sidebar-live-pill">● EN VIVO</span>
              </div>
              <h2 className="mercado-sidebar-subtitle">Mercado de la Red</h2>
              <p className="mercado-sidebar-desc">Cotiza solicitudes de clientes disponibles en tiempo real</p>

              {/* Barra de Búsqueda estilo Image 4 */}
              <div className="mercado-search-box">
                <Search size={16} className="mercado-search-icon" />
                <input
                  type="text"
                  className="mercado-search-input"
                  placeholder="Buscar por falla, colonia, cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="mercado-search-clear" onClick={() => setSearchQuery('')}>×</button>
                )}
              </div>
            </div>

            {/* Barra de Contador de Disponibles */}
            <div style={{ padding: '10px 18px', background: '#141722', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🌐 Solicitudes Disponibles
              </span>
              <span style={{ background: '#f26522', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>
                {filteredNetworkJobs.length}
              </span>
            </div>

            {/* Lista de Trabajos con Scroll */}
            <div className="mercado-job-list">
              {filteredNetworkJobs.length === 0 && (
                <div className="mercado-empty-state-card">
                  <div className="empty-icon">⏳</div>
                  <h4>No hay solicitudes disponibles</h4>
                  <p>{searchQuery ? 'Ningún trabajo coincide con tu búsqueda.' : 'En cuanto los clientes publiquen solicitudes aparecerán aquí.'}</p>
                </div>
              )}
              {filteredNetworkJobs.map(job => {
                const cat = getCategoryIcon(job.tipo, job.titulo, job.equipo);
                return (
                  <div
                    key={job.id}
                    className={`mercado-job-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                    onClick={() => openQuoteModalForJob(job)}
                  >
                    <div className="mercado-card-inner-flex">
                      {/* Circular Category Avatar */}
                      <div 
                        className="mercado-card-avatar-circle"
                        style={{ background: cat.bg, borderColor: cat.color }}
                        title={cat.label}
                      >
                        <span>{cat.icon}</span>
                      </div>

                      <div className="mercado-card-content-wrap">
                        {/* 1. Colonia, Urgencia y Badge de Cotización */}
                        <div className="mercado-job-card-top">
                          <div className="mercado-job-colonia-tag">
                            <MapPin size={12} color="#f26522" />
                            <span>{job.zona}</span>
                          </div>
                          
                          {job.is_urgent && (
                            <span className="mercado-urgency-badge urgent">⚡ SOS</span>
                          )}
                          
                          {job.myQuote ? (
                            <span className={`mercado-job-badge ${job.myQuote.status === 'rejected' ? 'badge-rejected' : (job.myQuote.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`}>
                              {job.myQuote.status === 'rejected' ? 'Rechazada' : (job.myQuote.price > 0 ? `$${parseFloat(job.myQuote.price).toLocaleString('es-MX')}` : 'Chat')}
                            </span>
                          ) : (
                            <span className="mercado-job-badge-disponible">Disponible</span>
                          )}
                        </div>

                        {/* 2. Titulo y Descripción */}
                        <h4 className="mercado-job-card-title">{job.titulo}</h4>
                        <p className="mercado-job-card-desc">{job.descripcion}</p>

                        {/* 3. ALERTA DE MENSAJE DEL CLIENTE */}
                        {job.lastClientMsg && (
                          <div className="mercado-job-msg-alert">
                            <span className="mercado-msg-dot-pulse" />
                            <span>💬 <strong>Mensaje del Cliente:</strong> "{job.lastClientMsg.message}"</span>
                          </div>
                        )}

                        {/* 4. Footer */}
                        <div className="mercado-job-card-footer">
                          <span className="mercado-ofertas-count">{job.cotizaciones} ofertas enviadas</span>
                          <span className="mercado-fecha-tag"><Clock size={11} /> {job.fecha}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Map ─── */}
          <div className="mercado-map-section">
            {isLoaded ? (
              <>
                <div className="mercado-map-overlay-badge">
                  <span className="mercado-map-live-dot" />
                  {`${filteredNetworkJobs.length} disponibles`}
                </div>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={defaultCenter}
                  zoom={13}
                  options={{ disableDefaultUI: false, styles: DARK_MAP_STYLES }}
                >
                  {/* Marcadores de Trabajos Disponibles */}
                  {filteredNetworkJobs.map(job => (
                    <React.Fragment key={job.id}>
                      <Circle
                        center={{ lat: job.lat, lng: job.lng }}
                        radius={550}
                        options={{
                          fillColor: job.is_urgent ? '#ef4444' : (job.lastClientMsg ? '#2563eb' : '#ff6600'),
                          fillOpacity: 0.18,
                          strokeColor: job.is_urgent ? '#dc2626' : (job.lastClientMsg ? '#1d4ed8' : '#ea580c'),
                          strokeOpacity: 0.75,
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
        </div>
      )}

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
                      {selectedJob.is_accepted ? '✅ Trabajo Aceptado' : '💼 Detalle del Trabajo'}
                    </h2>
                  </div>

                  {/* Selector de Pestañas en el Header para TODOS los trabajos */}
                  <div className="mercado-modal-header-tabs">
                    <button
                      type="button"
                      className={`mercado-modal-header-tab ${activeModalTab === 'detalle' ? 'active' : ''}`}
                      onClick={() => setActiveModalTab('detalle')}
                    >
                      {selectedJob.is_accepted ? <Clock size={14} /> : <FileText size={14} />}
                      {selectedJob.is_accepted ? 'Coordinación & Horario' : 'Detalle & Cotización'}
                    </button>
                    <button
                      type="button"
                      className={`mercado-modal-header-tab ${activeModalTab === 'chat' ? 'active' : ''}`}
                      onClick={() => setActiveModalTab('chat')}
                    >
                      <MessageCircle size={14} /> Chat con el Cliente ({chatMessages.length})
                      {lastClientMsg && <span className="mercado-tab-alert-dot" />}
                    </button>
                  </div>

                  <span className="mercado-modal-close" onClick={() => setShowQuoteModal(false)}>×</span>
                </div>

                <div className="mercado-premium-body">
                  {/* ─────────────────────────────────────────────────────────────
                      CASO A: TRABAJO ACEPTADO - VISTA DE COORDINACIÓN Y HORARIO
                  ───────────────────────────────────────────────────────────── */}
                  {selectedJob.is_accepted && activeModalTab === 'detalle' && (
                    <>
                      {/* Columna Izquierda: Galería de Fotos y Problema Reportado */}
                      <div className="mercado-premium-details" style={{ flex: '0.95', gap: '14px' }}>
                        {/* Galería de Fotos */}
                        {activePhoto ? (
                          <div className="mercado-photo-gallery">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              {activePhoto === selectedJob.facade_photo ? (
                                <span className="mercado-gallery-type-badge facade">
                                  🏡 Fachada del Inmueble (Registro del Levantamiento)
                                </span>
                              ) : (
                                <span className="mercado-gallery-type-badge problem">
                                  📸 Evidencia de Falla {selectedJob.problem_photos && selectedJob.problem_photos.length > 1 ? `(${selectedJob.problem_photos.indexOf(activePhoto) + 1} de ${selectedJob.problem_photos.length})` : ''}
                                </span>
                              )}
                            </div>

                            <div
                              className="mercado-premium-image-wrapper"
                              onClick={() => setIsPhotoZoomed(true)}
                              title="Clic para ampliar imagen"
                              style={{ height: '200px' }}
                            >
                              <img src={activePhoto} alt="Fotografía del servicio" className="mercado-premium-image" />
                              <div className="mercado-image-zoom-badge">
                                <Maximize2 size={12} /> Clic para ampliar foto
                              </div>
                            </div>

                            {selectedJob.fotos && selectedJob.fotos.length > 1 && (
                              <div className="mercado-thumbnails-row">
                                {selectedJob.fotos.map((f, idx) => {
                                  const isFacade = f === selectedJob.facade_photo;
                                  const probIndex = selectedJob.problem_photos ? selectedJob.problem_photos.indexOf(f) : idx;
                                  return (
                                    <div key={idx} className="mercado-thumb-wrapper">
                                      <div
                                        className={`mercado-thumb-item ${activePhoto === f ? 'active' : ''}`}
                                        onClick={() => setActivePhoto(f)}
                                        title={isFacade ? 'Ver Fachada de la Casa' : `Ver Evidencia ${probIndex + 1}`}
                                      >
                                        <img src={f} alt={isFacade ? 'Fachada' : `Evidencia ${probIndex + 1}`} />
                                      </div>
                                      <span className={`mercado-thumb-badge ${isFacade ? 'facade' : (activePhoto === f ? 'active' : '')}`}>
                                        {isFacade ? '🏡 Fachada' : `📸 Falla ${probIndex >= 0 ? probIndex + 1 : idx + 1}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mercado-no-photo-placeholder" style={{ height: '140px' }}>
                            <ImageIcon size={32} color="#94a3b8" />
                            <span>Sin fotografías adjuntas</span>
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
                      <div className="mercado-premium-form" style={{ flex: '1.25', padding: '20px 24px', gap: '14px', display: 'flex', flexDirection: 'column' }}>
                        
                        {/* 1. SECCIÓN HERO: PROGRAMAR HORA DE IDA / VISITA */}
                        <div className="mercado-hero-scheduler-box">
                          <div className="mercado-hero-scheduler-header">
                            <strong>
                              <Clock size={18} color="#16a34a" /> Programar Hora de Llegada / Visita
                            </strong>
                            {isRescheduleRequested ? (
                              <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '800' }}>
                                ⚠️ Re-coordinación Solicitada
                              </span>
                            ) : isScheduleConfirmed ? (
                              <span className="mercado-hero-scheduler-badge">
                                ✓ Confirmada por el Cliente
                              </span>
                            ) : isPendingClientConfirm ? (
                              <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '800' }}>
                                ⏳ Esperando Confirmación
                              </span>
                            ) : selectedJob.scheduled_at ? (
                              <span className="mercado-hero-scheduler-badge">
                                ✓ Programada
                              </span>
                            ) : (
                              <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                                Pendiente
                              </span>
                            )}
                          </div>

                          {/* Alerta de re-coordinación solicitada */}
                          {isRescheduleRequested && lastScheduleResponse && (
                            <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c2410c', fontWeight: '800', fontSize: '13px' }}>
                                <AlertCircle size={16} /> El cliente solicitó acordar otro horario:
                              </div>
                              <div style={{ margin: '6px 0 2px 0', fontSize: '13px', color: '#7c2d12', fontWeight: '600', fontStyle: 'italic', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                                "{lastScheduleResponse.message.replace(/^⚠️\s*[^:]+:\s*/, '').replace(/^"|"$/g, '') || lastScheduleResponse.message}"
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#ea580c', marginTop: '6px', fontWeight: '700' }}>
                                👉 Selecciona abajo la nueva hora acordada con el cliente y haz clic en "Proponer Nuevo Horario":
                              </div>
                            </div>
                          )}

                          {isScheduleConfirmed && (
                            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: '800', fontSize: '13px' }}>
                                <CheckCircle2 size={16} /> Cita Confirmada por el Cliente
                              </div>
                              <div style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#0f172a', fontWeight: '800' }}>
                                📅 {new Date(selectedJob.scheduled_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                              </div>
                            </div>
                          )}

                          {isPendingClientConfirm && (
                            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', fontWeight: '800', fontSize: '13px' }}>
                                <Clock size={16} /> Horario Propuesto Enviado al Cliente
                              </div>
                              <div style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#1e3a8a', fontWeight: '800' }}>
                                📅 {new Date(selectedJob.scheduled_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#3b82f6', marginTop: '4px' }}>
                                El cliente ha recibido la propuesta y te responderá confirmando o re-coordinando.
                              </div>
                            </div>
                          )}

                          {!selectedJob.scheduled_at && !isRescheduleRequested && (
                            <div className="mercado-hero-scheduler-status">
                              ⚠️ Selecciona cuándo acudirás al domicilio para que el cliente confirme el horario:
                            </div>
                          )}

                          <div className="mercado-hero-scheduler-input-row">
                            <button
                              type="button"
                              className="mdtp-trigger-btn"
                              onClick={() => setShowDatePickerModal(true)}
                              title="Clic para seleccionar fecha y hora con el reloj dinámico"
                            >
                              <div className="mdtp-trigger-content">
                                <span className="mdtp-trigger-icon"><Clock size={16} /></span>
                                <span>{formatDateTimeHuman(scheduleDate)}</span>
                              </div>
                              <span style={{ fontSize: '12px', color: '#6200ee', fontWeight: '800' }}>Cambiar ▾</span>
                            </button>

                            <button
                              type="button"
                              className="mercado-hero-scheduler-btn"
                              onClick={() => handleProgramarVisita(selectedJob.id)}
                              disabled={savingSchedule}
                            >
                              <Clock size={16} />
                              <span>{savingSchedule ? 'Guardando...' : (isRescheduleRequested ? '📅 Proponer Nuevo Horario' : (selectedJob.scheduled_at ? '✏️ Modificar Horario' : '📅 Proponer Hora de Ida'))}</span>
                            </button>
                          </div>

                          <MaterialDateTimePicker
                            isOpen={showDatePickerModal}
                            value={scheduleDate}
                            onChange={(newVal) => setScheduleDate(newVal)}
                            onClose={() => setShowDatePickerModal(false)}
                            title="Programar Hora de Llegada"
                          />
                        </div>

                        {/* 2. DIRECCIÓN EXACTA Y CONTACTO DIRECTO */}
                        <div className="mercado-accepted-address-box">
                          <div className="mercado-address-header">
                            <span className="mercado-address-label">
                              📍 DIRECCIÓN COMPLETA DEL CLIENTE
                            </span>
                            <button
                              type="button"
                              onClick={() => abrirEnGoogleMaps(selectedJob)}
                              className="mercado-maps-btn"
                              title={extraerCoordenadas(selectedJob) ? "Abrir ubicación exacta por coordenadas GPS" : "Abrir dirección en Google Maps"}
                            >
                              <ExternalLink size={12} /> Abrir Maps ↗
                            </button>
                          </div>

                          <div className="mercado-address-text">
                            {selectedJob.full_address}
                          </div>

                          {extraerCoordenadas(selectedJob) && (
                            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🛰️ GPS Detectado: {extraerCoordenadas(selectedJob).formatted}</span>
                            </div>
                          )}

                          {/* Ficha Visual de Fachada de la Propiedad (Levantamiento) */}
                          {selectedJob.facade_photo ? (
                            <div 
                              className="mercado-facade-card-accepted"
                              onClick={() => { setActivePhoto(selectedJob.facade_photo); setIsPhotoZoomed(true); }}
                              title="Clic para ampliar y ver la fachada de la propiedad"
                            >
                              <img src={selectedJob.facade_photo} alt="Fachada del Inmueble" className="mercado-facade-card-img" />
                              <div className="mercado-facade-card-info">
                                <span className="mercado-facade-card-tag">🏡 Fachada del Inmueble</span>
                                <span className="mercado-facade-card-text">{selectedJob.property_name || selectedJob.full_address}</span>
                                <span className="mercado-facade-card-zoom">🔍 Clic para ampliar foto de fachada</span>
                              </div>
                            </div>
                          ) : (
                            <div className="mercado-facade-card-empty">
                              <span>🏡 Sin foto de fachada registrada en el levantamiento</span>
                            </div>
                          )}

                          {selectedJob.property_name && selectedJob.property_name !== selectedJob.full_address && (
                            <div className="mercado-address-property-name" style={{ marginTop: '6px' }}>
                              Propiedad: {selectedJob.property_name}
                            </div>
                          )}

                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            Cliente: <strong style={{ color: '#0f172a' }}>{selectedJob.client_name}</strong>
                          </div>

                          {/* Botones de Acción: Chat con el Cliente y Aviso de Llegada al Lugar */}
                          <div className="mercado-contact-actions-row">
                            <button
                              type="button"
                              className="mercado-contact-action-btn chat-action"
                              onClick={() => setActiveModalTab('chat')}
                              title="Abrir chat directo con el cliente"
                            >
                              <MessageCircle size={17} />
                              <span>Chat con el Cliente {chatMessages.length > 0 ? `(${chatMessages.length})` : ''}</span>
                            </button>

                            <button
                              type="button"
                              className={`mercado-contact-action-btn arrival-action ${arrivalAlertSent[selectedJob.id] ? 'sent' : ''}`}
                              onClick={() => handleSendArrivalAlert(selectedJob)}
                              disabled={sendingArrivalAlert}
                              title="Enviar aviso al cliente informando que te encuentras en el domicilio"
                            >
                              <MapPin size={17} />
                              <span>
                                {sendingArrivalAlert 
                                  ? 'Enviando aviso...' 
                                  : (arrivalAlertSent[selectedJob.id] 
                                      ? `✓ Aviso Enviado (${arrivalAlertSent[selectedJob.id]})` 
                                      : 'Aviso: Me encuentro en el lugar')}
                              </span>
                            </button>
                          </div>

                          {/* Banner de confirmación de aviso de llegada */}
                          {arrivalAlertToast && (
                            <div className="mercado-arrival-toast-banner">
                              <CheckCircle2 size={16} color="#16a34a" />
                              <span>{arrivalAlertToast}</span>
                            </div>
                          )}
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
                            onClick={() => setActiveModalTab('chat')}
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
                  {selectedJob.is_accepted && activeModalTab === 'chat' && (
                    <>
                      {/* Columna Izquierda: Botón de volver y Resumen Rápido */}
                      <div className="mercado-premium-details" style={{ flex: '0.85', gap: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setActiveModalTab('detalle')}
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
                      CASO C: TRABAJO DISPONIBLE - VISTA DE DETALLE & COTIZACIÓN
                  ───────────────────────────────────────────────────────────── */}
                  {!selectedJob.is_accepted && activeModalTab === 'detalle' && (
                    <>
                      {/* Columna Izquierda: Galería de Fotos y Problema Solicitado (Sin fotos de fachada) */}
                      <div className="mercado-premium-details" style={{ flex: '0.95', gap: '14px' }}>
                        {selectedJob.problem_photos && selectedJob.problem_photos.length > 0 && activePhoto ? (
                          <div className="mercado-photo-gallery">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <span className="mercado-gallery-type-badge problem">
                                📸 Evidencia de Falla {selectedJob.problem_photos.length > 1 ? `(${selectedJob.problem_photos.indexOf(activePhoto) + 1} de ${selectedJob.problem_photos.length})` : ''}
                              </span>
                            </div>

                            <div
                              className="mercado-premium-image-wrapper"
                              onClick={() => setIsPhotoZoomed(true)}
                              title="Clic para ampliar imagen"
                              style={{ height: '200px' }}
                            >
                              <img src={activePhoto} alt="Fotografía del problema" className="mercado-premium-image" />
                              <div className="mercado-image-zoom-badge">
                                <Maximize2 size={12} /> Clic para ampliar foto
                              </div>
                            </div>

                            {selectedJob.problem_photos.length > 1 && (
                              <div className="mercado-thumbnails-row">
                                {selectedJob.problem_photos.map((f, idx) => (
                                  <div key={idx} className="mercado-thumb-wrapper">
                                    <div
                                      className={`mercado-thumb-item ${activePhoto === f ? 'active' : ''}`}
                                      onClick={() => setActivePhoto(f)}
                                      title={`Ver Evidencia ${idx + 1}`}
                                    >
                                      <img src={f} alt={`Evidencia ${idx + 1}`} />
                                    </div>
                                    <span className={`mercado-thumb-badge ${activePhoto === f ? 'active' : ''}`}>
                                      📸 Falla {idx + 1}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mercado-no-photo-placeholder" style={{ height: '170px' }}>
                            <ImageIcon size={32} color="#94a3b8" />
                            <span style={{ fontWeight: '700', color: '#64748b' }}>Sin fotografías de falla adjuntas</span>
                            <span style={{ fontSize: '11.5px', color: '#9a3412', marginTop: '4px', textAlign: 'center', maxWidth: '280px', lineHeight: '1.35' }}>
                              🔒 La foto de fachada y dirección exacta se revelan al ser aceptada tu cotización.
                            </span>
                          </div>
                        )}

                        {/* Detalle del Problema Solicitado */}
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
                      </div>

                      {/* Columna Derecha: Colonia, Mi Cotización y Botón para Abrir Chat */}
                      <div className="mercado-premium-form" style={{ flex: '1.25', padding: '20px 24px', gap: '14px', display: 'flex', flexDirection: 'column' }}>
                        {/* 1. Zona / Colonia aproximada */}
                        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <MapPin size={22} color="#ea580c" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: '#ea580c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Colonia Cercana
                              </strong>
                              {selectedJob.is_urgent && (
                                <span className="mercado-urgency-badge urgent">⚡ Urgente</span>
                              )}
                            </div>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'block', marginTop: '2px' }}>
                              {selectedJob.zona}
                            </span>
                            <div style={{ fontSize: '11.5px', color: '#9a3412', marginTop: '4px' }}>
                              🔒 La dirección exacta y datos de contacto se te revelarán una vez que el cliente acepte tu cotización.
                            </div>
                          </div>
                        </div>

                        {/* 2. Mi Propuesta Económica */}
                        <div style={{ background: selectedJob.myQuote?.status === 'rejected' ? '#fff1f2' : (selectedJob.myQuote?.status === 'accepted' ? '#f0fdf4' : '#ffffff'), border: `1.5px solid ${selectedJob.myQuote?.status === 'rejected' ? '#fecdd3' : (selectedJob.myQuote?.status === 'accepted' ? '#bbf7d0' : '#e2e8f0')}`, borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', color: selectedJob.myQuote?.status === 'rejected' ? '#e11d48' : '#ea580c', letterSpacing: '0.5px' }}>
                              📋 Mi Propuesta Económica
                            </span>
                            {selectedJob.myQuote && (
                              <span className={`mercado-job-badge ${selectedJob.myQuote.status === 'rejected' ? 'badge-rejected' : (selectedJob.myQuote.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`}>
                                {getStatusLabel(selectedJob.myQuote.status)}
                              </span>
                            )}
                          </div>

                          {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? (
                            <div>
                              <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>
                                ${parseFloat(selectedJob.myQuote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>MXN</span>
                              </div>
                              {selectedJob.myQuote.message && (
                                <div style={{ fontSize: '12.5px', color: '#475569', fontStyle: 'italic', marginTop: '6px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                  "{selectedJob.myQuote.message}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 8px' }}>
                              Aún no has enviado una cotización económica a este trabajo.
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setQuoteStep(2)}
                            style={{
                              width: '100%',
                              marginTop: '12px',
                              padding: '12px 16px',
                              background: 'linear-gradient(135deg, #ff6600 0%, #ea580c 100%)',
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
                              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <DollarSign size={16} />
                            <span>{selectedJob.myQuote && selectedJob.myQuote.price > 0 ? '✏️ Modificar Cotización' : '💼 Enviar Cotización'}</span>
                          </button>
                        </div>

                        {/* 3. Botón de acceso al Chat con el Cliente */}
                        <div>
                          {lastClientMsg && (
                            <div className="mercado-chat-alert-banner" style={{ marginBottom: '8px' }}>
                              <div className="mercado-chat-alert-icon">🔔</div>
                              <div className="mercado-chat-alert-text">
                                <strong>El Cliente te envió un mensaje:</strong>
                                <span>"{lastClientMsg.message}"</span>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            className="mercado-open-chat-card-btn"
                            onClick={() => setActiveModalTab('chat')}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <MessageCircle size={18} />
                              <span>Consultar / Chat con el Cliente ({chatMessages.length})</span>
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: '900' }}>→</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CASO D: TRABAJO DISPONIBLE - VISTA DE CHAT DIRECTO
                  ───────────────────────────────────────────────────────────── */}
                  {!selectedJob.is_accepted && activeModalTab === 'chat' && (
                    <>
                      {/* Columna Izquierda: Botón de volver y Resumen Rápido */}
                      <div className="mercado-premium-details" style={{ flex: '0.85', gap: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setActiveModalTab('detalle')}
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
                          <ChevronLeft size={16} /> Volver a Detalle y Cotización
                        </button>

                        {/* Resumen del Trabajo */}
                        <div className="mercado-accepted-address-box">
                          <span className="mercado-address-label" style={{ color: '#ea580c' }}>
                            📋 {selectedJob.titulo}
                          </span>
                          <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                            📍 Zona: <strong>{selectedJob.zona}</strong>
                          </div>
                          {selectedJob.is_urgent && (
                            <span className="mercado-urgency-badge urgent" style={{ marginTop: '4px', alignSelf: 'flex-start' }}>
                              ⚡ Urgente
                            </span>
                          )}
                        </div>

                        {/* Mini resumen de la cotización con botón de cotizar */}
                        <div className="mercado-accepted-price-box" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700' }}>Mi Cotización:</span>
                            {selectedJob.myQuote && (
                              <span className={`mercado-job-badge ${selectedJob.myQuote.status === 'rejected' ? 'badge-rejected' : (selectedJob.myQuote.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`} style={{ fontSize: '10px' }}>
                                {getStatusLabel(selectedJob.myQuote.status)}
                              </span>
                            )}
                          </div>

                          {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? (
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                              ${parseFloat(selectedJob.myQuote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                            </div>
                          ) : (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              Sin cotización enviada
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setQuoteStep(2)}
                            style={{
                              padding: '8px 12px',
                              background: '#fff7ed',
                              color: '#ea580c',
                              border: '1px solid #fed7aa',
                              borderRadius: '8px',
                              fontWeight: '800',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <DollarSign size={14} />
                            <span>{selectedJob.myQuote && selectedJob.myQuote.price > 0 ? 'Modificar Cotización' : 'Cotizar Trabajo'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Columna Derecha: CHAT INTEGRADO AMPLIO */}
                      <div className="mercado-embedded-chat-panel" style={{ flex: '1.25' }}>
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

                        {/* Stream de Mensajes */}
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
                </div>

                <div className="mercado-premium-footer" style={{ justifyContent: 'space-between' }}>
                  <button className="mercado-btn-cancel" onClick={() => setShowQuoteModal(false)}>Cerrar Ventana</button>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedJob.is_accepted 
                      ? '✅ Coordina la hora de visita y confirma con el cliente por WhatsApp o chat.'
                      : '💬 Usa las pestañas para revisar los detalles o consultar en el chat.'}
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════
                PASO 2: FORMULARIO DE COTIZACIÓN (CON FOTOS Y DETALLE)
            ══════════════════════════════════════════════════ */}
            {quoteStep === 2 && (
              <>
                <div className="mercado-premium-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0 }}>
                      💰 {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? 'Modificar Cotización' : 'Enviar Cotización de Trabajo'}
                    </h2>
                  </div>
                  <span className="mercado-modal-close" onClick={() => setShowQuoteModal(false)}>×</span>
                </div>

                <div className="mercado-premium-body">
                  {/* Columna Izquierda: Fotos de Evidencia y Detalle Completo del Problema */}
                  <div className="mercado-premium-details" style={{ flex: '1', gap: '14px' }}>
                    {activePhoto ? (
                      <div className="mercado-photo-gallery">
                        <div
                          className="mercado-premium-image-wrapper"
                          onClick={() => setIsPhotoZoomed(true)}
                          title="Clic para ampliar imagen"
                          style={{ height: '220px' }}
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
                      <div className="mercado-no-photo-placeholder" style={{ height: '150px' }}>
                        <ImageIcon size={34} color="#94a3b8" />
                        <span>Sin fotografías de evidencia adjuntas</span>
                      </div>
                    )}

                    {/* Detalle del Problema Solicitado */}
                    <div className="mercado-problem-detail-box">
                      <div className="mercado-problem-detail-header">
                        <FileText size={17} color="#ea580c" />
                        <span>{selectedJob.titulo}</span>
                      </div>
                      <div className="mercado-problem-detail-desc">
                        {selectedJob.descripcion}
                      </div>
                      <div className="mercado-problem-detail-footer">
                        <span><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: '3px', color: '#ea580c' }} /> Zona: {selectedJob.zona}</span>
                        <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> {selectedJob.fecha}</span>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Formulario de Cotización */}
                  <div className="mercado-premium-form" style={{ flex: '1.1', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Propuesta de Servicio
                        </span>
                        {selectedJob.is_urgent && (
                          <span className="mercado-urgency-badge urgent">⚡ Urgente (Hoy Mismo)</span>
                        )}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                        Ingresa tu Oferta Económica
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                        Define el costo que cobrarás por solucionar este problema. El cliente revisará tu propuesta.
                      </p>
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

                    <div className="mercado-form-group" style={{ marginTop: '10px' }}>
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
                          style={{ fontSize: '16px', fontWeight: '700' }}
                        />
                      </div>
                    </div>

                    <div className="mercado-form-group" style={{ marginTop: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', display: 'block' }}>
                        Mensaje para el cliente
                      </label>
                      <textarea
                        placeholder="Ej. Hola, cuento con las herramientas y refacciones necesarias. Puedo ir hoy mismo a revisarlo..."
                        className="mercado-premium-textarea"
                        value={quoteMessage}
                        onChange={(e) => setQuoteMessage(e.target.value)}
                        rows={4}
                        style={{ flex: 1, minHeight: '100px' }}
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

      {/* ─── Modal de Calendario Interactivo ─── */}
      <ModalCalendarioCliente
        isOpen={showModalCalendario}
        onClose={() => setShowModalCalendario(false)}
        onSelectJob={(job) => {
          const fullJob = acceptedJobs.find(j => j.id === job.id) || networkJobs.find(j => j.id === job.id) || job;
          setSelectedJob(fullJob);
          setActiveModalTab('detalle');
          setQuoteStep(1);
          setShowQuoteModal(true);
          setShowModalCalendario(false);
        }}
      />

      {/* ─── Modal de Registro de Usuario / Cliente ─── */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={fetchJobs}
      />
    </div>
  );
};

export default MercadoTrabajos;
