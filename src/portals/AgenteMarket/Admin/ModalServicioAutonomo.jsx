import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  X, FileText, Home, Wrench, MessageSquare, Camera, Trash2, PlusCircle, Globe
} from 'lucide-react';
import '../../../styles/AgenteMarket/Admin/ModalServicioAutonomo.css';

const ModalServicioAutonomo = ({ propertyId, onClose, onSuccess }) => {
  const [propiedades, setPropiedades] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId || '');
  const [loadingPropiedades, setLoadingPropiedades] = useState(false);

  const [nuevoServicio, setNuevoServicio] = useState({
    tipo: '',
    zona: '',
    area_id: '',
    equipo: '',
    descripcion: '',
    urgencia: 'urgente',
    fechaProgramada: '',
    horarioPreferido: '',
    fotos: []
  });
  const [carritoServicios, setCarritoServicios] = useState([]);
  const [zonasDisponibles, setZonasDisponibles] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState({});
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  // Cargar propiedades si no viene propertyId
  useEffect(() => {
    if (!propertyId) {
      cargarPropiedades();
    }
  }, [propertyId]);

  // Cargar zonas cuando se selecciona o cambia la propiedad
  useEffect(() => {
    if (selectedPropertyId) {
      cargarZonas(selectedPropertyId);
    } else {
      setZonasDisponibles([]);
      setEquiposDisponibles({});
    }
  }, [selectedPropertyId]);

  const cargarPropiedades = async () => {
    setLoadingPropiedades(true);
    try {
      const token = localStorage.getItem('agente_token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPropiedades(res.data || []);
    } catch (error) {
      console.error("Error al cargar propiedades:", error);
    } finally {
      setLoadingPropiedades(false);
    }
  };

  const cargarZonas = async (pId) => {
    setLoadingZonas(true);
    try {
      const token = localStorage.getItem('agente_token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/${pId}/areas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setZonasDisponibles(res.data || []);
    } catch (error) {
      console.error("Error al cargar zonas:", error);
    } finally {
      setLoadingZonas(false);
    }
  };

  const handleZonaChange = async (areaId) => {
    if (areaId === 'otro') {
      setNuevoServicio({ 
        ...nuevoServicio, 
        area_id: 'otro', 
        zona: 'Otro', 
        equipo: '' 
      });
      setEquiposDisponibles({});
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
    setIsPhotoMenuOpen(false);
  };

  const removeFoto = (index) => {
    const nuevasFotos = nuevoServicio.fotos.filter((_, i) => i !== index);
    setNuevoServicio({ ...nuevoServicio, fotos: nuevasFotos });
  };

  const selectPhotoSource = (source) => {
    if (source === 'camera' && cameraRef.current) {
      cameraRef.current.click();
    } else if (galleryRef.current) {
      galleryRef.current.click();
    }
    setIsPhotoMenuOpen(false);
  };

  const handleAnadirAlCarrito = (e) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      alert("Por favor selecciona una propiedad primero.");
      return;
    }
    if (!nuevoServicio.tipo || !nuevoServicio.area_id || !nuevoServicio.descripcion) {
      alert("Por favor completa los campos obligatorios (Tipo, Zona y Descripción).");
      return;
    }
    setCarritoServicios([...carritoServicios, { ...nuevoServicio }]);
    setNuevoServicio({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', urgencia: 'urgente', fechaProgramada: '', horarioPreferido: '', fotos: [] });
  };

  const handleSubmitBatch = async (publishToNetwork = false) => {
    if (!selectedPropertyId) {
      alert("Por favor selecciona una propiedad primero.");
      return;
    }

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
        formData.append('property_id', selectedPropertyId);
        formData.append('type', item.tipo);
        formData.append('zone', item.zona);
        formData.append('equipment', item.equipo || '');
        
        let scheduleNote = '';
        if (item.urgencia === 'programado' && item.fechaProgramada) {
          formData.append('priority', 'Programado');
          formData.append('scheduled_at', `${item.fechaProgramada} 12:00:00`);
          scheduleNote = `\n\n[FECHA / HORARIO DESEADO]: ${item.fechaProgramada} - ${item.horarioPreferido || 'Tarde'}`;
        } else {
          formData.append('priority', 'Urgente');
          scheduleNote = `\n\n[URGENCIA]: ⚡ Atención Urgente - Hoy Mismo`;
        }

        const hasValidEquipo = item.equipo && item.equipo.toLowerCase() !== 'otro' && item.equipo.toLowerCase() !== 'ninguno';
        const descBase = hasValidEquipo 
          ? `${item.descripcion}\n\n[EQUIPO AFECTADO]: ${item.equipo}${scheduleNote}`
          : `${item.descripcion}${scheduleNote}`;
        const descFinal = total > 1
          ? `[${loteId}] (${index + 1}/${total})\n${descBase}`
          : descBase;
        
        formData.append('description', descFinal);
        if (total > 1) {
            formData.append('batch_id', loteId);
        }
        if (publishToNetwork) {
            formData.append('publish_network', '1');
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

      const msg = publishToNetwork 
        ? "✅ Solicitudes publicadas en la red con éxito." 
        : "✅ Solicitudes enviadas con éxito. Un técnico las revisará pronto.";
      alert(msg);
      
      setCarritoServicios([]);
      setNuevoServicio({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', urgencia: 'urgente', fechaProgramada: '', horarioPreferido: '', fotos: [] });
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error("Error enviando lote:", error);
      alert("❌ Hubo un error al enviar algunas solicitudes. Por favor, intenta de nuevo.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <>
      <div className="modal-servicio-autonomo-overlay" onClick={onClose}>
        <div className="modal-servicio-autonomo-content" onClick={e => e.stopPropagation()}>
          <div className="modal-servicio-autonomo-header">
            <div className="msa-header-title-box">
              <div className="modal-tag">NUEVA SOLICITUD</div>
              <h2>Reportar Problema</h2>
            </div>
            <button className="msa-close-btn" onClick={onClose} aria-label="Cerrar modal" title="Cerrar">
              <X size={20} />
            </button>
          </div>
          
          <div className="modal-servicio-autonomo-body">
            
            {/* Si no se pasó un propertyId, mostrar dropdown para seleccionar propiedad */}
            {!propertyId && (
              <div className="msa-form-group">
                <label className="msa-form-label"><Home size={15}/> Seleccionar Propiedad *</label>
                <select 
                  required 
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  disabled={loadingPropiedades}
                  className="msa-form-control"
                >
                  <option value="">{loadingPropiedades ? "Cargando propiedades..." : "Selecciona tu propiedad..."}</option>
                  {propiedades.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre_propiedad || p.address}</option>
                  ))}
                </select>
              </div>
            )}

            {/* GALERÍA DE CARRITO */}
            {carritoServicios.length > 0 && (
              <div style={{ marginBottom: '16px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#334155', fontSize: '13px', fontWeight: '800' }}>Problemas a reportar ({carritoServicios.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {carritoServicios.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                      {item.fotos.length > 0 ? (
                        <img src={URL.createObjectURL(item.fotos[0])} alt="preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={20} color="#94a3b8"/></div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: '13px', color: '#ea580c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.tipo} - {item.zona}</strong>
                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.descripcion}</span>
                      </div>
                      <button type="button" onClick={() => setCarritoServicios(carritoServicios.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAnadirAlCarrito}>
              <div className="msa-form-group">
                <label className="msa-form-label"><FileText size={15}/> Tipo de Servicio *</label>
                <select 
                  required 
                  value={nuevoServicio.tipo}
                  onChange={(e) => setNuevoServicio({...nuevoServicio, tipo: e.target.value})}
                  className="msa-form-control"
                  disabled={!selectedPropertyId}
                >
                  <option value="">Selecciona el tipo...</option>
                  <option value="Mantenimiento">Mantenimiento Preventivo</option>
                  <option value="Problema">Problema / Reparación</option>
                </select>
              </div>

              <div className="msa-form-group">
                <label className="msa-form-label"><Home size={15}/> Zona de la propiedad *</label>
                <select 
                  required 
                  value={nuevoServicio.area_id}
                  onChange={(e) => handleZonaChange(e.target.value)}
                  disabled={loadingZonas || !selectedPropertyId}
                  className="msa-form-control"
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

              <div className="msa-form-group">
                <label className="msa-form-label"><Wrench size={15}/> Equipo afectado (Opcional)</label>
                <select 
                  value={nuevoServicio.equipo}
                  disabled={!nuevoServicio.area_id || loadingEquipos}
                  onChange={(e) => setNuevoServicio({...nuevoServicio, equipo: e.target.value})}
                  className="msa-form-control"
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

              <div className="msa-form-group">
                <label className="msa-form-label"><MessageSquare size={15}/> Descripción *</label>
                <textarea 
                  required 
                  rows="3" 
                  placeholder="Describe el problema detalladamente..." 
                  value={nuevoServicio.descripcion} 
                  onChange={(e) => setNuevoServicio({...nuevoServicio, descripcion: e.target.value})}
                  className="msa-form-control"
                  disabled={!selectedPropertyId}
                  style={{ resize: 'vertical', minHeight: '75px' }}
                />
              </div>

              {/* ⚡ DISPONIBILIDAD / HORARIO SOLICITADO */}
              <div className="msa-urgency-card">
                <div className="msa-urgency-title">
                  ⏰ ¿Cuándo necesitas el servicio?
                </div>
                <div className="msa-urgency-grid">
                  <button
                    type="button"
                    onClick={() => setNuevoServicio({...nuevoServicio, urgencia: 'urgente', fechaProgramada: '', horarioPreferido: ''})}
                    className={`msa-urgency-btn ${nuevoServicio.urgencia === 'urgente' || !nuevoServicio.urgencia ? 'active-urgent' : 'inactive-urgent'}`}
                  >
                    ⚡ Urgente (Hoy mismo)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNuevoServicio({...nuevoServicio, urgencia: 'programado', fechaProgramada: new Date(Date.now() + 86400000).toISOString().split('T')[0], horarioPreferido: 'Por la tarde (12pm - 5pm)'})}
                    className={`msa-urgency-btn ${nuevoServicio.urgencia === 'programado' ? 'active-scheduled' : 'inactive-scheduled'}`}
                  >
                    📅 Programar Fecha
                  </button>
                </div>

                {nuevoServicio.urgencia === 'programado' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #fed7aa' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '4px' }}>FECHA DESEADA:</span>
                      <input
                        type="date"
                        value={nuevoServicio.fechaProgramada || ''}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setNuevoServicio({...nuevoServicio, fechaProgramada: e.target.value})}
                        className="msa-form-control"
                        style={{ padding: '8px 10px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '4px' }}>HORARIO PREFERIDO:</span>
                      <select
                        value={nuevoServicio.horarioPreferido || 'Por la tarde (12pm - 5pm)'}
                        onChange={(e) => setNuevoServicio({...nuevoServicio, horarioPreferido: e.target.value})}
                        className="msa-form-control"
                        style={{ padding: '8px 10px', fontSize: '13px' }}
                      >
                        <option value="Por la mañana (8am - 12pm)">Por la mañana (8:00 AM - 12:00 PM)</option>
                        <option value="Por la tarde (12pm - 5pm)">Por la tarde (12:00 PM - 5:00 PM)</option>
                        <option value="Por la noche (5pm - 8pm)">Por la noche (5:00 PM - 8:00 PM)</option>
                        <option value="Cualquier hora">Cualquier horario disponible</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="msa-form-group">
                <label className="msa-form-label"><Camera size={15}/> Evidencia Visual (Máx 2 fotos)</label>
                
                <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={handleFileSelect} />
                <input type="file" ref={galleryRef} hidden accept="image/*" multiple onChange={handleFileSelect} />

                <div className="fotos-preview-container" style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {nuevoServicio.fotos.map((foto, idx) => (
                    <div key={idx} className="foto-preview-wrapper" style={{ position: 'relative', width: '64px', height: '64px' }}>
                      <img 
                        src={URL.createObjectURL(foto)} 
                        alt="preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '2px solid #ea580c' }} 
                      />
                      <button 
                        type="button"
                        onClick={() => removeFoto(idx)}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {nuevoServicio.fotos.length < 2 && (
                    <button 
                      type="button" 
                      onClick={() => setIsPhotoMenuOpen(true)}
                      disabled={!selectedPropertyId}
                      style={{ width: '64px', height: '64px', border: '2px dashed #cbd5e1', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: selectedPropertyId ? 'pointer' : 'not-allowed', background: '#f8fafc', color: '#64748b', transition: 'all 0.2s' }}
                    >
                      <PlusCircle size={20} color={selectedPropertyId ? "#ea580c" : "#94a3b8"} />
                      <span style={{ fontSize: '9px', fontWeight: '800', marginTop: '3px', color: '#475569' }}>FOTO</span>
                    </button>
                  )}
                </div>
              </div>

              <button type="submit" disabled={!selectedPropertyId} className="msa-btn-add-list">
                <PlusCircle size={16} /> AÑADIR PROBLEMA A LA LISTA
              </button>
            </form>

            <div className="msa-footer-actions">
              <button 
                type="button" 
                onClick={onClose} 
                className="msa-btn-cancel"
              >
                Cerrar
              </button>
              <button 
                type="button" 
                onClick={() => handleSubmitBatch(true)} 
                disabled={loadingSubmit || (!selectedPropertyId && carritoServicios.length === 0)} 
                className="msa-btn-submit-batch"
                style={{ marginTop: 0 }}
              >
                <Globe size={18} />
                {loadingSubmit ? "PUBLICANDO..." : `PUBLICAR EN LA RED (TÉCNICOS) ${carritoServicios.length > 0 ? `(${carritoServicios.length})` : ''}`}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE FOTO */}
      {isPhotoMenuOpen && (
        <div className="modal-servicio-autonomo-overlay" onClick={() => setIsPhotoMenuOpen(false)} style={{ zIndex: 1000000005 }}>
          <div className="modal-servicio-autonomo-content" style={{ maxWidth: '300px', padding: '0', background: '#ffffff', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, color: '#ea580c', fontSize: '1rem', fontWeight: '800' }}>Seleccionar Origen</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button 
                type="button"
                onClick={() => selectPhotoSource('camera')}
                style={{ background: 'transparent', border: 'none', padding: '14px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Camera size={18} color="#ea580c" /> Tomar Foto
              </button>
              <button 
                type="button"
                onClick={() => selectPhotoSource('gallery')}
                style={{ background: 'transparent', border: 'none', padding: '14px', color: '#1e293b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <FileText size={18} color="#ea580c" /> Galería
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalServicioAutonomo;

