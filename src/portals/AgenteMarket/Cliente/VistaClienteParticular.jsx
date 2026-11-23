import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { esTecnicoRed } from '../../../utils/entorno';
import ModalCompraEspacios from '../../../components/Shared/ModalCompraEspacios';
import { sinVentasDigitales, sinPrecio } from '../../../plataforma';
import ModalCalendarioCliente from './ModalCalendarioCliente';
import AvisoCancelacionTecnico from './AvisoCancelacionTecnico';
import AvisoCalificarTecnico from './AvisoCalificarTecnico';
import AvisoCambioHorario from './AvisoCambioHorario';
import ModalRegistroInmueble from './ModalRegistroInmueble';
import ModalEditarPropiedadCliente from './ModalEditarPropiedadCliente';
import ModalServicioAutonomo from '../Admin/ModalServicioAutonomo';
import NotificationBell from '../../../components/Shared/NotificationBell';
import Header from '../../../components/Shared/Header';
import { PildoraTrabajosEnCurso } from '../../../components/Shared/TrabajosEnCurso';
import { API, authHeaders, etiquetaEstado } from '../../AgenteSolutions/Admin/Expediente/flujoTrabajo';
import '../../../styles/AgenteMarket/Cliente/VistaClienteParticular.css';

import {
  Home,
  Users,
  FileText,
  Receipt,
  Wrench,
  Globe,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Navigation,
  AlertCircle,
  ClipboardList,
  Plus,
  LogOut,
  Building2,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  Clock,
  Lock,
  Edit3,
  Bell,
  Shield,
  Hourglass,
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';

import defaultPropImg from '../../../assets/propiedad_ejemplo.jpg';
import fondoSinPropiedades from '../../../assets/geometric-poly-bg.png';
import defaultLogo from '../../../assets/Logo4.png';

// Live Countdown Timer for Floating Subscription Card
const SubscriptionCountdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;
    const calculateTime = () => {
      const end = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('¡PRUEBA VENCIDA!');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${days}d : ${hours < 10 ? '0' + hours : hours}h : ${mins < 10 ? '0' + mins : mins}m : ${secs < 10 ? '0' + secs : secs}s`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate) {
    return (
      <span className="vcp-plan-timer-pill">
        <span className="vcp-timer-dot" />
        <Hourglass size={13} className="vcp-plan-ico" /> 180 días restantes
      </span>
    );
  }

  return (
    <span className="vcp-plan-timer-pill">
      <span className="vcp-timer-dot" />
      <Hourglass size={13} className="vcp-plan-ico" /> {timeLeft || 'Calculando...'}
    </span>
  );
};

const VistaClienteParticular = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Estados de datos
  const [propiedades, setPropiedades] = useState([]);
  const [selectedPropId, setSelectedPropId] = useState(null);
  const [subInfo, setSubInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recargaTableros, setRecargaTableros] = useState(0);
  const [appLogo, setAppLogo] = useState(defaultLogo);

  // Modales y Dropdowns
  const [showModalCompra, setShowModalCompra] = useState(false);
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [showModalRegistroPropiedad, setShowModalRegistroPropiedad] = useState(false);
  const [showModalEditarPropiedad, setShowModalEditarPropiedad] = useState(false);
  const [showModalSolicitarServicio, setShowModalSolicitarServicio] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false); // Oculto por defecto
  const [isMobilePropProfileOpen, setIsMobilePropProfileOpen] = useState(false); // Pestaña colapsable en móvil
  const [cerrandoPerfil, setCerrandoPerfil] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false); // Datos ocultos por defecto; la flecha los muestra

  // Al guardar se deja terminar la animación antes de desmontar el panel
  const alternarPerfilMovil = () => {
    if (cerrandoPerfil) return;
    if (!isMobilePropProfileOpen) {
      setIsMobilePropProfileOpen(true);
      return;
    }
    setCerrandoPerfil(true);
    setTimeout(() => {
      setIsMobilePropProfileOpen(false);
      setCerrandoPerfil(false);
    }, 340);
  };

  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer click o tap fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target) &&
        !e.target.closest?.('.vcp-profile-dropdown')
      ) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Cargar logo de personalización
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`)
      .then(res => {
        if (res.data?.logo_url) {
          setAppLogo(res.data.logo_url);
        }
      })
      .catch(() => {});
  }, []);

  // Cargar propiedades y estado de suscripción
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const [propsRes, subRes] = await Promise.allSettled([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades`, authHeader),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/tenant/subscription-status`, authHeader)
      ]);

      if (propsRes.status === 'fulfilled' && propsRes.value.data) {
        const rawProps = Array.isArray(propsRes.value.data) 
          ? propsRes.value.data 
          : (propsRes.value.data.data || []);
        
        setPropiedades(rawProps);
      }

      if (subRes.status === 'fulfilled' && subRes.value.data?.success) {
        setSubInfo(subRes.value.data);
      }
    } catch (err) {
      console.error("Error al cargar datos de cliente particular:", err);
    } finally {
      setLoading(false);
      setRecargaTableros(n => n + 1);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePropertyCreated = async (newProp) => {
    await fetchData();
    if (newProp && newProp.id) {
      setSelectedPropId(newProp.id);
    }
  };

  const handlePropertyUpdated = async (updatedProp) => {
    await fetchData();
    if (updatedProp && updatedProp.id) {
      setSelectedPropId(updatedProp.id);
    }
  };

  // Propiedad activa seleccionada
  const userFullName = useMemo(() => {
    const parts = [user?.first_name, user?.last_name].filter(Boolean);
    if (parts.length > 0) return parts.join(' ').toUpperCase();
    if (user?.name) return user.name.toUpperCase();
    if (user?.nombre) return user.nombre.toUpperCase();
    return 'CLIENTE PARTICULAR';
  }, [user]);

  const userRoleLabel = useMemo(() => {
    const id = Number(user?.role_id);
    switch (id) {
      case 0: return 'Usuario Root';
      case 1: return 'Administrador';
      case 2: return 'Técnico';
      case 3: return 'Cliente Particular';
      case 4: return 'Negocio';
      case 5: return 'Autónomo';
      case 6: return 'Contratista';
      case 7: return 'Admin Propiedades';
      case 8: return 'Técnico del Mercado';
      default: return 'Cliente Particular';
    }
  }, [user]);

  const userAvatar = user?.profile_picture || user?.avatar_url || user?.foto || null;
  const userInitial = user?.first_name 
    ? user.first_name.charAt(0).toUpperCase() 
    : (user?.name ? user.name.charAt(0).toUpperCase() : (user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'P'));

  // Orden personalizado de propiedades (guardado antes con el carrusel; se respeta)
  const [customOrder, setCustomOrder] = useState(() => {
    try {
      const key = `agente_props_order_${user?.id || user?.email || 'client'}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const hasSelectedInitRef = useRef(false);

  // Cargar orden personalizado de propiedades desde localStorage cuando el usuario esté listo
  useEffect(() => {
    try {
      const key = `agente_props_order_${user?.id || user?.email || 'client'}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomOrder(parsed);
      }
    } catch (e) {
      console.error("Error al cargar orden de propiedades:", e);
    }
  }, [user?.id, user?.email]);

  // Propiedades filtradas para el usuario actual y ordenadas según el orden personalizado
  const userPropiedades = useMemo(() => {
    if (!propiedades || propiedades.length === 0) return [];
    
    // Si las propiedades vienen con asociación de usuario / tenant, podemos priorizarlas
    const forThisUser = propiedades.filter(p => 
      (user?.id && (p.user_id === user.id || p.usuario_id === user.id || p.cliente_id === user.id || p.cliente?.id === user.id)) ||
      (user?.tenant_id && p.tenant_id === user.tenant_id)
    );

    const baseList = forThisUser.length > 0 ? forThisUser : propiedades;

    if (!customOrder || customOrder.length === 0) return baseList;

    return [...baseList].sort((a, b) => {
      const idxA = customOrder.indexOf(a.id);
      const idxB = customOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [propiedades, user, customOrder]);

  // Sin propiedades registradas: la vista se muestra vacía (sin datos de ejemplo) e invita a registrar
  const hasProperties = userPropiedades.length > 0;

  const activeProperty = useMemo(() => {
    if (!userPropiedades || userPropiedades.length === 0) return null;
    const found = userPropiedades.find(p => p.id === selectedPropId);
    return found || userPropiedades[0];
  }, [userPropiedades, selectedPropId]);

  // ── TABLERO: datos de cada propiedad (para la propiedad activa y el global) ──
  const [tableros, setTableros] = useState({});
  const idsPropiedades = userPropiedades.map(p => p.id).join(',');

  useEffect(() => {
    if (!idsPropiedades) {
      setTableros({});
      return;
    }
    let vivo = true;
    const ids = idsPropiedades.split(',');
    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
    const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    Promise.allSettled(
      ids.map(id => axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${id}/dashboard`, authHeader))
    ).then(resultados => {
      if (!vivo) return;
      const mapa = {};
      resultados.forEach((r, i) => {
        const d = r.status === 'fulfilled' ? r.value.data : null;
        const st = d?.stats || {};
        mapa[ids[i]] = {
          stats: {
            sos: Number(st.sos || 0),
            pendientes: Number(st.pendientes || st.todo || 0),
            proceso: Number(st.proceso || st.in_progress || 0),
            listos: Number(st.listos || st.done || 0)
          },
          historial: Array.isArray(d?.historial) ? d.historial : []
        };
      });
      setTableros(mapa);
    });
    return () => {
      vivo = false;
    };
  }, [idsPropiedades, recargaTableros]);

  const statsVacios = { sos: 0, pendientes: 0, proceso: 0, listos: 0 };
  const propertyStats = tableros[String(activeProperty?.id)]?.stats || statsVacios;

  // Últimos trabajos de la propiedad activa (del expediente, con estado y fechas)
  const [expActivo, setExpActivo] = useState({ id: null, trabajos: [], cargando: false });
  useEffect(() => {
    const id = activeProperty?.id;
    if (!id) return undefined;
    let vivo = true;
    setExpActivo(e => ({ id, trabajos: e.id === id ? e.trabajos : [], cargando: true }));
    axios.get(`${API}/propiedades/${id}/expediente`, { headers: authHeaders() })
      .then(r => { if (vivo) setExpActivo({ id, trabajos: r.data?.trabajos || [], cargando: false }); })
      .catch(() => { if (vivo) setExpActivo({ id, trabajos: [], cargando: false }); });
    return () => { vivo = false; };
  }, [activeProperty?.id, recargaTableros]);

  const fechaDeTrabajo = (t) => t.updated_at || t.created_at;
  const ultimosTrabajos = [...expActivo.trabajos]
    .sort((a, b) => new Date(String(fechaDeTrabajo(b) || '').replace(' ', 'T')) - new Date(String(fechaDeTrabajo(a) || '').replace(' ', 'T')))
    .slice(0, 4);
  const fechaCorta = (v) => {
    const d = new Date(String(v || '').replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const totalDe = (st) => st.sos + st.pendientes + st.proceso + st.listos;
  const avanceDe = (st) => {
    const total = totalDe(st);
    return total > 0 ? Math.round((st.listos / total) * 100) : 0;
  };


  // Al entrar a la vista o cargar propiedades, la primera propiedad de la lista ordenada es la activa por defecto
  useEffect(() => {
    if (userPropiedades.length > 0) {
      if (!hasSelectedInitRef.current || !selectedPropId || !userPropiedades.some(p => p.id === selectedPropId)) {
        setSelectedPropId(userPropiedades[0].id);
        hasSelectedInitRef.current = true;
      }
    }
  }, [userPropiedades, selectedPropId]);

  // Handlers para Drag & Drop del carrusel (solo escritorio; en celular se usan las flechas)
  const [draggedPropId, setDraggedPropId] = useState(null);
  const [dragOverPropId, setDragOverPropId] = useState(null);

  const handleDragStart = (e, propId) => {
    setDraggedPropId(propId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(propId));
  };

  const handleDragOver = (e, propId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPropId !== propId) {
      setDragOverPropId(propId);
    }
  };

  const handleDragLeave = (e, propId) => {
    if (dragOverPropId === propId) {
      setDragOverPropId(null);
    }
  };

  const handleDrop = (e, targetPropId) => {
    e.preventDefault();
    if (!draggedPropId || draggedPropId === targetPropId) {
      setDraggedPropId(null);
      setDragOverPropId(null);
      return;
    }

    const currentIds = userPropiedades.map(p => p.id);
    const sourceIndex = currentIds.indexOf(draggedPropId);
    const targetIndex = currentIds.indexOf(targetPropId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newIds = [...currentIds];
      const [moved] = newIds.splice(sourceIndex, 1);
      newIds.splice(targetIndex, 0, moved);

      setCustomOrder(newIds);
      // La propiedad que se movió al primer lugar pasa a ser la activa de inmediato
      setSelectedPropId(newIds[0]);

      const storageKey = `agente_props_order_${user?.id || user?.email || 'client'}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(newIds));
      } catch (err) {
        console.error("Error al guardar orden en localStorage:", err);
      }
    }

    setDraggedPropId(null);
    setDragOverPropId(null);
  };

  const handleDragEnd = () => {
    setDraggedPropId(null);
    setDragOverPropId(null);
  };

  // ── Navegación entre propiedades (flechas izquierda / derecha y deslizar) ──
  const indiceActivo = Math.max(0, userPropiedades.findIndex(p => p.id === activeProperty?.id));
  const hayVariasPropiedades = userPropiedades.length > 1;

  const cambiarPropiedad = (paso) => {
    if (!hayVariasPropiedades) return;
    const total = userPropiedades.length;
    const siguiente = (indiceActivo + paso + total) % total;
    setSelectedPropId(userPropiedades[siguiente].id);
  };

  const toqueInicio = useRef(null);
  const alTocarInicio = (e) => {
    // Los gestos sobre botones, píldoras o la pestaña del perfil no cambian de propiedad
    if (e.target.closest?.('button, .vcp-mobile-prop-drawer-wrap, .vcp-pildoras-row')) {
      toqueInicio.current = null;
      return;
    }
    const t = e.touches[0];
    toqueInicio.current = { x: t.clientX, y: t.clientY };
  };
  const alTocarFin = (e) => {
    if (!toqueInicio.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - toqueInicio.current.x;
    const dy = t.clientY - toqueInicio.current.y;
    toqueInicio.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      cambiarPropiedad(dx < 0 ? 1 : -1);
    }
  };

  // ── Bajar al tablero ──
  const rootRef = useRef(null);
  const tableroRef = useRef(null);
  const [yaBajo, setYaBajo] = useState(false);
  const pieRef = useRef(null);
  // Baja hasta que el botón MENÚ quede hasta arriba (el perfil y el nombre ya no se ven)
  const irAlTablero = () => (pieRef.current || tableroRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const subirArriba = () => {
    rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // "Abajo" = la ficha ya ocupa buena parte de la pantalla (escucha cualquier contenedor que se desplace)
  useEffect(() => {
    const revisar = () => {
      const el = tableroRef.current;
      if (!el) return;
      setYaBajo(el.getBoundingClientRect().top < window.innerHeight * 0.6);
    };
    document.addEventListener('scroll', revisar, true);
    window.addEventListener('resize', revisar);
    revisar();
    return () => {
      document.removeEventListener('scroll', revisar, true);
      window.removeEventListener('resize', revisar);
    };
  }, [hasProperties]);

  // Imán (celular): si se suelta a medio camino entre el menú y la ficha,
  // se acomoda sola en la posición más cercana. Más abajo de la ficha no interviene.
  useEffect(() => {
    if (!hasProperties) return undefined;
    let espera = null;
    let tocando = false;

    const acomodar = (scroller) => {
      const pie = pieRef.current;
      if (tocando || !pie || !scroller.contains(pie) || window.innerWidth > 900) return;
      const actual = scroller.scrollTop;
      const destinoAbajo = actual + pie.getBoundingClientRect().top - 8;
      // Ya está en una de las dos posiciones, o bajó más allá de la ficha
      if (actual <= 2 || actual >= destinoAbajo - 2) return;
      scroller.scrollTo({ top: actual > destinoAbajo / 2 ? destinoAbajo : 0, behavior: 'smooth' });
    };

    let ultimoScroller = null;
    const programar = () => {
      clearTimeout(espera);
      if (ultimoScroller) espera = setTimeout(() => acomodar(ultimoScroller), 140);
    };
    const alDesplazar = (e) => {
      const scroller = e.target === document ? document.scrollingElement : e.target;
      if (!scroller || typeof scroller.scrollTo !== 'function') return;
      ultimoScroller = scroller;
      programar();
    };
    const alTocar = () => { tocando = true; clearTimeout(espera); };
    const alSoltar = () => { tocando = false; programar(); };

    document.addEventListener('scroll', alDesplazar, true);
    document.addEventListener('touchstart', alTocar, { passive: true });
    document.addEventListener('touchend', alSoltar, { passive: true });
    return () => {
      clearTimeout(espera);
      document.removeEventListener('scroll', alDesplazar, true);
      document.removeEventListener('touchstart', alTocar);
      document.removeEventListener('touchend', alSoltar);
    };
  }, [hasProperties]);


  // Helper para resolver la URL de la imagen de la propiedad (Cloudinary / DB)
  const getPropImage = (p) => {
    if (!p) return defaultPropImg;
    return (
      p.foto_url ||
      p.facade_photo_path ||
      p.facade_photo ||
      p.imagen_url ||
      p.foto_fachada ||
      p.foto ||
      p.image ||
      defaultPropImg
    );
  };

  // Imagen de fondo activa
  const heroBgImage = hasProperties ? getPropImage(activeProperty) : fondoSinPropiedades;

// Helper para extraer y normalizar coordenadas GPS de una propiedad
  const extractPropertyGps = (prop) => {
    if (!prop) return null;

  // 1. Strings con coordenadas separadas por coma
  const strCandidates = [
    prop.coordinates,
    prop.coordenadas,
    prop.ubicacion_gps,
    prop.gps,
    prop.location,
    prop.coords
  ];

  for (const str of strCandidates) {
    if (typeof str === 'string' && str.trim() !== '' && str.trim() !== 'null' && str.trim() !== 'undefined') {
      const parts = str.split(',').map(s => s.trim());
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
          return { lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
        }
      }
    }
  }

  // 2. Valores numéricos directos de latitud / longitud
  const latCandidates = [
    prop.lat,
    prop.latitude,
    prop.latitud,
    prop.area_lat
  ];
  const lngCandidates = [
    prop.lng,
    prop.longitude,
    prop.longitud,
    prop.lon,
    prop.area_lng
  ];

  for (let i = 0; i < latCandidates.length; i++) {
    const rawLat = latCandidates[i];
    const rawLng = lngCandidates[i];
    if (rawLat !== undefined && rawLat !== null && rawLng !== undefined && rawLng !== null) {
      const lat = parseFloat(rawLat);
      const lng = parseFloat(rawLng);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
        return { lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
      }
    }
  }

  // 3. Revisar si la dirección o algún campo de texto contiene coordenadas numéricas tipo "20.12345, -89.12345"
  const textCandidates = [
    prop.address,
    prop.direccion,
    prop.calle,
    prop.curp,
    prop.curp_inmueble,
    prop.description,
    prop.nombre_propiedad
  ];

  for (const text of textCandidates) {
    if (typeof text === 'string') {
      const match = text.match(/(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
        }
      }
    }
  }

  return null;
};

  // Enlace a Google Maps
  const handleOpenMaps = () => {
    const coords = extractPropertyGps(activeProperty);

    if (coords) {
      // Abre el pin exacto por coordenadas GPS en Google Maps evitando discrepancias de calles
      window.open(`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`, '_blank');
      return;
    }

    const address = activeProperty?.address || activeProperty?.direccion || activeProperty?.calle;
    if (address && typeof address === 'string' && address.trim() !== '' && address.trim() !== 'null') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`, '_blank');
      return;
    }

    window.open(`https://www.google.com/maps`, '_blank');
  };

  // Límite de propiedades
  const maxAllowed = (subInfo?.max_properties ?? 3) + (subInfo?.extra_properties_count ?? 0);
  const currentPropsCount = subInfo?.properties_count ?? propiedades.length;

  // Abre el registro de propiedad, o la compra de espacio si ya llegó al límite del plan
  const handleAgregarPropiedad = () => {
    if (currentPropsCount >= maxAllowed) {
      setShowModalCompra(true);
    } else {
      setShowModalRegistroPropiedad(true);
    }
  };

  const irAlInicio = () => {
    if (!user) return navigate('/');
    const role = Number(user.role_id);
    if (role === 0 || role === 1) navigate('/VistaRoot');
    else if (role === 4 || role === 5 || role === 3) navigate('/VistaMarket');
    else if (role === 2) navigate('/VistaTecnico');
    else if (esTecnicoRed(user)) navigate('/mercado-trabajos');
    else navigate('/');
  };

  const renderPropertyProfileCard = (isMobile = false) => (
    <div className={`vcp-property-profile-inner ${isMobile ? 'is-mobile-inner' : ''} ${hasProperties ? '' : 'is-empty'}`}>
      {/* ── 1. TOP: PERFIL DE LA PROPIEDAD ── */}
      <div className="vcp-panel-header">
        {/* Ícono fijo de edificio (igual que el panel de Agente Solutions); editar va en el botón EDITAR */}
        <div className="vcp-panel-header-icon" style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', cursor: 'default' }}>
          <Building2 size={18} />
        </div>
        <div className="vcp-panel-header-texts">
          <h2 className="vcp-panel-title">PERFIL DE LA PROPIEDAD</h2>
          <span className="vcp-panel-id-badge">
            REGISTRO: {hasProperties ? `#${activeProperty.id}` : '—'}
          </span>
        </div>
        {/* Una propiedad compartida la usa como dueño, pero solo el dueño real la edita */}
        {hasProperties && !activeProperty?.is_shared_with_me && (
          <button
            type="button"
            className="vcp-panel-edit-text-btn"
            onClick={() => setShowModalEditarPropiedad(true)}
            title="Editar información y fachada de esta propiedad"
            data-ayuda="editar-propiedad"
          >
            <Edit3 size={13} />
            <span>EDITAR</span>
          </button>
        )}
        {/* Flecha: oculta o muestra los datos (cliente, CURP, dirección, GPS) */}
        <button
          type="button"
          className={`vcp-info-toggle ${isInfoOpen ? 'is-open' : ''}`}
          onClick={() => setIsInfoOpen(v => !v)}
          aria-expanded={isInfoOpen}
          data-ayuda="info-propiedad"
          aria-label={isInfoOpen ? 'Ocultar información de la propiedad' : 'Ver información de la propiedad'}
          title={isInfoOpen ? 'Ocultar información' : 'Ver información'}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Fields List (colapsable con la flecha del encabezado) */}
      <div className={`vcp-info-collapse ${isInfoOpen ? 'is-open' : ''}`}>
      <div className="vcp-fields-list">
        {/* Cliente Asociado */}
        <div className="vcp-field-item">
          <div className="vcp-field-icon-wrap">
            <User size={16} />
          </div>
          <div className="vcp-field-content">
            <span className="vcp-field-label">CLIENTE ASOCIADO</span>
            <span className="vcp-field-value" style={hasProperties ? { fontWeight: 800, color: '#f26522', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' } : undefined}>
              {hasProperties ? <><User size={14} color="#ffffff" style={{ flexShrink: 0 }} /> {userFullName}</> : '—'}
            </span>
          </div>
        </div>

        {/* CURP Inmueble */}
        <div className="vcp-field-item">
          <div className="vcp-field-icon-wrap">
            <ClipboardList size={16} />
          </div>
          <div className="vcp-field-content">
            <span className="vcp-field-label">CURP INMUEBLE</span>
            <span className="vcp-curp-pill">
              {hasProperties
                ? (activeProperty.curp || activeProperty.curp_inmueble || `INM-${String(activeProperty.id).padStart(4, '0')}-MX01`)
                : '—'}
            </span>
          </div>
        </div>

        {/* Dirección */}
        <div className="vcp-field-item">
          <div className="vcp-field-icon-wrap">
            <MapPin size={16} />
          </div>
          <div className="vcp-field-content">
            <span className="vcp-field-label">DIRECCIÓN</span>
            <span className="vcp-field-value">
              {activeProperty?.address || activeProperty?.direccion || activeProperty?.calle || '—'}
            </span>
          </div>
        </div>

        {/* Ubicación GPS */}
        <div className="vcp-field-item">
          <div className="vcp-field-icon-wrap">
            <Navigation size={16} />
          </div>
          <div className="vcp-field-content">
            <span className="vcp-field-label">UBICACIÓN GPS</span>
            {hasProperties ? (
              <div className="vcp-gps-row" onClick={handleOpenMaps} title="Ver ubicación exacta en Google Maps">
                <MapPin size={13} color="#ffffff" style={{ flexShrink: 0 }} />
                <span>
                  {extractPropertyGps(activeProperty)
                    ? extractPropertyGps(activeProperty).formatted
                    : 'Ver en Google Maps'}
                </span>
                <ExternalLink size={13} />
              </div>
            ) : (
              <span className="vcp-field-value">—</span>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* ── 2. MIDDLE: TABLERO DE CONTROL WIDGET ── */}
      <div className="vcp-tablero-card" data-ayuda="tablero-control">
        <div className="vcp-tablero-header">
          <div className="vcp-tablero-icon-wrap">
            <LayoutDashboard size={18} />
          </div>
          <h3 className="vcp-tablero-title">Tablero de Control</h3>
        </div>

        <div className="vcp-tablero-grid">
          {/* Red: los contadores solo informan (sin navegación); conservan la animación al pasar el mouse */}
          {/* SOS */}
          <div 
            className="vcp-stat-box vcp-stat-sos solo-info"
          >
            <div className="vcp-stat-icon-wrapper">
              <AlertCircle size={20} className="vcp-stat-icon" />
            </div>
            <span className="vcp-stat-count">{propertyStats.sos}</span>
            <span className="vcp-stat-label">SOS</span>
          </div>

          {/* POR HACER */}
          <div 
            className="vcp-stat-box vcp-stat-todo solo-info"
          >
            <div className="vcp-stat-icon-wrapper">
              <ClipboardList size={20} className="vcp-stat-icon" />
            </div>
            <span className="vcp-stat-count">{propertyStats.pendientes}</span>
            <span className="vcp-stat-label">POR HACER</span>
          </div>

          {/* PROCESO */}
          <div 
            className="vcp-stat-box vcp-stat-process solo-info"
          >
            <div className="vcp-stat-icon-wrapper">
              <Clock size={20} className="vcp-stat-icon" />
            </div>
            <span className="vcp-stat-count">{propertyStats.proceso}</span>
            <span className="vcp-stat-label">PROCESO</span>
          </div>

          {/* LISTOS */}
          <div 
            className="vcp-stat-box vcp-stat-done solo-info"
          >
            <div className="vcp-stat-icon-wrapper">
              <CheckCircle2 size={20} className="vcp-stat-icon" />
            </div>
            <span className="vcp-stat-count">{propertyStats.listos}</span>
            <span className="vcp-stat-label">LISTOS</span>
          </div>
        </div>
      </div>

      {/* ── 3. BOTTOM: ACTION BUTTONS ── */}
      <div className="vcp-actions-grid">
        {/* Solicitar Servicio Button ("Levantamiento" ahora está en el menú de arriba, ClienteHeader) */}
        <button
          className="vcp-btn vcp-btn-service"
          style={{ gridColumn: '1 / -1' }}
          onClick={() => setShowModalSolicitarServicio(true)}
          disabled={!hasProperties}
          title="Crear o Solicitar un Nuevo Servicio"
          data-ayuda="solicitar-servicio"
        >
          <Plus size={17} /> SOLICITAR SERVICIO
        </button>
      </div>

      {/* Móvil: acceso directo al detalle de la propiedad (datos, trabajos, cotizaciones) */}
      {isMobile && hasProperties && (
        <button
          type="button"
          className="vcp-btn-ver-propiedad"
          onClick={() => navigate(`/detalle-propiedad/${activeProperty.id}`)}
          title="Ver el detalle de la propiedad"
        >
          <Eye size={17} /> VER PROPIEDAD
        </button>
      )}
    </div>
  );

  return (
    <div className="vcp-root" ref={rootRef}>
      {/* Full-bleed Background Image Layer across entire viewport including navbar */}
      <div 
        className="vcp-hero-bg-layer" 
        style={{ backgroundImage: `url("${heroBgImage}")` }}
      />
      <div className="vcp-hero-bg-overlay" />

      {/* ── TOP NAVIGATION BAR ── */}
      <Header activeModule="inicio" />

      {/* ── MAIN SPLIT VIEW CONTAINER ── */}
      <main className="vcp-body-layout">
        {/* ── LEFT HERO PROPERTY SHOWCASE ── */}
        <section className="vcp-hero-side" onTouchStart={alTocarInicio} onTouchEnd={alTocarFin}>
          {/* Flechas sobre el fondo: pasan de una propiedad a otra */}
          {/* Se esconden mientras el perfil (Detalles) está abierto para no taparlo */}
          {hasProperties && hayVariasPropiedades && !isMobilePropProfileOpen && (
            <>
              <button
                type="button"
                className="vcp-fondo-flecha is-izq"
                onClick={() => cambiarPropiedad(-1)}
                aria-label="Propiedad anterior"
                title="Propiedad anterior"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                className="vcp-fondo-flecha is-der"
                onClick={() => cambiarPropiedad(1)}
                aria-label="Siguiente propiedad"
                title="Siguiente propiedad"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Píldoras desplegables: plan y trabajos en curso */}
          <div className="vcp-pildoras-row">
          {/* Top Floating Subscription Plan Card (Oculto por defecto / Desplegable) */}
          <div className={`vcp-plan-floating-badge ${isPlanExpanded ? 'is-expanded' : 'is-collapsed'}`}>
            {!isPlanExpanded ? (
              <button 
                type="button" 
                className={`vcp-plan-pill-toggle-btn ${currentPropsCount >= maxAllowed ? 'is-limit-warning' : ''}`}
                onClick={() => setIsPlanExpanded(true)}
                title="Mostrar información del plan y comprar espacios"
              >
                {currentPropsCount >= maxAllowed && <Lock size={14} className="vcp-plan-lock-icon" />}
                <span className="vcp-plan-pill-text">PLAN PARTICULAR ({currentPropsCount}/{maxAllowed})</span>
                <ChevronDown size={15} className="vcp-plan-chevron" />
              </button>
            ) : (
              <div className="vcp-plan-expanded-box">
                <div 
                  className="vcp-plan-header-row" 
                  onClick={() => setIsPlanExpanded(false)}
                  title="Ocultar información del plan"
                >
                  <div className="vcp-plan-title">
                    {sinPrecio('PLAN PARTICULAR | 6 MESES GRATIS ($299 MXN/MES TRAS PRUEBA)')}
                  </div>
                  <button 
                    type="button" 
                    className="vcp-plan-close-btn"
                    onClick={(e) => { e.stopPropagation(); setIsPlanExpanded(false); }}
                    aria-label="Ocultar información del plan"
                    title="Ocultar"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>

                <div className="vcp-plan-info-row">
                  <span className="vcp-plan-pill">
                    <CalendarDays size={13} className="vcp-plan-ico" /> Vence: <strong>{subInfo?.subscription_expires_at ? new Date(subInfo.subscription_expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '30 de marzo de 2027'}</strong>
                  </span>

                  <span className="vcp-plan-pill">
                    <Building2 size={13} className="vcp-plan-ico" /> Propiedades: <strong>{currentPropsCount} / {maxAllowed}</strong>
                  </span>

                  {currentPropsCount >= maxAllowed && (
                    <span className="vcp-plan-pill vcp-plan-pill-limit">
                      <Lock size={11} /> LÍMITE ALCANZADO
                    </span>
                  )}
                </div>

                <div className="vcp-plan-action-row">
                  <SubscriptionCountdown targetDate={subInfo?.subscription_expires_at} />
                  
                  {!sinVentasDigitales && (
                  <button
                    type="button"
                    className="vcp-plan-buy-btn"
                    onClick={() => setShowModalCompra(true)}
                    title="Comprar espacio de propiedad adicional por $79.99 c/u"
                  >
                    <Lock size={14} /> REQUIERE NUEVA PROPIEDAD: COMPRAR ESPACIO ($79.99 c/u)
                  </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {hasProperties && <PildoraTrabajosEnCurso usuarioId={user?.id} />}
          </div>

          {/* Estado vacío: invita a registrar la primera propiedad */}
          {!hasProperties && (
            <div className="vcp-empty-state">
              <div className="vcp-empty-card">
                <div className="vcp-empty-icon">
                  <Building2 size={30} />
                </div>
                <h2 className="vcp-empty-title">Agrega tu primera propiedad</h2>
                <p className="vcp-empty-text">
                  Registra tu casa, departamento o local para solicitar servicios, ver sus levantamientos y llevar el control de todo en un solo lugar.
                </p>
                <button type="button" className="vcp-empty-btn" onClick={handleAgregarPropiedad} data-ayuda="agregar-propiedad">
                  <Plus size={18} /> AGREGAR PROPIEDAD
                </button>
              </div>
            </div>
          )}

          {/* Bottom Left Property Title & Thumbnail Carousel */}
          <div className="vcp-hero-bottom">
            {/* 1. Header Block: Owner + Property Title & Edit Button */}
            <div className="vcp-prop-header-block">
              <div className="vcp-prop-owner-tag">
                {userFullName}
              </div>

              {hasProperties && (
                <div className="vcp-title-edit-row vcp-titulo-cambia" key={activeProperty.id}>
                  <h1 className="vcp-prop-main-title">
                    {activeProperty.nombre_propiedad || activeProperty.nombre || activeProperty.alias || activeProperty.titulo || 'MI PROPIEDAD'}
                  </h1>
                  {!activeProperty?.is_shared_with_me && (
                    <button
                      type="button"
                      className="vcp-title-edit-btn"
                      onClick={() => setShowModalEditarPropiedad(true)}
                      title="Editar nombre y fachada de esta propiedad"
                      data-ayuda="editar-propiedad"
                    >
                      <Edit3 size={16} />
                      <span>EDITAR</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Pestaña Desplegable del Perfil de la Propiedad (SOLO RESPONSIVO / MOBILE) */}
            <div className="vcp-mobile-prop-drawer-wrap">
              <div
                className={`vcp-mobile-prop-drawer-tab ${isMobilePropProfileOpen && !cerrandoPerfil ? 'is-open' : ''}`}
                onClick={alternarPerfilMovil}
                title={isMobilePropProfileOpen ? "Ocultar detalles del perfil de la propiedad" : "Desplegar detalles del perfil de la propiedad"}
              >
                <div className="vcp-drawer-tab-main">
                  <div className="vcp-drawer-tab-badge">
                    <Building2 size={22} color="#ffffff" className="vcp-drawer-tab-icono" />
                    <span>PERFIL DE LA PROPIEDAD</span>
                  </div>
                </div>

                {/* Solicitar servicio a la mano, junto a "Detalles" (en móvil ya no queda hasta abajo) */}
                {/* Siempre visible; sin propiedad se ve atenuado y lleva a registrar una */}
                <button
                  type="button"
                  className={`vcp-drawer-tab-service ${hasProperties ? '' : 'is-disabled'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasProperties) setShowModalSolicitarServicio(true);
                    else handleAgregarPropiedad();
                  }}
                  title={hasProperties ? 'Crear o Solicitar un Nuevo Servicio' : 'Primero agrega una propiedad para solicitar servicios'}
                  data-ayuda="solicitar-servicio"
                >
                  <Plus size={14} />
                  <span>SERVICIO</span>
                </button>

                <div className="vcp-drawer-tab-btn">
                  <span>DETALLES</span>
                  {/* Cerrado: flecha arriba (el panel sube). Abierto: gira hacia abajo para guardarlo */}
                  <ChevronUp size={16} className="vcp-perfil-flecha" />
                </div>
              </div>

              {/* Contenido desplegable en móvil */}
              {isMobilePropProfileOpen && (
                <div className={`vcp-mobile-prop-drawer-content ${cerrandoPerfil ? 'is-cerrando' : ''}`}>
                  {/* Envoltura para que el alto se cierre poco a poco al guardar (ver CSS) */}
                  <div className="vcp-perfil-drawer-inner">
                    {renderPropertyProfileCard(true)}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Puntos (qué propiedad se ve) y flecha para bajar al tablero */}
            {hasProperties && (
              <div className="vcp-hero-pie" ref={pieRef}>
                {hayVariasPropiedades && (
                  <div className="vcp-puntos" aria-label="Propiedades">
                    {userPropiedades.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`vcp-punto ${i === indiceActivo ? 'is-activo' : ''}`}
                        onClick={() => setSelectedPropId(p.id)}
                        aria-label={p.nombre_propiedad || p.nombre || `Propiedad ${i + 1}`}
                        title={p.nombre_propiedad || p.nombre || `Propiedad ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
                {/* Arriba: "TABLERO" con flecha abajo. Abajo: "MENÚ" con la flecha arriba, regresa al inicio */}
                <button
                  type="button"
                  className={`vcp-bajar-btn ${yaBajo ? 'is-arriba' : ''}`}
                  onClick={yaBajo ? subirArriba : irAlTablero}
                  aria-label={yaBajo ? 'Volver al menú' : 'Bajar al tablero'}
                  title={yaBajo ? 'Volver al menú' : 'Ver el tablero de la propiedad'}
                >
                  {yaBajo ? (
                    <>
                      <ChevronUp size={20} />
                      <span>MENÚ</span>
                    </>
                  ) : (
                    <>
                      <span>TABLERO</span>
                      <ChevronDown size={20} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 4. Carrusel de miniaturas (solo escritorio; en celular se oculta por CSS) */}
            <div className="vcp-prop-carousel-block">
              <div className="vcp-prop-category-label">
                PROPIEDADES
              </div>

              {/* Horizontal Thumbnails Carousel con Reordenamiento Drag & Drop */}
              <div className="vcp-thumbs-track">
                {userPropiedades.map((prop, idx) => {
                    const isActive = prop.id === activeProperty?.id;
                    const isDragging = prop.id === draggedPropId;
                    const isDragOver = prop.id === dragOverPropId;
                    const thumbImg = getPropImage(prop);
                    return (
                      <div
                        key={prop.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, prop.id)}
                        onDragOver={(e) => handleDragOver(e, prop.id)}
                        onDragLeave={(e) => handleDragLeave(e, prop.id)}
                        onDrop={(e) => handleDrop(e, prop.id)}
                        onDragEnd={handleDragEnd}
                        className={`vcp-thumb-card ${isActive ? 'active' : ''} ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
                        onClick={() => setSelectedPropId(prop.id)}
                        title={`Arrastra para reordenar o haz clic para ver:\n${prop.nombre_propiedad || prop.nombre || `Propiedad #${prop.id}`}`}
                      >
                        <img
                          src={thumbImg}
                          alt={prop.nombre_propiedad || 'Propiedad'}
                          className="vcp-thumb-img"
                          draggable={false}
                        />
                        {idx === 0 && (
                          <div className="vcp-thumb-main-badge" title="Propiedad Principal / Por Defecto">
                            ★
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Plus Add Property Tile */}
                <div
                  className={`vcp-thumb-add-tile ${currentPropsCount >= maxAllowed ? 'is-limit-reached' : ''}`}
                  title={currentPropsCount >= maxAllowed ? (sinVentasDigitales ? "Límite de propiedades alcanzado" : "Límite de propiedades alcanzado - Comprar espacio ($79.99 c/u)") : "Registrar / Agregar Propiedad"}
                  onClick={handleAgregarPropiedad}
                  data-ayuda="agregar-propiedad"
                >
                  {currentPropsCount >= maxAllowed ? (
                    <div className="vcp-thumb-lock-wrap">
                      <Lock size={20} color="#ffffff" />
                    </div>
                  ) : (
                    <Plus size={28} />
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── RIGHT PROPERTY PROFILE CARD (DESKTOP) ── */}
        <aside className="vcp-panel-side">
          {renderPropertyProfileCard(false)}
        </aside>
      </main>

      {/* ── FICHA DE LA PROPIEDAD (se llega bajando; cambia con las flechas) ── */}
      {hasProperties && (
        <section className="vcp-tablero-seccion" ref={tableroRef}>
          <div className="vcp-ts-grid is-una">
            <div className="vcp-ts-card vcp-titulo-cambia" key={activeProperty.id}>
              <div className="vcp-ts-card-head">
                <div className="vcp-ts-fila-foto is-cabeza">
                  <img src={getPropImage(activeProperty)} alt="" />
                </div>
                <div className="vcp-ts-head-txt">
                  <span className="vcp-ts-kicker">
                    PROPIEDAD {indiceActivo + 1} DE {userPropiedades.length}
                  </span>
                  <h3 className="vcp-ts-title">
                    {activeProperty.nombre_propiedad || activeProperty.nombre || activeProperty.alias || 'Mi propiedad'}
                  </h3>
                </div>
                {hayVariasPropiedades && (
                  <div className="vcp-ts-nav">
                    <button type="button" onClick={() => cambiarPropiedad(-1)} aria-label="Propiedad anterior"><ChevronLeft size={16} /></button>
                    <button type="button" onClick={() => cambiarPropiedad(1)} aria-label="Siguiente propiedad"><ChevronRight size={16} /></button>
                  </div>
                )}
              </div>

              {(activeProperty.address || activeProperty.direccion || activeProperty.calle) && (
                <button type="button" className="vcp-ts-direccion" onClick={handleOpenMaps} title="Ver en Google Maps">
                  <MapPin size={14} />
                  <span>{activeProperty.address || activeProperty.direccion || activeProperty.calle}</span>
                  <ExternalLink size={12} />
                </button>
              )}

              {/* Tablero de esta propiedad */}
              <div className="vcp-ts-stats">
                <div className="vcp-ts-stat ts-sos"><AlertCircle size={16} /><strong>{propertyStats.sos}</strong><span>SOS</span></div>
                <div className="vcp-ts-stat ts-todo"><ClipboardList size={16} /><strong>{propertyStats.pendientes}</strong><span>Por hacer</span></div>
                <div className="vcp-ts-stat ts-proc"><Clock size={16} /><strong>{propertyStats.proceso}</strong><span>Proceso</span></div>
                <div className="vcp-ts-stat ts-done"><CheckCircle2 size={16} /><strong>{propertyStats.listos}</strong><span>Listos</span></div>
              </div>

              <div className="vcp-ts-avance">
                <div className="vcp-ts-avance-txt">
                  <span>Avance de trabajos</span>
                  <strong>{avanceDe(propertyStats)}%</strong>
                </div>
                <div className="vcp-ts-barra">
                  <div className="vcp-ts-barra-fill" style={{ width: `${avanceDe(propertyStats)}%` }} />
                </div>
                <span className="vcp-ts-nota">
                  {totalDe(propertyStats) === 0
                    ? 'Aún no hay trabajos en esta propiedad'
                    : `${propertyStats.listos} de ${totalDe(propertyStats)} trabajos terminados`}
                </span>
              </div>

              {/* Últimos trabajos (tocar uno abre su detalle) */}
              <div className="vcp-ts-historial">
                <div className="vcp-ts-sub"><Clock size={14} /> Últimos trabajos</div>
                {expActivo.cargando && ultimosTrabajos.length === 0 ? (
                  <p className="vcp-ts-vacio">Cargando…</p>
                ) : ultimosTrabajos.length === 0 ? (
                  <p className="vcp-ts-vacio">Todavía no hay trabajos en esta propiedad.</p>
                ) : (
                  <ul>
                    {ultimosTrabajos.map((t) => {
                      const estado = etiquetaEstado(t);
                      return (
                        <li key={t.uid || t.id}>
                          <button
                            type="button"
                            className="vcp-ts-trabajo"
                            onClick={() => navigate(`/detalle-propiedad/${activeProperty.id}/trabajo/${t.uid}`)}
                          >
                            <div>
                              <strong>{t.titulo || 'Sin título'}</strong>
                              <span className={`vcp-ts-chip tono-${estado.tono}`}>{estado.texto}</span>
                              <span className="vcp-ts-fecha">{fechaCorta(fechaDeTrabajo(t))}</span>
                            </div>
                            <ChevronRight size={16} className="vcp-ts-fila-flecha" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="vcp-ts-acciones">
                <button type="button" className="vcp-ts-btn is-naranja" onClick={() => setShowModalSolicitarServicio(true)}>
                  <Plus size={15} /> SOLICITAR SERVICIO
                </button>
                <button type="button" className="vcp-ts-btn" onClick={() => navigate(`/detalle-propiedad/${activeProperty.id}`)}>
                  <Eye size={15} /> VER PROPIEDAD
                </button>
              </div>
            </div>

            {/* Botón al tablero global de todas las propiedades */}
            <button type="button" className="vcp-ts-global-btn" onClick={() => navigate('/tablero-global')} data-ayuda="menu-tablero-global">
              <span className="vcp-ts-head-ico"><Layers size={18} /></span>
              <span className="vcp-ts-global-txt">
                <strong>Tablero global</strong>
                <small>Todas tus propiedades, trabajos y fechas</small>
              </span>
              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              className={`vcp-ts-fila is-agregar ${currentPropsCount >= maxAllowed ? 'is-limite' : ''}`}
              onClick={handleAgregarPropiedad}
              title={currentPropsCount >= maxAllowed ? 'Límite de propiedades alcanzado' : 'Registrar una nueva propiedad'}
            >
              <div className="vcp-ts-fila-foto is-icono">
                {currentPropsCount >= maxAllowed ? <Lock size={18} /> : <Plus size={20} />}
              </div>
              <div className="vcp-ts-fila-info">
                <strong>Agregar propiedad</strong>
                <span className="vcp-ts-nota">{currentPropsCount} de {maxAllowed} espacios usados</span>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* La barra inferior ya la incluye <Header> (dos barras encimadas rompían la animación) */}

      {/* ── MODALES COMPARTIDOS ── */}
      {/* Modal Compra de Espacios */}
      <ModalCompraEspacios
        isOpen={showModalCompra}
        onClose={() => setShowModalCompra(false)}
        tenantId={subInfo?.tenant?.id || user?.tenant_id || 1}
        userId={user?.id}
        planName="Personal"
      />

      {/* Modal Calendario Cliente */}
      <ModalCalendarioCliente
        isOpen={showModalCalendario}
        onClose={() => setShowModalCalendario(false)}
      />

      {/* Modal Registro de Inmueble */}
      <ModalRegistroInmueble
        isOpen={showModalRegistroPropiedad}
        onClose={() => setShowModalRegistroPropiedad(false)}
        onSuccess={handlePropertyCreated}
        user={user}
      />

      {/* Modal Editar Propiedad */}
      <ModalEditarPropiedadCliente
        isOpen={showModalEditarPropiedad}
        onClose={() => setShowModalEditarPropiedad(false)}
        propiedad={activeProperty}
        onSuccess={handlePropertyUpdated}
      />

      {/* Modal Solicitar Servicio / Reportar Problema (Red vs Mis Técnicos) */}
      {showModalSolicitarServicio && (
        <ModalServicioAutonomo
          propertyId={activeProperty?.id}
          onClose={() => setShowModalSolicitarServicio(false)}
          onSuccess={() => {
            setShowModalSolicitarServicio(false);
            fetchData();
          }}
        />
      )}

      {/* El técnico canceló: calificarlo es obligatorio y después se elige reenviar o cancelar */}
      <AvisoCancelacionTecnico onResuelto={() => fetchData()} />
      {/* El técnico terminó: el cliente lo califica (calidad y puntualidad) */}
      <AvisoCalificarTecnico onCalificado={() => fetchData()} />
      <AvisoCambioHorario onResuelto={() => fetchData()} />
    </div>
  );
};

export default VistaClienteParticular;
