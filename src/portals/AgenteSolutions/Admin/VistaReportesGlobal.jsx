import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Shared/Header';
import MobileBottomNav from '../../../components/Shared/MobileBottomNav';
import { useAuth } from '../../../context/AuthContext';
import { Search, MapPin, Calendar, FileText, ChevronLeft, Plus, Edit, Trash2, X, Upload, CheckCircle2, AlertTriangle, Eye, Pencil } from 'lucide-react';
import Swal from 'sweetalert2';
import '../../../styles/AgenteSolutions/Admin/VistaReportesGlobal.css';

const STAGES = [
  {
    key: 'ANTES',
    title: '1. ANTES DE INICIAR',
    tag: '[ANTES]',
    required: true,
    badgeColor: '#e11d48',
    placeholder: 'Escribe la descripción de las condiciones iniciales...'
  },
  {
    key: 'DURANTE',
    title: '2. DURANTE EL PROCESO',
    tag: '[DURANTE]',
    required: true,
    badgeColor: '#ea580c',
    placeholder: 'Escribe la descripción del avance o procedimiento en proceso...'
  },
  {
    key: 'DESPUES',
    title: '3. DESPUÉS DE FINALIZAR',
    tag: '[DESPUÉS]',
    required: true,
    badgeColor: '#16a34a',
    placeholder: 'Escribe la descripción del resultado final tras concluir...'
  },
  {
    key: 'EXTRA',
    title: '4. ADICIONAL / EXTRA',
    tag: '[EXTRA]',
    required: false,
    badgeColor: '#64748b',
    placeholder: 'Observaciones o evidencia adicional (opcional)...'
  }
];

