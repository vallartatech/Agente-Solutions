import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, ShieldCheck, User, Users, Calendar, LogOut, HardHat, UserPlus, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import defaultLogo from '../../assets/Logo4.png';
import ModalCalendarioCliente from '../../portals/AgenteMarket/Cliente/ModalCalendarioCliente';
import ModalCalendarioSolutions from '../../portals/AgenteSolutions/Shared/ModalCalendarioSolutions';
import NotificationBell from './NotificationBell';
import BotonChats from './BotonChats';
import MobileBottomNav from './MobileBottomNav';
import axios from 'axios';
import { NOMBRES_ROLES } from '../../utils/roles';
import { esTecnicoRed, esContratista, cotizaEnRed } from '../../utils/entorno';
import { mostrarAviso, confirmarAccion, pedirTexto } from '../../utils/dialogos';
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
    } else if (esTecnicoRed(authUser)) {
      // El técnico de cuadrilla (8) no ve la red: su inicio es el tablero
      const vista = cotizaEnRed(authUser) ? 'mercado' : 'tablero';
      if (onTabChange) {
        onTabChange(vista);
      } else {
        navigate('/mercado-trabajos', { state: { view: vista } });
      }
    } else {
      navigate('/');
    }
  };

  const isRol2 = Number(authUser?.role_id) === 2;
  const rolTecnico = Number(authUser?.role_id);

  // Técnico independiente (6): pide unirse a una cuadrilla con el código del contratista
  const unirmeACuadrilla = async () => {
    const codigo = await pedirTexto('Escribe el código de la cuadrilla. Si el contratista te acepta, recibirás los trabajos que te asigne y dejarás de cotizar por tu cuenta. Tus calificaciones se conservan.');
    if (!codigo?.trim()) return;
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cuadrilla/unirme`, { codigo: codigo.trim() });
      mostrarAviso(data.message, 'success');
    } catch (e) {
      mostrarAviso(e.response?.data?.error || 'No se pudo enviar tu solicitud.', 'error');
    }
  };

  // Técnico de cuadrilla (8): pide acceso a la red (rol 9) para trabajar también por su cuenta
  const pedirAccesoRed = async () => {
    const ok = await confirmarAccion(
      'Con el acceso a la red, además de los trabajos de tu contratista, podrás ver el Mercado y cotizar por tu cuenta. Tiene un costo extra. ¿Quieres solicitarlo?',
      { titulo: 'Acceso a la red', confirmar: 'Sí, solicitarlo', peligro: false }
    );
    if (!ok) return;
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cuadrilla/solicitar-red`);
      mostrarAviso(data.message, 'success');
    } catch (e) {
      mostrarAviso(e.response?.status === 429 ? 'Ya enviaste esta solicitud. Te contactaremos pronto.' : (e.response?.data?.error || 'No se pudo enviar tu solicitud.'), 'error');
    }
  };

  const isPerfilActive = currentPath === '/mi-perfil' || currentPath === '/profile';
  const isInicioActive = !isPerfilActive && (activeTab === 'inicio' || currentPath === '/vistatecnico');
  const isTrabajosActive = !isPerfilActive && !isInicioActive && (activeTab === 'trabajos' || currentPath.includes('/trabajos-tecnico'));
  const isLevantamientosActive = !isPerfilActive && !isInicioActive && (activeTab === 'levantamientos' || currentPath.includes('/trabajos-asignados') || currentPath.includes('/registrozonas') || currentPath.includes('/detallehabitacion'));
  const isCotizacionesActive = !isPerfilActive && !isInicioActive && (activeTab === 'cotizaciones' || currentPath.includes('/vista-cotizaciones') || currentPath.includes('/cotizacion'));

  // Dentro del Mercado la vista real la indica la pantalla (onTabChange); la ruta siempre es la misma
  const isMercadoActive = !isPerfilActive && !isInicioActive && (onTabChange ? activeTab === 'mercado' : (activeTab === 'mercado' || currentView === 'mercado' || (currentPath.includes('/mercado-trabajos') && currentView !== 'tablero' && currentView !== 'usuarios')));
  const isTableroActive = !isPerfilActive && !isInicioActive && (onTabChange ? activeTab === 'tablero' : (activeTab === 'tablero' || currentView === 'tablero' || currentPath.includes('/tablero-servicios')));
  const isUsuariosActive = !isPerfilActive && !isInicioActive && (onTabChange ? activeTab === 'usuarios' : (activeTab === 'usuarios' || currentView === 'usuarios' || currentPath.includes('/usuarios')));

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
            /* Menú para los Técnicos de la Red (Roles 6, 7 y 8): no tienen pantalla de inicio */
            <>
              {/* El técnico de cuadrilla (8) no ve la red */}
              {cotizaEnRed(authUser) && (
                <button 
                  type="button" 
                  className={`vcp-nav-btn ${isMercadoActive ? 'active' : ''}`}
                  onClick={() => handleSelectTab('mercado')}
                  title="Mercado de solicitudes"
                >
                  <span className="vcp-tab-full">MERCADO (SOLICITUDES)</span>
                  <span className="vcp-tab-short">MERCADO</span>
                </button>
              )}

              <button 
                type="button" 
                className={`vcp-nav-btn ${isTableroActive ? 'active' : ''}`}
                onClick={() => handleSelectTab('tablero')}
                title="Trabajos aceptados"
              >
                <span className="vcp-tab-full">TABLERO DE TRABAJOS{liveAcceptedCount > 0 ? ` (${liveAcceptedCount})` : ''}</span>
                <span className="vcp-tab-short">TABLERO{liveAcceptedCount > 0 ? ` (${liveAcceptedCount})` : ''}</span>
              </button>
              {esContratista(authUser) && (
                <button
                  type="button"
                  className={`vcp-nav-btn ${currentPath === '/mi-cuadrilla' ? 'active' : ''}`}
                  onClick={() => navigate('/mi-cuadrilla')}
                  title="Mi cuadrilla"
                >
                  <span className="vcp-tab-full">MI CUADRILLA</span>
                  <span className="vcp-tab-short">CUADRILLA</span>
                </button>
              )}
              {/* "Mis clientes" vive en el menú del perfil */}
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

            {/* Técnico de la red: solo Mi perfil, Mis clientes y Cerrar sesión (inicio y calendario ya están en la barra) */}
            {isRol2 && (
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
            )}
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
            {/* El técnico de cuadrilla (8) no tiene clientes propios: son de su contratista */}
            {!isRol2 && rolTecnico !== 8 && (
              <button
                type="button"
                className={`tecnico-dropdown-item ${isUsuariosActive ? 'active' : ''}`}
                onClick={() => {
                  setProfileDropdownOpen(false);
                  handleSelectTab('usuarios');
                }}
              >
                <Users size={16} /> Mis clientes{liveUsersCount > 0 ? ` (${liveUsersCount})` : ''}
              </button>
            )}
            {esContratista(authUser) && (
              <>
                <button
                  type="button"
                  className={`tecnico-dropdown-item ${currentPath === '/mi-cuadrilla' ? 'active' : ''}`}
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/mi-cuadrilla');
                  }}
                >
                  <HardHat size={16} /> Mi cuadrilla
                </button>
                <button
                  type="button"
                  className={`tecnico-dropdown-item ${currentPath === '/sala-espera-tecnicos' ? 'active' : ''}`}
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/sala-espera-tecnicos');
                  }}
                >
                  <UserPlus size={16} /> Sala de espera
                </button>
              </>
            )}
            {rolTecnico === 6 && (
              <button
                type="button"
                className="tecnico-dropdown-item"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  unirmeACuadrilla();
                }}
              >
                <HardHat size={16} /> Unirme a una cuadrilla
              </button>
            )}
            {rolTecnico === 8 && (
              <button
                type="button"
                className="tecnico-dropdown-item"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  pedirAccesoRed();
                }}
              >
                <Globe size={16} /> Quiero acceso a la red
              </button>
            )}
            {isRol2 && (
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
            )}
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
