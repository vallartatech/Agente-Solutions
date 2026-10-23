import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import "../../../styles/AgenteMarket/Tecnico/RegistroDetalleHabitacion.css";
import "../../../styles/AgenteMarket/Admin/VistaPropiedadesBase.css";
import "../../../styles/Shared/LiquidGlass.css";
import "../../../styles/AgenteMarket/Tecnico/LevantamientoZonas.css";
import { ArrowLeft, Plus, Trash2, X, Loader2, ImageIcon, Edit3, Eye, SlidersHorizontal, Wrench, Camera, Tag, Hash, Ruler, Palette, Package, Box, Layers, MessageSquare } from 'lucide-react';
import Header from '../../../components/Shared/Header';
import RutaLevantamiento from './RutaLevantamiento';
import { mostrarAviso, confirmarAccion } from '../../../utils/dialogos';

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

const RegistroDetalleHabitacion = ({ habitacion, categoriaActiva, propertyCurp, alVolver, ruta }) => {
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
      if (!nuevoRegistro.model_or_color) return mostrarAviso("El campo TONO es obligatorio.");
    } else {
      if (!subCat) return mostrarAviso("El campo TIPO es obligatorio.");
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
      mostrarAviso("Hubo un error al guardar el elemento.");
    } finally {
      setGuardando(false);
    }
  };
  
  const eliminarComponente = async (id) => {
    if(await confirmarAccion("¿Seguro que deseas eliminar este elemento?")) {
      try {
        // ✅ INYECTAR TOKEN AL ELIMINAR
        const token = localStorage.getItem('agente_token');
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-components/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchComponentes();
      } catch (error) {
        mostrarAviso("Error al eliminar");
      }
    }
  };

  // ✅ CORRECCIÓN: Armar el array de fotos usando las URLs limpias
  const fotosItem = itemDetalle ? [
    ...(itemDetalle.image_path ? [itemDetalle.image_path] : []),
    ...(itemDetalle.galleries ? itemDetalle.galleries.map(g => g.image_path) : [])
  ] : [];

  const esPintura = categoriaActiva?.name === 'PINTURA';
  const columnas = esPintura ? '1.3fr 1fr 1fr 0.8fr 130px' : '1fr 1fr 0.6fr 1fr 130px';
  const rutaCategoria = [
    ...(ruta || [{ label: habitacion?.name || 'Área', onClick: alVolver }]),
    { label: categoriaActiva?.name || 'Categoría', Icon: Wrench },
  ];

  return (
    <div className="lz-page">
      <Header />
      <main className="lz-container">
        <RutaLevantamiento items={rutaCategoria} />

        {/* ENCABEZADO: área + categoría */}
        <section className="lz-card lz-hero">
          <div className="lz-hero-info">
            <span className="lz-hero-icon"><Wrench size={24} /></span>
            <div className="lz-hero-textos">
              <h1>{categoriaActiva?.name || "CATEGORÍA"}</h1>
              <p>{habitacion?.name || "HABITACIÓN PRINCIPAL"}</p>
              <div className="lz-chips">
                <span className="lz-chip">CURP <strong>{propertyCurp || "S/N"}</strong></span>
                <span className="lz-chip">ID área <strong>{habitacion?.id}</strong></span>
                <span className="lz-chip naranja">{componentes.length} {componentes.length === 1 ? 'elemento' : 'elementos'}</span>
              </div>
            </div>
          </div>
          <div className="lz-acciones">
            <button type="button" className="lz-btn lz-btn-glass" onClick={alVolver}>
              <ArrowLeft size={18} /> <span className="lz-btn-txt">Volver</span>
            </button>
            <button type="button" className="lz-btn lz-btn-primary" onClick={abrirModalCreacion}>
              <Plus size={18} strokeWidth={2.8} /> {esPintura ? 'Agregar color' : 'Agregar elemento'}
            </button>
          </div>
        </section>

        {/* TABLA DE ELEMENTOS */}
        <section className="lz-card lz-panel">
          {loading ? (
            <div className="lz-vacio"><Loader2 size={28} className="animate-spin" /><p>Cargando elementos...</p></div>
          ) : componentes.length > 0 ? (
            <div className="lz-tabla">
              <div className="lz-tabla-cab" style={{ gridTemplateColumns: columnas }}>
                {esPintura ? (
                  <><span>Tono / color</span><span>Marca</span><span>Clave / fórmula</span><span>Área (m²)</span></>
                ) : (
                  <><span>Marca</span><span>Modelo</span><span>Cantidad</span><span>Tipo</span></>
                )}
                <span></span>
              </div>

              {componentes.map((reg) => (
                <div key={reg.id} className="lz-tabla-fila" style={{ gridTemplateColumns: columnas }}>
                  {esPintura ? (
                    <>
                      <span data-label="Tono" style={{ fontWeight: 800, color: '#0f172a' }}>
                        {(() => {
                          const colorHex = obtenerColorHex(reg.model_or_color) || obtenerColorHex(reg.serial_number);
                          return colorHex
                            ? <span className="lz-color" style={{ backgroundColor: colorHex }} title={`Color detectado: ${colorHex}`} />
                            : <span style={{ marginRight: '6px' }}>🎨</span>;
                        })()}
                        {reg.model_or_color || 'N/A'}
                      </span>
                      <span data-label="Marca">{reg.brand || 'N/A'}</span>
                      <span data-label="Clave">{reg.serial_number || 'N/A'}</span>
                      <span data-label="Área" style={{ fontWeight: 800 }}>{reg.quantity} m²</span>
                    </>
                  ) : (
                    <>
                      <span data-label="Marca" style={{ fontWeight: 800, color: '#0f172a' }}>{reg.brand || 'N/A'}</span>
                      <span data-label="Modelo">{reg.model_or_color || 'N/A'}</span>
                      <span data-label="Cantidad">{reg.quantity}</span>
                      <span data-label="Tipo">{reg.sub_category}</span>
                    </>
                  )}

                  {/* DETALLE, EDITAR Y ELIMINAR */}
                  <div className="lz-tabla-acciones">
                    <button type="button" className="lz-icon-btn" onClick={() => setItemDetalle(reg)} title="Ver detalles">
                      <Eye size={16} />
                    </button>
                    <button type="button" className="lz-icon-btn" onClick={() => abrirModalEdicion(reg)} title="Editar">
                      <Edit3 size={16} />
                    </button>
                    <button type="button" className="lz-icon-btn peligro" onClick={() => eliminarComponente(reg.id)} title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="lz-vacio">
              <Wrench size={40} />
              <p>No hay elementos registrados en {categoriaActiva?.name}.</p>
              <button type="button" className="lz-btn lz-btn-primary" onClick={abrirModalCreacion}>
                <Plus size={18} strokeWidth={2.8} /> {esPintura ? 'Agregar color' : 'Agregar elemento'}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* MODAL CON FOTO, GALERÍA, SERIE Y COMENTARIOS */}
      {isModalOpen && (
        <div className="rp-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="rp-modal lz-modal-producto" onClick={(e) => e.stopPropagation()}>
            <div className="rp-header">
              <div className="rp-header-text">
                <span className="rp-tag">{categoriaActiva?.name || 'CATEGORÍA'}</span>
                {/* TÍTULO DINÁMICO */}
                <h2 className="rp-title">
                  {modoEdicion
                    ? (esPintura ? 'Editar colorimetría' : 'Editar producto')
                    : (esPintura ? 'Nueva colorimetría' : 'Nuevo producto')}
                </h2>
              </div>
              <button type="button" className="rp-close" onClick={() => setIsModalOpen(false)} aria-label="Cerrar">
                <X size={18} strokeWidth={2.6} />
              </button>
            </div>

            <div className="rp-form">
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

              {/* FOTOS: principal + galería */}
              <div className="rp-group">
                <label className="rp-label"><Camera size={16} color="#ff8c42" /> Fotos</label>
                <input type="file" id="fotoProducto" hidden accept="image/*" onChange={handleFileSelect} />
                <input type="file" id="fotoGaleria" hidden accept="image/*" multiple onChange={(e) => { handleGallerySelect(e); e.target.value = null; }} />

                <div className="lz-fotos-prod">
                  {/* FOTO PRINCIPAL */}
                  {previewImg ? (
                    <div className="lz-foto-tile" onClick={() => document.getElementById('fotoProducto').click()} title="Cambiar foto principal">
                      <img src={previewImg} alt="Foto principal" />
                      <span className="lz-foto-badge">Principal</span>
                      {selectedFile && (
                        <button
                          type="button"
                          className="lz-foto-quitar"
                          title="Quitar foto nueva"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            // Lógica de reseteo inteligente
                            if (modoEdicion) {
                              const itemOriginal = componentes.find(c => c.id === idEditando);
                              setPreviewImg(itemOriginal?.image_path || null);
                            } else {
                              setPreviewImg(null);
                            }
                            document.getElementById('fotoProducto').value = "";
                          }}
                        >
                          <X size={13} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button type="button" className="lz-foto-tile vacia" onClick={() => document.getElementById('fotoProducto').click()}>
                      <span className="lz-fuente-icono naranja"><Camera size={18} /></span>
                      <small>{modoEdicion ? 'Cambiar foto' : 'Foto principal'}</small>
                    </button>
                  )}

                  {/* FOTOS DE GALERÍA YA GUARDADAS */}
                  {galeriaExistente.map((foto, i) => (
                    <div key={`ex-${i}`} className="lz-foto-tile">
                      <img src={foto.image_path} alt={`galeria-bd-${i}`} />
                      <button
                        type="button"
                        className="lz-foto-quitar"
                        title="Eliminar foto"
                        onClick={() => {
                          setGaleriaExistente(prev => prev.filter((_, idx) => idx !== i));
                          setRemovedGalleryIds(prev => [...prev, foto.id]);
                        }}
                      >
                        <X size={13} strokeWidth={3} />
                      </button>
                    </div>
                  ))}

                  {/* FOTOS DE GALERÍA RECIÉN SELECCIONADAS */}
                  {galeriaArchivos.slice(0, 4 - galeriaExistente.length).map((file, i) => (
                    <div key={`new-${i}`} className="lz-foto-tile">
                      <img src={URL.createObjectURL(file)} alt={`galeria-new-${i}`} />
                      <button
                        type="button"
                        className="lz-foto-quitar"
                        title="Eliminar foto nueva"
                        onClick={() => setGaleriaArchivos(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <X size={13} strokeWidth={3} />
                      </button>
                    </div>
                  ))}

                  <button type="button" className="lz-foto-tile vacia" onClick={() => document.getElementById('fotoGaleria').click()} title="Agregar fotos extra">
                    <span className="lz-fuente-icono azul"><Plus size={18} strokeWidth={2.8} /></span>
                    <small>Agregar más</small>
                  </button>
                </div>

                {(galeriaArchivos.length > 0 || galeriaExistente.length > 0) && (
                  <small className="lz-fotos-nota">
                    {galeriaArchivos.length + galeriaExistente.length} {galeriaArchivos.length + galeriaExistente.length === 1 ? 'foto extra' : 'fotos extra'}
                  </small>
                )}
              </div>

              {esPintura ? (
                <>
                  <div className="rp-group">
                    <label className="rp-label"><Palette size={16} color="#ff8c42" /> Tono *</label>
                    <div className="lz-input-color">
                      <input
                        type="text"
                        className="lz-input"
                        placeholder="Ej. BLANCO OSTIÓN, GRIS"
                        value={nuevoRegistro.model_or_color}
                        onChange={(e) => setNuevoRegistro({...nuevoRegistro, model_or_color: e.target.value.toUpperCase()})}
                      />
                      {(() => {
                        const colorHex = obtenerColorHex(nuevoRegistro.model_or_color) || obtenerColorHex(nuevoRegistro.serial_number);
                        return colorHex ? <span className="lz-swatch" style={{ backgroundColor: colorHex }} title={`Color detectado: ${colorHex}`} /> : null;
                      })()}
                    </div>
                  </div>
                  <div className="rp-group">
                    <label className="rp-label"><Tag size={16} color="#ff8c42" /> Marca</label>
                    <input
                      type="text"
                      className="lz-input"
                      placeholder="Ej. COMEX, SHERWIN"
                      value={nuevoRegistro.brand}
                      onChange={(e) => setNuevoRegistro({...nuevoRegistro, brand: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="rp-group">
                    <label className="rp-label"><Hash size={16} color="#ff8c42" /> Clave</label>
                    <div className="lz-input-color">
                      <input
                        type="text"
                        className="lz-input"
                        placeholder="Ej. #FF5733 o código..."
                        value={nuevoRegistro.serial_number}
                        onChange={(e) => setNuevoRegistro({...nuevoRegistro, serial_number: e.target.value.toUpperCase()})}
                      />
                      {(() => {
                        const colorHex = obtenerColorHex(nuevoRegistro.serial_number);
                        return colorHex ? <span className="lz-swatch" style={{ backgroundColor: colorHex }} title={`Color detectado: ${colorHex}`} /> : null;
                      })()}
                    </div>
                  </div>
                  <div className="rp-group">
                    <label className="rp-label"><Ruler size={16} color="#ff8c42" /> M² *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="lz-input"
                      placeholder="Metros cuadrados"
                      value={nuevoRegistro.quantity}
                      onChange={(e) => setNuevoRegistro({...nuevoRegistro, quantity: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="rp-group">
                    <label className="rp-label"><Package size={16} color="#ff8c42" /> Tipo *</label>
                    <input type="text" className="lz-input" placeholder="Ej. ENCHUFE, FOCO" value={nuevoRegistro.sub_category} onChange={(e) => setNuevoRegistro({...nuevoRegistro, sub_category: e.target.value.toUpperCase()})}/>
                  </div>
                  <div className="lz-campos-2">
                    <div className="rp-group">
                      <label className="rp-label"><Tag size={16} color="#ff8c42" /> Marca</label>
                      <input type="text" className="lz-input" value={nuevoRegistro.brand} onChange={(e) => setNuevoRegistro({...nuevoRegistro, brand: e.target.value.toUpperCase()})}/>
                    </div>
                    <div className="rp-group">
                      <label className="rp-label"><Box size={16} color="#ff8c42" /> Modelo</label>
                      <input type="text" className="lz-input" value={nuevoRegistro.model_or_color} onChange={(e) => setNuevoRegistro({...nuevoRegistro, model_or_color: e.target.value.toUpperCase()})}/>
                    </div>
                  </div>
                  <div className="lz-campos-2">
                    <div className="rp-group">
                      <label className="rp-label"><Hash size={16} color="#ff8c42" /> No. serie</label>
                      <input type="text" className="lz-input" placeholder="S/N" value={nuevoRegistro.serial_number} onChange={(e) => setNuevoRegistro({...nuevoRegistro, serial_number: e.target.value.toUpperCase()})}/>
                    </div>
                    <div className="rp-group">
                      <label className="rp-label"><Layers size={16} color="#ff8c42" /> Cantidad *</label>
                      <input type="number" min="0.1" step="0.1" className="lz-input" value={nuevoRegistro.quantity} onChange={(e) => setNuevoRegistro({...nuevoRegistro, quantity: e.target.value})}/>
                    </div>
                  </div>
                </>
              )}

              <div className="rp-group">
                <label className="rp-label"><MessageSquare size={16} color="#ff8c42" /> Comentarios</label>
                <textarea
                  rows="3"
                  placeholder="Detalla daños o notas especiales..."
                  value={nuevoRegistro.observations}
                  onChange={(e) => setNuevoRegistro({...nuevoRegistro, observations: e.target.value})}
                />
              </div>

              <div className="rp-footer lz-modal-pie">
                <button type="button" className="lz-btn lz-btn-glass" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="lz-btn lz-btn-primary" onClick={guardarComponente} disabled={guardando}>
                  {guardando ? <Loader2 size={18} className="animate-spin" /> : (modoEdicion ? 'Actualizar' : 'Guardar')}
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
                <label style={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.5px', marginBottom: '12px', color: '#475569' }}>FOTOS DEL PRODUCTO</label>
                
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
                  <div className="lz-foto-vacia" style={{ height: '120px', cursor: 'default' }}>
                    <ImageIcon size={30} /> SIN FOTOS REGISTRADAS
                  </div>
                )}
              </div>

              {/* COLUMNA DERECHA: DATOS */}
              <div className="lz-detalle-datos">
                {categoriaActiva?.name === 'PINTURA' ? (
                  <>
                    <div style={{ fontSize: '15px' }}><strong>TONO / COLOR:</strong> {itemDetalle.model_or_color || 'N/A'}</div>
                    <div style={{ fontSize: '15px' }}><strong>MARCA:</strong> {itemDetalle.brand || 'N/A'}</div>
                    <div style={{ fontSize: '15px' }}><strong>CLAVE / FÓRMULA:</strong> {itemDetalle.serial_number || 'N/A'}</div>
                    <div style={{ fontSize: '15px' }}><strong>ÁREA ESTIMADA:</strong> {itemDetalle.quantity} m²</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '15px' }}><strong>TIPO:</strong> {itemDetalle.sub_category}</div>
                    <div style={{ fontSize: '15px' }}><strong>MARCA:</strong> {itemDetalle.brand || 'N/A'}</div>
                    <div style={{ fontSize: '15px' }}><strong>MODELO:</strong> {itemDetalle.model_or_color || 'N/A'}</div>
                    <div style={{ fontSize: '15px' }}><strong>NO. SERIE:</strong> {itemDetalle.serial_number || 'S/N'}</div>
                    <div style={{ fontSize: '15px' }}><strong>CANTIDAD:</strong> {itemDetalle.quantity}</div>
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
                <div style={{ marginTop: '10px', fontSize: '15px' }}><strong>OBSERVACIONES:</strong></div>
                <div className="lz-detalle-obs">
                  {itemDetalle.observations || 'Sin observaciones del técnico.'}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PARA IMAGEN AMPLIADA */}
      {imagenAmpliada && (
        <div className="lz-lightbox" onClick={() => setImagenAmpliada(null)}>
          <img src={imagenAmpliada} alt="Zoom" />
          <button type="button" className="lz-icon-btn" onClick={() => setImagenAmpliada(null)} aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>
      )}

    </div>
  );
};

export default RegistroDetalleHabitacion;
