import { useState, useEffect } from 'react';
import axios from 'axios';
import "../../../styles/AgenteSolutions/Admin/VistaPropiedades.css";
import "../../../styles/Shared/LiquidGlass.css";
import "../../../styles/AgenteSolutions/Tecnico/LevantamientoZonas.css";
import { Plus, Edit3, Trash2, ArrowLeft, Home, Loader2, DoorOpen, LayoutGrid, Camera, Check, X, Save as SaveIcon } from 'lucide-react';
import DetalleHabitacion from './DetalleHabitacion';
import RutaLevantamiento from './RutaLevantamiento';
import Header from '../../../components/Shared/Header';
import logoAgente from '../../../assets/Logo3.png';
import { mostrarAviso, confirmarAccion, pedirTexto } from '../../../utils/dialogos';

const DetalleZona = ({ zona, propertyCurp, alVolver, servicioId, ruta }) => {
  // Estados para las SUB-HABITACIONES
  const [habitaciones, setHabitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  
  const [habitacionActiva, setHabitacionActiva] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevaHabitacion, setNuevaHabitacion] = useState("");
  const [subHabitacionesSeleccionadas, setSubHabitacionesSeleccionadas] = useState([]);
  const [esOtraHabitacion, setEsOtraHabitacion] = useState(false);

  const OPCIONES_SUB_PREDEFINIDAS = [
    "BAÑO PRINCIPAL", "MEDIO BAÑO", 
    "HABITACIÓN PRINCIPAL", "HABITACIÓN DE HUÉSPEDES", 
    "SALA DE ESTAR", "COMEDOR", "SALA DE TV", "CUARTO DE JUEGOS", "BAR", 
    "COCINA PRINCIPAL", "ALACENA / DESPENSA", 
    "COCHERA / GARAJE", "PATIO", "JARDÍN", "TERRAZA", "PISCINA"
  ];

  // Opciones de Zona (Editar/Eliminar)
  const [editandoZonaNombre, setEditandoZonaNombre] = useState(false);
  const [nuevoNombreZona, setNuevoNombreZona] = useState(zona?.name || "");

  // Edición de Foto
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImg, setPreviewImg] = useState(zona?.image_path || null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  useEffect(() => {
    setNuevoNombreZona(zona?.name || "");
  }, [zona]);

  const eliminarZona = async () => {
    if(await confirmarAccion("¿Estás seguro de eliminar esta zona y todo su contenido?")) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${zona.id}`);
        mostrarAviso("Zona eliminada con éxito.");
        alVolver(); 
      } catch (error) {
        console.error(error);
        mostrarAviso("Error al eliminar la zona. Verifica la consola.");
      }
    }
  };

  const guardarEdicionZona = async () => {
    if(!nuevoNombreZona.trim()) return mostrarAviso("El nombre no puede estar vacío");
    setGuardando(true);
    try {
      const token = localStorage.getItem('agente_token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${zona.id}`, { name: nuevoNombreZona }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      zona.name = nuevoNombreZona.toUpperCase(); // Actualización optimista local
      setEditandoZonaNombre(false);
    } catch (error) {
      console.error(error);
      mostrarAviso("Error al editar el nombre de la zona.");
    } finally {
      setGuardando(false);
    }
  };

  const manejarCambioFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewImg(URL.createObjectURL(file));
    }
  };

  const guardarNuevaFoto = async () => {
    if (!selectedFile) return;
    setSubiendoFoto(true);
    try {
      const token = localStorage.getItem('agente_token');
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${zona.id}/update-photo`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        }
      });
      
      mostrarAviso("Foto actualizada con éxito");
      setSelectedFile(null);
      // Actualizamos la zona localmente y el estado de vista previa
      if (res.data.image_path) {
        zona.image_path = res.data.image_path;
        setPreviewImg(res.data.image_path);
      }
    } catch (error) {
      console.error("Error al subir foto:", error);
      mostrarAviso("No se pudo actualizar la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Cargar sub-habitaciones al iniciar
  useEffect(() => {
    if (zona?.id) fetchHabitaciones();
  }, [zona]);

  const fetchHabitaciones = async () => {
    try {
      // Llamamos a la nueva ruta que trae áreas hijas
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/areas/${zona.id}/subareas`);
      setHabitaciones(res.data);
    } catch (error) {
      console.error("Error al cargar habitaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const guardarHabitaciones = async () => {
    if (subHabitacionesSeleccionadas.length === 0 && !nuevaHabitacion) {
      return mostrarAviso("Por favor, selecciona al menos una opción o escribe un nombre.");
    }

    setGuardando(true);
    const token = localStorage.getItem('agente_token');
    
    let nombresAGuardar = [...subHabitacionesSeleccionadas];
    if (esOtraHabitacion && nuevaHabitacion) {
      nombresAGuardar.push(nuevaHabitacion);
    }

    try {
      const promesas = nombresAGuardar.map(nombre => {
        return axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-areas`, {
          property_id: zona.property_id,
          parent_id: zona.id,
          name: nombre,
          description: ''
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      });

      await Promise.all(promesas);
      
      setIsModalOpen(false);
      setSubHabitacionesSeleccionadas([]);
      setNuevaHabitacion("");
      setEsOtraHabitacion(false);
      fetchHabitaciones(); 
    } catch (error) {
      console.error("Error al guardar habitaciones:", error);
      mostrarAviso("Hubo un error al registrar las áreas.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarSubHabitacion = async (id, name) => {
    if (await confirmarAccion(`¿Estás seguro de eliminar el área "${name}" y todos sus equipos?`)) {
      try {
        const token = localStorage.getItem('agente_token');
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchHabitaciones();
      } catch (error) {
        console.error("Error al eliminar área:", error);
        mostrarAviso("No se pudo eliminar el área.");
      }
    }
  };

  const editarSubHabitacion = async (id, oldName) => {
    const nuevoNombre = await pedirTexto("Ingresa el nuevo nombre para el área:", oldName);
    if (nuevoNombre && nuevoNombre.trim() !== "" && nuevoNombre !== oldName) {
      try {
        const token = localStorage.getItem('agente_token');
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${id}`, 
          { name: nuevoNombre.trim().toUpperCase() },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        fetchHabitaciones();
      } catch (error) {
        console.error("Error al editar área:", error);
        mostrarAviso("No se pudo editar el nombre del área.");
      }
    }
  };

  const toggleSubSelection = (nombre) => {
    setSubHabitacionesSeleccionadas(prev => 
      prev.includes(nombre) 
        ? prev.filter(n => n !== nombre) 
        : [...prev, nombre]
    );
  };

  if (habitacionActiva) {
    return (
      <DetalleHabitacion 
        habitacion={habitacionActiva} 
        propertyCurp={propertyCurp} // Pasamos el curp para no perderlo
        alVolver={() => {
          setHabitacionActiva(null);
          fetchHabitaciones();
        }} 
        servicioId={servicioId}
        ruta={[
          ...(ruta || [{ label: 'Levantamiento', onClick: alVolver }]),
          { label: zona?.name || 'Zona', Icon: LayoutGrid, onClick: () => { setHabitacionActiva(null); fetchHabitaciones(); } },
        ]}
      />
    );
  }

  const cerrarModal = () => {
    setIsModalOpen(false);
    setSubHabitacionesSeleccionadas([]);
    setNuevaHabitacion("");
    setEsOtraHabitacion(false);
  };

  const rutaZona = [
    ...(ruta || [{ label: 'Levantamiento', onClick: alVolver }]),
    { label: zona?.name || 'Zona', Icon: LayoutGrid },
  ];

  return (
    <div className="lz-page">
      <Header />
      <main className="lz-container">
        <RutaLevantamiento items={rutaZona} />

        {/* ZONA: foto + datos + acciones */}
        <section className="lz-card lz-zona-detalle">
          <div className="lz-foto">
            <img src={previewImg || logoAgente} alt="Foto zona" className={previewImg ? '' : 'logo'} />
            <label className="lz-foto-cambiar">
              <Camera size={13} /> {selectedFile ? 'Foto seleccionada' : 'Cambiar foto'}
              <input type="file" accept="image/*" onChange={manejarCambioFoto} style={{ display: 'none' }} />
            </label>

            {selectedFile && (
              <div className="lz-foto-acciones">
                <button type="button" className="ok" onClick={guardarNuevaFoto} disabled={subiendoFoto} title="Guardar foto seleccionada">
                  {subiendoFoto ? <Loader2 size={16} className="animate-spin" /> : <Check size={17} strokeWidth={3} />}
                </button>
                <button
                  type="button"
                  className="no"
                  onClick={() => { setSelectedFile(null); setPreviewImg(zona?.image_path || null); }}
                  disabled={subiendoFoto}
                  title="Descartar foto seleccionada"
                >
                  <X size={17} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>

          <div className="lz-zona-datos">
            <div className="lz-zona-nombre">
              {editandoZonaNombre ? (
                <>
                  <input
                    className="lz-input"
                    value={nuevoNombreZona}
                    onChange={e => setNuevoNombreZona(e.target.value.toUpperCase())}
                    autoFocus
                  />
                  <button type="button" className="lz-icon-btn" onClick={guardarEdicionZona} disabled={guardando} title="Guardar nombre">
                    {guardando ? <Loader2 size={16} className="animate-spin" /> : <Check size={17} />}
                  </button>
                  <button type="button" className="lz-icon-btn" onClick={() => setEditandoZonaNombre(false)} title="Cancelar">
                    <X size={17} />
                  </button>
                </>
              ) : (
                <>
                  <h1>{zona?.name || "SIN NOMBRE"}</h1>
                  <button type="button" className="lz-icon-btn" onClick={() => setEditandoZonaNombre(true)} title="Editar nombre de la zona">
                    <Edit3 size={16} />
                  </button>
                  <button type="button" className="lz-icon-btn peligro" onClick={eliminarZona} title="Eliminar zona">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>

            <div className="lz-chips">
              <span className="lz-chip">Folio <strong>{propertyCurp || "S/N"}</strong></span>
              <span className="lz-chip">ID zona <strong>{zona?.id}</strong></span>
              <span className="lz-chip">Fecha registro <strong>{new Date().toLocaleDateString()}</strong></span>
              <span className="lz-chip naranja">{habitaciones.length} {habitaciones.length === 1 ? 'área' : 'áreas'}</span>
            </div>

            <div className="lz-acciones">
              <button type="button" className="lz-btn lz-btn-glass" onClick={alVolver}>
                <ArrowLeft size={18} /> <span className="lz-btn-txt">Volver a zonas</span>
              </button>
              <button type="button" className="lz-btn lz-btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} strokeWidth={2.8} /> Agregar área
              </button>
              <button type="button" className="lz-btn lz-btn-glass" onClick={() => {
                mostrarAviso("✅ Datos de la zona guardados correctamente.");
                if (alVolver) alVolver();
              }}>
                <SaveIcon size={18} /> Guardar
              </button>
            </div>
          </div>
        </section>

        {/* LISTA DE SUB-HABITACIONES */}
        <section className="lz-card lz-panel">
          <div className="lz-panel-titulo">
            <h2><DoorOpen size={18} /> Áreas de la zona</h2>
          </div>

          {loading ? (
            <div className="lz-vacio"><Loader2 size={28} className="animate-spin" /><p>Cargando áreas...</p></div>
          ) : habitaciones.length > 0 ? (
            <div className="lz-lista">
              {habitaciones.map((item) => (
                <div key={item.id} className="lz-fila">
                  <span className="lz-fila-icono"><DoorOpen size={22} /></span>
                  <span className="lz-fila-nombre">{item.name}</span>
                  <div className="lz-fila-acciones">
                    <button type="button" className="lz-icon-btn" onClick={() => editarSubHabitacion(item.id, item.name)} title="Editar nombre">
                      <Edit3 size={16} />
                    </button>
                    <button type="button" className="lz-icon-btn peligro" onClick={() => eliminarSubHabitacion(item.id, item.name)} title="Eliminar área">
                      <Trash2 size={16} />
                    </button>
                    {/* Botón clave para entrar a ver los electrodomésticos */}
                    <button type="button" className="lz-btn lz-btn-primary lz-btn-sm" onClick={() => setHabitacionActiva(item)}>
                      <LayoutGrid size={15} /> Ver activos
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="lz-vacio">
              <DoorOpen size={42} />
              <p>No hay áreas registradas en esta zona.</p>
              <p style={{ fontSize: '0.88rem' }}>Presiona <strong>Agregar área</strong> (Ej. Medio baño, Cuarto de estar).</p>
            </div>
          )}
        </section>
      </main>

      {/* MODAL PARA AGREGAR ÁREAS */}
      {isModalOpen && (
        <div className="rp-overlay" onClick={cerrarModal}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-header">
              <div className="rp-header-text">
                <span className="rp-tag">{zona?.name || 'ZONA'}</span>
                <h2 className="rp-title">Agregar áreas</h2>
              </div>
              <button type="button" className="rp-close" onClick={cerrarModal} aria-label="Cerrar">
                <X size={18} strokeWidth={2.6} />
              </button>
            </div>

            <div className="rp-form">
              <div className="rp-group">
                <label className="rp-label"><Home size={16} color="#ff8c42" /> Selecciona las áreas a agregar</label>
                <div className="lz-opciones">
                  {OPCIONES_SUB_PREDEFINIDAS.map(opc => (
                    <button
                      key={opc}
                      type="button"
                      className={`lz-opcion ${subHabitacionesSeleccionadas.includes(opc) ? 'on' : ''}`}
                      onClick={() => toggleSubSelection(opc)}
                    >
                      {opc}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`lz-opcion ${esOtraHabitacion ? 'on' : ''}`}
                    onClick={() => setEsOtraHabitacion(!esOtraHabitacion)}
                  >
                    OTRA...
                  </button>
                </div>
              </div>

              {esOtraHabitacion && (
                <div className="rp-group">
                  <label className="rp-label">Nombre del área</label>
                  <input
                    type="text"
                    className="lz-input"
                    placeholder="Escribe el nombre aquí..."
                    value={nuevaHabitacion}
                    onChange={(e) => setNuevaHabitacion(e.target.value.toUpperCase())}
                    autoFocus
                  />
                </div>
              )}

              <div className="rp-footer lz-modal-pie">
                <button type="button" className="lz-btn lz-btn-glass" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="lz-btn lz-btn-primary" onClick={guardarHabitaciones} disabled={guardando}>
                  {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />} Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleZona;
