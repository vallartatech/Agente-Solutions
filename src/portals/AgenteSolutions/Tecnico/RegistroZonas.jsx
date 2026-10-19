import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, X, Save, ImageIcon, Loader2, ArrowLeft, LayoutGrid, CheckCircle } from 'lucide-react';
import DetalleZona from './DetalleZona'; 
import Header from '../../../components/Shared/Header';
import logoAgente from '../../../assets/Logo3.png';
import "../../../styles/AgenteSolutions/Tecnico/RegistroZonas.css";


const RegistroZonas = () => {
  const { curp } = useParams(); 
  const location = useLocation();
  const navigate = useNavigate();
  
  const propertyId = location.state?.id;
  const servicioId = location.state?.servicioId;
  const propertyCurp = curp || location.state?.curp || "S/N";

  // ESTADOS
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null);
  const [isFinalizado, setIsFinalizado] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Formulario
  const [nuevaZona, setNuevaZona] = useState({ nombre: '', descripcion: '' });
  const [esOtraZona, setEsOtraZona] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // Archivo real
  const [previewImg, setPreviewImg] = useState(null);    // Vista previa
  const [zonasSeleccionadas, setZonasSeleccionadas] = useState([]); // Selección múltiple

  const OPCIONES_PREDEFINIDAS = [
    "BAÑOS", "HABITACIONES", "ÁREAS SOCIALES", "COCINA", "ZONAS EXTERIORES"
  ];

  const [idPropiedadReal, setIdPropiedadReal] = useState(propertyId);

  useEffect(() => {
    const fetchPropertyByCurp = async () => {
      if (!idPropiedadReal && curp) {
        try {
          const token = localStorage.getItem('agente_token');
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/by-curp/${encodeURIComponent(curp)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setIdPropiedadReal(res.data.id);
          // El backend usa 'levantamiento_realizado'
          if (res.data.levantamiento_realizado) {
            setIsFinalizado(true);
          }
        } catch (error) {
          console.error("Error al buscar propiedad por CURP:", error);
        }
      }
    };
    fetchPropertyByCurp();
  }, [curp, idPropiedadReal]);

  useEffect(() => {
    if (idPropiedadReal) {
      fetchZonas();
    }
  }, [idPropiedadReal]);

  const fetchZonas = async () => {
    try {
      const token = localStorage.getItem('agente_token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/${idPropiedadReal}/areas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setZonas(res.data);
      
      // ✅ SI NO HAY ZONAS, FORZAMOS QUE NO ESTÉ FINALIZADO PARA QUE SALGAN LOS BOTONES
      if (res.data.length === 0) {
        setIsFinalizado(false);
      }
    } catch (error) {
      console.error("Error al cargar zonas:", error);
    }
  };


  // Manejador de selección de archivo
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewImg(URL.createObjectURL(file));
    }
  };

  const guardarZonas = async () => {
    if (zonasSeleccionadas.length === 0 && !nuevaZona.nombre) {
      return alert("Debes seleccionar al menos una zona o escribir el nombre de una nueva.");
    }

    setLoading(true);
    const token = localStorage.getItem('agente_token');
    
    // Lista final de zonas a registrar
    let nombresAGuardar = [...zonasSeleccionadas];
    if (esOtraZona && nuevaZona.nombre) {
      nombresAGuardar.push(nuevaZona.nombre);
    }

    try {
      // Creamos todas las zonas en paralelo para mayor velocidad
      const promesas = nombresAGuardar.map(nombre => {
        const formData = new FormData();
        formData.append('property_id', idPropiedadReal);
        formData.append('name', nombre);
        formData.append('description', '');
        if (selectedFile) {
          formData.append('image', selectedFile);
        }
        
        return axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-areas`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}` 
          }
        });
      });

      await Promise.all(promesas);
      
      setModalAbierto(false);
      setZonasSeleccionadas([]);
      setNuevaZona({ nombre: '', descripcion: '' });
      setEsOtraZona(false);
      setSelectedFile(null);
      setPreviewImg(null);
      fetchZonas(); 
    } catch (error) {
      console.error("Error al guardar zonas:", error);
      alert("Hubo un error al registrar algunas zonas.");
    } finally {
      setLoading(false);
    }
  };

  const toggleZonaSelection = (nombre) => {
    setZonasSeleccionadas(prev => 
      prev.includes(nombre) 
        ? prev.filter(z => z !== nombre) 
        : [...prev, nombre]
    );
  };

  const finalizarLevantamiento = async () => {
    if (!servicioId) return alert("Error: ID del servicio no encontrado.");
    if (!window.confirm("¿Seguro que deseas FINALIZAR el levantamiento? Pasará a la pestaña de finalizados.")) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('agente_token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/servicios/${servicioId}`, 
        { status: 'completed' },
        {
          headers: {
            'Authorization': `Bearer ${token}` 
          }
        }
      );
      alert("¡Levantamiento finalizado con éxito!");
      navigate(-1);
    } catch (error) {
      console.error("Error al finalizar levantamiento:", error);
      alert("No se pudo finalizar el levantamiento. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const finalizarRegistroCliente = async () => {
    try {
      const token = localStorage.getItem('agente_token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/properties/${idPropiedadReal}/finalize-survey`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert("¡Registro de zonas completado con éxito!");
      setIsFinalizado(true);
      setEditMode(false);
      // No navegamos atrás para que vea el cambio a "EDITAR"
    } catch (error) {
      console.error("Error al finalizar registro:", error);
      const backendError = error.response?.data?.error || "Error desconocido";
      alert(`Error al finalizar: ${backendError}`);
    }
  };

  const eliminarZona = async (zonaId) => {
    if (!window.confirm("¿Estás seguro de eliminar esta zona? Se borrarán todos sus equipos e inventario.")) return;
    
    try {
      const token = localStorage.getItem('agente_token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${zonaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchZonas();
    } catch (error) {
      console.error("Error al eliminar zona:", error);
      alert("No se pudo eliminar la zona.");
    }
  };

  const user = JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData;
  const isClient = user?.role_id === 3;
  // Solo los administradores finalizan; técnicos y admins pueden editar aunque ya esté finalizado
  const isAdmin = [0, 1].includes(Number(user?.role_id));
  const puedeAgregar = !isFinalizado || editMode || !isClient;

  if (zonaSeleccionada) {
    return (
      <DetalleZona 
        zona={zonaSeleccionada} 
        propertyCurp={propertyCurp}
        alVolver={() => setZonaSeleccionada(null)} 
        servicioId={servicioId}
      />
    );
  }

  return (
    <>
      <Header />
      <div className="rz-body-wrapper">
        <div className="rz-top-info-row">
          <div className="rz-action-buttons">
            <button className="rz-btn-main orange-gradient" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} /> VOLVER
            </button>
            {puedeAgregar && (
              <button className="rz-btn-main purple-gradient" onClick={() => setModalAbierto(true)}>
                <Plus size={24} strokeWidth={3} /> AGREGAR
              </button>
            )}
            {servicioId && isAdmin ? (
              <button
                className="rz-btn-main green-gradient"
                onClick={finalizarLevantamiento}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                FINALIZAR LEVANTAMIENTO
              </button>
            ) : servicioId ? (
              <span className="rz-admin-finish-note">
                <CheckCircle size={16} /> El administrador marcará el levantamiento como finalizado
              </span>
            ) : isClient && zonas.length > 0 ? (
              isFinalizado && !editMode ? (
                <button 
                  className="rz-btn-main blue-gradient" 
                  onClick={() => setEditMode(true)}
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
                >
                  <Save size={20} /> EDITAR LEVANTAMIENTO
                </button>
              ) : (
                <button 
                  className="rz-btn-main green-gradient" 
                  onClick={finalizarRegistroCliente}
                >
                  <CheckCircle size={20} /> {isFinalizado ? "FINALIZAR EDICIÓN" : "FINALIZAR MI REGISTRO"}
                </button>
              )
            ) : null}
          </div>

          <div className="rz-bubbles-group">
            <div className="rz-bubble-info">
              <strong className="rz-bubble-value">FOLIO {propertyCurp}</strong>
            </div>
          </div>
        </div>

        <div className="rz-scrollable-grid">
          {zonas.length > 0 ? zonas.map((zona) => (
            <div key={zona.id} className="rz-card-dark">
              <div className="rz-image-holder">
                {/* ✅ CORRECCIÓN: Renderizar directo la URL de Cloudinary */}
                <img 
                  src={zona.image_path 
                    ? zona.image_path 
                    : logoAgente
                  } 
                  alt={zona.name} 
                  style={{ objectFit: zona.image_path ? 'cover' : 'contain', padding: zona.image_path ? '0' : '20px' }}
                />
                <div className="rz-image-overlay">
                  <span className="rz-zona-pill">{zona.name}</span>
                </div>
                
                {/* BOTÓN ELIMINAR EN MODO EDICIÓN */}
                {editMode && (
                  <button 
                    className="rz-btn-delete-zone"
                    onClick={(e) => { e.stopPropagation(); eliminarZona(zona.id); }}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="rz-card-footer">
                <button className="rz-btn-ver" onClick={() => setZonaSeleccionada(zona)}>VER ZONA</button>
              </div>
            </div>
          )) : (
            <div className="no-data-msg">
               <LayoutGrid size={48} color="#444" />
               <p>No hay zonas registradas. Comienza agregando una nueva área de levantamiento.</p>
            </div>
          )}
        </div>

        {modalAbierto && (
          <div className="rz-modal-overlay">
            <div className="rz-modal-content">
              <div className="rz-modal-header">
                <h2 className="rz-modal-title">DETALLES DE ZONA</h2>
                <div className="rz-modal-actions">
                  <button className="rz-btn-action orange-gradient" onClick={guardarZonas} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
                    {loading ? ' GUARDANDO...' : ' GUARDAR'}
                  </button>
                  <button className="rz-btn-action gray-gradient" onClick={() => {
                    setModalAbierto(false);
                    setPreviewImg(null);
                    setSelectedFile(null);
                    setEsOtraZona(false);
                    setNuevaZona({ nombre: '', descripcion: '' });
                  }}>
                    <X size={18} /> CANCELAR
                  </button>
                </div>
              </div>

              <div className="rz-modal-body">
                <div className="rz-input-group">
                  <label>SELECCIONA LAS ZONAS A AGREGAR</label>
                  <div className="rz-multi-select-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                    gap: '10px', 
                    marginTop: '10px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '10px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px'
                  }}>
                    {OPCIONES_PREDEFINIDAS.map(opc => (
                      <button
                        key={opc}
                        type="button"
                        onClick={() => toggleZonaSelection(opc)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: zonasSeleccionadas.includes(opc) ? '#F26522' : '#ddd',
                          backgroundColor: zonasSeleccionadas.includes(opc) ? '#F26522' : 'white',
                          color: zonasSeleccionadas.includes(opc) ? 'white' : '#444',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
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
                      onClick={() => setEsOtraZona(!esOtraZona)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: esOtraZona ? '#F26522' : '#ddd',
                          backgroundColor: esOtraZona ? '#F26522' : 'white',
                          color: esOtraZona ? 'white' : '#444',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                      OTRA...
                    </button>
                  </div>

                  {esOtraZona && (
                    <input 
                      type="text" 
                      placeholder="ESCRIBE AQUÍ EL NOMBRE DE LA ZONA..." 
                      value={nuevaZona.nombre}
                      onChange={(e) => setNuevaZona({...nuevaZona, nombre: e.target.value.toUpperCase()})}
                      style={{ marginTop: '15px', width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RegistroZonas;
