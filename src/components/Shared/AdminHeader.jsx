import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, Shield, User, LogOut, Navigation, ReceiptText, Globe, ChevronDown, ArrowLeft } from 'lucide-react';
import defaultLogo from '../../assets/Logo4.png'; 
import NotificationBell from './NotificationBell';
import BotonChats from './BotonChats';
import ModalCalendarioSolutions from '../../portals/AgenteSolutions/Shared/ModalCalendarioSolutions';
import MobileBottomNav from './MobileBottomNav';
import axios from 'axios';
import { obtenerEstadoUbicacion, suscribirEstadoUbicacion } from './ubicacionService';
import '../../styles/Shared/Header.css';
import '../../styles/Shared/EncabezadoMovil.css';

// navTabs (opcional): reemplaza el menú principal por pestañas propias de la vista,
// ej. [{ key, label, Icon, active, onClick }]. navBack: { label, onClick } para regresar.
const AdminHeader = ({ activeModule, navTabs, navBack }) => {
  const { user, logoutGlobal, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [appLogo, setAppLogo] = useState(defaultLogo);
  const [canViewMap, setCanViewMap] = useState(false);
  const dropdownRef = useRef(null);
  const masBtnRef = useRef(null);
  const [masAbierto, setMasAbierto] = useState(false);
  const [masPos, setMasPos] = useState(null);

  // El menú "Más" se cierra al navegar, con Escape o si la ventana cambia de tamaño
  useEffect(() => { setMasAbierto(false); }, [location.pathname]);
  useEffect(() => {
    if (!masAbierto) return;
    const cerrar = () => setMasAbierto(false);
    const onKey = (e) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('resize', cerrar);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', cerrar);
      document.removeEventListener('keydown', onKey);
    };
  }, [masAbierto]);

  // Botón del mapa del equipo: solo para usuarios autorizados (el backend también lo valida)
  useEffect(() => {
    let active = true;
    obtenerEstadoUbicacion().then(estado => { if (active) setCanViewMap(Boolean(estado?.can_view_map)); });
    const unsub = suscribirEstadoUbicacion(estado => setCanViewMap(Boolean(estado?.can_view_map)));
    return () => { active = false; unsub(); };
  }, [user?.id]);

  // Logo dinámico
  useEffect(() => {
    const fetchDynamicSettings = async () => {
      try {
        const resSettings = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`);
        if (resSettings.data?.logo_url) {
          setAppLogo(resSettings.data.logo_url);
        } else if (resSettings.data?.settings?.appLogo) {
          setAppLogo(resSettings.data.settings.appLogo);
        }
      } catch {
        // silent fallback
      }
    };
    fetchDynamicSettings();
    window.addEventListener('settings-updated', fetchDynamicSettings);
    return () => window.removeEventListener('settings-updated', fetchDynamicSettings);
  }, []);

  // Cierre de dropdown al hacer clic fuera
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

  const handleCerrarSesion = () => {
    if (logoutGlobal) logoutGlobal();
    else if (logout) logout();
    navigate("/", { replace: true });
  };

  const irAlInicio = () => {
    navigate('/VistaRoot');
  };

  const userFullName = useMemo(() => {
    const parts = [user?.first_name, user?.last_name].filter(Boolean);
    if (parts.length > 0) return parts.join(' ').toUpperCase();
    if (user?.name) return user.name.toUpperCase();
    return 'ADMINISTRADOR';
  }, [user]);

  const userRoleLabel = Number(user?.role_id) === 0 ? "ROOT MASTER" : "ADMIN GLOBAL";
  const userAvatar = user?.profile_picture || user?.avatar_url || user?.foto || null;
  const userInitial = user?.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : (user?.name ? user.name.charAt(0).toUpperCase() : 'A');

  const currentPath = (location.pathname || '').toLowerCase();

  const isRoot = Number(user?.role_id) === 0;

  const isInicioActive = activeModule === 'inicio' || currentPath === '/vistaroot' || currentPath === '/vistaadmin';
  const isUsuariosActive = activeModule === 'usuarios' || currentPath.includes('/usuarios');
  // Propiedades y Levantamientos comparten un botón; dentro se cambia con el selector de la vista
  const isPropLevActive = activeModule === 'propiedades' || activeModule === 'levantamientos'
    || ((currentPath.includes('/propiedades') || currentPath.includes('/levantamientos')));
  // Reportes y Cotizaciones comparten un botón; dentro se cambia con el selector de la vista
  const isReporteCotizacionActive = activeModule === 'reportes' || activeModule === 'cotizaciones'
    || currentPath.includes('/reporte') || currentPath.includes('/cotizacion');
  const isServiciosActive = activeModule === 'servicios' || currentPath.includes('/tablero-servicios') || currentPath.includes('/servicios');
  const isMercadoActive = activeModule === 'mercado' || currentPath.includes('/red-autonomos');
  const isMapaActive = activeModule === 'mapa' || currentPath.includes('/mapa-equipo');

  const masItems = [
    // Mapa en vivo: propiedades para Root/Admin y, con permiso de ubicación, el equipo
    { key: 'mapa', label: 'Mapa en vivo', Icon: Navigation, path: '/mapa-equipo', active: isMapaActive },
    ...(isRoot ? [{ key: 'mercado', label: 'Mercado / Red', Icon: Globe, path: '/red-autonomos', active: isMercadoActive }] : [])
  ];
  const masActivo = masItems.find(i => i.active);

  const toggleMas = () => {
    const r = masBtnRef.current?.getBoundingClientRect();
    if (r) setMasPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 240) });
    setMasAbierto(v => !v);
  };

  return (
    <>
      <header className="vcp-header">
        {/* LOGO */}
        <div className="vcp-header-left">
          <img
            src={appLogo}
            alt="Agente Solutions Logo"
            className="vcp-brand-logo"
            onClick={irAlInicio}
            title="Ir al Inicio"
          />
        </div>

        {navTabs ? (
          <nav className="vcp-header-nav vcp-header-nav-tabs">
            {navBack && (
              <button type="button" className="vcp-nav-btn vcp-nav-back" onClick={navBack.onClick}>
                <ArrowLeft size={15} strokeWidth={2.6} /> {navBack.label}
              </button>
            )}
            {navTabs.map(({ key, label, Icon, active, onClick }) => (
              <button
                key={key}
                type="button"
                className={`vcp-nav-btn ${active ? 'active' : ''}`}
                onClick={onClick}
              >
                {Icon && <Icon size={15} strokeWidth={2.4} />} {label}
              </button>
            ))}
          </nav>
        ) : (
        /* NAVEGACIÓN PRINCIPAL DEL ADMIN (ROL 1 / ROL 0) */
        <nav className="vcp-header-nav">
          <button
            type="button"
            className={`vcp-nav-btn ${isInicioActive ? 'active' : ''}`}
            onClick={irAlInicio}
          >
            INICIO
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isUsuariosActive ? 'active' : ''}`}
            onClick={() => navigate('/usuarios')}
          >
            USUARIOS
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isPropLevActive ? 'active' : ''}`}
            onClick={() => navigate('/propiedades')}
          >
            PROPIEDADES Y LEVANTAMIENTOS
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isReporteCotizacionActive ? 'active' : ''}`}
            onClick={() => navigate('/vista-cotizaciones')}
          >
            COTIZACIÓN Y REPORTE
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isServiciosActive ? 'active' : ''}`}
            onClick={() => navigate('/tablero-servicios')}
          >
            SERVICIOS
          </button>

          {/* Apartados secundarios agrupados para que el menú no se amontone.
              Si solo hay uno (Admin), va directo: un menú con una sola opción no aporta nada */}
          {masItems.length === 1 ? (
            <button
              type="button"
              className={`vcp-nav-btn ${masItems[0].active ? 'active' : ''}`}
              onClick={() => navigate(masItems[0].path)}
            >
              {masItems[0].label.toUpperCase()}
            </button>
          ) : (
          <button
            type="button"
            ref={masBtnRef}
            className={`vcp-nav-btn vcp-more-trigger ${masActivo ? 'active' : ''} ${masAbierto ? 'open' : ''}`}
            onClick={toggleMas}
            aria-haspopup="menu"
            aria-expanded={masAbierto}
          >
            {masActivo ? (
              <>
                <span className="vcp-more-label-full">{masActivo.label.toUpperCase()}</span>
                <span className="vcp-more-label-short">MÁS</span>
              </>
            ) : 'MÁS'}
            <ChevronDown size={14} strokeWidth={2.6} className="vcp-more-chevron" />
          </button>
          )}
        </nav>
        )}

        {/* SECCIÓN DERECHA: Calendario + Notificaciones + Perfil */}
        <div className="vcp-header-right" ref={dropdownRef}>
          <div className="vcp-header-actions-group">
            <button
              type="button"
              className="vcp-nav-icon-btn"
              title="Abrir Calendario y Citas"
              onClick={() => setMostrarCalendario(true)}
            >
              <CalendarDays size={18} strokeWidth={2.2} />
            </button>

            <BotonChats />

            <NotificationBell />
          </div>

          <button
            type="button"
            className="vcp-avatar-btn"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            title="Opciones de sesión"
            aria-label="Perfil"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Avatar" className="vcp-avatar-img" />
            ) : (
              <div className="vcp-avatar-initial">{userInitial}</div>
            )}
          </button>
        </div>
      </header>

      {/* MENÚ "MÁS" (en portal: la barra de navegación recorta lo que se sale de ella) */}
      {masAbierto && masPos && createPortal(
        <div className="vcp-more-root">
          <div className="vcp-more-backdrop" onClick={() => setMasAbierto(false)} />
          <div className="vcp-more-menu" role="menu" style={{ top: masPos.top, left: masPos.left }}>
            {masItems.map(({ key, label, Icon, path, active }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                className={`vcp-more-item ${active ? 'active' : ''}`}
                onClick={() => { setMasAbierto(false); navigate(path); }}
              >
                <Icon size={17} /> {label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* MODAL GLOBAL DE CALENDARIO */}
      <ModalCalendarioSolutions 
        isOpen={mostrarCalendario} 
        onClose={() => setMostrarCalendario(false)} 
      />

      {/* PORTAL DE PERFIL FLOTANTE */}
      {profileDropdownOpen && createPortal(
        <div className="vcp-profile-portal-root">
          <div 
            className="vcp-profile-backdrop" 
            onClick={() => setProfileDropdownOpen(false)}
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
              onClick={() => { setProfileDropdownOpen(false); navigate('/mi-perfil'); }}
            >
              <User size={16} /> Mi Perfil
            </button>
            <button
              type="button"
              className="vcp-dropdown-item"
              onClick={() => { setProfileDropdownOpen(false); navigate('/comprobantes'); }}
            >
              <ReceiptText size={16} /> Comprobantes
            </button>
            {canViewMap && (
              <button
                type="button"
                className="vcp-dropdown-item"
                onClick={() => { setProfileDropdownOpen(false); navigate('/mapa-equipo'); }}
              >
                <Navigation size={16} /> Mapa en vivo
              </button>
            )}
            <button
              type="button"
              className="vcp-dropdown-item logout"
              onClick={() => {
                setProfileDropdownOpen(false);
                handleCerrarSesion();
              }}
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* BARRA DE NAVEGACIÓN INFERIOR RESPONSIVA */}
      <MobileBottomNav activeModule={activeModule} />
    </>
  );
};

export default AdminHeader;
