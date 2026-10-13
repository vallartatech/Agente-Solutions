import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Layout, CheckCircle2, ListTodo, Timer, AlertCircle, 
  FileText, History, ChevronDown, ChevronUp, X, 
  User, Eye, MapPin, Tag, PlusCircle, 
  Home, Wrench, MessageSquare, Camera, ImageIcon 
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
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
  
  // --- ESTADOS FORMULARIO NUEVO SERVICIO ---
  const [zonasDisponibles, setZonasDisponibles] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [nuevoServicio, setNuevoServicio] = useState({
    tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', fotos: [] 
  });
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const cameraRef = React.useRef(null);
  const galleryRef = React.useRef(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('agente_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/propiedades/${id}/dashboard`,
        { headers }
      );
      setData(response.data);

      // Fetch real zones for this property
      setLoadingZonas(true);
      const areasRes = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/properties/${id}/areas`,
        { headers }
      );
      setZonasDisponibles(areasRes.data || []);

    } catch (error) {
      console.error("Error cargando la información:", error);
    } finally {
      setLoading(false);
      setLoadingZonas(false);
    }
  };

  useEffect(() => {
    if (id) fetchDashboardData();
  }, [id]);

  const handleSubmitServicio = async (e) => {
    e.preventDefault();
    if (!nuevoServicio.tipo || !nuevoServicio.area_id || !nuevoServicio.descripcion) {
      alert("Por favor completa los campos obligatorios (Tipo, Zona y Descripción).");
      return;
    }

    setLoadingSubmit(true);
    try {
      const token = localStorage.getItem('agente_token');
      const formData = new FormData();
      formData.append('property_id', id);
      formData.append('type', nuevoServicio.tipo);
      formData.append('zone', nuevoServicio.zona);
      formData.append('equipment', nuevoServicio.equipo || '');
      
      const descFinal = nuevoServicio.equipo 
        ? `${nuevoServicio.descripcion}\n\n[EQUIPO AFECTADO]: ${nuevoServicio.equipo}`
        : nuevoServicio.descripcion;
      
      formData.append('description', descFinal);

      // Agregamos las fotos (hasta 2)
      nuevoServicio.fotos.forEach((foto, index) => {
        formData.append(`evidence_${index + 1}`, foto);
      });

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/work-orders/cliente`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.data.success) {
        alert("✅ Reporte levantado con éxito.");
        setMostrarModalServicio(false);
        setNuevoServicio({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', fotos: [] });
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Error enviando servicio:", error);
      alert("❌ Error al enviar el reporte.");
    } finally {
      setLoadingSubmit(false);
    }
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
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/areas/${areaId}/components`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
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

  // --- RENDERIZADO CONDICIONAL MIENTRAS CARGA ---
  if (loading) return <div className="loading" style={{textAlign: 'center', padding: '50px'}}>Cargando Tablero...</div>;
  if (!data) return <div className="error" style={{textAlign: 'center', padding: '50px'}}>No se encontró la información de la propiedad.</div>;

  // Extraemos la información del JSON que mandó Laravel
  const { propiedad, stats, historial, cotizaciones_pendientes, avance_obra } = data;

  return (
    <div className="detalle-propiedad-page" style={{ width: '100%', minHeight: '100vh', backgroundColor: '#fcfcfc', display: 'flex', flexDirection: 'column' }}>
      <Header activeModule="propiedades" titulo="DETALLE PROPIEDAD" />
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
            {/* ✅ CORRECCIÓN CLAVE: Usamos la URL de Cloudinary directamente, sin 'http://127.0.0.1...' */}
            <img 
              src={propiedad.facade_photo_path ? propiedad.facade_photo_path : 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1000'} 
              alt="Propiedad" 
              className="hero-img" 
            />
          </div>

          <div className="info-card-premium historial-section">
            <div className="card-header-clean historial-trigger" onClick={() => setMostrarHistorial(!mostrarHistorial)}>
              <div className="header-title-flex">
                <History size={20} className="icon-orange" />
                <h3>Historial de Trabajos</h3>
              </div>
              {mostrarHistorial ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>

            {mostrarHistorial && (
              <div className="historial-list-container">
                {historial && historial.length > 0 ? (
                  historial.map((trabajo) => (
                    <div key={trabajo.id} className="historial-card-item" onClick={() => setReporteSeleccionado(trabajo)}>
                      <div className="h-card-left">
                        <span className="h-card-date">{new Date(trabajo.updated_at).toLocaleDateString()}</span>
                        <h4 className="h-card-title">{trabajo.title || 'Trabajo Finalizado'}</h4>
                        <span className="h-card-tech">Por: <strong>{trabajo.tecnico_nombre || 'Técnico'}</strong></span>
                      </div>
                      <div className="h-card-right">
                        <div className="h-card-photos-stack">
                          {trabajo.fotos && trabajo.fotos.length > 0 ? (
                            <img src={trabajo.fotos[0]} alt="evidencia" className="stack-img img-0" />
                          ) : (
                            <div style={{width: '40px', height: '40px', background: '#ccc', borderRadius: '8px'}}></div>
                          )}
                        </div>
                        <Eye size={18} className="view-icon" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{padding: '20px', textAlign: 'center', color: '#666'}}>No hay historial de trabajos aún.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            COLUMNA DERECHA (Tablero + Acciones)
            ========================================== */}
        <div className="right-column">
          <div className="action-header-right">
            <button className="btn-add-service-full" onClick={() => setMostrarModalServicio(true)}>
              <PlusCircle size={20} /> AGREGAR SERVICIO
            </button>
          </div>

          <div className="info-card-premium sticky-card">
            <div className="card-header-clean">
              <Layout size={20} className="icon-orange" />
              <h3>Tablero de Control</h3>
            </div>
            
            <div className="jira-stats-grid quad">
              <div className="stat-box sos-urgent-stat" onClick={() => navigate('/sos')}>
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
            
            <div className="quote-section-link" onClick={() => navigate('/cotizacion1')}>
              <div className="quote-content">
                <FileText size={20} />
                <span>Ver Cotizaciones Pendientes</span>
              </div>
              <div className="quote-badge-large">{cotizaciones_pendientes || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL 1: DETALLE DE TRABAJO (HISTORIAL)
          ========================================== */}
      {reporteSeleccionado && (
        <div className="modal-overlay" onClick={() => setReporteSeleccionado(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setReporteSeleccionado(null)}><X /></button>
            <div className="modal-header">
              <div className="modal-tag">TRABAJO FINALIZADO</div>
              <h2 style={{ color: '#333' }}>{reporteSeleccionado.title || reporteSeleccionado.labor}</h2>
              <p className="modal-subtitle" style={{ color: '#666' }}>
                Técnico: {reporteSeleccionado.tecnico_nombre || reporteSeleccionado.tecnico}
              </p>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', background: '#f5f5f5', padding: '15px', borderRadius: '10px' }}>
                <div style={{ flex: 1 }}>
                   <strong style={{ color: '#333', display: 'block', fontSize: '0.85rem' }}>VISITA PROGRAMADA</strong>
                   <span style={{ color: '#555' }}>{reporteSeleccionado.scheduled_at ? new Date(reporteSeleccionado.scheduled_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'No registrada'}</span>
                </div>
                <div style={{ flex: 1 }}>
                   <strong style={{ color: '#333', display: 'block', fontSize: '0.85rem' }}>TRABAJO FINALIZADO</strong>
                   <span style={{ color: '#555' }}>{reporteSeleccionado.updated_at ? new Date(reporteSeleccionado.updated_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : (reporteSeleccionado.fecha || 'No registrada')}</span>
                </div>
              </div>
              
              <h4 style={{ color: '#F26522', marginBottom: '10px' }}>REPORTE DEL TÉCNICO:</h4>
              <p style={{ color: '#444', lineHeight: 1.5, background: '#fff9f0', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #F26522' }}>
                 {reporteSeleccionado.description || reporteSeleccionado.descripcion || 'Sin reporte detallado.'}
              </p>

              <div className="evidence-container" style={{ marginTop: '20px' }}>
                <h4 style={{ color: '#333', marginBottom: '10px' }}>Evidencia Fotográfica:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                  {reporteSeleccionado.fotos && reporteSeleccionado.fotos.map((f, i) => (
                    <img key={i} src={f} alt="foto" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
                  ))}
                  {(!reporteSeleccionado.fotos || reporteSeleccionado.fotos.length === 0) && (
                    <p style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9rem' }}>No se adjuntaron fotos.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal-close" onClick={() => setReporteSeleccionado(null)} style={{ background: '#F26522', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>CERRAR REPORTE</button>
            </div>
          </div>
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
            <form className="modal-body service-form" onSubmit={handleSubmitServicio}>
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
                <textarea required rows="4" placeholder="Describe el problema..." onChange={(e) => setNuevoServicio({...nuevoServicio, descripcion: e.target.value})}></textarea>
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
                
                <small style={{ color: '#666', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                  * Puedes subir hasta 2 imágenes como evidencia del problema.
                </small>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-modal-close" disabled={loadingSubmit}>
                  {loadingSubmit ? "Enviando..." : "Levantar Reporte"}
                </button>
              </div>
            </form>
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
    </div>
  );
};

export default VistaDetallePropiedad;
