import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Clock, CheckCircle2, X, UserCircle, Calendar, 
  ArrowLeft, Camera, Layout, FileText, Maximize2, AlertTriangle, ChevronLeft, Timer,
  MapPin, Navigation, Phone
} from 'lucide-react';
import '../../../styles/AgenteSolutions/Cliente/TableroScrum.css';
import '../../../styles/AgenteSolutions/Tecnico/TrabajoPropiedad.css';

const TableroScrum = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [tareasData, setTareasData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [detalleCompleto, setDetalleCompleto] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [verBitacora, setVerBitacora] = useState(false);
  const [imagenExpandida, setImagenExpandida] = useState(null);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [tabActiva, setTabActiva] = useState('sos'); // Estado para pestañas en móvil

  const columnasConfig = [
    { id: 'sos', titulo: 'SOS', color: '#e63946', icon: <AlertTriangle size={20} /> },
    { id: 'todo', titulo: 'POR HACER', color: '#333', icon: <FileText size={20} /> },
    { id: 'progress', titulo: 'EN PROCESO', color: '#f26522', icon: <Timer size={20} /> },
    { id: 'done', titulo: 'FINALIZADOS', color: '#1b8a5a', icon: <CheckCircle2 size={20} /> },
    { id: 'rejected', titulo: 'CANCELADOS', color: '#dc2626', icon: <X size={20} /> }
  ];

  // --- MAPEO DE DATOS ---
  const transformarTareas = useCallback((data) => {
    return data.map(item => {
      let estado = 'todo';
      if (item.status === 'Listo' || item.status === 'Finalizado') estado = 'done';
      else if (item.status === 'Rechazado' || item.status === 'Cancelado') estado = 'rejected';
      else if (item.priority === 'Urgente' && item.status !== 'Listo') estado = 'sos';
      else if (item.status === 'En Proceso') estado = 'progress';
      
      return {
        dbId: item.id, // ID real de la base de datos
        titulo: `${item.zone} - ${item.equipment || 'General'}`,
        prioridad: item.priority === 'Urgente' ? 'SOS' : 'Normal',
        fechaFin: new Date(item.updated_at).toLocaleDateString(),
        tecnico: item.tecnico_nombre || 'Pendiente de asignar',
        fechaInicio: new Date(item.created_at).toLocaleDateString(),
        estado: estado,
        descripcion: (() => {
          let d = item.description || '';
          d = d.replace(/\[LOTE-[A-Z0-9]+\]\s*(\(\d+\/\d+\))?\s*/gi, '').trim();
          if (d.includes('[EQUIPO AFECTADO]:')) {
            d = d.split('[EQUIPO AFECTADO]:')[0].trim();
          }
          return d;
        })(),
        scheduledAt: item.scheduled_at,
        evidencias: item.evidence_path ? [`http://127.0.0.1:8000/storage/${item.evidence_path}`] : []
      };
    });
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${id}/work-orders`);
      setTareasData(transformarTareas(response.data));
    } catch (error) {
      console.error("Error cargando órdenes:", error);
    } finally {
      setLoading(false);
    }
  }, [id, transformarTareas]);

  useEffect(() => {
    if (id) fetchOrders();
  }, [id, fetchOrders]);

  // Guardar el ID de la propiedad en localStorage para que MainLayoutCliente tenga contexto
  useEffect(() => {
    if (id) {
      localStorage.setItem('current_property_id', id);
      window.dispatchEvent(new Event('sync-agente-ids'));
    }
  }, [id]);

  // --- ACCIONES ---
  const abrirModal = async (tarea) => {
    setTareaSeleccionada(tarea);
    setVerBitacora(false);
    setModalVisible(true);
    setDetalleCompleto(null);
    setCargandoDetalle(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/work_order-${tarea.dbId}`);
      if (res.data) {
        setDetalleCompleto(res.data.data || res.data);
      }
    } catch (err) {
      console.warn("No se pudo obtener el detalle completo del trabajo:", err);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setTareaSeleccionada(null);
    setDetalleCompleto(null);
  };

  if (loading) return <div className="loading-screen">Cargando Tablero Técnico...</div>;

  const renderColumna = (colId, titulo, clase) => (
    <div className={`scrum-column ${clase}`}>
      <div className="column-header">
        <span className="column-title-text">{titulo}</span>
        <span className="column-badge">{tareasData.filter(t => t.estado === colId).length}</span>
      </div>
      <div className="cards-container">
        {tareasData.filter(t => t.estado === colId).map(tarea => (
          <div key={tarea.dbId} className="card-wrapper">
            <button 
              className={`task-card-premium ${
                tarea.estado === 'sos' ? 'is-sos' : 
                tarea.estado === 'progress' ? 'is-active' : 
                tarea.estado === 'done' ? 'is-done' : 
                tarea.estado === 'rejected' ? 'is-rejected' : ''
              }`}
              onClick={() => abrirModal(tarea)}
            >
              <h5 className="task-title-card">
                {tarea.estado === 'sos' && <AlertTriangle size={14} className="sos-icon-inline" />}
                {tarea.titulo}
              </h5>
              <div className="card-status-row">
                {tarea.estado === 'done' ? (
                  <div className="status-pill-done">
                    <CheckCircle2 size={12} /> <span>Finalizado</span>
                  </div>
                ) : tarea.estado === 'rejected' ? (
                  <div className="status-pill-rejected" style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                    <X size={12} /> <span>Cancelado</span>
                  </div>
                ) : (
                  <span className={`priority-tag ${tarea.prioridad.toLowerCase()}`}>
                    {tarea.prioridad.toUpperCase()}
                  </span>
                )}
                <span className="date-tag"><Clock size={12}/> {tarea.fechaFin}</span>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="scrum-container">
      {/* HEADER DE NAVEGACIÓN */}
      <header className="scrum-header">
        <button className="btn-back-dashboard" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} /> VOLVER A LA PROPIEDAD
        </button>
        <h2>Tablero de Gestión de Servicios</h2>
      </header>

      {/* Tabs para Móvil */}
      <div className="scrum-tabs-mobile">
        {columnasConfig.map(col => (
          <button 
            key={col.id}
            className={`tab-btn ${tabActiva === col.id ? 'active' : ''}`}
            onClick={() => setTabActiva(col.id)}
            style={{ color: tabActiva === col.id ? col.color : '#999' }}
          >
            {col.icon}
            <span>{col.titulo}</span>
            {tabActiva === col.id && <div className="active-line" style={{ background: col.color }}></div>}
          </button>
        ))}
      </div>

      <div className="scrum-board-layout quad-layout">
        {columnasConfig.map(col => (
          <div key={col.id} className={`column-wrapper-responsive ${tabActiva === col.id ? 'show-mobile' : 'hide-mobile'}`}>
            {renderColumna(col.id, col.titulo === 'SOS' ? 'SOS ACEPTADOS' : col.titulo, `col-${col.id}`)}
          </div>
        ))}
      </div>

      {/* MODAL CON EL MISMO DISEÑO QUE EL DEL TÉCNICO */}
      {modalVisible && tareaSeleccionada && (
        <div className="modal-view-overlay" onClick={cerrarModal} style={{ zIndex: 9999 }}>
          <div 
            className="modal-card-container" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '920px', 
              width: '94%', 
              maxHeight: '92vh', 
              overflowY: 'auto', 
              borderRadius: '24px', 
              padding: 0, 
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: 'none',
              background: '#f8fafc'
            }}
          >
            {/* HERO BANNER IGUAL QUE LA VISTA DEL TÉCNICO */}
            <section className="tp-property-hero" style={{ height: '230px', borderRadius: '0', marginBottom: 0 }}>
              <div className="tp-hero-overlay"></div>
              <img 
                src={detalleCompleto?.foto_fachada || 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=1000'} 
                alt="Fachada de la Propiedad" 
                className="tp-hero-bg" 
              />
              
              <button 
                onClick={cerrarModal}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  zIndex: 10,
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(8px)',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}
              >
                ×
              </button>

              <div className="tp-hero-content" style={{ padding: '20px 25px' }}>
                <div className="tp-hero-text">
                  <span className="tp-id-badge">
                    {detalleCompleto?.identificador_curp || `WKF-ORD-#${tareaSeleccionada.dbId}`}
                  </span>
                  <h1 className="tp-property-name" style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
                    {detalleCompleto?.propiedad_nombre || tareaSeleccionada.titulo}
                  </h1>
                  <div className="tp-property-address">
                    <MapPin size={16} />
                    <p style={{ margin: 0 }}>{detalleCompleto?.direccion || 'Propiedad registrada'}</p>
                  </div>
                </div>
                
                <div className="tp-hero-actions">
                  {detalleCompleto?.coordenadas && (
                    <button 
                      className="tp-action-btn maps" 
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${detalleCompleto.coordenadas}`, '_blank')}
                    >
                      <Navigation size={16} />
                      <span>GPS</span>
                    </button>
                  )}
                  {detalleCompleto?.tecnico_telefono && (
                    <button 
                      className="tp-action-btn call" 
                      onClick={() => window.open(`tel:${detalleCompleto.tecnico_telefono}`)}
                    >
                      <Phone size={16} />
                      <span>Llamar Técnico</span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* SECCIÓN PRINCIPAL GRID */}
            <div style={{ padding: '24px', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* TARJETA CONSISTE EN: */}
                <div className="tp-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '22px', margin: 0, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div className="tp-card-header" style={{ marginBottom: '16px' }}>
                    <FileText size={20} color="#F26522" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>CONSISTE EN:</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      alignSelf: 'flex-start'
                    }}>
                      <AlertTriangle size={14} />
                      <span>TIPO DE FALLA / PROBLEMA</span>
                    </div>

                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                      {tareaSeleccionada.titulo}
                    </h4>

                    <p style={{ margin: 0, fontSize: '0.92rem', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                      {tareaSeleccionada.descripcion || 'Sin descripción detallada registrada.'}
                    </p>
                  </div>
                </div>

                {/* TARJETA DETALLES DE SERVICIO Y TÉCNICO */}
                <div className="tp-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '22px', margin: 0, display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div className="tp-card-header" style={{ marginBottom: '4px' }}>
                    <UserCircle size={20} color="#F26522" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>INFORMACIÓN DEL SERVICIO</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Técnico Asignado</label>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: '800' }}>{detalleCompleto?.tecnico_nombre || tareaSeleccionada.tecnico}</strong>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Fecha Reportado</label>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: '800' }}>{tareaSeleccionada.fechaInicio}</strong>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Visita Programada</label>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '800' }}>
                        {tareaSeleccionada.scheduledAt ? new Date(tareaSeleccionada.scheduledAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'Por programar'}
                      </strong>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Estado de Llegada</label>
                      {detalleCompleto?.arrival_status === 'EN_SITIO' ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#065f46', backgroundColor: '#d1fae5', padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '2px' }}>
                          🟢 En el lugar {detalleCompleto.arrived_at ? `(${detalleCompleto.arrived_at.substring(11, 16)})` : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#9a3412', backgroundColor: '#ffedd5', padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '2px' }}>
                          🟠 En camino
                        </span>
                      )}
                    </div>
                  </div>

                  {/* EVIDENCIAS DE FOTOGRAFÍAS */}
                  {((detalleCompleto?.evidencias && detalleCompleto.evidencias.length > 0) || (tareaSeleccionada.evidencias && tareaSeleccionada.evidencias.length > 0)) && (
                    <div style={{ marginTop: '5px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Camera size={16} color="#F26522" /> EVIDENCIAS REGISTRADAS
                      </h4>
                      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {(detalleCompleto?.evidencias || tareaSeleccionada.evidencias).map((img, i) => (
                          <img 
                            key={i} 
                            src={img} 
                            alt="Evidencia" 
                            onClick={() => setImagenExpandida(img)}
                            style={{ width: '74px', height: '74px', borderRadius: '12px', objectFit: 'cover', cursor: 'pointer', border: '1.5px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {imagenExpandida && (
        <div className="zoom-overlay" onClick={() => setImagenExpandida(null)} style={{ zIndex: 10000 }}>
          <button className="zoom-close-fixed" onClick={() => setImagenExpandida(null)}><X size={32} /></button>
          <div className="zoom-content" onClick={e => e.stopPropagation()}>
            <img src={imagenExpandida} className="image-zoomed" alt="Zoom" />
          </div>
        </div>
      )}

      <style>{`
        /* --- STYLES FOR MOBILE TABS --- */
        .scrum-tabs-mobile {
          display: none;
          background: white;
          padding: 10px 5px;
          margin: 10px 0;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          justify-content: space-around;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .tab-btn {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 8px 5px;
          cursor: pointer;
          position: relative;
          flex: 1;
        }
        .tab-btn span {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
        }
        .active-line {
          position: absolute;
          bottom: -5px;
          height: 3px;
          width: 25px;
          border-radius: 10px;
        }

        @media (max-width: 768px) {
          .scrum-tabs-mobile { display: flex; }
          .scrum-board-layout { 
            display: block !important; 
            padding: 0 10px;
          }
          .column-wrapper-responsive.hide-mobile { display: none; }
          .column-wrapper-responsive.show-mobile { display: block; animation: fadeIn 0.3s ease; }
          .scrum-column { width: 100% !important; margin: 0 !important; }
          .column-header { display: none; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default TableroScrum;
