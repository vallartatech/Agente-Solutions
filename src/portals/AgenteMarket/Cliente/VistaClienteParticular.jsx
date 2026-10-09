import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import ModalCompraEspacios from '../../../components/Shared/ModalCompraEspacios';
import ModalCalendarioCliente from './ModalCalendarioCliente';
import ModalRegistroInmueble from './ModalRegistroInmueble';
import ModalEditarPropiedadCliente from './ModalEditarPropiedadCliente';
import NotificationBell from '../../../components/Shared/NotificationBell';
import '../../../styles/AgenteMarket/Cliente/VistaClienteParticular.css';

import {
  Home,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Navigation,
  Share2,
  AlertTriangle,
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
  Shield
} from 'lucide-react';

import defaultPropImg from '../../../assets/propiedad_ejemplo.jpg';
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
        ⏳ 180 días restantes
      </span>
    );
  }

  return (
    <span className="vcp-plan-timer-pill">
      <span className="vcp-timer-dot" />
      ⏱️ {timeLeft || 'Calculando...'}
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
  const [appLogo, setAppLogo] = useState(defaultLogo);

  // Modales y Dropdowns
  const [showModalCompra, setShowModalCompra] = useState(false);
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [showModalRegistroPropiedad, setShowModalRegistroPropiedad] = useState(false);
  const [showModalEditarPropiedad, setShowModalEditarPropiedad] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false); // Oculto por defecto

  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer click o tap fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
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
      const token = localStorage.getItem('agente_token');
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
      case 8: return 'Técnico de la Red';
      default: return 'Cliente Particular';
    }
  }, [user]);

  const userAvatar = user?.profile_picture || user?.avatar_url || user?.foto || null;
  const userInitial = user?.first_name 
    ? user.first_name.charAt(0).toUpperCase() 
    : (user?.name ? user.name.charAt(0).toUpperCase() : (user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'P'));

  // Estado para el orden personalizado de propiedades
  const [customOrder, setCustomOrder] = useState(() => {
    try {
      const key = `agente_props_order_${user?.id || user?.email || 'client'}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [draggedPropId, setDraggedPropId] = useState(null);
  const [dragOverPropId, setDragOverPropId] = useState(null);
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

  const activeProperty = useMemo(() => {
    if (!userPropiedades || userPropiedades.length === 0) {
      return {
        id: 1,
        nombre_propiedad: 'MI PROPIEDAD',
        cliente_nombre: userFullName,
        curp: 'INM-2024-MX01',
        address: 'Residencial Las Palmas #142, Mérida, Yucatán',
        imagen_url: defaultPropImg,
        lat: 20.967370,
        lng: -89.592586
      };
    }
    const found = userPropiedades.find(p => p.id === selectedPropId);
    return found || userPropiedades[0];
  }, [userPropiedades, selectedPropId, userFullName]);

  // Estados de Estadísticas para el Tablero de Control de la Propiedad
  const [propertyStats, setPropertyStats] = useState({
    sos: 0,
    pendientes: 0,
    proceso: 0,
    listos: 0
  });

  useEffect(() => {
    if (!activeProperty?.id) return;
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('agente_token');
        const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${activeProperty.id}/dashboard`, authHeader);
        if (isMounted && res.data?.stats) {
          setPropertyStats({
            sos: Number(res.data.stats.sos || 0),
            pendientes: Number(res.data.stats.pendientes || res.data.stats.todo || 0),
            proceso: Number(res.data.stats.proceso || res.data.stats.in_progress || 0),
            listos: Number(res.data.stats.listos || res.data.stats.done || 0)
          });
        }
      } catch {
        if (isMounted) {
          setPropertyStats({ sos: 0, pendientes: 0, proceso: 0, listos: 0 });
        }
      }
    };
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [activeProperty?.id]);

  // Al entrar a la vista o cargar propiedades, la primera propiedad de la lista ordenada es la activa por defecto
  useEffect(() => {
    if (userPropiedades.length > 0) {
      if (!hasSelectedInitRef.current || !selectedPropId || !userPropiedades.some(p => p.id === selectedPropId)) {
        setSelectedPropId(userPropiedades[0].id);
        hasSelectedInitRef.current = true;
      }
    }
  }, [userPropiedades, selectedPropId]);

  // Handlers para Drag & Drop (Reordenamiento visual y persistente)
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
  const heroBgImage = getPropImage(activeProperty);

  // Manejo de compartir propiedad
  const handleShareProperty = () => {
    const shareText = `Propiedad: ${activeProperty?.nombre_propiedad || activeProperty?.nombre || 'Propiedad'} - ID: #${activeProperty?.id || '001'} | Dirección: ${activeProperty?.address || activeProperty?.direccion || 'N/A'}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    } else {
      alert(`Información de la propiedad:\n${shareText}`);
    }
  };

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
  const currentPropsCount = subInfo?.properties_count ?? (propiedades.length || 1);

  const irAlInicio = () => {
    if (!user) return navigate('/');
    const role = Number(user.role_id);
    if (role === 0 || role === 1) navigate('/VistaRoot');
    else if (role === 4 || role === 5 || role === 7 || role === 3) navigate('/VistaMarket');
    else if (role === 2) navigate('/VistaTecnico');
    else if (role === 6 || role === 8) navigate('/mercado-trabajos');
    else navigate('/');
  };

  return (
    <div className="vcp-root">
      {/* Full-bleed Background Image Layer across entire viewport including navbar */}
      <div 
        className="vcp-hero-bg-layer" 
        style={{ backgroundImage: `url("${heroBgImage}")` }}
      />
      <div className="vcp-hero-bg-overlay" />

      {/* ── TOP NAVIGATION BAR ── */}
      <header className="vcp-header">
        <div className="vcp-header-left">
          <img 
            src={appLogo} 
            alt="Agente Logo" 
            className="vcp-brand-logo"
            onClick={irAlInicio} 
            title="Ir al Inicio"
          />
        </div>

        {/* Center Nav Links: INICIO + 5 core modules */}
        <nav className="vcp-header-nav">
          <button className="vcp-nav-btn" onClick={irAlInicio}>
            INICIO
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/usuarios')}>
            USUARIOS
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/reportes-globales')}>
            REPORTE
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/vista-cotizaciones')}>
            COTIZACION
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/tablero-servicios')}>
            SERVICIOS
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/red-autonomos')}>
            MERCADO / RED
          </button>
        </nav>

        {/* User profile & action buttons on top right */}
        <div className="vcp-header-right" ref={dropdownRef}>
          <div className="vcp-header-actions-group">
            {/* Botón Calendario */}
            <button 
              type="button"
              className="vcp-header-icon-btn" 
              title="Abrir Calendario y Citas"
              onClick={() => setShowModalCalendario(true)}
            >
              <CalendarDays size={18} strokeWidth={2.2} />
            </button>

            {/* Botón Notificaciones */}
            <NotificationBell triggerClassName="vcp-header-icon-btn" />
          </div>

          <button 
            type="button"
            className={`vcp-avatar-btn ${profileDropdownOpen ? 'active' : ''}`} 
            onClick={(e) => {
              e.stopPropagation();
              setProfileDropdownOpen((prev) => !prev);
            }}
            title="Opciones de perfil"
            aria-label="Opciones de perfil"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Avatar" className="vcp-avatar-img" />
            ) : (
              <div className="vcp-avatar-initial">{userInitial}</div>
            )}
          </button>
        </div>
      </header>

      {/* ── DROPDOWN DE PERFIL EN PORTAL (SIEMPRE ADELANTE DE TODO) ── */}
      {profileDropdownOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop invisible que cubre toda la pantalla para cerrar al hacer tap fuera */}
          <div 
            className="vcp-profile-backdrop" 
            onClick={(e) => {
              e.stopPropagation();
              setProfileDropdownOpen(false);
            }}
          />
          <div 
            className="vcp-profile-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vcp-dropdown-user-header">
              <div className="vcp-dropdown-role-pill">
                <Shield size={12} className="vcp-dropdown-role-icon" />
                <span>{userRoleLabel}</span>
              </div>
              <div className="vcp-dropdown-user-name">{userFullName}</div>
              {user?.email && (
                <div className="vcp-dropdown-user-email">{user.email}</div>
              )}
            </div>

            <div className="vcp-dropdown-divider" />

            <button 
              type="button"
              className="vcp-dropdown-item" 
              onClick={(e) => { 
                e.stopPropagation();
                setProfileDropdownOpen(false); 
                navigate('/mi-perfil'); 
              }}
            >
              <User size={16} /> Mi Perfil
            </button>
            <button 
              type="button"
              className="vcp-dropdown-item logout" 
              onClick={(e) => { 
                e.stopPropagation();
                setProfileDropdownOpen(false); 
                logout(); 
                navigate('/', { replace: true }); 
              }}
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </>,
        document.body
      )}

      {/* ── MAIN SPLIT VIEW CONTAINER ── */}
      <main className="vcp-body-layout">
        {/* ── LEFT HERO PROPERTY SHOWCASE ── */}
        <section className="vcp-hero-side">
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
                    PLAN PARTICULAR | 6 MESES GRATIS ($299 MXN/MES TRAS PRUEBA)
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
                    📅 Vence: <strong>{subInfo?.subscription_expires_at ? new Date(subInfo.subscription_expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '30 de marzo de 2027'}</strong>
                  </span>

                  <span className="vcp-plan-pill">
                    🏠 Propiedades: <strong>{currentPropsCount} / {maxAllowed}</strong>
                  </span>

                  {currentPropsCount >= maxAllowed && (
                    <span className="vcp-plan-pill vcp-plan-pill-limit">
                      <Lock size={11} /> LÍMITE ALCANZADO
                    </span>
                  )}
                </div>

                <div className="vcp-plan-action-row">
                  <SubscriptionCountdown targetDate={subInfo?.subscription_expires_at} />
                  
                  <button 
                    type="button"
                    className="vcp-plan-buy-btn"
                    onClick={() => setShowModalCompra(true)}
                    title="Comprar espacio de propiedad adicional por $79.99 c/u"
                  >
                    <Lock size={14} /> REQUIERE NUEVA PROPIEDAD: COMPRAR ESPACIO ($79.99 c/u)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Left Property Title & Thumbnail Carousel */}
          <div className="vcp-hero-bottom">
            <div className="vcp-prop-owner-tag">
              {userFullName}
            </div>

            <div className="vcp-title-edit-row">
              <h1 className="vcp-prop-main-title">
                {activeProperty?.nombre_propiedad || activeProperty?.nombre || activeProperty?.alias || activeProperty?.titulo || 'MI PROPIEDAD'}
              </h1>
              <button
                type="button"
                className="vcp-title-edit-btn"
                onClick={() => setShowModalEditarPropiedad(true)}
                title="Editar nombre y fachada de esta propiedad"
              >
                <Edit3 size={16} />
                <span>EDITAR</span>
              </button>
            </div>

            <div className="vcp-prop-category-label">
              PROPIEDADES
            </div>

            {/* Horizontal Thumbnails Carousel con Reordenamiento Drag & Drop */}
            <div className="vcp-thumbs-track">
              {userPropiedades && userPropiedades.length > 0 ? (
                userPropiedades.map((prop, idx) => {
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
                })
              ) : (
                <div 
                  className="vcp-thumb-card active"
                  title="Propiedad de Demostración"
                >
                  <img src={defaultPropImg} alt="Propiedad" className="vcp-thumb-img" draggable={false} />
                </div>
              )}

              {/* Plus Add Property Tile */}
              <div 
                className={`vcp-thumb-add-tile ${currentPropsCount >= maxAllowed ? 'is-limit-reached' : ''}`}
                title={currentPropsCount >= maxAllowed ? "Límite de propiedades alcanzado - Comprar espacio ($79.99 c/u)" : "Registrar / Agregar Propiedad"}
                onClick={() => {
                  if (currentPropsCount >= maxAllowed) {
                    setShowModalCompra(true);
                  } else {
                    setShowModalRegistroPropiedad(true);
                  }
                }}
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
        </section>

        {/* ── RIGHT PROPERTY PROFILE CARD ── */}
        {/* ── RIGHT PROPERTY PROFILE CARD ── */}
        <aside className="vcp-panel-side">
          {/* ── 1. TOP: PERFIL DE LA PROPIEDAD ── */}
          <div className="vcp-panel-header">
            <button 
              type="button"
              className="vcp-panel-header-icon vcp-panel-edit-btn"
              onClick={() => setShowModalEditarPropiedad(true)}
              title="Editar información y fachada de esta propiedad"
            >
              <Edit3 size={18} />
            </button>
            <div className="vcp-panel-header-texts">
              <h2 className="vcp-panel-title">PERFIL DE LA PROPIEDAD</h2>
              <span className="vcp-panel-id-badge">
                ID REGISTRO: #{activeProperty?.id || '001'}
              </span>
            </div>
            <button
              type="button"
              className="vcp-panel-edit-text-btn"
              onClick={() => setShowModalEditarPropiedad(true)}
              title="Editar información y fachada de esta propiedad"
            >
              <Edit3 size={13} />
              <span>EDITAR</span>
            </button>
          </div>

          {/* Fields List */}
          <div className="vcp-fields-list">
            {/* Cliente Asociado */}
            <div className="vcp-field-item">
              <div className="vcp-field-icon-wrap">
                <User size={16} />
              </div>
              <div className="vcp-field-content">
                <span className="vcp-field-label">CLIENTE ASOCIADO</span>
                <span className="vcp-field-value">
                  {userFullName}
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
                  {activeProperty?.curp || activeProperty?.curp_inmueble || `INM-${activeProperty?.id ? String(activeProperty.id).padStart(4, '0') : '2024'}-MX01`}
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
                  {activeProperty?.address || activeProperty?.direccion || activeProperty?.calle || 'Residencial Las Palmas #142, Mérida'}
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
                <div className="vcp-gps-row" onClick={handleOpenMaps} title="Ver ubicación exacta en Google Maps">
                  <span>
                    {extractPropertyGps(activeProperty)
                      ? `📍 ${extractPropertyGps(activeProperty).formatted}`
                      : '📍 Ver en Google Maps'}
                  </span>
                  <ExternalLink size={13} />
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. MIDDLE: TABLERO DE CONTROL WIDGET ── */}
          <div className="vcp-tablero-card">
            <div className="vcp-tablero-header">
              <div className="vcp-tablero-icon-wrap">
                <LayoutDashboard size={18} />
              </div>
              <h3 className="vcp-tablero-title">Tablero de Control</h3>
            </div>

            <div className="vcp-tablero-grid">
              {/* SOS */}
              <div 
                className="vcp-stat-box vcp-stat-sos"
                onClick={() => navigate('/SOSView', { state: { propiedad: activeProperty } })}
                title="Ver o Solicitar SOS"
              >
                <div className="vcp-stat-icon-wrapper">
                  <AlertCircle size={20} className="vcp-stat-icon" />
                </div>
                <span className="vcp-stat-count">{propertyStats.sos}</span>
                <span className="vcp-stat-label">SOS</span>
              </div>

              {/* POR HACER */}
              <div 
                className="vcp-stat-box vcp-stat-todo"
                onClick={() => navigate(`/propiedad/${activeProperty?.id}/tablero`, { state: { propiedad: activeProperty } })}
                title="Servicios Por Hacer"
              >
                <div className="vcp-stat-icon-wrapper">
                  <ClipboardList size={20} className="vcp-stat-icon" />
                </div>
                <span className="vcp-stat-count">{propertyStats.pendientes}</span>
                <span className="vcp-stat-label">POR HACER</span>
              </div>

              {/* PROCESO */}
              <div 
                className="vcp-stat-box vcp-stat-process"
                onClick={() => navigate(`/propiedad/${activeProperty?.id}/tablero`, { state: { propiedad: activeProperty } })}
                title="Servicios en Proceso"
              >
                <div className="vcp-stat-icon-wrapper">
                  <Clock size={20} className="vcp-stat-icon" />
                </div>
                <span className="vcp-stat-count">{propertyStats.proceso}</span>
                <span className="vcp-stat-label">PROCESO</span>
              </div>

              {/* LISTOS */}
              <div 
                className="vcp-stat-box vcp-stat-done"
                onClick={() => navigate(`/propiedad/${activeProperty?.id}/tablero`, { state: { propiedad: activeProperty } })}
                title="Servicios Concluidos / Listos"
              >
                <div className="vcp-stat-icon-wrapper">
                  <CheckCircle2 size={20} className="vcp-stat-icon" />
                </div>
                <span className="vcp-stat-count">{propertyStats.listos}</span>
                <span className="vcp-stat-label">LISTOS</span>
              </div>
            </div>

            <div className="vcp-tablero-btn-wrap">
              <button 
                className="vcp-btn-tablero-detail"
                onClick={() => navigate(`/propiedad/${activeProperty?.id}/tablero`, { state: { propiedad: activeProperty } })}
                title="Ver Tablero Detallado de la Propiedad"
              >
                VER TABLERO DETALLADO
              </button>
            </div>
          </div>

          {/* ── 3. BOTTOM: 2x2 ACTION BUTTONS GRID ── */}
          <div className="vcp-actions-grid">
            {/* SOS Button */}
            <button 
              className="vcp-btn vcp-btn-sos"
              onClick={() => navigate('/SOSView', { state: { propiedad: activeProperty } })}
              title="Solicitar Auxilio / SOS Inmediato"
            >
              <AlertTriangle size={17} /> SOS
            </button>

            {/* Solicitar Servicio Button */}
            <button 
              className="vcp-btn vcp-btn-service"
              onClick={() => navigate('/tablero-servicios', { state: { selectedPropId: activeProperty?.id } })}
              title="Crear o Solicitar un Nuevo Servicio"
            >
              <Plus size={17} /> SOLICITAR SERVICIO
            </button>

            {/* Compartir Button */}
            <button 
              className="vcp-btn vcp-btn-share"
              onClick={handleShareProperty}
              title="Compartir Ficha de la Propiedad"
            >
              {copiedToast ? (
                <>
                  <CheckCircle2 size={17} /> ¡COPIADO!
                </>
              ) : (
                <>
                  <Share2 size={17} /> COMPARTIR
                </>
              )}
            </button>

            {/* Ver Levantamiento Button */}
            <button 
              className="vcp-btn vcp-btn-survey"
              onClick={() => navigate('/levantamientos', { state: { selectedPropId: activeProperty?.id } })}
              title="Ver Levantamientos y Planos de la Propiedad"
            >
              <ClipboardList size={17} /> VER LEVANTAMIENTO
            </button>
          </div>
        </aside>
      </main>

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
    </div>
  );
};

export default VistaClienteParticular;
