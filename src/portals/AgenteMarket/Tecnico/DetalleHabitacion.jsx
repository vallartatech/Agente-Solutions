import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import "../../../styles/AgenteMarket/Admin/VistaPropiedadesBase.css";
import "../../../styles/Shared/LiquidGlass.css";
import "../../../styles/AgenteMarket/Tecnico/LevantamientoZonas.css";
import { Plus, ArrowLeft, ImageIcon, Loader2, Edit3, Eye, X, CheckCircle, Trash2, Camera, DoorOpen, Wrench, ChevronRight, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// IMPORTAMOS LA VISTA DEL NIVEL 5
import RegistroDetalleHabitacion from './RegistroDetalleHabitacion'; 
import Header from '../../../components/Shared/Header';
import RutaLevantamiento from './RutaLevantamiento';
import { mostrarAviso, confirmarAccion, pedirTexto } from '../../../utils/dialogos';

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

const DetalleHabitacion = ({ habitacion, propertyCurp, alVolver, servicioId, ruta }) => {
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
      return mostrarAviso("Selecciona al menos una categoría o escribe una nueva.");
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
      mostrarAviso("Hubo un error al registrar las categorías.");
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
    if (await confirmarAccion(`¿Estás seguro de eliminar la categoría "${name}" y todos sus equipos?`)) {
      try {
        const token = localStorage.getItem('agente_token');
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-categories/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchCategorias();
      } catch (error) {
        console.error("Error al eliminar categoría:", error);
        mostrarAviso("No se pudo eliminar la categoría.");
      }
    }
  };

  const editarCategoria = async (id, oldName) => {
    const nuevoNombre = await pedirTexto("Ingresa el nuevo nombre para la categoría:", oldName);
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
        mostrarAviso("No se pudo editar el nombre de la categoría.");
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
      mostrarAviso("Zona actualizada correctamente");
      alVolver(); // Volvemos después de guardar
    } catch (error) {
      console.error("Error al actualizar zona", error);
      mostrarAviso("Error al actualizar la zona");
    } finally {
      setActualizando(false);
    }
  };

  const finalizarLevantamiento = async () => {
    if (!servicioId) return mostrarAviso("Error: ID de servicio no encontrado.");
    if (!await confirmarAccion("¿Seguro que deseas FINALIZAR todo el levantamiento? Esta propiedad pasará a la pestaña de finalizados.")) return;
    
    // Mostramos estado de carga general (aprovechamos actualizando)
    setActualizando(true);
    try {
      const token = localStorage.getItem('agente_token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/servicios/${servicioId}`, 
        { status: 'completed' },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      mostrarAviso("¡Levantamiento finalizado con éxito!");
      navigate("/trabajos-asignados");
    } catch (error) {
       console.error(error);
       mostrarAviso("No se pudo finalizar el levantamiento.");
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
      mostrarAviso("¡Registro de zonas completado con éxito! Ahora puedes solicitar servicios para estas áreas.");
      navigate(-1);
    } catch (error) {
      console.error("Error al finalizar registro:", error);
      mostrarAviso("Error al enviar la notificación al administrador.");
    }
  };

  const user = JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData;
  const isClient = user?.role_id === 3;
  // Solo los administradores finalizan el levantamiento
  const isAdmin = [0, 1].includes(Number(user?.role_id));

  const cerrarModal = () => {
    setIsModalOpen(false);
    setCreandoNuevaCategoria(false);
    setCategoriasSeleccionadas([]);
  };

  const rutaBase = ruta || [{ label: 'Zona', onClick: alVolver }];
  const rutaArea = [...rutaBase, { label: habitacion?.name || 'Área', Icon: DoorOpen }];

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
        ruta={[
          ...rutaBase,
          { label: habitacion?.name || 'Área', Icon: DoorOpen, onClick: () => setCategoriaActiva(null) },
        ]}
      />
    );
  }

  return (
    <div className="lz-page">
      <Header />
      <main className="lz-container">
        <RutaLevantamiento items={rutaArea} />

        {/* ÁREA: foto + nombre + descripción + acciones */}
        <section className="lz-card lz-zona-detalle" style={{ alignItems: 'stretch' }}>
          <div className="lz-foto">
            <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={handleFileSelect} />
            <input type="file" ref={galleryRef} hidden accept="image/*" onChange={handleFileSelect} />

            {previewImg ? (
              <>
                <img src={previewImg} alt="Área" />
                <div className="lz-foto-botones">
                  <button type="button" className="lz-foto-cambiar" onClick={openPhotoMenu}>
                    <Camera size={13} /> Cambiar
                  </button>
                  <button type="button" className="lz-foto-cambiar" onClick={() => setImagenAmpliada(previewImg)}>
                    <Eye size={13} /> Ver
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="lz-foto-vacia" onClick={openPhotoMenu}>
                <span className="lz-foto-vacia-icono"><Camera size={22} /></span>
                <strong>Agregar foto</strong>
                <small>Cámara o galería</small>
              </button>
            )}
          </div>

          <div className="lz-zona-datos">
            <div className="lz-zona-nombre">
              <h1>{habitacion?.name || "HABITACIÓN PRINCIPAL"}</h1>
            </div>

            <div className="lz-chips">
              <span className="lz-chip">Folio <strong>{propertyCurp || "S/N"}</strong></span>
              <span className="lz-chip">ID área <strong>{habitacion?.id}</strong></span>
              <span className="lz-chip naranja">{categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}</span>
              {selectedFile && <span className="lz-chip verde">Foto nueva sin guardar</span>}
            </div>

            <label className="lz-campo">
              <span>Descripción</span>
              <textarea
                className="lz-textarea"
                placeholder="Escribe aquí los detalles generales de la habitación..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="lz-acciones">
              <button type="button" className="lz-btn lz-btn-glass" onClick={alVolver}>
                <ArrowLeft size={18} /> <span className="lz-btn-txt">Volver</span>
              </button>
              <button type="button" className="lz-btn lz-btn-primary" onClick={actualizarZona} disabled={actualizando}>
                {actualizando ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Guardar zona
              </button>
              {servicioId && isAdmin ? (
                <button type="button" className="lz-btn lz-btn-success" onClick={finalizarLevantamiento} disabled={actualizando}>
                  <CheckCircle size={18} /> Finalizar levantamiento
                </button>
              ) : servicioId ? null : isClient ? (
                <button type="button" className="lz-btn lz-btn-success" onClick={finalizarRegistroCliente}>
                  <CheckCircle size={18} /> Finalizar mi registro
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {/* LISTA DE MANTENIMIENTO (categorías) */}
        <section className="lz-card lz-panel">
          <div className="lz-panel-titulo">
            <h2><Wrench size={18} /> Lista de mantenimiento</h2>
            <button type="button" className="lz-btn lz-btn-primary lz-btn-sm" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} strokeWidth={2.8} /> Agregar categoría
            </button>
          </div>

          {loading ? (
            <div className="lz-vacio"><Loader2 size={28} className="animate-spin" /><p>Cargando categorías...</p></div>
          ) : categorias.length > 0 ? (
            <div className="lz-cats">
              {categorias.map((cat) => (
                <div key={cat.id} className="lz-cat" onClick={() => setCategoriaActiva(cat)}>
                  <span className="lz-cat-emoji">{ICONOS_CATEGORIAS[cat.name] || '🛠️'}</span>
                  <span className="lz-cat-nombre">{cat.name}</span>
                  <button type="button" className="lz-icon-btn" onClick={(e) => { e.stopPropagation(); editarCategoria(cat.id, cat.name); }} title="Editar nombre">
                    <Edit3 size={15} />
                  </button>
                  <button type="button" className="lz-icon-btn peligro" onClick={(e) => { e.stopPropagation(); eliminarCategoria(cat.id, cat.name); }} title="Eliminar categoría">
                    <Trash2 size={15} />
                  </button>
                  <ChevronRight size={18} />
                </div>
              ))}
            </div>
          ) : (
            <div className="lz-vacio">
              <Wrench size={40} />
              <p>No hay categorías. Agrega &quot;ELÉCTRICO&quot;, &quot;PLOMERÍA&quot;, etc.</p>
            </div>
          )}
        </section>
      </main>

      {/* MODAL PARA AGREGAR NUEVA CATEGORÍA */}
      {isModalOpen && createPortal(
        <div className="rp-overlay" onClick={cerrarModal}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-header">
              <div className="rp-header-text">
                <span className="rp-tag">{habitacion?.name || 'ÁREA'}</span>
                <h2 className="rp-title">Agregar categorías</h2>
              </div>
              <button type="button" className="rp-close" onClick={cerrarModal} aria-label="Cerrar">
                <X size={18} strokeWidth={2.6} />
              </button>
            </div>

            <div className="rp-form">
              <div className="rp-group">
                <label className="rp-label"><Wrench size={16} color="#ff8c42" /> Selecciona las categorías a agregar</label>
                <div className="lz-opciones">
                  {OPCIONES_CAT_PREDEFINIDAS.map(opc => (
                    <button
                      key={opc}
                      type="button"
                      className={`lz-opcion lz-opcion-emoji ${categoriasSeleccionadas.includes(opc) ? 'on' : ''}`}
                      onClick={() => toggleCatSelection(opc)}
                    >
                      <span>{ICONOS_CATEGORIAS[opc] || '🛠️'}</span>
                      <span>{opc}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`lz-opcion lz-opcion-emoji ${creandoNuevaCategoria ? 'on' : ''}`}
                    onClick={() => setCreandoNuevaCategoria(!creandoNuevaCategoria)}
                  >
                    <span>✨</span>
                    <span>OTRA...</span>
                  </button>
                </div>
              </div>

              {creandoNuevaCategoria && (
                <div className="rp-group">
                  <label className="rp-label">Nombre de la categoría</label>
                  <input
                    className="lz-input"
                    type="text"
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value.toUpperCase())}
                    placeholder="Escribe la nueva categoría..."
                    autoFocus
                  />
                </div>
              )}

              <div className="rp-footer lz-modal-pie">
                <button type="button" className="lz-btn lz-btn-glass" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="lz-btn lz-btn-primary" onClick={guardarCategorias} disabled={guardando}>
                  {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />} Agregar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE SELECCIÓN DE FOTO */}
      {isPhotoMenuOpen && createPortal(
        <div className="rp-overlay lz-fuente" onClick={() => setIsPhotoMenuOpen(false)}>
          <div className="lz-fuente-menu" onClick={e => e.stopPropagation()}>
            <h3>Seleccionar foto</h3>
            <button type="button" className="lz-fuente-opcion" onClick={() => selectPhotoSource('camera')}>
              <span className="lz-fuente-icono naranja"><Camera size={20} /></span>
              <span className="lz-fuente-texto"><strong>Tomar foto</strong><small>Usa la cámara del dispositivo</small></span>
            </button>
            <button type="button" className="lz-fuente-opcion" onClick={() => selectPhotoSource('gallery')}>
              <span className="lz-fuente-icono azul"><ImageIcon size={20} /></span>
              <span className="lz-fuente-texto"><strong>Elegir de la galería</strong><small>Sube una imagen guardada</small></span>
            </button>
            <button type="button" className="lz-btn lz-btn-glass" onClick={() => setIsPhotoMenuOpen(false)}>Cancelar</button>
          </div>
        </div>,
        document.body
      )}

      {/* LIGHTBOX PARA IMAGEN AMPLIADA */}
      {imagenAmpliada && createPortal(
        <div className="lz-lightbox" onClick={() => setImagenAmpliada(null)}>
          <img src={imagenAmpliada} alt="Zoom" />
          <button type="button" className="lz-icon-btn" onClick={() => setImagenAmpliada(null)} aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DetalleHabitacion;
