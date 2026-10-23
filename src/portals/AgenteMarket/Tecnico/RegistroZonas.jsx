import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, X, Save, Loader2, ArrowLeft, LayoutGrid, CheckCircle, Building2, Home, ClipboardList, ChevronRight, Tag } from 'lucide-react';
import DetalleZona from './DetalleZona';
import RutaLevantamiento from './RutaLevantamiento';
import Header from '../../../components/Shared/Header';
import logoAgente from '../../../assets/Logo3.png';
import "../../../styles/AgenteMarket/Admin/VistaPropiedadesBase.css";
import "../../../styles/Shared/LiquidGlass.css";
import "../../../styles/AgenteMarket/Tecnico/LevantamientoZonas.css";
import { mostrarAviso, confirmarAccion } from '../../../utils/dialogos';


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
  const [nombrePropiedad, setNombrePropiedad] = useState(location.state?.nombre || '');

  // Por CURP se obtiene el nombre (para la ruta) y, si no llegó por estado, el id
  useEffect(() => {
    const fetchPropertyByCurp = async () => {
      if (!curp) return;
      try {
        const token = localStorage.getItem('agente_token');
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/by-curp/${encodeURIComponent(curp)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setNombrePropiedad(res.data.property_name || res.data.nombre_propiedad || res.data.name || '');
        if (!propertyId) {
          setIdPropiedadReal(res.data.id);
          // El backend usa 'levantamiento_realizado'
          if (res.data.levantamiento_realizado) {
            setIsFinalizado(true);
          }
        }
      } catch (error) {
        console.error("Error al buscar propiedad por CURP:", error);
      }
    };
    fetchPropertyByCurp();
  }, [curp, propertyId]);

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
      return mostrarAviso("Debes seleccionar al menos una zona o escribir el nombre de una nueva.");
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
      mostrarAviso("Hubo un error al registrar algunas zonas.");
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
    if (!servicioId) return mostrarAviso("Error: ID del servicio no encontrado.");
    if (!await confirmarAccion("¿Seguro que deseas FINALIZAR el levantamiento? Pasará a la pestaña de finalizados.")) return;
    
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
      mostrarAviso("¡Levantamiento finalizado con éxito!");
      navigate(-1);
    } catch (error) {
      console.error("Error al finalizar levantamiento:", error);
      mostrarAviso("No se pudo finalizar el levantamiento. Intenta de nuevo.");
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
      mostrarAviso("¡Registro de zonas completado con éxito!");
      setIsFinalizado(true);
      setEditMode(false);
      // No navegamos atrás para que vea el cambio a "EDITAR"
    } catch (error) {
      console.error("Error al finalizar registro:", error);
      const backendError = error.response?.data?.error || "Error desconocido";
      mostrarAviso(`Error al finalizar: ${backendError}`);
    }
  };

  const eliminarZona = async (zonaId) => {
    if (!await confirmarAccion("¿Estás seguro de eliminar esta zona? Se borrarán todos sus equipos e inventario.")) return;
    
    try {
      const token = localStorage.getItem('agente_token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${zonaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchZonas();
    } catch (error) {
      console.error("Error al eliminar zona:", error);
      mostrarAviso("No se pudo eliminar la zona.");
    }
  };

  const user = JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData;
  const isClient = user?.role_id === 3;
  // Solo los administradores finalizan; técnicos y admins pueden editar aunque ya esté finalizado
  const isAdmin = [0, 1].includes(Number(user?.role_id));
  const puedeAgregar = !isFinalizado || editMode || !isClient;

  // Ruta "dónde estoy": depende de quién entra al levantamiento
  const rol = Number(user?.role_id);
  const nombreRuta = nombrePropiedad || 'Propiedad';
  const ruta = rol === 2
    ? [
        { label: 'Trabajos asignados', Icon: Home, onClick: () => navigate('/trabajos-asignados') },
        { label: nombreRuta },
      ]
    : [
        { label: 'Propiedades', Icon: Home, onClick: () => navigate('/propiedades') },
        {
          label: nombreRuta,
          onClick: idPropiedadReal
            ? () => navigate(isClient ? `/DetallePropiedad/${idPropiedadReal}` : `/detalle-propiedad/${idPropiedadReal}`)
            : undefined,
        },
      ];
  const rutaLevantamiento = [...ruta, { label: 'Levantamiento', Icon: ClipboardList }];

  const cerrarModal = () => {
    setModalAbierto(false);
    setPreviewImg(null);
    setSelectedFile(null);
    setEsOtraZona(false);
    setZonasSeleccionadas([]);
    setNuevaZona({ nombre: '', descripcion: '' });
  };

  if (zonaSeleccionada) {
    return (
      <DetalleZona
        zona={zonaSeleccionada}
        propertyCurp={propertyCurp}
        alVolver={() => { setZonaSeleccionada(null); fetchZonas(); }}
        servicioId={servicioId}
        ruta={[
          ...ruta,
          { label: 'Levantamiento', Icon: ClipboardList, onClick: () => { setZonaSeleccionada(null); fetchZonas(); } },
        ]}
      />
    );
  }

  return (
    <div className="lz-page">
      <Header />
      <main className="lz-container">
        <RutaLevantamiento items={rutaLevantamiento} />

        {/* ENCABEZADO: propiedad + acciones */}
        <section className="lz-card lz-hero">
          <div className="lz-hero-info">
            <span className="lz-hero-icon"><ClipboardList size={26} /></span>
            <div className="lz-hero-textos">
              <h1>Levantamiento de zonas</h1>
              <p><Building2 size={14} style={{ verticalAlign: '-2px' }} /> {nombreRuta}</p>
              <div className="lz-chips">
                <span className="lz-chip"><Tag size={12} /> Folio <strong>{propertyCurp}</strong></span>
                <span className="lz-chip naranja">{zonas.length} {zonas.length === 1 ? 'zona' : 'zonas'}</span>
                {isFinalizado && !editMode && <span className="lz-chip verde"><CheckCircle size={12} /> Registro finalizado</span>}
              </div>
            </div>
          </div>

          <div className="lz-acciones">
            <button type="button" className="lz-btn lz-btn-glass" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} /> <span className="lz-btn-txt">Volver</span>
            </button>
            {puedeAgregar && (
              <button type="button" className="lz-btn lz-btn-primary" onClick={() => setModalAbierto(true)}>
                <Plus size={18} strokeWidth={2.8} /> Agregar zona
              </button>
            )}
            {servicioId && isAdmin ? (
              <button type="button" className="lz-btn lz-btn-success" onClick={finalizarLevantamiento} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                Finalizar levantamiento
              </button>
            ) : servicioId ? (
              <span className="lz-nota">
                <CheckCircle size={16} /> El administrador marcará el levantamiento como finalizado
              </span>
            ) : isClient && zonas.length > 0 ? (
              isFinalizado && !editMode ? (
                <button type="button" className="lz-btn lz-btn-glass" onClick={() => setEditMode(true)}>
                  <Save size={18} /> Editar levantamiento
                </button>
              ) : (
                <button type="button" className="lz-btn lz-btn-success" onClick={finalizarRegistroCliente}>
                  <CheckCircle size={18} /> {isFinalizado ? "Finalizar edición" : "Finalizar mi registro"}
                </button>
              )
            ) : null}
          </div>
        </section>

        {/* ZONAS */}
        {zonas.length > 0 ? (
          <div className="lz-grid">
            {zonas.map((zona) => (
              <article key={zona.id} className="lz-card lz-zona" onClick={() => setZonaSeleccionada(zona)}>
                <div className="lz-zona-img">
                  <img
                    src={zona.image_path || logoAgente}
                    alt={zona.name}
                    className={zona.image_path ? '' : 'logo'}
                  />
                </div>
                {/* BOTÓN ELIMINAR EN MODO EDICIÓN */}
                {editMode && (
                  <button
                    type="button"
                    className="lz-zona-borrar"
                    onClick={(e) => { e.stopPropagation(); eliminarZona(zona.id); }}
                    aria-label={`Eliminar ${zona.name}`}
                  >
                    <X size={17} />
                  </button>
                )}
                <div className="lz-zona-pie">
                  <h3>{zona.name}</h3>
                  <button type="button" className="lz-btn lz-btn-primary lz-btn-sm">
                    Ver zona <ChevronRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="lz-card lz-vacio">
            <LayoutGrid size={42} />
            <p>No hay zonas registradas. Comienza agregando una nueva área de levantamiento.</p>
            {puedeAgregar && (
              <button type="button" className="lz-btn lz-btn-primary" onClick={() => setModalAbierto(true)}>
                <Plus size={18} strokeWidth={2.8} /> Agregar zona
              </button>
            )}
          </div>
        )}
      </main>

      {modalAbierto && (
        <div className="rp-overlay" onClick={cerrarModal}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-header">
              <div className="rp-header-text">
                <span className="rp-tag">LEVANTAMIENTO</span>
                <h2 className="rp-title">Agregar zonas</h2>
              </div>
              <button type="button" className="rp-close" onClick={cerrarModal} aria-label="Cerrar">
                <X size={18} strokeWidth={2.6} />
              </button>
            </div>

            <div className="rp-form">
              <div className="rp-group">
                <label className="rp-label"><LayoutGrid size={16} color="#ff8c42" /> Selecciona las zonas a agregar</label>
                <div className="lz-opciones">
                  {OPCIONES_PREDEFINIDAS.map(opc => (
                    <button
                      key={opc}
                      type="button"
                      className={`lz-opcion ${zonasSeleccionadas.includes(opc) ? 'on' : ''}`}
                      onClick={() => toggleZonaSelection(opc)}
                    >
                      {opc}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`lz-opcion ${esOtraZona ? 'on' : ''}`}
                    onClick={() => setEsOtraZona(!esOtraZona)}
                  >
                    OTRA...
                  </button>
                </div>
              </div>

              {esOtraZona && (
                <div className="rp-group">
                  <label className="rp-label">Nombre de la zona</label>
                  <input
                    type="text"
                    className="lz-input"
                    placeholder="Escribe aquí el nombre de la zona..."
                    value={nuevaZona.nombre}
                    onChange={(e) => setNuevaZona({...nuevaZona, nombre: e.target.value.toUpperCase()})}
                    autoFocus
                  />
                </div>
              )}

              <div className="rp-footer lz-modal-pie">
                <button type="button" className="lz-btn lz-btn-glass" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="lz-btn lz-btn-primary" onClick={guardarZonas} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroZonas;
