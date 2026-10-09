import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, ShieldCheck, User, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import defaultLogo from '../../assets/Logo4.png';
import ModalCalendarioCliente from '../../portals/AgenteMarket/Cliente/ModalCalendarioCliente';
import MobileBottomNav from './MobileBottomNav';
import axios from 'axios';
import '../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';

const TecnicoHeader = ({ activeTab = 'tablero', onTabChange, acceptedCount, usersCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutGlobal } = useAuth();
  const authUser = user;

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [appLogo, setAppLogo] = useState(defaultLogo);
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
        } catch (e) {
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

  const userInitial = authUser?.name ? authUser.name.charAt(0).toUpperCase() : 'T';
  const userFullName = authUser?.name || 'TÉCNICO DE LA RED';
  const userRole = authUser?.role_id === 6 ? 'TÉCNICO INDEPENDIENTE' : (authUser?.role_id === 8 ? 'TÉCNICO ENLACE' : 'TÉCNICO DE LA RED');
  const userAvatar = authUser?.avatar_url || authUser?.avatar || null;

  return (
    <>
      <header className="vcp-header">
        {/* Logo */}
        <div className="vcp-header-left">
          <img 
            src={appLogo} 
            alt="Agente Logo" 
            className="vcp-brand-logo"
            onClick={() => handleSelectTab('mercado')} 
            title="Ir a Mercado de Trabajos"
          />
        </div>

        {/* Center Nav Links */}
        <nav className="vcp-header-nav">
          <button 
            type="button"
            className="vcp-nav-icon-btn" 
            title="Abrir Calendario"
            onClick={() => setShowModalCalendario(true)}
          >
            <CalendarDays size={18} color="#ffffff" strokeWidth={2.2} />
          </button>

          <button 
            type="button"
            className={`vcp-nav-btn ${activeTab === 'mercado' ? 'active' : ''}`}
            onClick={() => handleSelectTab('mercado')}
            title="Mercado de solicitudes"
          >
            <span className="vcp-tab-full">MERCADO (SOLICITUDES)</span>
            <span className="vcp-tab-short">MERCADO</span>
          </button>

          <button 
            type="button"
            className={`vcp-nav-btn ${activeTab === 'tablero' ? 'active' : ''}`}
            onClick={() => handleSelectTab('tablero')}
            title="Trabajos aceptados"
          >
            <span className="vcp-tab-full">TRABAJOS ACEPTADOS ({liveAcceptedCount})</span>
            <span className="vcp-tab-short">ACEPTADOS ({liveAcceptedCount})</span>
          </button>

          <button 
            type="button"
            className={`vcp-nav-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
            onClick={() => handleSelectTab('usuarios')}
            title="Directorio de usuarios"
          >
            <span className="vcp-tab-full">USUARIOS ({liveUsersCount})</span>
            <span className="vcp-tab-short">USUARIOS ({liveUsersCount})</span>
          </button>
        </nav>

        {/* User profile avatar section */}
        <div className="vcp-header-right" ref={dropdownRef}>
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

            <div className="tecnico-dropdown-divider" />

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

      {/* Global Calendar Modal */}
      <ModalCalendarioCliente 
        isOpen={showModalCalendario} 
        onClose={() => setShowModalCalendario(false)} 
      />

      {/* Responsive Bottom Dock Navigation (Only Icons) */}
      <MobileBottomNav activeModule={activeTab} />
    </>
  );
};

export default TecnicoHeader;
