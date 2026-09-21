import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  X, FileText, Home, Wrench, MessageSquare, Camera, Trash2, PlusCircle, Globe
} from 'lucide-react';

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
    setNuevoServicio({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', fotos: [] });
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
        
        const hasValidEquipo = item.equipo && item.equipo.toLowerCase() !== 'otro' && item.equipo.toLowerCase() !== 'ninguno';
        const descBase = hasValidEquipo 
          ? `${item.descripcion}\n\n[EQUIPO AFECTADO]: ${item.equipo}`
          : item.descripcion;
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
      setNuevoServicio({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', fotos: [] });
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
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
          <button className="close-modal" onClick={onClose}><X /></button>
          <div className="modal-header">
            <div className="modal-tag">NUEVA SOLICITUD</div>
            <h2>Reportar Problema</h2>
          </div>
          
          <div className="modal-body service-form" style={{ padding: '20px' }}>
            
            {/* Si no se pasó un propertyId, mostrar dropdown para seleccionar propiedad */}
            {!propertyId && (
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold' }}><Home size={16}/> Seleccionar Propiedad *</label>
                <select 
                  required 
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  disabled={loadingPropiedades}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
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
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>Problemas a reportar ({carritoServicios.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {carritoServicios.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', alignItems: 'center' }}>
                      {item.fotos.length > 0 ? (
                        <img src={URL.createObjectURL(item.fotos[0])} alt="preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                      ) : (
                        <div style={{ width: '50px', height: '50px', background: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={20} color="#94a3b8"/></div>
                      )}
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', fontSize: '14px', color: '#F26522' }}>{item.tipo} - {item.zona}</strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{item.descripcion.substring(0, 50)}...</span>
                      </div>
                      <button type="button" onClick={() => setCarritoServicios(carritoServicios.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAnadirAlCarrito}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold' }}><FileText size={16}/> Tipo de Servicio *</label>
                <select 
                  required 
                  value={nuevoServicio.tipo}
                  onChange={(e) => setNuevoServicio({...nuevoServicio, tipo: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                  disabled={!selectedPropertyId}
                >
                  <option value="">Selecciona el tipo...</option>
                  <option value="Mantenimiento">Mantenimiento Preventivo</option>
                  <option value="Problema">Problema / Reparación</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold' }}><Home size={16}/> Zona de la propiedad *</label>
                <select 
                  required 
                  value={nuevoServicio.area_id}
                  onChange={(e) => handleZonaChange(e.target.value)}
                  disabled={loadingZonas || !selectedPropertyId}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
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

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold' }}><Wrench size={16}/> Equipo afectado (Opcional)</label>
                <select 
                  value={nuevoServicio.equipo}
                  disabled={!nuevoServicio.area_id || loadingEquipos}
                  onChange={(e) => setNuevoServicio({...nuevoServicio, equipo: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
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

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold' }}><MessageSquare size={16}/> Descripción *</label>
                <textarea 
                  required 
                  rows="3" 
                  placeholder="Describe el problema..." 
                  value={nuevoServicio.descripcion} 
                  onChange={(e) => setNuevoServicio({...nuevoServicio, descripcion: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                  disabled={!selectedPropertyId}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold' }}><Camera size={16}/> Evidencia Visual (Máx 2 fotos)</label>
                
                <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={handleFileSelect} />
                <input type="file" ref={galleryRef} hidden accept="image/*" multiple onChange={handleFileSelect} />

                <div className="fotos-preview-container" style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {nuevoServicio.fotos.map((foto, idx) => (
                    <div key={idx} className="foto-preview-wrapper" style={{ position: 'relative', width: '70px', height: '70px' }}>
                      <img 
                        src={URL.createObjectURL(foto)} 
                        alt="preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '2px solid #f26624' }} 
                      />
                      <button 
                        type="button"
                        onClick={() => removeFoto(idx)}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#e63946', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                      style={{ width: '70px', height: '70px', border: '2px dashed #ccc', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: selectedPropertyId ? 'pointer' : 'not-allowed', background: '#f9f9f9', color: '#666' }}
                    >
                      <PlusCircle size={20} />
                      <span style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '4px' }}>AÑADIR</span>
                    </button>
                  )}
                </div>
              </div>

              <button type="submit" disabled={!selectedPropertyId} style={{ background: '#f1f5f9', color: '#334155', border: '2px dashed #94a3b8', width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: selectedPropertyId ? 'pointer' : 'not-allowed' }}>
                + AÑADIR PROBLEMA A LA LISTA
              </button>
            </form>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => handleSubmitBatch(false)} 
                disabled={loadingSubmit || (!selectedPropertyId && carritoServicios.length === 0)} 
                style={{ background: '#1e293b', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: loadingSubmit ? 'not-allowed' : 'pointer', opacity: loadingSubmit ? 0.6 : 1 }}
              >
                {loadingSubmit ? "ENVIANDO..." : `ENVIAR AL ADMINISTRADOR ${carritoServicios.length > 0 ? `(${carritoServicios.length})` : ''}`}
              </button>

              <button 
                type="button" 
                onClick={() => handleSubmitBatch(true)} 
                disabled={loadingSubmit || (!selectedPropertyId && carritoServicios.length === 0)} 
                style={{ background: '#F26522', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: loadingSubmit ? 'not-allowed' : 'pointer', opacity: loadingSubmit ? 0.6 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                <Globe size={18} />
                {loadingSubmit ? "PUBLICANDO..." : "PUBLICAR EN LA RED (TÉCNICOS)"}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE FOTO */}
      {isPhotoMenuOpen && (
        <div className="modal-overlay" onClick={() => setIsPhotoMenuOpen(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '300px', padding: '0', backgroundColor: '#fff' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, color: '#F26522', fontSize: '1.1rem' }}>Seleccionar Origen</h3>
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
                style={{ background: 'transparent', border: 'none', padding: '15px', color: '#333', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <FileText size={20} /> Galería
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalServicioAutonomo;
