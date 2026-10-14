import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Users,
  Building2,
  ClipboardList,
  FileText,
  Receipt,
  Wrench,
  Globe
} from 'lucide-react';
import '../../styles/Shared/MobileBottomNav.css';

const MobileBottomNav = ({ activeModule }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const currentPath = (location.pathname || '').toLowerCase();
  const role = Number(user?.role_id ?? 1);
  const isRoot = role === 0;
  const isAdminRole1 = role === 1;

  const irAlInicio = () => {
    if (!user) return navigate('/');
    if (role === 0 || role === 1) navigate('/VistaRoot');
    else if (role === 4 || role === 5 || role === 7 || role === 3) navigate('/VistaMarket');
    else if (role === 2) navigate('/VistaTecnico');
    else if (role === 6 || role === 8) navigate('/mercado-trabajos');
    else navigate('/VistaRoot');
  };

  const isInicioActive = 
    activeModule === 'inicio' || 
    currentPath === '/' || 
    currentPath === '/vistaroot' || 
    currentPath === '/vistaadmin';

  const isUsuariosActive = 
    activeModule === 'usuarios' || 
    currentPath.includes('/usuarios');

  const isPropiedadesActive = 
    activeModule === 'propiedades' || 
    currentPath.includes('/propiedades') || 
    currentPath.includes('/detalle-propiedad');

  const isLevantamientosActive = 
    activeModule === 'levantamientos' || 
    currentPath.includes('/levantamientos');

  const isReportesActive = 
    activeModule === 'reportes' || 
    currentPath.includes('/reportes-globales') || 
    (currentPath.includes('/reporte') && !currentPath.includes('/levantamientos'));

  const isCotizacionesActive = 
    activeModule === 'cotizaciones' || 
    currentPath.includes('/cotizacion') || 
    currentPath.includes('/vista-cotizaciones');

  const isServiciosActive = 
    activeModule === 'servicios' || 
    currentPath.includes('/tablero-servicios') || 
    currentPath.includes('/servicios') ||
    currentPath.includes('/trabajos-tecnico');

  const isMercadoActive = 
    activeModule === 'mercado' || 
    currentPath.includes('/red-autonomos') || 
    currentPath.includes('/mercado');

  // Si es Administrador Rol 1 (o Root): Mostrar exactamente los 7 módulos del header superior
  if (isAdminRole1 || isRoot) {
    return (
      <nav className="vcp-mobile-bottom-nav" aria-label="Navegación Móvil Administrador">
        {/* 1. INICIO */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isInicioActive ? 'active' : ''}`} 
          onClick={irAlInicio} 
          title="Inicio"
          aria-label="Inicio"
        >
          <Home size={22} className="vcp-mobile-nav-icon" />
        </button>

        {/* 2. USUARIOS */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isUsuariosActive ? 'active' : ''}`} 
          onClick={() => navigate('/usuarios')} 
          title="Usuarios"
          aria-label="Usuarios"
        >
          <Users size={22} className="vcp-mobile-nav-icon" />
        </button>

        {/* 3. PROPIEDADES */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isPropiedadesActive ? 'active' : ''}`} 
          onClick={() => navigate('/propiedades')} 
          title="Propiedades"
          aria-label="Propiedades"
        >
          <Building2 size={22} className="vcp-mobile-nav-icon" />
        </button>

        {/* 4. LEVANTAMIENTOS */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isLevantamientosActive ? 'active' : ''}`} 
          onClick={() => navigate('/levantamientos')} 
          title="Levantamientos"
          aria-label="Levantamientos"
        >
          <ClipboardList size={22} className="vcp-mobile-nav-icon" />
        </button>

        {/* 5. REPORTE */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isReportesActive ? 'active' : ''}`} 
          onClick={() => navigate('/reportes-globales')} 
          title="Reportes"
          aria-label="Reportes"
        >
          <FileText size={22} className="vcp-mobile-nav-icon" />
        </button>

        {/* 6. COTIZACION */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isCotizacionesActive ? 'active' : ''}`} 
          onClick={() => navigate('/vista-cotizaciones')} 
          title="Cotizaciones"
          aria-label="Cotizaciones"
        >
          <Receipt size={22} className="vcp-mobile-nav-icon" />
        </button>

        {/* 7. SERVICIOS */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isServiciosActive ? 'active' : ''}`} 
          onClick={() => navigate('/tablero-servicios')} 
          title="Servicios"
          aria-label="Servicios"
        >
          <Wrench size={22} className="vcp-mobile-nav-icon" />
        </button>

        {/* OPCIONAL SOLO ROOT: MERCADO / RED */}
        {isRoot && (
          <button 
            type="button" 
            className={`vcp-mobile-nav-item ${isMercadoActive ? 'active' : ''}`} 
            onClick={() => navigate('/red-autonomos')} 
            title="Mercado / Red"
            aria-label="Mercado / Red"
          >
            <Globe size={22} className="vcp-mobile-nav-icon" />
          </button>
        )}
      </nav>
    );
  }

  // Fallback para otros roles (Autónomos, técnicos independientes, etc.)
  const userId = Number(user?.id ?? 0);
  const ocultarInicioCasita = Boolean(userId === 5 || role === 6 || role === 8);

  return (
    <nav className="vcp-mobile-bottom-nav" aria-label="Navegación Móvil">
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

      <button 
        type="button" 
        className={`vcp-mobile-nav-item ${isReportesActive ? 'active' : ''}`} 
        onClick={() => navigate('/reportes-globales')} 
        title="Reportes"
        aria-label="Reportes"
      >
        <FileText size={22} className="vcp-mobile-nav-icon" />
      </button>

      <button 
        type="button" 
        className={`vcp-mobile-nav-item ${isCotizacionesActive ? 'active' : ''}`} 
        onClick={() => navigate('/vista-cotizaciones')} 
        title="Cotizaciones"
        aria-label="Cotizaciones"
      >
        <Receipt size={22} className="vcp-mobile-nav-icon" />
      </button>

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
