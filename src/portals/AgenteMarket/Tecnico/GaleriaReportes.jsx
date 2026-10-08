import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import "../../../styles/AgenteSolutions/Tecnico/GaleriaReportes.css";
import { ChevronLeft, FileText, Camera, CheckCircle2, Trash2, Edit3, Loader2, X, Upload, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import Swal from 'sweetalert2';

import Header from '../../../components/Shared/Header';
import { useAuth } from "../../../context/AuthContext";

const STAGES = [
  {
    key: 'ANTES',
    title: '1. ANTES DE INICIAR',
    tag: '[ANTES]',
    required: true,
    badgeColor: '#e11d48',
    placeholder: 'Describe el estado inicial de la propiedad o equipo antes de trabajar...'
  },
  {
    key: 'DURANTE',
    title: '2. DURANTE EL PROCESO',
    tag: '[DURANTE]',
    required: true,
    badgeColor: '#ea580c',
    placeholder: 'Describe el procedimiento o desarme que se realizó durante el servicio...'
  },
  {
    key: 'DESPUES',
    title: '3. DESPUÉS DE FINALIZAR',
    tag: '[DESPUÉS]',
    required: true,
    badgeColor: '#16a34a',
    placeholder: 'Describe el resultado final y las pruebas tras concluir el trabajo...'
  },
  {
    key: 'EXTRA',
    title: '4. ADICIONAL / EXTRA',
    tag: '[EXTRA]',
    required: false,
    badgeColor: '#64748b',
    placeholder: 'Agrega cualquier detalle, prueba o foto adicional relevante (Opcional)...'
  }
];

const GaleriaReportes = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const trabajoId = id || location.state?.trabajoId;
  const servicio = location.state?.servicio;
  const returnPath = location.state?.from || (trabajoId && String(trabajoId).startsWith('work_order-') ? '/mercado-trabajos' : `/trabajo-propiedad/${trabajoId}`);

  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingKey, setSubmittingKey] = useState(null);
  const [imagenExpandida, setImagenExpandida] = useState(null);

  // Estado local para los formularios de las 4 tarjetas
  const [slotData, setSlotData] = useState({
    ANTES: { file: null, preview: null, description: '', isEditing: false },
    DURANTE: { file: null, preview: null, description: '', isEditing: false },
    DESPUES: { file: null, preview: null, description: '', isEditing: false },
    EXTRA: { file: null, preview: null, description: '', isEditing: false }
  });

  const fileInputRefs = {
    ANTES: useRef(null),
    DURANTE: useRef(null),
    DESPUES: useRef(null),
    EXTRA: useRef(null)
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

  // Asignar reportes cargados a sus respectivos slots (Slot por tag o por índice)
  const getReportForSlot = (stage) => {
    if (!reportes || reportes.length === 0) return null;

    // 1. Buscar por tag exacto en la descripción
    const foundByTag = reportes.find(r => {
      const desc = (r.description || '').toUpperCase();
      return desc.includes(stage.tag) || (stage.key === 'DESPUES' && desc.includes('[DESPUES]'));
    });

    if (foundByTag) return foundByTag;

    // 2. Si no tiene tag, fallback por posición de array
    const stageIndex = STAGES.findIndex(s => s.key === stage.key);
    if (stageIndex !== -1 && reportes[stageIndex]) {
      return reportes[stageIndex];
    }

    return null;
  };

  const handleFileChange = (stageKey, file) => {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      Swal.fire('Imagen muy pesada', 'Por favor selecciona una foto menor a 12MB.', 'warning');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setSlotData(prev => ({
      ...prev,
      [stageKey]: {
        ...prev[stageKey],
        file,
        preview: previewUrl
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

    const descToSave = (dataForSlot.description || (existingReport ? existingReport.description : '')).trim();

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
        title: 'Foto Obligatoria',
        text: `Debes tomar o seleccionar una fotografía para la evidencia: ${stage.title}.`,
        confirmButtonColor: '#F26522'
      });
      return;
    }

    setSubmittingKey(stage.key);

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const formData = new FormData();
      const cleanDesc = descToSave.replace(/\[(ANTES|DURANTE|DESPUÉS|DESPUES|EXTRA)\]/gi, '').trim();
      const finalDesc = `${stage.tag} ${cleanDesc}`;
      
      formData.append('description', finalDesc);

      if (dataForSlot.file) {
        formData.append('image', dataForSlot.file);
      }

      if (existingReport && existingReport.id) {
        // Actualizar reporte existente
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/servicios/reportes/${existingReport.id}?_method=PUT`, formData, { headers });
      } else {
        // Crear nuevo reporte
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/servicios/${trabajoId}/reportes`, formData, { headers });
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
        text: 'Ocurrió un inconveniente al subir la evidencia. Inténtalo nuevamente.',
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
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/reportes/${reportId}`, { headers });
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
    const cleanDesc = (existingReport.description || '').replace(/\[(ANTES|DURANTE|DESPUÉS|DESPUES|EXTRA)\]/gi, '').trim();
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

  return (
    <>
      <Header />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 20px', minHeight: '90vh', background: '#f8fafc' }}>
        
        {/* ENCABEZADO E INFORMACIÓN DEL TRABAJO */}
        <div style={{ 
          width: '100%', 
          maxWidth: '1200px', 
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
          maxWidth: '1200px', 
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
            <span>REGRESAR AL TRABAJO</span>
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

          {(user?.role_id === 0 || user?.role_id === 1) && (
            <button 
              onClick={() => navigate(`/reporte-trabajo-admin/${trabajoId}`, { 
                state: { trabajoId, servicio, imagenes: reportes.map(r => r.image_url) } 
              })}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
            >
              <FileText size={18} />
              <span>REPORTE OFICIAL</span>
            </button>
          )}
        </div>

        {/* GRID DE LAS 4 EVIDENCIAS ESTRUCTURADAS */}
        <div style={{ width: '100%', maxWidth: '1200px', marginBottom: '40px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <Loader2 className="animate-spin" size={42} color="#F26522" style={{ margin: 'auto' }} />
              <p style={{ marginTop: '12px', fontWeight: 'bold', color: '#475569' }}>Cargando evidencias del trabajo...</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '24px',
              marginTop: '10px'
            }}>
              {STAGES.map((stage) => {
                const report = getReportForSlot(stage);
                const localState = slotData[stage.key];
                const isSaving = submittingKey === stage.key;
                const isDone = !!report && !localState.isEditing;

                const displayImage = localState.preview || report?.image_url || null;
                const cleanReportDesc = (report?.description || '').replace(/\[(ANTES|DURANTE|DESPUÉS|DESPUES|EXTRA)\]/gi, '').trim();

                return (
                  <div 
                    key={stage.key}
                    style={{
                      background: '#ffffff',
                      borderRadius: '22px',
                      border: isDone ? '2px solid #10b981' : '2px dashed #cbd5e1',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.04)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
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
                          background: isDone ? '#dcfce7' : (stage.required ? '#fee2e2' : '#f1f5f9'),
                          color: isDone ? '#15803d' : (stage.required ? '#b91c1c' : '#475569')
                        }}>
                          {isDone ? '✅ COMPLETADO' : (stage.required ? '⚠️ REQUERIDO' : '🔵 OPCIONAL')}
                        </span>
                      </div>

                      {/* ZONA DE CARGA O MUESTRA DE FOTO */}
                      <div 
                        onClick={() => {
                          if (isDone && report?.image_url) {
                            setImagenExpandida(report.image_url);
                          } else if (!isSaving) {
                            fileInputRefs[stage.key].current.click();
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '200px',
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
                            <img 
                              src={displayImage} 
                              alt={stage.title} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            {isDone && (
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
                              TAP PARA SUBIR FOTO
                            </p>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Cámara o Galería</span>
                          </div>
                        )}

                        <input 
                          type="file"
                          ref={fileInputRefs[stage.key]}
                          onChange={(e) => handleFileChange(stage.key, e.target.files[0])}
                          accept="image/*"
                          style={{ display: 'none' }}
                        />
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
                            DESCRIPCIÓN OBLIGATORIA <span style={{ color: '#dc2626' }}>*</span>
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
                                <span>Guardar {stage.key}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

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
            <img 
              src={imagenExpandida} 
              alt="Ampliada" 
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
            />
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
