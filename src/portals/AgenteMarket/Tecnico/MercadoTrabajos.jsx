import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindowF, DirectionsRenderer } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER } from "../../../components/Shared/googleMapsConfig";
import MaterialDateTimePicker, { formatDateTimeHuman } from '../../../components/Shared/MaterialDateTimePicker';
import Swal from 'sweetalert2';
import { 
  MapPin, DollarSign, Clock, Send, User, FileText, Maximize2, Image as ImageIcon, 
  X, List, Map as MapIcon, MessageCircle, AlertCircle, CheckCircle2, Phone, Calendar, 
  ChevronLeft, ChevronRight, ExternalLink, CalendarDays, Search, LogOut, Briefcase, Layers, ShieldCheck,
  RotateCw, AlertTriangle, Users, UserPlus, PhoneCall, Mail, Star, Award, History,
  Home, Car, Navigation, Wrench, Camera, Plus, Trash2, Check, ArrowRight, Play, Eye, Sparkles, Lock, Zap,
  Sun, Moon, Globe, SlidersHorizontal, ChevronDown, ChevronUp, Maximize, Minimize,
  Snowflake, Droplets, Paintbrush, KeyRound, Hammer, Leaf, Siren, ClipboardList, FolderOpen, BarChart3, Bell,
  Ban, Undo2, Building2
} from 'lucide-react';
import '../../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';
import '../../../styles/AgenteMarket/Admin/VistaRedAutonomo.css';
import '../../../styles/Shared/ToolbarAcciones.css';
import '../../../styles/AgenteMarket/Tecnico/TableroTecnico.css';
import { useAuth } from '../../../context/AuthContext';
import defaultLogo from '../../../assets/Logo4.png';
import ModalCalendarioCliente from '../Cliente/ModalCalendarioCliente';
import RegisterModal from '../../../components/Auth/Register';
import TecnicoHeader from '../../../components/Shared/TecnicoHeader';
import ModalReportePdfTecnico from './ModalReportePdfTecnico';
import { mostrarAviso } from '../../../utils/dialogos';
import CampoFechaHora from '../../../components/Shared/CampoFechaHora';
import ModalCalificarCliente from './ModalCalificarCliente';
import Calificacion from '../Shared/Calificacion';

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
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }]
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
    stylers: [{ visibility: "off" }]
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

// Íconos de la app (lucide) por categoría en lugar de los emojis de getCategoryIcon
export const ICONOS_CATEGORIA = {
  'Climatización': Snowflake,
  'Plomería': Droplets,
  'Electricidad': Zap,
  'Pintura': Paintbrush,
  'Cerrajería': KeyRound,
  'Carpintería': Hammer,
  'Jardinería': Leaf,
  'Emergencia SOS': Siren,
};

// En la tarjeta la urgencia y el horario ya van como etiquetas: se quitan del texto
export const descripcionTarjeta = (desc) => {
  if (!desc) return '';
  return desc
    .replace(/\s*\[URGENCIA\]:[^\n]*/gi, '')
    .replace(/\s*\[FECHA \/ HORARIO DESEADO\]:[^\n]*/gi, '')
    .trim();
};

