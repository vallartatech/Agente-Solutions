import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import "../../../styles/AgenteSolutions/Tecnico/RegistroDetalleHabitacion.css";
import { ArrowLeft, Plus, Trash2, X, Loader2, ImageIcon, Edit3, Eye, SlidersHorizontal } from 'lucide-react';
import Header from '../../../components/Shared/Header';

// Ficha técnica opcional de aire acondicionado ("modo avanzado" del formulario).
// Todos los campos son opcionales; se guardan en property_components.specs (JSON).
const esCategoriaAire = (nombre) => /AIRE/i.test(nombre || '');

const FICHA_AIRE = [
  { key: 'tipo_equipo', label: 'TIPO DE EQUIPO', type: 'select', options: ['MINISPLIT', 'VENTANA', 'PAQUETE', 'CENTRAL / FAN & COIL', 'PISO-TECHO', 'CASSETTE', 'PORTÁTIL'] },
  { key: 'capacidad', label: 'CAPACIDAD', type: 'datalist', placeholder: 'Ej. 18,000 BTU', options: ['9,000 BTU (0.75 TR)', '12,000 BTU (1 TR)', '18,000 BTU (1.5 TR)', '24,000 BTU (2 TR)', '36,000 BTU (3 TR)', '48,000 BTU (4 TR)', '60,000 BTU (5 TR)'] },
  { key: 'tecnologia', label: 'TECNOLOGÍA', type: 'select', options: ['INVERTER', 'CONVENCIONAL'] },
  { key: 'refrigerante', label: 'REFRIGERANTE', type: 'datalist', placeholder: 'Ej. R-410A', options: ['R-410A', 'R-32', 'R-22', 'R-134A'] },
  { key: 'voltaje', label: 'VOLTAJE', type: 'datalist', placeholder: 'Ej. 220 V', options: ['115 V', '220 V', '220 V TRIFÁSICO', '440 V TRIFÁSICO'] },
  { key: 'ubicacion_condensadora', label: 'UBICACIÓN CONDENSADORA', type: 'text', placeholder: 'Ej. AZOTEA, PATIO' },
  { key: 'anio_instalacion', label: 'AÑO DE INSTALACIÓN', type: 'number', placeholder: 'Ej. 2021' },
  { key: 'estado_equipo', label: 'ESTADO DEL EQUIPO', type: 'select', options: ['BUENO', 'REGULAR', 'MALO', 'FUERA DE SERVICIO'] },
];

const parseSpecs = (specs) => {
  if (!specs) return {};
  if (typeof specs === 'object') return specs;
  try { return JSON.parse(specs) || {}; } catch { return {}; }
};
const obtenerColorHex = (val) => {
  if (!val) return null;
  const cleanVal = val.trim().toLowerCase();
  
  if (/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(cleanVal)) {
    return cleanVal.startsWith('#') ? cleanVal : `#${cleanVal}`;
  }
  
  const colorNames = {
    blanco: '#ffffff', white: '#ffffff',
    negro: '#000000', black: '#000000',
    rojo: '#ff0000', red: '#ff0000',
    verde: '#00ff00', green: '#00ff00',
    azul: '#0000ff', blue: '#0000ff',
    amarillo: '#ffff00', yellow: '#ffff00',
    gris: '#808080', gray: '#808080', grey: '#808080',
    naranja: '#ff8c00', orange: '#ffa500',
    rosa: '#ffc0cb', pink: '#ffc0cb',
    morado: '#800080', purple: '#800080',
    cafe: '#8b4513', brown: '#a52a2a',
    beige: '#f5f5dc',
    celeste: '#87ceeb',
    turquesa: '#40e0d0', turquoise: '#40e0d0',
    cian: '#00ffff', cyan: '#00ffff',
    magenta: '#ff00ff',
    lila: '#c8a2c8',
    violeta: '#ee82ee', violet: '#ee82ee',
    fucsia: '#ff00ff', fuchsia: '#ff00ff',
    dorado: '#ffd700', gold: '#ffd700',
    plateado: '#c0c0c0', silver: '#c0c0c0',
    marron: '#800000', maroon: '#800000',
    oliva: '#808000', olive: '#808000',
    ocre: '#cc7722',
    coral: '#ff7f50',
    salmon: '#fa8072', salmón: '#fa8072',
    durazno: '#ffdab9', peach: '#ffdab9',
    menta: '#f5fffa', mint: '#f5fffa',
    lavanda: '#e6e6fa', lavender: '#e6e6fa',
    esmeralda: '#50c878', emerald: '#50c878',
    crema: '#fffdd0', cream: '#fffdd0'
  };

  if (colorNames[cleanVal]) {
    return colorNames[cleanVal];
  }
  return null;
};

