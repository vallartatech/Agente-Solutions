import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import "../../../styles/AgenteSolutions/Tecnico/GaleriaReportes.css";
import { ChevronLeft, FileText, Camera, CheckCircle2, Trash2, Edit3, Loader2, X, Upload, Video, Images } from 'lucide-react';
import Swal from 'sweetalert2';

import TecnicoHeader from '../../../components/Shared/TecnicoHeader';
import Header from '../../../components/Shared/Header';
import { useAuth } from "../../../context/AuthContext";
import { esVideoUrl, validarVideoEvidencia, VIDEO_MAX_SEGUNDOS } from '../../../utils/evidencia';
import GrabadorVideo, { puedeGrabarEnApp } from '../../../components/Shared/GrabadorVideo';
import { ETAPAS_EVIDENCIA, evidenciaDeEtapa, limpiarEtiqueta } from '../Shared/etapasEvidencia';
import CarruselEtapas from '../Shared/CarruselEtapas';

// Etapas compartidas con el panel de reportes del admin (incluye el ticket de conformidad)
const STAGES = ETAPAS_EVIDENCIA.map(e => ({ ...e, placeholder: e.placeholderTecnico }));

const GaleriaReportes = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const trabajoId = id || location.state?.trabajoId;
  const servicio = location.state?.servicio;
  const esAdmin = [0, 1].includes(Number(user?.role_id));
  const returnPath = location.state?.from || (esAdmin ? '/tablero-servicios' : (trabajoId && String(trabajoId).startsWith('work_order-') ? '/mercado-trabajos' : `/trabajo-propiedad/${trabajoId}`));

  const [reportes, setReportes] = useState([]);
  // Estado de la orden: viene del trabajo (técnico) o de la tarjeta del tablero (admin)
  const [estadoOrden, setEstadoOrden] = useState(servicio?.estado || servicio?.status || '');
  const [enviandoAprobacion, setEnviandoAprobacion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingKey, setSubmittingKey] = useState(null);
  const [imagenExpandida, setImagenExpandida] = useState(null);

  // Estado local para los formularios de cada etapa (4 evidencias + ticket)
  const [slotData, setSlotData] = useState(() => Object.fromEntries(
    STAGES.map(s => [s.key, { file: null, preview: null, description: '', isEditing: false }])
  ));

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

  // Evidencia de cada etapa: por la columna `stage` o, en las viejas, por su etiqueta / orden
  const getReportForSlot = (stage) => evidenciaDeEtapa(reportes, stage);

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
    setSlotData(prev => ({
      ...prev,
      [stage.key]: {
        ...prev[stage.key],
        file,
        preview: previewUrl,
        previewEsVideo: esVideo
      }
    }));
  };

  const handleDescriptionChange = (stageKey, text) => {
    setSlotData(prev => ({
      ...prev,
      [stageKey]: {
        ...prev[stageKey],
        description: text
      }
    }));
  };

  const handleSaveSlot = async (stage) => {
    const dataForSlot = slotData[stage.key];
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
      setSlotData(prev => ({
        ...prev,
        [stage.key]: { file: null, preview: null, description: '', isEditing: false }
      }));

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
      [stage.key]: {
        file: null,
        preview: null,
        description: cleanDesc,
        isEditing: true
      }
    }));
  };

  // Contar cuántas evidencias obligatorias están listas
  const countRequiredDone = STAGES.filter(s => s.required && getReportForSlot(s)).length;

  // Con las 3 evidencias obligatorias se puede cerrar desde aquí, sin regresar al trabajo.
  // El técnico lo manda a aprobación (el backend lo deja "Por Aprobar"); el admin lo finaliza.
  const ordenCerrada = ['Listo', 'Finalizado', 'Por Aprobar', 'done', 'review', 'rejected', 'Rechazado', 'Cancelado'].includes(estadoOrden);
  const esOrdenDeTrabajo = !String(trabajoId || '').toLowerCase().includes('servicio');
  const puedeEnviar = countRequiredDone === 3 && !ordenCerrada && esOrdenDeTrabajo;

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

  return (
    <>
      {esAdmin ? <Header activeModule="servicios" titulo="SERVICIOS" /> : <TecnicoHeader activeTab="tablero" />}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 20px', minHeight: '90vh', background: '#f8fafc' }}>
        
        {/* ENCABEZADO E INFORMACIÓN DEL TRABAJO */}
        <div style={{ 
          width: '100%', 
          maxWidth: '1500px', 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '10px', 
          marginTop: '15px'
        }}>
          <div className="id-property-tag" style={{ flex: 1, minWidth: '180px', padding: '8px 15px' }}>
            <span>ID TRABAJO:</span>
            <strong>{servicio?.property?.property_code || (trabajoId ? (String(trabajoId).startsWith('work_order-') ? `FOLIO #${String(trabajoId).replace('work_order-', '')}` : trabajoId) : 'N/A')}</strong>
          </div>
          <div className="id-property-tag" style={{ flex: 1, minWidth: '180px', padding: '8px 15px' }}>
            <span>CLIENTE:</span>
            <strong>{servicio?.client_name || servicio?.cliente || servicio?.propietario || 'Cliente'}</strong>
          </div>
          
          <div className="id-property-tag" style={{ flex: 1, minWidth: '180px', padding: '8px 15px' }}>
            <span>PROPIEDAD:</span>
            <strong>{servicio?.property?.type || servicio?.tipoPropiedad || 'Propiedad'} - {servicio?.full_address || servicio?.calle || servicio?.property_name || servicio?.identificador_curp || 'Mérida'}</strong>
          </div>

          <div className="id-property-tag" style={{ flex: 1, minWidth: '180px', background: '#f1f5f9', padding: '8px 15px' }}>
            <span>TRABAJO:</span>
            <strong style={{ fontSize: '12px', textAlign: 'center' }}>{servicio?.titulo || servicio?.descripcion || servicio?.type || 'Mantenimiento General'}</strong>
          </div>
        </div>

        {/* BARRA DE ACCIÓN Y REGRESO */}
        <div style={{ 
          width: '100%', 
          maxWidth: '1500px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '15px', 
          marginBottom: '15px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <button 
            onClick={() => navigate(returnPath, { state: { servicio, trabajoId } })}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F26522', color: 'white', padding: '10px 22px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(242, 101, 34, 0.25)' }}
          >
            <ChevronLeft size={20} />
            <span>{esAdmin && !location.state?.from ? 'REGRESAR A SERVICIOS' : 'REGRESAR AL TRABAJO'}</span>
          </button>

          <div style={{ 
            background: countRequiredDone === 3 ? '#dcfce7' : '#fff7ed', 
            border: `1.5px solid ${countRequiredDone === 3 ? '#16a34a' : '#ea580c'}`,
            color: countRequiredDone === 3 ? '#15803d' : '#c2410c',
            padding: '8px 18px',
            borderRadius: '20px',
            fontWeight: '800',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={18} />
            <span>Progreso Evidencias Obligatorias: {countRequiredDone} de 3 completadas</span>
          </div>

          {puedeEnviar && (
            <button
              onClick={enviarAprobacion}
              disabled={enviandoAprobacion}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#16a34a', color: 'white', padding: '10px 20px', borderRadius: '25px', border: 'none', cursor: enviandoAprobacion ? 'wait' : 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(22, 163, 74, 0.3)' }}
            >
              {enviandoAprobacion ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              <span>{esAdmin ? 'FINALIZAR TRABAJO' : 'ENVIAR A APROBACIÓN'}</span>
            </button>
          )}

          {estadoOrden === 'Por Aprobar' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#e0f2fe', border: '1.5px solid #0ea5e9', color: '#0369a1', padding: '8px 18px', borderRadius: '20px', fontWeight: '800', fontSize: '0.85rem' }}>
              <CheckCircle2 size={18} />
              <span>Pendiente de aprobación del administrador</span>
            </div>
          )}

          {(user?.role_id === 0 || user?.role_id === 1) && (
            <button 
              onClick={() => navigate(`/reporte-trabajo-admin/${trabajoId}`, { 
                state: { trabajoId, servicio, imagenes: reportes.filter(r => r.stage !== 'ticket').map(r => r.image_url) } 
              })}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
            >
              <FileText size={18} />
              <span>REPORTE OFICIAL</span>
            </button>
          )}
        </div>

        {/* GRID DE LAS 4 EVIDENCIAS + TICKET DE CONFORMIDAD */}
        <div style={{ width: '100%', maxWidth: '1500px', marginBottom: '40px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <Loader2 className="animate-spin" size={42} color="#F26522" style={{ margin: 'auto' }} />
              <p style={{ marginTop: '12px', fontWeight: 'bold', color: '#475569' }}>Cargando evidencias del trabajo...</p>
            </div>
          ) : (
            // Una fila con las 5 en computadora; carrusel en tablet y celular
            <CarruselEtapas className="gr-etapas">
              {STAGES.map((stage) => {
                const report = getReportForSlot(stage);
                const localState = slotData[stage.key];
                const isSaving = submittingKey === stage.key;
                const isDone = !!report && !localState.isEditing;

                const displayImage = localState.preview || report?.image_url || null;
                const displayEsVideo = localState.preview ? !!localState.previewEsVideo : esVideoUrl(report?.image_url);
                const cleanReportDesc = limpiarEtiqueta(report?.description);
                // El ticket se muestra como requerido aunque no bloquee el envío
                const requerido = stage.required || stage.marcaRequerido;

                return (
                  <div 
                    key={stage.key}
                    style={{
                      background: '#ffffff',
                      borderRadius: '22px',
                      border: isDone ? '2px solid #10b981' : '2px dashed #cbd5e1',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.04)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                  >
                    {/* ENCABEZADO DE LA TARJETA / RECUADRO */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ 
                          background: stage.badgeColor, 
                          color: 'white', 
                          padding: '5px 12px', 
                          borderRadius: '12px', 
                          fontSize: '0.78rem', 
                          fontWeight: '800',
                          letterSpacing: '0.5px'
                        }}>
                          {stage.title}
                        </span>

                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '4px 10px',
                          borderRadius: '10px',
                          background: isDone ? '#dcfce7' : (requerido ? '#fee2e2' : '#f1f5f9'),
                          color: isDone ? '#15803d' : (requerido ? '#b91c1c' : '#475569')
                        }}>
                          {isDone ? '✅ COMPLETADO' : (requerido ? '⚠️ REQUERIDO' : '🔵 OPCIONAL')}
                        </span>
                      </div>

                      {/* ZONA DE CARGA O MUESTRA DE FOTO */}
                      <div 
                        onClick={() => {
                          if (isDone && report?.image_url) {
                            if (!displayEsVideo) setImagenExpandida(report.image_url);
                          } else if (!isSaving) {
                            setMenuEtapa(menuEtapa === stage.key ? null : stage.key);
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '170px',
                          borderRadius: '16px',
                          background: displayImage ? '#0f172a' : '#f8fafc',
                          border: displayImage ? 'none' : '2px dashed #94a3b8',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          position: 'relative',
                          marginBottom: '16px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {displayImage ? (
                          <>
                            {displayEsVideo ? (
                              // Se reproduce en el mismo cuadro, con sus controles
                              <video
                                src={displayImage}
                                controls
                                playsInline
                                preload="metadata"
                                onClick={(e) => { if (isDone) e.stopPropagation(); }}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                              />
                            ) : (
                              <img
                                src={displayImage}
                                alt={stage.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            )}
                            {isDone && !displayEsVideo && (
                              <div style={{
                                position: 'absolute',
                                bottom: '10px',
                                right: '10px',
                                background: 'rgba(0,0,0,0.6)',
                                color: 'white',
                                padding: '4px 10px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                backdropFilter: 'blur(4px)'
                              }}>
                                Tap para ampliar
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '15px', color: '#64748b' }}>
                            <Camera size={44} strokeWidth={1.5} color="#F26522" style={{ marginBottom: '8px' }} />
                            <p style={{ margin: 0, fontWeight: '800', fontSize: '0.85rem', color: '#1e293b' }}>
                              {stage.esTicket ? 'TAP PARA SUBIR EL TICKET' : stage.permiteVideo ? 'TAP PARA SUBIR FOTO O VIDEO' : 'TAP PARA SUBIR FOTO'}
                            </p>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {stage.esTicket
                                ? 'Foto del comprobante firmado o sellado por la empresa'
                                : stage.permiteVideo ? `Cámara o Galería · video de máx. ${VIDEO_MAX_SEGUNDOS} s` : 'Cámara o Galería'}
                            </span>
                          </div>
                        )}

                        {/* Elegir de dónde sale la evidencia */}
                        {menuEtapa === stage.key && !isDone && (
                          <div
                            onClick={(e) => { e.stopPropagation(); setMenuEtapa(null); }}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: '8px', padding: '16px' }}
                          >
                            {[
                              { modo: 'foto', icono: <Camera size={18} />, texto: 'Tomar foto' },
                              ...(stage.permiteVideo ? [{ modo: 'video', icono: <Video size={18} />, texto: `Grabar video (máx. ${VIDEO_MAX_SEGUNDOS} s)` }] : []),
                              { modo: 'galeria', icono: <Images size={18} />, texto: 'Elegir de la galería' }
                            ].map(op => (
                              <button
                                key={op.modo}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); abrirArchivo(stage, op.modo); }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', borderRadius: '12px', border: 'none', background: op.modo === 'galeria' ? 'rgba(255,255,255,0.14)' : '#F26522', color: 'white', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
                              >
                                {op.icono} {op.texto}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* VISTA COMPLETADA VS VISTA FORMULARIO */}
                      {isDone ? (
                        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            DESCRIPCIÓN REGISTRADA:
                          </label>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#0f172a', fontWeight: '600', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                            {cleanReportDesc || 'Sin descripción.'}
                          </p>
                        </div>
                      ) : (
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                            {stage.esTicket
                              ? 'FOLIO O COMENTARIO (OPCIONAL)'
                              : <>DESCRIPCIÓN OBLIGATORIA <span style={{ color: '#dc2626' }}>*</span></>}
                          </label>
                          <textarea
                            rows={3}
                            value={localState.description}
                            onChange={(e) => handleDescriptionChange(stage.key, e.target.value)}
                            placeholder={stage.placeholder}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '12px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '0.85rem',
                              outline: 'none',
                              resize: 'none',
                              background: '#ffffff',
                              color: '#0f172a',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* BOTONES DE ACCIÓN PARA CADA TARJETA */}
                    <div>
                      {isDone ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleStartEditing(stage, report)}
                            style={{
                              flex: 1,
                              background: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              padding: '10px',
                              borderRadius: '12px',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Edit3 size={15} /> Editar
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(report.id, stage.title)}
                            style={{
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {localState.isEditing && (
                            <button
                              onClick={() => {
                                setSlotData(prev => ({
                                  ...prev,
                                  [stage.key]: { file: null, preview: null, description: '', isEditing: false }
                                }));
                              }}
                              style={{
                                background: '#e2e8f0',
                                color: '#475569',
                                border: 'none',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            onClick={() => handleSaveSlot(stage)}
                            disabled={isSaving}
                            style={{
                              flex: 1,
                              background: isSaving ? '#cbd5e1' : '#F26522',
                              color: 'white',
                              border: 'none',
                              padding: '12px',
                              borderRadius: '12px',
                              fontWeight: '800',
                              fontSize: '0.85rem',
                              cursor: isSaving ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: isSaving ? 'none' : '0 4px 12px rgba(242, 101, 34, 0.35)',
                              textTransform: 'uppercase'
                            }}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Guardando...</span>
                              </>
                            ) : (
                              <>
                                <Upload size={18} />
                                <span>Guardar {stage.esTicket ? 'ticket' : stage.key}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </CarruselEtapas>
          )}
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

        {/* MODAL ZOOM PARA AMPLIAR IMAGEN AL HACER CLIC */}
        {imagenExpandida && (
          <div 
            onClick={() => setImagenExpandida(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            {esVideoUrl(imagenExpandida) ? (
              <video
                src={imagenExpandida}
                controls
                autoPlay
                playsInline
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
              />
            ) : (
              <img
                src={imagenExpandida}
                alt="Ampliada"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
              />
            )}
            <button 
              onClick={() => setImagenExpandida(null)}
              style={{ position: 'absolute', top: '20px', right: '25px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={36} />
            </button>
          </div>
        )}

      </div>
    </>
  );
};

export default GaleriaReportes;
