import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Bell, 
  ChevronLeft, 
  Search, 
  X, 
  CheckCheck, 
  Check, 
  MessageSquare, 
  DollarSign, 
  Wrench, 
  Clock, 
  ArrowRight, 
  Inbox,
  Sparkles
} from 'lucide-react';
import Header from './Header';
import '../../styles/Shared/VistaNotificaciones.css';

const VistaNotificaciones = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState('todas'); 
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  
  const navigate = useNavigate();

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        const token = localStorage.getItem("agente_token") || localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/notifications/all`, { headers });
        let list = [];
        if (data?.success && Array.isArray(data?.notifications)) {
          list = data.notifications;
        } else if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.data)) {
          list = data.data;
        }

        const user = JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData;
        if (user?.role_id === 0 || user?.role_id === 1) {
          const localAdmin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
          localAdmin.forEach(n => {
            if (!list.some(item => String(item.id) === String(n.id))) list.push(n);
          });
        }
        setNotificaciones(list);
      } catch (error) {
        console.error("Error al cargar historial, usando notificaciones de respaldo:", error);
        const user = JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData;
        if (user?.role_id === 0 || user?.role_id === 1) {
          setNotificaciones(JSON.parse(localStorage.getItem('notificaciones_admin') || '[]'));
        }
      } finally {
        setCargando(false);
      }
    };

    cargarHistorial();
  }, []);

  const formatearFecha = (fechaString) => {
    if (!fechaString) return '';
    try {
      const date = new Date(fechaString);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return 'Hace un momento';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return `Ayer, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
      
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return fechaString;
    }
  };

  const getNotificationMeta = (notif) => {
    const type = (notif.data?.alert_type || notif.data?.type || notif.type || notif.alert_type || '').toLowerCase();
    const title = (notif.data?.title || notif.title || notif.titulo || '').toLowerCase();
    const msg = (notif.data?.message || notif.message || notif.mensaje || '').toLowerCase();

    if (type.includes('message') || title.includes('mensaje') || msg.includes('mensaje')) {
      return {
        key: 'mensajes',
        category: 'Mensaje',
        categoryClass: 'message',
        avatarClass: 'type-message',
        Icon: MessageSquare
      };
    }
    if (type.includes('quote') || type.includes('cotiz') || title.includes('cotiz') || msg.includes('cotiz') || title.includes('pago') || msg.includes('pago')) {
      return {
        key: 'cotizaciones',
        category: 'Cotización',
        categoryClass: 'quote',
        avatarClass: 'type-quote',
        Icon: DollarSign
      };
    }
    if (type.includes('work_order') || type.includes('service') || title.includes('trabajo') || title.includes('servicio') || title.includes('visita') || title.includes('técnico') || title.includes('reporte')) {
      return {
        key: 'trabajos',
        category: 'Trabajo / Visita',
        categoryClass: 'job',
        avatarClass: 'type-job',
        Icon: Wrench
      };
    }
    return {
      key: 'avisos',
      category: 'Aviso',
      categoryClass: 'alert',
      avatarClass: 'type-alert',
      Icon: Bell
    };
  };

  const totalNoLeidas = useMemo(() => {
    return notificaciones.filter(n => n.read_at === null).length;
  }, [notificaciones]);

  const totalLeidas = useMemo(() => {
    return notificaciones.filter(n => n.read_at !== null).length;
  }, [notificaciones]);

  const notificacionesFiltradas = useMemo(() => {
    return notificaciones.filter(notif => {
      // Filtro de lectura
      if (filtroActivo === 'leidas' && notif.read_at === null) return false;
      if (filtroActivo === 'no_leidas' && notif.read_at !== null) return false;

      // Filtro de categoría
      const meta = getNotificationMeta(notif);
      if (categoriaFiltro !== 'todas' && meta.key !== categoriaFiltro) return false;

      // Filtro de búsqueda
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const title = (notif.data?.title || notif.title || notif.titulo || '').toLowerCase();
        const msg = (notif.data?.message || notif.message || notif.mensaje || '').toLowerCase();
        return title.includes(query) || msg.includes(query);
      }

      return true;
    });
  }, [notificaciones, filtroActivo, categoriaFiltro, busqueda]);

  const handleMarcarLeida = async (n, e) => {
    if (e) e.stopPropagation();
    if (n.read_at !== null) return;

    try {
      const token = localStorage.getItem("agente_token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      axios.put(`${import.meta.env.VITE_API_BASE_URL}/notifications/${n.id}/read`, {}, { headers }).catch(() => {});
    } catch {
      // Fallback silencioso
    }

    setNotificaciones(prev =>
      prev.map(item => item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item)
    );
  };

  const handleMarcarTodasLeidas = async () => {
    const noLeidas = notificaciones.filter(n => n.read_at === null);
    if (noLeidas.length === 0) return;

    const token = localStorage.getItem("agente_token") || localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    setNotificaciones(prev =>
      prev.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() }))
    );

    noLeidas.forEach(n => {
      axios.put(`${import.meta.env.VITE_API_BASE_URL}/notifications/${n.id}/read`, {}, { headers }).catch(() => {});
    });
  };

  const handleNavigate = (n) => {
    handleMarcarLeida(n);

    let url = n.data?.url || n.url;
    const type = n.data?.alert_type || n.data?.type || n.type || n.alert_type;
    const titleLower = (n.data?.title || n.title || n.titulo || '').toLowerCase();

    console.log("Notificación clickeada:", n);
    
    const user = JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData;
    const isTecnico = user?.role_id === 2;
    const isCliente = user?.role_id === 3;

    if (type === 'new_quote_message' || titleLower.includes('nuevo mensaje') || titleLower.includes('mensaje en la red')) {
      if ([2, 6, 8].includes(Number(user?.role_id))) {
        url = n.data?.network_quote_id ? `/mercado-trabajos` : `/vista-cotizaciones`;
      } else if ([3, 4, 5, 7].includes(Number(user?.role_id))) {
        url = '/red-autonomos';
      } else {
        url = n.data?.url || '/vista-cotizaciones';
      }
    } else if (type === 'network_quote_received' || titleLower.includes('nueva cotización en la red') || titleLower.includes('cotización en la red')) {
      url = '/red-autonomos';
    } else if (type === 'network_quote_rejected' || type === 'network_quote_accepted') {
      url = [2, 6, 8].includes(Number(user?.role_id)) ? '/mercado-trabajos' : '/red-autonomos';
    } else if (type === 'work_order_scheduled' || titleLower.includes('visita de técnico') || titleLower.includes('visita programada')) {
      url = [2, 6, 8].includes(Number(user?.role_id)) ? '/mercado-trabajos' : '/red-autonomos';
    } else if (isCliente) {
      if (type === 'recotizacion_lista' || type?.includes('quote') || type === 'new_quote' || type === 'quote_approved' || type === 'quote_rejected' || type === 'payment_received' || type === 'payment_validated') {
        const qId = n.data?.quote_id || n.data?.cotizacion_id || n.quote_id;
        url = qId ? `/vista-cotizaciones?quoteId=${qId}&filtro=Por Pagar` : '/vista-cotizaciones?filtro=Por Pagar';
      } else if (type?.includes('service') || type?.includes('work_order') || type === 'new_work_order' || type === 'work_order_scheduled' || type === 'work_order_cancelled_client' || type === 'visit_rescheduled') {
        const propId = n.data?.property_id || n.property_id;
        url = propId ? `/propiedad/${propId}/tablero` : '/propiedades';
      } else {
        url = '/propiedades';
      }
    } else {
      const workOrderId = n.data?.work_order_id || n.data?.service_id || n.data?.id || n.work_order_id || n.service_id || n.id;
      const titleLower2 = (n.data?.title || n.title || n.titulo || '').toLowerCase();

      if (type === 'technician_arrived') {
        url = (user?.role_id === 0 || user?.role_id === 1) ? (workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/map') : (workOrderId ? `/trabajo-propiedad/work_order-${workOrderId}` : '/trabajos-tecnico');
      } else if (type === 'work_order_finished' || type === 'new_report') {
        url = isTecnico ? '/trabajos-tecnico' : '/reportes-globales';
      } else if (type === 'solicitud_recotizacion_tecnico' || type === 'solicitud_recotizacion' || titleLower2.includes('recotiz') || type === 'new_quote' || type === 'quote_approved' || type === 'quote_rejected' || type === 'payment_received' || type === 'payment_validated' || type?.includes('quote')) {
        const qId = n.data?.quote_id || n.data?.cotizacion_id || n.quote_id;
        const esRecotizacion = type === 'solicitud_recotizacion' || type === 'solicitud_recotizacion_tecnico' || titleLower2.includes('recotiz');
        if (esRecotizacion) {
          url = qId ? `/vista-cotizaciones?quoteId=${qId}&filtro=Recotizaciones` : '/vista-cotizaciones?filtro=Recotizaciones';
        } else {
          url = isTecnico ? '/trabajos-tecnico' : (qId ? `/vista-cotizaciones?quoteId=${qId}` : '/vista-cotizaciones');
        }
      } else if (type === 'new_service_requested' || type === 'new_work_order' || type === 'service_assigned' || titleLower2.includes('solicitud de servicio') || titleLower2.includes('servicio')) {
        if (isTecnico) {
          url = '/trabajos-tecnico';
        } else {
          url = workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/tablero-servicios';
        }
      } else if (type === 'work_order_assigned' || type === 'work_order_rescheduled' || type === 'visit_rescheduled' || type === 'second_visit_requested' || type === 'second_visit_agreed' || type === 'second_visit_reprogrammed' || type === 'second_visit_admin_scheduled' || titleLower2.includes('segunda visita')) {
        if (isTecnico) {
          url = workOrderId ? `/trabajo-propiedad/work_order-${workOrderId}` : '/trabajos-tecnico';
        } else if (user?.role_id === 3) {
          const propId = n.data?.property_id || n.property_id;
          url = propId ? `/propiedad/${propId}/tablero` : '/propiedades';
        } else {
          url = workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/tablero-servicios';
        }
      } else if (type === 'user_account_deleted') {
        url = n.data?.url || n.url || ((n.data?.role_id || n.role_id) === 2 ? '/vista-tecnicos' : '/usuarios');
      } else if (url === '/VistaServiciosAdmin' || url === '/tablero-servicios') {
        url = isTecnico ? '/trabajos-tecnico' : (workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/tablero-servicios');
      }

      // Fallback de seguridad
      if (!url || (isTecnico && (url.includes('/propiedad/') || url.includes('/tablero-servicios') || url.includes('/VistaRoot')))) {
        if (isTecnico) {
          url = workOrderId ? `/trabajo-propiedad/work_order-${workOrderId}` : '/trabajos-tecnico';
        } else if (type?.includes('quote')) {
          const qId = n.data?.quote_id || n.quote_id;
          url = qId ? `/vista-cotizaciones?quoteId=${qId}` : '/vista-cotizaciones';
        }
        else if (type?.includes('service') || type?.includes('work_order') || titleLower2.includes('servicio')) {
          url = workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/tablero-servicios';
        }
        else url = '/VistaRoot';
      }
    }

    console.log("URL final de navegación:", url);
    if (url) {
      navigate(url);
    }
  };

  return (
    <div className="vn-page-wrapper">
      <Header titulo="NOTIFICACIONES" />
      
      <main className="vn-main-container">
        {/* Top Hero Bar */}
        <div className="vn-top-bar">
          <div className="vn-header-left">
            <div className="vn-icon-squircle">
              <Bell size={26} strokeWidth={2.4} />
              {totalNoLeidas > 0 && (
                <span className="vn-unread-pulse-badge">
                  {totalNoLeidas > 99 ? '99+' : totalNoLeidas}
                </span>
              )}
            </div>
            <div className="vn-header-titles">
              <h1 className="vn-title">Historial de Notificaciones</h1>
              <p className="vn-subtitle">
                Centro de alertas, avisos de servicios, cotizaciones y mensajería
              </p>
            </div>
          </div>

          <div className="vn-header-actions">
            {totalNoLeidas > 0 && (
              <button 
                type="button" 
                className="vn-mark-all-btn"
                onClick={handleMarcarTodasLeidas}
                title="Marcar todas como leídas"
              >
                <CheckCheck size={16} />
                <span>Marcar todas leídas</span>
              </button>
            )}

            <button 
              type="button" 
              className="vn-back-btn" 
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
              <span>REGRESAR</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Controls Card */}
        <div className="vn-controls-card">
          <div className="vn-controls-row">
            {/* Status Tabs */}
            <div className="vn-status-tabs">
              <button
                type="button"
                className={`vn-tab-btn ${filtroActivo === 'todas' ? 'active' : ''}`}
                onClick={() => setFiltroActivo('todas')}
              >
                <span>Todas</span>
                <span className="vn-tab-count">{notificaciones.length}</span>
              </button>

              <button
                type="button"
                className={`vn-tab-btn ${filtroActivo === 'no_leidas' ? 'active' : ''}`}
                onClick={() => setFiltroActivo('no_leidas')}
              >
                <span>No Leídas</span>
                <span className={`vn-tab-count ${totalNoLeidas > 0 ? 'unread' : ''}`}>
                  {totalNoLeidas}
                </span>
              </button>

              <button
                type="button"
                className={`vn-tab-btn ${filtroActivo === 'leidas' ? 'active' : ''}`}
                onClick={() => setFiltroActivo('leidas')}
              >
                <span>Leídas</span>
                <span className="vn-tab-count">{totalLeidas}</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="vn-search-wrapper">
              <Search size={16} className="vn-search-icon" />
              <input
                type="text"
                className="vn-search-input"
                placeholder="Buscar en notificaciones..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button
                  type="button"
                  className="vn-search-clear"
                  onClick={() => setBusqueda('')}
                  title="Limpiar búsqueda"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Category Chips */}
          <div className="vn-category-chips">
            <button
              type="button"
              className={`vn-chip-btn ${categoriaFiltro === 'todas' ? 'active' : ''}`}
              onClick={() => setCategoriaFiltro('todas')}
            >
              <Sparkles size={13} />
              <span>Todos los tipos</span>
            </button>

            <button
              type="button"
              className={`vn-chip-btn ${categoriaFiltro === 'cotizaciones' ? 'active' : ''}`}
              onClick={() => setCategoriaFiltro('cotizaciones')}
            >
              <DollarSign size={13} />
              <span>Cotizaciones</span>
            </button>

            <button
              type="button"
              className={`vn-chip-btn ${categoriaFiltro === 'mensajes' ? 'active' : ''}`}
              onClick={() => setCategoriaFiltro('mensajes')}
            >
              <MessageSquare size={13} />
              <span>Mensajes</span>
            </button>

            <button
              type="button"
              className={`vn-chip-btn ${categoriaFiltro === 'trabajos' ? 'active' : ''}`}
              onClick={() => setCategoriaFiltro('trabajos')}
            >
              <Wrench size={13} />
              <span>Trabajos y Servicios</span>
            </button>

            <button
              type="button"
              className={`vn-chip-btn ${categoriaFiltro === 'avisos' ? 'active' : ''}`}
              onClick={() => setCategoriaFiltro('avisos')}
            >
              <Bell size={13} />
              <span>Avisos del Sistema</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="vn-list-wrapper">
          {cargando ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="vn-skeleton-card">
                  <div className="vn-skeleton-avatar" />
                  <div className="vn-skeleton-content">
                    <div className="vn-skeleton-line" style={{ width: '40%' }} />
                    <div className="vn-skeleton-line" style={{ width: '80%' }} />
                    <div className="vn-skeleton-line" style={{ width: '25%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : notificacionesFiltradas.length === 0 ? (
            <div className="vn-empty-box">
              <div className="vn-empty-icon-wrap">
                <Inbox size={36} strokeWidth={1.8} />
              </div>
              <h3 className="vn-empty-title">Sin notificaciones</h3>
              <p className="vn-empty-desc">
                {busqueda
                  ? `No se encontraron resultados para "${busqueda}".`
                  : filtroActivo === 'no_leidas'
                  ? '¡Excelente! Estás al día, no tienes notificaciones pendientes por leer.'
                  : 'No hay notificaciones para mostrar con los filtros seleccionados.'}
              </p>
              {(busqueda || categoriaFiltro !== 'todas' || filtroActivo !== 'todas') && (
                <button
                  type="button"
                  className="vn-empty-reset-btn"
                  onClick={() => {
                    setBusqueda('');
                    setCategoriaFiltro('todas');
                    setFiltroActivo('todas');
                  }}
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            notificacionesFiltradas.map((notif) => {
              const esNueva = notif.read_at === null;
              const meta = getNotificationMeta(notif);
              const IconComp = meta.Icon;
              const titulo = notif.data?.title || notif.title || notif.titulo || 'Notificación';
              const mensaje = notif.data?.message || notif.message || notif.mensaje || '';
              const fecha = notif.created_at || notif.data?.created_at;

              return (
                <div
                  key={notif.id}
                  className={`vn-card ${esNueva ? 'unread' : 'read'}`}
                  onClick={() => handleNavigate(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNavigate(notif);
                    }
                  }}
                >
                  {/* Category / Icon Avatar */}
                  <div className={`vn-card-avatar ${meta.avatarClass}`}>
                    <IconComp size={22} strokeWidth={2.2} />
                    {esNueva && <span className="vn-card-unread-dot" />}
                  </div>

                  {/* Body Content */}
                  <div className="vn-card-body">
                    <div className="vn-card-meta-row">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={`vn-card-category-badge ${meta.categoryClass}`}>
                          {meta.category}
                        </span>
                        {esNueva && (
                          <span className="vn-badge-new">
                            Nueva
                          </span>
                        )}
                      </div>

                      <span className="vn-card-time">
                        <Clock size={12} />
                        {formatearFecha(fecha)}
                      </span>
                    </div>

                    <h3 className="vn-card-title">{titulo}</h3>
                    
                    {mensaje && (
                      <p className="vn-card-desc">{mensaje}</p>
                    )}
                  </div>

                  {/* Actions / Hover Indicator */}
                  <div className="vn-card-actions">
                    {esNueva && (
                      <button
                        type="button"
                        className="vn-card-mark-read-btn"
                        onClick={(e) => handleMarcarLeida(notif, e)}
                        title="Marcar como leída"
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                    )}
                    <div className="vn-card-arrow" title="Ver detalle">
                      <ArrowRight size={16} strokeWidth={2.4} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default VistaNotificaciones;