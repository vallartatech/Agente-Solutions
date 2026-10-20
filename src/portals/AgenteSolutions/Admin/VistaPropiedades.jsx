import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import UniversalSearch from "../../../components/Shared/UniversalSearch"; 
import Header from "../../../components/Shared/Header"; 
import ModalCompraEspacios from "../../../components/Shared/ModalCompraEspacios";
import ModalRegistroInmueble from "../../../components/Shared/ModalRegistroInmueble";
import CasaLoader from "../../../components/Shared/CasaLoader";
import ModalEquipoLevantamiento from "../../../components/Modals/ModalEquipoLevantamiento";
import "../../../styles/AgenteSolutions/Admin/VistaPropiedades.css";
import "../../../styles/AgenteSolutions/Cliente/DetallePropiedad.css";
import "../../../styles/Shared/LiquidGlass.css";
import "../../../styles/Shared/ToolbarAcciones.css";
import { 
  X, CheckCircle, User, AlertTriangle, ListChecks, Clock, CheckCircle2, 
  LayoutDashboard, ChevronLeft, PlusCircle, Plus, Globe, FileText, Home, Wrench, 
  MessageSquare, Camera, UserCheck, ImageIcon, Loader2,
  MoreVertical, Eye, ClipboardCheck, ClipboardList, Pencil, Trash2, Users,
  Folder, FolderPlus, FolderInput, FolderOpen, ArrowLeft, FolderX, Check
} from "lucide-react";

