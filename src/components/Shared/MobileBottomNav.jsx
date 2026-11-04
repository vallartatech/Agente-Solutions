import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { usaSelectorRed } from '../../utils/entorno';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Users,
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  Receipt,
  Wrench,
  Globe,
  Navigation,
  ReceiptText,
  CalendarClock,
  LayoutGrid,
  X
} from 'lucide-react';
import '../../styles/Shared/MobileBottomNav.css';
import '../../styles/Shared/EncabezadoMovil.css';
import { MascotaAlerta } from './AlertaValidacion';

// Cada pantalla monta su propia barra, así que guardamos aquí (fuera del componente)
// en qué botón estaba la píldora para que, al cambiar de página, salga desde ahí y se deslice.
let ultimoIndiceNav = null;

// Brillo de vidrio que se desliza hasta el botón activo
const useIndicadorDeslizante = () => {
  const navRef = useRef(null);
  const timersRef = useRef({ raf1: 0, raf2: 0, fin: 0 });

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const items = Array.from(nav.querySelectorAll(':scope > .vcp-mobile-nav-item'));
    const idx = items.findIndex(el => el.classList.contains('active'));
    nav.style.setProperty('--n', String(items.length || 1));

    if (idx === -1) {
      nav.classList.remove('tiene-activo');
      return;
    }

    const actual = nav.style.getPropertyValue('--i');
    const t = timersRef.current;

    // Desliza al destino y, mientras viaja, el brillo se estira como gota (clase "moviendo")
    const deslizar = () => {
      nav.classList.remove('sin-transicion', 'moviendo');
      void nav.offsetWidth; // reinicia la animación de estirado
      nav.classList.add('moviendo');
      nav.style.setProperty('--i', String(idx));
      clearTimeout(t.fin);
      t.fin = setTimeout(() => nav.classList.remove('moviendo'), 520);
    };

    nav.classList.add('tiene-activo');

    if (actual === '') {
      // Barra recién creada (cambio de página): poner el brillo donde estaba antes, sin animar,
      // y deslizarlo hasta que el navegador ya lo pintó ahí (dos cuadros después)
      const inicio = ultimoIndiceNav !== null && ultimoIndiceNav < items.length ? ultimoIndiceNav : idx;
      nav.classList.add('sin-transicion');
      nav.style.setProperty('--i', String(inicio));
      if (inicio !== idx) {
        cancelAnimationFrame(t.raf1);
        cancelAnimationFrame(t.raf2);
        t.raf1 = requestAnimationFrame(() => {
          t.raf2 = requestAnimationFrame(deslizar);
        });
      }
    } else if (actual !== String(idx)) {
      // Misma página (pestañas): deslizar desde donde está
      deslizar();
    }

    ultimoIndiceNav = idx;
  });

  // Limpiar al desmontar
  useEffect(() => () => {
    const t = timersRef.current;
    cancelAnimationFrame(t.raf1);
    cancelAnimationFrame(t.raf2);
    clearTimeout(t.fin);
  }, []);

  return navRef;
};

