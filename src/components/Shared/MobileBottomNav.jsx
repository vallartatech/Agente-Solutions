import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Globe,
  Users,
  FileText,
  Receipt,
  Wrench
} from 'lucide-react';
import '../../styles/Shared/MobileBottomNav.css';

const MobileBottomNav = ({ activeModule }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const currentPath = (location.pathname || '').toLowerCase();

  const irAlInicio = () => {
    if (!user) return navigate('/');
    const role = Number(user?.role_id ?? 0);
    if (role === 0 || role === 1) navigate('/VistaRoot');
    else if (role === 4 || role === 5 || role === 7 || role === 3) navigate('/VistaMarket');
    else if (role === 2) navigate('/VistaTecnico');
    else if (role === 6 || role === 8) navigate('/mercado-trabajos');
    else navigate('/VistaMarket');
  };

  const isInicioActive = 
    activeModule === 'inicio' || 
    currentPath === '/' || 
    currentPath === '/vistamarket' || 
    currentPath === '/vistaroot' || 
    currentPath === '/vistaclienteparticular' || 
    currentPath === '/vistatecnico';

  const isMercadoActive = 
    activeModule === 'mercado' || 
    currentPath.includes('/red-autonomos') || 
    currentPath.includes('/mercado') ||
    currentPath.includes('/mercado-trabajos') && !currentPath.includes('/tablero') && !currentPath.includes('/usuarios');

  const isUsuariosActive = 
    activeModule === 'usuarios' || 
    currentPath.includes('/usuarios') ||
    currentPath.includes('/vista-tecnicos');

  const isReportesActive = 
    activeModule === 'reportes' || 
    currentPath.includes('/reporte') || 
    currentPath.includes('/galeria-reportes') ||
    currentPath.includes('/reportes-globales');

  const isCotizacionesActive = 
    activeModule === 'cotizaciones' || 
    currentPath.includes('/cotizacion') || 
    currentPath.includes('/vista-cotizaciones');

  const isServiciosActive = 
    activeModule === 'servicios' || 
    currentPath.includes('/tablero-servicios') || 
    currentPath.includes('/servicios') || 
    currentPath.includes('/trabajos-tecnico') ||
    currentPath.includes('/levantamientos');

  const role = Number(user?.role_id ?? 0);
  const userId = Number(user?.id ?? 0);

  // El técnico no tiene propiedades, solo realiza trabajos
  const esTecnico = Boolean(
    role === 2 || 
    role === 6 || 
    role === 8 || 
    role === 5 ||
    userId === 5 ||
    currentPath.includes('/mercado-trabajos') ||
    currentPath.includes('/vista-tecnico') ||
    currentPath.includes('/trabajos-tecnico')
  );

  return (
    <nav className="vcp-mobile-bottom-nav" aria-label="Navegación Móvil">
        {/* 1. INICIO (CASITA) - Oculto para perfiles técnicos sin propiedades */}
        {!esTecnico && (
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
            const role = Number(user?.role_id ?? 0);
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
            const role = Number(user?.role_id ?? 0);
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
            const role = Number(user?.role_id ?? 0);
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