// Fecha estimada que pidió el cliente al publicar ("Programar"): viene en la descripción como
// "[FECHA / HORARIO DESEADO]: 2026-11-08 - Por la tarde (12pm - 5pm)". No es una cita confirmada.
// Devuelve { fecha, texto: "Mañana · Tarde", vencida } o null.
export const fechaDeseada = (desc) => {
  const m = String(desc || '').match(/\[FECHA \/ HORARIO DESEADO\]:\s*(\d{4}-\d{2}-\d{2})(?:\s*-\s*([^\n]*))?/i);
  if (!m) return null;
  const [y, mo, d] = m[1].split('-').map(Number);
  const fecha = new Date(y, mo - 1, d);
  if (isNaN(fecha.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((fecha - hoy) / 86400000);
  let dia;
  if (dias === 0) dia = 'Hoy';
  else if (dias === 1) dia = 'Mañana';
  else if (dias === 2) dia = 'Pasado mañana';
  else {
    const txt = fecha.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').replace(',', '').replace(/ de /g, ' ');
    dia = txt.charAt(0).toUpperCase() + txt.slice(1);
  }
  // "Por la tarde (12pm - 5pm)" → "Tarde"; "Cualquier hora" no se muestra
  const horario = String(m[2] || '').replace(/^por la\s+/i, '').replace(/\s*\(.*\)\s*$/, '').trim();
  const horarioTxt = horario && !/cualquier/i.test(horario) ? horario.charAt(0).toUpperCase() + horario.slice(1) : '';
  return { fecha: m[1], texto: [dia, horarioTxt].filter(Boolean).join(' · '), vencida: dias < 0 };
};

// Camino de progreso horizontal (celular): cada paso ocupa CAMINO_PASO_ANCHO px y sube/baja en zigzag
const PASOS_CAMINO = [
  { step: 1, title: 'Cita', Icono: Home },
  { step: 2, title: 'En camino', Icono: Car },
  { step: 3, title: 'Diagnóstico', Icono: Search },
  { step: 4, title: 'Reparación', Icono: Wrench },
  { step: 5, title: 'Evidencias', Icono: Camera },
  { step: 6, title: 'Concluido', Icono: CheckCircle2 },
];
const CAMINO_PASO_ANCHO = 92;
const CAMINO_ALTO = 150;
const caminoY = (i) => (i % 2 === 0 ? 42 : 92);

// Marcador del técnico mientras va en ruta: casco de obra blanco sobre círculo naranja (trazos de lucide HardHat)
const ICONO_CASCO_RUTA = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46">' +
    '<circle cx="23" cy="23" r="20" fill="#f26522" stroke="#ffffff" stroke-width="3"/>' +
    '<g transform="translate(11 10)" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>' +
      '<path d="M14 6a6 6 0 0 1 6 6v3"/>' +
      '<path d="M4 15v-3a6 6 0 0 1 6-6"/>' +
      '<rect x="2" y="15" width="20" height="4" rx="1"/>' +
    '</g>' +
  '</svg>'
);

// Estado del horario de visita según el chat del trabajo: lo que propuso el técnico
// y lo último que respondió el cliente (confirmó o pidió otro horario).
const estadoHorarioDe = (job) => {
  const msgs = job?.myQuote?.chat_history || [];
  const respuestas = msgs.filter(m => m.is_schedule_response);
  const propuestas = msgs.filter(m => m.is_schedule);
  const respuesta = respuestas.length ? respuestas[respuestas.length - 1] : null;
  const propuesta = propuestas.length ? propuestas[propuestas.length - 1] : null;
  // La respuesta cuenta solo si es posterior a la última propuesta del técnico
  const vigente = Boolean(respuesta && (!propuesta || new Date(respuesta.created_at) >= new Date(propuesta.created_at)));
  const pideOtro = vigente && respuesta.schedule_confirmed === false;
  const confirmado = vigente && respuesta.schedule_confirmed === true;
  let nota = '';
  if (pideOtro) {
    // Mensajes nuevos traen "note"; los viejos solo el texto "…horario de visita: "nota""
    nota = respuesta.note || String(respuesta.message || '').replace(/^.*?horario de visita:\s*/i, '').replace(/^"|"$/g, '').trim();
  }
  return {
    pideOtro,
    confirmado,
    pendiente: Boolean(job?.scheduled_at && !pideOtro && !confirmado),
    nota,
    respuesta,
    propuesta,
  };
};

// Quita emojis de textos guardados (ej. "[URGENCIA]: ⚡ Atención Urgente")
const sinEmojis = (texto) => String(texto || '').replace(/[\p{Extended_Pictographic}️]\s*/gu, '');

// Retraso de la cita en palabras: "Atrasado 3 d" en lugar de "+5629m"
const textoAtraso = (minutos) => {
  const m = Math.abs(minutos);
  if (m >= 1440) return `Atrasado ${Math.floor(m / 1440)} d`;
  if (m >= 60) return `Atrasado ${Math.floor(m / 60)} h`;
  return `Atrasado ${m} min`;
};

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

  mostrarAviso("No se encontraron coordenadas ni dirección para este trabajo.");
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
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER);

  const navigate = useNavigate();
  const location = useLocation();
  const [selectedJob, setSelectedJob] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [networkJobs, setNetworkJobs] = useState([]);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteStep, setQuoteStep] = useState(1);
  const [activePhoto, setActivePhoto] = useState(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(true); // En celular la lista empieza abierta, como en la vista del cliente
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('disponibles'); // 'disponibles' | 'aceptados'
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [activeModalTab, setActiveModalTab] = useState('detalle'); // 'detalle' | 'chat'
  const [mapTheme, setMapTheme] = useState(() => localStorage.getItem('agente_map_theme') || 'dark');

  // Pantalla completa propia del mapa (botón de vidrio).
  // Se oculta donde el navegador no la permite, p. ej. Safari de iPhone.
  const mapaSeccionRef = useRef(null);

  // En PC el detalle del trabajo se abre dentro del mapa; en tablet y celular, a pantalla completa
  const [esEscritorio, setEsEscritorio] = useState(() => window.matchMedia('(min-width: 1025px)').matches);
  useEffect(() => {
    const consulta = window.matchMedia('(min-width: 1025px)');
    const alCambiar = (e) => setEsEscritorio(e.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);
  const [enPantallaCompleta, setEnPantallaCompleta] = useState(false);
  const puedePantallaCompleta = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  useEffect(() => {
    const cambio = () => setEnPantallaCompleta(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', cambio);
    document.addEventListener('webkitfullscreenchange', cambio);
    return () => {
      document.removeEventListener('fullscreenchange', cambio);
      document.removeEventListener('webkitfullscreenchange', cambio);
    };
  }, []);
  const salirPantallaCompleta = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  };
  const alternarPantallaCompleta = () => {
    const el = mapaSeccionRef.current;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      salirPantallaCompleta();
    } else if (el) {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    }
  };
  
  // Live GPS & Navigation State (Uber Style)
  const [technicianLocation, setTechnicianLocation] = useState({ lat: 21.0181, lng: -89.6242 });
  const [hasTechnicianGps, setHasTechnicianGps] = useState(false);
  const [activeNavJob, setActiveNavJob] = useState(null);
  const [navDirections, setNavDirections] = useState(null);
  const [navDistance, setNavDistance] = useState('');
  const [navDuration, setNavDuration] = useState('');
  const [navStatus, setNavStatus] = useState('idle'); // 'idle' | 'en_camino' | 'en_sitio'

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

  // ─── FILTER STATES (FECHA, HORA, TRABAJO) ───
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filtroRef = useRef(null);

  // El panel de filtros flota sobre la lista: se cierra al tocar fuera de él
  useEffect(() => {
    if (!isFilterOpen) return;
    const cerrar = (e) => {
      if (!filtroRef.current?.contains(e.target)) setIsFilterOpen(false);
    };
    document.addEventListener('pointerdown', cerrar);
    return () => document.removeEventListener('pointerdown', cerrar);
  }, [isFilterOpen]);
  const [filterDatePreset, setFilterDatePreset] = useState('TODAS'); // 'TODAS' | 'HOY' | 'MANANA' | 'SEMANA' | 'CUSTOM'
  const [filterCustomDate, setFilterCustomDate] = useState('');
  const [filterTimeSlot, setFilterTimeSlot] = useState('TODAS'); // 'TODAS' | 'MANANA' | 'TARDE' | 'NOCHE'
  const [filterJobType, setFilterJobType] = useState('TODOS');
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [kanbanSectionTab, setKanbanSectionTab] = useState('activos'); // 'activos' | 'finalizados'
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [appLogo, setAppLogo] = useState(defaultLogo);
  const dropdownRef = useRef(null);

  // ─── TABLERO 3-COLUMN WORKSPACE STATES ───
  const [selectedBoardJobId, setSelectedBoardJobId] = useState(null);
  const [mobileBoardTab, setMobileBoardTab] = useState('trabajos'); // 'trabajos' | 'detalle' | 'progreso'
  const [boardPhotos, setBoardPhotos] = useState(() => {
    try {
      const saved = localStorage.getItem('agente_board_photos');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [boardJobStages, setBoardJobStages] = useState(() => {
    try {
      const saved = localStorage.getItem('agente_board_stages');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [boardFilter, setBoardFilter] = useState('TODOS'); // 'TODOS' | 'SOS' | 'PROCESO' | 'AGENDADOS' | 'FINALIZADOS'
  const [boardFiltroAbierto, setBoardFiltroAbierto] = useState(false);
  const [boardListaOculta, setBoardListaOculta] = useState(false); // Escritorio: ocultar la columna "Mis Trabajos"
  const boardFiltroRef = useRef(null);

  // El menú del filtro del tablero se cierra al tocar fuera de él
  useEffect(() => {
    if (!boardFiltroAbierto) return;
    const cerrar = (e) => {
      if (!boardFiltroRef.current?.contains(e.target)) setBoardFiltroAbierto(false);
    };
    document.addEventListener('pointerdown', cerrar);
    return () => document.removeEventListener('pointerdown', cerrar);
  }, [boardFiltroAbierto]);
  const [boardSearch, setBoardSearch] = useState('');
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState(null);
  const [showPdfReportModal, setShowPdfReportModal] = useState(false);

  // Modal 2da Visita
  const [showSecondVisitModal, setShowSecondVisitModal] = useState(false);
  const [secondVisitDate, setSecondVisitDate] = useState('');
  const [secondVisitReason, setSecondVisitReason] = useState('');
  const [submittingSecondVisit, setSubmittingSecondVisit] = useState(false);

  // Tablero Horario de Visita States
  const [showBoardScheduleModal, setShowBoardScheduleModal] = useState(false);
  const [boardScheduleDate, setBoardScheduleDate] = useState('');
  const [boardScheduleNotes, setBoardScheduleNotes] = useState('');
  const [submittingBoardSchedule, setSubmittingBoardSchedule] = useState(false);

  // Technician Clients & Favorites Directory States
  const [userFilter, setUserFilter] = useState('TODOS'); // 'TODOS' | 'HISTORIAL' | 'FAVORITOS'
  const [userSearch, setUserSearch] = useState('');
  const [userFiltroAbierto, setUserFiltroAbierto] = useState(false);
  const userFiltroRef = useRef(null);

  // El menú del filtro de Mis Clientes se cierra al tocar fuera de él
  useEffect(() => {
    if (!userFiltroAbierto) return;
    const cerrar = (e) => {
      if (!userFiltroRef.current?.contains(e.target)) setUserFiltroAbierto(false);
    };
    document.addEventListener('pointerdown', cerrar);
    return () => document.removeEventListener('pointerdown', cerrar);
  }, [userFiltroAbierto]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);
  // Mis clientes: favoritos y bloqueos que marca el técnico (client_user_id -> 'favorito' | 'bloqueado')
  const [marcasClientes, setMarcasClientes] = useState({});
  const [guardandoMarca, setGuardandoMarca] = useState(null);

  const { user, logoutGlobal } = useAuth();
  const authUser = user;

  // Calificar al cliente de cada trabajo terminado es obligatorio para seguir cotizando
  const [pendientesCalifCliente, setPendientesCalifCliente] = useState([]);
  const cargarPendientesCalifCliente = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/tecnico/calificaciones-cliente/pendientes`);
      setPendientesCalifCliente(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      // Si falla, el backend igual lo pide al intentar cotizar
    }
  };
  useEffect(() => {
    if ([6, 7, 8].includes(Number(authUser?.role_id))) cargarPendientesCalifCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Timer reactivo para actualizar dinámicamente minutos restantes cada 30 segundos
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // GPS Tracking en tiempo real del técnico
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setTechnicianLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          setHasTechnicianGps(true);
        },
        (err) => {
          console.warn("GPS no disponible:", err);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Calcular distancia en km entre dos puntos geográficos (Haversine)
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  // Cálculo dinámico de minutos faltantes e información de horario
  const getTimeRemainingInfo = (jobOrDate) => {
    const rawDate = typeof jobOrDate === 'object' ? (jobOrDate?.scheduled_at || jobOrDate?.scheduled_date || jobOrDate?.fecha_cita) : jobOrDate;
    if (!rawDate) {
      return {
        hasSchedule: false,
        text: 'Asignación obligatoria',
        shortText: 'Sin horario',
        badgeClass: 'mandatory',
        minutesDiff: null,
        formattedTime: null,
        isUrgent: false
      };
    }
    try {
      const schedTime = new Date(rawDate).getTime();
      if (isNaN(schedTime)) {
        return {
          hasSchedule: false,
          text: 'Asignación obligatoria',
          shortText: 'Sin horario',
          badgeClass: 'mandatory',
          minutesDiff: null,
          formattedTime: null,
          isUrgent: false
        };
      }
      const nowTime = currentTime || Date.now();
      const diffMinutes = Math.round((schedTime - nowTime) / 60000);
      const dObj = new Date(rawDate);
      const formattedTime = dObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      const formattedDate = dObj.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      let text = '';
      let shortText = '';
      let badgeClass = 'future';
      let isUrgent = false;

      if (diffMinutes > 1440) {
        const days = Math.round(diffMinutes / 1440);
        text = `Cita en ${days} día${days > 1 ? 's' : ''} (${formattedTime})`;
        shortText = formattedDate;
        badgeClass = 'future';
      } else if (diffMinutes > 60) {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        text = `Faltan ${hours}h ${mins > 0 ? `${mins}m` : ''} para la cita`;
        shortText = `En ${hours}h ${mins > 0 ? `${mins}m` : ''}`;
        badgeClass = 'upcoming';
      } else if (diffMinutes > 0) {
        text = `Faltan ${diffMinutes} min para la cita`;
        shortText = `En ${diffMinutes} min`;
        badgeClass = 'imminent';
        isUrgent = true;
      } else if (diffMinutes === 0) {
        text = `¡Es la hora acordada de la cita!`;
        shortText = `Hora acordada`;
        badgeClass = 'imminent';
        isUrgent = true;
      } else {
        // El retraso se expresa en la unidad que se entiende: min, h o días
        const atraso = Math.abs(diffMinutes);
        const dias = Math.floor(atraso / 1440);
        const horas = Math.floor((atraso % 1440) / 60);
        const mins = atraso % 60;
        const legible = dias > 0
          ? `${dias} d${horas > 0 ? ` ${horas} h` : ''}`
          : (horas > 0 ? `${horas} h${mins > 0 ? ` ${mins} min` : ''}` : `${mins} min`);
        text = `Retraso de ${legible}`;
        shortText = `Retraso ${legible}`;
        badgeClass = 'delay';
        isUrgent = true;
      }

      return {
        hasSchedule: true,
        text,
        shortText,
        badgeClass,
        minutesDiff: diffMinutes,
        formattedTime,
        formattedDate,
        isUrgent
      };
    } catch {
      return {
        hasSchedule: false,
        text: 'Asignación obligatoria',
        shortText: 'Sin horario',
        badgeClass: 'mandatory',
        minutesDiff: null,
        formattedTime: null,
        isUrgent: false
      };
    }
  };

  // Detección inteligente de horario para brillo de marcador (si faltan 45 min o menos)
  const getSmartScheduleStatus = (job) => {
    const info = getTimeRemainingInfo(job);
    if (!info.hasSchedule || info.minutesDiff === null) {
      return { isUrgentGlow: false, label: null, minutesLeft: null };
    }
    if (info.minutesDiff <= 45 && info.minutesDiff >= -120) {
      return { isUrgentGlow: true, label: info.text, minutesLeft: info.minutesDiff };
    }
    return { isUrgentGlow: false, label: null, minutesLeft: info.minutesDiff };
  };

  // Iniciar ruta de navegación hacia el trabajo (Modo Uber)
  const handleStartRoute = (job) => {
    // En celular la lista se pliega para que se vea la ruta en el mapa
    setMobileDrawerOpen(false);
    setActiveNavJob(job);
    setNavStatus('en_camino');

    if (window.google && technicianLocation && job.lat && job.lng) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: new window.google.maps.LatLng(technicianLocation.lat, technicianLocation.lng),
          destination: new window.google.maps.LatLng(job.lat, job.lng),
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setNavDirections(result);
            const leg = result.routes[0]?.legs[0];
            if (leg) {
              setNavDistance(leg.distance?.text || '');
              setNavDuration(leg.duration?.text || '');
            }
          }
        }
      );
    }
  };

  // Confirmar llegada al sitio (Validación GPS y registro arrived_at)
  const handleConfirmArrival = async (job) => {
    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');

    // Al llegar: se cierra la navegación y se abre el tablero de ESTE trabajo para comenzar
    const irAlTablero = (titulo) => {
      setActiveNavJob(null);
      setNavDirections(null);
      setNavStatus('idle');
      setBoardJobStages(prev => {
        const updated = { ...prev, [job.id]: Math.max(prev[job.id] || 0, 3) };
        try { localStorage.setItem('agente_board_stages', JSON.stringify(updated)); } catch (e) {}
        return updated;
      });
      setSelectedBoardJobId(job.id);
      setActiveTab('aceptados');
      setMainView('tablero');
      Swal.fire({
        title: titulo,
        text: 'Ya estás en el tablero de este trabajo. Presiona "Comenzar trabajo" cuando estés listo.',
        icon: 'success',
        confirmButtonColor: '#f26522',
        confirmButtonText: 'Entendido'
      });
    };

    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/work-orders/${job.id}/confirm-arrival`,
        {
          latitude: technicianLocation?.lat || job.lat,
          longitude: technicianLocation?.lng || job.lng
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAcceptedJobs(prev => prev.map(j => j.id === job.id ? { ...j, arrived_at: new Date().toISOString(), arrival_status: 'EN_SITIO' } : j));
      irAlTablero('Llegada confirmada');
    } catch (error) {
      console.error("Error confirmando llegada:", error);
      irAlTablero('Llegada registrada');
    }
  };

  // Restaurar trabajo seleccionado o pestaña al regresar de Galería o Nuevo Reporte
  useEffect(() => {
    if (location.state?.view) {
      setMainView(location.state.view);
    }
    if (location.state?.trabajoId) {
      const parsedId = Number(String(location.state.trabajoId).replace('work_order-', ''));
      if (!isNaN(parsedId) && parsedId > 0) {
        setSelectedBoardJobId(parsedId);
        setActiveTab('aceptados');
        setMainView('tablero');
      }
    }
  }, [location.state]);

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
            (authUser && Number(order.tecnico_id) === Number(authUser.id)) ||
            (myQuote && myQuote.status === 'accepted')
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
          const tipoTexto = order.type || 'Problema';
          const equipoTexto = order.equipment ? ` - ${order.equipment}` : '';
          const tituloProblema = (order.type ? `${tipoTexto}${equipoTexto}` : (order.titulo || 'Servicio Solicitado'));

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
            client_user_id: order.client_user_id ?? null,
            calificacion_cliente: order.owner_rating ?? null,
            lugar: order.property?.property_name || 'Lugar no especificado',
            property_name: order.property?.property_name || order.property?.nombre_propiedad || order.property?.name || '',
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

        // Unificar cualquier trabajo de rawJobs que pertenezca como aceptado al usuario
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
                client_user_id: existing.client_user_id || job.client_user_id || null,
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
      mostrarAviso("No se pudo enviar el mensaje. Intenta de nuevo.");
    } finally {
      setSendingChat(false);
    }
  };

  const handleEnviarCotizacion = async () => {
    if (!selectedJob) return;
    if (!(Number(quotePrice) > 0)) {
      mostrarAviso("Por favor ingresa un precio mayor a cero.");
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
        mostrarAviso("✅ " + res.data.message);
        setQuoteStep(1);
        setQuotePrice('');
        setQuoteMessage('');
        fetchJobs();
      }
    } catch (e) {
      if (e?.response?.status === 409 && e.response.data?.reason === 'calificacion_cliente_pendiente') {
        await cargarPendientesCalifCliente();
        mostrarAviso(e.response.data.message);
        return;
      }
      console.error(e);
      mostrarAviso("Hubo un error al enviar tu cotización. Intenta de nuevo.");
    }
  };

  const handleProgramarVisita = async (jobId) => {
    if (!scheduleDate) {
      mostrarAviso("Por favor selecciona una fecha y hora para la visita.");
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
        mostrarAviso("✅ " + res.data.message);
        setScheduleNotes('');
        fetchJobs();
      }
    } catch (e) {
      console.error("Error programando visita", e);
      mostrarAviso("Hubo un error al programar la visita. Intenta de nuevo.");
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

  const handleCancelServiceByTech = async (job) => {
    if (!job) return;
    const { value: reason, isConfirmed } = await Swal.fire({
      title: '¿Cancelar este servicio?',
      html: `
        <div style="text-align: left; font-size: 13.5px; color: #cbd5e1; line-height: 1.5;">
          <p style="margin-bottom: 10px;">
            Al cancelar tu asistencia, se notificará de inmediato al cliente para que pueda evaluar tu puntualidad con el sistema de <strong>5 relojes</strong> y reenviar su solicitud a la red.
          </p>
          <div style="background: rgba(239, 68, 68, 0.15); border-left: 3px solid #ef4444; padding: 9px 12px; border-radius: 6px; margin-bottom: 8px; color: #fca5a5; font-size: 13px;">
            ⚠️ <strong>Penalizaciones aplicadas:</strong>
            <ul style="margin: 4px 0 0 16px; padding: 0;">
              <li>Bloqueo de <strong>24 horas</strong> para ver o cotizar solicitudes de este usuario.</li>
              <li>Calificación de puntualidad de 5 relojes por parte del cliente.</li>
            </ul>
          </div>
        </div>
      `,
      input: 'textarea',
      inputLabel: 'Motivo de la cancelación (opcional):',
      inputPlaceholder: 'Ej. Imprevisto de fuerza mayor, descompostura de vehículo, emergencia...',
      showCancelButton: true,
      confirmButtonText: 'Sí, Cancelar Servicio',
      cancelButtonText: 'Volver atrás',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#475569',
      background: '#191e2b',
      color: '#ffffff'
    });

    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${job.id}/cancelar-tecnico`,
        { reason: reason || 'Cancelado por el técnico por causas de fuerza mayor o imprevisto.' },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data.success) {
        await Swal.fire({
          icon: 'info',
          title: 'Servicio Cancelado',
          text: 'Has cancelado tu asistencia para este servicio. Se ha notificado al cliente.',
          confirmButtonColor: '#f26522',
          background: '#191e2b',
          color: '#ffffff'
        });

        if (activeNavJob && activeNavJob.id === job.id) {
          setActiveNavJob(null);
          setNavDirections(null);
          setNavStatus('idle');
        }
        if (selectedJob && selectedJob.id === job.id) {
          setShowQuoteModal(false);
        }
        fetchJobs();
      }
    } catch (err) {
      console.error("Error al cancelar servicio:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error al cancelar',
        text: err.response?.data?.message || 'No fue posible cancelar el servicio.',
        background: '#191e2b',
        color: '#ffffff'
      });
    }
  };

  const openQuoteModalForJob = (job) => {
    // El modal vive fuera del mapa: en pantalla completa no se vería
    salirPantallaCompleta();
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

  // ─── Aviso en vivo cuando el cliente responde el horario propuesto ───
  // Se guarda la última respuesta vista por trabajo; la primera carga solo registra (no avisa).
  const respuestasVistasRef = useRef(null);
  useEffect(() => {
    if (!acceptedJobs.length) return;
    const vistas = respuestasVistasRef.current;
    const nuevas = {};
    acceptedJobs.forEach(j => {
      const { respuesta } = estadoHorarioDe(j);
      if (respuesta) nuevas[j.id] = respuesta.created_at;
    });
    respuestasVistasRef.current = nuevas;
    if (!vistas) return;

    const job = acceptedJobs.find(j => nuevas[j.id] && nuevas[j.id] !== vistas[j.id]);
    // SweetAlert muestra uno a la vez: no se interrumpe otro diálogo (la etiqueta y el aviso del mapa quedan)
    if (!job || Swal.isVisible()) return;
    const h = estadoHorarioDe(job);
    const cliente = job.client_name || job.cliente || 'El cliente';
    // Aviso centrado y compacto (antes era un toast lateral que se estiraba a todo lo alto)
    Swal.fire({
      position: 'center',
      width: 380,
      backdrop: true,
      icon: h.confirmado ? 'success' : 'warning',
      title: h.confirmado ? `${cliente} confirmó la visita` : `${cliente} pidió otro horario`,
      text: h.confirmado ? job.titulo : (h.nota ? `“${h.nota}” · ${job.titulo}` : job.titulo),
      showConfirmButton: !h.confirmado,
      confirmButtonText: 'Proponer horario',
      confirmButtonColor: '#f26522',
      showCloseButton: true,
      timer: h.confirmado ? 6000 : 15000,
      timerProgressBar: true,
    }).then(r => {
      if (r.isConfirmed) handleOpenBoardScheduler(job);
    });
  }, [acceptedJobs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Enlace desde la notificación: /mercado-trabajos?trabajo=ID abre ese trabajo ───
  const trabajoDeEnlaceRef = useRef(null);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('trabajo');
    if (id) trabajoDeEnlaceRef.current = id;
  }, [location.search]);
  useEffect(() => {
    const id = trabajoDeEnlaceRef.current;
    if (!id || !acceptedJobs.length) return;
    const job = acceptedJobs.find(j => String(j.id) === String(id));
    if (!job) return;
    trabajoDeEnlaceRef.current = null;
    setMainView('mercado');
    setActiveTab('aceptados');
    openQuoteModalForJob(job);
    navigate(location.pathname, { replace: true });
  }, [acceptedJobs, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusLabel = (status) => {
    if (status === 'rejected') return 'Rechazada';
    if (status === 'accepted') return 'Aceptada';
    return 'Pendiente';
  };

  const chatMessages = selectedJob?.myQuote?.chat_history || [];
  const lastClientMsg = selectedJob?.lastClientMsg;

  // Estado del horario de visita del trabajo abierto (confirmado / pide otro / esperando)
  const horarioSel = estadoHorarioDe(selectedJob);
  const isRescheduleRequested = horarioSel.pideOtro;
  const isScheduleConfirmed = horarioSel.confirmado;
  const isPendingClientConfirm = horarioSel.pendiente;

  // ─── FILTROS ESPECÍFICOS (FECHA, HORA, TRABAJO) ───
  const getJobDateObj = (job) => {
    const rawDateStr = job.scheduled_at || job.scheduled_date || job.fecha_cita || job.created_at;
    if (rawDateStr) {
      const parsed = new Date(rawDateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (job.fecha) {
      const parts = String(job.fecha).split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          if (!isNaN(d.getTime())) return d;
        } else if (parts[0].length === 4) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (!isNaN(d.getTime())) return d;
        }
      } else {
        const parsed = new Date(job.fecha);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    return null;
  };

  const jobMatchesDate = (job) => {
    if (filterDatePreset === 'TODAS' && !filterCustomDate) return true;
    const d = getJobDateObj(job);
    if (!d) return false;

    const today = new Date();
    const jY = d.getFullYear();
    const jM = d.getMonth();
    const jD = d.getDate();

    if (filterDatePreset === 'CUSTOM' || filterCustomDate) {
      if (!filterCustomDate) return true;
      const [y, m, day] = filterCustomDate.split('-').map(Number);
      return jY === y && jM === (m - 1) && jD === day;
    }

    if (filterDatePreset === 'HOY') {
      return jY === today.getFullYear() && jM === today.getMonth() && jD === today.getDate();
    }

    if (filterDatePreset === 'MANANA') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return jY === tomorrow.getFullYear() && jM === tomorrow.getMonth() && jD === tomorrow.getDate();
    }

    if (filterDatePreset === 'SEMANA') {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const jobTime = new Date(jY, jM, jD).getTime();
      const diffDays = (jobTime - startOfDay) / (1000 * 60 * 60 * 24);
      return diffDays >= -1 && diffDays <= 7;
    }

    return true;
  };

  const jobMatchesTime = (job) => {
    if (filterTimeSlot === 'TODAS') return true;
    const d = getJobDateObj(job);
    if (!d) return false;
    const hours = d.getHours();

    if (filterTimeSlot === 'MANANA') {
      return hours >= 6 && hours < 12;
    }
    if (filterTimeSlot === 'TARDE') {
      return hours >= 12 && hours < 18;
    }
    if (filterTimeSlot === 'NOCHE') {
      return hours >= 18 && hours <= 23;
    }
    return true;
  };

  const jobMatchesType = (job) => {
    if (filterJobType === 'TODOS') return true;
    const cat = getCategoryIcon(job.tipo, job.titulo, job.equipo);
    if (cat.label && cat.label.toLowerCase() === filterJobType.toLowerCase()) return true;
    const fullText = `${job.tipo || ''} ${job.titulo || ''} ${job.equipo || ''} ${job.descripcion || ''}`.toLowerCase();
    return fullText.includes(filterJobType.toLowerCase());
  };

  const hasActiveFilters = Boolean(
    (filterDatePreset !== 'TODAS' && filterDatePreset !== '') ||
    filterCustomDate ||
    filterTimeSlot !== 'TODAS' ||
    filterJobType !== 'TODOS'
  );

  const resetAllFilters = () => {
    setFilterDatePreset('TODAS');
    setFilterCustomDate('');
    setFilterTimeSlot('TODAS');
    setFilterJobType('TODOS');
  };

  // Filtered jobs based on search input & specific filters (Disponibles)
  const filteredNetworkJobs = useMemo(() => {
    return networkJobs.filter(job => {
      if (!jobMatchesDate(job)) return false;
      if (!jobMatchesTime(job)) return false;
      if (!jobMatchesType(job)) return false;

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
  }, [networkJobs, searchQuery, filterDatePreset, filterCustomDate, filterTimeSlot, filterJobType]);

  // Filtered Accepted Jobs para la pestaña del mapa (Trabajos Aceptados)
  const filteredAcceptedJobs = useMemo(() => {
    return acceptedJobs.filter(job => {
      if (!jobMatchesDate(job)) return false;
      if (!jobMatchesTime(job)) return false;
      if (!jobMatchesType(job)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (job.titulo && job.titulo.toLowerCase().includes(q)) ||
        (job.zona && job.zona.toLowerCase().includes(q)) ||
        (job.descripcion && job.descripcion.toLowerCase().includes(q)) ||
        (job.tipo && job.tipo.toLowerCase().includes(q)) ||
        (job.equipo && job.equipo.toLowerCase().includes(q)) ||
        (job.client_name && job.client_name.toLowerCase().includes(q)) ||
        (job.calle && job.calle.toLowerCase().includes(q)) ||
        (job.full_address && job.full_address.toLowerCase().includes(q))
      );
    });
  }, [acceptedJobs, searchQuery, filterDatePreset, filterCustomDate, filterTimeSlot, filterJobType]);

  // Helper para identificar trabajos completados / finalizados
  const isJobDone = (s) => ['Finalizado', 'Listo', 'Terminado', 'Completado', 'Aprobado', 'Entregado'].includes(s);

  // Kanban Filtered Jobs (Trabajos Aceptados / Ganados)
  const activeAcceptedJobs = acceptedJobs.filter(j => !isJobDone(j.status) && j.status !== 'Rechazado');
  const doneAcceptedJobs = acceptedJobs.filter(j => isJobDone(j.status));

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

  const sosJobs = displayedAcceptedJobs.filter(j => (j.is_urgent || j.priority === 'Urgente' || j.tipo === 'SOS') && !isJobDone(j.status));
  const pendingScheduleJobs = displayedAcceptedJobs.filter(j => !j.is_urgent && j.priority !== 'Urgente' && j.tipo !== 'SOS' && !j.scheduled_at && j.status !== 'En Progreso' && !isJobDone(j.status));
  const scheduledJobs = displayedAcceptedJobs.filter(j => !j.is_urgent && j.priority !== 'Urgente' && j.tipo !== 'SOS' && j.scheduled_at && j.status !== 'En Progreso' && !isJobDone(j.status));
  const inProgressJobs = displayedAcceptedJobs.filter(j => j.status === 'En Progreso');
  const doneJobs = displayedAcceptedJobs.filter(j => isJobDone(j.status));

  // ─── FILTERED ACCEPTED JOBS FOR BOARD (COL 1) ───
  const filteredBoardJobs = useMemo(() => {
    return acceptedJobs.filter(job => {
      // Filter by chip
      if (boardFilter === 'SOS' && !(job.is_urgent || job.priority === 'Urgente' || job.tipo === 'SOS')) return false;
      if (boardFilter === 'PROCESO' && job.status !== 'En Progreso') return false;
      if (boardFilter === 'AGENDADOS' && (!job.scheduled_at || job.status === 'En Progreso' || isJobDone(job.status))) return false;
      if (boardFilter === 'FINALIZADOS' && !isJobDone(job.status)) return false;

      // Filter by search
      if (!boardSearch.trim()) return true;
      const q = boardSearch.toLowerCase();
      return (
        (job.titulo && job.titulo.toLowerCase().includes(q)) ||
        (job.full_address && job.full_address.toLowerCase().includes(q)) ||
        (job.zona && job.zona.toLowerCase().includes(q)) ||
        (job.client_name && job.client_name.toLowerCase().includes(q)) ||
        (job.client_phone && job.client_phone.toLowerCase().includes(q)) ||
        (job.tipo && job.tipo.toLowerCase().includes(q)) ||
        (job.equipo && job.equipo.toLowerCase().includes(q)) ||
        (job.descripcion && job.descripcion.toLowerCase().includes(q)) ||
        String(job.id).includes(q)
      );
    });
  }, [acceptedJobs, boardFilter, boardSearch]);

  // Selected Board Job (Defaults to first item)
  const selectedBoardJob = useMemo(() => {
    if (!acceptedJobs || acceptedJobs.length === 0) return null;
    if (selectedBoardJobId) {
      const found = acceptedJobs.find(j => j.id === selectedBoardJobId);
      if (found) return found;
    }
    if (filteredBoardJobs.length > 0) return filteredBoardJobs[0];
    return acceptedJobs[0] || null;
  }, [acceptedJobs, selectedBoardJobId, filteredBoardJobs]);

  // Fotos de la falla / problema reportadas por el cliente
  const clientPhotos = useMemo(() => {
    if (!selectedBoardJob) return [];
    const list = (selectedBoardJob.problem_photos && selectedBoardJob.problem_photos.length > 0)
      ? selectedBoardJob.problem_photos
      : (selectedBoardJob.fotos && selectedBoardJob.fotos.length > 0 ? selectedBoardJob.fotos : (selectedBoardJob.foto ? [selectedBoardJob.foto] : []));
    return list.map(f => resolveImageUrl(f)).filter(Boolean);
  }, [selectedBoardJob]);

  // Estado de reportes reales del backend para el trabajo seleccionado
  const [boardJobReports, setBoardJobReports] = useState([]);
  const [loadingJobReports, setLoadingJobReports] = useState(false);

  const fetchJobReports = async (jobId) => {
    if (!jobId) return;
    try {
      setLoadingJobReports(true);
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/work_order-${jobId}/reportes`, { headers });
      setBoardJobReports(res.data || []);
    } catch (e) {
      console.warn("Error fetching work order reports:", e);
    } finally {
      setLoadingJobReports(false);
    }
  };

  useEffect(() => {
    if (selectedBoardJob?.id) {
      fetchJobReports(selectedBoardJob.id);
    }
  }, [selectedBoardJob?.id]);

  // Estructura oficial de 4 etapas de evidencias
  const STAGE_SLOTS = [
    { key: 'ANTES', label: 'ANTES', tag: '[ANTES]', required: true, subtitle: 'Inicial' },
    { key: 'DURANTE', label: 'DURANTE', tag: '[DURANTE]', required: true, subtitle: 'Proceso' },
    { key: 'DESPUÉS', label: 'DESPUÉS', tag: '[DESPUÉS]', required: true, subtitle: 'Concluido' },
    { key: 'EXTRA', label: 'EXTRA', tag: '[EXTRA]', required: false, subtitle: 'Opcional' },
  ];

  // Reporte o foto asignada a cada una de las 4 etapas
  const currentSlotReports = useMemo(() => {
    return STAGE_SLOTS.map((slot, sIdx) => {
      // 1. Buscar en boardJobReports por tag
      const found = (boardJobReports || []).find(r => {
        const desc = (r.description || '').toUpperCase();
        return desc.includes(slot.tag) || (slot.key === 'DESPUÉS' && desc.includes('[DESPUES]'));
      });
      if (found) {
        return {
          id: found.id,
          image_url: resolveImageUrl(found.image_url),
          description: found.description,
          isBackend: true
        };
      }
      // 2. Fallback por posición
      if (boardJobReports && boardJobReports[sIdx]) {
        return {
          id: boardJobReports[sIdx].id,
          image_url: resolveImageUrl(boardJobReports[sIdx].image_url),
          description: boardJobReports[sIdx].description,
          isBackend: true
        };
      }
      // 3. Fallback a almacenamiento local si existe
      if (boardPhotos[selectedBoardJob?.id]?.[sIdx]) {
        return {
          image_url: boardPhotos[selectedBoardJob.id][sIdx],
          description: slot.label,
          isBackend: false
        };
      }
      return null;
    });
  }, [boardJobReports, boardPhotos, selectedBoardJob?.id]);

  // Total de reportes completados
  const completedReportsCount = useMemo(() => {
    return currentSlotReports.filter(Boolean).length;
  }, [currentSlotReports]);

  // Ranuras del reporte del técnico [Antes, Durante, Después, Extra]
  const currentJobSlots = useMemo(() => {
    return currentSlotReports.map(r => r?.image_url || null);
  }, [currentSlotReports]);

  // Lista de fotos no nulas cargadas por el técnico
  const currentJobPhotos = useMemo(() => {
    return currentJobSlots.filter(Boolean);
  }, [currentJobSlots]);

  // Navegación al flujo de reportes (NuevoReporte si 0, GaleriaReportes si 1+)
  // Siempre abre la vista de etapas (Antes / Durante / Después / Extra / Ticket), igual que la app interna
  const handleOpenReportFlow = () => {
    if (!selectedBoardJob) return;
    navigate(`/galeria-reportes/work_order-${selectedBoardJob.id}`, {
      state: {
        trabajoId: `work_order-${selectedBoardJob.id}`,
        servicio: selectedBoardJob,
        from: '/mercado-trabajos'
      }
    });
  };

  // Active Progress Stage (1 to 6)
  const currentStage = useMemo(() => {
    if (!selectedBoardJob) return 1;
    const manualStage = boardJobStages[selectedBoardJob.id];
    const isDone = selectedBoardJob.status === 'Listo' || selectedBoardJob.status === 'Finalizado';
    if (isDone) return 6;

    const photoCount = completedReportsCount;
    if (photoCount >= 3) return Math.max(manualStage || 5, 5);
    if (selectedBoardJob.status === 'En Progreso') return Math.max(manualStage || 4, 4);
    if (manualStage) return manualStage;
    if (arrivalAlertSent[selectedBoardJob.id]) return 2;
    return 1;
  }, [selectedBoardJob, boardJobStages, completedReportsCount, arrivalAlertSent]);

  // Camino de progreso en celular: al abrir el detalle se centra en el paso actual
  const caminoMovilRef = useRef(null);
  // Plegado por defecto para no ocupar media pantalla; se recuerda la preferencia
  const [caminoMovilAbierto, setCaminoMovilAbierto] = useState(() => {
    try { return localStorage.getItem('agente_camino_movil_abierto') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('agente_camino_movil_abierto', caminoMovilAbierto ? '1' : '0'); } catch { /* sin almacenamiento */ }
  }, [caminoMovilAbierto]);
  useEffect(() => {
    const pista = caminoMovilRef.current;
    if (!pista || mobileBoardTab !== 'detalle') return;
    const centro = CAMINO_PASO_ANCHO * (currentStage - 1) + CAMINO_PASO_ANCHO / 2;
    pista.scrollTo({ left: Math.max(0, centro - pista.clientWidth / 2), behavior: 'smooth' });
  }, [currentStage, selectedBoardJob?.id, mobileBoardTab, caminoMovilAbierto]);

  const handleSetStage = (stageNum) => {
    if (!selectedBoardJob) return;
    setBoardJobStages(prev => {
      const updated = { ...prev, [selectedBoardJob.id]: stageNum };
      try {
        localStorage.setItem('agente_board_stages', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleUploadPhotoSlot = (e, slotIndex) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBoardJob) return;

    if (file.size > 12 * 1024 * 1024) {
      Swal.fire('Imagen muy pesada', 'Por favor selecciona una foto menor a 12MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setBoardPhotos(prev => {
        const slots = [...(prev[selectedBoardJob.id] || [null, null, null, null])];
        while (slots.length < 4) slots.push(null);
        slots[slotIndex] = dataUrl;
        const updated = { ...prev, [selectedBoardJob.id]: slots };
        try {
          localStorage.setItem('agente_board_photos', JSON.stringify(updated));
        } catch (err) {
          console.warn('Storage limit error', err);
        }
        return updated;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhotoSlot = (e, slotIndex) => {
    e.stopPropagation();
    if (!selectedBoardJob) return;
    setBoardPhotos(prev => {
      const slots = [...(prev[selectedBoardJob.id] || [null, null, null, null])];
      while (slots.length < 4) slots.push(null);
      slots[slotIndex] = null;
      const updated = { ...prev, [selectedBoardJob.id]: slots };
      try {
        localStorage.setItem('agente_board_photos', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  // 1. INICIAR REPORTE / CONTINUAR REPORTE (Abre vista NuevoReporte o GaleriaReportes)
  const handleStartBoardJob = async () => {
    if (!selectedBoardJob) return;

    // Validación de horario de llegada obligatorio
    if (!selectedBoardJob.scheduled_at) {
      const res = await Swal.fire({
        icon: 'warning',
        title: '⏰ Hora de Llegada Obligatoria',
        text: 'Es obligatorio definir la hora estimada de llegada para este trabajo para que el cliente pueda darle seguimiento en su calendario.',
        showCancelButton: true,
        confirmButtonColor: '#f26522',
        cancelButtonColor: '#64748b',
        confirmButtonText: '⏰ Asignar Horario Ahora',
        cancelButtonText: 'Continuar al Reporte'
      });
      if (res.isConfirmed) {
        handleOpenBoardScheduler(selectedBoardJob);
        return;
      }
    }

    // Si aún no está en progreso, actualizar estado
    if (selectedBoardJob.status !== 'En Progreso' && selectedBoardJob.status !== 'Finalizado' && selectedBoardJob.status !== 'Listo') {
      try {
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
          await axios.put(
            `${import.meta.env.VITE_API_BASE_URL}/work-orders/${selectedBoardJob.id}/status`,
            { status: 'En Progreso' },
            { headers }
          );
        } catch (err1) {
          console.warn("Backend status update fallback", err1);
        }

        setAcceptedJobs(prev => prev.map(j => j.id === selectedBoardJob.id ? { ...j, status: 'En Progreso' } : j));
        handleSetStage(4);
      } catch (error) {
        console.warn("Error actualizando estado en progreso:", error);
      }
    }

    // Navegar directamente a la vista de reporte
    handleOpenReportFlow('ANTES');
  };

  // 2. FINALIZAR TRABAJO (Mínimo 3 evidencias obligatorias)
  const handleFinishBoardJob = async () => {
    if (!selectedBoardJob) return;
    const photoCount = completedReportsCount;

    if (photoCount < 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Evidencias Insuficientes',
        html: `<p>Se requieren <strong>al menos 3 evidencias registradas</strong> (Antes, Durante y Después) para poder finalizar el trabajo.</p><p style="color: #ea580c; font-weight: bold; margin-top: 8px;">Actualmente has registrado ${photoCount} de 3 requeridas.</p>`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f26522',
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Finalizar este trabajo?',
      html: `¿Confirmas que has completado el servicio con <strong>${photoCount} evidencias</strong> registradas?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Finalizar Trabajo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#64748b',
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/work-orders/${selectedBoardJob.id}/status`,
          { status: 'Listo' },
          { headers }
        );
      } catch (err1) {
        console.warn("Error updating status:", err1);
      }

      // El aviso al admin (campanita + push) lo envía el backend al cambiar el estado a "Listo"

      setAcceptedJobs(prev => prev.map(j => j.id === selectedBoardJob.id ? { ...j, status: 'Listo' } : j));
      handleSetStage(6);

      Swal.fire({
        icon: 'success',
        title: '¡Trabajo Finalizado!',
        text: 'El servicio ha sido completado con éxito con todas sus evidencias registradas.',
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error finalizando trabajo:", error);
      Swal.fire('Error', 'No se pudo finalizar el trabajo. Por favor intenta de nuevo.', 'error');
    }
  };

  // 3. PROGRAMAR SEGUNDA VISITA
  const handleOpenSecondVisitModal = () => {
    if (!selectedBoardJob) return;
    const nextDay = new Date(Date.now() + 86400000);
    nextDay.setHours(10, 0, 0, 0);
    const localIso = new Date(nextDay.getTime() - nextDay.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setSecondVisitDate(localIso);
    setSecondVisitReason('');
    setShowSecondVisitModal(true);
  };

  const handleSaveSecondVisit = async (e) => {
    e.preventDefault();
    if (!secondVisitDate) {
      Swal.fire('Atención', 'Por favor selecciona la fecha y hora sugerida para la segunda visita.', 'warning');
      return;
    }

    setSubmittingSecondVisit(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/servicios/${selectedBoardJob.id}/solicitar-segunda-visita`,
        {
          fecha_propuesta: secondVisitDate,
          motivo: secondVisitReason || 'Segunda visita requerida por el técnico',
        },
        { headers }
      );

      Swal.fire({
        icon: 'success',
        title: 'Solicitud Registrada',
        text: 'Se ha agendado la propuesta de 2da visita y se notificó al cliente.',
        timer: 2200,
        showConfirmButton: false,
      });

      setShowSecondVisitModal(false);
      setAcceptedJobs(prev => prev.map(j => j.id === selectedBoardJob.id ? { ...j, has_second_visit: true, second_visit_date: secondVisitDate } : j));
    } catch (error) {
      console.error("Error programando segunda visita:", error);
      Swal.fire({
        icon: 'success',
        title: 'Segunda Visita Programada',
        text: 'Se ha registrado la segunda visita localmente.',
        timer: 2000,
        showConfirmButton: false,
      });
      setShowSecondVisitModal(false);
      setAcceptedJobs(prev => prev.map(j => j.id === selectedBoardJob.id ? { ...j, has_second_visit: true, second_visit_date: secondVisitDate } : j));
    } finally {
      setSubmittingSecondVisit(false);
    }
  };

  // ─── TABLERO VISIT SCHEDULING HANDLERS ───
  const handleOpenBoardScheduler = (job) => {
    const targetJob = job || selectedBoardJob || activeNavJob;
    if (!targetJob) return;

    let initialDate = '';
    const rawDate = targetJob.scheduled_at || targetJob.scheduled_date || targetJob.fecha_cita;
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const offset = d.getTimezoneOffset() * 60000;
          initialDate = new Date(d.getTime() - offset).toISOString().slice(0, 16);
        }
      } catch (e) {
        console.error("Error parsing scheduled date:", e);
      }
    }

    setBoardScheduleDate(initialDate);
    setBoardScheduleNotes(targetJob.visit_notes || targetJob.notes || '');
    setShowBoardScheduleModal(true);
  };

  const handleSaveBoardSchedule = async (e) => {
    if (e) e.preventDefault();
    const targetJob = selectedBoardJob || activeNavJob;
    if (!targetJob) return;
    if (!boardScheduleDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha requerida',
        text: 'Por favor selecciona la fecha y hora de la visita.',
      });
      return;
    }

    setSubmittingBoardSchedule(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${targetJob.id}/programar-visita`,
        {
          scheduled_at: boardScheduleDate,
          notes: boardScheduleNotes
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      const savedDate = response.data?.scheduled_at || boardScheduleDate;

      setAcceptedJobs(prev => prev.map(j => {
        if (j.id === targetJob.id) {
          return {
            ...j,
            scheduled_at: savedDate,
            scheduled_date: savedDate,
            visit_notes: boardScheduleNotes,
            visit_status: 'CONFIRMED'
          };
        }
        return j;
      }));

      // selectedBoardJob se deriva de la lista de trabajos (ya actualizada arriba)

      if (activeNavJob && activeNavJob.id === targetJob.id) {
        setActiveNavJob(prev => ({
          ...prev,
          scheduled_at: savedDate,
          scheduled_date: savedDate,
          visit_notes: boardScheduleNotes,
          visit_status: 'CONFIRMED'
        }));
      }

      Swal.fire({
        icon: 'success',
        title: '¡Horario Programado!',
        text: response.data?.message || 'Se ha agendado la visita y sincronizado con el calendario del cliente.',
        timer: 2500,
        showConfirmButton: false
      });

      setShowBoardScheduleModal(false);
      fetchJobs();
    } catch (err) {
      console.error('Error al programar visita:', err);
      // Actualización optimista local en caso de desconexión
      setAcceptedJobs(prev => prev.map(j => {
        if (j.id === targetJob.id) {
          return {
            ...j,
            scheduled_at: boardScheduleDate,
            scheduled_date: boardScheduleDate,
            visit_notes: boardScheduleNotes,
            visit_status: 'CONFIRMED'
          };
        }
        return j;
      }));

      Swal.fire({
        icon: 'success',
        title: 'Horario Asignado',
        text: 'Se ha guardado el horario de visita para este servicio.',
        timer: 2000,
        showConfirmButton: false
      });

      setShowBoardScheduleModal(false);
    } finally {
      setSubmittingBoardSchedule(false);
    }
  };

  // Marcas de "Mis clientes" (las guarda el servidor; el bloqueo se hace cumplir allá)
  useEffect(() => {
    if (mainView !== 'usuarios') return;
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/mis-clientes`)
      .then(r => {
        const mapa = {};
        (r.data?.relaciones || []).forEach(rel => { mapa[rel.client_user_id] = rel.estado; });
        setMarcasClientes(mapa);
      })
      .catch(() => {});
  }, [mainView]);

  const marcarCliente = async (client, estado) => {
    if (!client.clientUserId) return;
    if (estado === 'bloqueado') {
      const r = await Swal.fire({
        icon: 'warning',
        title: '¿Bloquear a este cliente?',
        text: `Ya no verás los trabajos que ${client.nombre} publique en la red y no podrá enviarte mensajes. Puedes desbloquearlo cuando quieras.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, bloquear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
        reverseButtons: true,
        focusCancel: true,
      });
      if (!r.isConfirmed) return;
    }
    setGuardandoMarca(client.clientUserId);
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/mis-clientes/${client.clientUserId}`, { estado });
      setMarcasClientes(prev => {
        const sig = { ...prev };
        if (estado) sig[client.clientUserId] = estado; else delete sig[client.clientUserId];
        return sig;
      });
    } catch (e) {
      mostrarAviso(e.response?.data?.message || 'No se pudo guardar el cambio.', 'error');
    } finally {
      setGuardandoMarca(null);
    }
  };

  // Solo la zona (colonia y ciudad): la dirección exacta del cliente es privada
  const zonaPublica = (job) => {
    const dir = job.full_address || job.calle || '';
    const col = dir.search(/col(onia)?\.?\s/i);
    if (col >= 0) return dir.slice(col);
    const partes = dir.split(',').map(p => p.trim()).filter(Boolean);
    return partes.length > 1 ? partes.slice(-2).join(', ') : (job.colonia || job.zona || 'Mérida, Yucatán');
  };

  // Group accepted jobs by client to build the technician's actual client directory
  const myClientsDirectory = useMemo(() => {
    const map = new Map();

    acceptedJobs.forEach(job => {
      const clientName = job.client_name || job.cliente || 'Cliente de la Red';
      const cleanPhone = (job.client_phone || '').replace(/\D/g, '');
      const key = job.client_user_id ? `u${job.client_user_id}` : (cleanPhone || clientName.toLowerCase().trim());

      const price = parseFloat(job.agreed_price || 0);
      const jobReviews = job.review ? [job.review] : [];

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          id: job.id,
          nombre: clientName,
          clientUserId: job.client_user_id || null,
          // Sin teléfono, correo ni dirección exacta: solo la zona
          zona: zonaPublica(job),
          avatar: job.property?.client?.profile_picture || null,
          trabajos: [job],
          trabajosCount: 1,
          totalFacturado: price,
          ultimoTrabajo: job,
          reviews: jobReviews,
        });
      } else {
        existing.trabajos.push(job);
        existing.trabajosCount += 1;
        existing.totalFacturado += price;
        if (job.review) {
          existing.reviews.push(job.review);
        }
        if (new Date(job.created_at || job.fecha) > new Date(existing.ultimoTrabajo?.created_at || existing.ultimoTrabajo?.fecha || 0)) {
          existing.ultimoTrabajo = job;
        }
      }
    });

    return Array.from(map.values()).map(client => {
      const revs = client.reviews || [];
      const hasReviews = revs.length > 0;
      const avgStars = hasReviews 
        ? (revs.reduce((sum, r) => sum + (Number(r.rating_stars) || 5), 0) / revs.length)
        : 5.0;
      const avgTime = hasReviews 
        ? (revs.reduce((sum, r) => sum + (Number(r.rating_time) || 5), 0) / revs.length)
        : 5.0;

      const estado = client.clientUserId ? (marcasClientes[client.clientUserId] || null) : null;
      return {
        ...client,
        estado,
        esFavorito: estado === 'favorito',
        bloqueado: estado === 'bloqueado',
        reviewsCount: revs.length,
        hasReviews,
        avgStars,
        avgTime
      };
    })
      // Favoritos primero y bloqueados al final
      .sort((a, b) => (a.esFavorito ? 0 : a.bloqueado ? 2 : 1) - (b.esFavorito ? 0 : b.bloqueado ? 2 : 1));
  }, [acceptedJobs, marcasClientes]);

  const filteredMyClients = myClientsDirectory.filter(c => {
    if (userFilter === 'FAVORITOS' && !c.esFavorito) return false;
    if (userFilter === 'BLOQUEADOS' && !c.bloqueado) return false;

    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      (c.nombre && c.nombre.toLowerCase().includes(q)) ||
      (c.zona && c.zona.toLowerCase().includes(q)) ||
      c.trabajos.some(t => (t.titulo && t.titulo.toLowerCase().includes(q)) || (t.descripcion && t.descripcion.toLowerCase().includes(q)))
    );
  });

  const totalClientesAtendidos = myClientsDirectory.length;
  const totalFavoritos = myClientsDirectory.filter(c => c.esFavorito).length;
  const totalBloqueados = myClientsDirectory.filter(c => c.bloqueado).length;
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
    <div className={`mercado-container ${mainView === 'tablero' ? 'mercado-tablero-mode' : ''} ${mainView === 'mercado' ? 'red-mapa-vivo' : ''} ${mainView === 'usuarios' ? 'mercado-usuarios-mode' : ''}`}>
      {/* ── TOP NAVIGATION BAR (REPLICA VISTA CLIENTE / IMAGE 1) ── */}
      <TecnicoHeader 
        activeTab={mainView} 
        onTabChange={(tab) => {
          setMainView(tab);
          if (tab === 'usuarios') fetchJobs();
        }}
        acceptedCount={acceptedJobs.length}
        usersCount={totalClientesAtendidos}
      />

      {pendientesCalifCliente.length > 0 && (
        <ModalCalificarCliente pendientes={pendientesCalifCliente} onListo={setPendientesCalifCliente} />
      )}

      {/* ════════════════════════════════════════════════════════════
          VISTA 1: NUEVO TABLERO OPERATIVO 3 COLUMNAS (COMBINACIÓN DE VISTAS)
      ════════════════════════════════════════════════════════════ */}
      {mainView === 'tablero' && (
        <div className="mercado-board-workspace">
          {/* Header Superior del Tablero */}
          <div className="mercado-board-header">
            {/* Barra de Pestañas Segmentadas para Móvil/Tablet */}
            <div className="mercado-board-mobile-tab-bar">
              <button
                type="button"
                className={`mercado-board-mobile-tab-btn ${mobileBoardTab === 'trabajos' ? 'active' : ''}`}
                onClick={() => setMobileBoardTab('trabajos')}
              >
                <Briefcase size={15} />
                <span>Mis Trabajos</span>
                <span className="mercado-board-mobile-tab-pill">{filteredBoardJobs.length}</span>
              </button>

              <button
                type="button"
                className={`mercado-board-mobile-tab-btn ${mobileBoardTab === 'detalle' ? 'active' : ''}`}
                onClick={() => setMobileBoardTab('detalle')}
              >
                <FileText size={15} />
                <span>Detalle del Servicio</span>
                {selectedBoardJob && (
                  <span className="mercado-board-mobile-tab-pill folio">
                    {selectedBoardJob.property?.property_code || `#${selectedBoardJob.id}`}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Layout Principal de 3 Columnas */}
          {acceptedJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: '#141722', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <AlertCircle size={44} color="#f26522" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ color: '#ffffff', margin: '0 0 6px' }}>No tienes trabajos aceptados actualmente</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Ve a la pestaña de Mercado para postularte y ganar nuevos servicios.</p>
              <button className="mercado-users-btn-new" onClick={() => setMainView('mercado')} style={{ marginTop: '16px' }}>
                Explorar Mercado de Trabajos
              </button>
            </div>
          ) : (
            <div className={`mercado-board-3col-layout ${boardListaOculta ? 'lista-oculta' : ''}`}>
              {/* ════════════════════════════════════════════════════
                  COLUMNA 1 (IZQUIERDA): LISTA DE TRABAJOS ACEPTADOS
              ════════════════════════════════════════════════════ */}
              <div className={`mercado-board-col-list ${mobileBoardTab === 'trabajos' ? 'is-mobile-active' : 'is-mobile-hidden'} ${boardListaOculta ? 'lista-oculta' : ''}`}>
                {/* Columna oculta (solo escritorio): una tira con el botón para volver a mostrarla */}
                <div className="rt-lista-riel">
                  <button
                    type="button"
                    className="rt-lista-toggle"
                    onClick={() => setBoardListaOculta(false)}
                    title="Mostrar mis trabajos"
                    aria-label="Mostrar mis trabajos"
                  >
                    <ChevronRight size={18} strokeWidth={2.6} />
                  </button>
                  <span className="rt-lista-riel-icono"><Briefcase size={17} /></span>
                  <span className="rt-lista-riel-total">{filteredBoardJobs.length}</span>
                </div>

                <div className="mercado-board-col-list-header">
                  <span className="mercado-board-col-list-title">
                    <Briefcase size={15} color="#f26522" />
                    Mis Trabajos ({filteredBoardJobs.length})
                  </span>

                {/* Filtro: un botón que abre las opciones */}
                {(() => {
                  const opciones = [
                    { id: 'TODOS', label: 'Todos', Icono: FolderOpen, tono: 'slate', total: acceptedJobs.length },
                    { id: 'SOS', label: 'SOS / Urgentes', Icono: Siren, tono: 'orange', total: acceptedJobs.filter(j => (j.is_urgent || j.priority === 'Urgente' || j.tipo === 'SOS') && !isJobDone(j.status)).length },
                    { id: 'PROCESO', label: 'En curso', Icono: Zap, tono: 'amber', total: acceptedJobs.filter(j => j.status === 'En Progreso').length },
                    { id: 'AGENDADOS', label: 'Agendados', Icono: Calendar, tono: 'blue', total: acceptedJobs.filter(j => j.scheduled_at && j.status !== 'En Progreso' && !isJobDone(j.status)).length },
                    { id: 'FINALIZADOS', label: 'Finalizados', Icono: CheckCircle2, tono: 'green', total: acceptedJobs.filter(j => isJobDone(j.status)).length },
                  ];
                  const actual = opciones.find(o => o.id === boardFilter) || opciones[0];
                  return (
                    <div className="tb-actions-wrapper mercado-board-filtro" ref={boardFiltroRef}>
                      <button
                        type="button"
                        className={`mercado-board-filtro-btn ${boardFiltroAbierto ? 'abierto' : ''}`}
                        onClick={() => setBoardFiltroAbierto(v => !v)}
                        aria-haspopup="true"
                        aria-expanded={boardFiltroAbierto}
                        title="Filtrar trabajos"
                      >
                        <SlidersHorizontal size={15} />
                        <span>{actual.label}</span>
                        <span className="mercado-board-filtro-total">{actual.total}</span>
                        <ChevronDown size={15} className="mercado-board-filtro-flecha" />
                      </button>

                      {boardFiltroAbierto && (
                        <div className="tb-actions-menu">
                          {opciones.map(({ id, label, Icono, tono, total }) => (
                            <button
                              key={id}
                              type="button"
                              className={`tb-actions-item ${boardFilter === id ? 'selected' : ''}`}
                              onClick={() => { setBoardFilter(id); setBoardFiltroAbierto(false); }}
                            >
                              <span className={`tb-actions-icon ${tono}`}><Icono size={16} strokeWidth={2.4} /></span>
                              <span>{label}</span>
                              <span className="tb-actions-badge">{total}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                  <button
                    type="button"
                    className="rt-lista-toggle"
                    onClick={() => { setBoardListaOculta(true); setBoardFiltroAbierto(false); }}
                    title="Ocultar mis trabajos"
                    aria-label="Ocultar mis trabajos"
                  >
                    <ChevronLeft size={18} strokeWidth={2.6} />
                  </button>
                </div>

                {/* Buscador de Trabajos */}
                <div className="mercado-board-search-box">
                  <Search size={16} color="#64748b" />
                  <input
                    type="text"
                    className="mercado-board-search-input"
                    placeholder="Buscar por folio, cliente, propiedad..."
                    value={boardSearch}
                    onChange={(e) => setBoardSearch(e.target.value)}
                  />
                  {boardSearch && (
                    <button className="mercado-kanban-search-clear" onClick={() => setBoardSearch('')}>×</button>
                  )}
                </div>

                <div className="mercado-board-job-cards-list">
                  {filteredBoardJobs.length === 0 ? (
                    <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                      No hay trabajos que coincidan con este filtro
                    </div>
                  ) : (
                    filteredBoardJobs.map(job => {
                      const isSelected = selectedBoardJob && selectedBoardJob.id === job.id;
                      const isUrgent = job.is_urgent || job.priority === 'Urgente' || job.tipo === 'SOS';
                      const isInProgress = job.status === 'En Progreso';
                      const isDone = isJobDone(job.status);
                      const cat = getCategoryIcon(job.tipo, job.titulo, job.equipo);
                      const IconoCategoria = ICONOS_CATEGORIA[cat.label] || Wrench;
                      const tiempo = getTimeRemainingInfo(job);

                      return (
                        <div
                          key={job.id}
                          className={`mercado-board-job-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedBoardJobId(job.id);
                            setMobileBoardTab('detalle');
                          }}
                        >
                          {/* Qué hay que hacer y cuánto se cobra */}
                          <div className="rt-card-head">
                            <span className="rt-card-icono" title={cat.label}>
                              <IconoCategoria size={18} strokeWidth={2.2} />
                            </span>
                            <h4 className="rt-card-titulo">{job.titulo || job.descripcion || 'Servicio Técnico'}</h4>
                            {job.agreed_price > 0 && (
                              <span className="rt-card-precio">
                                ${Number(job.agreed_price).toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>

                          {/* Con quién y dónde */}
                          <div className="rt-card-datos">
                            <span><User size={14} /> {job.client_name || job.cliente || 'Cliente'}</span>
                            <span><MapPin size={14} /> {job.property_name || job.lugar || job.zona || 'Mérida, Yucatán'}</span>
                          </div>

                          {/* Cuándo y en qué estado */}
                          <div className="rt-card-pie">
                            {isUrgent && !isDone && <span className="rt-chip sos"><Siren size={12} /> SOS</span>}
                            {isDone ? (
                              <span className="rt-chip listo"><CheckCircle2 size={12} /> Listo</span>
                            ) : isInProgress ? (
                              <span className="rt-chip"><Zap size={12} /> En curso</span>
                            ) : !job.scheduled_at ? (
                              <span className="rt-chip aviso"><AlertTriangle size={12} /> Sin horario</span>
                            ) : tiempo.minutesDiff < 0 ? (
                              <span className="rt-chip aviso"><Clock size={12} /> {textoAtraso(tiempo.minutesDiff)}</span>
                            ) : (
                              <span className="rt-chip"><Clock size={12} /> {tiempo.shortText}</span>
                            )}
                            <span className="rt-card-folio">{job.property?.property_code || `#${job.id}`}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ════════════════════════════════════════════════════
                  COLUMNA 2 (CENTRO): DETALLE DEL TRABAJO (IMAGEN 2)
              ════════════════════════════════════════════════════ */}
              {selectedBoardJob && (() => {
                const rawFacade = selectedBoardJob.facade_photo || 
                                  selectedBoardJob.foto_fachada || 
                                  selectedBoardJob.property?.facade_photo_path || 
                                  selectedBoardJob.property?.facade_photo || 
                                  selectedBoardJob.property?.foto_fachada || 
                                  selectedBoardJob.property?.facade_photo_url || 
                                  selectedBoardJob.property_facade_photo_path ||
                                  selectedBoardJob.property_facade_photo ||
                                  null;
                const rawAnyPhoto = rawFacade || 
                                    selectedBoardJob.foto || 
                                    (selectedBoardJob.fotos && selectedBoardJob.fotos.length > 0 ? selectedBoardJob.fotos[0] : null);
                const facadeImg = resolveImageUrl(rawAnyPhoto);
                const boardSched = getTimeRemainingInfo(selectedBoardJob);
                const isJobCompleted = isJobDone(selectedBoardJob.status) || selectedBoardJob.status === 'Listo' || selectedBoardJob.status === 'Finalizado';

                // Botones del flujo: se muestran abajo en escritorio y bajo el camino de progreso en celular
                const botonesFlujo = (
                  <div className="mercado-board-flow-buttons-grid">
                    {/* Botón 1: Comenzar trabajo (0 fotos) / Ver Reporte (1+ fotos o Finalizado) */}
                    {completedReportsCount === 0 && !isJobCompleted ? (
                      <button
                        type="button"
                        className="mercado-board-flow-btn btn-start"
                        onClick={handleStartBoardJob}
                        title="Comenzar el trabajo y registrar la primera foto de evidencia"
                      >
                        <Play size={15} /> COMENZAR TRABAJO
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="mercado-board-flow-btn btn-continue"
                        onClick={() => handleOpenReportFlow()}
                        title="Consultar evidencias y reporte técnico"
                      >
                        <Eye size={15} /> VER REPORTE
                      </button>
                    )}

                    {/* Botón 2: Finalizar Trabajo (Habilitado solo si >= 3 evidencias) */}
                    <button
                      type="button"
                      className="mercado-board-flow-btn btn-finish"
                      disabled={completedReportsCount < 3 || selectedBoardJob.status === 'Finalizado' || selectedBoardJob.status === 'Listo'}
                      onClick={handleFinishBoardJob}
                      title={completedReportsCount < 3 ? 'Requiere al menos 3 fotos de evidencia con descripción (Antes, Durante y Después)' : 'Finalizar servicio'}
                    >
                      {completedReportsCount < 3
                        ? <><Lock size={14} /> FINALIZAR (MÍN. 3 FOTOS)</>
                        : <><CheckCircle2 size={15} /> FINALIZAR TRABAJO</>}
                    </button>

                    {/* Botón 3: Programar Segunda Visita */}
                    <button
                      type="button"
                      className={`mercado-board-flow-btn btn-second-visit ${selectedBoardJob.has_second_visit ? 'has-visit' : ''}`}
                      onClick={handleOpenSecondVisitModal}
                      title="Programar una segunda visita técnica"
                    >
                      <Calendar size={15} />
                      {selectedBoardJob.has_second_visit ? '2DA VISITA AGENDADA' : '2DA VISITA'}
                    </button>
                  </div>
                );

                return (
                  <div className={`mercado-board-col-detail ${mobileBoardTab === 'detalle' ? 'is-mobile-active' : 'is-mobile-hidden'}`}>
                    {/* Barra de Subnavegación Móvil para Detalle */}
                    <div className="mercado-board-mobile-subnav">
                      <button
                        type="button"
                        className="mercado-board-subnav-back-btn"
                        onClick={() => setMobileBoardTab('trabajos')}
                      >
                        <ChevronLeft size={16} /> Volver a Mis Trabajos
                      </button>

                      <div className="mercado-board-subnav-actions">
                        <span className="mercado-board-subnav-folio">
                          {selectedBoardJob.property?.property_code || `FOLIO #${selectedBoardJob.id}`}
                        </span>
                        <span className="mercado-board-subnav-stage-badge">
                          <Zap size={12} color="#ffffff" /> Paso {currentStage}/6
                        </span>
                      </div>
                    </div>

                    {/* ── PROGRESO EN CELULAR: camino sobre césped que avanza de izquierda a derecha ── */}
                    <div className={`rt-camino-movil ${caminoMovilAbierto ? 'abierto' : 'plegado'}`}>
                      <div className="rt-camino-movil-head">
                        <span className="rt-camino-movil-titulo">
                          <Sparkles size={13} color="#f26522" /> PROGRESO
                        </span>
                        <span className="rt-camino-movil-paso">
                          {currentStage}/6 · {PASOS_CAMINO[currentStage - 1]?.title}
                        </span>
                        <button
                          type="button"
                          className="rt-camino-movil-toggle"
                          onClick={() => setCaminoMovilAbierto(v => !v)}
                          aria-expanded={caminoMovilAbierto}
                          title={caminoMovilAbierto ? 'Ocultar el camino' : 'Mostrar el camino completo'}
                        >
                          {caminoMovilAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          <span>{caminoMovilAbierto ? 'Ocultar' : 'Ver más'}</span>
                        </button>
                      </div>

                      {/* Plegado: los 6 pasos en una línea compacta */}
                      {!caminoMovilAbierto && (
                        <div className="rt-camino-movil-linea">
                          {PASOS_CAMINO.map((st) => {
                            const isCompleted = currentStage > st.step;
                            const isCurrent = currentStage === st.step;
                            const Icono = st.Icono;
                            return (
                              <button
                                key={st.step}
                                type="button"
                                className={`rt-camino-movil-punto ${isCompleted ? 'completed' : (isCurrent ? 'current' : 'pending')}`}
                                onClick={() => handleSetStage(st.step)}
                                title={`Etapa ${st.step}: ${st.title}`}
                                aria-label={`Etapa ${st.step}: ${st.title}`}
                              >
                                {isCompleted ? <Check size={14} strokeWidth={3} /> : <Icono size={14} />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Abierto: camino sobre césped; se desliza con el dedo y se centra en el paso actual */}
                      {caminoMovilAbierto && (
                      <div className="rt-camino-movil-pista" ref={caminoMovilRef}>
                        <div className="rt-camino-movil-lienzo" style={{ width: `${PASOS_CAMINO.length * CAMINO_PASO_ANCHO}px` }}>
                          <svg
                            className="rt-camino-movil-svg"
                            width={PASOS_CAMINO.length * CAMINO_PASO_ANCHO}
                            height={CAMINO_ALTO}
                            aria-hidden="true"
                          >
                            {PASOS_CAMINO.slice(0, -1).map((_, i) => {
                              const x1 = CAMINO_PASO_ANCHO * i + CAMINO_PASO_ANCHO / 2;
                              const x2 = x1 + CAMINO_PASO_ANCHO;
                              const y1 = caminoY(i);
                              const y2 = caminoY(i + 1);
                              const medio = CAMINO_PASO_ANCHO / 2;
                              return (
                                <path
                                  key={i}
                                  className={currentStage > i + 1 ? 'hecho' : ''}
                                  d={`M${x1} ${y1} C${x1 + medio} ${y1} ${x2 - medio} ${y2} ${x2} ${y2}`}
                                />
                              );
                            })}
                          </svg>

                          {PASOS_CAMINO.map((st, i) => {
                            const isCompleted = currentStage > st.step;
                            const isCurrent = currentStage === st.step;
                            const Icono = st.Icono;
                            return (
                              <button
                                key={st.step}
                                type="button"
                                className={`rt-camino-movil-nodo ${isCompleted ? 'completed' : (isCurrent ? 'current' : 'pending')}`}
                                style={{ left: `${CAMINO_PASO_ANCHO * i}px`, top: `${caminoY(i) - 20}px`, width: `${CAMINO_PASO_ANCHO}px` }}
                                onClick={() => handleSetStage(st.step)}
                                title={`Etapa ${st.step}: ${st.title}`}
                              >
                                <span className="rt-camino-movil-circulo">
                                  {isCompleted ? <Check size={18} strokeWidth={3} /> : <Icono size={17} />}
                                </span>
                                <span className="rt-camino-movil-letrero">{st.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      )}
                    </div>

                    {/* Botones del flujo: fuera del panel de progreso, justo debajo */}
                    <div className="rt-camino-movil-botones">{botonesFlujo}</div>

                      {/* Foto principal: fachada a todo el ancho con folio y tipo encima */}
                      <div
                        className="rd-hero"
                        onClick={() => facadeImg && setZoomedPhotoUrl(facadeImg)}
                        title={facadeImg ? 'Clic para ampliar foto de fachada' : 'Fachada de la casa'}
                      >
                        {facadeImg ? (
                          <img src={facadeImg} alt="Fachada de la propiedad" />
                        ) : (
                          <div className="rd-hero-vacio"><Home size={34} /></div>
                        )}
                        <div className="rd-hero-etiquetas">
                          <span>{selectedBoardJob.property?.property_code || `FOLIO #${selectedBoardJob.id}`}</span>
                          <span><Home size={12} /> {selectedBoardJob.property?.type || 'CASA'}</span>
                          {(selectedBoardJob.is_urgent || selectedBoardJob.priority === 'Urgente' || selectedBoardJob.tipo === 'SOS') && (
                            <span className="sos"><Siren size={12} /> SOS</span>
                          )}
                        </div>
                        {facadeImg && <span className="rd-hero-lupa"><Search size={17} /></span>}
                      </div>

                      <div className="rd-grid">
                        <div className="rd-columna">
                          {/* Resumen: precio y dirección, con datos rápidos a la derecha */}
                          <div className="rd-panel rd-resumen">
                            <div className="rd-resumen-texto">
                              {selectedBoardJob.agreed_price > 0 && (
                                <strong className="rd-precio">
                                  ${Number(selectedBoardJob.agreed_price).toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                                </strong>
                              )}
                              <span className="rd-direccion" title={selectedBoardJob.full_address || selectedBoardJob.calle || selectedBoardJob.property_name}>
                                {selectedBoardJob.full_address || selectedBoardJob.calle || selectedBoardJob.property_name || 'Dirección de la propiedad'}
                              </span>
                            </div>
                            <div className="rd-datos-rapidos">
                              <span><Sparkles size={17} /><b>{currentStage}/6</b> Paso</span>
                              <span><Camera size={17} /><b>{completedReportsCount}/4</b> Fotos</span>
                              <span><Eye size={17} /><b>{clientPhotos.length}</b> Del cliente</span>
                            </div>
                          </div>

                          {/* Qué hay que hacer + horario y herramientas */}
                          <div className="rd-panel rd-trabajo">
                            <div className="rd-trabajo-texto">
                              <h3 className="rd-titulo">Consiste en</h3>
                              <p className="rd-descripcion">{sinEmojis(selectedBoardJob.descripcion || selectedBoardJob.titulo)}</p>
                            </div>

                            <div className="rd-trabajo-lado">
                              <div className={`rd-estado ${!selectedBoardJob.scheduled_at && !isJobCompleted ? 'obligatorio' : ''}`}>
                                <span className="rd-estado-nombre">
                                  <i className={isJobCompleted ? 'verde' : ''} />
                                  {isJobCompleted ? 'Concluido' : (selectedBoardJob.scheduled_at ? 'Agendado' : 'Asignación obligatoria')}
                                </span>
                                {selectedBoardJob.scheduled_at ? (
                                  <span className="rd-estado-fecha">
                                    {new Date(selectedBoardJob.scheduled_at).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                ) : !isJobCompleted && (
                                  <span className="rd-estado-fecha">Ingresa tu hora estimada de llegada para avisar al cliente.</span>
                                )}
                                {!isJobCompleted && selectedBoardJob.scheduled_at && (
                                  <span className={`rd-estado-tiempo ${boardSched.minutesDiff !== null && boardSched.minutesDiff < 0 ? 'atraso' : ''}`}>
                                    {boardSched.minutesDiff !== null && boardSched.minutesDiff < 0
                                      ? textoAtraso(boardSched.minutesDiff)
                                      : boardSched.text}
                                  </span>
                                )}
                              </div>

                              {!isJobCompleted && (
                                <button type="button" className="rd-herramienta" onClick={() => handleOpenBoardScheduler(selectedBoardJob)} title="Programar o cambiar fecha y hora de la visita">
                                  <span><Calendar size={16} /></span>
                                  {selectedBoardJob.scheduled_at ? 'Cambiar horario' : 'Agendar llegada'}
                                </button>
                              )}
                              <button type="button" className="rd-herramienta" onClick={() => setShowPdfReportModal(true)} title="Visualizar reporte detallado oficial en PDF">
                                <span><FileText size={16} /></span> Ver PDF
                              </button>
                              <button
                                type="button"
                                className="rd-herramienta"
                                onClick={() => {
                                  const query = selectedBoardJob.lat && selectedBoardJob.lng
                                    ? `${selectedBoardJob.lat},${selectedBoardJob.lng}`
                                    : encodeURIComponent(selectedBoardJob.full_address || selectedBoardJob.calle || 'Mérida');
                                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
                                }}
                                title="Abrir en Google Maps (GPS)"
                              >
                                <span><Navigation size={16} /></span> Abrir GPS
                              </button>
                            </div>
                          </div>

                          {/* Evidencias del cliente */}
                          <div className="rd-panel rd-evidencias">
                            <h3 className="rd-titulo">Evidencias del cliente</h3>
                            {clientPhotos.length > 0 ? (
                              <div className="rd-fotos">
                                {clientPhotos.map((photoUrl, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    className="rd-foto"
                                    onClick={() => setZoomedPhotoUrl(photoUrl)}
                                    title={`Clic para ampliar foto ${pIdx + 1} del cliente`}
                                  >
                                    <img src={photoUrl} alt={`Foto del cliente ${pIdx + 1}`} />
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="rd-nota">El cliente no adjuntó fotografías al levantar este reporte.</p>
                            )}
                          </div>
                        </div>

                        <div className="rd-columna">
                          {/* Cliente y datos del servicio */}
                          <div className="rd-panel rd-cliente">
                            <div className="rd-cliente-persona">
                              <span className="rd-avatar">{(selectedBoardJob.client_name || selectedBoardJob.cliente || 'C').charAt(0).toUpperCase()}</span>
                              <div>
                                <small>Cliente</small>
                                <strong title={selectedBoardJob.client_name || selectedBoardJob.cliente || 'Cliente'}>{selectedBoardJob.client_name || selectedBoardJob.cliente || 'Cliente'}</strong>
                                <span>{selectedBoardJob.client_phone || 'Teléfono no registrado'}</span>
                              </div>
                            </div>

                            {selectedBoardJob.client_phone && (
                              <button type="button" className="rd-btn-oscuro" onClick={() => window.open(`tel:${selectedBoardJob.client_phone}`)} title="Llamar al cliente">
                                <Phone size={15} /> Llamar al cliente
                              </button>
                            )}

                            {/* Datos del servicio: cada uno con su etiqueta */}
                            <ul className="rd-lista rd-datos">
                              <li className="destacado">
                                <span><Building2 size={15} /></span>
                                <div>
                                  <small>Propiedad</small>
                                  <strong>{selectedBoardJob.property_name || selectedBoardJob.property?.property_code || 'Propiedad sin nombre'}</strong>
                                  {selectedBoardJob.property_name && selectedBoardJob.property?.property_code && (
                                    <em>{selectedBoardJob.property.property_code}</em>
                                  )}
                                </div>
                              </li>
                              <li>
                                <span><Wrench size={15} /></span>
                                <div><small>Equipo / especialidad</small><strong>{selectedBoardJob.equipo || 'Instalaciones generales'}</strong></div>
                              </li>
                              <li>
                                <span><MapPin size={15} /></span>
                                <div><small>Zona</small><strong>{selectedBoardJob.zona || selectedBoardJob.colonia || 'Mérida, Yucatán'}</strong></div>
                              </li>
                              <li>
                                <span><Home size={15} /></span>
                                <div><small>Tipo de inmueble</small><strong>{selectedBoardJob.property?.type || 'Casa'}</strong></div>
                              </li>
                            </ul>
                          </div>

                        {/* Tarjeta 4: Botones Principales de Flujo (en celular van debajo del camino de progreso) */}
                        <div className="rd-panel mercado-board-flow-card rt-flujo-escritorio">
                          {botonesFlujo}
                        </div>
                        </div>
                      </div>
                  </div>
                );
              })()}

              {/* ════════════════════════════════════════════════════
                  COLUMNA 3 (DERECHA): BARRA DE PROGRESO VERTICAL (IMAGEN 3)
              ════════════════════════════════════════════════════ */}
              {selectedBoardJob && (
                <div className={`mercado-board-col-progress ${mobileBoardTab === 'progreso' ? 'is-mobile-active' : 'is-mobile-hidden'}`}>
                  {/* Subnav Móvil para Progreso */}
                  <div className="mercado-board-mobile-subnav">
                    <button
                      type="button"
                      className="mercado-board-subnav-back-btn"
                      onClick={() => setMobileBoardTab('detalle')}
                    >
                      <ChevronLeft size={16} /> Volver al Detalle
                    </button>
                    <span className="mercado-board-subnav-folio">
                      {selectedBoardJob.property?.property_code || `FOLIO #${selectedBoardJob.id}`}
                    </span>
                  </div>

                  <div className="mercado-board-col-progress-header">
                    <h3 className="mercado-board-progress-title">
                      <Sparkles size={15} color="#f26522" /> PROGRESO
                    </h3>
                  </div>

                  <div className="mercado-board-stepper-container">
                    <div className="mercado-board-camino-lienzo">
                    {/* Líneas del camino: cada círculo está a 28% o 72% del ancho y al 38% de su fila */}
                    <svg className="mercado-board-camino" viewBox="0 0 100 600" preserveAspectRatio="none" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map((i) => {
                        const x1 = i % 2 === 0 ? 28 : 72;
                        const x2 = i % 2 === 0 ? 72 : 28;
                        const y1 = i * 100 + 38;
                        const y2 = y1 + 100;
                        return (
                          <path
                            key={i}
                            className={currentStage > i + 1 ? 'hecho' : ''}
                            d={`M${x1} ${y1} Q${x1} ${y2} ${x2} ${y2}`}
                          />
                        );
                      })}
                    </svg>

                    {[
                      { step: 1, title: 'Cita Asignada', desc: 'Reporte aceptado', icon: <Home size={18} /> },
                      { step: 2, title: 'En Camino', desc: 'En traslado', icon: <Car size={18} /> },
                      { step: 3, title: 'Diagnóstico', desc: 'Inspección en sitio', icon: <Search size={18} /> },
                      { step: 4, title: 'En Reparación', desc: 'Servicio en curso', icon: <Wrench size={18} /> },
                      { step: 5, title: 'Evidencias', desc: `${currentJobPhotos.length}/4 fotos`, icon: <Camera size={18} /> },
                      { step: 6, title: 'Concluido', desc: 'Trabajo entregado', icon: <CheckCircle2 size={18} /> },
                    ].map((st, idx) => {
                      const isCompleted = currentStage > st.step;
                      const isCurrent = currentStage === st.step;

                      return (
                        <div
                          key={st.step}
                          className={`mercado-board-stepper-item ${idx % 2 === 0 ? 'lado-izq' : 'lado-der'} ${isCompleted ? 'completed' : (isCurrent ? 'current' : 'pending')}`}
                          onClick={() => handleSetStage(st.step)}
                        >
                          {/* Nodo Circular con Icono */}
                          <div className="mercado-board-step-node">
                            {isCompleted ? <Check size={20} strokeWidth={3} /> : st.icon}
                          </div>

                          {/* Información del Paso */}
                          <div className="mercado-board-step-info">
                            <p className="mercado-board-step-title">{st.title}</p>
                            <p className="mercado-board-step-desc">{st.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
                    <Users size={22} color="#ffffff" /> MIS CLIENTES Y CONTACTOS DE LA RED
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                    Clientes a los que les has trabajado. Guarda a tus favoritos o bloquea a quien no quieras volver a atender.
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
                <div className="mercado-users-kpi-icon"><Users size={22} color="#ffffff" /></div>
                <div className="mercado-users-kpi-info">
                  <span className="mercado-users-kpi-val">{totalClientesAtendidos}</span>
                  <span className="mercado-users-kpi-label">Clientes Atendidos</span>
                </div>
              </div>

              <div className="mercado-users-kpi-card">
                <div className="mercado-users-kpi-icon"><Star size={22} color="#ffffff" /></div>
                <div className="mercado-users-kpi-info">
                  <span className="mercado-users-kpi-val">{totalFavoritos}</span>
                  <span className="mercado-users-kpi-label">Mis Favoritos</span>
                </div>
              </div>

              <div className="mercado-users-kpi-card">
                <div className="mercado-users-kpi-icon"><Wrench size={22} color="#ffffff" /></div>
                <div className="mercado-users-kpi-info">
                  <span className="mercado-users-kpi-val">{totalServiciosRealizados}</span>
                  <span className="mercado-users-kpi-label">Trabajos Realizados</span>
                </div>
              </div>

              <div className="mercado-users-kpi-card">
                <div className="mercado-users-kpi-icon"><DollarSign size={22} color="#ffffff" /></div>
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
                  placeholder="Buscar por nombre de cliente, zona o servicio realizado..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                {userSearch && (
                  <button className="mercado-search-clear" onClick={() => setUserSearch('')}>×</button>
                )}
              </div>

              {/* Filtro: un botón que abre las opciones (mismo patrón que el Tablero) */}
              {(() => {
                const opciones = [
                  { id: 'TODOS', label: 'Todos mis clientes', Icono: Users, tono: 'slate', total: totalClientesAtendidos },
                  { id: 'FAVORITOS', label: 'Favoritos', Icono: Star, tono: 'amber', total: totalFavoritos },
                  { id: 'BLOQUEADOS', label: 'Bloqueados', Icono: Ban, tono: 'red', total: totalBloqueados },
                ];
                const actual = opciones.find(o => o.id === userFilter) || opciones[0];
                return (
                  <div className="tb-actions-wrapper mercado-board-filtro mercado-users-filtro" ref={userFiltroRef}>
                    <button
                      type="button"
                      className={`mercado-board-filtro-btn ${userFiltroAbierto ? 'abierto' : ''}`}
                      onClick={() => setUserFiltroAbierto(v => !v)}
                      aria-haspopup="true"
                      aria-expanded={userFiltroAbierto}
                      title="Filtrar contactos"
                    >
                      <SlidersHorizontal size={16} />
                      <span>{actual.label}</span>
                      <span className="mercado-board-filtro-total">{actual.total}</span>
                      <ChevronDown size={16} className="mercado-board-filtro-flecha" />
                    </button>

                    {userFiltroAbierto && (
                      <div className="tb-actions-menu">
                        {opciones.map(({ id, label, Icono, tono, total }) => (
                          <button
                            key={id}
                            type="button"
                            className={`tb-actions-item ${userFilter === id ? 'selected' : ''}`}
                            onClick={() => { setUserFilter(id); setUserFiltroAbierto(false); }}
                          >
                            <span className={`tb-actions-icon ${tono}`}><Icono size={16} strokeWidth={2.4} /></span>
                            <span>{label}</span>
                            <span className="tb-actions-badge">{total}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Grid de Tarjetas de Clientes */}
          <div className="mercado-users-grid">
            {filteredMyClients.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '60px 0', gridColumn: '1 / -1', background: '#141722', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Search size={34} color="#ffffff" style={{ marginBottom: '10px' }} />
                <h4 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '1.1rem' }}>
                  {userFilter === 'FAVORITOS' ? 'Aún no tienes clientes favoritos'
                    : userFilter === 'BLOQUEADOS' ? 'No has bloqueado a ningún cliente'
                    : 'No se encontraron clientes'}
                </h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  {userSearch ? 'Intenta con otro término de búsqueda.' : 'En cuanto ganes y aceptes solicitudes del mercado, tus clientes aparecerán aquí automáticamente.'}
                </p>
              </div>
            ) : (
              filteredMyClients.map(client => {
                const ocupado = guardandoMarca === client.clientUserId;
                return (
                  <div key={`cli-${client.key}`} className={`mercado-user-card ${client.bloqueado ? 'is-bloqueado' : ''}`}>
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
                            <span className="mercado-user-role-badge favorito"><Star size={12} fill="currentColor" /> Cliente favorito</span>
                          ) : client.bloqueado ? (
                            <span className="mercado-user-role-badge bloqueado"><Ban size={12} /> Bloqueado</span>
                          ) : (
                            <span className="mercado-user-role-badge"><Briefcase size={12} /> Cliente atendido</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mercado-user-info-rows">
                      <div className="mercado-user-info-row">
                        <MapPin size={14} style={{ flexShrink: 0 }} />
                        <span>{client.zona}</span>
                      </div>
                      <div className="mercado-user-info-row mercado-user-servicio-row" style={{ marginTop: '2px', paddingTop: '6px' }}>
                        <span className="mercado-user-etiqueta"><Wrench size={14} /> Último servicio:</span>
                        <span className="mercado-user-valor">{client.ultimoTrabajo.titulo}</span>
                      </div>
                      <div className="mercado-user-fecha-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span className="mercado-user-etiqueta"><Calendar size={13} /> {client.ultimoTrabajo.fecha}</span>
                        <span className="mercado-user-valor fuerte">
                          Total: ${client.totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Calificaciones Registradas Inmutables */}
                      <div className="mercado-user-calificaciones" style={{
                        marginTop: '8px',
                        borderRadius: '12px',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Star size={13} /> Calidad: <strong className="mercado-user-valor fuerte">{client.avgStars ? `${client.avgStars.toFixed(1)} / 5.0` : '5.0 / 5.0'}</strong>
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} /> Puntualidad: <strong className="mercado-user-valor fuerte">{client.avgTime ? `${client.avgTime.toFixed(1)} / 5.0` : '5.0 / 5.0'}</strong>
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', fontSize: '9.5px' }} className="mercado-user-calif-pie">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Lock size={12} /> <span className="mercado-user-tenue">Calificación inmutable</span>
                          </span>
                          <span className="mercado-user-tenue">
                            {client.reviewsCount > 0 ? `${client.reviewsCount} evaluaci${client.reviewsCount > 1 ? 'ones' : 'ón'}` : 'Historial definitivo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mercado-user-card-footer">
                      {/* Favorito / bloqueo: lo guarda el servidor (sin cuenta ligada no se puede marcar) */}
                      {client.clientUserId ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {client.bloqueado ? (
                            <button type="button" className="mercado-user-btn-action" disabled={ocupado} onClick={() => marcarCliente(client, null)}>
                              <Undo2 size={15} /> Desbloquear
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={`mercado-user-btn-action ${client.esFavorito ? 'favorito-activo' : ''}`}
                                disabled={ocupado}
                                onClick={() => marcarCliente(client, client.esFavorito ? null : 'favorito')}
                                title={client.esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                              >
                                <Star size={15} fill={client.esFavorito ? 'currentColor' : 'none'} /> Favorito
                              </button>
                              <button
                                type="button"
                                className="mercado-user-btn-action bloquear"
                                disabled={ocupado}
                                onClick={() => marcarCliente(client, 'bloqueado')}
                                title="Bloquear cliente"
                              >
                                <Ban size={15} /> Bloquear
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Cliente sin cuenta en la red</span>
                      )}

                      <button
                        type="button"
                        className="mercado-user-btn-action primary"
                        onClick={() => setSelectedClientForHistory(client)}
                      >
                        <ClipboardList size={15} color="#ffffff" /> Historial ({client.trabajosCount}) <ArrowRight size={14} color="#ffffff" />
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
      {/* Historial del cliente: va en el body para quedar encima del encabezado */}
      {selectedClientForHistory && createPortal(
        (() => {
          const cli = selectedClientForHistory;
          const promedio = cli.avgStars ? Number(cli.avgStars).toFixed(1) : '5.0';
          const dinero = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
          // La descripción trae "[URGENCIA]: ⚡ Atención Urgente…": se muestra como etiqueta, no como texto
          const separarUrgencia = (texto = '') => {
            const i = texto.indexOf('[URGENCIA]');
            return i === -1
              ? { desc: texto.trim(), urgente: false }
              : { desc: texto.slice(0, i).replace(/[\s\-–:]+$/, '').trim(), urgente: true };
          };

          return (
            <div className="hc-overlay" onClick={() => setSelectedClientForHistory(null)}>
              <div className="hc-modal" role="dialog" aria-label={`Historial de ${cli.nombre}`} onClick={(e) => e.stopPropagation()}>
                {/* Encabezado: quién es el cliente */}
                <div className="hc-header">
                  <div className="hc-avatar">
                    {cli.avatar ? <img src={cli.avatar} alt="" /> : cli.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="hc-header-info">
                    <span className="hc-kicker">Historial del cliente</span>
                    <h3 className="hc-nombre">{cli.nombre}</h3>
                    <div className="hc-contacto">
                      <span className="hc-chip"><MapPin size={13} /> <span className="hc-chip-txt">{cli.zona}</span></span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="hc-cerrar"
                    onClick={() => setSelectedClientForHistory(null)}
                    title="Cerrar"
                    aria-label="Cerrar historial"
                  >
                    <X size={18} strokeWidth={2.6} />
                  </button>
                </div>

                <div className="hc-body">
                  {/* Resumen en tres datos */}
                  <div className="hc-stats">
                    <div className="hc-stat">
                      <span className="tb-actions-icon blue"><ClipboardList size={16} strokeWidth={2.4} /></span>
                      <div>
                        <strong>{cli.trabajosCount}</strong>
                        <span>{cli.trabajosCount === 1 ? 'Servicio' : 'Servicios'}</span>
                      </div>
                    </div>
                    <div className="hc-stat">
                      <span className="tb-actions-icon green"><DollarSign size={16} strokeWidth={2.4} /></span>
                      <div>
                        <strong>{dinero(cli.totalFacturado)}</strong>
                        <span>Total acumulado</span>
                      </div>
                    </div>
                    <div className="hc-stat">
                      <span className="tb-actions-icon amber"><Star size={16} strokeWidth={2.4} /></span>
                      <div>
                        <strong>{promedio}<small> / 5</small></strong>
                        <span>Calificación</span>
                      </div>
                    </div>
                  </div>

                  <div className="hc-seccion">
                    <h4>Trabajos realizados</h4>
                    <span className="hc-seccion-nota"><Lock size={12} /> Calificaciones cerradas</span>
                  </div>

                  <div className="hc-lista">
                    {cli.trabajos.map((job, idx) => {
                      const { desc, urgente } = separarUrgencia(job.descripcion);
                      const calidad = job.review ? Number(job.review.rating_stars).toFixed(1) : '5.0';
                      const puntualidad = job.review ? Number(job.review.rating_time).toFixed(1) : '5.0';
                      return (
                        <article key={`cli-job-${job.id}-${idx}`} className="hc-job">
                          <div className="hc-job-head">
                            <div className="hc-job-titulo-wrap">
                              <h5 className="hc-job-titulo">{job.titulo}</h5>
                              {urgente && <span className="hc-badge-urgente"><Zap size={11} strokeWidth={2.6} /> Urgente</span>}
                            </div>
                            <span className="hc-job-precio">{dinero(job.agreed_price)}</span>
                          </div>

                          {desc && <p className="hc-job-desc">{desc}</p>}

                          <div className="hc-job-meta">
                            <span className="hc-meta"><Calendar size={13} /> Solicitado {job.fecha}</span>
                            <span className="hc-meta">
                              <CalendarDays size={13} />
                              {job.scheduled_at ? `Cita ${new Date(job.scheduled_at).toLocaleDateString('es-MX')}` : 'Sin cita'}
                            </span>
                            <span className="hc-meta hc-meta-nota"><Star size={13} /> Calidad <b>{calidad}</b></span>
                            <span className="hc-meta hc-meta-nota"><Clock size={13} /> Puntualidad <b>{puntualidad}</b></span>
                          </div>

                          {job.review?.comment && (
                            <blockquote className="hc-comentario">“{job.review.comment}”</blockquote>
                          )}

                          <div className="hc-job-pie">
                            <span className="hc-registrado">Calificado el {job.review?.created_at || job.fecha}</span>
                            <button
                              type="button"
                              className="hc-job-link"
                              onClick={() => {
                                setSelectedClientForHistory(null);
                                openQuoteModalForJob(job);
                              }}
                            >
                              Ver detalle y chat <ArrowRight size={14} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
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
          <div className={`mercado-sidebar ${mobileDrawerOpen ? 'mobile-open' : ''} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            
            {/* Pestaña lateral con flecha para ocultar / mostrar (Edge Tab) */}
            <button
              type="button"
              className="mercado-sidebar-edge-tab"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Mostrar panel" : "Ocultar panel"}
              aria-label={isSidebarCollapsed ? "Mostrar panel" : "Ocultar panel"}
            >
              {isSidebarCollapsed ? (
                <ChevronRight size={22} color="#ffffff" strokeWidth={2.8} />
              ) : (
                <ChevronLeft size={22} color="#ffffff" strokeWidth={2.8} />
              )}
            </button>

            <div className="mercado-sidebar-header">
              <div
                className="mercado-mobile-drag-handle"
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              />
              {/* Solo celular: texto de la barrita */}
              <span className="red-grabber-txt" onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}>
                {mobileDrawerOpen
                  ? <><ChevronDown size={15} /> Ver mapa completo</>
                  : <><ChevronUp size={15} /> Mostrar lista ({activeTab === 'disponibles' ? filteredNetworkJobs.length : filteredAcceptedJobs.length})</>}
              </span>
              <div className="red-sidebar-head">
                <h2><Globe size={18} /> Trabajos en Red</h2>
                <p>
                  <span className="mercado-map-live-dot" />
                  {activeTab === 'disponibles'
                    ? `${filteredNetworkJobs.length} ${filteredNetworkJobs.length === 1 ? 'solicitud disponible' : 'solicitudes disponibles'}`
                    : `${filteredAcceptedJobs.length} ${filteredAcceptedJobs.length === 1 ? 'trabajo aceptado' : 'trabajos aceptados'}`}
                </p>
              </div>
            </div>

            {/* Buscador + filtro: el filtro elige qué ver y filtra por fecha, hora y trabajo */}
            <div className="red-buscador" ref={filtroRef}>
              <label className="red-search">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Buscar por falla, colonia, cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" className="mercado-search-clear" onClick={() => setSearchQuery('')}>×</button>
                )}
              </label>

              <div className="red-filtro">
                <button
                  type="button"
                  className={`red-filtro-btn ${isFilterOpen ? 'abierto' : ''}`}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  aria-expanded={isFilterOpen}
                  title="Filtrar por fecha, hora y trabajo"
                  aria-label="Filtrar por fecha, hora y trabajo"
                >
                  <SlidersHorizontal size={16} />
                  {hasActiveFilters && <span className="mercado-filter-badge-dot" />}
                </button>
              </div>

              {/* Panel de Filtros Específicos (Fecha, Hora, Trabajo) */}
              {isFilterOpen && (
                <div className="mercado-filter-panel">
                  <div className="mercado-filter-header">
                    <div className="mercado-filter-title">
                      <svg 
                        width="14" 
                        height="14" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="#f26522" 
                        strokeWidth="2.2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{ display: 'inline-block', verticalAlign: 'middle' }}
                      >
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      <span>Filtros Específicos</span>
                    </div>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className="mercado-filter-reset-link"
                        onClick={resetAllFilters}
                      >
                        Limpiar todo
                      </button>
                    )}
                  </div>

                  {/* Qué ver: solicitudes o trabajos aceptados */}
                  <div className="mercado-filter-group">
                    <label className="mercado-filter-group-label">
                      <Layers size={12} /> Ver
                    </label>
                    <div className="mercado-filter-chips">
                      <button
                        type="button"
                        className={`mercado-filter-chip ${activeTab === 'disponibles' ? 'active' : ''}`}
                        onClick={() => {
                          setActiveTab('disponibles');
                          setActiveNavJob(null);
                          setNavDirections(null);
                        }}
                      >
                        Solicitudes ({filteredNetworkJobs.length})
                      </button>
                      <button
                        type="button"
                        className={`mercado-filter-chip ${activeTab === 'aceptados' ? 'active' : ''}`}
                        onClick={() => setActiveTab('aceptados')}
                      >
                        Aceptados ({filteredAcceptedJobs.length})
                      </button>
                    </div>
                  </div>

                  {/* 1. FILTRO FECHA */}
                  <div className="mercado-filter-group">
                    <label className="mercado-filter-group-label">
                      <Calendar size={12} /> Fecha
                    </label>
                    <div className="mercado-filter-chips">
                      {[
                        { id: 'TODAS', label: 'Todas' },
                        { id: 'HOY', label: 'Hoy' },
                        { id: 'MANANA', label: 'Mañana' },
                        { id: 'SEMANA', label: '7 días' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`mercado-filter-chip ${filterDatePreset === item.id && !filterCustomDate ? 'active' : ''}`}
                          onClick={() => {
                            setFilterDatePreset(item.id);
                            setFilterCustomDate('');
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="mercado-filter-custom-date-box">
                      <input
                        type="date"
                        className="mercado-filter-date-picker"
                        value={filterCustomDate}
                        onChange={(e) => {
                          setFilterCustomDate(e.target.value);
                          if (e.target.value) setFilterDatePreset('CUSTOM');
                          else setFilterDatePreset('TODAS');
                        }}
                        title="Seleccionar fecha específica en calendario"
                      />
                    </div>
                  </div>

                  {/* 2. FILTRO HORA */}
                  <div className="mercado-filter-group">
                    <label className="mercado-filter-group-label">
                      <Clock size={12} /> Hora / Horario
                    </label>
                    <div className="mercado-filter-chips">
                      {[
                        { id: 'TODAS', label: 'Cualquiera' },
                        { id: 'MANANA', label: 'Mañana (8-12)' },
                        { id: 'TARDE', label: 'Tarde (12-18)' },
                        { id: 'NOCHE', label: 'Noche (18-22)' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`mercado-filter-chip ${filterTimeSlot === item.id ? 'active' : ''}`}
                          onClick={() => setFilterTimeSlot(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. FILTRO TRABAJO / SERVICIO */}
                  <div className="mercado-filter-group">
                    <label className="mercado-filter-group-label">
                      <Wrench size={12} /> Trabajo / Especialidad
                    </label>
                    <select
                      className="mercado-filter-select"
                      value={filterJobType}
                      onChange={(e) => setFilterJobType(e.target.value)}
                    >
                      <option value="TODOS">Todos los trabajos</option>
                      <option value="Climatización">❄️ Climatización / A/A</option>
                      <option value="Plomería">🚰 Plomería / Fugas</option>
                      <option value="Electricidad">⚡ Electricidad</option>
                      <option value="Pintura">🎨 Pintura</option>
                      <option value="Cerrajería">🔑 Cerrajería</option>
                      <option value="Carpintería">🪚 Carpintería</option>
                      <option value="Jardinería">🌿 Jardinería</option>
                      <option value="Emergencia SOS">🚨 Emergencia SOS</option>
                      <option value="Mantenimiento">🛠️ Mantenimiento / General</option>
                    </select>
                  </div>

                  <div className="mercado-filter-panel-actions">
                    <button
                      type="button"
                      className="mercado-filter-panel-done-btn"
                      onClick={() => setIsFilterOpen(false)}
                    >
                      Listo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Trabajos con Scroll */}
            <div className="mercado-job-list">
              {activeTab === 'disponibles' ? (
                /* ══════════════════════════════════════════
                   PESTAÑA 1: SOLICITUDES DISPONIBLES EN RED
                   ══════════════════════════════════════════ */
                <>
                  {filteredNetworkJobs.length === 0 && (
                    <div className="mercado-empty-state-card">
                      <div className="empty-icon">⏳</div>
                      <h4>No hay solicitudes disponibles</h4>
                      <p>{searchQuery ? 'Ningún trabajo coincide con tu búsqueda.' : 'En cuanto los clientes publiquen solicitudes aparecerán aquí.'}</p>
                    </div>
                  )}
                  {filteredNetworkJobs.map(job => {
                    const cat = getCategoryIcon(job.tipo, job.titulo, job.equipo);
                    const IconoCategoria = ICONOS_CATEGORIA[cat.label] || Wrench;
                    const desc = descripcionTarjeta(job.descripcion);
                    const deseada = fechaDeseada(job.descripcion);
                    return (
                      <div
                        key={job.id}
                        className={`mercado-job-card red-job-card ${selectedJob?.id === job.id ? 'active' : ''} ${job.is_urgent ? 'es-urgente' : ''}`}
                        onClick={() => openQuoteModalForJob(job)}
                      >
                        {/* Encabezado: ícono de categoría, título y estado */}
                        <div className="rj-head">
                          <div className="rj-avatar" style={{ '--rj-cat': cat.color }} title={cat.label}>
                            <IconoCategoria size={19} strokeWidth={2.2} />
                          </div>

                          <div className="rj-head-text">
                            <h4 className="rj-title">{job.titulo}</h4>
                            <div className="rj-meta">
                              <span className="rj-meta-item">
                                <MapPin size={12} />
                                {job.zona}
                              </span>
                              {job.is_urgent && (
                                <span className="rj-chip urgente"><Zap size={11} /> Urgente</span>
                              )}
                              {!job.is_urgent && deseada && (
                                <span className="rj-chip programado" title="Fecha estimada en que el cliente necesita el trabajo">
                                  <Calendar size={11} /> Lo necesita: {deseada.texto}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className={`rj-estado ${job.myQuote?.status === 'accepted' ? 'asignado' : ''}`}>
                            {job.myQuote
                              ? (job.myQuote.status === 'rejected' ? 'Rechazada' : (job.myQuote.price > 0 ? `$${parseFloat(job.myQuote.price).toLocaleString('es-MX')}` : 'Chat'))
                              : 'Disponible'}
                          </span>
                        </div>

                        {desc && <p className="rj-desc">{desc}</p>}

                        {/* Mensaje del cliente */}
                        {job.lastClientMsg && (
                          <div className="rj-mensaje">
                            <MessageCircle size={15} className="rj-mensaje-icono" />
                            <div className="rj-mensaje-texto">
                              <strong>Mensaje del cliente <span className="red-msg-dot-pulse" /></strong>
                              <span>&ldquo;{job.lastClientMsg.message}&rdquo;</span>
                            </div>
                          </div>
                        )}

                        {/* Pie: ofertas y fecha a la izquierda, acción a la derecha */}
                        <div className="rj-footer">
                          <div className="rj-footer-info">
                            <span className="rj-ofertas">
                              <b>{job.cotizaciones}</b> {job.cotizaciones === 1 ? 'oferta' : 'ofertas'}
                            </span>
                            <span className="rj-fecha"><Clock size={11} /> {job.fecha}</span>
                          </div>

                          <div className="rj-footer-acciones">
                            <span className="rj-btn-ver">
                              {job.myQuote ? 'Ver oferta' : 'Cotizar'}
                              <ChevronRight size={14} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                /* ══════════════════════════════════════════
                   PESTAÑA 2: TRABAJOS ACEPTADOS / GANADOS
                   ══════════════════════════════════════════ */
                <>
                  {filteredAcceptedJobs.length === 0 && (
                    <div className="mercado-empty-state-card">
                      <div className="empty-icon">💼</div>
                      <h4>No tienes trabajos aceptados</h4>
                      <p>{searchQuery ? 'Ningún trabajo aceptado coincide con tu búsqueda.' : 'Tus cotizaciones aceptadas por clientes aparecerán aquí.'}</p>
                    </div>
                  )}
                  {filteredAcceptedJobs.map(job => {
                    const cat = getCategoryIcon(job.tipo, job.titulo, job.equipo);
                    const IconoCategoria = ICONOS_CATEGORIA[cat.label] || Wrench;
                    const scheduleInfo = getSmartScheduleStatus(job);
                    const isArrived = job.arrived_at || job.arrival_status === 'EN_SITIO';
                    const horarioJob = estadoHorarioDe(job);

                    return (
                      <div
                        key={job.id}
                        className={`mercado-job-card red-job-card accepted-job ${selectedJob?.id === job.id ? 'active' : ''} ${scheduleInfo.isUrgentGlow ? 'is-urgent-glow' : ''}`}
                        onClick={() => {
                          setSelectedJob(job);
                          handleStartRoute(job);
                        }}
                      >
                        {/* Encabezado: ícono de categoría, título y estado */}
                        <div className="rj-head">
                          <div className="rj-avatar" style={{ '--rj-cat': cat.color }} title={cat.label}>
                            <IconoCategoria size={19} strokeWidth={2.2} />
                          </div>

                          <div className="rj-head-text">
                            <h4 className="rj-title">{job.titulo}</h4>
                            <div className="rj-meta">
                              <span className="rj-meta-item">
                                <MapPin size={12} />
                                {job.zona}
                              </span>
                              {scheduleInfo.isUrgentGlow && (
                                <span className="rj-chip urgente"><Zap size={11} /> {scheduleInfo.label}</span>
                              )}
                              {horarioJob.pideOtro && (
                                <span className="rj-chip rj-chip-cambio" title={horarioJob.nota ? `El cliente escribió: “${horarioJob.nota}”` : 'El cliente pidió otro horario'}>
                                  <AlertCircle size={11} /> Pide otro horario
                                </span>
                              )}
                              {horarioJob.confirmado && (
                                <span className="rj-chip rj-chip-confirmado"><CheckCircle2 size={11} /> Visita confirmada</span>
                              )}
                            </div>
                          </div>

                          <span className="rj-estado asignado">{isArrived ? 'En sitio' : 'Aceptado'}</span>
                        </div>

                        <p className="rj-desc">{job.full_address || job.calle || job.zona}</p>

                        {/* Cliente y hora de la visita */}
                        <div className="rj-tecnico">
                          <User size={13} />
                          <span className="rj-tecnico-nombre">{job.client_name || job.cliente}</span>
                          {job.scheduled_at && (
                            <span className="rj-tecnico-precio">
                              {new Date(job.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        {/* Pie: fecha a la izquierda, acciones a la derecha */}
                        <div className="rj-footer">
                          <div className="rj-footer-info">
                            <span className="rj-fecha"><Clock size={11} /> {job.fecha}</span>
                          </div>

                          <div className="rj-footer-acciones">
                            <button
                              type="button"
                              className="rj-btn-eliminar rj-btn-detalle"
                              onClick={(e) => {
                                e.stopPropagation();
                                openQuoteModalForJob(job);
                              }}
                              title="Ver detalles y chat"
                              aria-label="Ver detalles y chat"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              type="button"
                              className="rj-btn-ver rj-btn-ruta"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRoute(job);
                              }}
                            >
                              <Navigation size={13} /> Iniciar ruta
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* ─── Map ─── */}
          <div ref={mapaSeccionRef} className={`mercado-map-section ${mapTheme === 'dark' ? 'es-oscuro' : ''}`}>
            {isLoaded ? (
              <>
                <div className="mercado-map-top-bar">
                  <div className="mercado-map-overlay-badge">
                    <span className="mercado-map-live-dot" />
                    {activeTab === 'disponibles'
                      ? `${filteredNetworkJobs.length} disponibles`
                      : `${filteredAcceptedJobs.length} aceptados`}
                  </div>
                </div>

                {/* Cambiar entre mapa claro y oscuro (junto al botón de pantalla completa) */}
                <button
                  type="button"
                  className={`red-tema-btn ${mapTheme === 'dark' ? 'es-oscuro' : ''} ${puedePantallaCompleta ? '' : 'sin-pantalla'}`}
                  onClick={() => {
                    const next = mapTheme === 'dark' ? 'light' : 'dark';
                    setMapTheme(next);
                    localStorage.setItem('agente_map_theme', next);
                  }}
                  title={mapTheme === 'dark' ? 'Mapa claro' : 'Mapa oscuro'}
                  aria-label={mapTheme === 'dark' ? 'Cambiar a mapa claro' : 'Cambiar a mapa oscuro'}
                >
                  {/* Los dos íconos siempre montados: uno sale girando y el otro entra (animación en CSS) */}
                  <Moon size={18} className="red-tema-icono red-tema-luna" aria-hidden="true" />
                  <Sun size={18} className="red-tema-icono red-tema-sol" aria-hidden="true" />
                </button>

                {puedePantallaCompleta && (
                  <button
                    type="button"
                    className={`red-pantalla-btn ${mapTheme === 'dark' ? 'es-oscuro' : ''}`}
                    onClick={alternarPantallaCompleta}
                    title={enPantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    aria-label={enPantallaCompleta ? 'Salir de pantalla completa' : 'Ver mapa en pantalla completa'}
                  >
                    {enPantallaCompleta ? <Minimize size={18} /> : <Maximize size={18} />}
                  </button>
                )}

                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={activeNavJob ? { lat: activeNavJob.lat, lng: activeNavJob.lng } : defaultCenter}
                  zoom={activeNavJob ? 14 : 13}
                  options={{ 
                    disableDefaultUI: false, 
                    styles: mapTheme === 'dark' ? DARK_MAP_STYLES : [], 
                    clickableIcons: false,
                    fullscreenControl: false, // se usa un botón propio de vidrio (.red-pantalla-btn)
                    mapTypeControl: false,
                    streetViewControl: false
                  }}
                >
                  {/* PESTAÑA DISPONIBLES: Marcadores de Trabajos Disponibles */}
                  {activeTab === 'disponibles' && filteredNetworkJobs.map(job => (
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

                  {/* PESTAÑA ACEPTADOS: Marcadores de Trabajos Aceptados con Brillo Inteligente */}
                  {activeTab === 'aceptados' && filteredAcceptedJobs.map(job => {
                    const schedInfo = getSmartScheduleStatus(job);
                    return (
                      <React.Fragment key={`acc-${job.id}`}>
                        {/* Círculo Brillante si la cita es en los próximos 45 min */}
                        {schedInfo.isUrgentGlow && (
                          <Circle
                            center={{ lat: job.lat, lng: job.lng }}
                            radius={400}
                            options={{
                              fillColor: '#f26522',
                              fillOpacity: 0.35,
                              strokeColor: '#ea580c',
                              strokeOpacity: 0.95,
                              strokeWeight: 2.5,
                              clickable: true
                            }}
                            onClick={() => {
                              setSelectedJob(job);
                              handleStartRoute(job);
                            }}
                          />
                        )}

                        <Circle
                          center={{ lat: job.lat, lng: job.lng }}
                          radius={250}
                          options={{
                            fillColor: '#0284c7',
                            fillOpacity: 0.22,
                            strokeColor: '#38bdf8',
                            strokeOpacity: 0.85,
                            strokeWeight: 2,
                            clickable: true
                          }}
                          onClick={() => {
                            setSelectedJob(job);
                            handleStartRoute(job);
                          }}
                        />

                        <Marker
                          position={{ lat: job.lat, lng: job.lng }}
                          onClick={() => {
                            setSelectedJob(job);
                            handleStartRoute(job);
                          }}
                          title={`Trabajo: ${job.titulo} (${job.client_name || 'Cliente'})`}
                          icon={{
                            url: schedInfo.isUrgentGlow 
                              ? 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png' 
                              : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                          }}
                        />
                      </React.Fragment>
                    );
                  })}

                  {/* 🚗 UBICACIÓN EN TIEMPO REAL DEL TÉCNICO (GPS) */}
                  {technicianLocation && (
                    <>
                      <Circle
                        center={technicianLocation}
                        radius={120}
                        options={{
                          fillColor: '#38bdf8',
                          fillOpacity: 0.25,
                          strokeColor: '#0284c7',
                          strokeOpacity: 0.85,
                          strokeWeight: 2
                        }}
                      />
                      <Marker
                        position={technicianLocation}
                        title={activeNavJob ? 'Vas en camino al trabajo' : 'Tu Ubicación Actual'}
                        zIndex={activeNavJob ? 999 : undefined}
                        icon={activeNavJob && window.google
                          ? {
                              // En ruta: el técnico se ve como un casco de obra que avanza hacia el trabajo
                              url: ICONO_CASCO_RUTA,
                              scaledSize: new window.google.maps.Size(46, 46),
                              anchor: new window.google.maps.Point(23, 23),
                            }
                          : { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
                      />
                    </>
                  )}

                  {/* 🗺️ RUTA TRAZADA EN VIVO (DIRECTIONS RENDERER) */}
                  {navDirections && (
                    <DirectionsRenderer
                      directions={navDirections}
                      options={{
                        // Sin marcadores A/B: el origen es el casco del técnico y el destino ya tiene su pin
                        suppressMarkers: true,
                        polylineOptions: {
                          strokeColor: '#f26522',
                          strokeWeight: 5,
                          strokeOpacity: 0.9
                        }
                      }}
                    />
                  )}

                  {/* InfoWindow si se selecciona un trabajo sin navegar */}
                  {/* InfoWindowF: la versión sin "F" deja un globo vacío duplicado con StrictMode */}
                  {selectedJob && !showQuoteModal && !activeNavJob && (
                    <InfoWindowF
                      position={{ lat: selectedJob.lat, lng: selectedJob.lng }}
                      onCloseClick={() => setSelectedJob(null)}
                      options={{ headerDisabled: true, pixelOffset: new window.google.maps.Size(0, -8), maxWidth: 290 }}
                    >
                      <div className="mi-globo">
                        <button
                          type="button"
                          className="mi-globo-cerrar"
                          onClick={() => setSelectedJob(null)}
                          aria-label="Cerrar"
                        >
                          <X size={15} strokeWidth={2.6} />
                        </button>

                        <div className="mi-globo-head">
                          <span className="tb-actions-icon orange">
                            <Wrench size={15} strokeWidth={2.4} />
                          </span>
                          <div className="mi-globo-txt">
                            <strong className="mi-globo-titulo">{selectedJob.titulo}</strong>
                            <span className="mi-globo-zona"><MapPin size={12} /> {selectedJob.zona}</span>
                          </div>
                        </div>

                        {(selectedJob.is_urgent || selectedJob.myQuote || fechaDeseada(selectedJob.descripcion) || selectedJob.calificacion_cliente?.total > 0) && (
                          <div className="mi-globo-etiquetas">
                            {selectedJob.is_urgent && <span className="mi-globo-urgente"><Zap size={11} strokeWidth={2.6} /> Urgente</span>}
                            {!selectedJob.is_urgent && fechaDeseada(selectedJob.descripcion) && (
                              <span className="mi-globo-deseada"><Calendar size={11} strokeWidth={2.6} /> Lo necesita: {fechaDeseada(selectedJob.descripcion).texto}</span>
                            )}
                            {selectedJob.myQuote && <span className="mi-globo-cotizado"><CheckCircle2 size={11} strokeWidth={2.6} /> Ya cotizaste</span>}
                            {selectedJob.calificacion_cliente?.total > 0 && (
                              <Calificacion compacta estrellas={selectedJob.calificacion_cliente.trato} relojes={selectedJob.calificacion_cliente.pago} total={selectedJob.calificacion_cliente.total} etiquetas={{ estrellas: 'Trato del cliente', relojes: 'Pago del cliente' }} />
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          className="mi-globo-btn"
                          onClick={() => {
                            if (selectedJob.is_accepted) {
                              handleStartRoute(selectedJob);
                            } else {
                              openQuoteModalForJob(selectedJob);
                            }
                          }}
                        >
                          {selectedJob.is_accepted
                            ? <><Navigation size={15} strokeWidth={2.4} /> Iniciar ruta</>
                            : (selectedJob.myQuote
                              ? <><FileText size={15} strokeWidth={2.4} /> Ver detalle y chat</>
                              : <><DollarSign size={15} strokeWidth={2.4} /> Cotizar este trabajo</>)}
                        </button>
                      </div>
                    </InfoWindowF>
                  )}
                </GoogleMap>

                {/* Leyenda de colores de los marcadores */}
                <div className="red-map-legend">
                  {activeTab === 'disponibles' ? (
                    <>
                      <span><i style={{ background: '#ff6600' }} /> Disponible</span>
                      <span><i style={{ background: '#ef4444' }} /> Urgente</span>
                      <span><i style={{ background: '#2563eb' }} /> Mensaje nuevo</span>
                    </>
                  ) : (
                    <>
                      <span><i style={{ background: '#0284c7' }} /> Aceptado</span>
                      <span><i style={{ background: '#f26522' }} /> Visita próxima</span>
                    </>
                  )}
                </div>

                {/* ══════════════════════════════════════════════════
                    PANEL DE RUTA Y LLEGADA FLOTANTE (ESTILO UBER)
                    ══════════════════════════════════════════════════ */}
                {activeNavJob && (() => {
                  const navSched = getTimeRemainingInfo(activeNavJob);
                  // activeNavJob es una copia del momento en que se inició la ruta; el chat vivo está en acceptedJobs
                  const navVivo = acceptedJobs.find(j => j.id === activeNavJob.id) || activeNavJob;
                  const navHorario = estadoHorarioDe(navVivo);

                  return (
                    <div className="nv-panel">
                      {/* Estado y cerrar */}
                      <div className="nv-top">
                        <span className={`nv-estado ${navStatus === 'en_sitio' ? 'en-sitio' : ''}`}>
                          <span className="nv-pulso" />
                          {navStatus === 'en_sitio'
                            ? <><CheckCircle2 size={14} strokeWidth={2.6} /> En el lugar del trabajo</>
                            : <><Navigation size={14} strokeWidth={2.6} /> En camino al servicio</>}
                        </span>
                        <button
                          type="button"
                          className="nv-cerrar"
                          onClick={() => {
                            setActiveNavJob(null);
                            setNavDirections(null);
                            setNavStatus('idle');
                          }}
                          title="Cerrar navegación"
                          aria-label="Cerrar navegación"
                        >
                          <X size={16} strokeWidth={2.6} />
                        </button>
                      </div>

                      {/* Destino y tiempo de llegada */}
                      <div className="nv-destino">
                        <span className="tb-actions-icon orange"><Wrench size={17} strokeWidth={2.4} /></span>
                        <div className="nv-destino-txt">
                          <h4 className="nv-titulo">{activeNavJob.titulo}</h4>
                          <span className="nv-linea"><MapPin size={13} /> <span>{activeNavJob.full_address || activeNavJob.calle || activeNavJob.zona}</span></span>
                          <span className="nv-linea"><User size={13} /> <span>{activeNavJob.client_name || activeNavJob.cliente}</span></span>
                        </div>
                        <div className="nv-eta">
                          {navDuration && <strong>{navDuration}</strong>}
                          {navDistance ? (
                            <span>{navDistance}</span>
                          ) : (
                            technicianLocation && activeNavJob.lat && (
                              <span>Aprox. {calculateDistanceKm(technicianLocation.lat, technicianLocation.lng, activeNavJob.lat, activeNavJob.lng)} km</span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Hora de la cita */}
                      <div className={`nv-cita ${navSched.hasSchedule ? '' : 'sin-hora'}`}>
                        <span className="nv-cita-icono"><Clock size={15} strokeWidth={2.4} /></span>
                        <div className="nv-cita-txt">
                          {navSched.hasSchedule ? (
                            <>
                              <strong>Cita {navSched.formattedTime}</strong>
                              <span className={navSched.isUrgent ? 'nv-cita-alerta' : ''}>{navSched.text}</span>
                            </>
                          ) : (
                            <>
                              <strong>Sin hora de llegada</strong>
                              <span className="nv-cita-alerta">Agenda la visita con el cliente</span>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          className="nv-btn-blanco"
                          onClick={() => handleOpenBoardScheduler(activeNavJob)}
                          title="Definir o cambiar hora de llegada"
                        >
                          <Calendar size={14} strokeWidth={2.4} /> {navSched.hasSchedule ? 'Modificar' : 'Agendar'}
                        </button>
                      </div>

                      {/* Respuesta del cliente al horario propuesto */}
                      {navHorario.pideOtro && (
                        <div className="nv-aviso nv-aviso-cambio">
                          <span className="nv-aviso-icono"><AlertCircle size={16} strokeWidth={2.4} /></span>
                          <div className="nv-aviso-txt">
                            <strong>El cliente pidió otro horario</strong>
                            {navHorario.nota && <span>“{navHorario.nota}”</span>}
                          </div>
                          <div className="nv-aviso-acciones">
                            <button type="button" className="nv-aviso-btn" onClick={() => handleOpenBoardScheduler(navVivo)}>
                              <Calendar size={13} strokeWidth={2.4} /> Proponer
                            </button>
                            <button
                              type="button"
                              className="nv-aviso-btn secundario"
                              onClick={() => { openQuoteModalForJob(navVivo); setActiveModalTab('chat'); }}
                              title="Abrir el chat con el cliente"
                              aria-label="Abrir el chat con el cliente"
                            >
                              <MessageCircle size={13} strokeWidth={2.4} />
                            </button>
                          </div>
                        </div>
                      )}
                      {navHorario.confirmado && (
                        <div className="nv-aviso nv-aviso-ok">
                          <span className="nv-aviso-icono"><CheckCircle2 size={16} strokeWidth={2.4} /></span>
                          <div className="nv-aviso-txt"><strong>El cliente confirmó la visita</strong></div>
                        </div>
                      )}
                      {navHorario.pendiente && (
                        <div className="nv-aviso nv-aviso-espera">
                          <span className="nv-aviso-icono"><Clock size={16} strokeWidth={2.4} /></span>
                          <div className="nv-aviso-txt"><strong>Esperando que el cliente confirme el horario</strong></div>
                        </div>
                      )}

                      {/* Acciones */}
                      <button
                        type="button"
                        className="nv-btn-principal"
                        onClick={() => handleConfirmArrival(activeNavJob)}
                      >
                        <MapPin size={17} strokeWidth={2.4} /> Llegué al lugar
                      </button>

                      <div className="nv-secundarias">
                        {activeNavJob.client_phone && (
                          <button
                            type="button"
                            className="nv-btn-blanco"
                            onClick={() => window.open(`tel:${activeNavJob.client_phone}`)}
                            title="Llamar al cliente"
                          >
                            <Phone size={15} strokeWidth={2.4} /> Llamar
                          </button>
                        )}
                        <button
                          type="button"
                          className="nv-btn-blanco nv-btn-cancelar"
                          onClick={() => handleCancelServiceByTech(activeNavJob)}
                          title="Cancelar asistencia a este servicio"
                        >
                          <X size={15} strokeWidth={2.4} /> Cancelar servicio
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="mercado-loading-map">Cargando Mapa...</div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL PREMIUM 2 COLUMNAS (DETALLES + CHAT INTEGRADO) ─── */}
      {/* En PC y en el Mercado, el modal vive dentro de la sección del mapa (no tapa encabezado ni lista) */}
      {showQuoteModal && selectedJob && ((contenido) => (
        esEscritorio && mainView === 'mercado' && mapaSeccionRef.current
          ? createPortal(contenido, mapaSeccionRef.current)
          : contenido
      ))(
        <div
          className={esEscritorio && mainView === 'mercado' && mapaSeccionRef.current ? 'jm-en-mapa' : 'mercado-modal-overlay'}
          onClick={(e) => e.target === e.currentTarget && setShowQuoteModal(false)}
        >
          <div className="mercado-premium-modal jm-modal" style={{ maxWidth: '1080px' }}>
            
            {/* ══════════════════════════════════════════════════
                PASO 1: DETALLES DEL TRABAJO / COORDINACIÓN / CHAT
            ══════════════════════════════════════════════════ */}
            {quoteStep === 1 && (
              <>
                <div className="mercado-premium-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className={`tb-actions-icon ${selectedJob.is_accepted ? 'green' : 'orange'}`}>
                      {selectedJob.is_accepted ? <CheckCircle2 size={17} strokeWidth={2.4} /> : <Briefcase size={17} strokeWidth={2.4} />}
                    </span>
                    <h2 style={{ margin: 0 }}>
                      {selectedJob.is_accepted ? 'Trabajo aceptado' : 'Detalle del trabajo'}
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

                  <button type="button" className="jm-cerrar" onClick={() => setShowQuoteModal(false)} title="Cerrar" aria-label="Cerrar">
                    <X size={18} strokeWidth={2.6} />
                  </button>
                </div>

                <div className="mercado-premium-body">
                  {/* ─────────────────────────────────────────────────────────────
                      CASO A: TRABAJO ACEPTADO - COORDINACIÓN Y HORARIO
                  ───────────────────────────────────────────────────────────── */}
                  {selectedJob.is_accepted && activeModalTab === 'detalle' && (() => {
                    const textoDesc = selectedJob.descripcion || '';
                    const descLimpia = descripcionTarjeta(textoDesc).replace(/[\s\-–:]+$/, '').trim();
                    const esUrgente = selectedJob.is_urgent || textoDesc.includes('[URGENCIA]');
                    const deseada = !esUrgente && fechaDeseada(textoDesc);
                    const fotos = selectedJob.fotos || [];
                    const coords = extraerCoordenadas(selectedJob);
                    const fechaCita = selectedJob.scheduled_at
                      ? new Date(selectedJob.scheduled_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
                      : null;
                    const estadoCita = isRescheduleRequested ? 'cambio' : isScheduleConfirmed ? 'ok' : isPendingClientConfirm ? 'espera' : 'sin';
                    const chipCita = {
                      cambio: 'Pide otro horario',
                      ok: 'Confirmada por el cliente',
                      espera: 'Esperando confirmación',
                      sin: 'Sin agendar',
                    }[estadoCita];

                    return (
                      <div className="jm-grid">
                        {/* ── Columna izquierda: el trabajo ── */}
                        <div className="jm-col">
                          <section className="jm-card">
                            <div className="jm-card-head">
                              <span className="tb-actions-icon orange"><Wrench size={16} strokeWidth={2.4} /></span>
                              <div className="jm-card-head-txt">
                                <span className="jm-kicker">Trabajo asignado a ti</span>
                                <h3 className="jm-titulo">{selectedJob.titulo}</h3>
                              </div>
                              {esUrgente && <span className="jm-badge-urgente"><Zap size={12} strokeWidth={2.6} /> Urgente</span>}
                            </div>

                            {descLimpia && <p className="jm-desc">{descLimpia}</p>}

                            <div className="jm-pills">
                              <span className="jm-pill"><Clock size={13} /> Solicitado {selectedJob.fecha}</span>
                              {deseada && <span className="jm-badge-deseada" title="Fecha en que el cliente necesita el trabajo"><Calendar size={12} strokeWidth={2.6} /> Lo necesita: {deseada.texto}</span>}
                            </div>
                          </section>

                          {fotos.length > 0 && activePhoto ? (
                            <section className="jm-card jm-fotos">
                              <div className="jm-seccion-titulo">
                                <span>{activePhoto === selectedJob.facade_photo ? 'Fachada del inmueble' : 'Fotos de la falla'}</span>
                                {fotos.length > 1 && <span className="jm-contador">{fotos.indexOf(activePhoto) + 1} de {fotos.length}</span>}
                              </div>
                              <button type="button" className="jm-foto-principal" onClick={() => setIsPhotoZoomed(true)} title="Ampliar foto">
                                <img src={activePhoto} alt="Fotografía del servicio" />
                                <span className="jm-foto-zoom"><Maximize2 size={13} /> Ampliar</span>
                              </button>
                              {fotos.length > 1 && (
                                <div className="jm-miniaturas">
                                  {fotos.map((f, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      className={`jm-miniatura ${activePhoto === f ? 'activa' : ''}`}
                                      onClick={() => setActivePhoto(f)}
                                      title={f === selectedJob.facade_photo ? 'Ver fachada' : `Ver foto ${idx + 1}`}
                                    >
                                      <img src={f} alt={f === selectedJob.facade_photo ? 'Fachada' : `Foto ${idx + 1}`} />
                                      {f === selectedJob.facade_photo && <span className="jm-miniatura-tag"><Home size={10} /></span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </section>
                          ) : (
                            <section className="jm-card jm-sin-fotos">
                              <span className="jm-sin-fotos-icono"><ImageIcon size={22} /></span>
                              <div>
                                <strong>Sin fotos</strong>
                                <span>El cliente no adjuntó fotografías.</span>
                              </div>
                            </section>
                          )}
                        </div>

                        {/* ── Columna derecha: horario, cliente y acciones ── */}
                        <div className="jm-col">
                          <section className={`jm-card jm-horario ${estadoCita}`}>
                            <div className="jm-seccion-titulo">
                              <span>Hora de la visita</span>
                              <span className={`jm-horario-chip ${estadoCita}`}>{chipCita}</span>
                            </div>

                            {isRescheduleRequested && (
                              <div className="jm-horario-aviso cambio">
                                <AlertCircle size={16} />
                                <div>
                                  <strong>El cliente pidió otro horario</strong>
                                  {horarioSel.nota && <span>“{horarioSel.nota}”</span>}
                                  <small>Elige la nueva hora acordada y propónla.</small>
                                </div>
                              </div>
                            )}

                            {fechaCita && !isRescheduleRequested && (
                              <div className="jm-horario-fecha">
                                <Calendar size={16} />
                                <strong>{fechaCita}</strong>
                              </div>
                            )}
                            {isPendingClientConfirm && <p className="jm-texto-suave">El cliente ya recibió tu propuesta; te avisaremos cuando la confirme o pida otra hora.</p>}
                            {!fechaCita && <p className="jm-texto-suave">Elige cuándo llegarás para que el cliente lo confirme.</p>}

                            <div className="jm-horario-form">
                              <button
                                type="button"
                                className="jm-horario-selector"
                                onClick={() => setShowDatePickerModal(true)}
                                title="Elegir fecha y hora"
                              >
                                <Clock size={15} />
                                <span>{formatDateTimeHuman(scheduleDate)}</span>
                                <ChevronDown size={15} className="jm-horario-flecha" />
                              </button>
                              <button
                                type="button"
                                className="jm-btn-principal"
                                onClick={() => handleProgramarVisita(selectedJob.id)}
                                disabled={savingSchedule}
                              >
                                <Send size={16} strokeWidth={2.4} />
                                {savingSchedule ? 'Enviando…' : (isRescheduleRequested ? 'Proponer nuevo horario' : (fechaCita ? 'Cambiar horario' : 'Proponer horario'))}
                              </button>
                            </div>

                            <MaterialDateTimePicker
                              isOpen={showDatePickerModal}
                              value={scheduleDate}
                              onChange={(newVal) => setScheduleDate(newVal)}
                              onClose={() => setShowDatePickerModal(false)}
                              title="Programar hora de llegada"
                            />
                          </section>

                          <section className="jm-card jm-cliente">
                            <div className="jm-card-head">
                              <span className="tb-actions-icon blue"><User size={16} strokeWidth={2.4} /></span>
                              <div className="jm-card-head-txt">
                                <span className="jm-kicker">Cliente</span>
                                <h3 className="jm-titulo jm-titulo-sm">{selectedJob.client_name || selectedJob.cliente}</h3>
                              </div>
                              <div className="jm-monto">
                                <small>Acordado</small>
                                <strong>${parseFloat(selectedJob.agreed_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                              </div>
                            </div>

                            <div className="jm-direccion">
                              <MapPin size={15} />
                              <div>
                                <strong>{selectedJob.full_address || selectedJob.calle}</strong>
                                {selectedJob.property_name && selectedJob.property_name !== selectedJob.full_address && <span>{selectedJob.property_name}</span>}
                                {coords && <span className="jm-gps">GPS {coords.formatted}</span>}
                              </div>
                            </div>

                            <div className="jm-contacto">
                              <button type="button" className="jm-btn-suave" onClick={() => abrirEnGoogleMaps(selectedJob)}>
                                <ExternalLink size={14} /> Maps
                              </button>
                              {selectedJob.client_phone && (
                                <>
                                  <a className="jm-btn-suave" href={`tel:${selectedJob.client_phone}`}>
                                    <Phone size={14} /> Llamar
                                  </a>
                                  <a
                                    className="jm-btn-suave verde"
                                    href={`https://wa.me/52${selectedJob.client_phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MessageCircle size={14} /> WhatsApp
                                  </a>
                                </>
                              )}
                            </div>
                          </section>

                          {lastClientMsg && (
                            <div className="jm-aviso-mensaje">
                              <span className="tb-actions-icon green"><MessageCircle size={15} strokeWidth={2.4} /></span>
                              <div>
                                <strong>El cliente te escribió</strong>
                                <span>“{lastClientMsg.message}”</span>
                              </div>
                            </div>
                          )}

                          <button type="button" className="jm-card jm-chat-btn" onClick={() => setActiveModalTab('chat')}>
                            <span className="tb-actions-icon orange"><MessageCircle size={16} strokeWidth={2.4} /></span>
                            <span className="jm-chat-txt">
                              <strong>Chat con el cliente</strong>
                              <span>Conversación solo de este trabajo</span>
                            </span>
                            {chatMessages.length > 0 && <span className="jm-chat-total">{chatMessages.length}</span>}
                            <ChevronRight size={18} className="jm-chat-flecha" />
                          </button>

                          <div className="jm-acciones-trabajo">
                            <button
                              type="button"
                              className={`jm-btn-suave ${arrivalAlertSent[selectedJob.id] ? 'verde' : ''}`}
                              onClick={() => handleSendArrivalAlert(selectedJob)}
                              disabled={sendingArrivalAlert}
                              title="Avisar al cliente que ya estás en el domicilio"
                            >
                              <MapPin size={14} />
                              {sendingArrivalAlert
                                ? 'Enviando aviso…'
                                : (arrivalAlertSent[selectedJob.id] ? `Aviso enviado (${arrivalAlertSent[selectedJob.id]})` : 'Avisar que llegué')}
                            </button>
                            <button
                              type="button"
                              className="jm-btn-suave rojo"
                              onClick={() => handleCancelServiceByTech(selectedJob)}
                              title="Cancelar tu asistencia y liberar la solicitud"
                            >
                              <X size={14} /> Cancelar servicio
                            </button>
                          </div>

                          {arrivalAlertToast && (
                            <div className="jm-aviso-mensaje">
                              <span className="tb-actions-icon green"><CheckCircle2 size={15} strokeWidth={2.4} /></span>
                              <div><strong>{arrivalAlertToast}</strong></div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ─────────────────────────────────────────────────────────────
                      CASO B: TRABAJO ACEPTADO - CHAT DEL TRABAJO
                      (cada trabajo tiene su propio chat: es el de su cotización)
                  ───────────────────────────────────────────────────────────── */}
                  {selectedJob.is_accepted && activeModalTab === 'chat' && (() => {
                    const fechaCita = selectedJob.scheduled_at
                      ? new Date(selectedJob.scheduled_at).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : null;

                    return (
                      <div className="jm-grid jm-grid-chat">
                        {/* ── Columna izquierda: de qué trabajo se habla ── */}
                        <div className="jm-col">
                          <button type="button" className="jm-volver" onClick={() => setActiveModalTab('detalle')}>
                            <ChevronLeft size={16} strokeWidth={2.6} /> Volver a coordinación
                          </button>

                          <section className="jm-card">
                            <div className="jm-card-head">
                              <span className="tb-actions-icon orange"><Wrench size={16} strokeWidth={2.4} /></span>
                              <div className="jm-card-head-txt">
                                <span className="jm-kicker">Folio #{selectedJob.id}</span>
                                <h3 className="jm-titulo jm-titulo-sm">{selectedJob.titulo}</h3>
                              </div>
                            </div>
                            <div className="jm-direccion jm-direccion-sm">
                              <MapPin size={14} />
                              <div><strong>{selectedJob.full_address || selectedJob.calle || selectedJob.zona}</strong></div>
                            </div>
                            <div className="jm-pills">
                              <span className="jm-pill"><DollarSign size={13} /> ${parseFloat(selectedJob.agreed_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </section>

                          <section className={`jm-card jm-horario ${isRescheduleRequested ? 'cambio' : isScheduleConfirmed ? 'ok' : isPendingClientConfirm ? 'espera' : 'sin'}`}>
                            <div className="jm-seccion-titulo"><span>Hora de la visita</span></div>
                            {isRescheduleRequested ? (
                              <div className="jm-horario-aviso cambio">
                                <AlertCircle size={16} />
                                <div>
                                  <strong>Pidió otro horario</strong>
                                  {horarioSel.nota && <span>“{horarioSel.nota}”</span>}
                                </div>
                              </div>
                            ) : fechaCita ? (
                              <div className="jm-horario-fecha">
                                <Calendar size={16} />
                                <strong>{fechaCita}</strong>
                              </div>
                            ) : (
                              <p className="jm-texto-suave">Aún sin agendar.</p>
                            )}
                            <button type="button" className="jm-btn-suave" onClick={() => setActiveModalTab('detalle')}>
                              <Calendar size={14} /> {isRescheduleRequested ? 'Proponer nuevo horario' : (fechaCita ? 'Cambiar horario' : 'Agendar visita')}
                            </button>
                          </section>

                          {selectedJob.client_phone && (
                            <a
                              className="jm-btn-suave verde jm-btn-ancho"
                              href={`https://wa.me/52${selectedJob.client_phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle size={14} /> Escribir por WhatsApp
                            </a>
                          )}
                        </div>

                        {/* ── Columna derecha: el chat ── */}
                        <section className="jm-card jm-chat">
                          <div className="jm-chat-head">
                            <span className="tb-actions-icon orange"><MessageCircle size={16} strokeWidth={2.4} /></span>
                            <div className="jm-chat-head-txt">
                              <strong>Chat con {selectedJob.client_name || 'el cliente'}</strong>
                              <span>Solo de este trabajo · folio #{selectedJob.id}</span>
                            </div>
                            <span className="jm-chat-linea"><span /> En línea</span>
                          </div>

                          <div className="jm-chat-mensajes">
                            {chatMessages.length === 0 ? (
                              <div className="jm-chat-vacio">
                                <span className="jm-chat-vacio-icono"><MessageCircle size={24} /></span>
                                <strong>Inicia la conversación</strong>
                                <span>Avisa que vas en camino, aclara dudas o confirma el servicio.</span>
                              </div>
                            ) : (
                              chatMessages.map((msg, idx) => {
                                // Propuestas y respuestas de horario se muestran como avisos del sistema
                                if (msg.is_schedule || msg.is_schedule_response) {
                                  const tipo = msg.is_schedule ? 'propuesta' : (msg.schedule_confirmed ? 'ok' : 'cambio');
                                  const texto = msg.is_schedule
                                    ? `Propusiste visita: ${new Date(msg.scheduled_at || selectedJob.scheduled_at).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                    : (msg.schedule_confirmed
                                      ? `${msg.sender_name || 'El cliente'} confirmó el horario`
                                      : `${msg.sender_name || 'El cliente'} pidió otro horario`);
                                  const nota = msg.is_schedule_response && !msg.schedule_confirmed
                                    ? (msg.note || String(msg.message || '').replace(/^.*?horario de visita:\s*/i, '').replace(/^"|"$/g, ''))
                                    : '';
                                  return (
                                    <div key={idx} className={`jm-msg-sistema ${tipo}`}>
                                      {tipo === 'ok' ? <CheckCircle2 size={13} /> : tipo === 'cambio' ? <AlertCircle size={13} /> : <Calendar size={13} />}
                                      <span>
                                        {texto}
                                        {nota && <em> · “{nota}”</em>}
                                      </span>
                                      <small>{formatTime(msg.created_at)}</small>
                                    </div>
                                  );
                                }
                                const isMe = Number(msg.sender_id) === Number(authUser?.id) || msg.sender_role === 'Técnico de la Red' || msg.sender_role === 'Técnico';
                                return (
                                  <div key={idx} className={`jm-msg ${isMe ? 'mio' : 'suyo'}`}>
                                    <div className="jm-msg-burbuja">{msg.message}</div>
                                    <span className="jm-msg-meta">
                                      {isMe ? 'Tú' : (msg.sender_name || 'Cliente')} · {formatTime(msg.created_at)}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                            <div ref={chatEndRef} />
                          </div>

                          <form onSubmit={handleSendEmbeddedChat} className="jm-chat-input">
                            <input
                              type="text"
                              placeholder="Escribe un mensaje al cliente…"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              disabled={sendingChat}
                            />
                            <button
                              type="submit"
                              className="jm-chat-enviar"
                              disabled={sendingChat || !chatInput.trim()}
                              title="Enviar mensaje"
                              aria-label="Enviar mensaje"
                            >
                              <Send size={17} strokeWidth={2.4} />
                            </button>
                          </form>
                        </section>
                      </div>
                    );
                  })()}

                  {/* ─────────────────────────────────────────────────────────────
                      CASO C: TRABAJO DISPONIBLE - VISTA DE DETALLE & COTIZACIÓN
                  ───────────────────────────────────────────────────────────── */}
                  {!selectedJob.is_accepted && activeModalTab === 'detalle' && (() => {
                    // La descripción trae "[URGENCIA]: ⚡ Atención Urgente…": se muestra como etiqueta
                    const textoDesc = selectedJob.descripcion || '';
                    const corte = textoDesc.indexOf('[URGENCIA]');
                    // Sin las notas de urgencia y fecha deseada: van como etiquetas
                    const descLimpia = descripcionTarjeta(textoDesc).replace(/[\s\-–:]+$/, '').trim();
                    const esUrgente = selectedJob.is_urgent || corte !== -1;
                    const deseada = !esUrgente && fechaDeseada(textoDesc);
                    const fotos = selectedJob.problem_photos || [];
                    const cotizacion = selectedJob.myQuote;
                    const tienePrecio = cotizacion && cotizacion.price > 0;
                    const estadoCotizacion = cotizacion?.status === 'rejected' ? 'rechazada' : (cotizacion?.status === 'accepted' ? 'aceptada' : '');

                    return (
                      <div className="jm-grid">
                        {/* ── Columna izquierda: el trabajo ── */}
                        <div className="jm-col">
                          <section className="jm-card">
                            <div className="jm-card-head">
                              <span className="tb-actions-icon orange"><Wrench size={16} strokeWidth={2.4} /></span>
                              <div className="jm-card-head-txt">
                                <span className="jm-kicker">Trabajo solicitado</span>
                                <h3 className="jm-titulo">{selectedJob.titulo}</h3>
                              </div>
                              {esUrgente && <span className="jm-badge-urgente"><Zap size={12} strokeWidth={2.6} /> Urgente</span>}
                              {deseada && <span className="jm-badge-deseada" title="Fecha estimada en que el cliente necesita el trabajo"><Calendar size={12} strokeWidth={2.6} /> Lo necesita: {deseada.texto}</span>}
                            </div>

                            {descLimpia && <p className="jm-desc">{descLimpia}</p>}

                            <div className="jm-pills">
                              <span className="jm-pill"><Clock size={13} /> Publicado {selectedJob.fecha}</span>
                              <span className="jm-pill"><Users size={13} /> {selectedJob.cotizaciones} {Number(selectedJob.cotizaciones) === 1 ? 'oferta enviada' : 'ofertas enviadas'}</span>
                            </div>
                            <div className="jm-pills jm-cliente-calif">
                              <span className="jm-kicker">Cliente</span>
                              <Calificacion
                                estrellas={selectedJob.calificacion_cliente?.trato}
                                relojes={selectedJob.calificacion_cliente?.pago}
                                total={selectedJob.calificacion_cliente?.total || 0}
                                etiquetas={{ estrellas: 'Trato', relojes: 'Pago' }}
                                textoNuevo="Cliente nuevo, sin calificaciones"
                              />
                            </div>
                          </section>

                          {/* Fotos de la falla */}
                          {fotos.length > 0 && activePhoto ? (
                            <section className="jm-card jm-fotos">
                              <div className="jm-seccion-titulo">
                                <span>Fotos de la falla</span>
                                {fotos.length > 1 && <span className="jm-contador">{fotos.indexOf(activePhoto) + 1} de {fotos.length}</span>}
                              </div>
                              <button
                                type="button"
                                className="jm-foto-principal"
                                onClick={() => setIsPhotoZoomed(true)}
                                title="Ampliar foto"
                              >
                                <img src={activePhoto} alt="Fotografía de la falla" />
                                <span className="jm-foto-zoom"><Maximize2 size={13} /> Ampliar</span>
                              </button>
                              {fotos.length > 1 && (
                                <div className="jm-miniaturas">
                                  {fotos.map((f, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      className={`jm-miniatura ${activePhoto === f ? 'activa' : ''}`}
                                      onClick={() => setActivePhoto(f)}
                                      title={`Ver foto ${idx + 1}`}
                                    >
                                      <img src={f} alt={`Foto ${idx + 1}`} />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </section>
                          ) : (
                            <section className="jm-card jm-sin-fotos">
                              <span className="jm-sin-fotos-icono"><ImageIcon size={22} /></span>
                              <div>
                                <strong>Sin fotos de la falla</strong>
                                <span>El cliente no adjuntó fotografías.</span>
                              </div>
                            </section>
                          )}
                        </div>

                        {/* ── Columna derecha: dónde es y tu cotización ── */}
                        <div className="jm-col">
                          <section className="jm-card jm-zona">
                            <span className="tb-actions-icon blue"><MapPin size={16} strokeWidth={2.4} /></span>
                            <div className="jm-zona-txt">
                              <span className="jm-kicker">Zona aproximada</span>
                              <strong className="jm-zona-nombre">{selectedJob.zona}</strong>
                              <span className="jm-nota"><Lock size={12} /> Verás la dirección exacta, la fachada y el contacto cuando el cliente acepte tu cotización.</span>
                            </div>
                          </section>

                          <section className={`jm-card jm-cotizacion ${estadoCotizacion}`}>
                            <div className="jm-seccion-titulo">
                              <span>Tu cotización</span>
                              {cotizacion && (
                                <span className={`mercado-job-badge ${cotizacion.status === 'rejected' ? 'badge-rejected' : (cotizacion.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`}>
                                  {getStatusLabel(cotizacion.status)}
                                </span>
                              )}
                            </div>

                            {tienePrecio ? (
                              <>
                                <div className="jm-precio">
                                  ${parseFloat(cotizacion.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  <small>MXN</small>
                                </div>
                                {cotizacion.message && <p className="jm-mensaje">“{cotizacion.message}”</p>}
                              </>
                            ) : (
                              <div className="jm-vacio">
                                <span className="jm-vacio-icono"><DollarSign size={20} /></span>
                                <p>Todavía no envías una cotización. Propón tu precio para que el cliente pueda elegirte.</p>
                              </div>
                            )}

                            <button type="button" className="jm-btn-principal" onClick={() => setQuoteStep(2)}>
                              <DollarSign size={17} strokeWidth={2.4} />
                              {tienePrecio ? 'Modificar cotización' : 'Enviar cotización'}
                            </button>
                          </section>

                          {lastClientMsg && (
                            <div className="jm-aviso-mensaje">
                              <span className="tb-actions-icon green"><MessageCircle size={15} strokeWidth={2.4} /></span>
                              <div>
                                <strong>El cliente te escribió</strong>
                                <span>“{lastClientMsg.message}”</span>
                              </div>
                            </div>
                          )}

                          <button type="button" className="jm-card jm-chat-btn" onClick={() => setActiveModalTab('chat')}>
                            <span className="tb-actions-icon orange"><MessageCircle size={16} strokeWidth={2.4} /></span>
                            <span className="jm-chat-txt">
                              <strong>Chat con el cliente</strong>
                              <span>Resuelve dudas antes de cotizar</span>
                            </span>
                            {chatMessages.length > 0 && <span className="jm-chat-total">{chatMessages.length}</span>}
                            <ChevronRight size={18} className="jm-chat-flecha" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ─────────────────────────────────────────────────────────────
                      CASO D: TRABAJO DISPONIBLE - VISTA DE CHAT DIRECTO
                  ───────────────────────────────────────────────────────────── */}
                  {!selectedJob.is_accepted && activeModalTab === 'chat' && (() => {
                    const cotizacion = selectedJob.myQuote;
                    const tienePrecio = cotizacion && cotizacion.price > 0;
                    const esUrgente = selectedJob.is_urgent || (selectedJob.descripcion || '').includes('[URGENCIA]');
                    const deseada = !esUrgente && fechaDeseada(selectedJob.descripcion);

                    return (
                      <div className="jm-grid jm-grid-chat">
                        {/* ── Columna izquierda: de qué trabajo se habla ── */}
                        <div className="jm-col">
                          <button type="button" className="jm-volver" onClick={() => setActiveModalTab('detalle')}>
                            <ChevronLeft size={16} strokeWidth={2.6} /> Volver al detalle
                          </button>

                          <section className="jm-card">
                            <div className="jm-card-head">
                              <span className="tb-actions-icon orange"><Wrench size={16} strokeWidth={2.4} /></span>
                              <div className="jm-card-head-txt">
                                <span className="jm-kicker">Trabajo</span>
                                <h3 className="jm-titulo jm-titulo-sm">{selectedJob.titulo}</h3>
                              </div>
                            </div>
                            <div className="jm-pills">
                              <span className="jm-pill"><MapPin size={13} /> {selectedJob.zona}</span>
                              {esUrgente && <span className="jm-badge-urgente"><Zap size={12} strokeWidth={2.6} /> Urgente</span>}
                              {deseada && <span className="jm-badge-deseada" title="Fecha estimada en que el cliente necesita el trabajo"><Calendar size={12} strokeWidth={2.6} /> Lo necesita: {deseada.texto}</span>}
                            </div>
                          </section>

                          <section className="jm-card">
                            <div className="jm-seccion-titulo">
                              <span>Tu cotización</span>
                              {cotizacion && (
                                <span className={`mercado-job-badge ${cotizacion.status === 'rejected' ? 'badge-rejected' : (cotizacion.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`}>
                                  {getStatusLabel(cotizacion.status)}
                                </span>
                              )}
                            </div>
                            {tienePrecio ? (
                              <div className="jm-precio jm-precio-sm">
                                ${parseFloat(cotizacion.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                <small>MXN</small>
                              </div>
                            ) : (
                              <p className="jm-texto-suave">Aún no envías tu precio.</p>
                            )}
                            <button type="button" className="jm-btn-principal" onClick={() => setQuoteStep(2)}>
                              <DollarSign size={16} strokeWidth={2.4} />
                              {tienePrecio ? 'Modificar cotización' : 'Enviar cotización'}
                            </button>
                          </section>
                        </div>

                        {/* ── Columna derecha: el chat ── */}
                        <section className="jm-card jm-chat">
                          <div className="jm-chat-head">
                            <span className="tb-actions-icon orange"><MessageCircle size={16} strokeWidth={2.4} /></span>
                            <div className="jm-chat-head-txt">
                              <strong>Chat con el cliente</strong>
                              <span>Aclara dudas antes de enviar tu precio</span>
                            </div>
                            <span className="jm-chat-linea"><span /> En línea</span>
                          </div>

                          {lastClientMsg && (
                            <div className="jm-aviso-mensaje jm-aviso-chat">
                              <span className="tb-actions-icon green"><Bell size={15} strokeWidth={2.4} /></span>
                              <div>
                                <strong>Mensaje nuevo del cliente</strong>
                                <span>“{lastClientMsg.message}”</span>
                              </div>
                            </div>
                          )}

                          <div className="jm-chat-mensajes">
                            {chatMessages.length === 0 ? (
                              <div className="jm-chat-vacio">
                                <span className="jm-chat-vacio-icono"><MessageCircle size={24} /></span>
                                <strong>Inicia la conversación</strong>
                                <span>Pregunta lo que necesites sobre la falla o coordina tu cotización.</span>
                              </div>
                            ) : (
                              chatMessages.map((msg, idx) => {
                                const isMe = Number(msg.sender_id) === Number(authUser?.id) || msg.sender_role === 'Técnico de la Red' || msg.sender_role === 'Técnico';
                                return (
                                  <div key={idx} className={`jm-msg ${isMe ? 'mio' : 'suyo'}`}>
                                    <div className="jm-msg-burbuja">{msg.message}</div>
                                    <span className="jm-msg-meta">
                                      {isMe ? 'Tú' : (msg.sender_name || 'Cliente')} · {formatTime(msg.created_at)}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                            <div ref={chatEndRef} />
                          </div>

                          <form onSubmit={handleSendEmbeddedChat} className="jm-chat-input">
                            <input
                              type="text"
                              placeholder="Escribe un mensaje al cliente…"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              disabled={sendingChat}
                            />
                            <button
                              type="submit"
                              className="jm-chat-enviar"
                              disabled={sendingChat || !chatInput.trim()}
                              title="Enviar mensaje"
                              aria-label="Enviar mensaje"
                            >
                              <Send size={17} strokeWidth={2.4} />
                            </button>
                          </form>
                        </section>
                      </div>
                    );
                  })()}
                </div>

                <div className="mercado-premium-footer" style={{ justifyContent: 'space-between' }}>
                  <button className="mercado-btn-cancel" onClick={() => setShowQuoteModal(false)}>Cerrar Ventana</button>
                  {selectedJob.is_accepted && (
                    <div className="jm-pie-nota">Coordina la hora de visita y confírmala con el cliente por WhatsApp o chat.</div>
                  )}
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════
                PASO 2: FORMULARIO DE COTIZACIÓN (CON FOTOS Y DETALLE)
            ══════════════════════════════════════════════════ */}
            {quoteStep === 2 && (() => {
              const yaCotizado = selectedJob.myQuote && selectedJob.myQuote.price > 0;
              const fotos = (selectedJob.problem_photos && selectedJob.problem_photos.length > 0)
                ? selectedJob.problem_photos
                : (selectedJob.fotos || []);
              const textoDesc = selectedJob.descripcion || '';
              const corte = textoDesc.indexOf('[URGENCIA]');
              // Sin las notas de urgencia y fecha deseada: van como etiquetas
              const descLimpia = descripcionTarjeta(textoDesc).replace(/[\s\-–:]+$/, '').trim();
              const esUrgente = selectedJob.is_urgent || corte !== -1;
              const deseada = !esUrgente && fechaDeseada(textoDesc);
              // Solo números y un punto decimal (máx. 2 decimales): sin negativos ni cambios con la rueda del mouse
              const limpiarPrecio = (valor) => {
                const soloNumeros = valor.replace(/[^\d.]/g, '');
                const [entero, ...resto] = soloNumeros.split('.');
                return resto.length ? `${entero}.${resto.join('').slice(0, 2)}` : entero;
              };

              return (
                <>
                  <div className="mercado-premium-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="tb-actions-icon orange"><DollarSign size={17} strokeWidth={2.4} /></span>
                      <h2 style={{ margin: 0 }}>{yaCotizado ? 'Modificar cotización' : 'Enviar cotización'}</h2>
                    </div>
                    <button type="button" className="jm-cerrar" onClick={() => setShowQuoteModal(false)} title="Cerrar" aria-label="Cerrar">
                      <X size={18} strokeWidth={2.6} />
                    </button>
                  </div>

                  <div className="mercado-premium-body">
                    <div className="jm-grid jm-grid-cotizar">
                      {/* ── Izquierda: el problema ── */}
                      <div className="jm-col">
                        {fotos.length > 0 && activePhoto ? (
                          <section className="jm-card jm-fotos">
                            <div className="jm-seccion-titulo">
                              <span>Fotos de la falla</span>
                              {fotos.length > 1 && <span className="jm-contador">{Math.max(fotos.indexOf(activePhoto), 0) + 1} de {fotos.length}</span>}
                            </div>
                            <button type="button" className="jm-foto-principal" onClick={() => setIsPhotoZoomed(true)} title="Ampliar foto">
                              <img src={activePhoto} alt="Fotografía de la falla" />
                              <span className="jm-foto-zoom"><Maximize2 size={13} /> Ampliar</span>
                            </button>
                            {fotos.length > 1 && (
                              <div className="jm-miniaturas">
                                {fotos.map((f, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    className={`jm-miniatura ${activePhoto === f ? 'activa' : ''}`}
                                    onClick={() => setActivePhoto(f)}
                                    title={`Ver foto ${idx + 1}`}
                                  >
                                    <img src={f} alt={`Foto ${idx + 1}`} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </section>
                        ) : (
                          <section className="jm-card jm-sin-fotos">
                            <span className="jm-sin-fotos-icono"><ImageIcon size={22} /></span>
                            <div>
                              <strong>Sin fotos de la falla</strong>
                              <span>El cliente no adjuntó fotografías.</span>
                            </div>
                          </section>
                        )}

                        <section className="jm-card">
                          <div className="jm-card-head">
                            <span className="tb-actions-icon orange"><Wrench size={16} strokeWidth={2.4} /></span>
                            <div className="jm-card-head-txt">
                              <span className="jm-kicker">Trabajo solicitado</span>
                              <h3 className="jm-titulo jm-titulo-sm">{selectedJob.titulo}</h3>
                            </div>
                            {esUrgente && <span className="jm-badge-urgente"><Zap size={12} strokeWidth={2.6} /> Urgente</span>}
                              {deseada && <span className="jm-badge-deseada" title="Fecha estimada en que el cliente necesita el trabajo"><Calendar size={12} strokeWidth={2.6} /> Lo necesita: {deseada.texto}</span>}
                          </div>
                          {descLimpia && <p className="jm-desc">{descLimpia}</p>}
                          <div className="jm-pills">
                            <span className="jm-pill"><MapPin size={13} /> {selectedJob.zona}</span>
                            <span className="jm-pill"><Clock size={13} /> {selectedJob.fecha}</span>
                          </div>
                        </section>
                      </div>

                      {/* ── Derecha: la propuesta ── */}
                      <section className="jm-card jm-form">
                        <span className="jm-kicker">Tu propuesta</span>
                        <h3 className="jm-titulo">¿Cuánto cobrarás por este trabajo?</h3>
                        <p className="jm-texto-suave">El cliente verá tu precio y tu mensaje para decidir con quién trabajar.</p>

                        {selectedJob.myQuote && selectedJob.myQuote.status === 'rejected' && (
                          <div className="jm-rechazo">
                            <span className="jm-rechazo-icono"><AlertTriangle size={16} strokeWidth={2.4} /></span>
                            <div>
                              <strong>Tu oferta anterior de ${selectedJob.myQuote.price} fue rechazada</strong>
                              <span>Puedes ajustar el precio o explicarle al cliente qué incluye.</span>
                            </div>
                          </div>
                        )}

                        <label className="jm-label" htmlFor="jm-precio-input">Precio del servicio</label>
                        <div className="jm-precio-campo">
                          <span className="jm-precio-signo">$</span>
                          <input
                            id="jm-precio-input"
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0.00"
                            value={quotePrice}
                            onChange={(e) => setQuotePrice(limpiarPrecio(e.target.value))}
                            autoFocus
                          />
                          <span className="jm-precio-moneda">MXN</span>
                        </div>

                        <label className="jm-label" htmlFor="jm-mensaje-input">
                          Mensaje para el cliente <span>(opcional)</span>
                        </label>
                        <textarea
                          id="jm-mensaje-input"
                          className="jm-textarea"
                          placeholder="Ej. Hola, cuento con las herramientas y refacciones necesarias. Puedo ir hoy mismo a revisarlo."
                          value={quoteMessage}
                          onChange={(e) => setQuoteMessage(e.target.value)}
                          rows={4}
                        />
                      </section>
                    </div>
                  </div>

                  <div className="mercado-premium-footer">
                    <button type="button" className="jm-volver" onClick={() => setQuoteStep(1)}>
                      <ChevronLeft size={16} strokeWidth={2.6} /> Volver al detalle
                    </button>
                    <button type="button" className="jm-btn-principal jm-btn-enviar" onClick={handleEnviarCotizacion}>
                      <Send size={16} strokeWidth={2.4} />
                      {yaCotizado ? 'Actualizar oferta' : 'Enviar cotización'}
                    </button>
                  </div>
                </>
              );
            })()}

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

      {/* ─── MODAL PROGRAMAR SEGUNDA VISITA (TABLERO) ─── */}
      {showSecondVisitModal && (
        <div className="mercado-second-visit-overlay" onClick={() => setShowSecondVisitModal(false)}>
          <div className="mercado-second-visit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mercado-second-visit-header">
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#f26522" /> Programar Segunda Visita
              </h3>
              <button
                type="button"
                onClick={() => setShowSecondVisitModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.4rem' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveSecondVisit}>
              <div className="mercado-second-visit-body">
                <div className="mercado-second-visit-field">
                  <label className="mercado-second-visit-label">Fecha y Hora Sugerida</label>
                  <CampoFechaHora
                    type="datetime-local"
                    className="mercado-second-visit-input"
                    value={secondVisitDate}
                    onChange={(e) => setSecondVisitDate(e.target.value)}
                    required
                  />
                </div>

                <div className="mercado-second-visit-field">
                  <label className="mercado-second-visit-label">Motivo de la 2da Visita</label>
                  <textarea
                    rows={4}
                    className="mercado-second-visit-textarea"
                    placeholder="Ej. Se requiere comprar refacción específica, secado de material o validación posterior..."
                    value={secondVisitReason}
                    onChange={(e) => setSecondVisitReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="mercado-second-visit-footer">
                <button
                  type="button"
                  className="mercado-second-visit-btn-cancel"
                  onClick={() => setShowSecondVisitModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="mercado-second-visit-btn-submit"
                  disabled={submittingSecondVisit}
                >
                  {submittingSecondVisit ? 'Guardando...' : 'Confirmar 2da Visita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL PROGRAMAR / EDITAR HORARIO DE VISITA (TABLERO) ─── */}
      {showBoardScheduleModal && selectedBoardJob && (
        <div className="mercado-schedule-modal-overlay" onClick={() => setShowBoardScheduleModal(false)}>
          <div className="mercado-schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mercado-schedule-modal-header">
              <h3>
                <Calendar size={18} color="#f26522" />
                Programar Horario de Visita
              </h3>
              <button
                type="button"
                className="mercado-modal-close-btn"
                onClick={() => setShowBoardScheduleModal(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBoardSchedule}>
              <div className="mercado-schedule-modal-body">
                <div style={{ background: 'rgba(242, 101, 34, 0.08)', border: '1px solid rgba(242, 101, 34, 0.25)', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#f26522', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Folio #{selectedBoardJob.id} - {selectedBoardJob.property?.property_code || 'Inmueble'}
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                    {selectedBoardJob.client_name || selectedBoardJob.cliente || 'Cliente de la Red'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    📍 {selectedBoardJob.full_address || selectedBoardJob.calle || selectedBoardJob.zona || 'Mérida'}
                  </div>
                </div>

                {/* Fecha que pidió el cliente al publicar, para que el técnico proponga algo cercano */}
                {(() => {
                  const desc = selectedBoardJob.descripcion || '';
                  const urgente = selectedBoardJob.is_urgent || desc.includes('[URGENCIA]');
                  const deseada = !urgente && fechaDeseada(desc);
                  if (!urgente && !deseada) return null;
                  return (
                    <div className={`mercado-schedule-deseada ${urgente ? 'urgente' : ''} ${deseada?.vencida ? 'vencida' : ''}`}>
                      {urgente ? <Zap size={16} /> : <Calendar size={16} />}
                      <div>
                        <small>{urgente ? 'El cliente lo pidió' : 'El cliente lo necesita'}</small>
                        <strong>
                          {urgente
                            ? 'Urgente · Hoy mismo'
                            : `${deseada.texto} (${new Date(`${deseada.fecha}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })})`}
                        </strong>
                        {deseada?.vencida && <span>Esa fecha ya pasó; acuérdala con el cliente por chat.</span>}
                      </div>
                    </div>
                  );
                })()}

                <div className="mercado-schedule-form-group">
                  <label>
                    Fecha y Hora de la Visita *
                  </label>
                  <CampoFechaHora
                    type="datetime-local"
                    className="mercado-schedule-datetime-input"
                    value={boardScheduleDate}
                    onChange={(e) => setBoardScheduleDate(e.target.value)}
                    required
                  />
                </div>

                <div className="mercado-schedule-form-group">
                  <label>
                    Notas o Instrucciones para el Cliente (Opcional)
                  </label>
                  <textarea
                    placeholder="Ej. Llegaré con equipo de diagnóstico y herramientas necesarias..."
                    className="mercado-schedule-textarea"
                    value={boardScheduleNotes}
                    onChange={(e) => setBoardScheduleNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="mercado-schedule-modal-footer">
                <button
                  type="button"
                  className="mercado-schedule-btn-cancel"
                  onClick={() => setShowBoardScheduleModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="mercado-schedule-btn-save"
                  disabled={submittingBoardSchedule}
                >
                  {submittingBoardSchedule ? (
                    'Guardando...'
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Confirmar Horario
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL ZOOM FOTO DE EVIDENCIA ─── */}
      {/* Foto ampliada: va en el body para quedar encima del encabezado (z-index 999999) */}
      {zoomedPhotoUrl && createPortal(
        <div className="rt-foto-zoom" onClick={() => setZoomedPhotoUrl(null)}>
          <div className="rt-foto-zoom-marco" onClick={(e) => e.stopPropagation()}>
            <img src={zoomedPhotoUrl} alt="Evidencia ampliada" className="rt-foto-zoom-img" />
            <button
              type="button"
              className="rt-foto-zoom-cerrar"
              onClick={() => setZoomedPhotoUrl(null)}
              title="Cerrar imagen"
              aria-label="Cerrar imagen"
            >
              <X size={20} strokeWidth={2.6} />
            </button>
          </div>
        </div>,
        document.body
      )}
      {/* ─── MODAL VISUALIZADOR DE REPORTE DETALLADO PDF (ESTILO AGENTE) ─── */}
      {showPdfReportModal && selectedBoardJob && (
        <ModalReportePdfTecnico
          isOpen={showPdfReportModal}
          onClose={() => setShowPdfReportModal(false)}
          job={selectedBoardJob}
          boardJobReports={boardJobReports}
          boardPhotos={boardPhotos[selectedBoardJob.id]}
        />
      )}
    </div>
  );
};

export default MercadoTrabajos;
