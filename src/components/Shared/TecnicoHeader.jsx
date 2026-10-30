import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, ShieldCheck, User, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import defaultLogo from '../../assets/Logo4.png';
import ModalCalendarioCliente from '../../portals/AgenteMarket/Cliente/ModalCalendarioCliente';
import ModalCalendarioSolutions from '../../portals/AgenteSolutions/Shared/ModalCalendarioSolutions';
import NotificationBell from './NotificationBell';
import BotonChats from './BotonChats';
import MobileBottomNav from './MobileBottomNav';
import axios from 'axios';
import { NOMBRES_ROLES } from '../../utils/roles';
import '../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';
import '../../styles/Shared/EncabezadoMovil.css';

const TecnicoHeader = ({ activeTab = 'tablero', onTabChange, acceptedCount, usersCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutGlobal } = useAuth();
  const authUser = user;

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const appLogo = defaultLogo;
  const [liveAcceptedCount, setLiveAcceptedCount] = useState(acceptedCount ?? 0);
  const [liveUsersCount, setLiveUsersCount] = useState(usersCount ?? 0);
  const dropdownRef = useRef(null);

  // Sync dynamic counts if not provided via props
  useEffect(() => {
    if (acceptedCount !== undefined) {
      setLiveAcceptedCount(acceptedCount);
    }
  }, [acceptedCount]);

  useEffect(() => {
    if (usersCount !== undefined) {
      setLiveUsersCount(usersCount);
    }
  }, [usersCount]);

  // If counts not supplied, fetch lightly from backend
  useEffect(() => {
    if (acceptedCount === undefined || usersCount === undefined) {
      const fetchCounts = async () => {
        try {
          const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos`, { headers });
          if (res.data?.success) {
            const accepted = res.data.accepted_jobs || [];
            if (acceptedCount === undefined) setLiveAcceptedCount(accepted.length);
            if (usersCount === undefined) {
              const uniqueClients = new Set(accepted.map(j => j.client_phone || j.client_name || j.cliente).filter(Boolean));
              setLiveUsersCount(uniqueClients.size || accepted.length);
            }
          }
        } catch {
          // silent fallback
        }
      };
      fetchCounts();
    }
  }, [acceptedCount, usersCount]);

  const handleSelectTab = (tabKey) => {
    if (onTabChange) {
      onTabChange(tabKey);
    } else {
      navigate('/mercado-trabajos', { state: { view: tabKey } });
    }
  };

  const currentPath = (location.pathname || '').toLowerCase();
  const currentView = location.state?.view;

  const irAlInicio = () => {
    if (!authUser) return navigate('/');
    const role = Number(authUser.role_id);
    if (role === 2) {
      navigate('/VistaTecnico');
    } else if (role === 6 || role === 8) {
      if (onTabChange) {
        onTabChange('mercado');
      } else {
        navigate('/mercado-trabajos', { state: { view: 'mercado' } });
      }
    } else {
      navigate('/');
    }
  };

  const isRol2 = Number(authUser?.role_id) === 2;

  const isPerfilActive = currentPath === '/mi-perfil' || currentPath === '/profile';
  const isInicioActive = !isPerfilActive && (activeTab === 'inicio' || currentPath === '/vistatecnico');
  const isTrabajosActive = !isPerfilActive && !isInicioActive && (activeTab === 'trabajos' || currentPath.includes('/trabajos-tecnico'));
  const isLevantamientosActive = !isPerfilActive && !isInicioActive && (activeTab === 'levantamientos' || currentPath.includes('/trabajos-asignados') || currentPath.includes('/registrozonas') || currentPath.includes('/detallehabitacion'));
  const isCotizacionesActive = !isPerfilActive && !isInicioActive && (activeTab === 'cotizaciones' || currentPath.includes('/vista-cotizaciones') || currentPath.includes('/cotizacion'));

  const isMercadoActive = !isPerfilActive && !isInicioActive && (activeTab === 'mercado' || currentView === 'mercado' || (currentPath.includes('/mercado-trabajos') && currentView !== 'tablero' && currentView !== 'usuarios'));
  const isTableroActive = !isPerfilActive && !isInicioActive && (activeTab === 'tablero' || currentView === 'tablero' || currentPath.includes('/tablero-servicios'));
  const isUsuariosActive = !isPerfilActive && !isInicioActive && (activeTab === 'usuarios' || currentView === 'usuarios' || currentPath.includes('/usuarios'));

  const userInitial = authUser?.name ? authUser.name.charAt(0).toUpperCase() : (authUser?.first_name ? authUser.first_name.charAt(0).toUpperCase() : 'T');
  const userFullName = authUser?.name || (authUser?.first_name ? `${authUser.first_name} ${authUser.last_name || ''}`.trim() : 'TÉCNICO OFICIAL');
  const userRole = NOMBRES_ROLES[authUser?.role_id] || 'TÉCNICO';
  const userAvatar = authUser?.profile_picture || authUser?.avatar_url || authUser?.avatar || null;

  return (
    <>
      <header className="vcp-header">
        {/* Logo */}
        <div className="vcp-header-left">
          <img 
            src={appLogo} 
            alt="Agente Logo" 
            className="vcp-brand-logo"
            onClick={irAlInicio} 
            title="Ir al Inicio"
          />
        </div>

        {/* Center Nav Links */}
        <nav className="vcp-header-nav">
          {isRol2 ? (
            /* Menú para Técnico Oficial Rol 2 (Coincide con sus 3 tarjetas operativas) */
            <>
              <button 
                type="button" 
                className={`vcp-nav-btn ${isInicioActive ? 'active' : ''}`}
                onClick={() => navigate('/VistaTecnico')}
                title="Inicio"
              >
                <span className="vcp-tab-full">INICIO</span>
                <span className="vcp-tab-short">INICIO</span>
              </button>

              <button 
                type="button" 
                className={`vcp-nav-btn ${isTrabajosActive ? 'active' : ''}`}
                onClick={() => navigate('/trabajos-tecnico')}
                title="Trabajos"
              >
                <span className="vcp-tab-full">TRABAJOS</span>
                <span className="vcp-tab-short">TRABAJOS</span>
              </button>

              <button 
                type="button" 
                className={`vcp-nav-btn ${isLevantamientosActive ? 'active' : ''}`}
                onClick={() => navigate('/trabajos-asignados')}
                title="Levantamientos"
              >
                <span className="vcp-tab-full">LEVANTAMIENTOS</span>
                <span className="vcp-tab-short">LEVANTAMIENTOS</span>
              </button>

              <button 
                type="button" 
                className={`vcp-nav-btn ${isCotizacionesActive ? 'active' : ''}`}
                onClick={() => navigate('/vista-cotizaciones')}
                title="Cotizaciones"
              >
                <span className="vcp-tab-full">COTIZACIONES</span>
                <span className="vcp-tab-short">COTIZACIONES</span>
              </button>

              <button
                type="button"
                className={`vcp-nav-btn ${currentPath.includes('/comprobantes') ? 'active' : ''}`}
                onClick={() => navigate('/comprobantes')}
                title="Comprobantes"
              >
                <span className="vcp-tab-full">COMPROBANTES</span>
                <span className="vcp-tab-short">COMPROBANTES</span>
              </button>
            </>
          ) : (
            /* Menú para Técnicos Independientes de la Red (Roles 6 y 8): no tienen pantalla de inicio */
            <>
              <button 
                type="button" 
                className={`vcp-nav-btn ${isMercadoActive ? 'active' : ''}`}
                onClick={() => handleSelectTab('mercado')}
                title="Mercado de solicitudes"
              >
                <span className="vcp-tab-full">MERCADO (SOLICITUDES)</span>
                <span className="vcp-tab-short">MERCADO</span>
              </button>

              <button 
                type="button" 
                className={`vcp-nav-btn ${isTableroActive ? 'active' : ''}`}
                onClick={() => handleSelectTab('tablero')}
                title="Trabajos aceptados"
              >
                <span className="vcp-tab-full">TRABAJOS ACEPTADOS{liveAcceptedCount > 0 ? ` (${liveAcceptedCount})` : ''}</span>
                <span className="vcp-tab-short">ACEPTADOS{liveAcceptedCount > 0 ? ` (${liveAcceptedCount})` : ''}</span>
              </button>

              <button 
                type="button" 
                className={`vcp-nav-btn ${isUsuariosActive ? 'active' : ''}`}
                onClick={() => handleSelectTab('usuarios')}
                title="Mis clientes"
              >
                <span className="vcp-tab-full">MIS CLIENTES{liveUsersCount > 0 ? ` (${liveUsersCount})` : ''}</span>
                <span className="vcp-tab-short">CLIENTES{liveUsersCount > 0 ? ` (${liveUsersCount})` : ''}</span>
              </button>
            </>
          )}
        </nav>

        {/* User profile avatar section & action icons */}
        <div className="vcp-header-right" ref={dropdownRef}>
          <div className="vcp-header-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button"
              className="vcp-header-icon-btn vcp-nav-icon-btn" 
              title="Abrir Calendario y Citas"
              onClick={() => setShowModalCalendario(true)}
            >
              <CalendarDays size={18} color="#ffffff" strokeWidth={2.2} />
            </button>

            <BotonChats className="vcp-header-icon-btn vcp-nav-icon-btn" />

            <NotificationBell triggerClassName="vcp-header-icon-btn vcp-nav-icon-btn" />
          </div>

          <button 
            type="button"
            className="vcp-avatar-btn" 
            onClick={(e) => {
              e.stopPropagation();
              setProfileDropdownOpen(prev => !prev);
            }}
            aria-label="Perfil de usuario"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Avatar" className="vcp-avatar-img" />
            ) : (
              <div className="vcp-avatar-initial">{userInitial}</div>
            )}
          </button>
        </div>
      </header>

      {/* Global Profile Dropdown Modal Portal */}
      {profileDropdownOpen && createPortal(
        <div className="tecnico-profile-portal-root">
          {/* Full Screen Dimmed Backdrop */}
          <div 
            className="tecnico-profile-backdrop" 
            onClick={() => setProfileDropdownOpen(false)}
          />

          {/* Floating Dropdown Card */}
          <div 
            className="tecnico-profile-dropdown" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tecnico-dropdown-user-header">
              <div className="tecnico-dropdown-role-pill">
                <ShieldCheck size={12} className="tecnico-dropdown-role-icon" />
                <span>{userRole}</span>
              </div>
              <div className="tecnico-dropdown-user-name">{userFullName}</div>
              {authUser?.email && (
                <div className="tecnico-dropdown-user-email">{authUser.email}</div>
              )}
            </div>

            <button 
              type="button"
              className="tecnico-dropdown-item" 
              onClick={() => {
                setProfileDropdownOpen(false);
                irAlInicio();
              }}
            >
              <User size={16} /> Ir a Inicio
            </button>
            <button 
              type="button"
              className="tecnico-dropdown-item" 
              onClick={() => {
                setProfileDropdownOpen(false);
                navigate('/mi-perfil');
              }}
            >
              <User size={16} /> Mi Perfil
            </button>
            <button 
              type="button"
              className="tecnico-dropdown-item" 
              onClick={() => {
                setProfileDropdownOpen(false);
                setShowModalCalendario(true);
              }}
            >
              <Calendar size={16} /> Ver Calendario
            </button>
            <div className="tecnico-dropdown-divider" />
            <button 
              type="button"
              className="tecnico-dropdown-item logout" 
              onClick={() => { 
                setProfileDropdownOpen(false); 
                if (logoutGlobal) logoutGlobal();
                navigate('/', { replace: true }); 
              }}
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Global Calendar Modal: 0-3 Solutions vs 4+ Market */}
      {Number(authUser?.role_id) <= 3 ? (
        <ModalCalendarioSolutions 
          isOpen={showModalCalendario} 
          onClose={() => setShowModalCalendario(false)} 
        />
      ) : (
        <ModalCalendarioCliente 
          isOpen={showModalCalendario} 
          onClose={() => setShowModalCalendario(false)} 
        />
      )}

      {/* Responsive Bottom Dock Navigation (Only Icons) */}
      <MobileBottomNav activeModule={activeTab} onTabChange={onTabChange} />
    </>
  );
};

export default TecnicoHeader;
