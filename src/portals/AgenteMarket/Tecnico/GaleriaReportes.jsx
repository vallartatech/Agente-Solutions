// Galería de evidencias de la Red: mismo diseño que la app interna (AgenteSolutions/Tecnico/GaleriaReportes).
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import "../../../styles/AgenteSolutions/Tecnico/GaleriaReportes.css";
import {
  ChevronLeft, FileText, Camera, CheckCircle2, Trash2, Edit3, Loader2, Upload, Video, Images,
  Hash, UserRound, Building2, Wrench, Clock, Send, AlertCircle, Circle, Maximize2, Receipt, Lock, ImageOff
} from 'lucide-react';
import Swal from 'sweetalert2';

import TecnicoHeader from '../../../components/Shared/TecnicoHeader';
import { useAuth } from "../../../context/AuthContext";
import { esVideoUrl, validarVideoEvidencia, VIDEO_MAX_SEGUNDOS } from '../../../utils/evidencia';
import GrabadorVideo, { puedeGrabarEnApp } from '../../../components/Shared/GrabadorVideo';
import { ETAPAS_EVIDENCIA, evidenciaDeEtapa, limpiarEtiqueta, esPorElemento, etapasDelTrabajo, evidenciasDelElemento, avanceDelElemento, evidenciasSoloLectura, trabajoValidado } from '../Shared/etapasEvidencia';
import '../../../styles/AgenteSolutions/Admin/Mantenimiento.css';
import CarruselEtapas from '../../AgenteSolutions/Shared/CarruselEtapas';
import { VisorFotos } from '../../AgenteSolutions/Admin/Expediente/ExpedienteUI';
import '../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';
import '../../../styles/AgenteSolutions/Tecnico/EvidenciasTrabajo.css';

// Tonos apagados por etapa (los de ETAPAS_EVIDENCIA son para insignias sólidas y resultan chillones aquí)
const TONO_ETAPA = {
  ANTES: '#c8607a',
  DURANTE: '#d98545',
  DESPUES: '#3f9a72',
  EXTRA: '#7b8798',
  TICKET: '#7e6fc4',
};

// Etapas compartidas con el panel de reportes del admin (incluye el ticket de conformidad)
const STAGES = ETAPAS_EVIDENCIA.map(e => ({ ...e, placeholder: e.placeholderTecnico }));
const SLOT_VACIO = { file: null, preview: null, description: '', isEditing: false };

