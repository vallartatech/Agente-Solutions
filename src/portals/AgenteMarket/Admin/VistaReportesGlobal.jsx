import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Shared/Header';
import CasaLoader from '../../../components/Shared/CasaLoader';
import MobileBottomNav from '../../../components/Shared/MobileBottomNav';
import { useAuth } from '../../../context/AuthContext';
import { Search, MapPin, FileText, ChevronLeft, ChevronRight, Plus, Edit, Trash2, X, Upload, CheckCircle2, Pencil, Calendar, ClipboardList, Image as ImageIcon } from 'lucide-react';
import Swal from 'sweetalert2';
import '../../../styles/Shared/UniversalSearch.css';
import '../../../styles/Shared/ToolbarAcciones.css';
import '../../../styles/AgenteMarket/Admin/VistaReportesGlobal.css';

const STAGES = [
  {
    key: 'ANTES',
    title: '1. ANTES DE INICIAR',
    tag: '[ANTES]',
    required: true,
    placeholder: 'Escribe la descripción de las condiciones iniciales...'
  },
  {
    key: 'DURANTE',
    title: '2. DURANTE EL PROCESO',
    tag: '[DURANTE]',
    required: true,
    placeholder: 'Escribe la descripción del avance o procedimiento en proceso...'
  },
  {
    key: 'DESPUES',
    title: '3. DESPUÉS DE FINALIZAR',
    tag: '[DESPUÉS]',
    required: true,
    placeholder: 'Escribe la descripción del resultado final tras concluir...'
  },
  {
    key: 'EXTRA',
    title: '4. ADICIONAL / EXTRA',
    tag: '[EXTRA]',
    required: false,
    placeholder: 'Observaciones o evidencia adicional (opcional)...'
  }
];

