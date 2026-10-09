import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Bell, 
  X, 
  Lightbulb, 
  Zap, 
  Clock, 
  Wrench, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  MessageSquare, 
  BellRing,
  ArrowRight
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Shared/NotificationBell.css";

const timeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Ahora";
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} a`;
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} m`;
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} d`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} h`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} min`;
  return "Ahora";
};

const formatNotifTime = (dateString) => {
  if (!dateString) return "Ahora";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return timeAgo(dateString);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
};

const getNotificationMeta = (notif) => {
  const type = (notif.data?.alert_type || notif.data?.type || notif.type || notif.alert_type || '').toLowerCase();
  const title = (notif.data?.title || notif.title || notif.titulo || '').toLowerCase();
  const msg = (notif.data?.message || notif.message || notif.mensaje || '').toLowerCase();

  if (type.includes('quote') || type.includes('pago') || type.includes('payment') || title.includes('cotiza') || title.includes('pago') || title.includes('costo') || msg.includes('cotiza')) {
    return { 
      category: 'Alerta de Cotización / Costo', 
      icon: <Zap size={18} strokeWidth={2.2} color="#0f172a" />, 
      tab: 'cotizaciones' 
    };
  }
  if (type.includes('visit') || type.includes('visita') || title.includes('visita') || title.includes('recordatorio') || title.includes('reprogram') || msg.includes('visita')) {
    return { 
      category: 'Recordatorios', 
      icon: <BellRing size={18} strokeWidth={2.2} color="#0f172a" />, 
      tab: 'recordatorios' 
    };
  }
  if (type.includes('service') || type.includes('work_order') || title.includes('servicio') || title.includes('trabajo') || msg.includes('servicio')) {
    return { 
      category: 'Estado de Servicio', 
      icon: <Lightbulb size={18} strokeWidth={2.2} color="#0f172a" />, 
      tab: 'servicios' 
    };
  }
  return { 
    category: 'Notificaciones', 
    icon: <Bell size={18} strokeWidth={2.2} color="#0f172a" />, 
    tab: 'alertas' 
  };
};

const NotificationBell = ({ triggerClassName = '' }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [popoverStyle, setPopoverStyle] = useState({});
  const navigate = useNavigate();
  const triggerBtnRef = useRef(null);
  const { user } = useAuth();

  // Función para obtener las notificaciones de Laravel y respaldo local
  const fetchNotifications = async () => {
    let list = [];
    try {
      const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
      const token = session.token || session.access_token || localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/notifications/unread`,
        { headers }
      );
      if (data?.success && Array.isArray(data?.notifications)) {
        list = data.notifications;
      } else if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      }
    } catch (error) {
      console.warn("Error al cargar notificaciones del servidor, usando respaldo local:", error);
    }

    let combined = [...list];

    if (user?.role_id === 2) {
      const localTecnico = JSON.parse(localStorage.getItem('notificaciones_tecnico') || '[]');
      const notifFiltradas = localTecnico.filter(n => !n.tecnico_user_id || n.tecnico_user_id == user.id);
      notifFiltradas.forEach(n => {
        if (!combined.some(item => String(item.id) === String(n.id))) combined.unshift(n);
      });
    } else if (user?.role_id === 0 || user?.role_id === 1) {
      const localAdmin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
      const localRoot = JSON.parse(localStorage.getItem('notificaciones_root') || '[]');
      const combinedLocals = [...localAdmin, ...localRoot];
      combinedLocals.forEach(n => {
        if (!combined.some(item => String(item.id) === String(n.id))) combined.unshift(n);
      });
    } else if (user?.role_id === 3) {
      const localCliente = JSON.parse(localStorage.getItem('notificaciones_cliente') || '[]');
      const notifFiltradas = localCliente.filter(n => !n.cliente_user_id || n.cliente_user_id == user.id);
      notifFiltradas.forEach(n => {
        if (!combined.some(item => String(item.id) === String(n.id))) combined.unshift(n);
      });
    }

    // Ordenar de más reciente a más antigua
    combined.sort((a, b) => {
      const dateA = new Date(a.created_at || a.fecha || a.id || 0).getTime();
      const dateB = new Date(b.created_at || b.fecha || b.id || 0).getTime();
      return dateB - dateA;
    });

    setNotifications(combined);
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const timer = setInterval(fetchNotifications, 3000);
      window.addEventListener('storage', fetchNotifications);
      window.addEventListener('notif_update', fetchNotifications);

      return () => {
        clearInterval(timer);
        window.removeEventListener('storage', fetchNotifications);
        window.removeEventListener('notif_update', fetchNotifications);
      };
    }
  }, [user]);

  // Recalcular posición del popover respecto a la ventana
  const updatePosition = () => {
    if (!triggerBtnRef.current) return;
    const rect = triggerBtnRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth <= 600;

    if (isMobile) {
      setPopoverStyle({
        position: 'fixed',
        top: `${Math.max(58, rect.bottom + 8)}px`,
        left: '12px',
        right: '12px',
        width: 'auto',
        maxWidth: 'calc(100vw - 24px)',
        zIndex: 999999999
      });
    } else {
      const rightDistance = Math.max(16, window.innerWidth - rect.right - 8);
      setPopoverStyle({
        position: 'fixed',
        top: `${rect.bottom + 12}px`,
        right: `${rightDistance}px`,
        left: 'auto',
        width: '400px',
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 999999999
      });
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification) => {
    try {
      try {
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/notifications/${notification.id}/read`,
        );
      } catch (e) {
        // Fallback local
      }
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      setIsOpen(false);

      let url = notification.data?.url || notification.url;
      const type = notification.data?.alert_type || notification.data?.type || notification.type || notification.alert_type;

      const isTecnico = user?.role_id === 2;
      const isCliente = user?.role_id === 3;
      const workOrderId = notification.data?.work_order_id || notification.data?.service_id || notification.data?.id || notification.work_order_id || notification.service_id || notification.id;
      const titleLower = (notification.data?.title || notification.title || notification.titulo || '').toLowerCase();

      if (type === 'new_quote_message' || titleLower.includes('nuevo mensaje') || titleLower.includes('mensaje en la red')) {
        if ([2, 6, 8].includes(Number(user?.role_id))) {
          url = notification.data?.network_quote_id ? `/mercado-trabajos` : `/vista-cotizaciones`;
        } else if ([3, 4, 5, 7].includes(Number(user?.role_id))) {
          url = '/red-autonomos';
        } else {
          url = notification.data?.url || '/vista-cotizaciones';
        }
      } else if (type === 'network_quote_received' || titleLower.includes('nueva cotización en la red') || titleLower.includes('cotización en la red')) {
        url = '/red-autonomos';
      } else if (type === 'network_quote_rejected' || type === 'network_quote_accepted') {
        url = [2, 6, 8].includes(Number(user?.role_id)) ? '/mercado-trabajos' : '/red-autonomos';
      } else if (type === 'work_order_scheduled' || titleLower.includes('visita de técnico') || titleLower.includes('visita programada')) {
        url = [2, 6, 8].includes(Number(user?.role_id)) ? '/mercado-trabajos' : '/red-autonomos';
      } else if (type === 'technician_arrived') {
        url = (user?.role_id === 0 || user?.role_id === 1) ? (workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/map') : (workOrderId ? `/trabajo-propiedad/work_order-${workOrderId}` : '/trabajos-tecnico');
      } else if (type === 'work_order_finished' || type === 'new_report') {
        url = isTecnico ? '/trabajos-tecnico' : '/reportes-globales';
      } else if (type === 'recotizacion_lista' || titleLower.includes('recotización está lista')) {
        const qId = notification.data?.quote_id || notification.data?.cotizacion_id || notification.quote_id;
        url = qId ? `/vista-cotizaciones?quoteId=${qId}&filtro=Por Pagar` : '/vista-cotizaciones?filtro=Por Pagar';
      } else if (type === 'solicitud_recotizacion_tecnico' || type === 'solicitud_recotizacion' || titleLower.includes('recotiz') || type === 'new_quote' || type === 'quote_approved' || type === 'quote_rejected' || type === 'payment_received' || type === 'payment_validated' || type?.includes('quote')) {
        const qId = notification.data?.quote_id || notification.data?.cotizacion_id || notification.quote_id;
        const esRecotizacion = type === 'solicitud_recotizacion' || type === 'solicitud_recotizacion_tecnico' || titleLower.includes('recotiz');
        if (esRecotizacion) {
          url = isCliente ? `/vista-cotizaciones?quoteId=${qId}&filtro=Por Pagar` : (qId ? `/vista-cotizaciones?quoteId=${qId}&filtro=Recotizaciones` : '/vista-cotizaciones?filtro=Recotizaciones');
        } else {
          url = isTecnico ? '/trabajos-tecnico' : (qId ? `/vista-cotizaciones?quoteId=${qId}` : '/vista-cotizaciones');
        }
      } else if (type === 'new_service_requested' || type === 'new_work_order' || type === 'service_assigned' || titleLower.includes('solicitud de servicio') || titleLower.includes('servicio')) {
        if (isTecnico) {
          url = '/trabajos-tecnico';
        } else {
          url = workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/tablero-servicios';
        }
      } else if (type === 'work_order_assigned' || type === 'work_order_rescheduled' || type === 'visit_rescheduled') {
        url = isTecnico ? '/trabajos-tecnico' : '/levantamientos';
      } else if (type === 'work_order_cancelled_client') { 
        const propId = notification.data?.property_id || notification.property_id; 
        url = propId ? `/propiedad/${propId}/tablero` : '/propiedades'; 
      } else if (type === 'user_account_deleted') {
        url = notification.data?.url || notification.url || ((notification.data?.role_id || notification.role_id) === 2 ? '/vista-tecnicos' : '/usuarios');
      } else if (type === 'second_visit_requested' || type === 'second_visit_agreed' || type === 'second_visit_reprogrammed' || type === 'second_visit_admin_scheduled' || titleLower.includes('segunda visita')) {
        const propId = notification.data?.property_id || notification.property_id;
        if (isTecnico) {
          url = workOrderId ? `/trabajo-propiedad/work_order-${workOrderId}` : '/trabajos-tecnico';
        } else if (user?.role_id === 3) {
          url = propId ? `/propiedad/${propId}/tablero` : '/propiedades';
        } else {
          url = workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/tablero-servicios';
        }
      } else if (url === '/VistaServiciosAdmin' || url === '/tablero-servicios') {
        url = isTecnico ? (workOrderId ? `/trabajo-propiedad/work_order-${workOrderId}` : '/trabajos-tecnico') : (workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/tablero-servicios');
      }

      if (!url || (isTecnico && (url.includes('/propiedad/') || url.includes('/tablero-servicios') || url.includes('/VistaRoot')))) {
        if (isTecnico) {
          url = workOrderId ? `/trabajo-propiedad/work_order-${workOrderId}` : '/trabajos-tecnico';
        } else if (type?.includes('quote')) {
          const qId = notification.data?.quote_id || notification.quote_id;
          url = qId ? `/vista-cotizaciones?quoteId=${qId}` : '/vista-cotizaciones';
        }
        else if (type?.includes('service') || type?.includes('work_order') || titleLower.includes('servicio')) {
          url = workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/tablero-servicios';
        }
        else url = '/VistaRoot';
      }

      if (url) {
        navigate(url);
      }
    } catch (error) {
      console.error("Error al marcar como leída", error);
    }
  };

  // Filtrado de notificaciones por pestaña
  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'all') return true;
    const meta = getNotificationMeta(notif);
    return meta.tab === activeTab;
  });

  return (
    <div className="nb-wrapper">
      {/* Botón Campana Disparador */}
      <button
        type="button"
        ref={triggerBtnRef}
        className={`nb-trigger-btn ${triggerClassName} ${isOpen ? 'active' : ''}`.trim()}
        onClick={handleToggle}
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <Bell size={19} className="nb-trigger-icon" />
        {notifications.length > 0 && (
          <span className="nb-trigger-badge">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {/* Popover / Tarjeta de Notificaciones renderizada en Portal directo al body */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop invisible / translúcido para cerrar al hacer tap fuera */}
          <div
            className="nb-backdrop"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          <div
            className="nb-card-popover animate-popover-in"
            style={popoverStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="nb-header">
              <h3 className="nb-title">Notificaciones</h3>
              <button
                type="button"
                className="nb-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                title="Cerrar"
                aria-label="Cerrar notificaciones"
              >
                <X size={17} strokeWidth={2.4} />
              </button>
            </div>

            {/* Filter Tabs Row */}
            <div className="nb-tabs-row">
              <button
                type="button"
                className={`nb-tab-pill ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                Todas
              </button>
              <button
                type="button"
                className={`nb-tab-pill ${activeTab === 'servicios' ? 'active' : ''}`}
                onClick={() => setActiveTab('servicios')}
              >
                Servicios
              </button>
              <button
                type="button"
                className={`nb-tab-pill ${activeTab === 'recordatorios' ? 'active' : ''}`}
                onClick={() => setActiveTab('recordatorios')}
              >
                Recordatorios
              </button>
              <button
                type="button"
                className={`nb-tab-pill ${activeTab === 'cotizaciones' ? 'active' : ''}`}
                onClick={() => setActiveTab('cotizaciones')}
              >
                Cotizaciones
              </button>
            </div>

            {/* List of Notification Items */}
            <div className="nb-list-container">
              {filteredNotifications.length === 0 ? (
                <div className="nb-empty-state">
                  <div className="nb-empty-icon-box">
                    <CheckCircle2 size={24} color="#10b981" />
                  </div>
                  <p className="nb-empty-title">Estás al día</p>
                  <p className="nb-empty-desc">No hay notificaciones pendientes en esta categoría.</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const meta = getNotificationMeta(notif);
                  const titleText = notif.data?.title || notif.title || notif.titulo || notif.data?.message || notif.message || notif.mensaje || 'Notificación del sistema';
                  const timeText = formatNotifTime(notif.created_at || notif.fecha);

                  return (
                    <div
                      key={notif.id}
                      className="nb-item-card"
                      onClick={() => handleNotificationClick(notif)}
                    >
                      {/* Left Circular Icon with Orange Dot */}
                      <div className="nb-item-avatar-box">
                        <span className="nb-unread-orange-dot" />
                        <div className="nb-item-icon-circle">
                          {meta.icon}
                        </div>
                      </div>

                      {/* Center Text Info */}
                      <div className="nb-item-content">
                        <span className="nb-item-category">{meta.category}</span>
                        <h4 className="nb-item-message">{titleText}</h4>
                      </div>

                      {/* Right Timestamp */}
                      <span className="nb-item-time">{timeText}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Bar */}
            <div className="nb-footer">
              <button
                type="button"
                className="nb-footer-btn"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/notificaciones");
                }}
              >
                <span>Ver historial completo</span>
                <ArrowRight size={14} />
              </button>
            </div>

          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;

