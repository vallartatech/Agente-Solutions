import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Bell, Check, Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Shared/NotificationBell.css";

const timeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `hace ${interval} año${interval === 1 ? '' : 's'}`;
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `hace ${interval} mes${interval === 1 ? '' : 'es'}`;
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `hace ${interval} día${interval === 1 ? '' : 's'}`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `hace ${interval} hora${interval === 1 ? '' : 's'}`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `hace ${interval} min${interval === 1 ? '' : 's'}`;
  return "hace unos segundos";
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      console.log("Notification from Bell clicked:", notification);
      
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

      // Fallback de seguridad
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

      console.log("Final URL from Bell:", url);

      if (url) {
        navigate(url);
      }
    } catch (error) {
      console.error("Error al marcar como leída", error);
    }
  };

  return (
    <div
      className="notification-bell-container"
      ref={dropdownRef}
      style={{ position: "relative", marginRight: "20px" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          position: "relative",
          padding: "5px",
        }}
      >
        <Bell size={24} color="#333" />
        {notifications.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              backgroundColor: "#F26522",
              color: "white",
              borderRadius: "50%",
              fontSize: "0.7rem",
              fontWeight: "bold",
              width: "18px",
              height: "18px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Notificaciones</span>
              <span className="notification-badge">
                {notifications.length} nuevas
              </span>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/notificaciones");
              }}
              className="notification-top-btn"
              title="Ver todas las notificaciones"
            >
              Ver todas ➔
            </button>
          </div>

          <div className="notification-action-bar">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate("/notificaciones");
              }}
              className="notification-action-link"
            >
              Ver todas las notificaciones
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                No tienes notificaciones nuevas.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className="notification-item"
                >
                  <div className="notification-item-icon">
                    <Info size={20} />
                  </div>
                  <div>
                    <h4 className="notification-item-title">
                      {notif.data?.title || notif.title || notif.titulo || 'Notificación'}
                    </h4>
                    <p className="notification-item-message">
                      {notif.data?.message || notif.message || notif.mensaje || ''}
                    </p>
                    {notif.created_at && (
                      <span style={{ fontSize: '11px', color: '#888', marginTop: '5px', display: 'block' }}>
                        {timeAgo(notif.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div
              className="notification-footer"
              onClick={() => {
                setIsOpen(false);
                navigate("/notificaciones");
              }}
            >
              Ver todas las notificaciones
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
