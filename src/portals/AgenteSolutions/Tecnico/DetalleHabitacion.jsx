import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import "../../../styles/AgenteSolutions/Tecnico/RegistroDetalleHabitacion.css"; 
import { Plus, ArrowLeft, ImageIcon, Loader2, Edit3, Eye, X, CheckCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// IMPORTAMOS LA VISTA DEL NIVEL 5
import RegistroDetalleHabitacion from './RegistroDetalleHabitacion'; 
import Header from '../../../components/Shared/Header';

const DetalleHabitacion = ({ habitacion, propertyCurp, alVolver, servicioId }) => {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [creandoNuevaCategoria, setCreandoNuevaCategoria] = useState(false);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);

  const OPCIONES_CAT_PREDEFINIDAS = [
    "ELÉCTRICO", "PLOMERÍA", "AIRE ACONDICIONADO", "ELECTRODOMÉSTICOS", 
    "MUEBLES", "CARPINTERÍA", "PINTURA", "ILUMINACIÓN", "ACABADOS"
  ];

  // NUEVO ESTADO: Controla a qué categoría entramos
  const [categoriaActiva, setCategoriaActiva] = useState(null); 

  // ESTADOS PARA ACTUALIZACIÓN DE ZONA
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [actualizando, setActualizando] = useState(false);
  
  // HOVER EFFECT AND LIGHTBOX Y MENÚ FOTO
  const [isHovered, setIsHovered] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const cameraRef = React.useRef(null);
  const galleryRef = React.useRef(null);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);

  const openPhotoMenu = () => {
    setIsPhotoMenuOpen(true);
  };

  const selectPhotoSource = (source) => {
    if (source === 'camera') {
      cameraRef.current.click();
    } else {
      galleryRef.current.click();
    }
    setIsPhotoMenuOpen(false);
  };

  useEffect(() => {
    if (habitacion?.id) {
      fetchCategorias();
      setDescription(habitacion.description || '');
      // ✅ CORRECCIÓN: Leemos la URL directa de Cloudinary
      setPreviewImg(habitacion.image_path ? habitacion.image_path : null);
    }
  }, [habitacion]);

  const fetchCategorias = async () => {
    try {
      // ✅ INYECTAMOS EL TOKEN
      const token = localStorage.getItem('agente_token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/areas/${habitacion.id}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCategorias(res.data);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    } finally {
      setLoading(false);
    }
  };

  const guardarCategorias = async () => {
    if (categoriasSeleccionadas.length === 0 && !nuevaCategoria) {
      return alert("Selecciona al menos una categoría o escribe una nueva.");
    }

    setGuardando(true);
    const token = localStorage.getItem('agente_token');
    
    let nombresAGuardar = [...categoriasSeleccionadas];
    if (creandoNuevaCategoria && nuevaCategoria) {
      nombresAGuardar.push(nuevaCategoria);
    }

    try {
      const promesas = nombresAGuardar.map(nombre => {
        return axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-categories`, {
          property_area_id: habitacion.id,
          name: nombre
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      });

      await Promise.all(promesas);
      
      setIsModalOpen(false);
      setCategoriasSeleccionadas([]);
      setNuevaCategoria('');
      setCreandoNuevaCategoria(false);
      fetchCategorias(); 
    } catch (error) {
      console.error("Error al guardar categorías:", error);
      alert("Hubo un error al registrar las categorías.");
    } finally {
      setGuardando(false);
    }
  };

  const toggleCatSelection = (nombre) => {
    setCategoriasSeleccionadas(prev => 
      prev.includes(nombre) 
        ? prev.filter(n => n !== nombre) 
        : [...prev, nombre]
    );
  };

  const eliminarCategoria = async (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar la categoría "${name}" y todos sus equipos?`)) {
      try {
        const token = localStorage.getItem('agente_token');
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-categories/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchCategorias();
      } catch (error) {
        console.error("Error al eliminar categoría:", error);
        alert("No se pudo eliminar la categoría.");
      }
    }
  };

  const editarCategoria = async (id, oldName) => {
    const nuevoNombre = window.prompt("Ingresa el nuevo nombre para la categoría:", oldName);
    if (nuevoNombre && nuevoNombre.trim() !== "" && nuevoNombre !== oldName) {
      try {
        const token = localStorage.getItem('agente_token');
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/property-categories/${id}`, 
          { name: nuevoNombre.trim().toUpperCase() },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        fetchCategorias();
      } catch (error) {
        console.error("Error al editar categoría:", error);
        alert("No se pudo editar el nombre de la categoría.");
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewImg(URL.createObjectURL(file));
    }
  };

  const actualizarZona = async () => {
    setActualizando(true);
    const formData = new FormData();
    formData.append('_method', 'PUT');
    if (description) formData.append('description', description);
    
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      // ✅ INYECTAMOS EL TOKEN Y MULTIPART
      const token = localStorage.getItem('agente_token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${habitacion.id}`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      alert("Zona actualizada correctamente");
      alVolver(); // Volvemos después de guardar
    } catch (error) {
      console.error("Error al actualizar zona", error);
      alert("Error al actualizar la zona");
    } finally {
      setActualizando(false);
    }
  };

  const finalizarLevantamiento = async () => {
    if (!servicioId) return alert("Error: ID de servicio no encontrado.");
    if (!window.confirm("¿Seguro que deseas FINALIZAR todo el levantamiento? Esta propiedad pasará a la pestaña de finalizados.")) return;
    
    // Mostramos estado de carga general (aprovechamos actualizando)
    setActualizando(true);
    try {
      const token = localStorage.getItem('agente_token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/servicios/${servicioId}`, 
        { status: 'completed' },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      alert("¡Levantamiento finalizado con éxito!");
      navigate("/trabajos-asignados");
    } catch (error) {
       console.error(error);
       alert("No se pudo finalizar el levantamiento.");
    } finally {
       setActualizando(false);
    }
  };

  const finalizarRegistroCliente = async () => {
    try {
      const token = localStorage.getItem('agente_token');
      // Usamos el ID de la propiedad que viene en la habitacion
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/properties/${habitacion.property_id}/finalize-survey`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert("¡Registro de zonas completado con éxito! Ahora puedes solicitar servicios para estas áreas.");
      navigate(-1);
    } catch (error) {
      console.error("Error al finalizar registro:", error);
      alert("Error al enviar la notificación al administrador.");
    }
  };

  const user = JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData;
  const isClient = user?.role_id === 3;

  // ========================================================
  // PUENTE AL NIVEL 5: Si hay categoría activa, mostramos la otra vista
  // ========================================================
  if (categoriaActiva) {
    return (
      <RegistroDetalleHabitacion 
        habitacion={habitacion} 
        categoriaActiva={categoriaActiva} 
        propertyCurp={propertyCurp}
        alVolver={() => setCategoriaActiva(null)} // Al darle "VOLVER" allá, regresa aquí
      />
    );
  }

  return (
    <>
      <Header />
      <div className="dh-body-wrapper">
      <div className="dh-modal-container">
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
          <button onClick={alVolver} style={{ background: '#f26624', color: 'white', border: 'none', borderRadius: '20px', padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
            <ArrowLeft size={18} style={{ marginRight: '8px' }}/> VOLVER
          </button>
          
          <div style={{marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center'}}>
            <div className="dh-data-pill">FOLIO {propertyCurp || "S/N"}</div>
            <div className="dh-data-pill">ID ÁREA {habitacion?.id}</div>
            <div className="dh-date-box">FECHA <br /> DE REGISTRO</div>
          </div>
        </div>

        <div className="dh-main-card">
          <div className="dh-top-grid">
            <div className="dh-name-pill">
              <h3>{habitacion?.name || "HABITACIÓN PRINCIPAL"}</h3>
            </div>
            <div 
              className="dh-image-upload" 
              style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <input type="file" ref={cameraRef} hidden accept="image/*" onChange={handleFileSelect} />
              <input type="file" ref={galleryRef} hidden accept="image/*" onChange={handleFileSelect} />
              
              {previewImg ? (
                <>
                  <img src={previewImg} alt="Zona" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '15px' }} />
                  {isHovered && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                      backgroundColor: 'rgba(0,0,0,0.6)', 
                      borderRadius: '15px', 
                      display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '25px'
                    }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openPhotoMenu(); }}
                        style={{ background: 'none', border: 'none', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', padding: 0 }}
                      >
                        <Edit3 size={20} />
                        <span style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Cambiar</span>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setImagenAmpliada(previewImg); }}
                        style={{ background: 'none', border: 'none', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', padding: 0 }}
                      >
                        <Eye size={20} />
                        <span style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Visualizar</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="dh-image-placeholder" onClick={openPhotoMenu} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                  <ImageIcon size={50} color="#636363" />
                  <span style={{ fontSize: '12px', color: '#636363', marginTop: '10px', fontWeight: 'bold' }}>AGREGAR FOTO</span>
                </div>
              )}
            </div>
            <div className="dh-description-box">
              <span className="dh-label-italic">DESCRIPCIÓN</span>
              <textarea 
                className="dh-textarea" 
                placeholder="Escribe aquí los detalles generales de la habitación..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="dh-bottom-row-layout">
            <div className="dh-bottom-grid">
              <div className="dh-mantenimiento-header">
                <span className="dh-label-italic" style={{color: '#333'}}>LISTA DE MANTENIMIENTO</span>
                <button className="dh-btn-plus-small" onClick={() => setIsModalOpen(true)}>
                  <Plus size={24} strokeWidth={4} />
                </button>
              </div>

              {/* LISTA DINÁMICA DE CATEGORÍAS (Pills) */}
              <div className="dh-pills-grid">
                {loading ? (
                  <p>Cargando...</p>
                ) : categorias.length > 0 ? (
                  categorias.map((cat) => (
                    <div 
                      key={cat.id} 
                      className="dh-category-pill active" 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingRight: '15px' }}
                      onClick={() => setCategoriaActiva(cat)}
                    >
                      <span>{cat.name}</span>
                      <div style={{ display: 'flex', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                        <Edit3 size={18} style={{ cursor: 'pointer', color: 'white' }} onClick={(e) => { e.stopPropagation(); editarCategoria(cat.id, cat.name); }} />
                        <Trash2 size={18} style={{ cursor: 'pointer', color: 'white' }} onClick={(e) => { e.stopPropagation(); eliminarCategoria(cat.id, cat.name); }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ gridColumn: '1 / -1', color: '#666', fontStyle: 'italic' }}>
                    No hay categorías. Agrega "ELÉCTRICO", "PLOMERÍA", etc.
                  </p>
                )}
              </div>
            </div>

            <div className="dh-footer-actions">
              <button className="dh-btn-save-3d dh-btn-save-zone" onClick={actualizarZona} disabled={actualizando}>
                {actualizando ? <Loader2 className="animate-spin" size={24} /> : 'GUARDAR ZONA'}
              </button>
              
              {servicioId ? (
                <button 
                  onClick={finalizarLevantamiento}
                  disabled={actualizando}
                  className="dh-btn-finalizar-3d"
                >
                  <CheckCircle size={22} /> FINALIZAR LEVANTAMIENTO
                </button>
              ) : isClient ? (
                <button 
                  onClick={finalizarRegistroCliente}
                  className="dh-btn-finalizar-3d"
                >
                  <CheckCircle size={22} /> FINALIZAR MI REGISTRO
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PARA AGREGAR NUEVA CATEGORÍA */}
      {isModalOpen && createPortal(
        <div 
          className="rdh-modal-overlay" 
          onClick={() => {
            setIsModalOpen(false);
            setCreandoNuevaCategoria(false);
            setCategoriasSeleccionadas([]);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div 
            className="rdh-modal-content" 
            style={{ 
              width: '600px', 
              maxWidth: '95vw', 
              maxHeight: '86vh',
              overflowY: 'auto',
              padding: '30px',
              zIndex: 10000000,
              margin: 'auto',
              position: 'relative'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <button className="rdh-modal-close" onClick={() => {
              setIsModalOpen(false);
              setCreandoNuevaCategoria(false);
              setCategoriasSeleccionadas([]);
            }}>
              <X size={24} strokeWidth={3} />
            </button>
            <div className="rdh-modal-title" style={{ marginBottom: '20px' }}>
              <h2>NUEVA CATEGORÍA</h2>
            </div>
            
            <div className="rdh-modal-form" style={{ padding: '0 10px 10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{fontWeight: 900, fontSize: 13, marginBottom: 15, color: '#333', letterSpacing: '0.5px', textTransform: 'uppercase'}}>
                  SELECCIONA LAS CATEGORÍAS A AGREGAR
                </label>
                
                <div className="cat-multi-select-grid" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                  gap: '12px', 
                  padding: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.45)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  borderRadius: '16px',
                  marginBottom: '20px'
                }}>
                  {(() => {
                    const ICONOS_CATEGORIAS = {
                      "ELÉCTRICO": "🔌",
                      "PLOMERÍA": "🚰",
                      "AIRE ACONDICIONADO": "❄️",
                      "ELECTRODOMÉSTICOS": "📺",
                      "MUEBLES": "🪑",
                      "CARPINTERÍA": "🔨",
                      "PINTURA": "🎨",
                      "ILUMINACIÓN": "💡",
                      "ACABADOS": "🧱"
                    };

                    return OPCIONES_CAT_PREDEFINIDAS.map(opc => {
                      const isSelected = categoriasSeleccionadas.includes(opc);
                      const emoji = ICONOS_CATEGORIAS[opc] || "🛠️";
                      return (
                        <button
                          key={opc}
                          type="button"
                          onClick={() => toggleCatSelection(opc)}
                          style={{
                            padding: '15px 10px',
                            borderRadius: '14px',
                            border: '2px solid',
                            borderColor: isSelected ? '#F26522' : 'transparent',
                            backgroundColor: isSelected ? '#F26522' : 'white',
                            color: isSelected ? 'white' : '#1e293b',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: '800',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 6px 15px rgba(242,101,34,0.3)' : '0 2px 4px rgba(0,0,0,0.04)',
                            transform: isSelected ? 'translateY(-2px)' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = '#F26522';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'transparent';
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                            }
                          }}
                        >
                          <span style={{ fontSize: '1.8rem' }}>{emoji}</span>
                          <span style={{ textAlign: 'center', lineHeight: '1.2' }}>{opc}</span>
                        </button>
                      );
                    });
                  })()}
                  
                  <button
                    type="button"
                    onClick={() => setCreandoNuevaCategoria(!creandoNuevaCategoria)}
                    style={{
                      padding: '15px 10px',
                      borderRadius: '14px',
                      border: '2px solid',
                      borderColor: creandoNuevaCategoria ? '#F26522' : 'transparent',
                      backgroundColor: creandoNuevaCategoria ? '#F26522' : 'white',
                      color: creandoNuevaCategoria ? 'white' : '#1e293b',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      boxShadow: creandoNuevaCategoria ? '0 6px 15px rgba(242,101,34,0.3)' : '0 2px 4px rgba(0,0,0,0.04)',
                      transform: creandoNuevaCategoria ? 'translateY(-2px)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!creandoNuevaCategoria) {
                        e.currentTarget.style.borderColor = '#F26522';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!creandoNuevaCategoria) {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                      }
                    }}
                  >
                    <span style={{ fontSize: '1.8rem' }}>✨</span>
                    <span>OTRA...</span>
                  </button>
                </div>

                {creandoNuevaCategoria && (
                  <input 
                    className="rdh-modal-input" 
                    style={{ 
                      width: '100%', 
                      padding: '12px 18px', 
                      borderRadius: '12px', 
                      border: '2px solid #ddd', 
                      fontSize: '14px', 
                      textTransform: 'uppercase', 
                      backgroundColor: '#fff', 
                      color: '#333',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#F26522'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                    type="text" 
                    value={nuevaCategoria} 
                    onChange={(e) => setNuevaCategoria(e.target.value.toUpperCase())} 
                    placeholder="ESCRIBE LA NUEVA CATEGORÍA..." 
                    autoFocus 
                  />
                )}
              </div>
            </div>

            <div className="rdh-modal-btn-container" style={{ gap: '15px', marginTop: '10px', padding: '0 10px 10px' }}>
              <button className="dh-btn-save-3d" style={{ background: '#777', boxShadow: '0 6px 0px #444', height: '45px', padding: '0 30px', fontSize: '16px' }} onClick={() => {
                setIsModalOpen(false);
                setCreandoNuevaCategoria(false);
                setCategoriasSeleccionadas([]);
              }}>CANCELAR</button>
              <button className="dh-btn-save-3d" style={{ height: '45px', padding: '0 30px', fontSize: '16px' }} onClick={guardarCategorias} disabled={guardando}>
                {guardando ? <Loader2 size={16} className="animate-spin" /> : 'AGREGAR'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE SELECCIÓN DE FOTO */}
      {isPhotoMenuOpen && createPortal(
        <div 
          className="rdh-modal-overlay" 
          onClick={() => setIsPhotoMenuOpen(false)} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 10000005, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div className="rdh-modal-content" style={{ maxWidth: '400px', padding: '0', backgroundColor: '#1a1a1a', border: '1px solid #333', zIndex: 10000006, margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#F26522', borderBottom: '1px solid #333', margin: 0, padding: '20px', textAlign: 'center', fontSize: '1.2rem' }}>Seleccionar Foto</h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button 
                onClick={() => selectPhotoSource('camera')}
                style={{ background: 'transparent', border: 'none', padding: '15px', color: 'white', borderBottom: '1px solid #333', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                📷 Tomar Foto
              </button>
              <button 
                onClick={() => selectPhotoSource('gallery')}
                style={{ background: 'transparent', border: 'none', padding: '15px', color: 'white', borderBottom: '1px solid #333', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                🖼️ Elegir de la Galería
              </button>
              <button 
                onClick={() => setIsPhotoMenuOpen(false)}
                style={{ background: 'transparent', border: 'none', padding: '15px', color: '#a0a0a0', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* LIGHTBOX PARA IMAGEN AMPLIADA */}
      {imagenAmpliada && createPortal(
        <div 
          onClick={() => setImagenAmpliada(null)}
          style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 10000010, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
        >
          <img src={imagenAmpliada} alt="Zoom" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
          <button 
             onClick={() => setImagenAmpliada(null)} 
             style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
             <X size={40} />
          </button>
        </div>,
        document.body
      )}
      </div>
    </>
  );
};

export default DetalleHabitacion;