const GaleriaReportes = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const trabajoId = id || location.state?.trabajoId;
  const esAdmin = [0, 1].includes(Number(user?.role_id));
  // Datos del trabajo: los de la pantalla anterior y, encima, los del servidor (estado real aunque se abra por enlace)
  const [detalleTrabajo, setDetalleTrabajo] = useState(null);
  const servicio = detalleTrabajo ? { ...detalleTrabajo, ...(location.state?.servicio || {}) } : location.state?.servicio;
  // Red: el técnico regresa al tablero de trabajos de la Red (con este trabajo seleccionado)
  const returnPath = location.state?.from || (esAdmin
    ? '/tablero-servicios'
    : (trabajoId && String(trabajoId).startsWith('work_order-') ? '/mercado-trabajos' : `/trabajo-propiedad/${trabajoId}`));

  const [reportes, setReportes] = useState([]);
  // Estado de la orden: viene del trabajo (técnico) o de la tarjeta del tablero (admin)
  const [estadoOrden, setEstadoOrden] = useState(servicio?.estado || servicio?.status || '');
  const [enviandoAprobacion, setEnviandoAprobacion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingKey, setSubmittingKey] = useState(null);
  const [imagenExpandida, setImagenExpandida] = useState(null);

  // Elementos del trabajo: con 2 o más, cada uno lleva su ANTES y su DESPUÉS
  const [elementos, setElementos] = useState([]);
  const [elementoActivo, setElementoActivo] = useState(null);
  const [cargandoElementos, setCargandoElementos] = useState(true);
  const porElemento = esPorElemento(elementos);
  const etapas = etapasDelTrabajo(STAGES, elementos);

  // Estado local para los formularios de cada etapa (por elemento cuando aplica)
  const [slotData, setSlotData] = useState({});
  const claveSlot = (stage) => (porElemento && !stage.esTicket ? `${elementoActivo}:${stage.key}` : stage.key);

  // Un solo input de archivo: antes de abrirlo se ajusta a cámara (foto / video) o galería
  const entradaRef = useRef(null);
  const etapaArchivo = useRef(null);
  const [menuEtapa, setMenuEtapa] = useState(null);
  const [grabadorEtapa, setGrabadorEtapa] = useState(null);

  const abrirArchivo = (stage, modo) => {
    // Grabar: con la grabadora propia, que corta sola al llegar al límite
    if (modo === 'video' && puedeGrabarEnApp()) {
      setMenuEtapa(null);
      setGrabadorEtapa(stage);
      return;
    }
    const el = entradaRef.current;
    if (!el) return;
    el.accept = modo === 'video' ? 'video/*' : modo === 'foto' ? 'image/*' : (stage.permiteVideo ? 'image/*,video/*' : 'image/*');
    if (modo === 'galeria') el.removeAttribute('capture');
    else el.setAttribute('capture', 'environment');
    etapaArchivo.current = stage;
    setMenuEtapa(null);
    el.click();
  };

  const fetchReportes = async () => {
    if (!trabajoId) {
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/${trabajoId}/reportes`, { headers });
      setReportes(response.data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportes();
  }, [trabajoId]);

  useEffect(() => {
    if (!trabajoId) return;
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/${encodeURIComponent(String(trabajoId))}`)
      .then(({ data }) => {
        const detalle = data?.data || data;
        setDetalleTrabajo(detalle);
        if (detalle?.estado) setEstadoOrden(detalle.estado);
      })
      .catch(() => {});
  }, [trabajoId]);

  useEffect(() => {
    if (!/work[_\s-]*order/i.test(String(trabajoId || ''))) {
      setCargandoElementos(false);
      return;
    }
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/work-orders/${String(trabajoId).match(/\d+/)?.[0]}/elementos`)
      .then(({ data }) => {
        setElementos(data || []);
        setElementoActivo(data?.[0]?.id ?? null);
      })
      .catch((error) => console.error('Error fetching work order elements:', error))
      .finally(() => setCargandoElementos(false));
  }, [trabajoId]);

  // Evidencia de cada etapa: por la columna `stage` o, en las viejas, por su etiqueta / orden
  const getReportForSlot = (stage) => evidenciaDeEtapa(
    porElemento && !stage.esTicket ? evidenciasDelElemento(reportes, elementoActivo) : reportes,
    stage
  );

  // yaValidado: el video viene de la grabadora propia, que ya respeta el límite
  const handleFileChange = async (stage, file, yaValidado = false) => {
    if (!file) return;
    const esVideo = file.type.startsWith('video/');
    if (esVideo && !stage.permiteVideo) return;
    if (esVideo && !yaValidado) {
      const motivo = await validarVideoEvidencia(file);
      if (motivo) {
        Swal.fire({ icon: 'warning', title: 'Video no válido', text: motivo, confirmButtonColor: '#F26522' });
        return;
      }
    }
    const previewUrl = URL.createObjectURL(file);
    const clave = claveSlot(stage);
    setSlotData(prev => ({
      ...prev,
      [clave]: {
        ...(prev[clave] || SLOT_VACIO),
        file,
        preview: previewUrl,
        previewEsVideo: esVideo
      }
    }));
  };

  const handleDescriptionChange = (clave, text) => {
    setSlotData(prev => ({
      ...prev,
      [clave]: {
        ...(prev[clave] || SLOT_VACIO),
        description: text
      }
    }));
  };

  const handleSaveSlot = async (stage) => {
    const dataForSlot = slotData[claveSlot(stage)] || SLOT_VACIO;
    const existingReport = getReportForSlot(stage);

    // En el ticket el comentario es opcional
    const descToSave = dataForSlot.description.trim() || (stage.esTicket ? 'Ticket de conformidad' : '');

    if (!descToSave) {
      Swal.fire({
        icon: 'warning',
        title: 'Descripción Obligatoria',
        text: `Debes ingresar una descripción detallada para la evidencia: ${stage.title}.`,
        confirmButtonColor: '#F26522'
      });
      return;
    }

    if (!dataForSlot.file && !existingReport) {
      Swal.fire({
        icon: 'warning',
        title: stage.permiteVideo ? 'Foto o video obligatorio' : 'Foto Obligatoria',
        text: stage.permiteVideo
          ? `Debes subir una fotografía o un video (máximo ${VIDEO_MAX_SEGUNDOS} s) para la evidencia: ${stage.title}.`
          : `Debes tomar o seleccionar una fotografía para la evidencia: ${stage.title}.`,
        confirmButtonColor: '#F26522'
      });
      return;
    }

    setSubmittingKey(stage.key);

    try {
      const formData = new FormData();
      // Incluir tag identificador en la descripción
      const finalDesc = `${stage.tag} ${limpiarEtiqueta(descToSave)}`;

      formData.append('description', finalDesc);
      formData.append('stage', stage.stage);

      if (dataForSlot.file) {
        formData.append('image', dataForSlot.file);
      }

      if (existingReport && existingReport.id) {
        // Actualizar reporte existente
        formData.append('_method', 'PUT');
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/reportes/${existingReport.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Crear nuevo reporte
        if (porElemento && !stage.esTicket) formData.append('work_order_component_id', elementoActivo);
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/servicios/${trabajoId}/reportes`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      Swal.fire({
        icon: 'success',
        title: 'Evidencia Guardada',
        text: `La evidencia de "${stage.title}" se ha registrado correctamente.`,
        timer: 1800,
        showConfirmButton: false
      });

      // Limpiar formulario local de ese slot
      setSlotData(prev => ({ ...prev, [claveSlot(stage)]: SLOT_VACIO }));

      await fetchReportes();
    } catch (error) {
      console.error('Error al guardar evidencia:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al Guardar',
        text: error.response?.data?.error || 'Ocurrió un inconveniente al subir la evidencia. Inténtalo nuevamente.',
        confirmButtonColor: '#F26522'
      });
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleDeleteSlot = async (reportId, stageTitle) => {
    const result = await Swal.fire({
      title: '¿Eliminar evidencia?',
      text: `Esta acción borrará la foto y descripción de "${stageTitle}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/reportes/${reportId}`);
        Swal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'La evidencia ha sido eliminada.',
          timer: 1500,
          showConfirmButton: false
        });
        await fetchReportes();
      } catch (error) {
        console.error('Error al eliminar:', error);
        Swal.fire('Error', 'No se pudo eliminar la evidencia.', 'error');
      }
    }
  };

  const handleStartEditing = (stage, existingReport) => {
    const cleanDesc = limpiarEtiqueta(existingReport.description);
    setSlotData(prev => ({
      ...prev,
      [claveSlot(stage)]: {
        file: null,
        preview: null,
        description: cleanDesc,
        isEditing: true
      }
    }));
  };

  // Contar cuántas evidencias obligatorias están listas
  const totalRequeridas = porElemento ? elementos.length * 2 : STAGES.filter(s => s.required).length;
  const countRequiredDone = porElemento
    ? elementos.reduce((suma, el) => suma + avanceDelElemento(reportes, el.id), 0)
    : STAGES.filter(s => s.required && getReportForSlot(s)).length;

  // Con las evidencias obligatorias se puede cerrar desde aquí, sin regresar al trabajo.
  // El técnico lo manda a aprobación (el backend lo deja "Por Aprobar"); el admin lo finaliza.
  const ordenCerrada = ['Listo', 'Finalizado', 'Por Aprobar', 'done', 'review', 'rejected', 'Rechazado', 'Cancelado'].includes(estadoOrden);
  const esOrdenDeTrabajo = !String(trabajoId || '').toLowerCase().includes('servicio');
  const puedeEnviar = countRequiredDone === totalRequeridas && !cargandoElementos && !ordenCerrada && esOrdenDeTrabajo;
  // Enviado a aprobación: el técnico ya no edita. Validado: nadie edita (el backend aplica lo mismo)
  const soloLectura = esOrdenDeTrabajo && evidenciasSoloLectura(estadoOrden, esAdmin);

  const enviarAprobacion = async () => {
    const result = await Swal.fire({
      title: esAdmin ? '¿Finalizar el trabajo?' : '¿Enviar a aprobación?',
      text: esAdmin
        ? 'El trabajo quedará finalizado y se le avisará al técnico.'
        : 'El administrador revisará tu reporte y lo aprobará. Te llegará una notificación.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#64748b',
      confirmButtonText: esAdmin ? 'Sí, finalizar' : 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    setEnviandoAprobacion(true);
    try {
      const realId = String(trabajoId).match(/\d+/)?.[0];
      const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/work-orders/${realId}/status`, { status: 'Listo' });
      const nuevo = res.data?.status || 'Listo';
      setEstadoOrden(nuevo);
      Swal.fire({
        icon: 'success',
        title: nuevo === 'Por Aprobar' ? '¡Enviado a revisión!' : '¡Trabajo finalizado!',
        text: nuevo === 'Por Aprobar'
          ? 'Un administrador lo revisará. Te avisaremos cuando quede aprobado.'
          : 'El trabajo quedó finalizado.',
        timer: 2200,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error al enviar a aprobación:', error);
      Swal.fire('Error', error.response?.data?.error || 'No se pudo actualizar el trabajo. Inténtalo de nuevo.', 'error');
    } finally {
      setEnviandoAprobacion(false);
    }
  };

  const progreso = totalRequeridas ? Math.round((countRequiredDone / totalRequeridas) * 100) : 0;
  const folioTrabajo = servicio?.property?.property_code
    || (trabajoId ? (String(trabajoId).startsWith('work_order-') ? `#${String(trabajoId).replace('work_order-', '')}` : trabajoId) : 'N/A');

  return (
    <>
      <TecnicoHeader activeTab="tablero" />
      <div className="ge-page">
        <div className="ge-container">

          {/* Datos del trabajo */}
          <section className="ge-card ge-info">
            {[
              { Icono: Hash, etiqueta: 'Folio', valor: folioTrabajo },
              { Icono: UserRound, etiqueta: 'Cliente', valor: servicio?.client_name || servicio?.cliente || servicio?.propietario || 'Cliente' },
              { Icono: Building2, etiqueta: 'Propiedad', valor: `${servicio?.property?.type || servicio?.tipoPropiedad || 'Propiedad'} · ${servicio?.full_address || servicio?.calle || servicio?.property_name || servicio?.identificador_curp || 'Mérida'}` },
              { Icono: Wrench, etiqueta: 'Trabajo', valor: servicio?.titulo || servicio?.descripcion || servicio?.type || 'Mantenimiento general' },
            ].map(({ Icono, etiqueta, valor }) => (
              <div key={etiqueta} className="ge-dato" title={valor}>
                <span className="ge-dato-icono"><Icono size={17} /></span>
                <span className="ge-dato-texto"><small>{etiqueta}</small><strong>{valor}</strong></span>
              </div>
            ))}
          </section>

          {/* Regreso, progreso y acciones */}
          <div className="ge-barra">
            <button type="button" className="ge-btn ge-btn-vidrio" onClick={() => navigate(returnPath, { state: { servicio, trabajoId } })}>
              <ChevronLeft size={18} />
              {esAdmin && !location.state?.from ? 'Regresar a servicios' : 'Regresar al trabajo'}
            </button>

            <div className={`ge-progreso ${countRequiredDone === totalRequeridas ? 'completo' : ''}`}>
              <span>Evidencias obligatorias <strong>{countRequiredDone} de {totalRequeridas}</strong></span>
              <span className="ge-progreso-barra"><span style={{ width: `${progreso}%` }} /></span>
            </div>

            <div className="ge-barra-fin">
              {soloLectura ? (
                <span className="ge-aviso"><Lock size={16} />
                  {trabajoValidado(estadoOrden)
                    ? 'Trabajo validado: el reporte es de solo lectura'
                    : 'Enviado a aprobación: solo el administrador puede modificar las evidencias'}
                </span>
              ) : estadoOrden === 'Por Aprobar' && (
                <span className="ge-aviso"><Clock size={16} /> Pendiente de aprobación del administrador</span>
              )}
              {puedeEnviar && (
                <button type="button" className="ge-btn ge-btn-exito" onClick={enviarAprobacion} disabled={enviandoAprobacion}>
                  {enviandoAprobacion ? <Loader2 className="ge-girar" size={17} /> : <Send size={17} />}
                  {esAdmin ? 'Finalizar trabajo' : 'Enviar a aprobación'}
                </button>
              )}
              {(user?.role_id === 0 || user?.role_id === 1) && (
                <button
                  type="button"
                  className="ge-btn ge-btn-oscuro"
                  onClick={() => navigate(`/reporte-trabajo-admin/${trabajoId}`, {
                    state: { trabajoId, servicio, imagenes: reportes.filter(r => r.stage !== 'ticket').map(r => r.image_url) }
                  })}
                >
                  <FileText size={17} /> Reporte oficial
                </button>
              )}
            </div>
          </div>

          {/* Etapas: una fila en computadora, carrusel en tablet y celular */}
          <div>
            {porElemento && !loading && (
              <div className="ev-elementos" role="tablist" aria-label="Elementos del trabajo">
                {elementos.map((el) => {
                  const avance = avanceDelElemento(reportes, el.id);
                  return (
                    <button
                      key={el.id}
                      type="button"
                      role="tab"
                      aria-selected={el.id === elementoActivo}
                      className={`ev-elemento ${el.id === elementoActivo ? 'on' : ''} ${avance === 2 ? 'completo' : ''}`}
                      onClick={() => { setElementoActivo(el.id); setMenuEtapa(null); }}
                      title={el.label}
                    >
                      <span>{el.label}</span> <em>{avance}/2</em>
                    </button>
                  );
                })}
              </div>
            )}

            {loading || cargandoElementos ? (
              <div className="ge-cargando">
                <Loader2 className="ge-girar" size={40} />
                Cargando evidencias del trabajo...
              </div>
            ) : (
              <CarruselEtapas className="gr-etapas">
                {etapas.map((stage) => {
                  const report = getReportForSlot(stage);
                  const localState = slotData[claveSlot(stage)] || SLOT_VACIO;
                  const isSaving = submittingKey === stage.key;
                  const isDone = !!report && !localState.isEditing;

                  const displayImage = localState.preview || report?.image_url || null;
                  const displayEsVideo = localState.preview ? !!localState.previewEsVideo : esVideoUrl(report?.image_url);
                  const cleanReportDesc = limpiarEtiqueta(report?.description);
                  // El ticket se muestra como requerido aunque no bloquee el envío
                  const requerido = stage.required || stage.marcaRequerido;
                  const [, numero = '', nombre = stage.title] = String(stage.title).match(/^(\d+)\.\s*(.*)$/) || [];
                  const estado = isDone ? 'completado' : requerido ? 'requerido' : 'opcional';
                  const sinEvidencia = soloLectura && !report;

                  return (
                    <div key={stage.key} className={`ge-etapa ${isDone ? 'completa' : ''}`} style={{ '--etapa': TONO_ETAPA[stage.key] || '#7b8798' }}>
                      <div className="ge-etapa-head">
                        <span className="ge-etapa-nombre">
                          <span className="ge-etapa-num">{numero || <Camera size={13} />}</span>
                          {nombre}
                        </span>
                        <span className={`ge-estado ${estado}`}>
                          {estado === 'completado' ? <CheckCircle2 size={12} /> : estado === 'requerido' ? <AlertCircle size={12} /> : <Circle size={12} />}
                          {estado === 'completado' ? 'Listo' : estado === 'requerido' ? 'Requerido' : 'Opcional'}
                        </span>
                      </div>

                      {/* Foto o video de la etapa */}
                      <div
                        className={`ge-foto ${displayImage ? '' : 'vacia'} ${sinEvidencia ? 'bloqueada' : ''}`}
                        onClick={() => {
                          if (isDone && report?.image_url) {
                            if (!displayEsVideo) setImagenExpandida(report.image_url);
                          } else if (!isSaving && !soloLectura) {
                            setMenuEtapa(menuEtapa === stage.key ? null : stage.key);
                          }
                        }}
                      >
                        {displayImage ? (
                          <>
                            {displayEsVideo ? (
                              <video
                                src={displayImage}
                                controls
                                playsInline
                                preload="metadata"
                                onClick={(e) => { if (isDone) e.stopPropagation(); }}
                              />
                            ) : (
                              <img src={displayImage} alt={stage.title} />
                            )}
                            {isDone && !displayEsVideo && (
                              <span className="ge-foto-ampliar"><Maximize2 size={12} /> Ampliar</span>
                            )}
                          </>
                        ) : sinEvidencia ? (
                          <>
                            <span className="ge-foto-icono gris"><ImageOff size={22} /></span>
                            <strong>Sin evidencia</strong>
                            <small>No se registró en esta etapa</small>
                          </>
                        ) : (
                          <>
                            <span className="ge-foto-icono">{stage.esTicket ? <Receipt size={22} /> : <Camera size={22} />}</span>
                            <strong>{stage.esTicket ? 'Subir el ticket' : stage.permiteVideo ? 'Subir foto o video' : 'Subir foto'}</strong>
                            <small>
                              {stage.esTicket
                                ? 'Comprobante firmado o sellado por la empresa'
                                : stage.permiteVideo ? `Cámara o galería · video de máx. ${VIDEO_MAX_SEGUNDOS} s` : 'Cámara o galería'}
                            </small>
                          </>
                        )}

                        {/* Elegir de dónde sale la evidencia */}
                        {menuEtapa === stage.key && !isDone && (
                          <div className="ge-origen" onClick={(e) => { e.stopPropagation(); setMenuEtapa(null); }}>
                            {[
                              { modo: 'foto', Icono: Camera, texto: 'Tomar foto' },
                              ...(stage.permiteVideo ? [{ modo: 'video', Icono: Video, texto: `Grabar video (máx. ${VIDEO_MAX_SEGUNDOS} s)` }] : []),
                              { modo: 'galeria', Icono: Images, texto: 'Elegir de la galería', sec: true }
                            ].map(({ modo, Icono, texto, sec }) => (
                              <button
                                key={modo}
                                type="button"
                                className={sec ? 'sec' : ''}
                                onClick={(e) => { e.stopPropagation(); abrirArchivo(stage, modo); }}
                              >
                                <Icono size={17} /> {texto}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Descripción registrada o formulario */}
                      {isDone || sinEvidencia ? (
                        <div className="ge-registrada">
                          <small>Descripción</small>
                          <p>{sinEvidencia ? 'Sin descripción.' : (cleanReportDesc || 'Sin descripción.')}</p>
                        </div>
                      ) : (
                        <div className="ge-campo">
                          <label htmlFor={`desc-${claveSlot(stage)}`}>
                            {stage.esTicket ? 'Folio o comentario (opcional)' : <>Descripción <em>*</em></>}
                          </label>
                          <textarea
                            id={`desc-${claveSlot(stage)}`}
                            className="ge-textarea"
                            rows={4}
                            value={localState.description}
                            onChange={(e) => handleDescriptionChange(claveSlot(stage), e.target.value)}
                            placeholder={stage.placeholder}
                          />
                        </div>
                      )}

                      {/* Acciones de la tarjeta (ninguna si el reporte ya es de solo lectura) */}
                      {!soloLectura && (
                      <div className="ge-acciones">
                        {isDone ? (
                          <>
                            <button type="button" className="ge-btn ge-btn-suave ge-crece" onClick={() => handleStartEditing(stage, report)}>
                              <Edit3 size={15} /> Editar
                            </button>
                            <button type="button" className="ge-btn ge-btn-peligro" onClick={() => handleDeleteSlot(report.id, stage.title)} aria-label={`Eliminar evidencia de ${nombre}`}>
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            {localState.isEditing && (
                              <button type="button" className="ge-btn ge-btn-suave" onClick={() => setSlotData(prev => ({ ...prev, [claveSlot(stage)]: SLOT_VACIO }))}>
                                Cancelar
                              </button>
                            )}
                            <button type="button" className="ge-btn ge-btn-primario ge-crece" onClick={() => handleSaveSlot(stage)} disabled={isSaving}>
                              {isSaving
                                ? <><Loader2 className="ge-girar" size={16} /> Guardando...</>
                                : <><Upload size={16} /> Guardar {stage.esTicket ? 'ticket' : nombre.toLowerCase()}</>}
                            </button>
                          </>
                        )}
                      </div>
                      )}
                    </div>
                  );
                })}
              </CarruselEtapas>
            )}
          </div>
        </div>

        {grabadorEtapa && (
          <GrabadorVideo
            maxSegundos={VIDEO_MAX_SEGUNDOS}
            onCerrar={() => setGrabadorEtapa(null)}
            onListo={(file) => { handleFileChange(grabadorEtapa, file, true); setGrabadorEtapa(null); }}
          />
        )}

        <input
          type="file"
          ref={entradaRef}
          onChange={(e) => { if (etapaArchivo.current) handleFileChange(etapaArchivo.current, e.target.files[0]); e.target.value = ''; }}
          style={{ display: 'none' }}
        />

        {/* Foto ampliada: mismo visor que el expediente */}
        {imagenExpandida && (
          <VisorFotos fotos={[imagenExpandida]} onClose={() => setImagenExpandida(null)} />
        )}
      </div>
    </>
  );
};

export default GaleriaReportes;
