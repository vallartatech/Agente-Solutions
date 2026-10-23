import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  X, FileText, Home, Wrench, MessageSquare, Camera, Trash2, PlusCircle, Globe, Users, Shield, AlertCircle, CheckCircle2, UserCheck, Clock, Calendar, Check
} from 'lucide-react';
import '../../../styles/AgenteMarket/Admin/ModalServicioAutonomo.css';
import { mostrarAviso } from '../../../utils/dialogos';

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
  const [solicitudExitosa, setSolicitudExitosa] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState(null);
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
      
      // La red solo asigna técnicos de la red: los Técnicos Agente (rol 2) son de uso interno
      const soloTecnicosRed = (lista) => lista.filter(u => [6, 8].includes(Number(u.role_id)));

      // Intentar primero endpoint de técnicos vinculados
      let techs = [];
      try {
        const resTecnicos = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios/tecnicos`, { headers });
        if (Array.isArray(resTecnicos.data)) {
          techs = soloTecnicosRed(resTecnicos.data);
        }
      } catch {
        // Fallback a /usuarios
      }

      if (techs.length === 0) {
        const resUsuarios = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios`, { headers });
        const all = Array.isArray(resUsuarios.data) ? resUsuarios.data : [];
        techs = soloTecnicosRed(all);
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
      mostrarAviso("Por favor selecciona una propiedad primero.");
      return;
    }
    if (!nuevoServicio.tipo || !nuevoServicio.area_id || !nuevoServicio.descripcion) {
      mostrarAviso("Por favor completa los campos obligatorios (Tipo, Zona y Descripción).");
      return;
    }
    setCarritoServicios([...carritoServicios, { ...nuevoServicio }]);
    setNuevoServicio({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', urgencia: 'urgente', fechaProgramada: '', horarioPreferido: '', fotos: [] });
  };

  const handleSubmitBatch = async (forcedMode = null) => {
    const mode = forcedMode || destinoEnvio;

    if (!selectedPropertyId) {
      mostrarAviso("Por favor selecciona una propiedad primero.");
      return;
    }

    let lote = [...carritoServicios];
    if (nuevoServicio.tipo && nuevoServicio.area_id && nuevoServicio.descripcion) {
      lote.push({ ...nuevoServicio });
    }

    if (lote.length === 0) {
      mostrarAviso("Por favor ingresa o añade al menos un problema a reportar.");
      return;
    }

    const isToNetwork = mode === 'red';
    const targetTechId = (!isToNetwork && selectedTechId) ? selectedTechId : null;

    if (!isToNetwork && tecnicos.length === 0) {
      mostrarAviso("No cuentas con técnicos vinculados actualmente. Te recomendamos enviarlo a la Red de Técnicos.");
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
      const propObj = propiedades.find(p => String(p.id) === String(selectedPropertyId));
      const propName = propObj ? (propObj.nombre_propiedad || propObj.nombre || propObj.address || `Propiedad #${propObj.id}`) : 'Mi Propiedad';

      // Mostramos la elegante Ficha de Solicitud en vez del alert del navegador
      const exitosaData = {
        isToNetwork,
        techName,
        propiedadNombre: propName,
        totalSolicitudes: total,
        primerServicio: lote[0],
        loteId: total > 1 ? loteId : null,
        fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      };

      setSolicitudExitosa(exitosaData);
    } catch (error) {
      console.error("Error enviando lote:", error);
      setErrorEnvio("Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleFinalizarExito = () => {
    setSolicitudExitosa(null);
    setCarritoServicios([]);
    setNuevoServicio({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', urgencia: 'urgente', fechaProgramada: '', horarioPreferido: '', fotos: [] });
    if (onSuccess) onSuccess();
    if (onClose) onClose();
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
            <button className="msa-close-btn" onClick={onClose} title="Cerrar modal" type="button" aria-label="Cerrar">
              <X size={18} strokeWidth={2.5} />
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

                {/* 📷 EVIDENCIA VISUAL (FOTOS) */}
                <div className="msa-card-box msa-evidence-box">
                  <div className="msa-card-box-header">
                    <label className="msa-label">
                      <Camera size={14} color="#ea580c" /> Evidencia Visual
                    </label>
                    <span className="msa-counter-badge">
                      {nuevoServicio.fotos.length}/2 fotos
                    </span>
                  </div>
                  
                  <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={handleFileSelect} />
                  <input type="file" ref={galleryRef} hidden accept="image/*" multiple onChange={handleFileSelect} />

                  <div className="msa-photo-preview-grid">
                    {nuevoServicio.fotos.map((foto, idx) => (
                      <div key={idx} className="msa-photo-item">
                        <img src={URL.createObjectURL(foto)} alt="preview" />
                        <button type="button" className="msa-photo-remove" onClick={() => removeFoto(idx)} title="Eliminar foto">
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}

                    {nuevoServicio.fotos.length < 2 && (
                      <button 
                        type="button" 
                        className="msa-photo-add-btn"
                        onClick={() => setIsPhotoMenuOpen(true)}
                        disabled={!selectedPropertyId}
                      >
                        <PlusCircle size={20} />
                        <span className="msa-photo-add-label">+ Añadir</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* LISTA DE PROBLEMAS EN LOTE (CARRITO) */}
                {carritoServicios.length > 0 && (
                  <div className="msa-card-box msa-batch-box">
                    <div className="msa-batch-header">
                      <h4 className="msa-batch-title">
                        Problemas agregados ({carritoServicios.length})
                      </h4>
                      <span className="msa-batch-badge">Se enviarán juntos</span>
                    </div>
                    <div className="msa-batch-list">
                      {carritoServicios.map((item, idx) => (
                        <div key={idx} className="msa-batch-item">
                          {item.fotos.length > 0 ? (
                            <img src={URL.createObjectURL(item.fotos[0])} alt="preview" className="msa-batch-thumb" />
                          ) : (
                            <div className="msa-batch-thumb-placeholder"><FileText size={16} color="#94a3b8"/></div>
                          )}
                          <div className="msa-batch-info">
                            <strong className="msa-batch-item-title">
                              {item.tipo} - {item.zona}
                            </strong>
                            <span className="msa-batch-item-desc">
                              {item.descripcion}
                            </span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setCarritoServicios(carritoServicios.filter((_, i) => i !== idx))} 
                            className="msa-batch-delete-btn"
                            title="Eliminar de la lista"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ⏰ DISPONIBILIDAD / HORARIO */}
                <div className="msa-card-box msa-urgencia-box">
                  <label className="msa-label">
                    <Clock size={14} color="#ea580c" /> ¿Cuándo necesitas la atención?
                  </label>
                  <div className="msa-urgencia-grid">
                    <button
                      type="button"
                      onClick={() => setNuevoServicio({...nuevoServicio, urgencia: 'urgente', fechaProgramada: '', horarioPreferido: ''})}
                      className={`msa-urgencia-btn ${nuevoServicio.urgencia === 'urgente' || !nuevoServicio.urgencia ? 'active-urgente' : ''}`}
                    >
                      <span className="msa-urgencia-icon">⚡</span>
                      <span>Urgente (Hoy)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNuevoServicio({
                        ...nuevoServicio, 
                        urgencia: 'programado', 
                        fechaProgramada: nuevoServicio.fechaProgramada || new Date(Date.now() + 86400000).toISOString().split('T')[0], 
                        horarioPreferido: nuevoServicio.horarioPreferido || 'Por la tarde (12pm - 5pm)'
                      })}
                      className={`msa-urgencia-btn ${nuevoServicio.urgencia === 'programado' ? 'active-programado' : ''}`}
                    >
                      <Calendar size={14} />
                      <span>Programar</span>
                    </button>
                  </div>

                  {nuevoServicio.urgencia === 'programado' && (
                    <div className="msa-programar-fields">
                      <div className="msa-programar-field">
                        <span className="msa-sublabel">Fecha deseada:</span>
                        <input
                          type="date"
                          value={nuevoServicio.fechaProgramada || ''}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setNuevoServicio({...nuevoServicio, fechaProgramada: e.target.value})}
                          className="msa-input"
                        />
                      </div>
                      <div className="msa-programar-field">
                        <span className="msa-sublabel">Horario preferido:</span>
                        <select
                          value={nuevoServicio.horarioPreferido || 'Por la tarde (12pm - 5pm)'}
                          onChange={(e) => setNuevoServicio({...nuevoServicio, horarioPreferido: e.target.value})}
                          className="msa-select"
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

                {/* 🛡️ DESTINO DEL SERVICIO */}
                <div className="msa-card-box msa-destino-box">
                  <label className="msa-label">
                    <Shield size={14} color="#ea580c" /> ¿A quién deseas enviar?
                  </label>

                  {/* Selector de Modo */}
                  <div className="msa-destino-grid">
                    <button
                      type="button"
                      onClick={() => setDestinoEnvio('red')}
                      className={`msa-destino-btn ${destinoEnvio === 'red' ? 'active-red' : ''}`}
                    >
                      <div className="msa-destino-btn-head">
                        <Globe size={16} />
                        <span>A LA RED</span>
                      </div>
                      <span className="msa-destino-btn-sub">
                        Técnicos autónomos
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestinoEnvio('mis_tecnicos')}
                      className={`msa-destino-btn ${destinoEnvio === 'mis_tecnicos' ? 'active-blue' : ''}`}
                    >
                      <div className="msa-destino-btn-head">
                        <Users size={16} />
                        <span>A MIS TÉCNICOS</span>
                      </div>
                      <span className="msa-destino-btn-sub">
                        Tus técnicos ligados
                      </span>
                    </button>
                  </div>

                  {/* Panel según destino */}
                  {destinoEnvio === 'mis_tecnicos' ? (
                    <div className="msa-destino-panel">
                      {loadingTecnicos ? (
                        <div className="msa-loading-tecnicos">
                          Cargando técnicos asociados...
                        </div>
                      ) : tecnicos.length > 0 ? (
                        <div className="msa-tecnicos-wrapper">
                          <label className="msa-tecnicos-sublabel">
                            Selecciona el técnico que atenderá la solicitud:
                          </label>
                          <select
                            value={selectedTechId}
                            onChange={(e) => setSelectedTechId(e.target.value)}
                            className="msa-select msa-select-tech"
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
                        <div className="msa-no-tecnicos-card">
                          <div className="msa-no-tecnicos-title">
                            <AlertCircle size={15} /> Sin técnicos vinculados
                          </div>
                          <p className="msa-no-tecnicos-desc">
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
                          >
                            <Globe size={15} /> PUBLICAR EN LA RED DE TÉCNICOS
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* MODO RED PÚBLICA */
                    <div className="msa-destino-panel">
                      <p className="msa-network-desc">
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
            <div className="msa-photo-source-header">
              <h3 className="msa-photo-source-title">Seleccionar Origen</h3>
              <button 
                type="button" 
                className="msa-photo-source-close" 
                onClick={() => setIsPhotoMenuOpen(false)}
                title="Cerrar"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
            <div className="msa-photo-source-body">
              <button 
                type="button"
                onClick={() => selectPhotoSource('camera')}
                className="msa-photo-source-btn"
              >
                <div className="msa-photo-source-icon camera">
                  <Camera size={18} />
                </div>
                <div className="msa-photo-source-info">
                  <strong>Tomar Foto con Cámara</strong>
                  <span>Usa la cámara de tu dispositivo</span>
                </div>
              </button>
              <button 
                type="button"
                onClick={() => selectPhotoSource('gallery')}
                className="msa-photo-source-btn"
              >
                <div className="msa-photo-source-icon gallery">
                  <FileText size={18} />
                </div>
                <div className="msa-photo-source-info">
                  <strong>Elegir de Galería</strong>
                  <span>Sube archivos o fotos guardadas</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════
          FICHA DE CONFIRMACIÓN / ÉXITO DE SOLICITUD
          ══════════════════════════════════════════ */}
      {solicitudExitosa && (
        <div className="msa-overlay" onClick={handleFinalizarExito}>
          <div className="msa-ficha-card" onClick={e => e.stopPropagation()}>
            <div className="msa-ficha-top-bar" />
            
            <div className="msa-ficha-header">
              <div className="msa-ficha-icon-circle">
                <CheckCircle2 size={36} color="#16a34a" strokeWidth={2.4} />
              </div>
              <h3 className="msa-ficha-title">
                {solicitudExitosa.isToNetwork ? '¡Solicitud Publicada en la Red!' : '¡Solicitud Asignada con Éxito!'}
              </h3>
              <p className="msa-ficha-subtitle">
                {solicitudExitosa.isToNetwork 
                  ? 'Tu requerimiento ya está visible para los técnicos disponibles para cotizar.' 
                  : `Se ha notificado y asignado directamente a ${solicitudExitosa.techName}.`}
              </p>
            </div>

            {/* CUERPO DE LA FICHA */}
            <div className="msa-ficha-body">
              <div className="msa-ficha-badge-row">
                <span className="msa-ficha-folio">
                  {solicitudExitosa.loteId ? `LOTE: ${solicitudExitosa.loteId}` : 'FOLIO: EN RED'}
                </span>
                <span className={`msa-ficha-status-pill ${solicitudExitosa.isToNetwork ? 'network' : 'tech'}`}>
                  ● {solicitudExitosa.isToNetwork ? 'EN VIVO EN LA RED' : 'ASIGNADO'}
                </span>
              </div>

              <div className="msa-ficha-details-grid">
                <div className="msa-ficha-item">
                  <span className="msa-ficha-item-label">
                    <Home size={13} color="#ea580c" /> Propiedad
                  </span>
                  <strong className="msa-ficha-item-val" title={solicitudExitosa.propiedadNombre}>
                    {solicitudExitosa.propiedadNombre}
                  </strong>
                </div>

                <div className="msa-ficha-item">
                  <span className="msa-ficha-item-label">
                    <FileText size={13} color="#ea580c" /> Tipo
                  </span>
                  <strong className="msa-ficha-item-val">
                    {solicitudExitosa.primerServicio?.tipo || 'Mantenimiento'}
                  </strong>
                </div>

                <div className="msa-ficha-item">
                  <span className="msa-ficha-item-label">
                    <Wrench size={13} color="#ea580c" /> Zona
                  </span>
                  <strong className="msa-ficha-item-val">
                    {solicitudExitosa.primerServicio?.zona || 'Área General'}
                  </strong>
                </div>

                <div className="msa-ficha-item">
                  <span className="msa-ficha-item-label">
                    <Clock size={13} color="#ea580c" /> Atención
                  </span>
                  <strong className="msa-ficha-item-val">
                    {solicitudExitosa.primerServicio?.urgencia === 'programado'
                      ? `📅 Programado` 
                      : '⚡ Urgente (Hoy)'}
                  </strong>
                </div>
              </div>

              {solicitudExitosa.primerServicio?.descripcion && (
                <div className="msa-ficha-desc-box">
                  <span className="msa-ficha-desc-label">Detalle reportado:</span>
                  <p className="msa-ficha-desc-text">
                    "{solicitudExitosa.primerServicio.descripcion}"
                  </p>
                </div>
              )}

              {solicitudExitosa.totalSolicitudes > 1 && (
                <div className="msa-ficha-batch-banner">
                  <span>💼 Incluye {solicitudExitosa.totalSolicitudes} problemas enviados en este lote</span>
                </div>
              )}
            </div>

            {/* BOTÓN ACEPTAR */}
            <div className="msa-ficha-footer">
              <button
                type="button"
                className="msa-ficha-btn-ok"
                onClick={handleFinalizarExito}
              >
                <Check size={18} strokeWidth={2.5} />
                <span>Aceptar y Ver en el Mapa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ERROR (SI FALLA EL ENVÍO) */}
      {errorEnvio && (
        <div className="msa-overlay" onClick={() => setErrorEnvio(null)}>
          <div className="msa-ficha-card" onClick={e => e.stopPropagation()}>
            <div className="msa-ficha-top-bar error" />
            <div className="msa-ficha-header">
              <div className="msa-ficha-icon-circle error">
                <AlertCircle size={36} color="#ef4444" strokeWidth={2.4} />
              </div>
              <h3 className="msa-ficha-title">No se pudo enviar la solicitud</h3>
              <p className="msa-ficha-subtitle">{errorEnvio}</p>
            </div>
            <div className="msa-ficha-footer">
              <button
                type="button"
                className="msa-ficha-btn-error"
                onClick={() => setErrorEnvio(null)}
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalServicioAutonomo;