const COLORES_CARPETA = ["#F26522", "#2563eb", "#10b981", "#8b5cf6", "#e11d48", "#0f172a"];

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
  const [pestanaOrigen, setPestanaOrigen] = useState("TODOS");

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

  // Gesto táctil: Arrastrar hacia abajo para cerrar modal Reportar Problema
  const [rpDragY, setRpDragY] = useState(0);
  const [isRpDragging, setIsRpDragging] = useState(false);
  const touchRpStartY = useRef(0);

  const handleRpTouchStart = (e) => {
    if (e.target.closest('button, input, select, textarea, a')) return;
    touchRpStartY.current = e.touches[0].clientY;
    setIsRpDragging(true);
  };

  const handleRpTouchMove = (e) => {
    if (!touchRpStartY.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchRpStartY.current;
    if (deltaY > 0) {
      setRpDragY(deltaY);
    }
  };

  const handleRpTouchEnd = () => {
    if (!touchRpStartY.current) return;
    setIsRpDragging(false);
    if (rpDragY > 80) {
      setRpDragY(window.innerHeight);
      setTimeout(() => {
        setMostrarModalReportarProblema(false);
        setRpDragY(0);
      }, 200);
    } else {
      setRpDragY(0);
    }
    touchRpStartY.current = 0;
  };

  // EDICIÓN: mismo formulario que "Registrar Propiedad" (ModalRegistroInmueble con `property`)
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [propiedadAEditar, setPropiedadAEditar] = useState(null);

  // CARPETAS (solo para organizar el catálogo; las comparten todos los admins)
  const [carpetas, setCarpetas] = useState([]);
  const [carpetaAbierta, setCarpetaAbierta] = useState(null); // id de la carpeta abierta
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [mostrarModalCarpetas, setMostrarModalCarpetas] = useState(false);
  const [nuevaCarpetaNombre, setNuevaCarpetaNombre] = useState("");
  const [nuevaCarpetaColor, setNuevaCarpetaColor] = useState(COLORES_CARPETA[0]);
  const [guardandoCarpeta, setGuardandoCarpeta] = useState(false);
  const [propiedadAMover, setPropiedadAMover] = useState(null);
  const [moviendoPropiedad, setMoviendoPropiedad] = useState(false);

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
  const isRoot = Number(user?.role_id) === 0;
  const isAgenteAdmin = Number(user?.role_id) === 1;
  const puedeOrganizar = !isClient && (isRoot || isAgenteAdmin);

  useEffect(() => {
    obtenerPropiedades();
    
    // Escuchar cuando el usuario regrese a esta pestaña para actualizar datos
    window.addEventListener('focus', obtenerPropiedades);
    return () => window.removeEventListener('focus', obtenerPropiedades);
  }, []);

  const obtenerCarpetas = async () => {
    if (!puedeOrganizar) return;
    try {
      const token = localStorage.getItem('agente_token');
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/property-folders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCarpetas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar carpetas:", error);
    }
  };

  const obtenerPropiedades = async () => {
    obtenerCarpetas();
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

      const rawProps = Array.isArray(propsRes.data) ? propsRes.data : [];
      setListaPropiedades(rawProps);
      setGlobalStats(statsRes.data);

      if (user?.role_id === 5 || user?.role_id === 4) {
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/suscripcion-info`, {
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

  // Solo ROOT (Rol 0) tiene la visión global dividida entre Agente Solutions y Autónomos
  const isRootOrAgenteAdmin = isRoot;

  const countAgenteSolutions = listaPropiedades.filter(p => !p.tenant_id || Number(p.tenant_id) === 1).length;
  const countAutonomos = listaPropiedades.filter(p => p.tenant_id && Number(p.tenant_id) !== 1).length;

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

      // 3. Filtro por Pestaña de Origen (Solo si es Root)
      let coincideOrigen = true;
      if (isRoot) {
        if (pestanaOrigen === "AGENTE_SOLUTIONS") {
          coincideOrigen = !item.tenant_id || Number(item.tenant_id) === 1;
        } else if (pestanaOrigen === "AUTONOMOS") {
          coincideOrigen = item.tenant_id && Number(item.tenant_id) !== 1;
        } else if (pestanaOrigen === "TODOS") {
          coincideOrigen = true;
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
      const tecnicos = todos
        .filter(u => Number(u.role_id) === 2)
        .map(u => ({ ...u, id: String(u.id).replace(/^u_/, '') }));
      setTecnicosRol2(tecnicos);
    } catch (err) {
      console.error("Error al obtener técnicos por /usuarios:", err);
      try {
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const resFallback = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios/tecnicos`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const tecnicosFallback = (resFallback.data || []).map(u => ({
          ...u,
          id: String(u.id).replace(/^u_/, '')
        }));
        setTecnicosRol2(tecnicosFallback);
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

      const rawCleanId = tecnicoSeleccionado ? String(tecnicoSeleccionado).replace(/^u_/, '') : null;
      const cleanTechId = rawCleanId ? Number(rawCleanId) : null;
      const techSelectedObj = tecnicosRol2.find(t => String(t.id).replace(/^u_/, '') === String(rawCleanId));
      const techName = techSelectedObj ? `${techSelectedObj.first_name} ${techSelectedObj.last_name}`.trim() : null;

      const payload = {
        property_id: propiedadSeleccionada?.id,
        title: "Levantamiento Inicial",
        description: `Solicitud de visita técnica para registro inicial de la propiedad.${techName ? ` Técnico asignado: ${techName}` : ''}`,
        priority: "Media",
        supervisor_name: (nombreResponsable && nombreResponsable.trim() !== "") ? nombreResponsable.trim() : (techName || "El propietario"),
        technician_id: cleanTechId,
        tecnico_id: cleanTechId
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

  // ACCIONES DE TARJETA (compartidas entre overlay de escritorio y menú ⋮ móvil)
  const irADetallesPropiedad = (p) => {
    localStorage.setItem('current_property_id', p.id);
    localStorage.setItem('current_levantamiento_id', p.id_levantamiento || '');
    window.dispatchEvent(new Event('sync-agente-ids'));
    navigate(isClient ? `/DetallePropiedad/${p.id}` : `/detalle-propiedad/${p.id}`);
  };

  const irAVerLevantamiento = (p) => {
    localStorage.setItem('current_property_id', p.id);
    window.dispatchEvent(new Event('sync-agente-ids'));
    if (p.id_levantamiento) {
      localStorage.setItem('current_levantamiento_id', p.id_levantamiento);
      navigate(`/detalle-reporte/${p.id_levantamiento}`);
    } else {
      // Si no hay servicio pero hay zonas, vamos al reporte usando el ID de propiedad
      navigate(`/detalle-reporte/prop_${p.id}`);
    }
  };

  const irARegistroZonas = (p) => navigate(`/RegistroZonas/${encodeURIComponent(p.curp)}`);

  // BOTÓN ÚNICO DE ACCIONES JUNTO AL BUSCADOR
  const [accionesAbiertas, setAccionesAbiertas] = useState(false);
  const accionesRef = useRef(null);

  useEffect(() => {
    if (!accionesAbiertas) return;
    const handleClickOutside = (e) => {
      if (accionesRef.current && !accionesRef.current.contains(e.target)) {
        setAccionesAbiertas(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [accionesAbiertas]);

  // MENÚ ⋮ DE TARJETA (web y móvil)
  const [menuTarjeta, setMenuTarjeta] = useState(null); // { id, top, bottom, right }
  // Equipo de trabajo del levantamiento (solo admins)
  const [equipoPropiedad, setEquipoPropiedad] = useState(null);

  const abrirMenuTarjeta = (e, p) => {
    e.stopPropagation();
    if (menuTarjeta?.id === p.id) { setMenuTarjeta(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const abrirArriba = rect.bottom + 380 > window.innerHeight;
    setMenuTarjeta({
      id: p.id,
      top: abrirArriba ? null : rect.bottom + 6,
      bottom: abrirArriba ? window.innerHeight - rect.top + 6 : null,
      right: window.innerWidth - rect.right,
    });
  };

  const ejecutarAccionMenu = (accion) => {
    setMenuTarjeta(null);
    accion();
  };

  useEffect(() => {
    if (!menuTarjeta) return;
    const cerrar = () => setMenuTarjeta(null);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [menuTarjeta]);

  const abrirModalEditar = (propiedad) => {
    setPropiedadAEditar(propiedad);
    setMostrarModalEditar(true);
  };

  // --- CARPETAS ---
  const crearCarpeta = async (e) => {
    e.preventDefault();
    const nombre = nuevaCarpetaNombre.trim();
    if (!nombre) return;
    setGuardandoCarpeta(true);
    try {
      const token = localStorage.getItem('agente_token');
      const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-folders`,
        { name: nombre, color: nuevaCarpetaColor },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setCarpetas(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNuevaCarpetaNombre("");
    } catch (error) {
      Swal.fire('Error', 'No se pudo crear la carpeta.', 'error');
    } finally {
      setGuardandoCarpeta(false);
    }
  };

  const renombrarCarpeta = async (carpeta) => {
    const { value: nombre } = await Swal.fire({
      title: 'Renombrar carpeta',
      input: 'text',
      inputValue: carpeta.name,
      inputAttributes: { maxlength: 80 },
      showCancelButton: true,
      confirmButtonColor: '#F26522',
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => !v?.trim() && 'Escribe un nombre'
    });
    if (!nombre || nombre.trim() === carpeta.name) return;
    try {
      const token = localStorage.getItem('agente_token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/property-folders/${carpeta.id}`,
        { name: nombre.trim() },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setCarpetas(prev => prev.map(c => c.id === carpeta.id ? { ...c, name: nombre.trim() } : c));
    } catch (error) {
      Swal.fire('Error', 'No se pudo renombrar la carpeta.', 'error');
    }
  };

  const eliminarCarpeta = async (carpeta) => {
    const result = await Swal.fire({
      title: `¿Eliminar "${carpeta.name}"?`,
      text: 'Las propiedades NO se eliminan: solo vuelven al catálogo principal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar carpeta',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    try {
      const token = localStorage.getItem('agente_token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-folders/${carpeta.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCarpetas(prev => prev.filter(c => c.id !== carpeta.id));
      setListaPropiedades(prev => prev.map(p => p.folder_id === carpeta.id ? { ...p, folder_id: null } : p));
      if (carpetaAbierta === carpeta.id) setCarpetaAbierta(null);
    } catch (error) {
      Swal.fire('Error', 'No se pudo eliminar la carpeta.', 'error');
    }
  };

  const moverPropiedadACarpeta = async (folderId) => {
    if (!propiedadAMover) return;
    setMoviendoPropiedad(true);
    try {
      const token = localStorage.getItem('agente_token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${propiedadAMover.id}/folder`,
        { folder_id: folderId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setListaPropiedades(prev => prev.map(p => p.id === propiedadAMover.id ? { ...p, folder_id: folderId } : p));
      setPropiedadAMover(null);
    } catch (error) {
      Swal.fire('Error', 'No se pudo mover la propiedad.', 'error');
    } finally {
      setMoviendoPropiedad(false);
    }
  };

  // Qué se ve en el catálogo: en la raíz, las carpetas + las propiedades sueltas;
  // dentro de una carpeta, solo sus propiedades. Al buscar en la raíz se busca en todo.
  const carpetaActual = puedeOrganizar ? carpetas.find(c => c.id === carpetaAbierta) || null : null;
  const idsCarpetas = new Set(carpetas.map(c => c.id));
  const mostrarCarpetas = puedeOrganizar && !carpetaActual && !busquedaCatalogo;
  let propiedadesVisibles = propiedadesFiltradas;
  if (carpetaActual) {
    propiedadesVisibles = propiedadesFiltradas.filter(p => p.folder_id === carpetaActual.id);
  } else if (mostrarCarpetas) {
    propiedadesVisibles = propiedadesFiltradas.filter(p => !p.folder_id || !idsCarpetas.has(p.folder_id));
  }
  const propiedadesDeCarpeta = (id) => propiedadesFiltradas.filter(p => p.folder_id === id);
  const totalEnCarpeta = (id) => listaPropiedades.filter(p => p.folder_id === id).length;

  return (
    <div className="vu-root">
      {!isClient && <Header activeModule="propiedades" titulo="PROPIEDADES" />}

      <main className="vu-main-container">
        {!isClient && (
          <div className="vu-action-bar">
            <div className="vu-page-title-badge">
              <span style={{ fontSize: '1.05rem' }}>🏠</span>
              <span>CATÁLOGO DE PROPIEDADES</span>
              <span className="vu-count-pill">{listaPropiedades.length}</span>
            </div>
          </div>
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

        {/* Solo para Admin / Autónomo: Buscador + botón único de acciones */}
        {!isClient && (
           <div className="search-header-flex">
              <div className="search-container-center tb-toolbar">
                <div className="tb-toolbar-search">
                  <UniversalSearch
                    type="PROPIEDADES"
                    data={listaPropiedades}
                    setFilteredData={setPropiedadesFiltradas}
                    filtroActual={categoria}
                    placeholder="BUSCAR PROPIEDAD POR NOMBRE..."
                    onBusquedaChange={setBusquedaCatalogo}
                  />
                </div>

                {puedeOrganizar && (
                  <button
                    type="button"
                    className="tb-actions-btn"
                    onClick={() => setMostrarModalCarpetas(true)}
                    title="Carpetas"
                    aria-label="Organizar en carpetas"
                  >
                    <FolderPlus size={20} />
                  </button>
                )}

                <div className="tb-actions-wrapper" ref={accionesRef}>
                  <button
                    type="button"
                    className={`tb-actions-btn ${accionesAbiertas ? 'open' : ''}`}
                    onClick={() => setAccionesAbiertas((v) => !v)}
                    title="Acciones"
                    aria-label="Acciones de propiedades"
                    aria-expanded={accionesAbiertas}
                  >
                    <Plus size={20} />
                  </button>

                  {accionesAbiertas && (
                    <div className="tb-actions-menu">
                      {isLimitReached ? (
                        <button
                          type="button"
                          className="tb-actions-item"
                          onClick={() => { setAccionesAbiertas(false); setMostrarModalCompraEspacios(true); }}
                        >
                          <span className="tb-actions-icon orange"><Plus size={16} strokeWidth={3} /></span>
                          <span>Comprar espacio</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="tb-actions-item"
                          onClick={() => { setAccionesAbiertas(false); setMostrarModalRegistroPropiedad(true); }}
                        >
                          <span className="tb-actions-icon orange"><Plus size={16} strokeWidth={3} /></span>
                          <span>Nueva propiedad</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className={`tb-actions-item ${categoria === "TODAS" ? 'selected' : ''}`}
                        onClick={() => { setAccionesAbiertas(false); setCategoria("TODAS"); }}
                      >
                        <span className="tb-actions-icon dark"><Globe size={16} strokeWidth={2.4} /></span>
                        <span>Todas</span>
                        <span className="tb-actions-badge">{listaPropiedades.length}</span>
                      </button>

                      <button
                        type="button"
                        className="tb-actions-item"
                        onClick={() => { setAccionesAbiertas(false); handleAbrirReportarProblema(); }}
                      >
                        <span className="tb-actions-icon orange"><PlusCircle size={16} strokeWidth={2.6} /></span>
                        <span>Solicitar servicio</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
           </div>
        )}

        {isRootOrAgenteAdmin && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', padding: '0 10px' }}>
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
          </div>
        )}


        {carpetaActual && (
          <div className="folder-breadcrumb" style={{ '--folder-color': carpetaActual.color }}>
            <button type="button" className="folder-breadcrumb-back" onClick={() => setCarpetaAbierta(null)}>
              <ArrowLeft size={18} strokeWidth={2.6} /> <span>Catálogo</span>
            </button>
            <span className="folder-breadcrumb-sep">/</span>
            <span className="folder-breadcrumb-name">
              <FolderOpen size={18} strokeWidth={2.4} /> {carpetaActual.name}
            </span>
            <span className="vu-count-pill">{propiedadesVisibles.length}</span>
            <button type="button" className="folder-breadcrumb-icon" title="Renombrar carpeta" onClick={() => renombrarCarpeta(carpetaActual)}>
              <Pencil size={16} />
            </button>
          </div>
        )}

        <div className="properties-grid">
          {!cargando && mostrarCarpetas && carpetas.map((c) => {
            const props = propiedadesDeCarpeta(c.id);
            const fotos = props.filter(p => p.foto_url).slice(0, 3);
            return (
              <div
                key={`folder-${c.id}`}
                className="folder-card"
                style={{ '--folder-color': c.color || '#F26522' }}
                onClick={() => setCarpetaAbierta(c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setCarpetaAbierta(c.id); }}
              >
                <div className="folder-card-tab" />
                <div className={`folder-card-preview count-${fotos.length}`}>
                  {fotos.length > 0 ? (
                    fotos.map(p => <img key={p.id} src={p.foto_url} alt="" />)
                  ) : (
                    <Folder size={64} strokeWidth={1.6} />
                  )}
                </div>
                <div className="folder-card-bar">
                  <Folder size={18} strokeWidth={2.6} />
                  <h3>{c.name}</h3>
                  <span className="folder-card-count">{props.length}</span>
                </div>
              </div>
            );
          })}

          {cargando ? (
            <CasaLoader texto="Cargando propiedades..." />
          ) : propiedadesVisibles.length > 0 ? (
            propiedadesVisibles.map((p) => (
              <div key={p.id} className="property-card vp-card-menu" style={{ position: 'relative' }}>
                
                {/* Si es Root y la propiedad es de un autónomo externo */}
                {isRoot && p.tenant_id && Number(p.tenant_id) !== 1 && (
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', padding: '5px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    🏢 {p.tenant_name || p.propietario || 'Autónomo'}
                  </div>
                )}

                {/* Si la propiedad tiene cliente o empresa registrada en el sistema de Agente Solutions */}
                {(!p.tenant_id || Number(p.tenant_id) === 1) && (p.cliente || p.client_name || p.company_name || p.empresa || p.propietario) && (
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'linear-gradient(135deg, #f26522 0%, #ea580c 100%)', color: 'white', padding: '5px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(242,101,34,0.4)' }}>
                    🏢 {p.cliente || p.client_name || p.company_name || p.empresa || p.propietario}
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
                  <button
                    type="button"
                    className={`btn-card-menu ${menuTarjeta?.id === p.id ? 'active' : ''}`}
                    aria-label="Opciones de propiedad"
                    onClick={(e) => abrirMenuTarjeta(e, p)}
                  >
                    <MoreVertical size={20} strokeWidth={2.6} />
                  </button>
                </div>

              </div>
            ))
          ) : carpetaActual ? (
            <div className="folder-empty">
              <FolderOpen size={44} strokeWidth={1.6} />
              <strong>Esta carpeta está vacía</strong>
              <span>Usa el botón de carpeta de una propiedad para moverla aquí.</span>
            </div>
          ) : !(mostrarCarpetas && carpetas.length > 0) && (
            <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '50px', color: '#666' }}>
              No hay propiedades en esta categoría.
            </div>
          )}
        </div>

      </section>

      {/* MENÚ ⋮ MÓVIL DE TARJETA */}
      {menuTarjeta && (() => {
        const p = propiedadesFiltradas.find((x) => x.id === menuTarjeta.id);
        if (!p) return null;
        return createPortal(
          <>
            <div className="card-menu-backdrop" onClick={() => setMenuTarjeta(null)} />
            <div
              className="card-menu-dropdown"
              style={{
                top: menuTarjeta.top ?? 'auto',
                bottom: menuTarjeta.bottom ?? 'auto',
                right: menuTarjeta.right,
              }}
            >
              <div className="card-menu-title">{p.nombre_propiedad || "Propiedad sin nombre"}</div>

              <button type="button" className="card-menu-item" onClick={() => ejecutarAccionMenu(() => irADetallesPropiedad(p))}>
                <span className="tb-actions-icon blue"><Eye size={16} strokeWidth={2.4} /></span> Detalles de propiedad
              </button>

              {p.levantamiento_realizado ? (
                <button type="button" className="card-menu-item" onClick={() => ejecutarAccionMenu(() => irAVerLevantamiento(p))}>
                  <span className="tb-actions-icon green"><ClipboardCheck size={16} strokeWidth={2.4} /></span> Ver levantamiento
                </button>
              ) : (
                <button type="button" className="card-menu-item" onClick={() => ejecutarAccionMenu(() => abrirModalParaPropiedad(p))}>
                  <span className="tb-actions-icon amber"><ClipboardList size={16} strokeWidth={2.4} /></span> {p.has_pending_service ? "Levantamiento solicitado" : "Solicitar levantamiento"}
                </button>
              )}

              <button type="button" className="card-menu-item" onClick={() => ejecutarAccionMenu(() => irARegistroZonas(p))}>
                <span className="tb-actions-icon orange"><Camera size={16} strokeWidth={2.4} /></span> {p.levantamiento_realizado ? "Editar levantamiento" : "Realizar mi propio levantamiento"}
              </button>

              {(isRoot || isAgenteAdmin) && (
                <button type="button" className="card-menu-item" onClick={() => ejecutarAccionMenu(() => setEquipoPropiedad(p))}>
                  <span className="tb-actions-icon violet"><Users size={16} strokeWidth={2.4} /></span> Equipo del levantamiento
                </button>
              )}

              <div className="card-menu-divider" />

              {puedeOrganizar && (
                <button type="button" className="card-menu-item" onClick={() => ejecutarAccionMenu(() => setPropiedadAMover(p))}>
                  <span className="tb-actions-icon orange"><FolderInput size={16} strokeWidth={2.4} /></span> Mover a carpeta
                </button>
              )}

              <button type="button" className="card-menu-item" onClick={() => ejecutarAccionMenu(() => abrirModalEditar(p))}>
                <span className="tb-actions-icon slate"><Pencil size={16} strokeWidth={2.4} /></span> Editar propiedad
              </button>

              {!p.is_shared_with_me && (
                <button type="button" className="card-menu-item danger" onClick={() => ejecutarAccionMenu(() => eliminarPropiedad(p))}>
                  <span className="tb-actions-icon red"><Trash2 size={16} strokeWidth={2.4} /></span> Eliminar propiedad
                </button>
              )}
            </div>
          </>,
          document.body
        );
      })()}

      {equipoPropiedad && (
        <ModalEquipoLevantamiento
          propiedad={equipoPropiedad}
          onClose={() => setEquipoPropiedad(null)}
          onChanged={obtenerPropiedades}
        />
      )}

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
          MODAL REPORTAR PROBLEMA (BOTÓN SUPERIOR "SOLICITAR SERVICIO")
          DISEÑO: LIQUID GLASS GRIS (clases rp-* en VistaPropiedades.css)
          ======================================================== */}
      {mostrarModalReportarProblema && createPortal(
        <div 
          className="rp-overlay" 
          onClick={() => setMostrarModalReportarProblema(false)}
        >
          <div 
            className="rp-modal" 
            onClick={e => e.stopPropagation()}
            style={{
              transform: rpDragY > 0 ? `translateY(${rpDragY}px)` : undefined,
              transition: isRpDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Mobile grabber pill táctil */}
            <div 
              className="rp-grabber-area"
              onTouchStart={handleRpTouchStart}
              onTouchMove={handleRpTouchMove}
              onTouchEnd={handleRpTouchEnd}
            >
              <div className="rp-grabber" />
            </div>

            <div 
              className="rp-header"
              onTouchStart={handleRpTouchStart}
              onTouchMove={handleRpTouchMove}
              onTouchEnd={handleRpTouchEnd}
            >
              <div className="rp-header-text">
                <span className="rp-tag">NUEVA SOLICITUD</span>
                <h2 className="rp-title">Reportar Problema</h2>
              </div>
              <button 
                type="button"
                className="rp-close" 
                onClick={() => setMostrarModalReportarProblema(false)}
                aria-label="Cerrar"
              >
                <X size={18} color="#ffffff" strokeWidth={2.6} />
              </button>
            </div>
            <form className="rp-form" onSubmit={handleSubmitReportarProblema}>
              {/* CAMPO: SELECCIÓN DE PROPIEDAD */}
              <div className="rp-group">
                <label className="rp-label">
                  <Home size={16} color="#ff8c42"/> Propiedad a Reportar *
                </label>
                <select 
                  required 
                  value={propiedadReporteId}
                  onChange={(e) => handleCambioPropiedadReporte(e.target.value)}
                  style={{
                    padding: "11px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid rgba(255, 255, 255, 0.18)",
                    fontSize: "0.92rem",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    fontWeight: "600",
                    outline: "none"
                  }}
                >
                  <option value="" style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>Selecciona la propiedad...</option>
                  {listaPropiedades.map(p => (
                    <option key={p.id} value={p.id} style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>
                      {p.nombre_propiedad || p.direccion || `Propiedad #${p.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* CAMPO: TIPO DE SERVICIO */}
              <div className="rp-group">
                <label className="rp-label">
                  <FileText size={16} color="#ff8c42"/> Tipo de Servicio *
                </label>
                <select 
                  required 
                  value={nuevoProblema.tipo}
                  onChange={(e) => setNuevoProblema({...nuevoProblema, tipo: e.target.value})}
                  style={{
                    padding: "11px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid rgba(255, 255, 255, 0.18)",
                    fontSize: "0.92rem",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    fontWeight: "600",
                    outline: "none"
                  }}
                >
                  <option value="" style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>Selecciona el tipo...</option>
                  <option value="Mantenimiento" style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>Mantenimiento Preventivo</option>
                  <option value="Problema" style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>Problema / Reparación</option>
                </select>
              </div>

              {/* CAMPO: ZONA DE LA PROPIEDAD */}
              <div className="rp-group">
                <label className="rp-label">
                  <Home size={16} color="#ff8c42"/> Zona de la propiedad *
                </label>
                <select 
                  required 
                  value={nuevoProblema.area_id}
                  onChange={(e) => handleZonaChangeProblema(e.target.value)}
                  disabled={loadingZonas || !propiedadReporteId}
                  style={{
                    padding: "11px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid rgba(255, 255, 255, 0.18)",
                    fontSize: "0.92rem",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    fontWeight: "600",
                    outline: "none",
                    opacity: (loadingZonas || !propiedadReporteId) ? 0.6 : 1
                  }}
                >
                  <option value="" style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>
                    {!propiedadReporteId 
                      ? "Primero selecciona una propiedad" 
                      : (loadingZonas ? "Cargando zonas..." : "Seleccionar zona...")}
                  </option>
                  {zonasDisponibles.map(zona => {
                    const subAreas = zona.sub_areas || zona.subAreas || [];
                    if (subAreas.length > 0) {
                      return (
                        <optgroup key={`opt-${zona.id}`} label={zona.name.toUpperCase()} style={{ backgroundColor: "#1e2430", color: "#ff8c42" }}>
                          <option value={zona.id} style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>{zona.name} (Área General)</option>
                          {subAreas.map(sub => (
                            <option key={`sub-${sub.id}`} value={sub.id} style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>
                              {sub.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    } else {
                      return <option key={`zona-${zona.id}`} value={zona.id} style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>{zona.name}</option>;
                    }
                  })}
                  <option value="otro" style={{ backgroundColor: "#1e2430", color: "#ff8c42", fontWeight: 'bold' }}>Otro (No está en la lista)</option>
                </select>
              </div>

              {/* CAMPO: EQUIPO AFECTADO */}
              <div className="rp-group">
                <label className="rp-label">
                  <Wrench size={16} color="#ff8c42"/> Equipo afectado (Opcional)
                </label>
                <select 
                  value={nuevoProblema.equipo}
                  disabled={!nuevoProblema.area_id || loadingEquipos}
                  onChange={(e) => setNuevoProblema({...nuevoProblema, equipo: e.target.value})}
                  style={{
                    padding: "11px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid rgba(255, 255, 255, 0.18)",
                    fontSize: "0.92rem",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    fontWeight: "600",
                    outline: "none",
                    opacity: (!nuevoProblema.area_id || loadingEquipos) ? 0.6 : 1
                  }}
                >
                  <option value="" style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>
                    {!nuevoProblema.area_id ? "Primero selecciona una zona" : (loadingEquipos ? "Cargando equipos..." : "Seleccionar equipo...")}
                  </option>
                  {Object.entries(equiposDisponibles).map(([seccion, items]) => (
                    <optgroup key={seccion} label={seccion.toUpperCase()} style={{ backgroundColor: "#1e2430", color: "#ff8c42" }}>
                      {items.map((item) => (
                        <option key={item.id} value={`${item.sub_category} ${item.brand ? `(${item.brand})` : ''}`} style={{ backgroundColor: "#1e2430", color: "#ffffff" }}>
                          {item.sub_category} {item.brand ? `(${item.brand})` : ''} {item.model_or_color ? `- ${item.model_or_color}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="otro" style={{ backgroundColor: "#1e2430", color: "#ff8c42" }}>Otro (No está en la lista)</option>
                </select>
              </div>

              {/* CAMPO: DESCRIPCIÓN */}
              <div className="rp-group">
                <label className="rp-label">
                  <MessageSquare size={16} color="#ff8c42"/> Descripción *
                </label>
                <textarea 
                  required 
                  rows="3" 
                  placeholder="Describe detalladamente el problema..." 
                  value={nuevoProblema.descripcion}
                  onChange={(e) => setNuevoProblema({...nuevoProblema, descripcion: e.target.value})}
                  style={{
                    padding: "11px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid rgba(255, 255, 255, 0.18)",
                    fontSize: "0.92rem",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    outline: "none",
                    resize: "vertical"
                  }}
                />
              </div>

              {/* CAMPO: EVIDENCIA VISUAL */}
              <div className="rp-group">
                <label className="rp-label">
                  <Camera size={16} color="#ff8c42"/> Evidencia Visual (Máx 2 fotos)
                </label>
                
                <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={handleFileSelectProblema} />
                <input type="file" ref={galleryRef} hidden accept="image/*" multiple onChange={handleFileSelectProblema} />

                <div className="fotos-preview-container" style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {nuevoProblema.fotos.map((foto, idx) => (
                    <div key={idx} className="foto-preview-wrapper" style={{ position: 'relative', width: '74px', height: '74px' }}>
                      <img 
                        src={URL.createObjectURL(foto)} 
                        alt="preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', border: '2px solid #f26624' }} 
                      />
                      <button 
                        type="button"
                        onClick={() => removeFotoProblema(idx)}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#e63946', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  
                  {nuevoProblema.fotos.length < 2 && (
                    <button 
                      type="button" 
                      className="btn-add-foto-placeholder"
                      onClick={() => setIsPhotoMenuOpen(true)}
                      style={{
                        width: '74px',
                        height: '74px',
                        border: '2px dashed rgba(255, 255, 255, 0.28)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#f1f5f9',
                        transition: 'all 0.2s'
                      }}
                    >
                      <PlusCircle size={22} color="#ff8c42" />
                      <span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px', letterSpacing: '0.4px' }}>AÑADIR</span>
                    </button>
                  )}
                </div>
                
                <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  * Puedes subir hasta 2 imágenes como evidencia del problema.
                </small>
              </div>

              <div className="rp-footer">
                <button 
                  type="submit" 
                  className="btn-modal-close" 
                  disabled={loadingSubmitProblema}
                  style={{
                    width: "100%",
                    padding: "13px 20px",
                    background: "linear-gradient(135deg, #f26522 0%, #ea580c 100%)",
                    color: "#ffffff",
                    fontWeight: 900,
                    fontSize: "0.98rem",
                    borderRadius: "14px",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 18px rgba(242, 101, 34, 0.45)",
                    transition: "all 0.2s"
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
        <div 
          className="modal-overlay" 
          onClick={() => setIsPhotoMenuOpen(false)} 
          style={{ 
            position: "fixed", 
            inset: 0, 
            zIndex: 10000005, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            background: "rgba(10, 15, 25, 0.75)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            padding: "16px"
          }}
        >
          <div 
            className="modal-content liquid-glass-modal" 
            style={{ 
              maxWidth: '340px', 
              width: "90%", 
              padding: '0', 
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.94) 0%, rgba(15, 23, 42, 0.98) 100%)", 
              borderRadius: "20px", 
              overflow: "hidden",
              border: "1.5px solid rgba(255, 255, 255, 0.18)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)"
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '18px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <h3 style={{ margin: 0, color: '#ff8c42', fontWeight: 800, fontSize: '1.1rem' }}>Seleccionar Origen</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button 
                type="button" 
                onClick={() => selectPhotoSourceProblema('camera')}
                style={{ background: 'transparent', border: 'none', padding: '14px', color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 700 }}
              >
                <Camera size={19} color="#ff8c42" /> Tomar Foto
              </button>
              <button 
                type="button" 
                onClick={() => selectPhotoSourceProblema('gallery')}
                style={{ background: 'transparent', border: 'none', padding: '14px', color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 700 }}
              >
                <ImageIcon size={19} color="#ff8c42" /> Elegir de la Galería
              </button>
              <button 
                type="button" 
                onClick={() => setIsPhotoMenuOpen(false)}
                style={{ background: 'transparent', border: 'none', padding: '14px', color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* MODAL DE EDICIÓN DE PROPIEDAD: el mismo formulario de registro, con sus datos */}
      <ModalRegistroInmueble
        isOpen={mostrarModalEditar}
        property={propiedadAEditar}
        onClose={() => setMostrarModalEditar(false)}
        onSuccess={() => obtenerPropiedades()}
        user={user}
      />

      {/* MODAL: ADMINISTRAR CARPETAS */}
      {mostrarModalCarpetas && createPortal(
        <div className="folder-modal-overlay" onClick={() => setMostrarModalCarpetas(false)}>
          <div className="folder-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="folder-modal-close" onClick={() => setMostrarModalCarpetas(false)} aria-label="Cerrar">
              <X size={20} strokeWidth={2.8} />
            </button>
            <h2><FolderPlus size={22} color="#F26522" /> Carpetas</h2>
            <p className="folder-modal-sub">Organiza el catálogo. Todos los administradores ven las mismas carpetas.</p>

            <form className="folder-create" onSubmit={crearCarpeta}>
              <input
                type="text"
                value={nuevaCarpetaNombre}
                onChange={(e) => setNuevaCarpetaNombre(e.target.value)}
                placeholder="Nombre de la nueva carpeta"
                maxLength={80}
              />
              <button type="submit" disabled={guardandoCarpeta || !nuevaCarpetaNombre.trim()}>
                {guardandoCarpeta ? <Loader2 size={18} className="spin" /> : <Plus size={18} strokeWidth={3} />}
                <span>Crear</span>
              </button>
            </form>
            <div className="folder-colors">
              {COLORES_CARPETA.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`folder-color ${nuevaCarpetaColor === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setNuevaCarpetaColor(color)}
                  aria-label={`Color ${color}`}
                >
                  {nuevaCarpetaColor === color && <Check size={14} strokeWidth={3.5} color="#fff" />}
                </button>
              ))}
            </div>

            <div className="folder-list">
              {carpetas.length === 0 ? (
                <div className="folder-list-empty">Aún no hay carpetas.</div>
              ) : carpetas.map(c => (
                <div key={c.id} className="folder-list-item">
                  <button
                    type="button"
                    className="folder-list-open"
                    onClick={() => { setCarpetaAbierta(c.id); setMostrarModalCarpetas(false); }}
                  >
                    <Folder size={20} color={c.color || '#F26522'} fill={c.color || '#F26522'} fillOpacity={0.2} />
                    <span className="folder-list-name">{c.name}</span>
                    <span className="folder-list-count">{totalEnCarpeta(c.id)}</span>
                  </button>
                  <button type="button" className="folder-list-icon" title="Renombrar" onClick={() => renombrarCarpeta(c)}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" className="folder-list-icon danger" title="Eliminar" onClick={() => eliminarCarpeta(c)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: MOVER PROPIEDAD A CARPETA */}
      {propiedadAMover && createPortal(
        <div className="folder-modal-overlay" onClick={() => !moviendoPropiedad && setPropiedadAMover(null)}>
          <div className="folder-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="folder-modal-close" onClick={() => setPropiedadAMover(null)} aria-label="Cerrar">
              <X size={20} strokeWidth={2.8} />
            </button>
            <h2><FolderInput size={22} color="#F26522" /> Mover a carpeta</h2>
            <p className="folder-modal-sub">{propiedadAMover.nombre_propiedad || "Propiedad sin nombre"}</p>

            <div className="folder-list">
              {carpetas.map(c => {
                const actual = propiedadAMover.folder_id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`folder-list-open folder-pick ${actual ? 'current' : ''}`}
                    disabled={moviendoPropiedad || actual}
                    onClick={() => moverPropiedadACarpeta(c.id)}
                  >
                    <Folder size={20} color={c.color || '#F26522'} fill={c.color || '#F26522'} fillOpacity={0.2} />
                    <span className="folder-list-name">{c.name}</span>
                    {actual && <Check size={18} strokeWidth={3} color="#10b981" />}
                  </button>
                );
              })}

              {propiedadAMover.folder_id && (
                <button
                  type="button"
                  className="folder-list-open folder-pick"
                  disabled={moviendoPropiedad}
                  onClick={() => moverPropiedadACarpeta(null)}
                >
                  <FolderX size={20} color="#64748b" />
                  <span className="folder-list-name">Sacar de la carpeta</span>
                </button>
              )}

              {carpetas.length === 0 && (
                <div className="folder-list-empty">
                  Aún no hay carpetas.{" "}
                  <button type="button" className="folder-link" onClick={() => { setPropiedadAMover(null); setMostrarModalCarpetas(true); }}>
                    Crear una
                  </button>
                </div>
              )}
            </div>
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
      </main>
    </div>
  );
};

export default VistaPropiedades;