const RegistroDetalleHabitacion = ({ habitacion, categoriaActiva, propertyCurp, alVolver }) => {
  const [componentes, setComponentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ESTADOS PARA EDICIÓN Y DETALLE
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [itemDetalle, setItemDetalle] = useState(null); // Nuevo estado para modal de visualización
  const [imagenAmpliada, setImagenAmpliada] = useState(null); // Para el Lightbox de la foto


  // ESTADOS PARA IMÁGENES
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [galeriaArchivos, setGaleriaArchivos] = useState([]); // Nuevas fotos extra
  const [galeriaExistente, setGaleriaExistente] = useState([]); // Fotos extra que ya vienen de BD
  const [removeMainImage, setRemoveMainImage] = useState(false);
  const [removedGalleryIds, setRemovedGalleryIds] = useState([]);

  const [nuevoRegistro, setNuevoRegistro] = useState({
    brand: '', model_or_color: '', quantity: 1, sub_category: '', serial_number: '', observations: ''
  });
  // Ficha técnica (modo avanzado, opcional)
  const [ficha, setFicha] = useState({});
  const [mostrarFicha, setMostrarFicha] = useState(false);
  const esAire = esCategoriaAire(categoriaActiva?.name);
  const camposFichaLlenos = Object.values(ficha).filter(v => String(v || '').trim() !== '').length;

  useEffect(() => {
    if (habitacion?.id) fetchComponentes();
  }, [habitacion]);

  const fetchComponentes = async () => {
    try {
      // ✅ INYECTAR TOKEN
      const token = localStorage.getItem('agente_token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/areas/${habitacion.id}/components`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // ✅ PROTECCIÓN: Si res.data no es un array, usamos una lista vacía
      const dataArray = Array.isArray(res.data) ? res.data : [];
      const filtrados = dataArray.filter(comp => comp.category === categoriaActiva?.name);
      setComponentes(filtrados);
    } catch (error) {
      console.error("Error al cargar componentes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewImg(URL.createObjectURL(file));
      setRemoveMainImage(false);
    }
  };

  const handleGallerySelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setGaleriaArchivos([...galeriaArchivos, ...files]);
    }
  };

  // FUNCIÓN PARA ABRIR MODAL EN MODO EDICIÓN
  const abrirModalEdicion = (item) => {
    setModoEdicion(true);
    setIdEditando(item.id);
    setNuevoRegistro({
      brand: item.brand || '',
      model_or_color: item.model_or_color || '',
      quantity: item.quantity || 1,
      sub_category: item.sub_category || '',
      serial_number: item.serial_number || '',
      observations: item.observations || ''
    });
    const specs = parseSpecs(item.specs);
    setFicha(specs);
    setMostrarFicha(Object.keys(specs).length > 0);

    // ✅ CORRECCIÓN: Leemos la ruta directa si existe
    if (item.image_path) {
      setPreviewImg(item.image_path); 
    } else {
      setPreviewImg(null);
    }
    
    // Asignamos ambas galerías (limpiamos las temporales seleccionadas)
    setGaleriaArchivos([]);
    setGaleriaExistente(item.galleries || []);
    setRemoveMainImage(false);
    setRemovedGalleryIds([]);
    setIsModalOpen(true);
  };

  // FUNCIÓN PARA ABRIR MODAL EN MODO CREACIÓN
  const abrirModalCreacion = () => {
    setModoEdicion(false);
    setIdEditando(null);
    setNuevoRegistro({ brand: '', model_or_color: '', quantity: 1, sub_category: '', serial_number: '', observations: '' });
    setFicha({});
    setMostrarFicha(false);
    setPreviewImg(null);
    setSelectedFile(null);
    setGaleriaArchivos([]);
    setGaleriaExistente([]);
    setRemoveMainImage(false);
    setRemovedGalleryIds([]);
    setIsModalOpen(true);
  };

  const guardarComponente = async () => {
    let subCat = nuevoRegistro.sub_category;
    if (categoriaActiva?.name === 'PINTURA') {
      subCat = 'COLORIMETRÍA';
      if (!nuevoRegistro.model_or_color) return alert("El campo TONO es obligatorio.");
    } else {
      if (!subCat) return alert("El campo TIPO es obligatorio.");
    }

    setGuardando(true);
    
    const formData = new FormData();
    formData.append('property_area_id', habitacion.id);
    formData.append('category', categoriaActiva.name);
    formData.append('sub_category', subCat);
    formData.append('brand', nuevoRegistro.brand);
    formData.append('model_or_color', nuevoRegistro.model_or_color);
    formData.append('quantity', nuevoRegistro.quantity);
    formData.append('serial_number', nuevoRegistro.serial_number);
    formData.append('observations', nuevoRegistro.observations);
    formData.append('unit', categoriaActiva?.name === 'PINTURA' ? 'M2' : 'PZA');
    formData.append('status', 'Bueno');
    // Aire acondicionado: ficha técnica opcional (vacía = se borra)
    if (esAire) {
      formData.append('specs', JSON.stringify(ficha));
    }
    
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    // MANDAMOS LAS FOTOS DE LA GALERÍA A LARAVEL
    galeriaArchivos.forEach((file) => {
      formData.append('gallery[]', file);
    });

    // SI ESTAMOS EDITANDO, AGREGAMOS EL TRUCO PARA LARAVEL Y CAMBIAMOS LA URL
    if (modoEdicion) {
      formData.append('_method', 'PUT'); 
      if (removedGalleryIds.length > 0) {
        removedGalleryIds.forEach((id) => {
          formData.append('deleted_gallery_ids[]', id);
        });
      }
    }

    const url = modoEdicion 
      ? `${import.meta.env.VITE_API_BASE_URL}/property-components/${idEditando}` 
      : `${import.meta.env.VITE_API_BASE_URL}/property-components`;

    try {
      // ✅ INYECTAR TOKEN JUNTO CON EL FORMDATA
      const token = localStorage.getItem('agente_token');
      await axios.post(url, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        }
      });
      
      setIsModalOpen(false);
      fetchComponentes(); 
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar el elemento.");
    } finally {
      setGuardando(false);
    }
  };
  
  const eliminarComponente = async (id) => {
    if(window.confirm("¿Seguro que deseas eliminar este elemento?")) {
      try {
        // ✅ INYECTAR TOKEN AL ELIMINAR
        const token = localStorage.getItem('agente_token');
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-components/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchComponentes();
      } catch (error) {
        alert("Error al eliminar");
      }
    }
  };

  // ✅ CORRECCIÓN: Armar el array de fotos usando las URLs limpias
  const fotosItem = itemDetalle ? [
    ...(itemDetalle.image_path ? [itemDetalle.image_path] : []),
    ...(itemDetalle.galleries ? itemDetalle.galleries.map(g => g.image_path) : [])
  ] : [];

  return (
    <>
      <Header />
      <div className="rdh-body-wrapper">
      <div className="rdh-info-row">
        <button onClick={alVolver} style={{ background: '#f26624', color: 'white', border: 'none', borderRadius: '20px', padding: '6px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
          <ArrowLeft size={16} style={{ marginRight: '8px' }}/> VOLVER
        </button>
        <div className="rdh-data-pill">CURP <strong>{propertyCurp || "S/N"}</strong></div>
        <div className="rdh-data-pill">ID ÁREA <strong>{habitacion?.id}</strong></div>
        <div className="rdh-date-box">FECHA DE REGISTRO</div>
      </div>

      <div className="rdh-main-card">
        <div className="rdh-header-grid">
          <div className="rdh-name-pill-large">
            <h3>{habitacion?.name || "HABITACIÓN PRINCIPAL"}</h3>
          </div>
          <div className="rdh-category-indicator">{categoriaActiva?.name || "CATEGORÍA"}</div>
        </div>

        <div className="rdh-content-layout">
          <div className="rdh-table-container">
            <div className="rdh-table-header" style={{ gridTemplateColumns: categoriaActiva?.name === 'PINTURA' ? '1.2fr 1fr 1fr 1fr 120px' : '1fr 1fr 0.5fr 1fr 120px' }}>
              {categoriaActiva?.name === 'PINTURA' ? (
                <>
                  <span>TONO / COLOR</span>
                  <span>MARCA</span>
                  <span>CLAVE / FÓRMULA</span>
                  <span>ÁREA (M²)</span>
                </>
              ) : (
                <>
                  <span>MARCA</span>
                  <span>MODELO</span>
                  <span>CANTIDAD</span>
                  <span>TIPO</span>
                </>
              )}
              <span></span>
            </div>
            
            {loading ? (
              <p style={{textAlign: 'center', color: 'white', padding: '20px'}}>Cargando elementos...</p>
            ) : componentes.length > 0 ? (
              componentes.map((reg) => (
                <div key={reg.id} className="rdh-table-row" style={{ gridTemplateColumns: categoriaActiva?.name === 'PINTURA' ? '1.2fr 1fr 1fr 1fr 120px' : '1fr 1fr 0.5fr 1fr 120px' }}>
                  {categoriaActiva?.name === 'PINTURA' ? (
                    <>
                      <span data-label="Tono" style={{ fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        {(() => {
                          const colorHex = obtenerColorHex(reg.model_or_color) || obtenerColorHex(reg.serial_number);
                          if (colorHex) {
                            return (
                              <span 
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: colorHex,
                                  border: '2px solid white',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                                  display: 'inline-block',
                                  flexShrink: 0
                                }} 
                                title={`Color detectado: ${colorHex}`}
                              />
                            );
                          }
                          return <span style={{ fontSize: '1.2rem' }}>🎨</span>;
                        })()}
                        {reg.model_or_color || 'N/A'}
                      </span>
                      <span data-label="Marca">{reg.brand || 'N/A'}</span>
                      <span data-label="Clave">{reg.serial_number || 'N/A'}</span>
                      <span data-label="Área" style={{ fontWeight: 'bold' }}>{reg.quantity} m²</span>
                    </>
                  ) : (
                    <>
                      <span data-label="Marca">{reg.brand || 'N/A'}</span>
                      <span data-label="Modelo">{reg.model_or_color || 'N/A'}</span>
                      <span data-label="Cantidad">{reg.quantity}</span>
                      <span data-label="Tipo">{reg.sub_category}</span>
                    </>
                  )}
                  
                  {/* SECCIÓN DE BOTONES: DETALLE, EDITAR Y ELIMINAR */}
                  <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                    <button onClick={() => setItemDetalle(reg)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#333'}} title="Ver Detalles">
                      <Eye size={20} />
                    </button>
                    <button onClick={() => abrirModalEdicion(reg)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#333'}} title="Editar">
                      <Edit3 size={20} />
                    </button>
                    <button onClick={() => eliminarComponente(reg.id)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4d'}} title="Eliminar">
                      <Trash2 size={20} className="rdh-icon-del" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p style={{textAlign: 'center', color: '#ccc', fontStyle: 'italic', padding: '20px'}}>
                No hay elementos registrados en {categoriaActiva?.name}.
              </p>
            )}
          </div>

          <div className="rdh-side-controls">
            <button className="rdh-btn-plus-sq" onClick={abrirModalCreacion}>
              <Plus size={35} strokeWidth={4} />
            </button>
          </div>
        </div>
      </div>

      <div className="rdh-actions-outer">
        <button className="rdh-btn-save-3d" onClick={alVolver}>GUARDAR CATEGORÍA</button>
      </div>

      {/* MODAL CON FOTO, GALERÍA, SERIE Y COMENTARIOS */}
      {isModalOpen && (
        <div className="rdh-modal-overlay">
          <div className="rdh-modal-content" style={{ width: '500px', maxWidth: '95vw', backgroundColor: '#f8fafc' }}>
            <button className="rdh-modal-close" onClick={() => setIsModalOpen(false)}>
              <X size={24} strokeWidth={3} />
            </button>
            
            {/* TÍTULO DINÁMICO */}
            <h2 className="rdh-modal-title" style={{ color: '#1e293b' }}>
              {modoEdicion 
                ? (categoriaActiva?.name === 'PINTURA' ? 'EDITAR COLORIMETRÍA' : 'EDITAR PRODUCTO') 
                : (categoriaActiva?.name === 'PINTURA' ? 'NUEVA COLORIMETRÍA / PINTURA' : 'NUEVO PRODUCTO')
              }
            </h2>
            
            <div className="rdh-modal-form" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '10px' }}>
              {/* AIRE ACONDICIONADO: formulario sencillo o con ficha técnica (como calculadora básica / científica) */}
              {esAire && (
                <div className="rdh-ficha">
                  <div className="rdh-ficha-switch" role="tablist" aria-label="Tipo de formulario">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!mostrarFicha}
                      className={!mostrarFicha ? 'active' : ''}
                      onClick={() => setMostrarFicha(false)}
                    >
                      Sencillo
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mostrarFicha}
                      className={mostrarFicha ? 'active' : ''}
                      onClick={() => setMostrarFicha(true)}
                    >
                      <SlidersHorizontal size={14} /> Ficha técnica
                      {camposFichaLlenos > 0 && <span className="rdh-ficha-count">{camposFichaLlenos}</span>}
                    </button>
                  </div>

                  {mostrarFicha && (
                    <div className="rdh-ficha-panel">
                      <p className="rdh-ficha-hint">Todos los campos son opcionales.</p>
                      <div className="rdh-ficha-grid">
                        {FICHA_AIRE.map(campo => (
                          <div key={campo.key} className="rdh-ficha-field">
                            <label htmlFor={`ficha-${campo.key}`}>{campo.label}</label>
                            {campo.type === 'select' ? (
                              <select
                                id={`ficha-${campo.key}`}
                                className="rdh-modal-input"
                                value={ficha[campo.key] || ''}
                                onChange={(e) => setFicha({ ...ficha, [campo.key]: e.target.value })}
                              >
                                <option value="">—</option>
                                {campo.options.map(op => <option key={op} value={op}>{op}</option>)}
                              </select>
                            ) : (
                              <>
                                <input
                                  id={`ficha-${campo.key}`}
                                  type={campo.type === 'number' ? 'number' : 'text'}
                                  className="rdh-modal-input"
                                  placeholder={campo.placeholder}
                                  list={campo.type === 'datalist' ? `ficha-list-${campo.key}` : undefined}
                                  value={ficha[campo.key] || ''}
                                  onChange={(e) => setFicha({ ...ficha, [campo.key]: e.target.value.toUpperCase() })}
                                />
                                {campo.type === 'datalist' && (
                                  <datalist id={`ficha-list-${campo.key}`}>
                                    {campo.options.map(op => <option key={op} value={op} />)}
                                  </datalist>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              
              {/* === NUEVA SECCIÓN DE FOTOS (PRINCIPAL + GALERÍA) === */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
                
              {/* FOTO PRINCIPAL (ACTUALIZADA CON BOTÓN DE ICONO) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div 
                    className="rdh-foto-box"
                    onClick={() => document.getElementById('fotoProducto').click()}
                  >
                    {previewImg ? (
                      <img src={previewImg} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <ImageIcon size={40} color="#ccc" />
                        <span style={{ fontSize: '10px', color: '#ccc', marginTop: '5px', fontWeight: 'bold', textAlign: 'center' }}>
                          {modoEdicion ? 'CAMBIAR FOTO' : 'FOTO PRINCIPAL'}
                        </span>
                      </>
                    )}
                  </div>
                  <input type="file" id="fotoProducto" hidden accept="image/*" onChange={handleFileSelect} />
                  
                  {/* BOTÓN CONSOLIDADO DE QUITAR FOTO NUEVA (compacto y rojo) */}
                  {selectedFile && (
                    <div style={{ display: 'flex', marginTop: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedFile(null); // Limpiamos el archivo seleccionado
                          
                          // Lógica de reseteo inteligente
                          if (modoEdicion) {
                            const itemOriginal = componentes.find(c => c.id === idEditando);
                            setPreviewImg(itemOriginal?.image_path || null);
                          } else {
                            setPreviewImg(null);
                          }
                          
                          // Reseteamos el input file
                          document.getElementById('fotoProducto').value = "";
                        }} 
                        title="Quitar foto nueva" // Texto para accesibilidad
                        style={{ 
                          background: '#e02424', // Un rojo más intenso para el botón
                          border: 'none', 
                          color: 'white', 
                          cursor: 'pointer', 
                          borderRadius: '50%', // Lo hace un círculo perfecto
                          width: '32px', // Tamaño compacto
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)' // Pequeña sombra para realzarlo
                        }}
                      >
                        <X size={18} strokeWidth={3} /> {/* La 'X' blanca centradita */}
                      </button>
                    </div>
                  )}
                </div>
              {/* FOTOS DE GALERÍA (EXTRA) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div 
                    className="rdh-gallery-box"
                    title="Agregar fotos extra"
                    onClick={() => document.getElementById('fotoGaleria').click()}
                    style={{ position: 'relative', overflow: 'hidden', padding: (galeriaArchivos.length > 0 || galeriaExistente.length > 0) ? '5px' : '0' }}
                  >
                    {(galeriaArchivos.length > 0 || galeriaExistente.length > 0) ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', width: '100%', height: '100%', justifyContent: 'center', alignContent: 'center' }}>
                        
                        {/* Mostrar fotos limpias de la BD */}
                        {galeriaExistente.map((foto, i) => (
                           <div 
                             key={`ex-${i}`} 
                             style={{ 
                               position: 'relative', 
                               width: (galeriaArchivos.length + galeriaExistente.length) > 1 ? '45%' : '90%', 
                               height: (galeriaArchivos.length + galeriaExistente.length) > 1 ? '45%' : '90%'
                             }}
                           >
                             <img 
                               src={foto.image_path} 
                               alt={`galeria-bd-${i}`} 
                               style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px' }} 
                             />
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setGaleriaExistente(prev => prev.filter((_, idx) => idx !== i));
                                 setRemovedGalleryIds(prev => [...prev, foto.id]);
                               }}
                               title="Eliminar foto"
                               style={{
                                 position: 'absolute',
                                 top: '-2px',
                                 right: '-2px',
                                 background: '#e02424',
                                 color: '#ffffff',
                                 border: '1px solid #ffffff',
                                 borderRadius: '50%',
                                 width: '16px',
                                 height: '16px',
                                 cursor: 'pointer',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 fontSize: '11px',
                                 fontWeight: 'bold',
                                 zIndex: 10,
                                 boxShadow: '0px 1px 3px rgba(0,0,0,0.3)',
                                 padding: 0,
                                 lineHeight: 1
                               }}
                             >
                               ×
                             </button>
                           </div>
                        ))}

                        {/* Mostrar fotos recién seleccionadas */}
                        {galeriaArchivos.slice(0, 4 - galeriaExistente.length).map((file, i) => (
                           <div 
                             key={`new-${i}`} 
                             style={{ 
                               position: 'relative', 
                               width: (galeriaArchivos.length + galeriaExistente.length) > 1 ? '45%' : '90%', 
                               height: (galeriaArchivos.length + galeriaExistente.length) > 1 ? '45%' : '90%'
                             }}
                           >
                             <img 
                               src={URL.createObjectURL(file)} 
                               alt={`galeria-new-${i}`} 
                               style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px' }} 
                             />
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setGaleriaArchivos(prev => prev.filter((_, idx) => idx !== i));
                               }}
                               title="Eliminar foto nueva"
                               style={{
                                 position: 'absolute',
                                 top: '-2px',
                                 right: '-2px',
                                 background: '#e02424',
                                 color: '#ffffff',
                                 border: '1px solid #ffffff',
                                 borderRadius: '50%',
                                 width: '16px',
                                 height: '16px',
                                 cursor: 'pointer',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 fontSize: '11px',
                                 fontWeight: 'bold',
                                 zIndex: 10,
                                 boxShadow: '0px 1px 3px rgba(0,0,0,0.3)',
                                 padding: 0,
                                 lineHeight: 1
                               }}
                             >
                               ×
                             </button>
                           </div>
                        ))}

                      </div>
                    ) : (
                      <>
                        <Plus size={40} color="#ccc" className="gallery-icon" />
                        <span className="gallery-text" style={{ fontSize: '10px', color: '#ccc', marginTop: '5px', fontWeight: 'bold', textAlign: 'center' }}>
                          AGREGAR MÁS
                        </span>
                      </>
                    )}
                  </div>
                  {/* Atributo 'multiple' permite seleccionar varios archivos a la vez */}
                  <input type="file" id="fotoGaleria" hidden accept="image/*" multiple onChange={(e) => { handleGallerySelect(e); e.target.value = null; }} />
                  


                  {/* TEXTO INDICADOR DE CUÁNTAS FOTOS HAY EN TOTAL */}
                  {(galeriaArchivos.length > 0 || galeriaExistente.length > 0) && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#f26624', fontWeight: 'bold' }}>
                        {(galeriaArchivos.length + galeriaExistente.length)} fotos extra
                      </span>
                    </div>
                  )}

                  {/* BOTÓN CONSOLIDADO DE QUITAR FOTOS NUEVAS (compacto y rojo) */}

                  {galeriaArchivos.length > 0 && (
                    <div style={{ display: 'flex', marginTop: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setGaleriaArchivos([]); // Limpia solo las fotos nuevas en memoria
                        }} 
                        title="Quitar fotos nuevas"
                        style={{ 
                          background: '#e02424', 
                          border: 'none', 
                          color: 'white', 
                          cursor: 'pointer', 
                          borderRadius: '50%', 
                          width: '32px', 
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)' 
                        }}
                      >
                        <X size={18} strokeWidth={3} />
                      </button>
                    </div>
                  )}
                </div>


              </div>


              {categoriaActiva?.name === 'PINTURA' ? (
                <>
                  <div className="rdh-modal-field">
                    <label style={{ color: '#1e293b' }}>TONO *</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                      <input 
                        type="text" 
                        className="rdh-modal-input" 
                        placeholder="Ej. BLANCO OSTIÓN, GRIS" 
                        value={nuevoRegistro.model_or_color} 
                        onChange={(e) => setNuevoRegistro({...nuevoRegistro, model_or_color: e.target.value.toUpperCase()})}
                        style={{ flex: 1 }}
                      />
                      {(() => {
                        const colorHex = obtenerColorHex(nuevoRegistro.model_or_color) || obtenerColorHex(nuevoRegistro.serial_number);
                        if (colorHex) {
                          return (
                            <div 
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: colorHex,
                                border: '2px solid white',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                flexShrink: 0
                              }} 
                              title={`Color detectado: ${colorHex}`}
                            />
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="rdh-modal-field">
                    <label style={{ color: '#1e293b' }}>MARCA</label>
                    <input 
                      type="text" 
                      className="rdh-modal-input" 
                      placeholder="Ej. COMEX, SHERWIN" 
                      value={nuevoRegistro.brand} 
                      onChange={(e) => setNuevoRegistro({...nuevoRegistro, brand: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="rdh-modal-field">
                    <label style={{ color: '#1e293b' }}>CLAVE</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                      <input 
                        type="text" 
                        className="rdh-modal-input" 
                        placeholder="Ej. #FF5733 o código..." 
                        value={nuevoRegistro.serial_number} 
                        onChange={(e) => setNuevoRegistro({...nuevoRegistro, serial_number: e.target.value.toUpperCase()})}
                        style={{ flex: 1 }}
                      />
                      {(() => {
                        const colorHex = obtenerColorHex(nuevoRegistro.serial_number);
                        if (colorHex) {
                          return (
                            <div 
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: colorHex,
                                border: '2px solid white',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                flexShrink: 0
                              }} 
                              title={`Color detectado: ${colorHex}`}
                            />
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="rdh-modal-field">
                    <label style={{ color: '#1e293b' }}>M² *</label>
                    <input 
                      type="number" 
                      min="0.01" 
                      step="0.01" 
                      className="rdh-modal-input" 
                      placeholder="Metros cuadrados"
                      value={nuevoRegistro.quantity} 
                      onChange={(e) => setNuevoRegistro({...nuevoRegistro, quantity: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="rdh-modal-field">
                    <label>TIPO *</label>
                    <input type="text" className="rdh-modal-input" placeholder="Ej. ENCHUFE, FOCO" value={nuevoRegistro.sub_category} onChange={(e) => setNuevoRegistro({...nuevoRegistro, sub_category: e.target.value.toUpperCase()})}/>
                  </div>
                  <div className="rdh-modal-field">
                    <label>MARCA</label>
                    <input type="text" className="rdh-modal-input" value={nuevoRegistro.brand} onChange={(e) => setNuevoRegistro({...nuevoRegistro, brand: e.target.value.toUpperCase()})}/>
                  </div>
                  <div className="rdh-modal-field">
                    <label>MODELO</label>
                    <input type="text" className="rdh-modal-input" value={nuevoRegistro.model_or_color} onChange={(e) => setNuevoRegistro({...nuevoRegistro, model_or_color: e.target.value.toUpperCase()})}/>
                  </div>
                  <div className="rdh-modal-field">
                    <label>NO. SERIE</label>
                    <input type="text" className="rdh-modal-input" placeholder="S/N" value={nuevoRegistro.serial_number} onChange={(e) => setNuevoRegistro({...nuevoRegistro, serial_number: e.target.value.toUpperCase()})}/>
                  </div>
                  <div className="rdh-modal-field">
                    <label>CANTIDAD *</label>
                    <input type="number" min="0.1" step="0.1" className="rdh-modal-input" value={nuevoRegistro.quantity} onChange={(e) => setNuevoRegistro({...nuevoRegistro, quantity: e.target.value})}/>
                  </div>
                </>
              )}


              <div className="rdh-modal-field" style={{ alignItems: 'flex-start' }}>
                <label style={{ marginTop: '15px' }}>COMENTARIOS</label>
                <textarea 
                  className="rdh-modal-input" 
                  style={{ height: 'auto', paddingTop: '10px', resize: 'vertical', minHeight: '60px' }}
                  rows="3" 
                  placeholder="Detalla daños o notas especiales..."
                  value={nuevoRegistro.observations} 
                  onChange={(e) => setNuevoRegistro({...nuevoRegistro, observations: e.target.value})}
                />
              </div>

              <div className="rdh-modal-btn-container" style={{ marginTop: '20px' }}>
                <button className="rdh-btn-save-3d modal-btn" onClick={guardarComponente} disabled={guardando}>
                  {guardando ? <Loader2 size={20} className="animate-spin" /> : (modoEdicion ? 'ACTUALIZAR' : 'GUARDAR')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES DEL PRODUCTO */}
      {itemDetalle && (
        <div className="rdh-modal-overlay">
          <div className="rdh-modal-content" style={{ width: '850px', maxWidth: '95vw' }}>
            <button className="rdh-modal-close" onClick={() => setItemDetalle(null)}>
              <X size={24} strokeWidth={3} />
            </button>
            <h2 className="rdh-modal-title" style={{ marginBottom: '15px' }}>DETALLES DEL PRODUCTO</h2>
            
            <div className="rdh-modal-form" style={{ display: 'flex', gap: '30px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
              
              {/* COLUMNA IZQUIERDA: FOTOS EN FILA */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '15px', color: '#333' }}>FOTOS DEL PRODUCTO:</label>
                
                {fotosItem.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                    {fotosItem.map((url, i) => (
                      <img 
                        key={i} 
                        src={url} 
                        alt="foto" 
                        onClick={() => setImagenAmpliada(url)}
                        title="Clic para agrandar"
                        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #ccc', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} 
                        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{width: '100%', height: '120px', backgroundColor: '#999', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <span style={{color: '#fff', fontWeight: 'bold'}}>SIN FOTOS REGISTRADAS</span>
                  </div>
                )}
              </div>

              {/* COLUMNA DERECHA: DATOS */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#999', padding: '25px', borderRadius: '15px', color: 'white', justifyContent: 'flex-start' }}>
                {categoriaActiva?.name === 'PINTURA' ? (
                  <>
                    <div style={{ fontSize: '15px' }}><strong style={{color: '#fff'}}>TONO / COLOR:</strong> {itemDetalle.model_or_color || 'N/A'}</div>
                    <div style={{ fontSize: '15px' }}><strong style={{color: '#fff'}}>MARCA:</strong> {itemDetalle.brand || 'N/A'}</div>
                    <div style={{ fontSize: '15px' }}><strong style={{color: '#fff'}}>CLAVE / FÓRMULA:</strong> {itemDetalle.serial_number || 'N/A'}</div>
                    <div style={{ fontSize: '15px' }}><strong style={{color: '#fff'}}>ÁREA ESTIMADA:</strong> {itemDetalle.quantity} m²</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '15px' }}><strong style={{color: '#fff'}}>TIPO:</strong> {itemDetalle.sub_category}</div>
                    <div style={{ fontSize: '15px' }}><strong style={{color: '#fff'}}>MARCA:</strong> {itemDetalle.brand || 'N/A'}</div>
                    <div style={{ fontSize: '15px' }}><strong style={{color: '#fff'}}>MODELO:</strong> {itemDetalle.model_or_color || 'N/A'}</div>
                    <div style={{ fontSize: '15px' }}><strong style={{color: '#fff'}}>NO. SERIE:</strong> {itemDetalle.serial_number || 'S/N'}</div>
                    <div style={{ fontSize: '15px' }}><strong style={{color: '#fff'}}>CANTIDAD:</strong> {itemDetalle.quantity}</div>
                    {(() => {
                      const specs = parseSpecs(itemDetalle.specs);
                      const filas = FICHA_AIRE.filter(c => specs[c.key]);
                      if (filas.length === 0) return null;
                      return (
                        <div className="rdh-ficha-detalle">
                          <strong>FICHA TÉCNICA</strong>
                          {filas.map(c => (
                            <div key={c.key}><span>{c.label}:</span> {specs[c.key]}</div>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}
                <div style={{ marginTop: '10px', fontSize: '15px' }}><strong style={{color: '#fff'}}>OBSERVACIONES:</strong></div>
                <div style={{ backgroundColor: '#777', padding: '15px', borderRadius: '10px', minHeight: '80px', fontStyle: 'italic', fontSize: '14px', overflowY: 'auto' }}>
                  {itemDetalle.observations || 'Sin observaciones del técnico.'}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PARA IMAGEN AMPLIADA */}
      {imagenAmpliada && (
        <div 
          onClick={() => setImagenAmpliada(null)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
        >
          <img src={imagenAmpliada} alt="Zoom" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
          <button 
             onClick={() => setImagenAmpliada(null)} 
             style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
             <X size={40} />
          </button>
        </div>
      )}

      </div>
    </>
  );
};

export default RegistroDetalleHabitacion;
