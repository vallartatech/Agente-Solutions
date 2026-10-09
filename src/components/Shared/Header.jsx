import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, Shield, User, LogOut } from 'lucide-react'; 
import logo from '../../assets/Logo4.png'; 
import NotificationBell from './NotificationBell';
import ModalCalendarioCliente from '../../portals/AgenteMarket/Cliente/ModalCalendarioCliente';
import TecnicoHeader from './TecnicoHeader';
import MobileBottomNav from './MobileBottomNav';
import axios from 'axios';
import '../../styles/Shared/Header.css';

const MAPA_ROLES = {
  0: "ROOT_MASTER",
  1: "ADMIN_GLOBAL",
  2: "TECNICO_OFICIAL",
  3: "MARKET_CLIENT_PERSONAL",
  4: "AUT_EMPRESARIAL",
  5: "AUT_PERSONAL",
  6: "CONTRATISTA",
  7: "GESTOR_INMUEBLES",
  8: "TECNICO_RED"
};

const Header = ({ activeModule }) => {
  const { user, logoutGlobal, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isTechnician = Boolean(
    user?.role_id === 6 || 
    user?.role_id === 8 || 
    user?.role_id === 2 || 
    location.pathname.includes('/galeria-reportes') || 
    location.pathname.includes('/nuevo-reporte') ||
    location.pathname.includes('/mercado-trabajos')
  );

  if (isTechnician) {
    return <TecnicoHeader activeTab={activeModule || 'tablero'} />;
  }
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [appLogo, setAppLogo] = useState(logo);
  const dropdownRef = useRef(null);

  const fetchDynamicSettings = async () => {
    try {
      const resSettings = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`);
      if (resSettings.data?.logo_url) {
        setAppLogo(resSettings.data.logo_url);
      } else if (resSettings.data?.settings?.appLogo) {
        setAppLogo(resSettings.data.settings.appLogo);
      }
    } catch (error) {
      console.error("Error fetching dynamic header settings", error);
    }
  };

  useEffect(() => {
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
    return 'USUARIO';
  }, [user]);

  const userRoleLabel = useMemo(() => {
    return MAPA_ROLES[user?.role_id] || "USUARIO";
  }, [user]);

  const userAvatar = user?.profile_picture || user?.avatar_url || user?.foto || null;
  const userInitial = user?.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : (user?.name ? user.name.charAt(0).toUpperCase() : (user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'));

  const currentPath = location.pathname.toLowerCase();

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

        {/* SECCIÓN CENTRAL: Navegación Principal (INICIO + 5 módulos) */}
        <nav className="vcp-header-nav">
          <button
            type="button"
            className="vcp-nav-btn"
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
            className={`vcp-nav-btn ${isReportesActive ? 'active' : ''}`}
            onClick={() => navigate('/reportes-globales')}
          >
            REPORTE
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isCotizacionesActive ? 'active' : ''}`}
            onClick={() => navigate('/vista-cotizaciones')}
          >
            COTIZACION
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isServiciosActive ? 'active' : ''}`}
            onClick={() => navigate('/tablero-servicios')}
          >
            SERVICIOS
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isMercadoActive ? 'active' : ''}`}
            onClick={() => navigate('/red-autonomos')}
          >
            MERCADO / RED
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

          {profileDropdownOpen && (
            <div className="vcp-profile-dropdown">
              <div className="vcp-dropdown-user-header">
                <div className="vcp-dropdown-role-pill">
                  <Shield size={12} className="vcp-dropdown-role-icon" />
                  <span>{userRoleLabel}</span>
                </div>
                <div className="vcp-dropdown-user-name">{userFullName}</div>
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
                className="vcp-dropdown-item logout"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  handleCerrarSesion();
                }}
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>

        {/* MODAL GLOBAL DE CALENDARIO DE CLIENTE */}
        <ModalCalendarioCliente 
          isOpen={mostrarCalendario} 
          onClose={() => setMostrarCalendario(false)} 
        />
      </header>

      {/* BARRA DE NAVEGACIÓN INFERIOR RESPONSIVA (SOLO ICONOS) */}
      <MobileBottomNav activeModule={activeModule} />
    </>
  );
};

export default Header;