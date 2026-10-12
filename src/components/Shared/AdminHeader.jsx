import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, Shield, User, LogOut } from 'lucide-react'; 
import defaultLogo from '../../assets/Logo4.png'; 
import NotificationBell from './NotificationBell';
import ModalCalendarioCliente from '../../portals/AgenteMarket/Cliente/ModalCalendarioCliente';
import MobileBottomNav from './MobileBottomNav';
import axios from 'axios';
import '../../styles/Shared/Header.css';

const AdminHeader = ({ activeModule, titulo, rolTexto }) => {
  const { user, logoutGlobal, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [appLogo, setAppLogo] = useState(defaultLogo);
  const dropdownRef = useRef(null);

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
      } catch (error) {
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
  const isPropiedadesActive = activeModule === 'propiedades' || currentPath.includes('/propiedades');
  const isLevantamientosActive = activeModule === 'levantamientos' || currentPath.includes('/levantamientos');
  const isReportesActive = activeModule === 'reportes' || currentPath.includes('/reporte');
  const isCotizacionesActive = activeModule === 'cotizaciones' || currentPath.includes('/cotizacion');
  const isServiciosActive = activeModule === 'servicios' || currentPath.includes('/tablero-servicios') || currentPath.includes('/servicios');
  const isMercadoActive = activeModule === 'mercado' || currentPath.includes('/red-autonomos');

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

        {/* NAVEGACIÓN PRINCIPAL DEL ADMIN (ROL 1 / ROL 0) */}
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
            className={`vcp-nav-btn ${isPropiedadesActive ? 'active' : ''}`}
            onClick={() => navigate('/propiedades')}
          >
            PROPIEDADES
          </button>

          <button
            type="button"
            className={`vcp-nav-btn ${isLevantamientosActive ? 'active' : ''}`}
            onClick={() => navigate('/levantamientos')}
          >
            LEVANTAMIENTOS
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

          {isRoot && (
            <button
              type="button"
              className={`vcp-nav-btn ${isMercadoActive ? 'active' : ''}`}
              onClick={() => navigate('/red-autonomos')}
            >
              MERCADO / RED
            </button>
          )}
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
        </div>
      </header>

      {/* MODAL GLOBAL DE CALENDARIO */}
      <ModalCalendarioCliente 
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