const VistaReportesGlobal = () => {
  const { user } = useAuth();
  const isTech = Boolean(user?.role_id === 6 || user?.role_id === 8 || user?.role_id === 2);
  const navigate = useNavigate();

  const [reportes, setReportes] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedTrabajoId, setSelectedTrabajoId] = useState(null);
  const [selectedTipo, setSelectedTipo] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [formData, setFormData] = useState({ description: '', image: null });
  const [previewImage, setPreviewImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  useEffect(() => {
    fetchReportesYCotizaciones();
  }, []);

  const fetchReportesYCotizaciones = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [resReportes, resCoti] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/reportes-globales`, { headers }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones`, { headers })
      ]);
      setReportes(resReportes.data || []);
      setCotizaciones(resCoti.data || []);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode, report = null, trabajoId = null, tipo = null, stage = null) => {
    setModalMode(mode);
    setSelectedStage(stage);
    
    let cleanDesc = '';
    if (mode === 'edit' && report) {
      cleanDesc = (report.description || '').replace(/\[(ANTES|DURANTE|DESPUÉS|DESPUES|EXTRA)\]/gi, '').trim();
    }

    setFormData({ description: cleanDesc, image: null });
    setPreviewImage(mode === 'edit' ? (report?.image_url || report?.image_path) : null);
    setSelectedReportId(report ? report.id : null);
    setSelectedTrabajoId(trabajoId);
    setSelectedTipo(tipo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ description: '', image: null });
    setPreviewImage(null);
    setSelectedStage(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() && modalMode === 'add') {
      Swal.fire('Atención', 'Debes ingresar una descripción obligatoria.', 'warning');
      return;
    }
    if (!formData.image && !previewImage && modalMode === 'add') {
      Swal.fire('Atención', 'Debes seleccionar una imagen para la evidencia.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const data = new FormData();

    const tagStr = selectedStage ? selectedStage.tag : '[REPORTE]';
    const cleanUserDesc = formData.description.replace(/\[(ANTES|DURANTE|DESPUÉS|DESPUES|EXTRA)\]/gi, '').trim();
    const finalDesc = `${tagStr} ${cleanUserDesc}`;

    data.append('description', finalDesc);
    if (formData.image) {
      data.append('image', formData.image);
    }

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      if (modalMode === 'add') {
        const url = `${import.meta.env.VITE_API_BASE_URL}/servicios/${selectedTipo}-${selectedTrabajoId}/reportes`;
        await axios.post(url, data, {
          headers: { 'Content-Type': 'multipart/form-data', ...authHeaders }
        });
        Swal.fire('Éxito', 'Evidencia añadida correctamente', 'success');
      } else {
        const url = `${import.meta.env.VITE_API_BASE_URL}/reportes/${selectedReportId}`;
        data.append('_method', 'PUT');
        await axios.post(url, data, { 
          headers: { 'Content-Type': 'multipart/form-data', ...authHeaders }
        });
        Swal.fire('Éxito', 'Evidencia actualizada correctamente', 'success');
      }
      closeModal();
      fetchReportesYCotizaciones();
    } catch (error) {
      console.error("Error al guardar:", error);
      Swal.fire('Error', 'Hubo un problema al guardar la evidencia.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReport = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar evidencia?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/reportes/${id}`, {
          headers: authHeaders
        });
        Swal.fire('Eliminado', 'La evidencia ha sido eliminada.', 'success');
        fetchReportesYCotizaciones();
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar la evidencia.', 'error');
      }
    }
  };

  const getReportForStage = (groupReports, stage) => {
    if (!groupReports || groupReports.length === 0) return null;

    const foundByTag = groupReports.find(r => {
      const desc = (r.description || '').toUpperCase();
      return desc.includes(stage.tag) || (stage.key === 'DESPUES' && desc.includes('[DESPUES]'));
    });

    if (foundByTag) return foundByTag;

    const stageIdx = STAGES.findIndex(s => s.key === stage.key);
    if (stageIdx !== -1 && groupReports[stageIdx]) {
      return groupReports[stageIdx];
    }

    return null;
  };

  // Filtrado de reportes: si es técnico, SOLO mostrar los suyos
  const filteredReportes = reportes.filter(r => {
    if (isTech && user) {
      const uId = Number(user.id);
      const uTechId = Number(user.technician_id || user.id);
      const rTechId = Number(r.technician_id || r.technician?.id || r.user_id || 0);
      const rServiceTechId = Number(r.service?.technician_id || r.service?.assigned_technician_id || r.service?.user_id || 0);
      const rWorkOrderTechId = Number(r.work_order?.technician_id || r.work_order?.assigned_technician_id || r.work_order?.user_id || 0);

      const techName = (r.technician ? `${r.technician.first_name || ''} ${r.technician.last_name || ''}` : '').trim().toLowerCase();
      const uFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
      const uName = (user.name || '').trim().toLowerCase();

      const isMatch = (
        rTechId === uId ||
        rTechId === uTechId ||
        rServiceTechId === uId ||
        rWorkOrderTechId === uId ||
        (techName && (techName === uFullName || techName === uName)) ||
        (r.technician?.email && user.email && r.technician.email.toLowerCase() === user.email.toLowerCase())
      );

      if (!isMatch) return false;
    }

    const techName = r.technician ? `${r.technician.first_name || ''} ${r.technician.last_name || ''}`.toLowerCase() : '';
    const prop = r.service?.property || r.work_order?.property || r.workOrder?.property;
    const propName = prop?.property_name?.toLowerCase() || '';
    const curp = prop?.custom_curp?.toLowerCase() || '';
    const desc = r.description?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return techName.includes(search) || propName.includes(search) || curp.includes(search) || desc.includes(search);
  });

  const pageHeading = isTech ? 'MIS REPORTES TÉCNICOS' : 'GALERÍA GLOBAL DE REPORTES';

  return (
    <div className="global-reports-wrapper">
      <Header activeModule="reportes" />

      <div className="global-reports-container">
        {/* TITULO Y BOTÓN REGRESAR */}
        <div className="reportes-topbar-row">
          <button 
            type="button"
            className="reportes-btn-regresar"
            onClick={() => {
              if (isTech) {
                navigate('/mercado-trabajos', { state: { view: 'tablero' } });
              } else {
                navigate(-1);
              }
            }}
          >
            <ChevronLeft size={18} />
            <span>REGRESAR</span>
          </button>
          <h2 className="reportes-title-heading">{pageHeading}</h2>
        </div>

        {/* BUSCADOR */}
        <div className="report-filters">
          <div className="report-search-wrap">
            <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="report-search-input"
              placeholder="Buscar por propiedad, cliente o descripción..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', marginTop: '50px', fontSize: '16px', fontWeight: 'bold', color: '#F26522' }}>
            Cargando evidencias de los trabajos...
          </p>
        ) : filteredReportes.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#64748b', padding: '30px 20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 6px', color: '#1e293b' }}>
              {searchTerm ? 'No se encontraron coincidencias para tu búsqueda.' : (isTech ? 'Aún no tienes evidencias o reportes registrados.' : 'Aún no hay reportes subidos por los técnicos.')}
            </p>
            <p style={{ fontSize: '13px', margin: 0, color: '#94a3b8' }}>
              {isTech ? 'Los reportes de tus trabajos aceptados aparecerán organizados aquí.' : 'Cuando los técnicos suban fotos de sus etapas se mostrarán aquí.'}
            </p>
          </div>
        ) : (
          <div className="global-gallery-grouped">
            {Object.entries(
              filteredReportes.reduce((acc, r) => {
                const prop = r.service?.property || r.work_order?.property || r.workOrder?.property;
                const propName = prop?.property_name || 'PROPIEDAD SIN NOMBRE';
                const curp = prop?.custom_curp || 'SIN CURP';
                const owner = prop?.client?.name || 'Usuario';
                
                const isService = !!r.service?.property;
                const serviceData = isService ? r.service : (r.work_order || r.workOrder || r.service);
                const tituloTrabajo = serviceData?.title || serviceData?.type || r.title || 'Mantenimiento';
                const trabajoId = r.service_id || r.work_order_id || r.id || 'general';
                const tipo = (r.work_order_id || r.workOrder) ? 'work_order' : 'servicio';
                
                const groupKey = `${propName}|${curp}|${owner}|${trabajoId}|${tipo}|${tituloTrabajo}`;
                
                if (!acc[groupKey]) acc[groupKey] = [];
                acc[groupKey].push(r);
                return acc;
              }, {})
            ).map(([groupKey, reports]) => {
              const [nombre, curp, dueno, trabajoId, tipo, tituloTrabajo] = groupKey.split('|');
              
              return (
                <div key={groupKey} className="property-group-section">
                  
                  {/* ENCABEZADO DEL GRUPO DE TRABAJO */}
                  <div className="property-group-header">
                    <div className="property-header-info">
                      <div className="property-name-row">
                        <MapPin size={20} color="#F26522" style={{ flexShrink: 0 }} />
                        <h3 className="property-title-text">{nombre}</h3>
                        <span className="property-trabajo-badge">
                          TRABAJO #{trabajoId} – {tituloTrabajo}
                        </span>
                      </div>
                      <div className="property-meta-row">
                        <span><strong>CURP:</strong> <strong style={{ color: '#F26522' }}>{curp}</strong></span>
                        <span><strong>DUEÑO:</strong> <strong>{dueno}</strong></span>
                      </div>
                    </div>

                    <div className="property-header-actions">
                      {(() => {
                        const cotizacionAsociada = cotizaciones.find(c => 
                          (tipo === 'work_order' && c.work_order_id === parseInt(trabajoId)) || 
                          (tipo === 'servicio' && c.service_id === parseInt(trabajoId))
                        );
                        
                        if (cotizacionAsociada) {
                          return (
                            <button 
                              type="button"
                              className="btn-reporte-coti"
                              onClick={() => {
                                localStorage.setItem('cotizacion_para_imprimir', JSON.stringify(cotizacionAsociada));
                                navigate('/imprimir-cotizacion');
                              }}
                            >
                              <FileText size={14} /> VER COTIZACIÓN
                            </button>
                          );
                        }
                        return null;
                      })()}

                      <button 
                        type="button"
                        className="btn-reporte-oficial"
                        onClick={() => {
                          const firstReport = reports[0];
                          const isService = tipo === 'servicio';
                          const serviceData = isService ? firstReport.service : (firstReport.work_order || firstReport.workOrder || firstReport.service);
                          const prop = serviceData?.property;
                          
                          navigate(`/reporte-trabajo-admin/${tipo}-${trabajoId}`, { 
                            state: { 
                              trabajoId: `${tipo}-${trabajoId}`, 
                              servicio: {
                                cliente_nombre: dueno,
                                cliente_email: prop?.client?.email || '',
                                cliente_telefono: prop?.client?.phone || '',
                                direccion: prop?.address || serviceData?.address || '',
                                propiedad_nombre: nombre,
                                tipoPropiedad: prop?.type || serviceData?.tipoPropiedad || 'CASA',
                                identificador_curp: curp,
                                titulo: tituloTrabajo,
                                descripcion: serviceData?.description
                              }, 
                              imagenes: reports.map(r => r.image_url || r.image_path).filter(Boolean) 
                            } 
                          });
                        }}
                      >
                        <FileText size={14} /> REPORTE OFICIAL
                      </button>
                    </div>
                  </div>

                  {/* GRID DE LAS 4 ETAPAS ESTRUCTURADAS (ANTES, DURANTE, DESPUÉS, EXTRA) */}
                  <div className="stages-grid-4cols">
                    {STAGES.map(stage => {
                      const r = getReportForStage(reports, stage);
                      const cleanDesc = r ? (r.description || '').replace(/\[(ANTES|DURANTE|DESPUÉS|DESPUES|EXTRA)\]/gi, '').trim() : '';

                      return (
                        <div key={stage.key} className={r ? "stage-card" : "stage-card-empty"} onClick={!r ? () => handleOpenModal('add', null, trabajoId, tipo, stage) : undefined}>
                          {r ? (
                            <>
                              <div>
                                {/* BADGE DE ETAPA */}
                                <div className="stage-card-header">
                                  <span className="stage-badge-tag" style={{ background: stage.badgeColor }}>
                                    {stage.title}
                                  </span>

                                  <span 
                                    className="stage-status-pill"
                                    style={{
                                      background: '#dcfce7',
                                      color: '#15803d'
                                    }}
                                  >
                                    ✅ REGISTRADO
                                  </span>
                                </div>

                                {/* FOTOGRAFÍA DE EVIDENCIA */}
                                <div className="stage-image-container">
                                  <img 
                                    src={r.image_url || r.image_path} 
                                    alt={stage.title} 
                                    onClick={() => setZoomImage(r.image_url || r.image_path)}
                                  />
                                </div>

                                <div className="stage-tech-chip">
                                  <div className="stage-tech-initial">
                                    {r.technician?.first_name?.charAt(0) || (user?.first_name ? user.first_name.charAt(0) : 'T')}
                                  </div>
                                  <span style={{ fontWeight: '700' }}>
                                    {r.technician ? `${r.technician.first_name} ${r.technician.last_name || ''}`.trim() : (user?.name || 'Técnico')}
                                  </span>
                                </div>

                                <p className="stage-desc-text">
                                  "{cleanDesc || 'Sin descripción.'}"
                                </p>
                              </div>

                              {/* FILA DE BOTONES VISIBLES DE ACCIÓN DEBAJO DE LA DESCRIPCIÓN */}
                              <div className="stage-card-actions">
                                <button
                                  type="button"
                                  className="stage-btn-edit"
                                  onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', r, trabajoId, tipo, stage); }}
                                >
                                  <Pencil size={13} color="#0f172a" /> Editar
                                </button>
                                <button
                                  type="button"
                                  className="stage-btn-delete"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteReport(r.id); }}
                                >
                                  <Trash2 size={13} color="#dc2626" /> Eliminar
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <Plus size={32} color="#F26522" />
                              <strong style={{ color: '#0f172a', fontSize: '0.82rem' }}>AÑADIR EVIDENCIA</strong>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tap para subir foto ({stage.title})</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA AGREGAR O EDITAR EVIDENCIA */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '520px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={closeModal} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={24} />
            </button>
            
            <h3 style={{ marginTop: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.15rem', fontWeight: '800' }}>
              {modalMode === 'add' ? <Plus size={22} color="#F26522" /> : <Edit size={22} color="#F26522" />}
              {modalMode === 'add' ? `AÑADIR EVIDENCIA (${selectedStage?.title || ''})` : `EDITAR EVIDENCIA (${selectedStage?.title || ''})`}
            </h3>
            
            <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '800', color: '#1e293b', fontSize: '0.85rem' }}>
                  Descripción Obligatoria <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={selectedStage?.placeholder || "Escribe la descripción de lo realizado..."}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', minHeight: '90px', resize: 'vertical', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '800', color: '#1e293b', fontSize: '0.85rem' }}>
                  Fotografía de Evidencia {modalMode === 'add' && <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  id="report-image-upload"
                />
                <label 
                  htmlFor="report-image-upload" 
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', border: '2px dashed #F26522', borderRadius: '12px', 
                    cursor: 'pointer', color: '#F26522', fontWeight: 'bold', textAlign: 'center', background: '#fff7ed', fontSize: '0.82rem'
                  }}
                >
                  <Upload size={18} />
                  {formData.image ? 'Cambiar Imagen Seleccionada' : (modalMode === 'edit' ? 'Subir Nueva Foto (Opcional)' : 'Seleccionar Fotografía')}
                </label>

                {previewImage && (
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <img src={previewImage} alt="Vista previa" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '10px', border: '1px solid #cbd5e1', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={closeModal} style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.82rem' }}>
                  CANCELAR
                </button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '11px', background: '#F26522', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, textTransform: 'uppercase', fontSize: '0.82rem' }}>
                  {isSubmitting ? 'GUARDANDO...' : 'GUARDAR EVIDENCIA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ZOOM */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <img src={zoomImage} alt="Ampliada" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '16px', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setZoomImage(null)} style={{ position: 'absolute', top: '20px', right: '25px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={36}/></button>
        </div>
      )}

      {/* Mobile Bottom Dock Bar */}
      <MobileBottomNav activeModule="reportes" />
    </div>
  );
};

export default VistaReportesGlobal;