const MobileBottomNav = ({ activeModule, onTabChange }) => {
  const navRef = useIndicadorDeslizante();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const unificarVistas = usaSelectorRed(user);

  const currentPath = (location.pathname || '').toLowerCase();
  const currentView = location.state?.view;
  const role = Number(user?.role_id ?? 1);
  const userId = Number(user?.id ?? 0);
  const isRoot = role === 0;
  const isAdminRole1 = role === 1;

  const isMapaActive = activeModule === 'mapa' || currentPath.includes('/mapa-equipo');

  // Panel "Más" de la barra del admin (Comprobantes, mapas, Mercado...): se cierra al navegar
  const [masAbierto, setMasAbierto] = useState(false);
  useEffect(() => { setMasAbierto(false); }, [location.pathname]);

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
    currentPath === '/vistaroot' || 
    currentPath === '/vistaadmin' ||
    currentPath === '/vistamarket' ||
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

  const isPropiedadesActive = !isPerfilActive && !isInicioActive && (
    activeModule === 'propiedades' || 
    currentPath.includes('/propiedades') || 
    currentPath.includes('/detalle-propiedad')
  );

  const isLevantamientosActive = !isPerfilActive && !isInicioActive && (
    activeModule === 'levantamientos' || 
    currentPath.includes('/levantamientos')
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
    currentPath.includes('/trabajos-tecnico')
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

  // 1. CASO TÉCNICO OFICIAL AGENTE (ROL 2):
  // Opciones sincronizadas con las 3 tarjetas de su portal (Trabajos, Levantamientos, Cotizaciones)
  if (role === 2) {
    const isTrabajosActive = !isPerfilActive && !isInicioActive && (activeModule === 'trabajos' || currentPath.includes('/trabajos-tecnico'));
    const isLevantamientosActive = !isPerfilActive && !isInicioActive && (activeModule === 'levantamientos' || currentPath.includes('/trabajos-asignados') || currentPath.includes('/registrozonas') || currentPath.includes('/detallehabitacion'));
    const isCotizacionesActive = !isPerfilActive && !isInicioActive && (activeModule === 'cotizaciones' || currentPath.includes('/vista-cotizaciones') || currentPath.includes('/cotizacion'));

    return (
      <nav ref={navRef} className="vcp-mobile-bottom-nav" aria-label="Navegación Móvil Técnico Oficial">
        <span className="vcp-nav-pill" aria-hidden="true" />
        {/* 1. INICIO */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isInicioActive ? 'active' : ''}`} 
          onClick={irAlInicio} 
          title="Inicio"
          aria-label="Inicio"
        >
          <Home size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Inicio</span>
        </button>

        {/* 2. TRABAJOS */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isTrabajosActive ? 'active' : ''}`} 
          onClick={() => navigate('/trabajos-tecnico')} 
          title="Trabajos"
          aria-label="Trabajos"
        >
          <Wrench size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Trabajos</span>
        </button>

        {/* 3. LEVANTAMIENTOS */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isLevantamientosActive ? 'active' : ''}`} 
          onClick={() => navigate('/trabajos-asignados')} 
          title="Levantamientos"
          aria-label="Levantamientos"
        >
          <ClipboardList size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Levantamientos</span>
        </button>

        {/* 4. COTIZACIONES */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isCotizacionesActive ? 'active' : ''}`} 
          onClick={() => navigate('/vista-cotizaciones')} 
          title="Cotizaciones"
          aria-label="Cotizaciones"
        >
          <Receipt size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Cotizaciones</span>
        </button>

        {/* 5. COMPROBANTES */}
        <button
          type="button"
          className={`vcp-mobile-nav-item ${currentPath.includes('/comprobantes') ? 'active' : ''}`}
          onClick={() => navigate('/comprobantes')}
          title="Comprobantes"
          aria-label="Comprobantes"
        >
          <ReceiptText size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Comprobantes</span>
        </button>
      </nav>
    );
  }

  // CASO TÉCNICOS DE LA RED (ROLES 6 Y 8):
  if (isTechnician) {
    return (
      <nav ref={navRef} className="vcp-mobile-bottom-nav" aria-label="Navegación Móvil Técnico Red">
        <span className="vcp-nav-pill" aria-hidden="true" />
        {!ocultarInicioCasita && (
          <button 
            type="button" 
            className={`vcp-mobile-nav-item ${isInicioActive ? 'active' : ''}`} 
            onClick={irAlInicio} 
            title="Inicio"
            aria-label="Inicio"
          >
            <Home size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Inicio</span>
          </button>
        )}

        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isMercadoActive ? 'active' : ''}`} 
          onClick={() => handleSelectTab('mercado')} 
          title="Mercado (Solicitudes)"
          aria-label="Mercado (Solicitudes)"
        >
          <Globe size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Mercado</span>
        </button>

        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isTableroActive ? 'active' : ''}`} 
          onClick={() => handleSelectTab('tablero')} 
          title="Trabajos Aceptados"
          aria-label="Trabajos Aceptados"
        >
          <Briefcase size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Trabajos</span>
        </button>

        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isUsuariosActive ? 'active' : ''}`} 
          onClick={() => handleSelectTab('usuarios')} 
          title="Mis Clientes"
          aria-label="Mis Clientes"
        >
          <Users size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Clientes</span>
        </button>
      </nav>
    );
  }

  // 2. CASO ADMINISTRADOR (ROL 1) O ROOT (ROL 0):
  // Módulos del header superior de administrador
  if (isAdminRole1 || isRoot) {
    // Mismas opciones que "MÁS ▾" del encabezado en computadora
    const masItemsAdmin = [
      { key: 'mantenimiento', label: 'Mantenimiento', Icon: CalendarClock, path: '/mantenimiento', active: currentPath.includes('/mantenimiento') },
      { key: 'mapa', label: 'Mapa en vivo', Icon: Navigation, path: '/mapa-equipo', active: isMapaActive },
      ...(isRoot ? [{ key: 'mercado', label: 'Mercado / Red', Icon: Globe, path: '/red-autonomos', active: isMercadoActive }] : []),
    ];

    return (
      <>
      <nav ref={navRef} className="vcp-mobile-bottom-nav" aria-label="Navegación Móvil Administrador">
        <span className="vcp-nav-pill" aria-hidden="true" />
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isInicioActive ? 'active' : ''}`} 
          onClick={irAlInicio} 
          title="Inicio"
          aria-label="Inicio"
        >
          <Home size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Inicio</span>
        </button>

        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isUsuariosActive ? 'active' : ''}`} 
          onClick={() => navigate('/usuarios')} 
          title="Usuarios"
          aria-label="Usuarios"
        >
          <Users size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Usuarios</span>
        </button>

        {/* Propiedades y Levantamientos en un solo botón (dentro se cambia con el selector) */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isPropiedadesActive || isLevantamientosActive ? 'active' : ''}`} 
          onClick={() => navigate('/propiedades')} 
          title="Propiedades y levantamientos"
          aria-label="Propiedades y levantamientos"
        >
          <Building2 size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Propiedades</span>
        </button>

        {/* Cotizaciones y Reportes en un solo botón (dentro se cambia con el selector) */}
        <button 
          type="button" 
          className={`vcp-mobile-nav-item con-alerta-validacion ${isCotizacionesActive || isReportesActive ? 'active' : ''}`}
          onClick={() => navigate('/vista-cotizaciones')}
          title="Cotización y reporte"
          aria-label="Cotización y reporte"
        >
          <Receipt size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Cotización</span>
          <MascotaAlerta variante="barra" />
        </button>

        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isServiciosActive ? 'active' : ''}`} 
          onClick={() => navigate('/tablero-servicios')} 
          title="Servicios"
          aria-label="Servicios"
        >
          <Wrench size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Servicios</span>
        </button>

        {/* Lo demás (igual que "MÁS ▾" en computadora): así siempre cabe la barra.
            Si solo hay una opción (Admin), el botón lleva directo a ella */}
        {masItemsAdmin.length === 1 ? (() => {
          const { label, Icon, path, active } = masItemsAdmin[0];
          return (
            <button
              type="button"
              className={`vcp-mobile-nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(path)}
              title={label}
              aria-label={label}
            >
              <Icon size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">{label}</span>
            </button>
          );
        })() : (
        <button
          type="button"
          className={`vcp-mobile-nav-item ${masItemsAdmin.some(i => i.active) || masAbierto ? 'active' : ''}`}
          onClick={() => setMasAbierto(v => !v)}
          title="Más opciones"
          aria-label="Más opciones"
          aria-expanded={masAbierto}
        >
          <LayoutGrid size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Más</span>
        </button>
        )}
      </nav>
      {masAbierto && createPortal(
        <div className="vcp-mas-overlay" onClick={() => setMasAbierto(false)}>
          <div className="vcp-mas-sheet" onClick={e => e.stopPropagation()} role="menu" aria-label="Más opciones">
            <div className="vcp-mas-grabber" />
            <div className="vcp-mas-head">
              <strong>Más opciones</strong>
              <button type="button" className="vcp-mas-cerrar" onClick={() => setMasAbierto(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="vcp-mas-grid">
              {masItemsAdmin.map(({ key, label, Icon, path, active }) => (
                <button
                  type="button"
                  key={key}
                  role="menuitem"
                  className={`vcp-mas-item ${active ? 'active' : ''}`}
                  onClick={() => { setMasAbierto(false); navigate(path); }}
                >
                  <span className="vcp-mas-icono"><Icon size={22} /></span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
      </>
    );
  }

  // 3. CASO DEFAULT (CLIENTES / AUTÓNOMOS)
  return (
    <nav ref={navRef} className="vcp-mobile-bottom-nav" aria-label="Navegación Móvil">
        <span className="vcp-nav-pill" aria-hidden="true" />
      {!ocultarInicioCasita && (
        <button 
          type="button" 
          className={`vcp-mobile-nav-item ${isInicioActive ? 'active' : ''}`} 
          onClick={irAlInicio} 
          title="Inicio"
          aria-label="Inicio"
        >
          <Home size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Inicio</span>
        </button>
      )}

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
          <span className="vcp-mobile-nav-text">Usuarios</span>
      </button>

      <button 
        type="button" 
        className={`vcp-mobile-nav-item ${isReportesActive || (unificarVistas && (isCotizacionesActive || isLevantamientosActive)) ? 'active' : ''}`}
        onClick={() => navigate('/reportes-globales')}
        title={unificarVistas ? 'Reportes, cotización y levantamiento' : 'Reportes'}
        aria-label={unificarVistas ? 'Reportes, cotización y levantamiento' : 'Reportes'}
      >
        <FileText size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Reportes</span>
      </button>

      {!unificarVistas && (
        <button
          type="button"
          className={`vcp-mobile-nav-item ${isCotizacionesActive ? 'active' : ''}`}
          onClick={() => navigate('/vista-cotizaciones')}
          title="Cotizaciones"
          aria-label="Cotizaciones"
        >
          <Receipt size={22} className="vcp-mobile-nav-icon" />
          <span className="vcp-mobile-nav-text">Cotizaciones</span>
        </button>
      )}

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
          <span className="vcp-mobile-nav-text">Servicios</span>
      </button>

      {/* Mercado / Red al final de la barra */}
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
          <span className="vcp-mobile-nav-text">Mercado</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
