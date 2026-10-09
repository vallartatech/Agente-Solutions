import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  X, FileText, Home, Wrench, MessageSquare, Camera, Trash2, PlusCircle, Globe, Users, Shield, AlertCircle, CheckCircle2, UserCheck, Clock, Calendar
} from 'lucide-react';
import '../../../styles/AgenteMarket/Admin/ModalServicioAutonomo.css';

const ModalServicioAutonomo = ({ propertyId, onClose, onSuccess }) => {
  const [propiedades, setPropiedades] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId || '');
  const [loadingPropiedades, setLoadingPropiedades] = useState(false);

  // Técnicos vinculados
  const [tecnicos, setTecnicos] = useState([]);
  const [loadingTecnicos, setLoadingTecnicos] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [destinoEnvio, setDestinoEnvio] = useState('red'); // 'red' | 'mis_tecnicos'

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

  // Cargar propiedades si no viene propertyId o si es necesario
  useEffect(() => {
    cargarPropiedades();
    cargarTecnicosVinculados();
  }, []);

  useEffect(() => {
    if (propertyId) {
      setSelectedPropertyId(propertyId);
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
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setPropiedades(raw);
      if (!selectedPropertyId && raw.length > 0) {
        setSelectedPropertyId(raw[0].id);
      }
    } catch (error) {
      console.error("Error al cargar propiedades:", error);
    } finally {
      setLoadingPropiedades(false);
    }
  };

  const cargarTecnicosVinculados = async () => {
    setLoadingTecnicos(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Intentar primero endpoint de técnicos vinculados
      let techs = [];
      try {
        const resTecnicos = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios/tecnicos`, { headers });
        if (Array.isArray(resTecnicos.data) && resTecnicos.data.length > 0) {
          techs = resTecnicos.data;
        }
      } catch {
        // Fallback a /usuarios
      }

      if (techs.length === 0) {
        const resUsuarios = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios`, { headers });
        const all = Array.isArray(resUsuarios.data) ? resUsuarios.data : [];
        techs = all.filter(u => [2, 6, 8].includes(Number(u.role_id)));
      }

      setTecnicos(techs);
      if (techs.length > 0) {
        setSelectedTechId(techs[0].id);
      }
    } catch (err) {
      console.error("Error al cargar técnicos vinculados:", err);
    } finally {
      setLoadingTecnicos(false);
    }
  };

  const cargarZonas = async (pId) => {
    setLoadingZonas(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/${pId}/areas`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/areas/${areaId}/components`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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

  const handleSubmitBatch = async (forcedMode = null) => {
    const mode = forcedMode || destinoEnvio;

    if (!selectedPropertyId) {
      alert("Por favor selecciona una propiedad primero.");
      return;
    }

    let lote = [...carritoServicios];
    if (nuevoServicio.tipo && nuevoServicio.area_id && nuevoServicio.descripcion) {
      lote.push({ ...nuevoServicio });
    }

    if (lote.length === 0) {
      alert("Por favor ingresa o añade al menos un problema a reportar.");
      return;
    }

    const isToNetwork = mode === 'red';
    const targetTechId = (!isToNetwork && selectedTechId) ? selectedTechId : null;

    if (!isToNetwork && tecnicos.length === 0) {
      alert("No cuentas con técnicos vinculados actualmente. Te recomendamos enviarlo a la Red de Técnicos.");
      return;
    }

    setLoadingSubmit(true);
    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
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

        if (isToNetwork) {
          formData.append('publish_network', '1');
        } else if (targetTechId) {
          formData.append('tecnico_id', targetTechId);
          formData.append('assigned_technician_id', targetTechId);
          formData.append('publish_network', '0');
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

      const techObj = tecnicos.find(t => String(t.id) === String(targetTechId));
      const techName = techObj ? `${techObj.first_name || techObj.name || ''} ${techObj.last_name || ''}`.trim() : 'tu técnico';

      const msg = isToNetwork 
        ? "✅ Solicitud publicada en la red con éxito. Los técnicos disponibles comenzarán a cotizar." 
        : `✅ Solicitud enviada y asignada a ${techName} con éxito.`;
      
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

  const totalItemsCount = carritoServicios.length + (nuevoServicio.tipo && nuevoServicio.area_id && nuevoServicio.descripcion ? 1 : 0);

  return (
    <>
      <div className="msa-overlay" onClick={onClose}>
        <div className="msa-content" onClick={e => e.stopPropagation()}>
          
          {/* HEADER */}
          <div className="msa-header">
            <div className="msa-header-left">
              <div className="msa-badge-tag">
                <Shield size={12} /> NUEVA SOLICITUD DE SERVICIO
              </div>
              <h2 className="msa-title">Reportar Problema</h2>
              <p className="msa-subtitle">Especifica los detalles del servicio y elige el destino de envío</p>
            </div>
            <button className="msa-close-btn" onClick={onClose} title="Cerrar modal">
              <X size={18} />
            </button>
          </div>
          
          {/* BODY WITH 2-COLUMN RESPONSIVE GRID */}
          <div className="msa-body">
            <div className="msa-grid-layout">
              
              {/* ══════════════════════════════════════════
                  COLUMNA IZQUIERDA: DETALLES DEL PROBLEMA
                  ══════════════════════════════════════════ */}
              <div className="msa-col-left">
                
                {/* SELECTOR DE PROPIEDAD */}
                <div className="msa-form-group">
                  <label className="msa-label">
                    <Home size={14} color="#ea580c" /> Seleccionar Propiedad *
                  </label>
                  <select 
                    required 
                    className="msa-select"
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    disabled={loadingPropiedades}
                  >
                    <option value="">{loadingPropiedades ? "Cargando propiedades..." : "Selecciona tu propiedad..."}</option>
                    {propiedades.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre_propiedad || p.nombre || p.address || `Propiedad #${p.id}`}</option>
                    ))}
                  </select>
                </div>

                <form onSubmit={handleAnadirAlCarrito}>
                  {/* TIPO DE SERVICIO */}
                  <div className="msa-form-group">
                    <label className="msa-label">
                      <FileText size={14} color="#ea580c" /> Tipo de Servicio *
                    </label>
                    <select 
                      required 
                      className="msa-select"
                      value={nuevoServicio.tipo}
                      onChange={(e) => setNuevoServicio({...nuevoServicio, tipo: e.target.value})}
                      disabled={!selectedPropertyId}
                    >
                      <option value="">Selecciona el tipo...</option>
                      <option value="Mantenimiento">Mantenimiento Preventivo</option>
                      <option value="Problema">Problema / Reparación Correctiva</option>
                      <option value="Instalacion">Instalación Nueva / Mejora</option>
                      <option value="Inspeccion">Inspección / Diagnóstico</option>
                    </select>
                  </div>

                  {/* ZONA DE LA PROPIEDAD */}
                  <div className="msa-form-group">
                    <label className="msa-label">
                      <Home size={14} color="#ea580c" /> Zona de la propiedad *
                    </label>
                    <select 
                      required 
                      className="msa-select"
                      value={nuevoServicio.area_id}
                      onChange={(e) => handleZonaChange(e.target.value)}
                      disabled={loadingZonas || !selectedPropertyId}
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
                      <option value="otro" style={{ fontWeight: 'bold' }}>Otro (No listado)</option>
                    </select>
                  </div>

                  {/* EQUIPO AFECTADO */}
                  <div className="msa-form-group">
                    <label className="msa-label">
                      <Wrench size={14} color="#ea580c" /> Equipo afectado (Opcional)
                    </label>
                    <select 
                      className="msa-select"
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
                      <option value="otro">Otro / Ninguno en específico</option>
                    </select>
                  </div>

                  {/* DESCRIPCIÓN */}
                  <div className="msa-form-group">
                    <label className="msa-label">
                      <MessageSquare size={14} color="#ea580c" /> Descripción del problema *
                    </label>
                    <textarea 
                      required 
                      rows="3" 
                      className="msa-textarea"
                      placeholder="Describe con detalle qué ocurre o qué necesitas..." 
                      value={nuevoServicio.descripcion} 
                      onChange={(e) => setNuevoServicio({...nuevoServicio, descripcion: e.target.value})}
                      disabled={!selectedPropertyId}
                    />
                  </div>

                  {/* BOTÓN PARA AÑADIR A LOTE */}
                  <button 
                    type="submit" 
                    disabled={!selectedPropertyId} 
                    className="msa-btn-add-batch"
                  >
                    <PlusCircle size={15} color="#ea580c" /> + AÑADIR OTRO PROBLEMA A ESTA SOLICITUD
                  </button>
                </form>

              </div>

              {/* ══════════════════════════════════════════
                  COLUMNA DERECHA: FOTOS, DISPONIBILIDAD Y DESTINO
                  ══════════════════════════════════════════ */}
              <div className="msa-col-right">

                {/* 📷 EVIDENCIA VISUAL (FOTOS) - ARRIBA DE CUÁNDO NECESITAS LA ATENCIÓN */}
                <div className="msa-card-box" style={{ marginBottom: '14px', background: '#ffffff' }}>
                  <label className="msa-label" style={{ marginBottom: '6px' }}>
                    <Camera size={14} color="#ea580c" /> Evidencia Visual (Máx 2 fotos)
                  </label>
                  
                  <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={handleFileSelect} />
                  <input type="file" ref={galleryRef} hidden accept="image/*" multiple onChange={handleFileSelect} />

                  <div className="msa-photo-preview-grid">
                    {nuevoServicio.fotos.map((foto, idx) => (
                      <div key={idx} className="msa-photo-item">
                        <img src={URL.createObjectURL(foto)} alt="preview" />
                        <button type="button" className="msa-photo-remove" onClick={() => removeFoto(idx)} title="Eliminar foto">
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {nuevoServicio.fotos.length < 2 && (
                      <button 
                        type="button" 
                        className="msa-photo-add-btn"
                        onClick={() => setIsPhotoMenuOpen(true)}
                        disabled={!selectedPropertyId}
                        style={{ height: '62px', width: '62px' }}
                      >
                        <PlusCircle size={18} color="#ea580c" />
                        <span style={{ fontSize: '9px', fontWeight: '800', marginTop: '2px' }}>FOTO</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* LISTA DE PROBLEMAS EN LOTE (CARRITO) */}
                {carritoServicios.length > 0 && (
                  <div className="msa-card-box" style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: '#0f172a', fontSize: '12.5px', fontWeight: '800' }}>
                        Problemas en lote ({carritoServicios.length})
                      </h4>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Se enviarán juntos</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                      {carritoServicios.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', background: '#ffffff', padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', alignItems: 'center' }}>
                          {item.fotos.length > 0 ? (
                            <img src={URL.createObjectURL(item.fotos[0])} alt="preview" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ea580c' }} />
                          ) : (
                            <div style={{ width: '36px', height: '36px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={16} color="#94a3b8"/></div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ display: 'block', fontSize: '12px', color: '#ea580c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.tipo} - {item.zona}
                            </strong>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.descripcion}
                            </span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setCarritoServicios(carritoServicios.filter((_, i) => i !== idx))} 
                            style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Eliminar de la lista"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ⏰ DISPONIBILIDAD / HORARIO */}
                <div className="msa-card-box highlight-orange" style={{ marginBottom: '14px' }}>
                  <label className="msa-label" style={{ color: '#ea580c', marginBottom: '8px' }}>
                    <Clock size={14} /> ¿Cuándo necesitas la atención?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setNuevoServicio({...nuevoServicio, urgencia: 'urgente', fechaProgramada: '', horarioPreferido: ''})}
                      style={{
                        padding: '9px 8px',
                        borderRadius: '10px',
                        border: nuevoServicio.urgencia === 'urgente' || !nuevoServicio.urgencia ? '2px solid #ea580c' : '1.5px solid #fed7aa',
                        background: nuevoServicio.urgencia === 'urgente' || !nuevoServicio.urgencia ? '#ea580c' : '#ffffff',
                        color: nuevoServicio.urgencia === 'urgente' || !nuevoServicio.urgencia ? '#ffffff' : '#334155',
                        fontWeight: '800',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      ⚡ Urgente (Hoy)
                    </button>

                    <button
                      type="button"
                      onClick={() => setNuevoServicio({
                        ...nuevoServicio, 
                        urgencia: 'programado', 
                        fechaProgramada: nuevoServicio.fechaProgramada || new Date(Date.now() + 86400000).toISOString().split('T')[0], 
                        horarioPreferido: nuevoServicio.horarioPreferido || 'Por la tarde (12pm - 5pm)'
                      })}
                      style={{
                        padding: '9px 8px',
                        borderRadius: '10px',
                        border: nuevoServicio.urgencia === 'programado' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                        background: nuevoServicio.urgencia === 'programado' ? '#2563eb' : '#ffffff',
                        color: nuevoServicio.urgencia === 'programado' ? '#ffffff' : '#334155',
                        fontWeight: '800',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Calendar size={13} /> Programar
                    </button>
                  </div>

                  {nuevoServicio.urgencia === 'programado' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #fed7aa' }}>
                      <div>
                        <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '3px' }}>Fecha deseada:</span>
                        <input
                          type="date"
                          value={nuevoServicio.fechaProgramada || ''}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setNuevoServicio({...nuevoServicio, fechaProgramada: e.target.value})}
                          className="msa-input"
                          style={{ padding: '7px 8px', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '3px' }}>Horario preferido:</span>
                        <select
                          value={nuevoServicio.horarioPreferido || 'Por la tarde (12pm - 5pm)'}
                          onChange={(e) => setNuevoServicio({...nuevoServicio, horarioPreferido: e.target.value})}
                          className="msa-select"
                          style={{ padding: '7px 8px', fontSize: '12px' }}
                        >
                          <option value="Por la mañana (8am - 12pm)">Mañana (8am - 12pm)</option>
                          <option value="Por la tarde (12pm - 5pm)">Tarde (12pm - 5pm)</option>
                          <option value="Por la noche (5pm - 8pm)">Noche (5pm - 8pm)</option>
                          <option value="Cualquier hora">Cualquier horario</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🛡️ DESTINO DEL SERVICIO: RED PÚBLICA VS ENVIAR A MIS TÉCNICOS */}
                <div className="msa-card-box" style={{ padding: '14px', background: '#f8fafc' }}>
                  <label className="msa-label" style={{ marginBottom: '8px', color: '#0f172a' }}>
                    <Shield size={14} color="#ea580c" /> ¿A quién deseas enviar?
                  </label>

                  {/* Selector de Modo */}
                  <div className="msa-destino-grid">
                    <button
                      type="button"
                      onClick={() => setDestinoEnvio('red')}
                      className={`msa-destino-btn ${destinoEnvio === 'red' ? 'active-red' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '900', fontSize: '12px' }}>
                        <Globe size={15} />
                        <span>A LA RED</span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '600', opacity: 0.85 }}>
                        Técnicos autónomos
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestinoEnvio('mis_tecnicos')}
                      className={`msa-destino-btn ${destinoEnvio === 'mis_tecnicos' ? 'active-blue' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '900', fontSize: '12px' }}>
                        <Users size={15} />
                        <span>A MIS TÉCNICOS</span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '600', opacity: 0.85 }}>
                        Tus técnicos ligados
                      </span>
                    </button>
                  </div>

                  {/* Panel según destino */}
                  {destinoEnvio === 'mis_tecnicos' ? (
                    <div>
                      {loadingTecnicos ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '12px', fontWeight: '700' }}>
                          Cargando técnicos asociados...
                        </div>
                      ) : tecnicos.length > 0 ? (
                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#0369a1', display: 'block', marginBottom: '5px' }}>
                            Selecciona el técnico que atenderá la solicitud:
                          </label>
                          <select
                            value={selectedTechId}
                            onChange={(e) => setSelectedTechId(e.target.value)}
                            className="msa-select"
                            style={{ borderColor: '#bae6fd', marginBottom: '10px', padding: '9px 12px', fontSize: '12.5px' }}
                          >
                            {tecnicos.map(t => {
                              const fullName = `${t.first_name || t.name || ''} ${t.last_name || ''}`.trim() || `Técnico #${t.id}`;
                              const rol = t.role_id === 2 ? 'Técnico Agente' : (t.role_id === 6 ? 'Contratista' : (t.role_id === 8 ? 'Técnico de la Red' : 'Técnico'));
                              return (
                                <option key={t.id} value={t.id}>
                                  👷‍♂️ {fullName} ({rol})
                                </option>
                              );
                            })}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleSubmitBatch('mis_tecnicos')}
                            disabled={loadingSubmit || (!selectedPropertyId && carritoServicios.length === 0)}
                            className="msa-btn-submit-blue"
                          >
                            <UserCheck size={17} />
                            {loadingSubmit ? "ASIGNANDO SERVICIO..." : `ENVIAR A MI TÉCNICO ${totalItemsCount > 1 ? `(${totalItemsCount})` : ''}`}
                          </button>
                        </div>
                      ) : (
                        /* ESTADO VACÍO CUANDO NO TIENE TÉCNICOS */
                        <div style={{ padding: '12px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#b91c1c', fontWeight: '900', fontSize: '12px', marginBottom: '3px' }}>
                            <AlertCircle size={15} /> Sin técnicos vinculados
                          </div>
                          <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#7f1d1d', lineHeight: 1.35 }}>
                            No tienes técnicos directos registrados. Te recomendamos enviar esta solicitud a la <strong>Red de Técnicos</strong> para recibir cotizaciones.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setDestinoEnvio('red');
                              handleSubmitBatch('red');
                            }}
                            disabled={loadingSubmit || (!selectedPropertyId && carritoServicios.length === 0)}
                            className="msa-btn-submit-orange"
                            style={{ padding: '10px 14px', fontSize: '0.82rem' }}
                          >
                            <Globe size={15} /> PUBLICAR EN LA RED DE TÉCNICOS
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* MODO RED PÚBLICA */
                    <div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: '#64748b', lineHeight: 1.35, textAlign: 'center' }}>
                        Tu solicitud será visible para técnicos de la red para que recibas cotizaciones en tiempo real.
                      </p>
                      <button 
                        type="button" 
                        onClick={() => handleSubmitBatch('red')} 
                        disabled={loadingSubmit || (!selectedPropertyId && carritoServicios.length === 0)} 
                        className="msa-btn-submit-orange"
                      >
                        <Globe size={17} />
                        {loadingSubmit ? "PUBLICANDO EN LA RED..." : `PUBLICAR EN LA RED ${totalItemsCount > 1 ? `(${totalItemsCount})` : ''}`}
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE ORIGEN DE FOTO */}
      {isPhotoMenuOpen && (
        <div className="msa-photo-source-overlay" onClick={() => setIsPhotoMenuOpen(false)}>
          <div className="msa-photo-source-modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, color: '#f26522', fontSize: '1rem', fontWeight: '900' }}>Seleccionar Origen</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button 
                type="button"
                onClick={() => selectPhotoSource('camera')}
                style={{ background: 'transparent', border: 'none', padding: '13px', color: '#1e293b', borderBottom: '1px solid #eee', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Camera size={17} color="#ea580c" /> Tomar Foto con Cámara
              </button>
              <button 
                type="button"
                onClick={() => selectPhotoSource('gallery')}
                style={{ background: 'transparent', border: 'none', padding: '13px', color: '#1e293b', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <FileText size={17} color="#0284c7" /> Elegir de Galería
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalServicioAutonomo;
