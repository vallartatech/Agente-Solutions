import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "../../../styles/AgenteSolutions/Tecnico/DetalleZona.css";
import { Plus, Edit3, Trash2, ArrowLeft, Settings, Send, Home, Loader2, DoorOpen, LayoutGrid, Camera, CheckCircle, Check, X, Save as SaveIcon } from 'lucide-react';
import DetalleHabitacion from './DetalleHabitacion';
import Header from '../../../components/Shared/Header';
import logoAgente from '../../../assets/Logo3.png';

const DetalleZona = ({ zona, propertyCurp, alVolver, servicioId }) => {
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
  const [mostrarOpcionesZona, setMostrarOpcionesZona] = useState(false);
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
    if(window.confirm("¿Estás seguro de eliminar esta zona y todo su contenido?")) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${zona.id}`);
        alert("Zona eliminada con éxito.");
        alVolver(); 
      } catch (error) {
        console.error(error);
        alert("Error al eliminar la zona. Verifica la consola.");
      }
    }
  };

  const guardarEdicionZona = async () => {
    if(!nuevoNombreZona.trim()) return alert("El nombre no puede estar vacío");
    setGuardando(true);
    try {
      const token = localStorage.getItem('agente_token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${zona.id}`, { name: nuevoNombreZona }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      zona.name = nuevoNombreZona.toUpperCase(); // Actualización optimista local
      setEditandoZonaNombre(false);
      setMostrarOpcionesZona(false);
    } catch (error) {
      console.error(error);
      alert("Error al editar el nombre de la zona.");
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
      
      alert("Foto actualizada con éxito");
      setSelectedFile(null);
      // Actualizamos la zona localmente y el estado de vista previa
      if (res.data.image_path) {
        zona.image_path = res.data.image_path;
        setPreviewImg(res.data.image_path);
      }
    } catch (error) {
      console.error("Error al subir foto:", error);
      alert("No se pudo actualizar la foto.");
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
      return alert("Por favor, selecciona al menos una opción o escribe un nombre.");
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
      alert("Hubo un error al registrar las áreas.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarSubHabitacion = async (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar el área "${name}" y todos sus equipos?`)) {
      try {
        const token = localStorage.getItem('agente_token');
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchHabitaciones();
      } catch (error) {
        console.error("Error al eliminar área:", error);
        alert("No se pudo eliminar el área.");
      }
    }
  };

  const editarSubHabitacion = async (id, oldName) => {
    const nuevoNombre = window.prompt("Ingresa el nuevo nombre para el área:", oldName);
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
        alert("No se pudo editar el nombre del área.");
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
      />
    );
  }

  return (
    <>
      <Header />
      <div className="dz-body-wrapper">
        {/* BURBUJAS SUPERIORES (Con tus estilos) */}
        <div className="dz-bubbles-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="dz-btn-back-orange" onClick={alVolver} style={{ marginRight: '0', width: 'auto', padding: '0 20px', height: '40px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center' }}>
               <ArrowLeft size={18} style={{ marginRight: '8px' }}/> VOLVER A ZONAS
            </button>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="dz-info-pill" style={{ color: 'black', display: 'flex', alignItems: 'center' }}>CURP <strong>&nbsp;{propertyCurp || "S/N"}</strong></div>
            <div className="dz-info-pill" style={{ color: 'black', display: 'flex', alignItems: 'center' }}>ID ZONA <strong>&nbsp;{zona?.id}</strong></div>
          </div>
        </div>

        {/* TARJETA PRINCIPAL */}
        <div className="dz-main-card">
          <div className="dz-controls-row" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* VISTA PREVIA DE LA FOTO DE LA ZONA */}
            <div className="dz-main-photo-container">
              <img 
                src={previewImg || logoAgente} 
                alt="Foto zona" 
              />
              <label className="dz-change-photo-label">
                <Camera size={12} /> {selectedFile ? 'FOTO SELECCIONADA' : 'CAMBIAR FOTO'}
                <input type="file" accept="image/*" onChange={manejarCambioFoto} style={{ display: 'none' }} />
              </label>
              
              {selectedFile && (
                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '8px', zIndex: 100 }}>
                  <button 
                    type="button"
                    onClick={guardarNuevaFoto} 
                    disabled={subiendoFoto}
                    title="Guardar foto seleccionada"
                    style={{ 
                      backgroundColor: '#16a34a', 
                      color: '#ffffff', 
                      border: '2.5px solid #ffffff', 
                      borderRadius: '50%', 
                      width: '36px', 
                      height: '36px', 
                      minWidth: '36px',
                      minHeight: '36px',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer', 
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                      padding: 0
                    }}
                  >
                    {subiendoFoto ? (
                      <Loader2 size={18} color="#ffffff" className="animate-spin" />
                    ) : (
                      <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: '900', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✓
                      </span>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewImg(zona?.image_path || null);
                    }}
                    disabled={subiendoFoto}
                    title="Cancelar y descartar foto seleccionada (X)"
                    style={{ 
                      backgroundColor: '#dc2626', 
                      color: '#ffffff', 
                      border: '2.5px solid #ffffff', 
                      borderRadius: '50%', 
                      width: '36px', 
                      height: '36px', 
                      minWidth: '36px',
                      minHeight: '36px',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer', 
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                      padding: 0
                    }}
                  >
                    <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: '900', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div className="dz-category-tag" style={{ color: 'black', position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                CATEGORÍA: 
                {editandoZonaNombre ? (
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginLeft: '8px' }}>
                    <input 
                      value={nuevoNombreZona} 
                      onChange={e => setNuevoNombreZona(e.target.value.toUpperCase())}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', textTransform: 'uppercase', outline: 'none' }}
                      autoFocus
                    />
                    <button onClick={guardarEdicionZona} style={{ padding: '4px 10px', background: '#f26624', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
                    <button onClick={() => setEditandoZonaNombre(false)} style={{ padding: '4px 10px', background: '#666', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                  </div>
                ) : (
                  <>
                    <strong style={{ marginLeft: '8px', marginRight: '8px' }}>{zona?.name || "SIN NOMBRE"}</strong> 
                    <Edit3 size={16} style={{ cursor: 'pointer', color: '#f37021', marginRight: '8px' }} onClick={() => setEditandoZonaNombre(true)} />
                    <Trash2 size={16} style={{ cursor: 'pointer', color: '#e63946' }} onClick={eliminarZona} />
                  </>
                )}
              </div>
              
              <div className="dz-actions-group" style={{ marginBottom: '10px' }}>
                <button className="dz-btn-save" onClick={() => {
                  alert("✅ Datos de la zona guardados correctamente.");
                  if (alVolver) alVolver();
                }}>GUARDAR</button>
                <button className="dz-btn-save" onClick={() => setIsModalOpen(true)}>+</button>
              </div>

              <div className="dz-date-tag">
                FECHA REGISTRO <strong>{new Date().toLocaleDateString()}</strong>
              </div>
            </div>
          </div>

          {/* LISTA DE SUB-HABITACIONES */}
          <div className="dz-list-container">
            {loading ? (
              <p style={{textAlign: 'center', padding: '20px', color: '#fff'}}>Cargando habitaciones...</p>
            ) : habitaciones.length > 0 ? (
              habitaciones.map((item) => (
                <div key={item.id} className="dz-item-row" style={{ alignItems: 'center' }}>
                  <div className="dz-item-left" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="dz-thumb-box" style={{ width: '50px', height: '50px', backgroundColor: '#f0f0f0', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <DoorOpen size={28} color="#555" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="dz-item-name" style={{ fontSize: '1.1rem' }}>{item.name}</span>
                      <div style={{ display: 'flex', gap: '15px', marginLeft: '25px' }}>
                        <Edit3 size={18} className="dz-icon-edit" style={{ cursor: 'pointer', color: '#f37021' }} onClick={() => editarSubHabitacion(item.id, item.name)} />
                        <Trash2 size={18} className="dz-icon-delete" style={{ cursor: 'pointer', color: '#e63946' }} onClick={() => eliminarSubHabitacion(item.id, item.name)} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="dz-item-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Botón clave para entrar a ver los electrodomésticos */}
                    <button 
                      onClick={() => setHabitacionActiva(item)}
                      style={{ padding: '8px 15px', backgroundColor: '#f37021', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <LayoutGrid size={16} /> VER ACTIVOS
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{textAlign: 'center', padding: '40px', color: '#ccc'}}>
                <DoorOpen size={48} style={{ opacity: 0.5, marginBottom: '10px' }} />
                <p>No hay sub-habitaciones registradas.</p>
                <p style={{ fontSize: '0.9rem' }}>Presiona el botón <strong>+</strong> para agregar una (Ej. Medio Baño, Cuarto de estar).</p>
              </div>
            )}
          </div>
        </div>

        {/* MODAL SIMPLIFICADO PARA HABITACIONES */}
        {isModalOpen && (
          <div className="custom-modal-overlay">
            <div className="custom-modal-card" style={{ maxWidth: '400px', width: '95%' }}>
              
              <div className="modal-header-gradient">
                <div className="header-content">
                  <Home size={22} color="#fff" />
                  <h2>NUEVA HABITACIÓN</h2>
                </div>
              </div>
              
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="input-container-modern">
                  <label>SELECCIONA LAS ÁREAS A AGREGAR</label>
                  <div className="sub-multi-select-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                    gap: '10px', 
                    marginTop: '10px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '10px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px'
                  }}>
                    {OPCIONES_SUB_PREDEFINIDAS.map(opc => (
                      <button
                        key={opc}
                        type="button"
                        onClick={() => toggleSubSelection(opc)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: subHabitacionesSeleccionadas.includes(opc) ? '#F26522' : '#ddd',
                          backgroundColor: subHabitacionesSeleccionadas.includes(opc) ? '#F26522' : 'white',
                          color: subHabitacionesSeleccionadas.includes(opc) ? 'white' : '#444',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                      >
                        {opc}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEsOtraHabitacion(!esOtraHabitacion)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: esOtraHabitacion ? '#F26522' : '#ddd',
                        backgroundColor: esOtraHabitacion ? '#F26522' : 'white',
                        color: esOtraHabitacion ? 'white' : '#444',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      OTRA...
                    </button>
                  </div>

                  {esOtraHabitacion && (
                    <input 
                      type="text" 
                      placeholder="ESCRIBE EL NOMBRE AQUÍ..." 
                      value={nuevaHabitacion}
                      onChange={(e) => setNuevaHabitacion(e.target.value.toUpperCase())}
                      style={{ marginTop: '15px', width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => {
                  setIsModalOpen(false);
                  setSubHabitacionesSeleccionadas([]);
                  setEsOtraHabitacion(false);
                }}>
                  CANCELAR
                </button>
                <button className="btn-confirm-grad" onClick={guardarHabitaciones} disabled={guardando}>
                  {guardando ? <Loader2 size={16} className="animate-spin" /> : 'AGREGAR'}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DetalleZona;
