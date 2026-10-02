import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import ModalCompraEspacios from '../../../components/Shared/ModalCompraEspacios';
import ModalCalendarioCliente from './ModalCalendarioCliente';
import ModalRegistroInmueble from './ModalRegistroInmueble';
import '../../../styles/AgenteMarket/Cliente/VistaClienteParticular.css';

// Icons
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
  ClipboardList,
  Plus,
  LogOut,
  Building2,
  CheckCircle2,
  ExternalLink
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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false); // Oculto por defecto

  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        if (rawProps.length > 0 && !selectedPropId) {
          setSelectedPropId(rawProps[0].id);
        }
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

  // Propiedad activa seleccionada
  const userFullName = useMemo(() => {
    const parts = [user?.first_name, user?.last_name].filter(Boolean);
    if (parts.length > 0) return parts.join(' ').toUpperCase();
    if (user?.name) return user.name.toUpperCase();
    if (user?.nombre) return user.nombre.toUpperCase();
    return 'CLIENTE PARTICULAR';
  }, [user]);

  const userAvatar = user?.profile_picture || user?.avatar_url || user?.foto || null;
  const userInitial = user?.first_name 
    ? user.first_name.charAt(0).toUpperCase() 
    : (user?.name ? user.name.charAt(0).toUpperCase() : (user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'P'));

  // Propiedades filtradas para el usuario actual si aplican
  const userPropiedades = useMemo(() => {
    if (!propiedades || propiedades.length === 0) return [];
    
    // Si las propiedades vienen con asociación de usuario / tenant, podemos priorizarlas
    const forThisUser = propiedades.filter(p => 
      (user?.id && (p.user_id === user.id || p.usuario_id === user.id || p.cliente_id === user.id || p.cliente?.id === user.id)) ||
      (user?.tenant_id && p.tenant_id === user.tenant_id)
    );

    return forThisUser.length > 0 ? forThisUser : propiedades;
  }, [propiedades, user]);

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

  // Asegurar que si cambia la lista seleccionamos la primera propiedad válida
  useEffect(() => {
    if (userPropiedades.length > 0 && !userPropiedades.some(p => p.id === selectedPropId)) {
      setSelectedPropId(userPropiedades[0].id);
    }
  }, [userPropiedades, selectedPropId]);

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

  // Enlace a Google Maps
  const handleOpenMaps = () => {
    const lat = activeProperty?.lat || activeProperty?.latitude;
    const lng = activeProperty?.lng || activeProperty?.longitude;
    const address = activeProperty?.address || activeProperty?.direccion;

    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    } else if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps`, '_blank');
    }
  };

  // Límite de propiedades
  const maxAllowed = (subInfo?.max_properties ?? 3) + (subInfo?.extra_properties_count ?? 0);
  const currentPropsCount = subInfo?.properties_count ?? (propiedades.length || 1);

  return (
    <div className="vcp-root">
      {/* ── TOP NAVIGATION BAR ── */}
      <header className="vcp-header">
        <div className="vcp-header-left">
          <img 
            src={appLogo} 
            alt="Agente Logo" 
            className="vcp-brand-logo"
            onClick={() => navigate('/VistaMarket')} 
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

          <button className="vcp-nav-btn" onClick={() => navigate('/usuarios')}>
            USUARIOS
          </button>
          <button className="vcp-nav-btn active" onClick={() => navigate('/propiedades')}>
            PROPIEDADES
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/levantamientos')}>
            LEVANTAMIENTO
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

        {/* User profile dropdown section */}
        <div className="vcp-header-right" ref={dropdownRef}>
          <div className="vcp-user-info-text">
            <span className="vcp-user-role-badge">MARKET_CLIENT_PERSONAL</span>
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
                className="vcp-dropdown-item logout" 
                onClick={() => { 
                  setProfileDropdownOpen(false); 
                  logout(); 
                  navigate('/', { replace: true }); 
                }}
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN SPLIT VIEW CONTAINER ── */}
      <main className="vcp-body-layout">
        {/* Full-bleed Background Image Layer across entire body */}
        <div 
          className="vcp-hero-bg-layer" 
          style={{ backgroundImage: `url("${heroBgImage}")` }}
        />
        <div className="vcp-hero-bg-overlay" />

        {/* ── LEFT HERO PROPERTY SHOWCASE ── */}
        <section className="vcp-hero-side">
          {/* Top Floating Subscription Plan Card (Oculto por defecto / Desplegable) */}
          <div className={`vcp-plan-floating-badge ${isPlanExpanded ? 'is-expanded' : 'is-collapsed'}`}>
            {!isPlanExpanded ? (
              <button 
                type="button" 
                className="vcp-plan-pill-toggle-btn"
                onClick={() => setIsPlanExpanded(true)}
                title="Mostrar información del plan"
              >
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
                </div>

                <div className="vcp-plan-action-row">
                  <SubscriptionCountdown targetDate={subInfo?.subscription_expires_at} />
                  
                  <button 
                    className="vcp-plan-buy-btn"
                    onClick={() => setShowModalCompra(true)}
                  >
                    <Plus size={14} /> COMPRAR PROPIEDAD EXTRA ($79.99)
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

            <h1 className="vcp-prop-main-title">
              {activeProperty?.nombre_propiedad || activeProperty?.nombre || activeProperty?.alias || activeProperty?.titulo || 'MI PROPIEDAD'}
            </h1>

            <div className="vcp-prop-category-label">
              PROPIEDADES
            </div>

            {/* Horizontal Thumbnails Carousel */}
            <div className="vcp-thumbs-track">
              {userPropiedades && userPropiedades.length > 0 ? (
                userPropiedades.map((prop) => {
                  const isActive = prop.id === activeProperty?.id;
                  const thumbImg = getPropImage(prop);
                  return (
                    <div 
                      key={prop.id}
                      className={`vcp-thumb-card ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedPropId(prop.id)}
                      title={prop.nombre_propiedad || prop.nombre || `Propiedad #${prop.id}`}
                    >
                      <img src={thumbImg} alt={prop.nombre_propiedad || 'Propiedad'} className="vcp-thumb-img" />
                    </div>
                  );
                })
              ) : (
                <div 
                  className="vcp-thumb-card active"
                  title="Propiedad de Demostración"
                >
                  <img src={defaultPropImg} alt="Propiedad" className="vcp-thumb-img" />
                </div>
              )}

              {/* Plus Add Property Tile */}
              <div 
                className="vcp-thumb-add-tile"
                title="Registrar / Agregar Propiedad"
                onClick={() => setShowModalRegistroPropiedad(true)}
              >
                <Plus size={28} />
              </div>
            </div>
          </div>
        </section>

        {/* ── RIGHT PROPERTY PROFILE CARD ── */}
        <aside className="vcp-panel-side">
          <div>
            {/* Panel Header */}
            <div className="vcp-panel-header">
              <div className="vcp-panel-header-icon">
                <Building2 size={20} />
              </div>
              <div className="vcp-panel-header-texts">
                <h2 className="vcp-panel-title">PERFIL DE LA PROPIEDAD</h2>
                <span className="vcp-panel-id-badge">
                  ID REGISTRO: #{activeProperty?.id || '001'}
                </span>
              </div>
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
                  <div className="vcp-gps-row" onClick={handleOpenMaps} title="Ver en Google Maps">
                    <span>📍 Ver en Google Maps</span>
                    <ExternalLink size={13} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2x2 Action Buttons Grid */}
          <div className="vcp-actions-grid">
            {/* SOS Button */}
            <button 
              className="vcp-btn vcp-btn-sos"
              onClick={() => navigate('/SOSView', { state: { propiedad: activeProperty } })}
              title="Solicitar Auxilio / SOS Inmediato"
            >
              <AlertTriangle size={17} /> SOS
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

            {/* Agregar Servicio Button */}
            <button 
              className="vcp-btn vcp-btn-service"
              onClick={() => navigate('/tablero-servicios', { state: { selectedPropId: activeProperty?.id } })}
              title="Crear o Solicitar un Nuevo Servicio"
            >
              <Plus size={17} /> AGREGAR SERVICIO
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
    </div>
  );
};

export default VistaClienteParticular;
