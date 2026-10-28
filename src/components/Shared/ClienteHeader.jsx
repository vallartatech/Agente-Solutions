import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  CalendarDays, 
  Shield, 
  User, 
  LogOut, 
  Home, 
  Users, 
  FileText, 
  Receipt, 
  Wrench, 
  Globe 
} from 'lucide-react'; 
import logo from '../../assets/Logo4.png'; 
import NotificationBell from './NotificationBell';
import ModalCalendarioCliente from '../../portals/AgenteMarket/Cliente/ModalCalendarioCliente';
import ModalCalendarioSolutions from '../../portals/AgenteSolutions/Shared/ModalCalendarioSolutions';
import MobileBottomNav from './MobileBottomNav';
import axios from 'axios';
import { NOMBRES_ROLES } from '../../utils/roles';
import '../../styles/Shared/Header.css';
import '../../styles/Shared/EncabezadoMovil.css';

const ClienteHeader = ({ activeModule }) => {
  const { user, logout, logoutGlobal } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [appLogo, setAppLogo] = useState(logo);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchDynamicSettings = async () => {
      try {
        const resSettings = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`);
        if (resSettings.data?.logo_url) {
          setAppLogo(resSettings.data.logo_url);
        } else if (resSettings.data?.settings?.appLogo) {
          setAppLogo(resSettings.data.settings.appLogo);
        }
      } catch (err) {
        console.warn("No se pudo cargar la configuración dinámica de marca:", err);
      }
    };

    fetchDynamicSettings();
    window.addEventListener('settings-updated', fetchDynamicSettings);
    return () => window.removeEventListener('settings-updated', fetchDynamicSettings);
  }, []);

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
    if (!user) return navigate('/');
    const role = Number(user.role_id);
    if (role === 0 || role === 1) navigate('/VistaRoot');
    else if (role === 4 || role === 5 || role === 7 || role === 3) navigate('/VistaMarket');
    else if (role === 2) navigate('/VistaTecnico');
    else if (role === 6 || role === 8) navigate('/mercado-trabajos');
    else navigate('/');
  };

  const userFullName = useMemo(() => {
    const parts = [user?.first_name, user?.last_name].filter(Boolean);
    if (parts.length > 0) return parts.join(' ').toUpperCase();
    if (user?.name) return user.name.toUpperCase();
    if (user?.nombre) return user.nombre.toUpperCase();
    return 'CLIENTE';
  }, [user]);

  const userRoleLabel = useMemo(() => {
    return NOMBRES_ROLES[user?.role_id] || "CLIENTE";
  }, [user]);

  const userAvatar = user?.profile_picture || user?.avatar_url || user?.foto || null;
  const userInitial = user?.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : (user?.name ? user.name.charAt(0).toUpperCase() : (user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'C'));

  const currentPath = (location.pathname || '').toLowerCase();

  const isInicioActive = activeModule === 'inicio' || currentPath === '/vistamarket' || currentPath === '/vistainiciocliente';
  const isUsuariosActive = activeModule === 'usuarios' || currentPath.includes('/usuarios');
  const isReportesActive = activeModule === 'reportes' || currentPath.includes('/reporte');
  const isCotizacionesActive = activeModule === 'cotizaciones' || currentPath.includes('/cotizacion');
  const isServiciosActive = activeModule === 'servicios' || currentPath.includes('/tablero-servicios') || currentPath.includes('/servicios');
  const isMercadoActive = activeModule === 'mercado' || currentPath.includes('/red-autonomos') || currentPath.includes('/mercado');

  return (
    <>
      <header className="vcp-header">
        {/* SECCIÓN IZQUIERDA: Logo */}
        <div className="vcp-header-left">
          <img
            src={appLogo}
            alt="Agente Solutions Logo"
            className="vcp-brand-logo"
            onClick={irAlInicio}
            title="Ir al Inicio"
          />
        </div>

        {/* SECCIÓN CENTRAL: Navegación Principal con Iconos */}
        <nav className="vcp-header-nav">
          <button
            type="button"
            className={`vcp-nav-btn ${isInicioActive ? 'active' : ''}`}
            onClick={irAlInicio}
            title="Inicio"
          >
            <Home size={18} className="vcp-nav-icon" />
            <span className="vcp-nav-text">INICIO</span>
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isUsuariosActive ? 'active' : ''}`}
            onClick={() => navigate('/usuarios')}
            title="Usuarios"
          >
            <Users size={18} className="vcp-nav-icon" />
            <span className="vcp-nav-text">USUARIOS</span>
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isReportesActive ? 'active' : ''}`}
            onClick={() => navigate('/reportes-globales')}
            title="Reportes"
          >
            <FileText size={18} className="vcp-nav-icon" />
            <span className="vcp-nav-text">REPORTES</span>
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isCotizacionesActive ? 'active' : ''}`}
            onClick={() => navigate('/vista-cotizaciones')}
            title="Cotización"
          >
            <Receipt size={18} className="vcp-nav-icon" />
            <span className="vcp-nav-text">COTIZACIÓN</span>
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isServiciosActive ? 'active' : ''}`}
            onClick={() => navigate('/tablero-servicios')}
            title="Servicios"
          >
            <Wrench size={18} className="vcp-nav-icon" />
            <span className="vcp-nav-text">SERVICIOS</span>
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isMercadoActive ? 'active' : ''}`}
            onClick={() => navigate('/red-autonomos')}
            title="Mercado"
          >
            <Globe size={18} className="vcp-nav-icon" />
            <span className="vcp-nav-text">MERCADO</span>
          </button>
        </nav>

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

            <NotificationBell />
          </div>

          <button
            type="button"
            className={`vcp-avatar-btn ${profileDropdownOpen ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setProfileDropdownOpen((prev) => !prev);
            }}
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

      {/* MODAL GLOBAL DE CALENDARIO: 0-3 Solutions vs 4+ Market */}
      {Number(user?.role_id) <= 3 ? (
        <ModalCalendarioSolutions
          isOpen={mostrarCalendario}
          onClose={() => setMostrarCalendario(false)}
        />
      ) : (
        <ModalCalendarioCliente
          isOpen={mostrarCalendario}
          onClose={() => setMostrarCalendario(false)}
        />
      )}

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
              onClick={() => {
                setProfileDropdownOpen(false);
                navigate('/mi-perfil');
              }}
            >
              <User size={16} /> Mi Perfil
            </button>
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

export default ClienteHeader;
