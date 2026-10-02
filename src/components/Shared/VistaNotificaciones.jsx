import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, CheckCircle, Info, ChevronLeft } from 'lucide-react';
import Header from './Header';

const VistaNotificaciones = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [filtroActivo, setFiltroActivo] = useState('todas'); 
  
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
    const opciones = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(fechaString).toLocaleDateString('es-ES', opciones);
  };

  const notificacionesFiltradas = notificaciones.filter(notif => {
    if (filtroActivo === 'leidas') return notif.read_at !== null;
    if (filtroActivo === 'no_leidas') return notif.read_at === null;
    return true; 
  });

  return (
    <div style={{ backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
      <Header titulo="NOTIFICACIONES" />
      
      <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={28} color="#F26522" />
            <h2 style={{ color: '#333', margin: 0 }}>Historial de Notificaciones</h2>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F26522', color: 'white', padding: '8px 20px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <ChevronLeft size={18} />
            <span>REGRESAR</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {['todas', 'no_leidas', 'leidas'].map((filtro) => (
            <button
              key={filtro}
              onClick={() => setFiltroActivo(filtro)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                backgroundColor: filtroActivo === filtro ? '#F26522' : '#e0e0e0',
                color: filtroActivo === filtro ? 'white' : '#555',
                boxShadow: filtroActivo === filtro ? '0 2px 8px rgba(242, 101, 34, 0.4)' : 'none'
              }}
            >
              {filtro === 'todas' ? 'Todas' : filtro === 'no_leidas' ? 'No Leídas' : 'Leídas'}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {cargando ? (
            <p style={{ padding: '30px', textAlign: 'center', color: '#888' }}>Cargando historial...</p>
          ) : notificacionesFiltradas.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
              <Bell size={40} color="#ccc" style={{ marginBottom: '10px' }} />
              <p>No hay notificaciones en esta categoría.</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {notificacionesFiltradas.map((notif) => {
                const esNueva = notif.read_at === null;

                  const handleNavigate = (n) => {
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
                      const titleLower = (n.data?.title || n.title || n.titulo || '').toLowerCase();

                      if (type === 'technician_arrived') {
                        url = (user?.role_id === 0 || user?.role_id === 1) ? (workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/map') : (workOrderId ? `/trabajo-propiedad/work_order-${workOrderId}` : '/trabajos-tecnico');
                      } else if (type === 'work_order_finished' || type === 'new_report') {
                        url = isTecnico ? '/trabajos-tecnico' : '/reportes-globales';
                      } else if (type === 'solicitud_recotizacion_tecnico' || type === 'solicitud_recotizacion' || titleLower.includes('recotiz') || type === 'new_quote' || type === 'quote_approved' || type === 'quote_rejected' || type === 'payment_received' || type === 'payment_validated' || type?.includes('quote')) {
                        const qId = n.data?.quote_id || n.data?.cotizacion_id || n.quote_id;
                        const esRecotizacion = type === 'solicitud_recotizacion' || type === 'solicitud_recotizacion_tecnico' || titleLower.includes('recotiz');
                        if (esRecotizacion) {
                          url = qId ? `/vista-cotizaciones?quoteId=${qId}&filtro=Recotizaciones` : '/vista-cotizaciones?filtro=Recotizaciones';
                        } else {
                          url = isTecnico ? '/trabajos-tecnico' : (qId ? `/vista-cotizaciones?quoteId=${qId}` : '/vista-cotizaciones');
                        }
                      } else if (type === 'new_service_requested' || type === 'new_work_order' || type === 'service_assigned' || titleLower.includes('solicitud de servicio') || titleLower.includes('servicio')) {
                        if (isTecnico) {
                          url = '/trabajos-tecnico';
                        } else {
                          url = workOrderId ? `/tablero-servicios?jobId=${workOrderId}` : '/tablero-servicios';
                        }
                      } else if (type === 'work_order_assigned' || type === 'work_order_rescheduled' || type === 'visit_rescheduled' || type === 'second_visit_requested' || type === 'second_visit_agreed' || type === 'second_visit_reprogrammed' || type === 'second_visit_admin_scheduled' || titleLower.includes('segunda visita')) {
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
                        else if (type?.includes('service') || type?.includes('work_order') || titleLower.includes('servicio')) {
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
                  <li
                    key={notif.id}
                    style={{
                      padding: '20px',
                      borderBottom: '1px solid #eee',
                      backgroundColor: esNueva ? '#fffafa' : 'white',
                      display: 'flex',
                      gap: '15px',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => handleNavigate(notif)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = esNueva ? '#ffe9df' : '#f9f9f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = esNueva ? '#fffafa' : 'white'}
                  >
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: esNueva ? '#FF3B30' : 'transparent', 
                      marginTop: '6px',
                      flexShrink: 0
                    }} />

                    <div style={{ color: esNueva ? '#F26522' : '#999', marginTop: '0px' }}>
                      {esNueva ? <Info size={24} /> : <CheckCircle size={24} />}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 5px 0', color: esNueva ? '#000' : '#555', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {notif.data?.title || notif.title || notif.titulo || 'Notificación'}
                        {esNueva && (
                          <span style={{ fontSize: '0.7rem', backgroundColor: '#FF3B30', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>
                            Nueva
                          </span>
                        )}
                      </h4>
                      <p style={{ margin: '0 0 8px 0', color: '#555', fontSize: '0.95rem' }}>
                        {notif.data?.message || notif.message || notif.mensaje || ''}
                      </p>
                      <span style={{ fontSize: '0.8rem', color: '#999' }}>
                        {formatearFecha(notif.created_at)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

export default VistaNotificaciones;