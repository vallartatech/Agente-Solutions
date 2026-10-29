import { useState, useEffect, useRef, Children } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Shared/Header';
import SelectorVistas from '../../../components/Shared/SelectorVistas';
import CasaLoader from '../../../components/Shared/CasaLoader';
import { SelectorMascota } from '../../../components/Shared/AlertaValidacion';
import MobileBottomNav from '../../../components/Shared/MobileBottomNav';
import { useAuth } from '../../../context/AuthContext';
import { Search, MapPin, FileText, ChevronLeft, ChevronRight, Plus, Edit, Trash2, X, Upload, CheckCircle2, Pencil, Calendar, ClipboardList, Image as ImageIcon, Camera, Video, Images, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import { esVideoUrl, validarVideoEvidencia, VIDEO_MAX_SEGUNDOS } from '../../../utils/evidencia';
import GrabadorVideo, { puedeGrabarEnApp } from '../../../components/Shared/GrabadorVideo';
import { ETAPAS_EVIDENCIA, evidenciaDeEtapa, limpiarEtiqueta } from '../Shared/etapasEvidencia';
import '../../../styles/Shared/UniversalSearch.css';
import '../../../styles/Shared/ToolbarAcciones.css';
import '../../../styles/AgenteSolutions/Admin/VistaReportesGlobal.css';

// Etapas compartidas con la galería del técnico (incluye el ticket de conformidad)
const STAGES = ETAPAS_EVIDENCIA.map(e => ({ ...e, placeholder: e.placeholderAdmin }));

// Avisa al menú (contador / mascota de "por validar") que algo cambió
const avisarValidacion = () => window.dispatchEvent(new Event('validacion-actualizada'));

// Etapas del trabajo: en computadora, una fila con las 5; en tablet y celular, un carrusel
// (la del centro grande, las de los lados asomándose), con flechas, puntos y deslizar con el dedo.
const ES_CARRUSEL = '(max-width: 900px)';

const CarruselEtapas = ({ children }) => {
  const pistaRef = useRef(null);
  const [activa, setActiva] = useState(0);
  const items = Children.toArray(children);

  const irA = (i) => {
    const pista = pistaRef.current;
    const item = pista?.children[i];
    if (!item) return;
    pista.scrollTo({ left: item.offsetLeft - (pista.clientWidth - item.clientWidth) / 2, behavior: 'smooth' });
  };

  // La tarjeta activa es la más cercana al centro
  const alDeslizar = () => {
    const pista = pistaRef.current;
    if (!pista) return;
    const centro = pista.scrollLeft + pista.clientWidth / 2;
    let mejor = 0;
    let distancia = Infinity;
    [...pista.children].forEach((item, i) => {
      const d = Math.abs(item.offsetLeft + item.clientWidth / 2 - centro);
      if (d < distancia) { distancia = d; mejor = i; }
    });
    setActiva(mejor);
  };

  return (
    <div className="rg-carrusel">
      <div className="rg-stages-grid" ref={pistaRef} onScroll={alDeslizar}>
        {items.map((item, i) => (
          <div
            key={item.key}
            className={`rg-car-item ${i === activa ? 'activa' : ''}`}
            // En el carrusel, tocar una tarjeta de un lado la trae al centro (no abre nada)
            onClickCapture={(e) => {
              if (i !== activa && window.matchMedia(ES_CARRUSEL).matches) {
                e.preventDefault();
                e.stopPropagation();
                irA(i);
              }
            }}
          >
            {item}
          </div>
        ))}
      </div>

      <button type="button" className="rg-car-flecha izq" onClick={() => irA(activa - 1)} disabled={activa === 0} aria-label="Etapa anterior">
        <ChevronLeft size={22} />
      </button>
      <button type="button" className="rg-car-flecha der" onClick={() => irA(activa + 1)} disabled={activa === items.length - 1} aria-label="Etapa siguiente">
        <ChevronRight size={22} />
      </button>

      <div className="rg-car-puntos" role="tablist" aria-label="Etapas">
        {items.map((item, i) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={i === activa}
            aria-label={`Etapa ${i + 1}`}
            className={i === activa ? 'activo' : ''}
            onClick={() => irA(i)}
          />
        ))}
      </div>
    </div>
  );
};

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
  // Root y admin: Reportes comparte botón con Cotizaciones
  const esAdminPanel = [0, 1].includes(Number(user?.role_id));
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
      cleanDesc = limpiarEtiqueta(report.description);
    }

    setFormData({ description: cleanDesc, image: null });
    setPreviewImage(mode === 'edit' ? (report?.image_url || report?.image_path) : null);
    setPreviewEsVideo(mode === 'edit' && esVideoUrl(report?.image_url || report?.image_path));
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

  const [previewEsVideo, setPreviewEsVideo] = useState(false);
  const [grabando, setGrabando] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    usarArchivo(file);
  };

  // yaValidado: el video viene de la grabadora propia, que ya respeta el límite
  const usarArchivo = async (file, yaValidado = false) => {
    if (!file) return;
    const esVideo = file.type.startsWith('video/');
    if (esVideo && !selectedStage?.permiteVideo) return;
    if (esVideo && !yaValidado) {
      const motivo = await validarVideoEvidencia(file);
      if (motivo) {
        Swal.fire('Video no válido', motivo, 'warning');
        return;
      }
    }
    setFormData(prev => ({ ...prev, image: file }));
    setPreviewImage(URL.createObjectURL(file));
    setPreviewEsVideo(esVideo);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    // En el ticket el comentario es opcional
    if (!formData.description.trim() && modalMode === 'add' && !selectedStage?.esTicket) {
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
    const cleanUserDesc = limpiarEtiqueta(formData.description) || (selectedStage?.esTicket ? 'Ticket de conformidad' : '');
    const finalDesc = `${tagStr} ${cleanUserDesc}`;

    data.append('description', finalDesc);
    if (selectedStage?.stage) data.append('stage', selectedStage.stage);
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
      if (selectedStage?.esTicket) avisarValidacion();
    } catch (error) {
      console.error("Error al guardar:", error);
      Swal.fire('Error', error.response?.data?.error || 'Hubo un problema al guardar la evidencia.', 'error');
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
      } catch {
        Swal.fire('Error', 'No se pudo eliminar la evidencia.', 'error');
      }
    }
  };

  // Evidencia de cada etapa: por la columna `stage` o, en las viejas, por su etiqueta / orden
  const getReportForStage = (groupReports, stage) => evidenciaDeEtapa(groupReports, stage);
  const ETAPA_TICKET = STAGES.find(st => st.esTicket);

  // Validar un trabajo terminado (queda "Listo"). Sin ticket se permite, pero queda a nombre de quien lo confirma.
  const [validando, setValidando] = useState(false);
  const validarTrabajo = async (grupo) => {
    const tieneTicket = Boolean(getReportForStage(grupo.reports, ETAPA_TICKET));
    const nombreYo = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.name || 'ti';
    const confirmacion = await Swal.fire(tieneTicket
      ? {
        icon: 'question',
        title: '¿Validar y finalizar?',
        text: 'El trabajo quedará finalizado con su ticket de conformidad y se le avisará al técnico.',
        showCancelButton: true,
        confirmButtonText: 'Sí, finalizar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#16a34a',
        reverseButtons: true
      }
      : {
        icon: 'warning',
        title: '¿Finalizar sin ticket?',
        text: `Este trabajo no tiene ticket de conformidad. Si lo finalizas, quedará registrado que lo confirmó ${nombreYo}.`,
        showCancelButton: true,
        confirmButtonText: 'Finalizar sin ticket',
        cancelButtonText: 'Subir ticket primero',
        confirmButtonColor: '#ea580c',
        reverseButtons: true
      });
    if (!confirmacion.isConfirmed) return;

    setValidando(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/work-orders/${grupo.trabajoId}/status`, { status: 'Listo' }, { headers });
      Swal.fire({
        icon: 'success',
        title: '¡Trabajo finalizado!',
        text: tieneTicket ? 'Quedó validado con su ticket.' : `Quedó finalizado sin ticket, confirmado por ${nombreYo}.`,
        timer: 2200,
        showConfirmButton: false
      });
      await fetchReportesYCotizaciones();
      avisarValidacion();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.error || 'No se pudo finalizar el trabajo.', 'error');
    } finally {
      setValidando(false);
    }
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

    // Validación: solo las órdenes de trabajo pasan por "Por Aprobar" → "Listo"
    const orden = tipo === 'work_order' ? (first.work_order || first.workOrder) : null;
    const cerrador = orden?.closer;

    return {
      groupKey, nombre, curp, dueno, trabajoId, tipo, tituloTrabajo, reports, foto, etapasRegistradas,
      porValidar: orden?.status === 'Por Aprobar',
      ticketStatus: orden?.status === 'Listo' ? orden?.ticket_status : null,
      cerradoPor: cerrador ? `${cerrador.first_name || ''} ${cerrador.last_name || ''}`.trim() : '',
      cerradoEl: orden?.closed_at
        ? new Date(orden.closed_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '',
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
  ).map(p => ({
    ...p,
    servicios: [...p.servicios].sort((a, b) => a.fechaTs - b.fechaTs),
    porValidar: p.servicios.filter(sv => sv.porValidar).length
  }))
    // Las propiedades con trabajos por validar van primero
    .sort((a, b) => (b.porValidar > 0) - (a.porValidar > 0));

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
        // Solo las fotos que se ven en las tarjetas de etapas (una por etapa, sin repetir; el ticket va aparte)
        imagenes: [...new Set(
          STAGES.filter(st => !st.esTicket).map(st => getReportForStage(reports, st))
            .map(r => r?.image_url || r?.image_path)
            .filter(Boolean)
        )]
      }
    });
  };

  return (
    <div className="rg-root">
      <Header activeModule="reportes" />

      <main className="rg-main-container">
        {/* TÍTULO */}
        <div className="rg-action-bar">
          {esAdminPanel ? (
            <>
              <SelectorVistas grupo="cotizaciones" activo="reportes" conteo={propiedadesConReportes.length} />
              {/* Quien recibe la alerta de "por validar" elige su mascota (o solo el número) */}
              <SelectorMascota />
            </>
          ) : (
            <div className="rg-page-title-badge">
              <FileText size={18} className="rg-title-icon" />
              <span>{pageHeading}</span>
              <span className="rg-count-pill">{propiedadesConReportes.length}</span>
            </div>
          )}
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
                  {propiedad.porValidar > 0 && (
                    <span className="rg-por-validar-tag">
                      <ShieldCheck size={13} /> {propiedad.porValidar} POR VALIDAR
                    </span>
                  )}
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
                        <span className="rg-service-label">
                          SERVICIO {idx + 1} · #{servicio.trabajoId}
                          {servicio.porValidar && <span className="rg-estado-chip por-validar">Por validar</span>}
                          {servicio.ticketStatus === 'con_ticket' && <span className="rg-estado-chip con-ticket">Finalizado · con ticket</span>}
                          {servicio.ticketStatus === 'sin_ticket' && <span className="rg-estado-chip sin-ticket">Finalizado sin ticket</span>}
                        </span>
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

            {/* Validación del trabajo terminado */}
            {esAdminPanel && grupoSeleccionado.porValidar && (
              <div className="rg-validar-banner">
                <div>
                  <strong><ShieldCheck size={16} /> Trabajo terminado, pendiente de validar</strong>
                  <span>
                    {getReportForStage(grupoSeleccionado.reports, ETAPA_TICKET)
                      ? 'Ya tiene su ticket de conformidad.'
                      : 'Aún no tiene ticket de conformidad: súbelo abajo o finaliza sin ticket.'}
                  </span>
                </div>
                <button type="button" className="rg-btn-validar" onClick={() => validarTrabajo(grupoSeleccionado)} disabled={validando}>
                  <CheckCircle2 size={16} /> {validando ? 'FINALIZANDO...' : 'VALIDAR Y FINALIZAR'}
                </button>
              </div>
            )}
            {grupoSeleccionado.ticketStatus && (
              <div className={`rg-cierre-nota ${grupoSeleccionado.ticketStatus}`}>
                <CheckCircle2 size={15} />
                {grupoSeleccionado.ticketStatus === 'con_ticket'
                  ? <span>Finalizado con ticket{grupoSeleccionado.cerradoPor ? ` · validó ${grupoSeleccionado.cerradoPor}` : ''}{grupoSeleccionado.cerradoEl ? ` · ${grupoSeleccionado.cerradoEl}` : ''}</span>
                  : <span>Finalizado <b>sin ticket</b>{grupoSeleccionado.cerradoPor ? ` · confirmó ${grupoSeleccionado.cerradoPor}` : ''}{grupoSeleccionado.cerradoEl ? ` · ${grupoSeleccionado.cerradoEl}` : ''}</span>}
              </div>
            )}

            {/* LAS 4 ETAPAS (ANTES, DURANTE, DESPUÉS, EXTRA) + TICKET DE CONFORMIDAD */}
            <CarruselEtapas>
              {STAGES.map(stage => {
                const { reports, trabajoId, tipo } = grupoSeleccionado;
                const r = getReportForStage(reports, stage);
                const cleanDesc = r ? limpiarEtiqueta(r.description) : '';

                return r ? (
                  <div key={stage.key} className={`rg-stage-card ${stage.esTicket ? 'es-ticket' : ''}`}>
                    <div className="rg-stage-header">
                      <span className="rg-stage-badge">{stage.title}</span>
                      <span className="rg-stage-status"><CheckCircle2 size={12} /> REGISTRADO</span>
                    </div>

                    <div className="rg-stage-image">
                      {esVideoUrl(r.image_url || r.image_path) ? (
                        // Se reproduce en el mismo cuadro, con sus controles
                        <video
                          src={r.image_url || r.image_path}
                          controls
                          playsInline
                          preload="metadata"
                          className="rg-stage-video"
                        />
                      ) : (
                        <img
                          src={r.image_url || r.image_path}
                          alt={stage.title}
                          onClick={() => setZoomImage(r.image_url || r.image_path)}
                        />
                      )}
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
                    className={`rg-stage-empty ${stage.esTicket ? 'es-ticket' : ''}`}
                    onClick={() => handleOpenModal('add', null, trabajoId, tipo, stage)}
                  >
                    <span className="rg-stage-empty-icon"><Plus size={22} /></span>
                    <strong>{stage.esTicket ? 'SUBIR TICKET' : 'AÑADIR EVIDENCIA'}</strong>
                    <span>
                      {stage.title}
                      {stage.marcaRequerido ? ' (requerido)' : !stage.required && ' (opcional)'}
                    </span>
                  </button>
                );
              })}
            </CarruselEtapas>
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
                  {modalMode === 'add' ? <Plus size={15} /> : <Edit size={15} />}
                  {selectedStage?.esTicket
                    ? ' Folio o comentario (opcional)'
                    : <> Descripción obligatoria <span className="rg-required">*</span></>}
                </label>
                <textarea
                  className="rg-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={selectedStage?.placeholder || "Escribe la descripción de lo realizado..."}
                  required={!selectedStage?.esTicket}
                />
              </div>

              <div className="rg-field">
                <label className="rg-label">
                  <Upload size={15} /> {selectedStage?.esTicket ? 'Foto del ticket firmado o sellado' : selectedStage?.permiteVideo ? `Foto o video (máx. ${VIDEO_MAX_SEGUNDOS} s)` : 'Fotografía de evidencia'} {modalMode === 'add' && <span className="rg-required">*</span>}
                </label>
                {/* Cámara (foto o video) o galería */}
                <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} id="report-image-camara" />
                <input type="file" accept="video/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} id="report-video-camara" />
                <input
                  type="file"
                  accept={selectedStage?.permiteVideo ? 'image/*,video/*' : 'image/*'}
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  id="report-image-upload"
                />
                <div className="rg-upload-opciones">
                  <label htmlFor="report-image-camara" className="rg-upload-btn"><Camera size={18} /> Tomar foto</label>
                  {selectedStage?.permiteVideo && (puedeGrabarEnApp()
                    ? <button type="button" className="rg-upload-btn" onClick={() => setGrabando(true)}><Video size={18} /> Grabar video</button>
                    : <label htmlFor="report-video-camara" className="rg-upload-btn"><Video size={18} /> Grabar video</label>
                  )}
                </div>
                <label htmlFor="report-image-upload" className="rg-upload-btn">
                  <Images size={18} />
                  {formData.image
                    ? (previewEsVideo ? 'Cambiar video seleccionado' : 'Cambiar imagen seleccionada')
                    : (modalMode === 'edit'
                      ? (selectedStage?.permiteVideo ? 'Subir nueva foto o video (opcional)' : 'Subir nueva foto (opcional)')
                      : (selectedStage?.permiteVideo ? 'Seleccionar foto o video' : 'Seleccionar fotografía'))}
                </label>

                {previewImage && (previewEsVideo
                  ? <video src={previewImage} controls playsInline className="rg-upload-preview" />
                  : <img src={previewImage} alt="Vista previa" className="rg-upload-preview" />
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

      {grabando && (
        <GrabadorVideo
          maxSegundos={VIDEO_MAX_SEGUNDOS}
          onCerrar={() => setGrabando(false)}
          onListo={(file) => { usarArchivo(file, true); setGrabando(false); }}
        />
      )}

      {/* MODAL ZOOM */}
      {zoomImage && createPortal(
        <div className="rg-zoom-overlay" onClick={() => setZoomImage(null)}>
          {esVideoUrl(zoomImage)
            ? <video src={zoomImage} controls autoPlay playsInline onClick={e => e.stopPropagation()} />
            : <img src={zoomImage} alt="Ampliada" onClick={e => e.stopPropagation()} />}
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
