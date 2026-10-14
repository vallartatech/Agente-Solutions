import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import UniversalSearch from "../../../components/Shared/UniversalSearch"; 
import Header from "../../../components/Shared/Header"; 
import ModalCompraEspacios from "../../../components/Shared/ModalCompraEspacios";
import ModalRegistroInmueble from "../../../components/Shared/ModalRegistroInmueble";
import "../../../styles/AgenteMarket/Admin/VistaPropiedades.css";
import "../../../styles/AgenteMarket/Cliente/DetallePropiedad.css";
import { 
  X, CheckCircle, User, AlertTriangle, ListChecks, Clock, CheckCircle2, 
  LayoutDashboard, ChevronLeft, PlusCircle, FileText, Home, Wrench, 
  MessageSquare, Camera, UserCheck, ImageIcon, Loader2 
} from "lucide-react";

const TIPOS_PROPIEDAD = [
  { label: "TODAS", icon: "🌐", title: "TODAS" },
];

const VistaPropiedades = () => {
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState("TODAS");
  const [cargando, setCargando] = useState(true);
  const [listaPropiedades, setListaPropiedades] = useState([]);
  const [propiedadesFiltradas, setPropiedadesFiltradas] = useState([]);
  const [subInfo, setSubInfo] = useState(null);
  const [mostrarModalCompraEspacios, setMostrarModalCompraEspacios] = useState(false);
  const [mostrarModalRegistroPropiedad, setMostrarModalRegistroPropiedad] = useState(false);
  const [pestanaOrigen, setPestanaOrigen] = useState("AGENTE_SOLUTIONS");

  // MODAL LEVANTAMIENTO (TARJETAS INDIVIDUALES)
  const [mostrarModalServicio, setMostrarModalServicio] = useState(false);
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState(null);
  const [globalStats, setGlobalStats] = useState({ sos: 0, todo: 0, progress: 0, done: 0 });
  const [pasoModal, setPasoModal] = useState(1); 
  const [nombreResponsable, setNombreResponsable] = useState("");
  const [tecnicosRol2, setTecnicosRol2] = useState([]);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState("");
  const [cargandoTecnicos, setCargandoTecnicos] = useState(false);
  const [enviandoServicio, setEnviandoServicio] = useState(false);

  // MODAL REPORTAR PROBLEMA (BOTÓN SUPERIOR "SOLICITAR SERVICIO")
  const [mostrarModalReportarProblema, setMostrarModalReportarProblema] = useState(false);
  const [propiedadReporteId, setPropiedadReporteId] = useState("");
  const [zonasDisponibles, setZonasDisponibles] = useState([]);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [equiposDisponibles, setEquiposDisponibles] = useState({});
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [loadingSubmitProblema, setLoadingSubmitProblema] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [nuevoProblema, setNuevoProblema] = useState({
    tipo: '',
    zona: '',
    area_id: '',
    equipo: '',
    descripcion: '',
    fotos: []
  });
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  // ESTADOS PARA EDICIÓN
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [propiedadAEditar, setPropiedadAEditar] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editFoto, setEditFoto] = useState(null);
  const [editando, setEditando] = useState(false);
  
  // CONTEXTO DE BÚSQUEDA (desde MainLayoutCliente)
  let searchTerm = "";
  try {
    const outletContext = useOutletContext();
    searchTerm = outletContext?.searchTerm || "";
  } catch (e) {
    // Si no está dentro de un Outlet (por ejemplo al renderizarse como children en MainLayoutCliente), ignoramos el error.
  }
  
  // ROLE CHECK
  const user = JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData;
  const isClient = user?.role_id === 3;

  useEffect(() => {
    obtenerPropiedades();
    
    // Escuchar cuando el usuario regrese a esta pestaña para actualizar datos
    window.addEventListener('focus', obtenerPropiedades);
    return () => window.removeEventListener('focus', obtenerPropiedades);
  }, []);

  const obtenerPropiedades = async () => {
    try {
      const token = localStorage.getItem('agente_token'); 

      const [propsRes, statsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/work-orders/global-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      setListaPropiedades(propsRes.data);
      setGlobalStats(statsRes.data);

      if (user?.role_id === 4 || user?.role_id === 5) {
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/tenant/subscription-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(r => { if (r.data.success) setSubInfo(r.data); })
          .catch(() => {});
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setCargando(false);
    }
  };

  const maxAllowed = (subInfo?.max_properties ?? 3) + (subInfo?.extra_properties_count ?? 0);
  const currentCount = subInfo?.properties_count ?? listaPropiedades.length;
  const isPersonalOrAutonomo = user?.role_id === 5 || user?.role_id === 4;
  const isLimitReached = isPersonalOrAutonomo && (currentCount >= maxAllowed);

  const isRootOrAgenteAdmin = user?.role_id === 1 || user?.role_id === 0 || (user?.role_id === 2 && (!user?.tenant_id || user?.tenant_id === 1));
  const countAgenteSolutions = listaPropiedades.filter(p => !p.tenant_id || p.tenant_id === 1).length;
  const countAutonomos = listaPropiedades.filter(p => p.tenant_id && p.tenant_id !== 1).length;

  // Lógica de filtrado manual combinando categoría y búsqueda del sidebar
  useEffect(() => {
    const termino = searchTerm.toLowerCase();
    
    const filtrados = listaPropiedades.filter((item) => {
      // 1. Filtro por categoría (CASA, MANSION, etc.)
      const coincideCategoria = categoria === "TODAS" || (item.tipo && item.tipo.toUpperCase() === categoria);
      
      // 2. Filtro por búsqueda de texto
      const coincideBusqueda = 
        (item.nombre_propiedad || '').toLowerCase().includes(termino) ||
        (item.address || item.direccion || '').toLowerCase().includes(termino) ||
        (item.curp || '').toLowerCase().includes(termino); // Usamos CURP como folio si aplica

      // 3. Filtro por Pestaña de Origen (Solo si es Admin / Root de Agente Solutions)
      let coincideOrigen = true;
      if (isRootOrAgenteAdmin) {
        if (pestanaOrigen === "AGENTE_SOLUTIONS") {
          coincideOrigen = !item.tenant_id || item.tenant_id === 1;
        } else if (pestanaOrigen === "AUTONOMOS") {
          coincideOrigen = item.tenant_id && item.tenant_id !== 1;
        }
      }

      return coincideCategoria && coincideBusqueda && coincideOrigen;
    });

    setPropiedadesFiltradas(filtrados);
  }, [searchTerm, listaPropiedades, categoria, pestanaOrigen]);

  const eliminarPropiedad = async (propiedad) => {
    const { id, nombre_propiedad } = propiedad;
    
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Quieres eliminar la propiedad "${nombre_propiedad}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('agente_token');
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setListaPropiedades((prev) => prev.filter((p) => p.id !== id));
        Swal.fire({
          title: '¡Eliminado!',
          text: 'La propiedad ha sido eliminada con éxito.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire('Error', 'Hubo un problema al eliminar la propiedad.', 'error');
      }
    }
  };

  const obtenerTecnicosRol2 = async () => {
    setCargandoTecnicos(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios`, { headers });
      const todos = res.data || [];
      const tecnicos = todos.filter(u => Number(u.role_id) === 2);
      setTecnicosRol2(tecnicos);
    } catch (err) {
      console.error("Error al obtener técnicos por /usuarios:", err);
      try {
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const resFallback = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios/tecnicos`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setTecnicosRol2(resFallback.data || []);
      } catch (e2) {
        console.error("Error fallback /usuarios/tecnicos:", e2);
      }
    } finally {
      setCargandoTecnicos(false);
    }
  };

  const abrirModalParaPropiedad = (propiedad) => {
    setPropiedadSeleccionada(propiedad);
    setPasoModal(1); 
    setNombreResponsable("");
    setTecnicoSeleccionado("");
    obtenerTecnicosRol2();
    setMostrarModalServicio(true);
  };

  const cargarZonasDePropiedad = async (propId) => {
    if (!propId) {
      setZonasDisponibles([]);
      return;
    }
    setLoadingZonas(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/${propId}/areas`, { headers });
      setZonasDisponibles(res.data || []);
    } catch (error) {
      console.error("Error cargando zonas:", error);
      setZonasDisponibles([]);
    } finally {
      setLoadingZonas(false);
    }
  };

  // Botón superior "SOLICITAR SERVICIO" -> Abre Modal "Reportar Problema" (Imagen 2)
  const handleAbrirReportarProblema = () => {
    if (!listaPropiedades || listaPropiedades.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin propiedades',
        text: 'Primero debes registrar una propiedad para poder reportar un problema o solicitar servicio.',
        confirmButtonColor: '#f26522'
      });
      return;
    }
    const targetId = propiedadSeleccionada?.id || listaPropiedades[0]?.id;
    setPropiedadReporteId(targetId);
    setNuevoProblema({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', fotos: [] });
    setEquiposDisponibles({});
    if (targetId) {
      cargarZonasDePropiedad(targetId);
    }
    setMostrarModalReportarProblema(true);
  };

  const handleCambioPropiedadReporte = (propId) => {
    setPropiedadReporteId(propId);
    setNuevoProblema(prev => ({ ...prev, zona: '', area_id: '', equipo: '' }));
    setEquiposDisponibles({});
    cargarZonasDePropiedad(propId);
  };

  const handleZonaChangeProblema = async (areaId) => {
    if (areaId === 'otro') {
      setNuevoProblema(prev => ({ 
        ...prev, 
        area_id: 'otro', 
        zona: 'Otro', 
        equipo: '' 
      }));
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

    setNuevoProblema(prev => ({ 
      ...prev, 
      area_id: areaId, 
      zona: selectedArea ? selectedArea.name : '', 
      equipo: '' 
    }));
    
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

  const handleFileSelectProblema = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setNuevoProblema(prev => ({
      ...prev,
      fotos: [...prev.fotos, ...files].slice(0, 2)
    }));
  };

  const removeFotoProblema = (index) => {
    setNuevoProblema(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }));
  };

  const selectPhotoSourceProblema = (source) => {
    if (source === 'camera') {
      cameraRef.current?.click();
    } else {
      galleryRef.current?.click();
    }
    setIsPhotoMenuOpen(false);
  };

  const handleSubmitReportarProblema = async (e) => {
    e.preventDefault();
    if (!propiedadReporteId) {
      alert("Por favor selecciona una propiedad.");
      return;
    }
    if (!nuevoProblema.tipo || !nuevoProblema.area_id || !nuevoProblema.descripcion) {
      alert("Por favor completa los campos obligatorios (Tipo, Zona y Descripción).");
      return;
    }

    setLoadingSubmitProblema(true);
    try {
      const token = localStorage.getItem('agente_token');
      const formData = new FormData();
      formData.append('property_id', propiedadReporteId);
      formData.append('type', nuevoProblema.tipo);
      formData.append('zone', nuevoProblema.zona);
      formData.append('equipment', nuevoProblema.equipo || '');
      
      const descFinal = nuevoProblema.equipo 
        ? `${nuevoProblema.descripcion}\n\n[EQUIPO AFECTADO]: ${nuevoProblema.equipo}`
        : nuevoProblema.descripcion;
      
      formData.append('description', descFinal);

      nuevoProblema.fotos.forEach((foto, index) => {
        formData.append(`evidence_${index + 1}`, foto);
      });

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/work-orders/cliente`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Reporte Levantado!',
          text: 'El reporte del problema ha sido enviado exitosamente.',
          confirmButtonColor: '#f26522'
        });
        setMostrarModalReportarProblema(false);
        setNuevoProblema({ tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', fotos: [] });
        obtenerPropiedades();
      }
    } catch (error) {
      console.error("Error enviando reporte:", error);
      alert("Hubo un error al enviar el reporte.");
    } finally {
      setLoadingSubmitProblema(false);
    }
  };

  // Enviar solicitud de levantamiento con técnico (Rol 2) asignado
  const enviarLevantamiento = async (e) => {
    e.preventDefault();
    if (enviandoServicio) return;
    setEnviandoServicio(true);

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');

      const techSelectedObj = tecnicosRol2.find(t => String(t.id) === String(tecnicoSeleccionado));
      const techName = techSelectedObj ? `${techSelectedObj.first_name} ${techSelectedObj.last_name}`.trim() : null;

      const payload = {
        property_id: propiedadSeleccionada?.id,
        title: "Levantamiento Inicial",
        description: `Solicitud de visita técnica para registro inicial de la propiedad.${techName ? ` Técnico asignado: ${techName}` : ''}`,
        priority: "Media",
        supervisor_name: (nombreResponsable && nombreResponsable.trim() !== "") ? nombreResponsable.trim() : (techName || "El propietario"),
        technician_id: tecnicoSeleccionado || null,
        tecnico_id: tecnicoSeleccionado || null
      };

      const respuesta = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/servicios`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (respuesta.data && (respuesta.data.success || respuesta.status === 200 || respuesta.status === 201)) {
        setPasoModal(2); 
      } else {
        alert(respuesta.data?.message || "No se pudo crear la solicitud de servicio.");
      }
    } catch (error) {
      console.error("Error al reportar:", error);
      const msg = error.response?.data?.message || error.message || "Hubo un error al solicitar el servicio.";
      alert(msg);
    } finally {
      setEnviandoServicio(false);
    }
  };

  const cerrarModalYRecargar = () => {
    setMostrarModalServicio(false);
    navigate("/levantamientos"); 
  };

  const abrirModalEditar = (propiedad) => {
    setPropiedadAEditar(propiedad);
    setEditNombre(propiedad.nombre_propiedad || "");
    setEditFoto(null);
    setMostrarModalEditar(true);
  };

  const handleUpdateProperty = async (e) => {
    e.preventDefault();
    setEditando(true);
    try {
      const token = localStorage.getItem('agente_token');
      const formData = new FormData();
      formData.append('property_name', editNombre);
      if (editFoto) {
        formData.append('facade_photo', editFoto);
      }

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/propiedades/${propiedadAEditar.id}/update`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Actualizar lista local
      setListaPropiedades(prev => prev.map(p => 
        p.id === propiedadAEditar.id 
          ? { ...p, nombre_propiedad: data.property.property_name, foto_url: data.foto_url } 
          : p
      ));

      setMostrarModalEditar(false);
    } catch (error) {
      console.error("Error al actualizar:", error);
      alert("Hubo un error al actualizar la propiedad.");
    } finally {
      setEditando(false);
    }
  };

  return (
    <div className="main-container bg-light">
      {!isClient && (
        <>
          <div className="top-bar-orange" />
          <div className="top-bar-black" />
          <Header titulo="PROPIEDADES" />
        </>
      )}

      <section className="content-area">
        
        
        {/* --- NUEVO TABLERO COMPACTO PARA PC (Solo Clientes) --- */}
        {isClient && (
          <div className="pc-dashboard-header">
            <div className="pc-dashboard-top-section">
              <div className="pc-title-group">
                <LayoutDashboard size={22} color="#F26522" />
                <h2 className="pc-dashboard-title">Tablero de Control</h2>
              </div>
              <div className="pc-stats-row">
                <div className="pc-stat-item sos">
                  <div className="pc-stat-box"><strong>{globalStats.sos}</strong></div>
                  <span>SOS</span>
                </div>
                <div className="pc-stat-item todo">
                  <div className="pc-stat-box"><strong>{globalStats.todo}</strong></div>
                  <span>POR HACER</span>
                </div>
                <div className="pc-stat-item progress">
                  <div className="pc-stat-box"><strong>{globalStats.progress}</strong></div>
                  <span>PROCESO</span>
                </div>
                <div className="pc-stat-item done">
                  <div className="pc-stat-box"><strong>{globalStats.done}</strong></div>
                  <span>LISTOS</span>
                </div>
              </div>
            </div>
            
            <div className="pc-dashboard-actions">
              {isLimitReached ? (
                <button 
                  className="pc-add-btn" 
                  onClick={() => setMostrarModalCompraEspacios(true)}
                  style={{ background: 'linear-gradient(135deg, #FF6600 0%, #d94e00 100%)', border: '2px solid #FF6600', boxShadow: '0 4px 15px rgba(255,102,0,0.5)' }}
                >
                  <span>🔒</span> COMPRAR ESPACIO PROPIEDAD ($79.99)
                </button>
              ) : (
                <button className="pc-add-btn" onClick={() => setMostrarModalRegistroPropiedad(true)}>
                   <span>+</span> AGREGAR PROPIEDAD
                </button>
              )}
            </div>
          </div>
        )}

        {/* Solo para Admin / Autónomo: Buscador y Botón Circular */}
        {!isClient && (
           <div className="search-header-flex" style={{ flexWrap: 'wrap', gap: '14px' }}>
              <div className="search-container-center">
                <UniversalSearch
                  type="PROPIEDADES"
                  data={listaPropiedades}
                  setFilteredData={setPropiedadesFiltradas}
                  filtroActual={categoria}
                  placeholder="PROPIEDADES"
                />
              </div>

              {isLimitReached ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn-add-circle"
                    disabled
                    style={{ backgroundColor: '#64748b', borderColor: '#475569', cursor: 'not-allowed', opacity: 0.5 }}
                    title="Límite de propiedades alcanzado"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setMostrarModalCompraEspacios(true)}
                    style={{
                      padding: '12px 20px', borderRadius: '50px', border: '2px solid #FF6600',
                      background: 'linear-gradient(135deg, #FF6600 0%, #d94e00 100%)', color: '#FFFFFF',
                      fontWeight: 900, cursor: 'pointer', fontSize: '0.88rem',
                      boxShadow: '0 6px 20px rgba(255,102,0,0.5)', display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    🔒 REQUIERE NUEVA PROPIEDAD: COMPRAR ESPACIO ($79.99 c/u)
                  </button>
                </div>
              ) : (
                <button
                  className="btn-add-circle"
                  onClick={() => setMostrarModalRegistroPropiedad(true)}
                  title="NUEVA PROPIEDAD"
                >
                  +
                </button>
              )}
           </div>
        )}

        {isRootOrAgenteAdmin && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', padding: '0 10px' }}>
            <button
              onClick={() => { setPestanaOrigen("AGENTE_SOLUTIONS"); setCategoria("TODAS"); }}
              style={{
                padding: '11px 22px', borderRadius: '50px', fontWeight: 900, fontSize: '0.88rem',
                border: pestanaOrigen === "AGENTE_SOLUTIONS" ? '2px solid #FF6600' : '2px solid #334155',
                background: pestanaOrigen === "AGENTE_SOLUTIONS" ? 'linear-gradient(135deg, #FF6600 0%, #d94e00 100%)' : '#1e293b',
                color: '#fff', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: pestanaOrigen === "AGENTE_SOLUTIONS" ? '0 6px 20px rgba(255,102,0,0.4)' : 'none'
              }}
            >
              <span>🛡️ AGENTE SOLUTIONS</span>
              <span style={{ background: pestanaOrigen === "AGENTE_SOLUTIONS" ? 'rgba(0,0,0,0.25)' : '#334155', padding: '2px 9px', borderRadius: '20px', fontSize: '0.8rem' }}>
                {countAgenteSolutions}
              </span>
            </button>

            <button
              onClick={() => { setPestanaOrigen("AUTONOMOS"); setCategoria("TODAS"); }}
              style={{
                padding: '11px 22px', borderRadius: '50px', fontWeight: 900, fontSize: '0.88rem',
                border: pestanaOrigen === "AUTONOMOS" ? '2px solid #3b82f6' : '2px solid #334155',
                background: pestanaOrigen === "AUTONOMOS" ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#1e293b',
                color: '#fff', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: pestanaOrigen === "AUTONOMOS" ? '0 6px 20px rgba(37,99,235,0.4)' : 'none'
              }}
            >
              <span>🏢 AUTÓNOMOS & EMPRESAS</span>
              <span style={{ background: pestanaOrigen === "AUTONOMOS" ? 'rgba(0,0,0,0.25)' : '#334155', padding: '2px 9px', borderRadius: '20px', fontSize: '0.8rem' }}>
                {countAutonomos}
              </span>
            </button>

            <button
              onClick={() => { setPestanaOrigen("TODOS"); setCategoria("TODAS"); }}
              style={{
                padding: '11px 22px', borderRadius: '50px', fontWeight: 900, fontSize: '0.88rem',
                border: pestanaOrigen === "TODOS" ? '2px solid #10b981' : '2px solid #334155',
                background: pestanaOrigen === "TODOS" ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)' : '#1e293b',
                color: '#fff', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: pestanaOrigen === "TODOS" ? '0 6px 20px rgba(16,185,129,0.4)' : 'none'
              }}
            >
              <span>🌐 TODAS EN SISTEMA</span>
              <span style={{ background: pestanaOrigen === "TODOS" ? 'rgba(0,0,0,0.25)' : '#334155', padding: '2px 9px', borderRadius: '20px', fontSize: '0.8rem' }}>
                {listaPropiedades.length}
              </span>
            </button>
          </div>
        )}

        {!isClient && (
          <div className="categories-row-container">
            <div className="categories-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                className={`cat-btn ${categoria === "TODAS" ? "active" : ""}`}
                onClick={() => setCategoria("TODAS")}
              >
                <span className="btn-icon-small">🌐</span> TODAS
              </button>

              <button
                type="button"
                className="btn-solicitar-servicio-bar"
                onClick={handleAbrirReportarProblema}
                style={{
                  background: 'linear-gradient(135deg, #f26522 0%, #ea580c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '10px 24px',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  fontFamily: "'Outfit', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(242, 101, 34, 0.35)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.4px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(242, 101, 34, 0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(242, 101, 34, 0.35)';
                }}
              >
                <PlusCircle size={20} color="#ffffff" strokeWidth={2.8} /> SOLICITAR SERVICIO
              </button>
            </div>
          </div>
        )}

        <div className="properties-grid">
          {cargando ? (
            <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '50px', color: '#666' }}>
              Cargando propiedades... ⏳
            </div>
          ) : propiedadesFiltradas.length > 0 ? (
            propiedadesFiltradas.map((p) => (
              <div key={p.id} className="property-card" style={{ position: 'relative' }}>
                
                {p.tenant_id && p.tenant_id !== 1 && (
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', padding: '5px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    🏢 {p.tenant_name || p.propietario || 'Autónomo'}
                  </div>
                )}

                {p.is_shared_with_me && (
                  <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(242, 101, 34, 0.9)', color: 'white', padding: '5px 10px', borderRadius: '5px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    🤝 COMPARTIDA CONTIGO
                  </div>
                )}
                {p.is_shared_by_me && !p.is_shared_with_me && (
                  <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(76, 175, 80, 0.9)', color: 'white', padding: '5px 10px', borderRadius: '5px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    🔗 COMPARTIENDO
                  </div>
                )}

                {/* 👇 AQUÍ ESTÁ LA MAGIA LIMPIA 👇 */}
                <img 
                  src={p.foto_url || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1000'} 
                  alt={p.nombre_propiedad || "Propiedad"} 
                  className="property-image" 
                />

                <div className="property-name-bar">
                  <h3>{p.nombre_propiedad || "Propiedad sin nombre"}</h3>
                </div>

                  <div className="property-overlay">
                    <div className="overlay-icon-actions">
                      <button 
                        className="btn-icon-overlay" 
                        title="Editar"
                        onClick={(e) => { e.stopPropagation(); abrirModalEditar(p); }}
                      >
                        ✏️
                      </button>
                      
                      {/* La papelera si la dejamos solo para Admin por seguridad, o tú me dices */}
                      {!p.is_shared_with_me && (
                        <button 
                          className="btn-icon-overlay" 
                          title="Eliminar"
                          onClick={(e) => { e.stopPropagation(); eliminarPropiedad(p); }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    <h3 className="property-title-overlay">
                      {p.nombre_propiedad || "Propiedad sin nombre"}
                    </h3>
                    <div className="overlay-actions">
                      {/* BOTÓN 1: DETALLES DE PROPIEDAD */}
                      <button
                        className="btn-overlay secondary"
                        onClick={() => {
                          localStorage.setItem('current_property_id', p.id);
                          localStorage.setItem('current_levantamiento_id', p.id_levantamiento || '');
                          window.dispatchEvent(new Event('sync-agente-ids'));
                          
                          if (isClient) {
                            navigate(`/DetallePropiedad/${p.id}`);
                          } else {
                            navigate(`/detalle-propiedad/${p.id}`);
                          }
                        }}
                      >
                        DETALLES DE PROPIEDAD
                      </button>

                      {/* BOTÓN 2: VER O SOLICITAR LEVANTAMIENTO */}
                      {p.levantamiento_realizado ? (
                        <button 
                          className="btn-overlay primary" 
                          style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none' }}
                          onClick={() => {
                            localStorage.setItem('current_property_id', p.id);
                            window.dispatchEvent(new Event('sync-agente-ids'));
                            
                            if (p.id_levantamiento) {
                              localStorage.setItem('current_levantamiento_id', p.id_levantamiento);
                              navigate(`/detalle-reporte/${p.id_levantamiento}`);
                            } else {
                              // Si no hay servicio pero hay zonas, vamos al reporte usando el ID de propiedad
                              navigate(`/detalle-reporte/prop_${p.id}`);
                            }
                          }}
                        >
                          VER LEVANTAMIENTO
                        </button>
                      ) : (
                        <button
                          className="btn-overlay primary"
                          onClick={() => abrirModalParaPropiedad(p)}
                        >
                          {p.has_pending_service ? "LEVANTAMIENTO SOLICITADO" : "SOLICITAR LEVANTAMIENTO"}
                        </button>
                      )}

                      {/* BOTÓN 3: REALIZAR MI PROPIO LEVANTAMIENTO / EDITAR */}
                      <button
                        className="btn-overlay primary"
                        style={{ backgroundColor: '#F26522', color: 'white', border: 'none' }}
                        onClick={() => navigate(`/RegistroZonas/${encodeURIComponent(p.curp)}`)} 
                      >
                        {p.levantamiento_realizado ? "✏️ EDITAR LEVANTAMIENTO" : "📸 REALIZAR MI PROPIO LEVANTAMIENTO"}
                      </button>
                    </div>
                  </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '50px', color: '#666' }}>
              No hay propiedades en esta categoría.
            </div>
          )}
        </div>

      </section>

      {/* MODAL DE SOLICITAR LEVANTAMIENTO */}
      {mostrarModalServicio && createPortal(
        <div
          className="modal-overlay"
          onClick={() =>
            pasoModal === 1
              ? setMostrarModalServicio(false)
              : cerrarModalYRecargar()
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(8px)",
            padding: "20px",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "480px",
              width: "100%",
              padding: "32px",
              borderRadius: "20px",
              backgroundColor: "white",
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              zIndex: 10000000
            }}
          >
            {pasoModal === 1 && (
              <button
                className="close-modal"
                onClick={() => setMostrarModalServicio(false)}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: "rgba(0,0,0,0.06)",
                  border: "none",
                  borderRadius: "50%",
                  width: "34px",
                  height: "34px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
              >
                <X size={20} color="#333" strokeWidth={2.8} />
              </button>
            )}

            {pasoModal === 1 && (
              <form
                onSubmit={enviarLevantamiento}
                style={{ textAlign: "center" }}
              >
                <div style={{ display: "inline-flex", padding: "6px 14px", borderRadius: "50px", background: "rgba(242, 101, 34, 0.12)", color: "#f26522", fontWeight: 800, fontSize: "0.8rem", marginBottom: "12px", letterSpacing: "0.5px" }}>
                  NUEVO SERVICIO
                </div>
                <h2
                  style={{
                    fontSize: "1.35rem",
                    color: "#1e293b",
                    marginBottom: "16px",
                    fontWeight: 800,
                    lineHeight: "1.3",
                  }}
                >
                  Solicitar Levantamiento / Servicio
                </h2>

                <p
                  style={{
                    color: "#64748b",
                    fontSize: "0.95rem",
                    marginBottom: "20px",
                    background: "#f8fafc",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <strong style={{ color: "#334155" }}>Propiedad:</strong> {propiedadSeleccionada?.nombre_propiedad || propiedadSeleccionada?.direccion || "Sin especificar"}
                </p>

                {/* SELECTOR DE TÉCNICOS ROL 2 LIGADOS AL ADMIN */}
                <div style={{ textAlign: "left", marginBottom: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", color: "#334155", fontWeight: "bold", marginBottom: "8px" }}>
                    <UserCheck size={18} color="#f26522" /> Técnico Asignado (Rol 2)
                  </label>
                  {cargandoTecnicos ? (
                    <div style={{ color: '#64748b', fontSize: '0.88rem', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      Cargando técnicos vinculados... ⏳
                    </div>
                  ) : tecnicosRol2.length > 0 ? (
                    <select
                      value={tecnicoSeleccionado}
                      onChange={(e) => setTecnicoSeleccionado(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "0.92rem",
                        backgroundColor: "#fff",
                        color: "#1e293b",
                        fontWeight: "600",
                        outline: "none"
                      }}
                    >
                      <option value="">-- Seleccionar Técnico Vinculado (Rol 2) --</option>
                      {tecnicosRol2.map(t => (
                        <option key={t.id} value={t.id}>
                          🔧 {t.first_name || ''} {t.last_name || ''} ({t.email})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                      No hay técnicos de rol 2 vinculados actualmente a tu cuenta.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    textAlign: "left",
                    marginBottom: "25px",
                    backgroundColor: "#f8fafc",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.88rem",
                      color: "#334155",
                      fontWeight: "bold",
                      marginBottom: "8px",
                    }}
                  >
                    <User size={18} color="#f26522" /> Asignar Supervisor (Opcional)
                  </label>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "#64748b",
                      marginBottom: "10px",
                      lineHeight: "1.4",
                    }}
                  >
                    Si el dueño no se encontrará en la propiedad, asigne a
                    alguien responsable de atender la visita.
                  </p>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez (Conserje)"
                    value={nombreResponsable}
                    onChange={(e) => setNombreResponsable(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      fontSize: "0.9rem",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMostrarModalServicio(false)}
                    style={{
                      padding: "12px 20px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      backgroundColor: "white",
                      color: "#475569",
                      fontWeight: "bold",
                      cursor: "pointer",
                      flex: 1,
                    }}
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoServicio}
                    style={{
                      padding: "12px 20px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: enviandoServicio ? "#94a3b8" : "#f26522",
                      color: "white",
                      fontWeight: "bold",
                      cursor: enviandoServicio ? "not-allowed" : "pointer",
                      flex: 1,
                      boxShadow: enviandoServicio ? "none" : "0 4px 14px rgba(242, 101, 34, 0.4)"
                    }}
                  >
                    {enviandoServicio ? "SOLICITANDO..." : "SÍ, SOLICITAR"}
                  </button>
                </div>
              </form>
            )}

            {pasoModal === 2 && (
              <div style={{ textAlign: "center", padding: "20px 10px" }}>
                <CheckCircle
                  size={64}
                  color="#10b981"
                  style={{ margin: "0 auto 16px auto" }}
                />
                <h2 style={{ color: "#1e293b", marginBottom: "12px", fontWeight: 800 }}>
                  ¡Levantamiento Solicitado!
                </h2>
                <p
                  style={{
                    color: "#64748b",
                    lineHeight: "1.5",
                    marginBottom: "26px",
                    fontSize: "0.95rem"
                  }}
                >
                  Ha solicitado un levantamiento para esta propiedad. Se le
                  notificará la fecha y hora de visita pronto.
                </p>
                <button
                  onClick={cerrarModalYRecargar}
                  style={{
                    padding: "12px 30px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#10b981",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                    width: "100%",
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
                  }}
                >
                  ENTENDIDO
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================
          MODAL: REPORTAR PROBLEMA (ACTIVADO POR EL BOTÓN SUPERIOR)
          ======================================================== */}
      {mostrarModalReportarProblema && createPortal(
        <div 
          className="modal-overlay" 
          onClick={() => setMostrarModalReportarProblema(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(8px)",
            padding: "20px",
          }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "600px",
              width: "100%",
              padding: "32px",
              borderRadius: "20px",
              backgroundColor: "white",
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              zIndex: 10000000,
              maxHeight: "88vh",
              overflowY: "auto"
            }}
          >
            <button 
              className="close-modal" 
              onClick={() => setMostrarModalReportarProblema(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(0,0,0,0.06)",
                border: "none",
                borderRadius: "50%",
                width: "34px",
                height: "34px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              <X size={20} color="#333" strokeWidth={2.8} />
            </button>
            <div className="modal-header">
              <div className="modal-tag">NUEVA SOLICITUD</div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#1e293b", margin: "4px 0 16px 0" }}>Reportar Problema</h2>
            </div>
            <form className="modal-body service-form" onSubmit={handleSubmitReportarProblema}>
              {/* CAMPO: SELECCIÓN DE PROPIEDAD */}
              <div className="form-group">
                <label><Home size={16}/> Propiedad a Reportar *</label>
                <select 
                  required 
                  value={propiedadReporteId}
                  onChange={(e) => handleCambioPropiedadReporte(e.target.value)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.95rem",
                    backgroundColor: "#fff",
                    color: "#1e293b",
                    fontWeight: "600",
                    outline: "none"
                  }}
                >
                  <option value="">Selecciona la propiedad...</option>
                  {listaPropiedades.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_propiedad || p.direccion || `Propiedad #${p.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* CAMPO: TIPO DE SERVICIO */}
              <div className="form-group">
                <label><FileText size={16}/> Tipo de Servicio *</label>
                <select 
                  required 
                  value={nuevoProblema.tipo}
                  onChange={(e) => setNuevoProblema({...nuevoProblema, tipo: e.target.value})}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.95rem",
                    backgroundColor: "#fff",
                    color: "#1e293b",
                    outline: "none"
                  }}
                >
                  <option value="">Selecciona el tipo...</option>
                  <option value="Mantenimiento">Mantenimiento Preventivo</option>
                  <option value="Problema">Problema / Reparación</option>
                </select>
              </div>

              {/* CAMPO: ZONA DE LA PROPIEDAD */}
              <div className="form-group">
                <label><Home size={16}/> Zona de la propiedad *</label>
                <select 
                  required 
                  value={nuevoProblema.area_id}
                  onChange={(e) => handleZonaChangeProblema(e.target.value)}
                  disabled={loadingZonas || !propiedadReporteId}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.95rem",
                    backgroundColor: "#fff",
                    color: "#1e293b",
                    outline: "none"
                  }}
                >
                  <option value="">
                    {!propiedadReporteId 
                      ? "Primero selecciona una propiedad" 
                      : (loadingZonas ? "Cargando zonas..." : "Seleccionar zona...")}
                  </option>
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

              {/* CAMPO: EQUIPO AFECTADO */}
              <div className="form-group">
                <label><Wrench size={16}/> Equipo afectado (Opcional)</label>
                <select 
                  value={nuevoProblema.equipo}
                  disabled={!nuevoProblema.area_id || loadingEquipos}
                  onChange={(e) => setNuevoProblema({...nuevoProblema, equipo: e.target.value})}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.95rem",
                    backgroundColor: "#fff",
                    color: "#1e293b",
                    outline: "none"
                  }}
                >
                  <option value="">
                    {!nuevoProblema.area_id ? "Primero selecciona una zona" : (loadingEquipos ? "Cargando equipos..." : "Seleccionar equipo...")}
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

              {/* CAMPO: DESCRIPCIÓN */}
              <div className="form-group">
                <label><MessageSquare size={16}/> Descripción *</label>
                <textarea 
                  required 
                  rows="4" 
                  placeholder="Describe el problema..." 
                  value={nuevoProblema.descripcion}
                  onChange={(e) => setNuevoProblema({...nuevoProblema, descripcion: e.target.value})}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.95rem",
                    backgroundColor: "#fff",
                    color: "#1e293b",
                    outline: "none",
                    resize: "vertical"
                  }}
                />
              </div>

              {/* CAMPO: EVIDENCIA VISUAL */}
              <div className="form-group">
                <label><Camera size={16}/> Evidencia Visual (Máx 2 fotos)</label>
                
                <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={handleFileSelectProblema} />
                <input type="file" ref={galleryRef} hidden accept="image/*" multiple onChange={handleFileSelectProblema} />

                <div className="fotos-preview-container" style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {nuevoProblema.fotos.map((foto, idx) => (
                    <div key={idx} className="foto-preview-wrapper" style={{ position: 'relative', width: '80px', height: '80px' }}>
                      <img 
                        src={URL.createObjectURL(foto)} 
                        alt="preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', border: '2px solid #f26624' }} 
                      />
                      <button 
                        type="button"
                        onClick={() => removeFotoProblema(idx)}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#e63946', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  {nuevoProblema.fotos.length < 2 && (
                    <button 
                      type="button" 
                      className="btn-add-foto-placeholder"
                      onClick={() => setIsPhotoMenuOpen(true)}
                      style={{ width: '80px', height: '80px', border: '2px dashed #ccc', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f9f9f9', color: '#666' }}
                    >
                      <PlusCircle size={24} />
                      <span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>AÑADIR</span>
                    </button>
                  )}
                </div>
                
                <small style={{ color: '#666', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                  * Puedes subir hasta 2 imágenes como evidencia del problema.
                </small>
              </div>

              <div className="modal-footer" style={{ marginTop: "10px" }}>
                <button 
                  type="submit" 
                  className="btn-modal-close" 
                  disabled={loadingSubmitProblema}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    background: "linear-gradient(135deg, #f26522 0%, #ea580c 100%)",
                    color: "white",
                    fontWeight: 900,
                    fontSize: "1rem",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(242, 101, 34, 0.4)"
                  }}
                >
                  {loadingSubmitProblema ? "Enviando..." : "Levantar Reporte"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE SELECCIÓN DE FOTO */}
      {isPhotoMenuOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsPhotoMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10000005, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-content" style={{ maxWidth: '350px', width: "90%", padding: '0', backgroundColor: '#fff', borderRadius: "16px", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, color: '#f26624', fontWeight: 800 }}>Seleccionar Origen</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button 
                type="button" 
                onClick={() => selectPhotoSourceProblema('camera')}
                style={{ background: 'transparent', border: 'none', padding: '15px', color: '#333', borderBottom: '1px solid #eee', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 600 }}
              >
                <Camera size={20} /> Tomar Foto
              </button>
              <button 
                type="button" 
                onClick={() => selectPhotoSourceProblema('gallery')}
                style={{ background: 'transparent', border: 'none', padding: '15px', color: '#333', borderBottom: '1px solid #eee', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 600 }}
              >
                <ImageIcon size={20} /> Elegir de la Galería
              </button>
              <button 
                type="button" 
                onClick={() => setIsPhotoMenuOpen(false)}
                style={{ background: 'transparent', border: 'none', padding: '15px', color: '#666', fontSize: '1rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* MODAL DE EDICIÓN DE PROPIEDAD */}
      {mostrarModalEditar && createPortal(
        <div
          className="modal-overlay"
          onClick={() => !editando && setMostrarModalEditar(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(8px)",
            padding: "20px"
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "450px",
              width: "100%",
              padding: "30px",
              borderRadius: "16px",
              backgroundColor: "white",
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              zIndex: 10000000
            }}
          >
            <button
              className="close-modal"
              onClick={() => setMostrarModalEditar(false)}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "rgba(0,0,0,0.06)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={20} color="#333" strokeWidth={2.8} />
            </button>

            <form onSubmit={handleUpdateProperty}>
              <h2 style={{ marginBottom: '20px', color: '#1e293b', textAlign: 'center', fontWeight: 800 }}>Editar Propiedad</h2>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem', color: '#334155' }}>Nombre de la Propiedad</label>
                <input 
                  type="text" 
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  placeholder="Ej. Casa de la Playa"
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1',
                    backgroundColor: 'white',
                    color: '#1e293b',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem', color: '#334155' }}>Nueva Foto de Fachada</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setEditFoto(e.target.files[0])}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <small style={{ color: '#64748b' }}>* Dejar vacío para mantener la foto actual.</small>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMostrarModalEditar(false)}
                  disabled={editando}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editando}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#f26522',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(242, 101, 34, 0.4)'
                  }}
                >
                  {editando ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ModalRegistroInmueble
        isOpen={mostrarModalRegistroPropiedad}
        onClose={() => setMostrarModalRegistroPropiedad(false)}
        onSuccess={() => {
          obtenerPropiedades();
        }}
        user={user}
      />

      <ModalCompraEspacios
        isOpen={mostrarModalCompraEspacios}
        onClose={() => setMostrarModalCompraEspacios(false)}
        tenantId={subInfo?.tenant?.id || user?.tenant_id || 1}
        userId={user?.id}
      />
    </div>
  );
};

export default VistaPropiedades;
