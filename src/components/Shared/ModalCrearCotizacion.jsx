import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { X, Plus, Trash2, Camera, FileText, Upload } from 'lucide-react';
import '../../styles/AgenteSolutions/Tecnico/TrabajoPropiedad.css';

const ModalCrearCotizacion = ({ 
  workOrderId, 
  serviceId, 
  cotizacionExistente, 
  onClose, 
  onSuccess,
  isAdmin = false
}) => {
  const [tabCotizacion, setTabCotizacion] = useState('manual');
  const [filasConceptos, setFilasConceptos] = useState([{ id: Date.now(), desc: '', cant: 1, precio: '' }]);
  const [filasMateriales, setFilasMateriales] = useState([{ id: Date.now() + 1, desc: '', cant: 1, precio: '' }]);
  const [observacionesCotizacion, setObservacionesCotizacion] = useState('');
  const [archivoCotizacion, setArchivoCotizacion] = useState(null);
  const [fotoEvidencia, setFotoEvidencia] = useState(null);
  const [modoConsulta, setModoConsulta] = useState(false);
  const [enviandoCotizacion, setEnviandoCotizacion] = useState(false);
  const [cotizacionEnviada, setCotizacionEnviada] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);

  useEffect(() => {
    if (cotizacionExistente) {
      // Para admin, abrir directamente en modo edición editable; para técnico con cotización existente, consulta inicial
      setModoConsulta(!isAdmin);

      let parsed = null;
      try {
        parsed = typeof cotizacionExistente.concept === 'string' 
          ? JSON.parse(cotizacionExistente.concept) 
          : cotizacionExistente.concept;
      } catch (e) {
        console.error("Error al parsear concepto de cotización:", e);
      }

      let serviciosList = [];
      let materialesList = [];

      if (parsed) {
        if (Array.isArray(parsed)) {
          serviciosList = parsed;
        } else if (Array.isArray(parsed.servicios)) {
          serviciosList = parsed.servicios;
        } else if (Array.isArray(parsed.conceptos)) {
          serviciosList = parsed.conceptos;
        } else if (Array.isArray(parsed.seccionesLote)) {
          parsed.seccionesLote.forEach(sec => {
            const arr = sec.conceptos || sec.servicios || [];
            serviciosList = [...serviciosList, ...arr];
            if (Array.isArray(sec.materiales)) {
              materialesList = [...materialesList, ...sec.materiales];
            }
          });
        }

        if (Array.isArray(parsed.materiales)) {
          materialesList = [...materialesList, ...parsed.materiales];
        }
      }

      if (serviciosList && serviciosList.length > 0) {
        setFilasConceptos(serviciosList.map((s, i) => ({
          id: i + 1,
          desc: s.descripcion || s.desc || s.concepto || s.name || s.nombre || '',
          cant: Number(s.cantidad || s.cant || 1),
          precio: s.precio !== undefined ? s.precio : (s.precio_u !== undefined ? s.precio_u : (s.costo_u !== undefined ? s.costo_u : ''))
        })));
      } else {
        setFilasConceptos([{ id: Date.now(), desc: '', cant: 1, precio: '' }]);
      }

      if (materialesList && materialesList.length > 0) {
        setFilasMateriales(materialesList.map((m, i) => ({
          id: i + 1000,
          desc: m.descripcion || m.desc || m.material || m.concepto || m.name || '',
          cant: Number(m.cantidad || m.cant || 1),
          precio: m.precio !== undefined ? m.precio : (m.precio_u !== undefined ? m.precio_u : (m.costo_u !== undefined ? m.costo_u : ''))
        })));
      } else {
        setFilasMateriales([{ id: Date.now() + 1, desc: '', cant: 1, precio: '' }]);
      }

      setObservacionesCotizacion(cotizacionExistente.observations || cotizacionExistente.observaciones || '');
      setTabCotizacion(cotizacionExistente.type === 'archivo' ? 'archivo' : 'manual');
    } else {
      setModoConsulta(false);
      setFilasConceptos([{ id: Date.now(), desc: '', cant: 1, precio: '' }]);
      setFilasMateriales([{ id: Date.now() + 1, desc: '', cant: 1, precio: '' }]);
      setObservacionesCotizacion('');
      setTabCotizacion('manual');
    }
  }, [cotizacionExistente?.id, isAdmin]);

  const addFila = (setter) => setter(prev => [...prev, { id: Date.now(), desc: '', cant: 1, precio: '' }]);
  const removeFila = (setter, id) => setter(prev => prev.filter(f => f.id !== id));
  const updateFila = (setter, id, field, value) => {
    setter(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const calcularTotal = () => {
    const totalConceptos = filasConceptos.reduce((acc, f) => acc + (Number(f.cant || 0) * Number(f.precio || 0)), 0);
    const totalMateriales = filasMateriales.reduce((acc, f) => acc + (Number(f.cant || 0) * Number(f.precio || 0)), 0);
    return totalConceptos + totalMateriales;
  };

  const enviarCotizacion = async () => {
    try {
      setEnviandoCotizacion(true);
      const formData = new FormData();
      formData.append('type', tabCotizacion);
      
      const targetWorkOrderId = workOrderId || cotizacionExistente?.work_order_id;
      const targetServiceId = serviceId || cotizacionExistente?.service_id;

      if (targetWorkOrderId) {
        formData.append('work_order_id', targetWorkOrderId);
      } else if (targetServiceId) {
        formData.append('service_id', targetServiceId);
      } else {
        alert("Falta ID de referencia para la cotización.");
        setEnviandoCotizacion(false);
        return;
      }

      if (tabCotizacion === 'manual') {
        const validConceptos = filasConceptos.filter(f => (f.desc && f.desc.trim()) || Number(f.precio) > 0);
        const validMateriales = filasMateriales.filter(f => (f.desc && f.desc.trim()) || Number(f.precio) > 0);

        const conceptData = {
          servicios: validConceptos.length > 0 
            ? validConceptos.map(f => ({ descripcion: f.desc, cantidad: Number(f.cant) || 1, precio: Number(f.precio) || 0 }))
            : filasConceptos.map(f => ({ descripcion: f.desc, cantidad: Number(f.cant) || 1, precio: Number(f.precio) || 0 })),
          materiales: validMateriales.length > 0 
            ? validMateriales.map(f => ({ descripcion: f.desc, cantidad: Number(f.cant) || 1, precio: Number(f.precio) || 0 }))
            : []
        };
        formData.append('concept', JSON.stringify(conceptData));
        formData.append('estimated_amount', calcularTotal());
        formData.append('observations', observacionesCotizacion || '');
        if (fotoEvidencia) {
          formData.append('evidence_photo', fotoEvidencia);
        }
      } else {
        if (!archivoCotizacion && !cotizacionExistente?.file_path) {
          setEnviandoCotizacion(false);
          return alert("Por favor seleccione un archivo.");
        }
        if (archivoCotizacion) {
          formData.append('file', archivoCotizacion);
        }
      }

      const token = localStorage.getItem('token') || localStorage.getItem('agente_token');
      const authHeaders = {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      let res;
      if (cotizacionExistente && cotizacionExistente.id && !String(cotizacionExistente.id).startsWith('net_')) {
        res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacionExistente.id}/update`, formData, {
          headers: authHeaders
        });
      } else {
        res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones`, formData, {
          headers: authHeaders
        });
      }

      if (res.status === 201 || res.status === 200) {
        setCotizacionEnviada(true);
        setTimeout(() => {
          setCotizacionEnviada(false);
          if (onSuccess) onSuccess(res.data);
          onClose();
        }, 1200);
      }
    } catch (error) {
      console.error("Error enviando cotización:", error);
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || "Error desconocido";
      alert("Hubo un error al enviar la cotización: " + msg);
    } finally {
      setEnviandoCotizacion(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="tp-modal-overlay">
        <motion.div 
          initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
          className="tp-modal-quotation-card"
        >
          <div className="tp-modal-q-header">
            <div>
              <h2>
                {cotizacionExistente && isAdmin ? 'EDITAR COTIZACIÓN' : 
                 modoConsulta ? 'COTIZACIÓN REGISTRADA' : 'GENERAR COTIZACIÓN'}
              </h2>
              <p>
                {cotizacionExistente && isAdmin ? 'Modifica los detalles de la cotización' : 
                 modoConsulta ? 'Consulta los detalles de la cotización actual' : 'Complete el formato para enviar la cotización al cliente'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              aria-label="Cerrar modal"
              style={{ 
                background: 'rgba(255,255,255,0.18)', 
                border: '1px solid rgba(255,255,255,0.3)', 
                color: '#ffffff', 
                width: '38px', 
                height: '38px', 
                borderRadius: '10px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer', 
                flexShrink: 0, 
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.borderColor = '#ef4444';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
            >
              <X size={20} color="#ffffff" strokeWidth={2.5} />
            </button>
          </div>

          {!modoConsulta && (
            <div className="tp-modal-q-tabs">
              <button 
                className={`tp-q-tab ${tabCotizacion === 'manual' ? 'active' : ''}`}
                onClick={() => setTabCotizacion('manual')}
              >
                <FileText size={18} />
                <span>Registro Manual</span>
              </button>
              <button 
                className={`tp-q-tab ${tabCotizacion === 'archivo' ? 'active' : ''}`}
                onClick={() => setTabCotizacion('archivo')}
              >
                <Upload size={18} />
                <span>Cargar Archivo</span>
              </button>
            </div>
          )}

          <div className="tp-modal-q-body">
            {tabCotizacion === 'manual' ? (
              <div className="tp-q-manual-form">
                <div className="tp-q-section">
                  <div className="tp-q-section-header">
                    <h3>1. CONCEPTOS DE SERVICIO</h3>
                    <div className="tp-q-line"></div>
                  </div>
                  <div className="tp-q-table-header">
                    <span className="col-desc">DESCRIPCIÓN</span>
                    <span className="col-cant">CANT.</span>
                    <span className="col-price">PRECIO U.</span>
                    <span className="col-sub">SUBTOTAL</span>
                    <span className="col-actions"></span>
                  </div>
                  <div className="tp-q-rows-container">
                    {filasConceptos.map(f => (
                      <div key={f.id} className="tp-q-row">
                        <input 
                          type="text" 
                          className="tp-q-input desc" 
                          placeholder="Ej: Instalación de luminarias"
                          value={f.desc}
                          onChange={(e) => updateFila(setFilasConceptos, f.id, 'desc', e.target.value)}
                          readOnly={modoConsulta}
                        />
                        <input 
                          type="number" 
                          className="tp-q-input cant" 
                          value={f.cant}
                          onChange={(e) => updateFila(setFilasConceptos, f.id, 'cant', e.target.value)}
                          readOnly={modoConsulta}
                        />
                        <div className="tp-q-price-wrapper">
                          <span>$</span>
                          <input 
                            type="number" 
                            className="tp-q-input" 
                            value={f.precio}
                            onChange={(e) => updateFila(setFilasConceptos, f.id, 'precio', e.target.value)}
                            readOnly={modoConsulta}
                          />
                        </div>
                        <span className="tp-q-subtotal">${(f.cant * f.precio).toLocaleString()}</span>
                        {!modoConsulta && (
                          <button className="tp-q-btn-del" onClick={() => removeFila(setFilasConceptos, f.id)}><X size={16}/></button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!modoConsulta && (
                    <button className="tp-q-btn-add" onClick={() => addFila(setFilasConceptos)}>
                      <Plus size={16} />
                      <span>Agregar Concepto</span>
                    </button>
                  )}
                </div>

                <div className="tp-q-section">
                  <div className="tp-q-section-header">
                    <h3>2. MATERIALES</h3>
                    <div className="tp-q-line"></div>
                  </div>
                  
                  <div className="tp-q-table-header">
                    <span className="col-desc">MATERIAL</span>
                    <span className="col-cant">CANT.</span>
                    <span className="col-price">COSTO U.</span>
                    <span className="col-sub">SUBTOTAL</span>
                    <span className="col-actions"></span>
                  </div>

                  <div className="tp-q-rows-container">
                    {filasMateriales.map(f => (
                      <div key={f.id} className="tp-q-row">
                        <input 
                          type="text" 
                          className="tp-q-input desc" 
                          placeholder="Ej: Cable UTP"
                          value={f.desc}
                          onChange={(e) => updateFila(setFilasMateriales, f.id, 'desc', e.target.value)}
                          readOnly={modoConsulta}
                        />
                        <input 
                          type="number" 
                          className="tp-q-input cant" 
                          value={f.cant}
                          onChange={(e) => updateFila(setFilasMateriales, f.id, 'cant', e.target.value)}
                          readOnly={modoConsulta}
                        />
                        <div className="tp-q-price-wrapper">
                          <span>$</span>
                          <input 
                            type="number" 
                            className="tp-q-input price" 
                            value={f.precio}
                            onChange={(e) => updateFila(setFilasMateriales, f.id, 'precio', e.target.value)}
                            readOnly={modoConsulta}
                          />
                        </div>
                        <span className="tp-q-subtotal">${(f.cant * f.precio).toLocaleString()}</span>
                        {!modoConsulta && (
                          <button className="tp-q-btn-del" onClick={() => removeFila(setFilasMateriales, f.id)}><Trash2 size={16}/></button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!modoConsulta && (
                    <button className="tp-q-btn-add" onClick={() => addFila(setFilasMateriales)}>
                      <Plus size={16} />
                      <span>Agregar Material</span>
                    </button>
                  )}
                </div>

                <div className="tp-q-section">
                  <div className="tp-q-section-header">
                    <h3>3. OBSERVACIONES ADICIONALES</h3>
                    <div className="tp-q-line"></div>
                  </div>
                  <textarea 
                    className="tp-q-textarea"
                    placeholder="Notas internas..."
                    value={observacionesCotizacion}
                    onChange={(e) => setObservacionesCotizacion(e.target.value)}
                    readOnly={modoConsulta}
                  ></textarea>
                </div>

                <div className="tp-q-section" style={{ marginTop: '20px' }}>
                  <div className="tp-q-section-header">
                    <h3>4. EVIDENCIA FOTOGRÁFICA (Opcional)</h3>
                    <div className="tp-q-line"></div>
                  </div>
                  {!modoConsulta && (
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                      Opcional. Adjunte una imagen si es necesario mostrar el daño o situación al cliente junto con la cotización.
                    </p>
                  )}
                  <div className="tp-q-file-upload" style={{ minHeight: '120px', padding: '15px' }}>
                    {modoConsulta ? (
                      cotizacionExistente?.evidence_photo_path ? (
                        <div className="tp-q-view-file" style={{ border: 'none', background: 'transparent' }}>
                          <img src={cotizacionExistente.evidence_photo_path} alt="Evidencia" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '10px' }} />
                        </div>
                      ) : (
                        <p style={{ textAlign: 'center', color: '#888' }}>No se adjuntó evidencia fotográfica.</p>
                      )
                    ) : (
                      <div className="tp-upload-area" onClick={() => setIsPhotoMenuOpen(true)} style={{ padding: '20px', border: '2px dashed #ccc', borderRadius: '10px', textAlign: 'center', cursor: 'pointer' }}>
                        {fotoEvidencia ? (
                          <img src={URL.createObjectURL(fotoEvidencia)} alt="Vista previa" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', objectFit: 'contain', margin: '0 auto' }} />
                        ) : (
                          <>
                            <Camera size={32} color="#f26624" style={{ margin: '0 auto 10px' }} />
                            <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                              Haga clic para subir una foto de evidencia
                            </p>
                          </>
                        )}
                        <input id="q-evidence-camera" type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFotoEvidencia(e.target.files[0])} />
                        <input id="q-evidence-gallery" type="file" accept="image/*" hidden onChange={(e) => setFotoEvidencia(e.target.files[0])} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="tp-q-file-upload">
                {modoConsulta ? (
                  <div className="tp-q-view-file">
                    <FileText size={48} color="#f26624" />
                    <p>Esta cotización fue cargada como archivo.</p>
                    <a href={cotizacionExistente.archivo_url} target="_blank" rel="noreferrer" className="tp-q-btn-view">VER ARCHIVO</a>
                  </div>
                ) : (
                  <div className="tp-upload-area" onClick={() => document.getElementById('q-file-input').click()}>
                    <Upload size={48} color="#f26624" />
                    <p>{archivoCotizacion ? archivoCotizacion.name : "Haga clic para seleccionar el archivo de cotización (PDF/Imagen)"}</p>
                    <input 
                      id="q-file-input" 
                      type="file" 
                      hidden 
                      onChange={(e) => setArchivoCotizacion(e.target.files[0])}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="tp-modal-q-footer">
            <div className="tp-q-total-card">
              <span className="tp-q-total-label">TOTAL ESTIMADO:</span>
              <span className="tp-q-total-amount">${Number(calcularTotal()).toLocaleString()}</span>
            </div>
            <div className="tp-q-footer-actions">
              {modoConsulta ? (
                <>
                  <button className="tp-q-btn-cancel-new" onClick={onClose}>CERRAR</button>
                  <button 
                    className="tp-q-btn-save-new" 
                    style={{ background: '#3b82f6', color: 'white', border: 'none' }}
                    onClick={() => setModoConsulta(false)}
                  >
                    ✏️ EDITAR COTIZACIÓN
                  </button>
                </>
              ) : (
                <>
                  <button className="tp-q-btn-cancel-new" onClick={onClose}>CANCELAR</button>
                  <button 
                    className={`tp-q-btn-save-new ${enviandoCotizacion ? 'loading' : ''}`}
                    onClick={enviarCotizacion}
                    disabled={enviandoCotizacion || cotizacionEnviada}
                  >
                    {enviandoCotizacion ? "ENVIANDO..." : cotizacionEnviada ? "¡ENVIADO!" : (cotizacionExistente && cotizacionExistente.id ? "ACTUALIZAR COTIZACIÓN" : "GUARDAR COTIZACIÓN")}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {isPhotoMenuOpen && (
          <div className="tp-modal-overlay" onClick={() => setIsPhotoMenuOpen(false)} style={{ zIndex: 10000, background: 'rgba(0,0,0,0.8)' }}>
            <div className="tp-modal-content" style={{ maxWidth: '400px', width: '90%', padding: '0', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#F26522', borderBottom: '1px solid #333', margin: 0, padding: '20px', textAlign: 'center', fontSize: '1.2rem' }}>Seleccionar Foto</h3>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button 
                  onClick={() => { document.getElementById('q-evidence-camera').click(); setIsPhotoMenuOpen(false); }}
                  style={{ padding: '20px', border: 'none', background: 'transparent', color: 'white', fontSize: '1.1rem', cursor: 'pointer', borderBottom: '1px solid #333' }}
                >
                  📷 Tomar Foto
                </button>
                <button 
                  onClick={() => { document.getElementById('q-evidence-gallery').click(); setIsPhotoMenuOpen(false); }}
                  style={{ padding: '20px', border: 'none', background: 'transparent', color: 'white', fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  🖼️ Elegir de la Galería
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default ModalCrearCotizacion;
