import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Globe,
  Users,
  Briefcase,
  FileText,
  Receipt,
  Wrench
} from 'lucide-react';
import '../../styles/Shared/MobileBottomNav.css';

const MobileBottomNav = ({ activeModule, onTabChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const currentPath = (location.pathname || '').toLowerCase();
  const currentView = location.state?.view;
  const role = Number(user?.role_id ?? 0);
  const userId = Number(user?.id ?? 0);

  const irAlInicio = () => {
    if (!user) return navigate('/');
    if (role === 0 || role === 1) navigate('/VistaRoot');
    else if (role === 4 || role === 5 || role === 7 || role === 3) navigate('/VistaMarket');
    else if (role === 2) navigate('/VistaTecnico');
    else if (role === 6 || role === 8) {
      if (onTabChange) onTabChange('mercado');
      else navigate('/mercado-trabajos', { state: { view: 'mercado' } });
    } else {
      navigate('/VistaMarket');
    }
  };

  const handleSelectTab = (tabKey) => {
    if (onTabChange) {
      onTabChange(tabKey);
    } else {
      navigate('/mercado-trabajos', { state: { view: tabKey } });
    }
  };

  const isPerfilActive = currentPath === '/mi-perfil' || currentPath === '/profile';

  const isInicioActive = !isPerfilActive && (
    activeModule === 'inicio' || 
    currentPath === '/' || 
    currentPath === '/vistamarket' || 
    currentPath === '/vistaroot' || 
    currentPath === '/vistaclienteparticular' || 
    currentPath === '/vistatecnico'
  );

  const isMercadoActive = !isPerfilActive && !isInicioActive && (
    activeModule === 'mercado' || 
    currentView === 'mercado' ||
    currentPath.includes('/red-autonomos') || 
    (currentPath.includes('/mercado-trabajos') && currentView !== 'tablero' && currentView !== 'usuarios') ||
    (currentPath.includes('/mercado') && !currentPath.includes('/tablero') && !currentPath.includes('/usuarios'))
  );

  const isTableroActive = !isPerfilActive && !isInicioActive && (
    activeModule === 'tablero' || 
    currentView === 'tablero' || 
    currentPath.includes('/trabajos-tecnico') || 
    currentPath.includes('/tablero-servicios')
  );

  const isUsuariosActive = !isPerfilActive && !isInicioActive && (
    activeModule === 'usuarios' || 
    currentView === 'usuarios' || 
    currentPath.includes('/usuarios') ||
    currentPath.includes('/vista-tecnicos')
  );

  const isReportesActive = !isPerfilActive && !isInicioActive && (
    activeModule === 'reportes' || 
    currentPath.includes('/reporte') || 
    currentPath.includes('/galeria-reportes') ||
    currentPath.includes('/reportes-globales')
  );

  const isCotizacionesActive = !isPerfilActive && !isInicioActive && (
    activeModule === 'cotizaciones' || 
    currentPath.includes('/cotizacion') || 
    currentPath.includes('/vista-cotizaciones')
  );

  const isServiciosActive = !isPerfilActive && !isInicioActive && (
    activeModule === 'servicios' || 
    currentPath.includes('/tablero-servicios') || 
    currentPath.includes('/servicios') || 
    currentPath.includes('/levantamientos')
  );

  // Determinar si es técnico (Rol 2 Oficial, 6, 8 o pantallas de técnico)
  const isTechnician = Boolean(
    role === 2 || 
    role === 6 || 
    role === 8 ||
    currentPath.includes('/mercado-trabajos') ||
    currentPath.includes('/trabajos-tecnico') ||
    currentPath === '/vistatecnico'
  );

  // Ocultar casita solo para técnicos independientes sin portal de inicio propio (ID 5 / Roles 6 y 8)
  const ocultarInicioCasita = Boolean(
    userId === 5 || 
    role === 6 || 
    role === 8
  );

  // ═══════════════════════════════════════════════════════════════
  // BARRA DE NAVEGACIÓN RESPONSIVA PARA TÉCNICOS (ROL 2, 6, 8)
  // Conserva exactamente las 4 opciones de la primera imagen:
  // 1. INICIO
  // 2. MERCADO (SOLICITUDES)
  // 3. TRABAJOS ACEPTADOS
  // 4. MIS CLIENTES
  // ═══════════════════════════════════════════════════════════════
  if (isTechnician) {
    return (
      <nav className="vcp-mobile-bottom-nav" aria-label="Navegación Móvil Técnico">
        {/* 1. INICIO */}
        {!ocultarInicioCasita && (
          <button 
            type="button" 
            className={`vcp-mobile-nav-item ${isInicioActive ? 'active' : ''}`} 
            onClick={irAlInicio} 
            title="Inicio"
            aria-label="Inicio"
          >
            <Home size={22} className="vcp-mobile-nav-icon" />
          </button>
        )}

        {/* 2. MERCADO (SOLICITUDES) */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isMercadoActive ? 'active' : ''}`} 
          onClick={() => handleSelectTab('mercado')} 
          title="Mercado (Solicitudes)"
          aria-label="Mercado (Solicitudes)"
        >
          <Globe size={22} className="vcp-mobile-nav-icon" />
        </button>

        {/* 3. TRABAJOS ACEPTADOS */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isTableroActive ? 'active' : ''}`} 
          onClick={() => handleSelectTab('tablero')} 
          title="Trabajos Aceptados"
          aria-label="Trabajos Aceptados"
        >
          <Briefcase size={22} className="vcp-mobile-nav-icon" />
        </button>

        {/* 4. MIS CLIENTES */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isUsuariosActive ? 'active' : ''}`} 
          onClick={() => handleSelectTab('usuarios')} 
          title="Mis Clientes"
          aria-label="Mis Clientes"
        >
          <Users size={22} className="vcp-mobile-nav-icon" />
        </button>
      </nav>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // BARRA DE NAVEGACIÓN RESPONSIVA PREDETERMINADA (ADMIN / CLIENTE)
  // ═══════════════════════════════════════════════════════════════
  return (
    <nav className="vcp-mobile-bottom-nav" aria-label="Navegación Móvil">
      {/* 1. INICIO (CASITA) */}
      {!ocultarInicioCasita && (
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isInicioActive ? 'active' : ''}`} 
          onClick={irAlInicio} 
          title="Inicio"
          aria-label="Inicio"
        >
          <Home size={22} className="vcp-mobile-nav-icon" />
        </button>
      )}

      {/* 2. MUNDO / RED / MERCADO */}
      <button 
        type="button" 
        className={`vcp-mobile-nav-item ${isMercadoActive ? 'active' : ''}`} 
        onClick={() => {
          if (role === 6 || role === 8 || currentPath.includes('/mercado-trabajos')) {
            navigate('/mercado-trabajos', { state: { view: 'mercado' } });
          } else {
            navigate('/red-autonomos');
          }
        }} 
        title="Mercado / Red"
        aria-label="Mercado / Red"
      >
        <Globe size={22} className="vcp-mobile-nav-icon" />
      </button>

      {/* 3. USUARIOS / CLIENTES */}
      <button 
        type="button" 
        className={`vcp-mobile-nav-item ${isUsuariosActive ? 'active' : ''}`} 
        onClick={() => {
          if (role === 6 || role === 8 || currentPath.includes('/mercado-trabajos')) {
            navigate('/mercado-trabajos', { state: { view: 'usuarios' } });
          } else {
            navigate('/usuarios');
          }
        }} 
        title="Usuarios"
        aria-label="Usuarios"
      >
        <Users size={22} className="vcp-mobile-nav-icon" />
      </button>

      {/* 4. REPORTES */}
      <button 
        type="button" 
        className={`vcp-mobile-nav-item ${isReportesActive ? 'active' : ''}`} 
        onClick={() => navigate('/reportes-globales')} 
        title="Reportes"
        aria-label="Reportes"
      >
        <FileText size={22} className="vcp-mobile-nav-icon" />
      </button>

      {/* 5. COTIZACIONES */}
      <button 
        type="button" 
        className={`vcp-mobile-nav-item ${isCotizacionesActive ? 'active' : ''}`} 
        onClick={() => navigate('/vista-cotizaciones')} 
        title="Cotizaciones"
        aria-label="Cotizaciones"
      >
        <Receipt size={22} className="vcp-mobile-nav-icon" />
      </button>

      {/* 6. SERVICIOS / TABLERO */}
      <button 
        type="button" 
        className={`vcp-mobile-nav-item ${isServiciosActive ? 'active' : ''}`} 
        onClick={() => {
          if (role === 6 || role === 8 || currentPath.includes('/mercado-trabajos')) {
            navigate('/mercado-trabajos', { state: { view: 'tablero' } });
          } else {
            navigate('/tablero-servicios');
          }
        }} 
        title="Servicios"
        aria-label="Servicios"
      >
        <Wrench size={22} className="vcp-mobile-nav-icon" />
      </button>
    </nav>
  );
};

export default MobileBottomNav;
