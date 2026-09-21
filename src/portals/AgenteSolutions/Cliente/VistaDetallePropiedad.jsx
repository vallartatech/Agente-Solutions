import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Layout, CheckCircle2, ListTodo, Timer, AlertCircle, 
  FileText, History, ChevronDown, ChevronUp, X, 
  User, Eye, MapPin, Tag, PlusCircle, 
  Home, Wrench, MessageSquare, Camera, ImageIcon, Image, Trash2, Plus,
  ChevronLeft, ArrowLeft, Loader2, Clock, Briefcase
} from 'lucide-react';
import '../../../styles/AgenteSolutions/Cliente/DetallePropiedad.css';

const VistaDetallePropiedad = () => {
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  
  // Usar el id de la URL o bien el guardado en localStorage como respaldo
  const id = idParam || localStorage.getItem('current_property_id');
  
  // --- ESTADOS DE DATOS (Backend) ---
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE UI (Modales y Toggles) ---
  const [mostrarHistorial, setMostrarHistorial] = useState(true);
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [mostrarPerfilPropiedad, setMostrarPerfilPropiedad] = useState(false);
  const [mostrarModalServicio, setMostrarModalServicio] = useState(false);
  
  const [nuevoServicio, setNuevoServicio] = useState({
    tipo: '',
    zona: '',
    area_id: '',
    equipo: '',
    descripcion: '',
    fotos: []
  });
  const [carritoServicios, setCarritoServicios] = useState([]);
  const [zonasDisponibles, setZonasDisponibles] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const cameraRef = React.useRef(null);
  const galleryRef = React.useRef(null);
  const [reportesDetallados, setReportesDetallados] = useState([]);
  const [cargandoReportes, setCargandoReportes] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  // --- ESTADOS COMPARTIR PROPIEDAD ---
  const [mostrarModalCompartir, setMostrarModalCompartir] = useState(false);
  const [emailCompartir, setEmailCompartir] = useState('');
  const [loadingCompartir, setLoadingCompartir] = useState(false);
  const [usuariosCompartidos, setUsuariosCompartidos] = useState([]);

  const fetchUsuariosCompartidos = async () => {
    try {
      const token = localStorage.getItem('agente_token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${id}/shared-users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsuariosCompartidos(res.data || []);
    } catch (error) {
      console.error("Error al obtener usuarios compartidos:", error);
    }
  };

  const handleCompartir = async (e) => {
    e.preventDefault();
    if (!emailCompartir) return;
    setLoadingCompartir(true);
    try {
      const token = localStorage.getItem('agente_token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${id}/share`, 
        { email: emailCompartir }, 
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      alert("Propiedad compartida exitosamente");
      setEmailCompartir('');
      setMostrarModalCompartir(false);
      fetchUsuariosCompartidos();
    } catch (error) {
      alert(error.response?.data?.error || "Error al compartir propiedad");
    } finally {
      setLoadingCompartir(false);
    }
  };

  const handleRevocar = async (clientId) => {
    if (!window.confirm("¿Estás seguro que deseas Desheredar esta propiedad? El usuario ya no podrá verla ni levantar reportes.")) return;
    try {
      const token = localStorage.getItem('agente_token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${id}/share/${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert("Acceso revocado");
      fetchUsuariosCompartidos();
    } catch (error) {
      alert("Error al revocar acceso");
    }
  };

  const fetchDetalleTrabajo = async (item) => {
    setReporteSeleccionado(item);
    setReportesDetallados([]);
    setCargandoReportes(true);

    try {
      const token = localStorage.getItem('agente_token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/${item.id}/reportes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setReportesDetallados(res.data || []);
    } catch (error) {
      console.error("Error al cargar la bitácora del trabajo:", error);
    } finally {
      setCargandoReportes(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('agente_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

       const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${id}/dashboard`, { headers });
      
      // Mapeamos el historial para que coincida con el componente visual
      if (response.data.historial) {
        response.data.historial = response.data.historial.map(h => ({
          id: h.id,
          producto: h.title || h.labor || "Trabajo Finalizado",
          tecnico: h.tecnico_nombre || "Técnico",
          fecha: new Date(h.updated_at || h.fecha).toLocaleDateString(),
          evidencias: h.fotos || []
        }));
      }

      setData(response.data);
      
      // Sincronizamos el contexto del sidebar por si acaso
      localStorage.setItem('current_property_id', id);
      if (response.data.id_levantamiento) {
        localStorage.setItem('current_levantamiento_id', response.data.id_levantamiento);
      } else {
        localStorage.removeItem('current_levantamiento_id');
      }
      
      // DISPARAMOS EVENTO PARA QUE EL SIDEBAR SE ENTERE DEL CAMBIO
      window.dispatchEvent(new Event('sync-agente-ids'));
      
      // Fetch real zones for this property
      setLoadingZonas(true);
      const areasRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/${id}/areas`, { headers });
      setZonasDisponibles(areasRes.data || []);
    } catch (error) {
      console.error("Error cargando el dashboard o zonas:", error);
    } finally {
      setLoading(false);
      setLoadingZonas(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDashboardData();
      fetchUsuariosCompartidos();
    }
  }, [id]);

  const handleAnadirAlCarrito = (e) => {
    e.preventDefault();
    if (!nuevoServicio.tipo || !nuevoServicio.area_id || !nuevoServicio.descripcion) {
      alert("Por favor completa los campos obligatorios (Tipo, Zona y Descripción).");
      return;
    }
    
    setCarritoServicios([...carritoServicios, { ...nuevoServicio }]);
    setNuevoServicio({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', fotos: [] });
  };

  const handleSubmitBatch = async () => {
    // Si dejaron un campo a medio llenar, lo añadimos automáticamente al carrito
    let lote = [...carritoServicios];
    if (nuevoServicio.tipo && nuevoServicio.area_id && nuevoServicio.descripcion) {
      lote.push({ ...nuevoServicio });
    }

    if (lote.length === 0) {
      alert("No has añadido ningún problema a la lista.");
      return;
    }

    setLoadingSubmit(true);
    const token = localStorage.getItem('agente_token');
    const loteId = `LOTE-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const total = lote.length;

    try {
      await Promise.all(lote.map(async (item, index) => {
        const formData = new FormData();
        formData.append('property_id', id);
        formData.append('type', item.tipo);
        formData.append('zone', item.zona);
        formData.append('equipment', item.equipo || '');
        
        // El loteID va en la descripción para que el Admin lo vea en el Kanban
        const descBase = item.equipo 
          ? `${item.descripcion}\n\n[EQUIPO AFECTADO]: ${item.equipo}`
          : item.descripcion;
        const descFinal = total > 1
          ? `[${loteId}] (${index + 1}/${total})\n${descBase}`
          : descBase;
        
        formData.append('description', descFinal);
        if (total > 1) {
            formData.append('batch_id', loteId);
        }
        
        item.fotos.forEach((foto, i) => {
          formData.append(`evidence_${i + 1}`, foto);
        });

        return axios.post(`${import.meta.env.VITE_API_BASE_URL}/work-orders/cliente`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
      }));

      alert("✅ Solicitudes enviadas con éxito. Un técnico las revisará pronto.");
      setMostrarModalServicio(false);
      setCarritoServicios([]);
      setNuevoServicio({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', fotos: [] });
      fetchDashboardData(); 
    } catch (error) {
      console.error("Error enviando lote:", error);
      alert("❌ Hubo un error al enviar algunas solicitudes. Por favor, intenta de nuevo.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const nuevasFotos = [...nuevoServicio.fotos, ...files].slice(0, 2);
    setNuevoServicio({ ...nuevoServicio, fotos: nuevasFotos });
  };

  const removeFoto = (index) => {
    const nuevasFotos = nuevoServicio.fotos.filter((_, i) => i !== index);
    setNuevoServicio({ ...nuevoServicio, fotos: nuevasFotos });
  };

  const selectPhotoSource = (source) => {
    if (source === 'camera') {
      cameraRef.current.click();
    } else {
      galleryRef.current.click();
    }
    setIsPhotoMenuOpen(false);
  };

  // Manejador del select de zonas en el modal
  const handleZonaChange = async (areaId) => {
    if (areaId === 'otro') {
      setNuevoServicio({ 
        ...nuevoServicio, 
        area_id: 'otro', 
        zona: 'Otro', 
        equipo: '' 
      });
      setEquiposDisponibles([]);
      return;
    }

    let selectedArea = zonasDisponibles.find(z => z.id === parseInt(areaId));
    if (!selectedArea) {
      for (const zona of zonasDisponibles) {
        const sub = (zona.sub_areas || zona.subAreas || []).find(s => s.id === parseInt(areaId));
        if (sub) {
          selectedArea = { ...sub, name: `${zona.name} - ${sub.name}` };
          break;
        }
      }
    }

    setNuevoServicio({ 
      ...nuevoServicio, 
      area_id: areaId, 
      zona: selectedArea ? selectedArea.name : '', 
      equipo: '' 
    });
    
    if (areaId) {
      setLoadingEquipos(true);
      try {
        const token = localStorage.getItem('agente_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/areas/${areaId}/components`, { headers });
        
        const componentes = res.data || [];
        const agrupados = componentes.reduce((acc, curr) => {
          const cat = curr.category || 'General';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(curr);
          return acc;
        }, {});
        
        setEquiposDisponibles(agrupados);
      } catch (error) {
        console.error("Error cargando equipos:", error);
        setEquiposDisponibles({});
      } finally {
        setLoadingEquipos(false);
      }
    } else {
      setEquiposDisponibles({});
    }
  };

  // --- RENDERIZADO CONDICIONAL MIENTRAS CARGA ---
  if (loading) return <div className="loading" style={{textAlign: 'center', padding: '50px'}}>Cargando Tablero...</div>;
  if (!data) return <div className="error" style={{textAlign: 'center', padding: '50px'}}>No se encontró la información de la propiedad.</div>;

  // Extraemos la información del JSON que mandó Laravel
  const { propiedad, stats, historial, cotizaciones_pendientes, avance_obra } = data;

  return (
    <div className="view-container">
      <div className="main-layout-detail">
        {/* ==========================================
            COLUMNA IZQUIERDA (Info + Historial)
            ========================================== */}
        <div className="left-column">
          <div className="property-id-header">
            <button className="btn-id-profile" onClick={() => setMostrarPerfilPropiedad(true)}>
              <Tag size={16} /> ID REGISTRO: <strong>{propiedad.custom_curp || propiedad.id}</strong>
            </button>
          </div>

          <div className="hero-section-compact">
            <img 
              src={propiedad.facade_photo_path ? propiedad.facade_photo_path : 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1000'} 
              alt="Propiedad" 
              className="hero-img" 
            />
          </div>

          <div className="action-header-right" style={{ display: 'flex', gap: '10px', flexDirection: window.innerWidth <= 768 ? 'column' : 'row', marginTop: '20px' }}>
            <button 
              className="btn-add-service-full" 
              style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }} 
              onClick={() => navigate('/SOSView')}
            >
              <AlertCircle size={20} /> SOS
            </button>
            {data && !data.is_shared_with_me && (
              <button className="btn-add-service-full" style={{ flex: 1, backgroundColor: '#007bff', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={() => setMostrarModalCompartir(true)}>
                <User size={20} /> {usuariosCompartidos.length > 0 ? "COMPARTIENDO" : "COMPARTIR"}
              </button>
            )}
            <button className="btn-add-service-full" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={() => setMostrarModalServicio(true)}>
              <PlusCircle size={20} /> AGREGAR SERVICIO
            </button>
            <button 
              className="btn-add-service-full" 
              style={{ flex: 1, backgroundColor: '#444', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }} 
              onClick={() => {
                const levantamientoId = localStorage.getItem('current_levantamiento_id');
                const path = levantamientoId ? `/detalle-reporte/${levantamientoId}` : `/detalle-reporte/prop_${id}`;
                navigate(path);
              }}
            >
              <FileText size={20} /> VER LEVANTAMIENTO
            </button>
          </div>

          {/* BANNER NOTIFICACIÓN DE 2DA VISITA PARA EL CLIENTE */}
          {(() => {
            const historialItems = historial || [];
            const tareaPendiente2da = historialItems.find(t => 
              t.estado === 'Segunda Visita Solicitada' || 
              t.status === 'Segunda Visita Solicitada' || 
              (t.description && t.description.includes('[SOLICITUD 2DA VISITA]') && !t.description.includes('[RESPUESTA CLIENTE 2DA VISITA]'))
            );

            if (!tareaPendiente2da) return null;

            return (
              <div style={{ marginTop: '20px', background: '#fff7ed', border: '2px solid #ea580c', borderRadius: '16px', padding: '18px', boxShadow: '0 8px 20px rgba(234,88,12,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#c2410c', fontWeight: '900', fontSize: '1rem', marginBottom: '6px' }}>
                  <Timer size={22} color="#ea580c" />
                  <span>SOLICITUD DE REPROGRAMACIÓN DE SEGUNDA VISITA</span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: '#431407', lineHeight: '1.4' }}>
                  El técnico solicitó realizar una segunda visita para concluir el trabajo de: <strong>{tareaPendiente2da.producto || 'Mantenimiento'}</strong>.
                </p>
                <button 
                  onClick={() => navigate(`/propiedad/${id}/tablero`)}
                  style={{ background: '#ea580c', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span>VER DETALLES Y CONFIRMAR FECHA</span>
                  <ChevronDown size={16} />
                </button>
              </div>
            );
          })()}
        </div>

        {/* ==========================================
            COLUMNA DERECHA (Tablero + Acciones)
            ========================================== */}
        <div className="right-column">

          <div className="info-card-premium sticky-card">
            <div className="card-header-clean">
              <Layout size={20} className="icon-orange" />
              <h3>Tablero de Control</h3>
            </div>
            
            <div className="jira-stats-grid quad">
              <div className="stat-box sos-urgent-stat" onClick={() => navigate('/SOSView')}>
                <AlertCircle size={24} />
                <span className="stat-number">{stats.sos || 0}</span>
                <span className="stat-label">SOS</span>
              </div>
              <div className="stat-box todo">
                <ListTodo size={24} />
                <span className="stat-number">{stats.pendientes || 0}</span>
                <span className="stat-label">POR HACER</span>
              </div>
              <div className="stat-box in-progress">
                <Timer size={24} />
                <span className="stat-number">{stats.proceso || 0}</span>
                <span className="stat-label">PROCESO</span>
              </div>
              <div className="stat-box done">
                <CheckCircle2 size={24} />
                <span className="stat-number">{stats.listos || 0}</span>
                <span className="stat-label">LISTOS</span>
              </div>
            </div>

            <div className="tablero-actions-center">
              <button className="btn-orange-small" onClick={() => navigate(`/propiedad/${id}/tablero`)}>
                Ver tablero detallado
              </button>
            </div>
            
            <div className="sprint-footer">
              <div className="sprint-progress-meta">
                <span>Avance de Obra</span>
                <span>{avance_obra || 0}%</span>
              </div>
              <div className="sprint-progress-bar">
                <div className="sprint-progress-fill" style={{ width: `${avance_obra || 0}%` }}></div>
              </div>
            </div>
            
            <div className="quote-section-link" onClick={() => navigate(`/vista-cotizaciones?propertyId=${id}`)}>
              <div className="quote-content">
                <FileText size={20} />
                <span>Ver Cotizaciones Nuevas</span>
              </div>
              <div className="quote-badge-large">{cotizaciones_pendientes || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL 1: DETALLE DE TRABAJO (BITÁCORA)
          ========================================== */}
      {reporteSeleccionado && (
        <div className="modal-overlay" onClick={() => setReporteSeleccionado(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '95vw' }}>
            <button className="close-modal" onClick={() => setReporteSeleccionado(null)}><X /></button>
            <div className="modal-header" style={{ borderBottom: '2px solid #f26624', paddingBottom: '15px' }}>
              <div className="modal-tag" style={{ background: '#f26624', color: 'white' }}>BITÁCORA DE TRABAJO</div>
              <h2 style={{ color: '#333' }}>{reporteSeleccionado.producto}</h2>
              <p className="modal-subtitle" style={{ color: '#666' }}>
                Finalizado el {reporteSeleccionado.fecha} | Técnico: {reporteSeleccionado.tecnico}
              </p>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px 0' }}>
              
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#333' }}>
                <ImageIcon size={20} /> PASOS REALIZADOS
              </h4>

              {cargandoReportes ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Loader2 className="animate-spin" size={40} color="#f26624" />
                  <p style={{ marginTop: '10px', fontWeight: 'bold' }}>Cargando bitácora...</p>
                </div>
              ) : reportesDetallados.length > 0 ? (
                <div className="client-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                  {reportesDetallados.map((rep, idx) => (
                    <div key={rep.id} className="timeline-step" style={{ display: 'flex', gap: '15px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '15px', borderLeft: '4px solid #f26624' }}>
                      <div className="step-num-pill" style={{ background: '#333', color: 'white', minWidth: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                         {idx + 1}
                      </div>
                      <div className="step-info" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>{rep.title || `Avance ${idx + 1}`}</h5>
                          <span style={{ fontSize: '11px', color: '#888' }}><Clock size={12}/> {new Date(rep.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p style={{ color: '#555', fontSize: '13px', lineHeight: 1.4, marginBottom: '10px' }}>{rep.description}</p>
                        
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {rep.image_path && (
                            <img 
                              src={rep.image_path} 
                              alt="evidencia" 
                              onClick={() => setImagenAmpliada(rep.image_path)}
                              style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }} 
                            />
                          )}
                          {rep.galleries && rep.galleries.map((gal, gIdx) => (
                            <img 
                              key={gIdx}
                              src={gal.image_path} 
                              alt="extra" 
                              onClick={() => setImagenAmpliada(gal.image_path)}
                              style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', background: '#f5f5f5', borderRadius: '15px' }}>
                  <p style={{ fontStyle: 'italic', color: '#555' }}>
                    No hay detalles específicos registrados para este trabajo.
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-modal-close" onClick={() => setReporteSeleccionado(null)} style={{ background: '#333' }}>Cerrar Historial</button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PARA IMAGEN AMPLIADA */}
      {imagenAmpliada && (
        <div 
          onClick={() => setImagenAmpliada(null)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
        >
          <img src={imagenAmpliada} alt="Zoom" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '10px' }} />
          <button 
             onClick={() => setImagenAmpliada(null)} 
             style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
             <X size={40} />
          </button>
        </div>
      )}

      {/* ==========================================
          MODAL 2: AGREGAR SERVICIO
          ========================================== */}
      {mostrarModalServicio && (
        <div className="modal-overlay" onClick={() => setMostrarModalServicio(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setMostrarModalServicio(false)}><X /></button>
            <div className="modal-header">
              <div className="modal-tag">NUEVA SOLICITUD</div>
              <h2>Reportar Problema</h2>
            </div>
            
            <div className="modal-body service-form">
              {/* GALERÍA DE CARRITO */}
              {carritoServicios.length > 0 && (
                <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>Problemas a reportar ({carritoServicios.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {carritoServicios.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', alignItems: 'center' }}>
                        {item.fotos.length > 0 ? (
                          <img src={URL.createObjectURL(item.fotos[0])} alt="preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                        ) : (
                          <div style={{ width: '50px', height: '50px', background: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={20} color="#94a3b8"/></div>
                        )}
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: 'block', fontSize: '14px', color: '#F26522' }}>{item.tipo} - {item.zona}</strong>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>{item.descripcion.substring(0, 50)}...</span>
                        </div>
                        <button type="button" onClick={() => setCarritoServicios(carritoServicios.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleAnadirAlCarrito}>
                
                {/* NUEVO CAMPO: TIPO DE SERVICIO */}
                <div className="form-group">
                  <label><FileText size={16}/> Tipo de Servicio *</label>
                  <select 
                    required 
                    value={nuevoServicio.tipo}
                    onChange={(e) => setNuevoServicio({...nuevoServicio, tipo: e.target.value})}
                  >
                    <option value="">Selecciona el tipo...</option>
                    <option value="Mantenimiento">Mantenimiento Preventivo</option>
                    <option value="Problema">Problema / Reparación</option>
                  </select>
                </div>

                <div className="form-group">
                  <label><Home size={16}/> Zona de la propiedad *</label>
                  <select 
                    required 
                    value={nuevoServicio.area_id}
                    onChange={(e) => handleZonaChange(e.target.value)}
                    disabled={loadingZonas}
                  >
                    <option value="">{loadingZonas ? "Cargando zonas..." : "Seleccionar zona..."}</option>
                    {zonasDisponibles.map(zona => {
                      const subAreas = zona.sub_areas || zona.subAreas || [];
                      if (subAreas.length > 0) {
                        return (
                          <optgroup key={`opt-${zona.id}`} label={zona.name.toUpperCase()}>
                            <option value={zona.id}>{zona.name} (Área General)</option>
                            {subAreas.map(sub => (
                              <option key={`sub-${sub.id}`} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </optgroup>
                        );
                      } else {
                        return <option key={`zona-${zona.id}`} value={zona.id}>{zona.name}</option>;
                      }
                    })}
                    <option value="otro" style={{ fontWeight: 'bold' }}>Otro (No está en la lista)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><Wrench size={16}/> Equipo afectado (Opcional)</label>
                  <select 
                    value={nuevoServicio.equipo}
                    disabled={!nuevoServicio.area_id || loadingEquipos}
                    onChange={(e) => setNuevoServicio({...nuevoServicio, equipo: e.target.value})}
                  >
                    <option value="">
                      {!nuevoServicio.area_id ? "Primero selecciona una zona" : (loadingEquipos ? "Cargando equipos..." : "Seleccionar equipo...")}
                    </option>
                    {Object.entries(equiposDisponibles).map(([seccion, items]) => (
                      <optgroup key={seccion} label={seccion.toUpperCase()}>
                        {items.map((item) => (
                          <option key={item.id} value={`${item.sub_category} ${item.brand ? `(${item.brand})` : ''}`}>
                            {item.sub_category} {item.brand ? `(${item.brand})` : ''} {item.model_or_color ? `- ${item.model_or_color}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="otro">Otro (No está en la lista)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><MessageSquare size={16}/> Descripción *</label>
                  <textarea required rows="4" placeholder="Describe el problema..." value={nuevoServicio.descripcion} onChange={(e) => setNuevoServicio({...nuevoServicio, descripcion: e.target.value})}></textarea>
                </div>

                <div className="form-group">
                  <label><Camera size={16}/> Evidencia Visual (Máx 2 fotos)</label>
                  
                  <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={handleFileSelect} />
                  <input type="file" ref={galleryRef} hidden accept="image/*" multiple onChange={handleFileSelect} />

                  <div className="fotos-preview-container" style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {nuevoServicio.fotos.map((foto, idx) => (
                      <div key={idx} className="foto-preview-wrapper" style={{ position: 'relative', width: '80px', height: '80px' }}>
                        <img 
                          src={URL.createObjectURL(foto)} 
                          alt="preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', border: '2px solid #f26624' }} 
                        />
                        <button 
                          type="button"
                          onClick={() => removeFoto(idx)}
                          style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#e63946', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {nuevoServicio.fotos.length < 2 && (
                      <button 
                        type="button" 
                        className="btn-add-foto-placeholder"
                        onClick={() => setIsPhotoMenuOpen(true)}
                        style={{ width: '80px', height: '80px', border: '2px dashed #ccc', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f9f9f9', color: '#666' }}
                      >
                        <PlusCircle size={24} />
                        <span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>AÑADIR</span>
                      </button>
                    )}
                  </div>
                </div>
                
                <small style={{ color: '#666', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                  * Puedes subir hasta 2 imágenes como evidencia del problema.
                </small>

              <div className="modal-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn-enviar-modal" style={{ background: '#f1f5f9', color: '#334155', border: '2px dashed #94a3b8', width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  + AÑADIR PROBLEMA A LA LISTA
                </button>
              </div>
            </form>

            <div style={{ marginTop: '15px' }}>
              {carritoServicios.length > 0 ? (
                <button type="button" className="btn-enviar-modal" onClick={handleSubmitBatch} disabled={loadingSubmit} style={{ background: '#F26522', color: 'white', width: '100%', padding: '15px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(242, 101, 34, 0.3)' }}>
                  {loadingSubmit ? "ENVIANDO SOLICITUDES..." : `ENVIAR SOLICITUDES AL ADMINISTRADOR (${carritoServicios.length})`}
                </button>
              ) : (
                <button type="button" className="btn-enviar-modal" onClick={handleSubmitBatch} disabled={loadingSubmit} style={{ background: '#F26522', color: 'white', width: '100%', padding: '15px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', opacity: 0.5 }}>
                  {loadingSubmit ? "ENVIANDO..." : "ENVIAR REPORTE"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ==========================================
          MODAL: COMPARTIR PROPIEDAD
          ========================================== */}
      {mostrarModalCompartir && (
        <div className="modal-overlay" onClick={() => setMostrarModalCompartir(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: '25px', borderRadius: '15px' }}>
            <button className="close-modal" onClick={() => setMostrarModalCompartir(false)} style={{ top: '15px', right: '15px' }}><X size={20} color="#666" /></button>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
              <div style={{ border: '1px solid #F26522', color: '#F26522', borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 'bold' }}>HERENCIA</div>
              <h2 style={{ margin: 0, color: '#333', fontSize: '1.2rem' }}>Compartir Propiedad</h2>
            </div>
            {usuariosCompartidos.length > 0 ? (
              <div className="modal-body">
                <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center' }}>
                  Esta propiedad está siendo compartida con el siguiente usuario:
                </p>
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
                  {usuariosCompartidos.map(u => {
                    const initials = u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                    return (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 10px', background: '#fff9f0', borderRadius: '8px', borderLeft: '4px solid #F26522', marginBottom: '8px', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          {u.profile_picture ? (
                            <img src={u.profile_picture} alt={u.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F26522', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>
                              {initials}
                            </div>
                          )}
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <p style={{ margin: 0, fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</p>
                            <small style={{ color: '#666', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</small>
                          </div>
                        </div>
                        <button onClick={() => handleRevocar(u.id)} style={{ background: 'transparent', color: '#dc3545', border: '1px solid #dc3545', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0 }}>
                          Desheredar
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="modal-footer" style={{ marginTop: '20px' }}>
                   <button onClick={() => setMostrarModalCompartir(false)} style={{ background: '#333', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                     CERRAR
                   </button>
                </div>
              </div>
            ) : (
              <form className="modal-body" onSubmit={handleCompartir}>
                <p style={{ color: '#444', fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center', lineHeight: 1.5 }}>
                  Ingresa el correo electrónico del cliente con el que deseas compartir esta propiedad.<br/>
                  <small style={{ color: '#888' }}>(Ambos podrán ver el historial y levantar reportes).</small>
                </p>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: 'bold', fontSize: '0.85rem' }}>CORREO ELECTRÓNICO *</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="ejemplo@correo.com"
                    value={emailCompartir}
                    onChange={(e) => setEmailCompartir(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9f9f9' }}
                  />
                </div>
                <div className="modal-footer">
                  <button type="submit" disabled={loadingCompartir} style={{ background: '#F26522', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                    {loadingCompartir ? "COMPARTIENDO..." : "COMPARTIR PROPIEDAD"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: PERFIL DE LA PROPIEDAD
          ========================================== */}
      {mostrarPerfilPropiedad && (
        <div className="modal-overlay" onClick={() => setMostrarPerfilPropiedad(false)}>
          <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setMostrarPerfilPropiedad(false)}><X /></button>
            <div className="modal-header-profile">
              <Tag size={28} className="icon-orange" />
              <div>
                <h2>Perfil de la Propiedad</h2>
                <p className="id-badge-text">ID Registro: {propiedad.id}</p>
              </div>
            </div>
            <div className="modal-body detailed-info">
              <div className="profile-data-group">
                <User size={20} className="icon-gray" />
                <div>
                  <span className="profile-label">CLIENTE ASOCIADO</span>
                  <span className="profile-value">{propiedad.client_id || 'Sin asignar'}</span>
                </div>
              </div>
              <div className="profile-data-group">
                <FileText size={20} className="icon-gray" />
                <div>
                  <span className="profile-label">CURP INMUEBLE</span>
                  <span className="profile-value highlight-curp">{propiedad.custom_curp || 'S/N'}</span>
                </div>
              </div>
              <div className="profile-data-group">
                <Home size={20} className="icon-gray" />
                <div>
                  <span className="profile-label">DIRECCIÓN</span>
                  <span className="profile-value">{propiedad.address}</span>
                </div>
              </div>
              <div className="profile-data-group">
                <MapPin size={20} className="icon-gray" />
                <div>
                  <span className="profile-label">UBICACIÓN GPS</span>
                  <a 
                    href={`https://maps.google.com/?q=${propiedad.coordinates}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="gps-link-container"
                  >
                    <span className="profile-value gps-text">{propiedad.coordinates || 'Sin coordenadas'}</span>
                    <Eye size={16} className="icon-blue" />
                  </a>
                </div>
              </div>
            </div>
            <div className="modal-footer">
               <button className="btn-orange-full" onClick={() => setMostrarPerfilPropiedad(false)}>
                 Cerrar Detalles
               </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL DE SELECCIÓN DE FOTO */}
      {isPhotoMenuOpen && (
        <div className="modal-overlay" onClick={() => setIsPhotoMenuOpen(false)} style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '350px', padding: '0', backgroundColor: '#fff' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, color: '#f26624' }}>Seleccionar Origen</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button 
                type="button"
                onClick={() => selectPhotoSource('camera')}
                style={{ background: 'transparent', border: 'none', padding: '15px', color: '#333', borderBottom: '1px solid #eee', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <Camera size={20} /> Tomar Foto
              </button>
              <button 
                type="button"
                onClick={() => selectPhotoSource('gallery')}
                style={{ background: 'transparent', border: 'none', padding: '15px', color: '#333', borderBottom: '1px solid #eee', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <ImageIcon size={20} /> Elegir de la Galería
              </button>
              <button 
                type="button"
                onClick={() => setIsPhotoMenuOpen(false)}
                style={{ background: 'transparent', border: 'none', padding: '15px', color: '#666', fontSize: '1rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaDetallePropiedad;