// Resuelve la foto de fachada de la propiedad (URL absoluta o ruta de storage)
const resolverFotoPropiedad = (prop) => {
  const raw = prop?.facade_photo_url || prop?.foto_url || prop?.facade_photo_path || prop?.facade_photo || prop?.foto_fachada || null;
  if (!raw || typeof raw !== 'string') return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const hostBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');
  return `${hostBase}/storage/${raw.replace(/^\//, '')}`;
};

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
  const [selectedPropKey, setSelectedPropKey] = useState(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);

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

  // Agrupar reportes por trabajo (propiedad + servicio/orden)
  const grupos = Object.entries(
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
    const first = reports[0];
    const prop = first.service?.property || first.work_order?.property || first.workOrder?.property;
    const etapasRegistradas = STAGES.filter(st => getReportForStage(reports, st)).length;
    const foto = resolverFotoPropiedad(prop) || first.image_url || first.image_path || null;

    // Fecha de ejecución: la del servicio/orden si existe; si no, la evidencia más reciente
    const serviceData = tipo === 'servicio' ? first.service : (first.work_order || first.workOrder || first.service);
    const fechasReportes = reports.map(r => r.created_at).filter(Boolean).sort();
    const fechaRaw = serviceData?.completed_at || serviceData?.fecha_ejecucion || serviceData?.fecha_programada
      || serviceData?.scheduled_date || fechasReportes[fechasReportes.length - 1] || null;
    const fechaDate = fechaRaw ? new Date(fechaRaw) : null;
    const fechaValida = fechaDate && !isNaN(fechaDate.getTime());

    return {
      groupKey, nombre, curp, dueno, trabajoId, tipo, tituloTrabajo, reports, foto, etapasRegistradas,
      propKey: `${nombre}|${curp}|${dueno}`,
      fechaTs: fechaValida ? fechaDate.getTime() : 0,
      fechaTexto: fechaValida
        ? fechaDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Sin fecha'
    };
  });

  // Agrupar trabajos por propiedad: una tarjeta por propiedad, servicios ordenados por fecha
  const propiedadesConReportes = Object.values(
    grupos.reduce((acc, g) => {
      if (!acc[g.propKey]) {
        acc[g.propKey] = { propKey: g.propKey, nombre: g.nombre, curp: g.curp, dueno: g.dueno, foto: g.foto, servicios: [] };
      }
      acc[g.propKey].servicios.push(g);
      return acc;
    }, {})
  ).map(p => ({ ...p, servicios: [...p.servicios].sort((a, b) => a.fechaTs - b.fechaTs) }));

  const propiedadSeleccionada = propiedadesConReportes.find(p => p.propKey === selectedPropKey) || null;
  const grupoSeleccionado = propiedadSeleccionada?.servicios.find(g => g.groupKey === selectedGroupKey) || null;
  const numeroServicio = grupoSeleccionado ? propiedadSeleccionada.servicios.indexOf(grupoSeleccionado) + 1 : 0;

  const cerrarPanel = () => {
    setSelectedPropKey(null);
    setSelectedGroupKey(null);
  };

  const getCotizacionAsociada = (grupo) => cotizaciones.find(c =>
    (grupo.tipo === 'work_order' && c.work_order_id === parseInt(grupo.trabajoId)) ||
    (grupo.tipo === 'servicio' && c.service_id === parseInt(grupo.trabajoId))
  );

  const abrirCotizacion = (cotizacion) => {
    localStorage.setItem('cotizacion_para_imprimir', JSON.stringify(cotizacion));
    navigate('/imprimir-cotizacion');
  };

  const abrirReporteOficial = ({ reports, tipo, trabajoId, dueno, nombre, curp, tituloTrabajo }) => {
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
  };

  return (
    <div className="rg-root">
      <Header activeModule="reportes" />

      <main className="rg-main-container">
        {/* TÍTULO */}
        <div className="rg-action-bar">
          <div className="rg-page-title-badge">
            <FileText size={18} className="rg-title-icon" />
            <span>{pageHeading}</span>
            <span className="rg-count-pill">{propiedadesConReportes.length}</span>
          </div>
        </div>

        {/* BUSCADOR (mismo estilo que Usuarios) */}
        <div className="tb-toolbar">
          <div className="tb-toolbar-search">
            <div className="search-wrapper-full">
              <div className="search-input-container">
                <Search size={18} className="search-icon-inside" />
                <input
                  type="text"
                  className="search-input-large"
                  placeholder="BUSCAR POR PROPIEDAD, CLIENTE O DESCRIPCIÓN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <CasaLoader texto="Cargando reportes..." />
        ) : propiedadesConReportes.length === 0 ? (
          <div className="rg-glass-card rg-empty-state">
            <p className="rg-empty-title">
              {searchTerm ? 'No se encontraron coincidencias para tu búsqueda.' : (isTech ? 'Aún no tienes evidencias o reportes registrados.' : 'Aún no hay reportes subidos por los técnicos.')}
            </p>
            <p className="rg-empty-sub">
              {isTech ? 'Los reportes de tus trabajos aceptados aparecerán organizados aquí.' : 'Cuando los técnicos suban fotos de sus etapas se mostrarán aquí.'}
            </p>
          </div>
        ) : (
          <div className="rg-jobs-grid">
            {propiedadesConReportes.map(propiedad => (
              <button
                key={propiedad.propKey}
                type="button"
                className="rg-glass-card rg-job-card"
                onClick={() => { setSelectedPropKey(propiedad.propKey); setSelectedGroupKey(null); }}
              >
                <div className="rg-job-photo">
                  {propiedad.foto ? (
                    <img src={propiedad.foto} alt={propiedad.nombre} />
                  ) : (
                    <div className="rg-job-photo-empty"><ImageIcon size={34} /></div>
                  )}
                  <span className="rg-job-progress">
                    <ClipboardList size={13} /> {propiedad.servicios.length} {propiedad.servicios.length === 1 ? 'SERVICIO' : 'SERVICIOS'}
                  </span>
                </div>

                <div className="rg-job-body">
                  <div className="rg-job-name">
                    <MapPin size={17} />
                    <h3>{propiedad.nombre}</h3>
                  </div>
                  <div className="rg-job-meta">
                    <span><strong>CURP:</strong> {propiedad.curp}</span>
                    <span><strong>DUEÑO:</strong> {propiedad.dueno}</span>
                  </div>
                  <span className="rg-job-cta">
                    Ver servicios <ChevronRight size={16} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* PANEL DE DETALLE: PROPIEDAD → LISTA DE SERVICIOS → REPORTE DEL SERVICIO */}
      {propiedadSeleccionada && createPortal(
        <div className="rg-sheet-overlay" onClick={cerrarPanel}>
          <div className="rg-sheet" onClick={e => e.stopPropagation()}>
            <div className="rg-sheet-grabber" />

            <div className="rg-sheet-header">
              <div className="rg-sheet-header-text">
                {grupoSeleccionado ? (
                  <button type="button" className="rg-sheet-back" onClick={() => setSelectedGroupKey(null)}>
                    <ChevronLeft size={16} /> Servicios
                  </button>
                ) : (
                  <span className="rg-trabajo-badge">
                    {propiedadSeleccionada.servicios.length} {propiedadSeleccionada.servicios.length === 1 ? 'SERVICIO REALIZADO' : 'SERVICIOS REALIZADOS'}
                  </span>
                )}
                <h2>{propiedadSeleccionada.nombre}</h2>
                <div className="rg-job-meta">
                  {grupoSeleccionado ? (
                    <>
                      <span><strong>SERVICIO {numeroServicio}:</strong> {grupoSeleccionado.tituloTrabajo} (#{grupoSeleccionado.trabajoId})</span>
                      <span><strong>FECHA:</strong> {grupoSeleccionado.fechaTexto}</span>
                    </>
                  ) : (
                    <>
                      <span><strong>CURP:</strong> {propiedadSeleccionada.curp}</span>
                      <span><strong>DUEÑO:</strong> {propiedadSeleccionada.dueno}</span>
                    </>
                  )}
                </div>
              </div>
              <button type="button" className="rg-sheet-close" onClick={cerrarPanel} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            {!grupoSeleccionado ? (
              /* NIVEL 1: LISTA DE SERVICIOS DE LA PROPIEDAD */
              <>
                {propiedadSeleccionada.foto && (
                  <div className="rg-sheet-photo">
                    <img src={propiedadSeleccionada.foto} alt={propiedadSeleccionada.nombre} onClick={() => setZoomImage(propiedadSeleccionada.foto)} />
                  </div>
                )}

                <div className="rg-services-list">
                  {propiedadSeleccionada.servicios.map((servicio, idx) => (
                    <button
                      key={servicio.groupKey}
                      type="button"
                      className="rg-service-item"
                      onClick={() => setSelectedGroupKey(servicio.groupKey)}
                    >
                      <span className="rg-service-number">{idx + 1}</span>
                      <span className="rg-service-info">
                        <span className="rg-service-label">SERVICIO {idx + 1} · #{servicio.trabajoId}</span>
                        <span className="rg-service-title">{servicio.tituloTrabajo}</span>
                        <span className="rg-service-meta">
                          <Calendar size={13} /> {servicio.fechaTexto}
                          <span className="rg-service-dot">•</span>
                          <CheckCircle2 size={13} /> {servicio.etapasRegistradas}/{STAGES.length} etapas
                        </span>
                      </span>
                      <ChevronRight size={18} className="rg-service-chevron" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
            /* NIVEL 2: REPORTE DEL SERVICIO SELECCIONADO */
            <>
            <div className="rg-sheet-actions">
              {(() => {
                const cotizacionAsociada = getCotizacionAsociada(grupoSeleccionado);
                return cotizacionAsociada ? (
                  <button type="button" className="rg-btn-secondary" onClick={() => abrirCotizacion(cotizacionAsociada)}>
                    <FileText size={15} /> VER COTIZACIÓN
                  </button>
                ) : null;
              })()}
              <button type="button" className="rg-btn-primary" onClick={() => abrirReporteOficial(grupoSeleccionado)}>
                <FileText size={15} /> REPORTE OFICIAL
              </button>
            </div>

            {/* LAS 4 ETAPAS ESTRUCTURADAS (ANTES, DURANTE, DESPUÉS, EXTRA) */}
            <div className="rg-stages-grid">
              {STAGES.map(stage => {
                const { reports, trabajoId, tipo } = grupoSeleccionado;
                const r = getReportForStage(reports, stage);
                const cleanDesc = r ? (r.description || '').replace(/\[(ANTES|DURANTE|DESPUÉS|DESPUES|EXTRA)\]/gi, '').trim() : '';

                return r ? (
                  <div key={stage.key} className="rg-stage-card">
                    <div className="rg-stage-header">
                      <span className="rg-stage-badge">{stage.title}</span>
                      <span className="rg-stage-status"><CheckCircle2 size={12} /> REGISTRADO</span>
                    </div>

                    <div className="rg-stage-image">
                      <img
                        src={r.image_url || r.image_path}
                        alt={stage.title}
                        onClick={() => setZoomImage(r.image_url || r.image_path)}
                      />
                    </div>

                    <div className="rg-stage-tech">
                      <div className="rg-stage-tech-initial">
                        {r.technician?.first_name?.charAt(0) || (user?.first_name ? user.first_name.charAt(0) : 'T')}
                      </div>
                      <span>
                        {r.technician ? `${r.technician.first_name} ${r.technician.last_name || ''}`.trim() : (user?.name || 'Técnico')}
                      </span>
                    </div>

                    <p className="rg-stage-desc">"{cleanDesc || 'Sin descripción.'}"</p>

                    <div className="rg-stage-actions">
                      <button type="button" className="rg-stage-btn-edit" onClick={() => handleOpenModal('edit', r, trabajoId, tipo, stage)}>
                        <Pencil size={13} /> Editar
                      </button>
                      <button type="button" className="rg-stage-btn-delete" onClick={() => handleDeleteReport(r.id)}>
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    key={stage.key}
                    type="button"
                    className="rg-stage-empty"
                    onClick={() => handleOpenModal('add', null, trabajoId, tipo, stage)}
                  >
                    <span className="rg-stage-empty-icon"><Plus size={22} /></span>
                    <strong>AÑADIR EVIDENCIA</strong>
                    <span>{stage.title}{!stage.required && ' (opcional)'}</span>
                  </button>
                );
              })}
            </div>
            </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PARA AGREGAR O EDITAR EVIDENCIA */}
      {isModalOpen && createPortal(
        <div className="rg-modal-overlay">
          <div className="rg-modal">
            <div className="rg-modal-header">
              <div className="rg-sheet-header-text">
                <span className="rg-trabajo-badge">{selectedStage?.title || 'EVIDENCIA'}</span>
                <h2>{modalMode === 'add' ? 'Añadir evidencia' : 'Editar evidencia'}</h2>
              </div>
              <button type="button" className="rg-sheet-close" onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="rg-modal-form">
              <div className="rg-field">
                <label className="rg-label">
                  {modalMode === 'add' ? <Plus size={15} /> : <Edit size={15} />} Descripción obligatoria <span className="rg-required">*</span>
                </label>
                <textarea
                  className="rg-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={selectedStage?.placeholder || "Escribe la descripción de lo realizado..."}
                  required
                />
              </div>

              <div className="rg-field">
                <label className="rg-label">
                  <Upload size={15} /> Fotografía de evidencia {modalMode === 'add' && <span className="rg-required">*</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  id="report-image-upload"
                />
                <label htmlFor="report-image-upload" className="rg-upload-btn">
                  <Upload size={18} />
                  {formData.image ? 'Cambiar imagen seleccionada' : (modalMode === 'edit' ? 'Subir nueva foto (opcional)' : 'Seleccionar fotografía')}
                </label>

                {previewImage && (
                  <img src={previewImage} alt="Vista previa" className="rg-upload-preview" />
                )}
              </div>

              <div className="rg-modal-footer">
                <button type="button" onClick={closeModal} className="rg-btn-secondary">
                  CANCELAR
                </button>
                <button type="submit" disabled={isSubmitting} className="rg-btn-primary">
                  {isSubmitting ? 'GUARDANDO...' : 'GUARDAR EVIDENCIA'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ZOOM */}
      {zoomImage && createPortal(
        <div className="rg-zoom-overlay" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} alt="Ampliada" onClick={e => e.stopPropagation()} />
          <button type="button" className="rg-zoom-close" onClick={() => setZoomImage(null)} aria-label="Cerrar">
            <X size={30} />
          </button>
        </div>,
        document.body
      )}

      {/* Mobile Bottom Dock Bar */}
      <MobileBottomNav activeModule="reportes" />
    </div>
  );
};

export default VistaReportesGlobal;
