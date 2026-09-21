import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../styles/AgenteSolutions/Cliente/DetallePr.css';
import '../../../styles/AgenteSolutions/Tecnico/TrabajoPropiedad.css';
import Swal from 'sweetalert2';
import { 
  MapPin, User, AlertTriangle, Settings, CheckCircle, 
  X, LayoutDashboard, FileText, Send, Trash2, Clock, Briefcase, MessageSquare,
  CreditCard, Map, ExternalLink, Plus, MessageCircle, Eye, Loader2, ImageIcon, ArrowLeft,
  Navigation, Phone, Zap, Wrench, Calendar
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import Logo3 from '../../../assets/Logo3.png';
import CreateQuotationModal from '../../../components/Modals/CreateQuotationModal';

const DetallePropiedad = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // --- ESTADOS ---
  const [isModalPerfilOpen, setIsModalPerfilOpen] = useState(false);
  const [isModalCotizarEmergenciaOpen, setIsModalCotizarEmergenciaOpen] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const [emergenciaACotizar, setEmergenciaACotizar] = useState(null);
  const [isModalHistorialOpen, setIsModalHistorialOpen] = useState(false);
  const [activeBatchTab, setActiveBatchTab] = useState(0);
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState(null);
  
  // Modales de chat y detalle cotización
  const [isModalChatOpen, setIsModalChatOpen] = useState(false);
  const [chatCotizacion, setChatCotizacion] = useState(null);
  const [isModalCotizacionDetailOpen, setIsModalCotizacionDetailOpen] = useState(false);
  const [cotizacionDetail, setCotizacionDetail] = useState(null);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  
  // Modal de Crear Cotizacion
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cotizacionParaAsignar, setCotizacionParaAsignar] = useState(null);

  // --- ESTADOS PARA 2DA VISITA ---
  const [showModalReprogramar2da, setShowModalReprogramar2da] = useState(false);
  const [showModalAdmin2daVisita, setShowModalAdmin2daVisita] = useState(false);
  const [fecha2daCliente, setFecha2daCliente] = useState('');
  const [fecha2daAdmin, setFecha2daAdmin] = useState('');
  const [tecnico2daAdmin, setTecnico2daAdmin] = useState('');
  const [obs2daAdmin, setObs2daAdmin] = useState('');
  const [submitting2da, setSubmitting2da] = useState(false);

  const handleResponderSegundaVisita = async (accion, fechaConfirmada) => {
    const task = trabajoSeleccionado;
    if (!task) return;

    try {
      setSubmitting2da(true);
      const token = localStorage.getItem('agente_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const realId = task.realId || task.id;
      const isWorkOrder = task.tipo_registro === 'work_order' || task.isWorkOrder;
      const paramId = isWorkOrder ? `work_order-${realId}` : `servicio-${realId}`;

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/servicios/${paramId}/responder-segunda-visita`,
        {
          accion: accion,
          fecha_confirmada: fechaConfirmada
        },
        { headers }
      );

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: accion === 'aceptar' ? '¡Fecha Aceptada!' : '¡Nueva Fecha Propuesta!',
          text: accion === 'aceptar' 
            ? 'Has aceptado la fecha propuesta para la 2da visita.' 
            : 'Has propuesto una nueva fecha. El técnico y la administración han sido notificados.',
          timer: 2000,
          showConfirmButton: false
        });

        const nuevoEstado = accion === 'aceptar' ? 'Segunda Visita Programada' : 'Segunda Visita Solicitada';
        setColaTrabajos(prev => prev.map(t => {
          if (String(t.id) === String(task.id) || String(t.realId) === String(task.realId)) {
            return {
              ...t,
              status: nuevoEstado,
              estado: nuevoEstado,
              second_visit_proposed_date: fechaConfirmada
            };
          }
          return t;
        }));

        setShowModalReprogramar2da(false);
        setIsModalHistorialOpen(false);
      }
    } catch (err) {
      console.error("Error al responder 2da visita:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'No se pudo procesar la respuesta.'
      });
    } finally {
      setSubmitting2da(false);
    }
  };

  const handleAdminProgramarSegundaVisita = async (e) => {
    e.preventDefault();
    const task = trabajoSeleccionado;
    if (!task || !fecha2daAdmin) return;

    try {
      setSubmitting2da(true);
      const token = localStorage.getItem('agente_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const realId = task.realId || task.id;
      const isWorkOrder = task.tipo_registro === 'work_order' || task.isWorkOrder;
      const paramId = isWorkOrder ? `work_order-${realId}` : `servicio-${realId}`;

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/servicios/${paramId}/admin-programar-segunda-visita`,
        {
          fecha_programada: fecha2daAdmin,
          tecnico_id: tecnico2daAdmin || null,
          observaciones: obs2daAdmin || null
        },
        { headers }
      );

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: '2da Visita Programada por Admin',
          text: 'La 2da visita ha sido asignada correctamente.',
          timer: 2000,
          showConfirmButton: false
        });

        setColaTrabajos(prev => prev.map(t => {
          if (String(t.id) === String(task.id) || String(t.realId) === String(task.realId)) {
            return {
              ...t,
              status: 'Segunda Visita Programada',
              estado: 'Segunda Visita Programada',
              scheduled_at: fecha2daAdmin
            };
          }
          return t;
        }));

        setShowModalAdmin2daVisita(false);
        setIsModalHistorialOpen(false);
      }
    } catch (err) {
      console.error("Error al programar 2da visita por admin:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'No se pudo programar la 2da visita.'
      });
    } finally {
      setSubmitting2da(false);
    }
  };

  // DATOS DE LA PROPIEDAD
  const [datosPropiedad, setDatosPropiedad] = useState({
    personaCargo: "Cargando...",
    curp: "...",
    direccion: "Cargando...",
    mapsUrl: "#",
    nombre_propiedad: "",
    location: ""
  });

  const [cotizaciones, setCotizaciones] = useState([]);
  const [sosPendientes, setSosPendientes] = useState([]);
  const [colaTrabajos, setColaTrabajos] = useState([]);
  const [stats, setStats] = useState({
    sos: 0, pendientes: 0, proceso: 0, listos: 0
  });

  const [listaTecnicos, setListaTecnicos] = useState([]);
  const [tabTablero, setTabTablero] = useState('activos'); // 'activos' | 'historial'
  const [mesesAbiertos, setMesesAbiertos] = useState({});
  const [historialFinalizados, setHistorialFinalizados] = useState([]);
  const [reportesDetallados, setReportesDetallados] = useState([]);
  const [cargandoReportes, setCargandoReportes] = useState(false);
  const [reportesPropiedad, setReportesPropiedad] = useState([]);

  const [itemsCotizacion, setItemsCotizacion] = useState([
    { id: 1, concepto: "Mano de Obra Emergencia", cantidad: 1, precio: "" },
    { id: 2, concepto: "Materiales e Insumos", cantidad: 1, precio: "" }
  ]);

  const [formPlanificacion, setFormPlanificacion] = useState({ 
    tecnico: "", 
    fecha: "", 
    prioridad: "ALTA",
    descripcionTrabajo: ""
  });

  const [mensajeChat, setMensajeChat] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const [cotsAcordeonOpen, setCotsAcordeonOpen] = useState({
    pendientes: true,
    pagadas: false
  });

  const [colAbiertaKanban, setColAbiertaKanban] = useState('SOS');

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
      if (session?.userData) {
        setUsuarioId(session.userData.id || null);
      }
    } catch (e) {
      console.error("Error reading session:", e);
    }
  }, []);

  // EFECTO DE CARGA
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('agente_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // 0. Cargar lista de técnicos reales
        let tecs = [];
        try {
          const resTecs = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios/tecnicos`, { headers });
          tecs = resTecs.data || [];
          setListaTecnicos(tecs);
        } catch (err) {
          console.warn("Error cargando técnicos:", err);
        }

        // 1. Dashboard data (Propiedad, Stats, Historial)
        let resDash;
        try {
          resDash = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${id}/dashboard`, { headers });
        } catch (err) {
          console.warn("Dashboard fail, falling back to base property data");
          resDash = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${id}`, { headers });
        }

        const { propiedad, stats: backStats, historial, owner_info, shared_users, is_shared_with_me } = resDash.data;

        const rawFacade = propiedad?.facade_photo_path || propiedad?.facade_photo || propiedad?.foto_fachada || null;
        let resolvedFacade = null;
        if (rawFacade && typeof rawFacade === 'string') {
          if (rawFacade.startsWith('http://') || rawFacade.startsWith('https://')) {
            resolvedFacade = rawFacade;
          } else {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            const hostBase = apiBase.replace(/\/api\/?$/, '');
            resolvedFacade = `${hostBase}/storage/${rawFacade.replace(/^\//, '')}`;
          }
        }

        setDatosPropiedad({
          personaCargo: owner_info?.name || propiedad?.propietario || "Sin asignar",
          personaFoto: owner_info?.profile_picture || null,
          facadePhoto: resolvedFacade,
          sharedUsers: shared_users || [],
          isSharedWithMe: is_shared_with_me || false,
          curp: propiedad?.custom_curp || propiedad?.id,
          direccion: propiedad?.address || "Sin dirección",
          mapsUrl: propiedad?.coordinates ? `https://maps.google.com/?q=${propiedad.coordinates}` : "#",
          nombre_propiedad: propiedad?.nombre_propiedad || propiedad?.property_name || "Propiedad",
          location: propiedad?.location || propiedad?.state || "Mérida, Yuc."
        });

        setStats(backStats || { sos: 0, pendientes: 0, proceso: 0, listos: 0 });
        
        // Mapear historial inicial del dashboard
        const histMapeado = (historial || []).map(h => ({
          id: h.id,
          producto: h.title || h.labor || h.type || "Trabajo",
          tecnico: h.tecnico_nombre || "Técnico",
          fecha: h.updated_at ? new Date(h.updated_at).toLocaleDateString() : (h.fecha ? new Date(h.fecha).toLocaleDateString() : "---"),
          evidencias: h.fotos || []
        }));

        // 2. Cotizaciones
        let cots = [];
        try {
          const resCot = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones`, { headers });
          cots = resCot.data.filter(c => String(c.property_id) === String(id));
        } catch (err) {
          console.warn("Error cargando cotizaciones:", err);
        }

        const cotsMapeadas = cots.map(c => {
          let itemsParsed = c.items || [];
          if (typeof c.concept === 'string' && c.concept.startsWith('[')) {
            try { itemsParsed = JSON.parse(c.concept); } catch(e){}
          }
          return {
            id: c.id,
            fecha: c.fecha || (c.created_at ? new Date(c.created_at).toLocaleDateString() : "---"),
            status: c.status || c.estado || "Pendiente",
            producto: c.concept && typeof c.concept === 'string' && !c.concept.startsWith('[') ? c.concept : (c.type || c.descripcion || c.folio || "Cotización"),
            zona: c.zona || "General",
            comentario: c.observations || c.observaciones || "",
            esEmergencia: c.is_emergency || c.type === 'SOS' || false,
            items: itemsParsed,
            chat_history: c.chat_history || [],
            raw: c
          };
        });
        setCotizaciones(cotsMapeadas);

        // 3. SOS Pendientes
        setSosPendientes(cotsMapeadas.filter(c => c.esEmergencia && (c.status === "Pendiente" || c.status === "Pendiente de Admin")));

        // 4. Cola de trabajos (servicios y work_orders)
        const mapEstado = (status, priority, type) => {
          const s = String(status || '').toUpperCase();
          const p = String(priority || '').toUpperCase();
          const t = String(type || '').toUpperCase();
          if (s === 'SOS' || p === 'URGENTE' || p === 'SOS' || t === 'SOS') {
            if (s !== 'COMPLETED' && s !== 'FINALIZADO' && s !== 'LISTO') {
              return 'SOS';
            }
          }
          if (s === 'POR ASIGNAR' || s === 'ESPERANDO' || s === 'POR AUTORIZAR' || s === 'PENDIENTE') return 'ESPERANDO';
          if (s === 'PROGRAMADO' || s === 'POR HACER' || s === 'ASIGNADO') return 'PENDIENTE';
          if (s === 'EN PROCESO' || s === 'PROCESO') return 'EN PROCESO';
          if (s === 'COMPLETED' || s === 'FINALIZADO' || s === 'LISTO') return 'FINALIZADO';
          return 'ESPERANDO';
        };

        let servs = [];
        try {
          const resServ = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios`, { headers });
          servs = resServ.data.filter(s => String(s.property_id) === String(id));
        } catch (err) {
          console.warn("Error cargando servicios:", err);
        }

        let wos = [];
        try {
          const resWo = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/work-orders/all`, { headers });
          wos = resWo.data.filter(w => String(w.property_id) === String(id));
        } catch (err) {
          console.warn("Error cargando work orders:", err);
        }

        const servsMapeados = servs.map(s => ({
          id: `serv-${s.id}`,
          realId: s.id,
          tipo_registro: 'servicio',
          producto: s.title || s.labor || s.description || "Servicio Mantenimiento",
          tecnico: s.tecnico_nombre || s.assigned_to || "Por asignar",
          fecha: s.fecha_programada ? new Date(s.fecha_programada).toLocaleDateString() : (s.scheduled_date || "---"),
          prioridad: s.prioridad || s.priority || "ALTA",
          descripcion: s.description || s.descripcion || "",
          estado: mapEstado(s.status, s.priority, s.service_type),
          evidencias: s.evidence_path ? [s.evidence_path] : []
        }));

        const wosMapeados = wos.map(w => ({
          id: `wo-${w.id}`,
          realId: w.id,
          tipo_registro: 'work_order',
          producto: (w.type || "Trabajo") + " - " + (w.zone || "General"),
          tecnico: w.tecnico ? `${w.tecnico.first_name} ${w.tecnico.last_name}` : "Por asignar",
          fecha: w.scheduled_at ? new Date(w.scheduled_at).toLocaleDateString() : (w.created_at ? new Date(w.created_at).toLocaleDateString() : "---"),
          prioridad: w.priority || "ALTA",
          descripcion: w.description || "",
          estado: mapEstado(w.status, w.priority, w.type),
          batch_id: w.batch_id,
          evidencias: [w.evidence_path, w.evidence_path_2].filter(Boolean)
        }));

        const allTrabajos = [...servsMapeados, ...wosMapeados];
        setColaTrabajos(allTrabajos);

        const finalizados = allTrabajos.filter(t => t.estado === 'FINALIZADO').map(t => ({
          id: t.realId,
          realId: t.realId,
          tipo_registro: t.tipo_registro,
          producto: t.producto,
          tecnico: t.tecnico,
          fecha: t.fecha,
          evidencias: t.evidencias || []
        }));

        setHistorialFinalizados(finalizados.length > 0 ? finalizados : histMapeado);

        // 5. Reportes de la propiedad (Work Reports en proceso/general)
        let reps = [];
        try {
          const resRep = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/reportes-globales`, { headers });
          const filtrados = resRep.data.filter(r => {
            const propId = r.service?.property_id || r.work_order?.property_id || r.workOrder?.property_id || r.property_id;
            return String(propId) === String(id);
          });

          // AGRUPAR POR TRABAJO (service_id o work_order_id)
          const agrupadora = {};
          filtrados.forEach(r => {
            const tipo = r.work_order_id || r.workOrder ? 'work_order' : 'servicio';
            const trabajoId = r.service_id || r.work_order_id || r.id;
            const key = `${tipo}-${trabajoId}`;

            if (!agrupadora[key]) {
              agrupadora[key] = { 
                ...r, 
                avances_count: 1, 
                todas_fotos: [r.image_url || r.image_path || r.foto || r.photo].filter(Boolean) 
              };
            } else {
              agrupadora[key].avances_count += 1;
              const img = r.image_url || r.image_path || r.foto || r.photo;
              if (img && !agrupadora[key].todas_fotos.includes(img)) {
                agrupadora[key].todas_fotos.push(img);
              }
            }
          });

          reps = Object.values(agrupadora);
        } catch (err) {
          console.warn("Error cargando reportes globales:", err);
        }
        setReportesPropiedad(reps);

      } catch (error) {
        console.error("Error general al cargar datos de la propiedad:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAllData();
  }, [id]);

  const obtenerFechaHoy = () => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const agruparPorAnioYMes = (trabajos) => {
    const gruposAnio = {};
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    (trabajos || []).forEach(t => {
      let date = null;
      if (t.fecha && t.fecha !== "---") {
        const parts = t.fecha.split('/');
        if (parts.length === 3) {
          date = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
          date = new Date(t.fecha);
        }
      }
      
      if (!date || isNaN(date.getTime())) {
        date = new Date();
      }
      
      const mesNombre = meses[date.getMonth()];
      const anio = date.getFullYear();
      
      if (!gruposAnio[anio]) {
        gruposAnio[anio] = { anio: anio, ordenAnio: anio, meses: {} };
      }
      
      if (!gruposAnio[anio].meses[mesNombre]) {
        gruposAnio[anio].meses[mesNombre] = {
          mes: mesNombre,
          ordenMes: date.getMonth(),
          items: []
        };
      }
      
      gruposAnio[anio].meses[mesNombre].items.push(t);
    });

    return Object.values(gruposAnio).sort((a, b) => b.ordenAnio - a.ordenAnio).map(anioObj => {
      const mesesArray = Object.values(anioObj.meses).sort((a, b) => b.ordenMes - a.ordenMes);
      return {
        anio: anioObj.anio,
        meses: mesesArray
      };
    });
  };

  useEffect(() => {
    if (historialFinalizados.length > 0) {
      const grupos = agruparPorAnioYMes(historialFinalizados);
      if (grupos.length > 0 && grupos[0].meses.length > 0) {
        const primeraClaveAnio = String(grupos[0].anio);
        const primeraClaveMes = `${grupos[0].meses[0].mes} ${grupos[0].anio}`;
        setMesesAbiertos(prev => {
          if (Object.keys(prev).length === 0) {
            return { [primeraClaveAnio]: true, [primeraClaveMes]: true };
          }
          return prev;
        });
      }
    }
  }, [historialFinalizados]);

  // --- FUNCIONES ---
  const abrirModalCotizar = (sos) => {
    setEmergenciaACotizar(sos);
    setIsModalCotizarEmergenciaOpen(true);
  };

  const calcularTotalCotizacion = () => {
    return itemsCotizacion.reduce((acc, item) => acc + (Number(item.precio || 0) * Number(item.cantidad || 0)), 0);
  };

  const agregarFila = () => {
    const nuevoItem = {
      id: Date.now(),
      concepto: "",
      cantidad: 1,
      precio: ""
    };
    setItemsCotizacion([...itemsCotizacion, nuevoItem]);
  };

  const enviarCotizacionFinal = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('agente_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const itemsActuales = itemsCotizacion.map(item => ({...item}));
      const totalCalculado = calcularTotalCotizacion();

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${emergenciaACotizar.id}/update`, {
        type: 'manual',
        concept: JSON.stringify(itemsActuales),
        estimated_amount: totalCalculado,
        observations: "Presupuesto de emergencia generado por administración."
      }, { headers });

      const nuevaCot = {
        id: emergenciaACotizar.id,
        fecha: "Hoy",
        status: "ENVIADA", 
        producto: emergenciaACotizar.producto,
        comentario: "Esperando respuesta del cliente...",
        esEmergencia: true,
        items: itemsActuales,
        raw: emergenciaACotizar.raw
      };

      const nuevoTrabajoPendiente = {
          id: `cot-${nuevaCot.id}`,
          realId: nuevaCot.id,
          tipo_registro: 'cotizacion',
          producto: nuevaCot.producto,
          tecnico: "Por confirmar",
          fecha: "---",
          prioridad: "SOS",
          estado: "ESPERANDO" 
      };

      setCotizaciones(cotizaciones.map(c => c.id === emergenciaACotizar.id ? nuevaCot : c));
      setColaTrabajos([nuevoTrabajoPendiente, ...colaTrabajos]);
      setSosPendientes(sosPendientes.filter(s => s.id !== emergenciaACotizar.id));
      setIsModalCotizarEmergenciaOpen(false);
      Swal.fire({ icon: 'info', title: 'Presupuesto Enviado', text: 'Pendiente de aprobación por el cliente.' });
    } catch (error) {
      console.error("Error al enviar presupuesto:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un problema al enviar el presupuesto.' });
    }
  };

  const asignarTecnicoFinal = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('agente_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const tecnicoSeleccionadoObj = listaTecnicos.find(t => String(t.id) === String(formPlanificacion.tecnico));
      const nombreTecnico = tecnicoSeleccionadoObj ? `${tecnicoSeleccionadoObj.first_name} ${tecnicoSeleccionadoObj.last_name}` : "Técnico Asignado";

      let realServiceId = null;

      if (cotizacionSeleccionada.raw?.service_id) {
        realServiceId = cotizacionSeleccionada.raw.service_id;
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/servicios/${realServiceId}/asignar-trabajo`, {
          tecnico_id: formPlanificacion.tecnico,
          scheduled_start: formPlanificacion.fecha,
          description: formPlanificacion.descripcionTrabajo
        }, { headers });
      } else if (cotizacionSeleccionada.raw?.work_order_id) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/work-orders/${cotizacionSeleccionada.raw.work_order_id}/assign`, {
          tecnico_id: formPlanificacion.tecnico,
          scheduled_at: formPlanificacion.fecha,
          description: formPlanificacion.descripcionTrabajo
        }, { headers });
      } else {
        // Crear nuevo servicio si no existe
        const resNew = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/servicios`, {
          property_id: id,
          title: cotizacionSeleccionada.producto,
          description: formPlanificacion.descripcionTrabajo || cotizacionSeleccionada.comentario,
          technician_id: formPlanificacion.tecnico,
          scheduled_start: formPlanificacion.fecha,
          priority: formPlanificacion.prioridad === 'SOS' ? 'Urgente' : 'Media'
        }, { headers });
        realServiceId = resNew.data?.service?.id;
      }

      // Actualizar estatus de cotización a ASIGNADO
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacionSeleccionada.id}/status`, {
        status: 'ASIGNADO'
      }, { headers });

      const nuevoTrabajo = {
        id: realServiceId ? `serv-${realServiceId}` : `wo-${Date.now()}`,
        realId: realServiceId || Date.now(),
        tipo_registro: realServiceId ? 'servicio' : 'work_order',
        producto: cotizacionSeleccionada.producto,
        tecnico: nombreTecnico,
        fecha: formPlanificacion.fecha,
        prioridad: formPlanificacion.prioridad,
        comentario: cotizacionSeleccionada.comentario,
        descripcion: formPlanificacion.descripcionTrabajo,
        estado: formPlanificacion.prioridad === 'SOS' ? "SOS" : "PENDIENTE"
      };

      setCotizaciones(cotizaciones.map(cot => 
        cot.id === cotizacionSeleccionada.id 
        ? { ...cot, status: "ASIGNADO" } 
        : cot
      ));

      setColaTrabajos([nuevoTrabajo, ...colaTrabajos]);
      setCotizacionSeleccionada(null);
      Swal.fire({ icon: 'success', title: 'Técnico Asignado', text: 'Técnico asignado y estatus actualizado correctamente.', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error("Error al asignar técnico:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un problema al asignar el técnico.' });
    }
  };

  const fetchDetalleTrabajo = async (item) => {
    setTrabajoSeleccionado(item);
    setIsModalHistorialOpen(true);
    setReportesDetallados([]);
    setCargandoReportes(true);

    try {
      const token = localStorage.getItem('agente_token');
      // Usar realId para evitar el doble prefijo (por ejemplo, "work_order-wo-15")
      const paramId = item.tipo_registro === 'work_order' 
        ? `work_order-${item.realId}` 
        : `servicio-${item.realId}`;

      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/${paramId}/reportes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data || [];
      // Ordenar cronológicamente (más antiguo primero) para que el Paso 1 sea el primer avance registrado
      const ordenados = [...data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setReportesDetallados(ordenados);
    } catch (error) {
      console.error("Error al cargar la bitácora del trabajo:", error);
    } finally {
      setCargandoReportes(false);
    }
  };

  const handleValidarPagoDetail = async () => {
    if (!cotizacionDetail) return;
    try {
      setEnviandoMensaje(true);
      const token = localStorage.getItem('agente_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacionDetail.id}/validar-pago`, {}, { headers });
      
      // Actualizar localmente
      setCotizacionDetail(prev => ({
        ...prev,
        status: 'Pagado',
        raw: {
          ...(prev.raw || prev),
          status: 'Pagado',
          payment_status: 'Validado'
        }
      }));

      // Actualizar listado de cotizaciones
      setCotizaciones(prevCots => prevCots.map(c => 
        c.id === cotizacionDetail.id 
          ? { ...c, status: 'Pagado', raw: { ...c.raw, status: 'Pagado', payment_status: 'Validado' } }
          : c
      ));

      Swal.fire({ icon: 'success', title: '¡Pago Validado!', text: 'Pago validado y servicio programado correctamente.' });
    } catch (error) {
      console.error('Error validando pago:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un problema al validar el pago.' });
    } finally {
      setEnviandoMensaje(false);
    }
  };

  const enviarMensajeChatDetail = async () => {
    if (!mensajeChat.trim() || !cotizacionDetail) return;
    setEnviandoMensaje(true);
    try {
      const token = localStorage.getItem('agente_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacionDetail.id}/chat`, {
        message: mensajeChat
      }, { headers });
      
      setCotizacionDetail(prev => ({
        ...prev,
        chat_history: res.data.chat_history,
        raw: {
          ...(prev.raw || prev),
          chat_history: res.data.chat_history
        }
      }));

      setCotizaciones(prevCots => prevCots.map(c => 
        c.id === cotizacionDetail.id 
          ? { ...c, chat_history: res.data.chat_history, raw: { ...c.raw, chat_history: res.data.chat_history } }
          : c
      ));

      setMensajeChat('');
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error al enviar el mensaje' });
    } finally {
      setEnviandoMensaje(false);
    }
  };

  const enviarMensajeChatModal = async () => {
    if (!mensajeChat.trim() || !chatCotizacion) return;
    setEnviandoMensaje(true);
    try {
      const token = localStorage.getItem('agente_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${chatCotizacion.id}/chat`, {
        message: mensajeChat
      }, { headers });

      setChatCotizacion(prev => ({
        ...prev,
        chat_history: res.data.chat_history,
        raw: {
          ...(prev.raw || {}),
          chat_history: res.data.chat_history
        }
      }));

      setCotizaciones(prevCots => prevCots.map(c => 
        c.id === chatCotizacion.id 
          ? { ...c, chat_history: res.data.chat_history, raw: { ...c.raw, chat_history: res.data.chat_history } }
          : c
      ));

      setMensajeChat('');
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error al enviar el mensaje' });
    } finally {
      setEnviandoMensaje(false);
    }
  };

  const tareasAgrupadas = useMemo(() => {
    const grupos = {};
    const resultado = [];

    colaTrabajos.forEach(tarea => {
      if (tarea.batch_id) {
        if (!grupos[tarea.batch_id]) {
          grupos[tarea.batch_id] = {
            ...tarea,
            id: `batch-${tarea.batch_id}`,
            isBatch: true,
            batchTasks: [tarea],
            batchProgressText: "Trabajos listos: 0/1",
            producto: "📦 TRABAJOS MÚLTIPLES EN LA PROPIEDAD"
          };
          resultado.push(grupos[tarea.batch_id]);
        } else {
          grupos[tarea.batch_id].batchTasks.push(tarea);
        }
      } else {
        tarea.isBatch = false;
        resultado.push(tarea);
      }
    });

    Object.values(grupos).forEach(grupo => {
      const listos = grupo.batchTasks.filter(t => t.estado === 'FINALIZADO').length;
      const total = grupo.batchTasks.length;
      grupo.batchProgressText = `Trabajos listos: ${listos}/${total}`;
      
      if (total === 1) {
        grupo.isBatch = false;
        grupo.producto = grupo.batchTasks[0].producto;
      }
      
      const order = { 'SOS': 1, 'ESPERANDO': 2, 'PENDIENTE': 3, 'EN PROCESO': 4, 'FINALIZADO': 5 };
      grupo.estado = grupo.batchTasks.reduce((prev, curr) => {
        return order[curr.estado] < order[prev] ? curr.estado : prev;
      }, 'FINALIZADO');
    });

    return resultado;
  }, [colaTrabajos]);

  useEffect(() => {
    if (isModalHistorialOpen && trabajoSeleccionado && trabajoSeleccionado.isBatch) {
      const currentTask = trabajoSeleccionado.batchTasks[activeBatchTab];
      if (currentTask) {
        fetchDetalleTrabajo(currentTask);
        // Resetea a isBatch de nuevo, pues fetchDetalleTrabajo(currentTask) lo sobrescribe,
        // esto asegura que se vuelva a renderizar la vista con el batch
        setTrabajoSeleccionado(trabajoSeleccionado);
      }
    }
  }, [activeBatchTab, isModalHistorialOpen, trabajoSeleccionado]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
        <div className="spinner" style={{ border: '8px solid #f3f3f3', borderTop: '8px solid #ff6b00', borderRadius: '50%', width: '60px', height: '60px', animation: 'spin 2s linear infinite' }}></div>
        <p style={{ fontWeight: 'bold', color: '#555' }}>Cargando detalles de la propiedad...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const cotizacionesPagadas = cotizaciones.filter(c => 
    String(c.status || '').toLowerCase().includes('pagad') || 
    String(c.status || '').toLowerCase() === 'pagado'
  );
  
  const cotizacionesNoPagadas = cotizaciones.filter(c => 
    !String(c.status || '').toLowerCase().includes('pagad') && 
    String(c.status || '').toLowerCase() !== 'pagado'
  );

  return (
    <div className="app-container">
      {/* MAIN CONTENT – SIN SIDEBAR */}
      <main className="main-content" style={{ marginLeft: 0 }}>
        {/* HEADER SUPERIOR REDISEÑADO */}
        <header className="top-bar">

          {/* Logo + Navegación */}
          <div className="top-bar-left">
            <button 
              onClick={() => {
                if (user?.role_id === 3) {
                  navigate(`/DetallePropiedad/${id}`);
                } else {
                  navigate('/VistaRoot');
                }
              }} 
              className="btn-back-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                marginRight: '15px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
            >
              <ArrowLeft size={16} /> Regresar
            </button>

            <div className="logo-brand" style={{ display: 'flex', alignItems: 'center', margin: '0 15px' }}>
              <img src={Logo3} alt="Agente Solutions" style={{ height: '30px', objectFit: 'contain' }} />
            </div>

            <nav className="top-nav">

              <button className="nav-item active">
                <LayoutDashboard size={18}/> Dashboard
              </button>

              {user?.role_id !== 3 && (
                <button className="nav-item" onClick={() => setIsModalPerfilOpen(true)}>
                  <User size={18}/> Perfil Propiedad
                </button>
              )}

            </nav>
          </div>

          {/* Info de la propiedad y usuario */}
          <div className="top-bar-right">
            <div className="prop-info">

              <h1 style={{ fontSize: '1.2rem', margin: 0 }}>
                {datosPropiedad.nombre_propiedad || "Propiedad"} <span style={{ color: '#ff6b00' }}>#{id}</span>
              </h1>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px', color: '#555' }}>
                <MapPin size={14}/> {datosPropiedad.location || "Mérida, Yuc."}
              </p>
            </div>
            {(() => {
              const ownerName = datosPropiedad.personaCargo;
              const ownerPic = datosPropiedad.personaFoto;
              const isSharedWithMe = datosPropiedad.isSharedWithMe;
              const sharedUsers = datosPropiedad.sharedUsers || [];
              const isSharedByOwner = sharedUsers.length > 0;

              if (isSharedWithMe) {
                return (
                  <div className="user-badge shared-with-me" onClick={() => { if(user?.role_id !== 3) setIsModalPerfilOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#f8f9fa', borderRadius: '20px', border: '1px solid #ddd', cursor: 'pointer' }}>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>Propiedad de:</span>
                    {ownerPic ? (
                      <img src={ownerPic} alt={ownerName} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="avatar" style={{ width: '24px', height: '24px', background: '#f26624', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {ownerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontWeight: '600', color: '#334155' }}>{ownerName}</span>
                  </div>
                );
              } else if (isSharedByOwner) {
                return (
                  <div className="user-badge sharing-with" onClick={() => { if(user?.role_id !== 3) setIsModalPerfilOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#fff3cd', borderRadius: '20px', border: '1px solid #ffeeba', cursor: 'pointer' }}>
                    <span style={{ fontSize: '0.8rem', color: '#856404' }}>Compartiendo con:</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {sharedUsers.map((u, i) => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: i > 0 ? '8px' : '0' }}>
                          {u.profile_picture ? (
                            <img src={u.profile_picture} alt={u.name} title={u.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div className="avatar" title={u.name} style={{ width: '24px', height: '24px', background: '#ffc107', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem', fontWeight: 'bold' }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontWeight: '600', color: '#856404', fontSize: '0.85rem' }}>{u.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="user-badge unshared" onClick={() => { if(user?.role_id !== 3) setIsModalPerfilOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#e2e3e5', borderRadius: '20px', border: '1px solid #d6d8db', cursor: 'pointer' }}>
                    <span style={{ fontSize: '0.8rem', color: '#383d41', fontWeight: '600' }}>PROPIEDAD SIN COMPARTIR</span>
                  </div>
                );
              }
            })()}
          </div>

        </header>

        {user?.role_id !== 3 && sosPendientes.length > 0 && (
          <div className="sos-alert-banner">
            <div className="sos-banner-content">
              <div className="icon-pulse"><AlertTriangle size={24} /></div>
              <div>
                <strong>NUEVA EMERGENCIA DETECTADA</strong>
                <p>{sosPendientes[0].producto}</p>
              </div>
            </div>
            <button className="btn-atender-ahora" onClick={() => abrirModalCotizar(sosPendientes[0])}>COTIZAR AHORA</button>
          </div>
        )}

        {/* Tablero Kanban */}
        <section className="kanban-section-full" style={{ background: '#f8fafc', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
            <div className="section-title" style={{ margin: 0 }}><LayoutDashboard size={20}/> <h2>Tablero de Control de Servicios</h2></div>
            
            {/* Pestañas estilo píldora */}
            <div style={{ display: 'flex', gap: '10px', background: '#f1f5f9', padding: '4px', borderRadius: '30px', border: '1px solid #cbd5e1' }}>
              <button 
                onClick={() => setTabTablero('activos')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '25px',
                  border: 'none',
                  background: tabTablero === 'activos' ? '#f26624' : 'transparent',
                  color: tabTablero === 'activos' ? 'white' : '#475569',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ⚡ ACTIVOS ({colaTrabajos.filter(t => t.estado !== 'FINALIZADO').length})
              </button>
              <button 
                onClick={() => setTabTablero('historial')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '25px',
                  border: 'none',
                  background: tabTablero === 'historial' ? '#2e7d32' : 'transparent',
                  color: tabTablero === 'historial' ? 'white' : '#475569',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📋 HISTORIAL ({historialFinalizados.length})
              </button>
            </div>
          </div>

          {tabTablero === 'activos' ? (
            <div className="kanban-container-ui">
              {["ESPERANDO", "SOS", "PENDIENTE", "EN PROCESO"].map((estado, idx) => {
                const isOpen = colAbiertaKanban === estado;
                return (
                  <div key={idx} className={`k-column ${estado === 'SOS' ? 'sos-line' : estado === 'ESPERANDO' ? 'orange-line' : estado === 'PENDIENTE' ? 'yellow-line' : 'blue-line'}`}>
                    <div 
                      className={`k-header ${estado === 'SOS' ? 'red-text' : estado === 'ESPERANDO' ? 'orange-text' : ''}`}
                      onClick={() => setColAbiertaKanban(prev => prev === estado ? '' : estado)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="kanban-caret-icon" style={{ fontSize: '0.8rem' }}>
                          {isOpen ? '▼' : '►'}
                        </span>
                        {estado === 'SOS' ? 'SOS ACTIVO' : estado === 'ESPERANDO' ? 'POR AUTORIZAR' : estado === 'PENDIENTE' ? 'POR HACER' : estado}
                      </span>
                      <span>{tareasAgrupadas.filter(t=>t.estado === estado).length}</span>
                    </div>
                    <div className={`k-body ${isOpen ? 'is-open' : 'is-closed'}`}>
                      {tareasAgrupadas.filter(t => t.estado === estado).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                          Sin trabajos en este estado
                        </div>
                      ) : (
                        tareasAgrupadas.filter(t => t.estado === estado).map(t => (
                          <div 
                            key={t.id} 
                            className={`k-card ${estado === 'SOS' ? 'card-sos-active' : estado === 'ESPERANDO' ? 'card-waiting-client' : ''} animate-fade-in`}
                            onClick={() => {
                              setActiveBatchTab(0);
                              setTrabajoSeleccionado(t);
                              setIsModalHistorialOpen(true);
                              if (!t.isBatch) {
                                fetchDetalleTrabajo(t);
                              } else {
                                fetchDetalleTrabajo(t.batchTasks[0]);
                                setTrabajoSeleccionado(t);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                            title="Ver detalles del servicio"
                          >
                            {t.isBatch ? (
                              <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', border: '1px solid #7dd3fc', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{ fontSize: '14px' }}>📦</span> LISTADO MÚLTIPLE
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#0369a1' }}>
                                  {t.batchProgressText}
                                </div>
                              </div>
                            ) : (
                              (() => {
                                const loteMatch = t.descripcion ? t.descripcion.match(/\[LOTE-[A-Z0-9]+\] \((\d+)\/(\d+)\)/) : null;
                                if (loteMatch && loteMatch[2] !== '1') {
                                  return (
                                    <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '10px', border: '1px solid #7dd3fc', width: 'fit-content' }}>
                                      <span style={{ fontSize: '12px' }}>📦</span> LISTADO MULTIPLE: {loteMatch[0]}
                                    </div>
                                  );
                                }
                                return null;
                              })()
                            )}
                            {(() => {
                              const is2daReq = 
                                t.status === 'Segunda Visita Solicitada' || 
                                t.estado === 'Segunda Visita Solicitada' || 
                                (t.descripcion && t.descripcion.includes('[SOLICITUD 2DA VISITA]')) ||
                                (t.description && t.description.includes('[SOLICITUD 2DA VISITA]')) ||
                                (t.isBatch && t.batchTasks?.some(bt => 
                                  bt.status === 'Segunda Visita Solicitada' || 
                                  bt.estado === 'Segunda Visita Solicitada' || 
                                  (bt.descripcion && bt.descripcion.includes('[SOLICITUD 2DA VISITA]')) ||
                                  (bt.description && bt.description.includes('[SOLICITUD 2DA VISITA]'))
                                ));

                              const is2daAgreed = 
                                t.status === 'Segunda Visita Programada' || 
                                t.estado === 'Segunda Visita Programada' || 
                                (t.descripcion && (t.descripcion.includes('[RESPUESTA CLIENTE 2DA VISITA]') || t.descripcion.includes('[PROGRAMACIÓN DIRECTA 2DA VISITA POR ADMIN]')));

                              const rawCardDesc = t.descripcion || t.description || '';
                              let cleanCardDesc = rawCardDesc
                                .replace(/\n?\[(SOLICITUD 2DA VISITA|RESPUESTA CLIENTE 2DA VISITA|PROGRAMACIÓN DIRECTA 2DA VISITA POR ADMIN|ALERTA DE REPROGRAMACIÓN)\].*/gs, '')
                                .trim();

                              if (cleanCardDesc.includes('[EQUIPO AFECTADO]:')) {
                                cleanCardDesc = cleanCardDesc.split('[EQUIPO AFECTADO]:')[0].trim();
                              }
                              // Quitar prefijo de lote tipo [LOTE-XXXX] (1/1)
                              cleanCardDesc = cleanCardDesc.replace(/\[LOTE-[A-Z0-9]+\]\s*(\(\d+\/\d+\))?\s*/gi, '').trim();

                              return (
                                <>
                                  {is2daReq && !is2daAgreed && (
                                    <div style={{ background: '#fff7ed', color: '#c2410c', border: '1.5px solid #ea580c', padding: '6px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', boxShadow: '0 2px 6px rgba(234,88,12,0.15)' }}>
                                      <AlertTriangle size={14} color="#ea580c" />
                                      <span>2DA VISITA SOLICITADA - TOCAR</span>
                                    </div>
                                  )}

                                  {is2daAgreed && (
                                    <div style={{ background: '#f0fdf4', color: '#15803d', border: '1.5px solid #22c55e', padding: '5px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                                      <CheckCircle size={12} color="#16a34a" />
                                      <span>2DA VISITA PROGRAMADA</span>
                                    </div>
                                  )}

                                  <h4>{t.producto}</h4>
                                  {cleanCardDesc && (
                                    <p style={{ fontSize: '0.85em', color: '#555', marginTop: '4px', lineHeight: 1.3 }}>
                                      {cleanCardDesc.length > 55 
                                        ? cleanCardDesc.substring(0, 55) + '…' 
                                        : cleanCardDesc}
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                            <div className="k-footer">
                              <span className={estado === 'SOS' ? 'badge-sos' : estado === 'ESPERANDO' ? 'badge-status-waiting' : 'badge-prio alta'}>
                                {t.tecnico || 'Sin Técnico'}
                              </span>
                              <span className={estado === 'SOS' ? 'date-text-red' : 'date-text'}><Clock size={12}/> {t.fecha}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA DE HISTORIAL EN ACORDEONES POR AÑO Y MES */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #cbd5e1' }}>
              {historialFinalizados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <CheckCircle size={40} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
                  <p style={{ margin: 0, fontWeight: 'bold' }}>No hay registros de trabajos finalizados en esta propiedad.</p>
                </div>
              ) : (
                agruparPorAnioYMes(historialFinalizados).map((grupoAnio, aIdx) => {
                  const claveAnio = String(grupoAnio.anio);
                  const isAnioOpen = !!mesesAbiertos[claveAnio];

                  return (
                    <div key={`anio-${aIdx}`} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.01)', marginBottom: '10px' }}>
                      {/* Cabecera del Año */}
                      <div 
                        onClick={() => setMesesAbiertos(prev => ({ ...prev, [claveAnio]: !isAnioOpen }))}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px 20px',
                          background: isAnioOpen ? '#1e293b' : '#334155',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{isAnioOpen ? '▼' : '►'}</span>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                            {grupoAnio.anio}
                          </h3>
                        </div>
                      </div>

                      {/* Cuerpo del Año (Meses) */}
                      {isAnioOpen && (
                        <div style={{ padding: '15px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {grupoAnio.meses.map((grupoMes, mIdx) => {
                            const claveMes = `${grupoMes.mes} ${grupoAnio.anio}`;
                            const isMesOpen = !!mesesAbiertos[claveMes];

                            return (
                              <div key={`mes-${mIdx}`} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
                                {/* Cabecera del Mes */}
                                <div 
                                  onClick={() => setMesesAbiertos(prev => ({ ...prev, [claveMes]: !isMesOpen }))}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    background: isMesOpen ? '#f0fdf4' : 'white',
                                    cursor: 'pointer',
                                    borderBottom: isMesOpen ? '1px solid #e2e8f0' : 'none',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '1rem', color: '#64748b' }}>{isMesOpen ? '▼' : '►'}</span>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: isMesOpen ? '#15803d' : '#475569' }}>
                                      {grupoMes.mes}
                                    </h4>
                                  </div>
                                  <span style={{ 
                                    background: isMesOpen ? '#dcfce7' : '#f1f5f9', 
                                    color: isMesOpen ? '#15803d' : '#64748b', 
                                    padding: '4px 10px', 
                                    borderRadius: '15px', 
                                    fontWeight: '700',
                                    fontSize: '0.8rem'
                                  }}>
                                    {grupoMes.items.length} Trabajo{grupoMes.items.length > 1 ? 's' : ''}
                                  </span>
                                </div>

                                {/* Cuerpo del Mes (Trabajos) */}
                                {isMesOpen && (
                                  <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {grupoMes.items.map((item, itemIdx) => (
                                      <div 
                                        key={item.id || itemIdx}
                                        onClick={() => {
                                          const realItem = colaTrabajos.find(t => String(t.realId) === String(item.id) && t.tipo_registro === item.tipo_registro) || item;
                                          fetchDetalleTrabajo(realItem);
                                        }}
                                        style={{ 
                                          display: 'flex',
                                          flexWrap: 'wrap',
                                          gap: '12px',
                                          justifyContent: 'space-between',
                                          alignItems: 'flex-start',
                                          padding: '12px',
                                          background: '#f8fafc',
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          border: '1px solid transparent',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={e => {
                                          e.currentTarget.style.background = 'white';
                                          e.currentTarget.style.border = '1px solid #cbd5e1';
                                          e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                                        }}
                                        onMouseLeave={e => {
                                          e.currentTarget.style.background = '#f8fafc';
                                          e.currentTarget.style.border = '1px solid transparent';
                                          e.currentTarget.style.boxShadow = 'none';
                                        }}
                                      >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 200px' }}>
                                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: '1.3' }}>{item.producto}</h4>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><Clock size={12}/> {item.fecha}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><User size={12}/> {item.tecnico}</span>
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
                                          {item.evidencias && item.evidencias.length > 0 ? (
                                            <div style={{ width: '36px', height: '36px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                              <img src={item.evidencias[0]} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                          ) : (
                                            <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <ImageIcon size={16} color="#94a3b8" />
                                            </div>
                                          )}
                                          <button 
                                            style={{
                                              background: '#f8fafc',
                                              border: '1px solid #cbd5e1',
                                              borderRadius: '20px',
                                              padding: '6px 14px',
                                              fontSize: '0.78rem',
                                              fontWeight: '700',
                                              color: '#475569',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                          >
                                            <Eye size={13} style={{ color: '#f26624' }} /> Ver Detalles
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>

        <div className="management-section-full" style={{ width: '100%', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Historial de Servicios (TABLA PRINCIPAL COMPLETA) */}
          <section className="glass-card" style={{ width: '100%', background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }}>
            <div className="card-header-ui" style={{ marginBottom: '15px' }}><CheckCircle size={20} className="icon-blue"/> <h2>Historial de Solicitudes y Cotizaciones</h2></div>
            
            {/* Acordeón de Cotizaciones Pendientes / No Pagadas */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
              <div 
                onClick={() => setCotsAcordeonOpen(prev => ({ ...prev, pendientes: !prev.pendientes }))}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: cotsAcordeonOpen.pendientes ? '#fff7ed' : '#f8fafc',
                  cursor: 'pointer',
                  borderBottom: cotsAcordeonOpen.pendientes ? '1px solid #cbd5e1' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem', color: cotsAcordeonOpen.pendientes ? '#f26624' : '#64748b' }}>{cotsAcordeonOpen.pendientes ? '▼' : '►'}</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: cotsAcordeonOpen.pendientes ? '#f26624' : '#334155' }}>
                    📝 SOLICITUDES Y COTIZACIONES PENDIENTES / ACTIVAS
                  </h3>
                </div>
                <span style={{ 
                  background: cotsAcordeonOpen.pendientes ? '#ffedd5' : '#e2e8f0', 
                  color: cotsAcordeonOpen.pendientes ? '#f26624' : '#475569', 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontWeight: '800',
                  fontSize: '0.8rem'
                }}>
                  {cotizacionesNoPagadas.length} Registro{cotizacionesNoPagadas.length !== 1 ? 's' : ''}
                </span>
              </div>

              {cotsAcordeonOpen.pendientes && (
                <div style={{ padding: '15px', background: 'white' }}>
                  {cotizacionesNoPagadas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      No hay cotizaciones pendientes en esta propiedad.
                    </div>
                  ) : (
                    <div className="table-wrapper">
                      <table className="modern-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '12px 16px' }}>Servicio / Concepto</th>
                            <th style={{ padding: '12px 16px' }}>Estatus</th>
                            <th style={{ padding: '12px 16px', maxWidth: '300px' }}>Comentario Cliente</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cotizacionesNoPagadas.map(cot => (
                            <tr key={cot.id} className={cot.esEmergencia ? 'row-priority-sos' : 'row-quote-pending'} style={{ background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                              <td data-label="Servicio" style={{ padding: '16px' }}><b>{cot.producto}</b> {cot.esEmergencia && <span className="prio-tag">SOS</span>}</td>
                              <td data-label="Estatus" style={{ padding: '16px' }}><span className={`status-pill pill-${cot.status.toLowerCase()}`}>{cot.status}</span></td>
                              <td data-label="Comentario" className="comment-cell" style={{ padding: '16px', maxWidth: '300px' }}>
                                <div className="flex-comment" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.4' }}>
                                  <MessageSquare size={16} className="icon-gray" style={{ flexShrink: 0, marginTop: '2px' }}/>
                                  <span style={{ color: '#475569', fontSize: '0.9rem' }}>{cot.comentario || "Sin observaciones"}</span>
                                </div>
                              </td>
                              <td data-label="Acciones" style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                  {cot.status === "ACEPTADA" || cot.status === "Aprobado" || cot.status === "Pendiente" ? (
                                    <button className="btn-planificar" onClick={() => {
                                      setCotizacionSeleccionada(cot);
                                      setFormPlanificacion({ 
                                        tecnico: "", 
                                        fecha: cot.esEmergencia ? obtenerFechaHoy() : "", 
                                        prioridad: cot.esEmergencia ? "SOS" : "ALTA",
                                        descripcionTrabajo: ""
                                      });
                                    }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', background: '#1e293b', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                      <Settings size={15}/> ASIGNAR
                                    </button>
                                  ) : cot.status === "ASIGNADO" || cot.status === "Programado" ? (
                                     <span className="text-assigned" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 'bold', fontSize: '0.85rem', padding: '8px 12px', background: '#f0fdf4', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                                       <CheckCircle size={15}/> EN TABLERO
                                     </span>
                                  ) : (
                                    <span className="text-closed" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontWeight: 'bold', fontSize: '0.85rem', padding: '8px 12px', background: '#f1f5f9', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                      {cot.status === "ENVIADA" ? "ESPERANDO..." : "CERRADO"}
                                    </span>
                                  )}

                                  <button
                                    onClick={() => {
                                      setChatCotizacion(cot);
                                      setIsModalChatOpen(true);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '8px 16px',
                                      borderRadius: '20px',
                                      border: '1px solid #cbd5e1',
                                      background: 'white',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      color: '#334155',
                                      fontWeight: '600',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    title="Ver conversación con el cliente"
                                  >
                                    <MessageCircle size={15} color="#3b82f6" /> Chat
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCotizacionDetail(cot);
                                      setIsModalCotizacionDetailOpen(true);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '8px 16px',
                                      borderRadius: '20px',
                                      border: '1px solid #cbd5e1',
                                      background: 'white',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      color: '#334155',
                                      fontWeight: '600',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    title="Ver detalle de la cotización"
                                  >
                                    <Eye size={15} color="#f26624" /> Ver cotización
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Acordeón de Cotizaciones Pagadas */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
              <div 
                onClick={() => setCotsAcordeonOpen(prev => ({ ...prev, pagadas: !prev.pagadas }))}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: cotsAcordeonOpen.pagadas ? '#e8f5e9' : '#f8fafc',
                  cursor: 'pointer',
                  borderBottom: cotsAcordeonOpen.pagadas ? '1px solid #cbd5e1' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem', color: cotsAcordeonOpen.pagadas ? '#2e7d32' : '#64748b' }}>{cotsAcordeonOpen.pagadas ? '▼' : '►'}</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: cotsAcordeonOpen.pagadas ? '#2e7d32' : '#334155' }}>
                    ✅ COTIZACIONES PAGADAS
                  </h3>
                </div>
                <span style={{ 
                  background: cotsAcordeonOpen.pagadas ? '#c8e6c9' : '#e2e8f0', 
                  color: cotsAcordeonOpen.pagadas ? '#2e7d32' : '#475569', 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontWeight: '800',
                  fontSize: '0.8rem'
                }}>
                  {cotizacionesPagadas.length} Registro{cotizacionesPagadas.length !== 1 ? 's' : ''}
                </span>
              </div>

              {cotsAcordeonOpen.pagadas && (
                <div style={{ padding: '15px', background: 'white' }}>
                  {cotizacionesPagadas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      No hay cotizaciones pagadas en esta propiedad.
                    </div>
                  ) : (
                    <div className="table-wrapper">
                      <table className="modern-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '12px 16px' }}>Servicio / Concepto</th>
                            <th style={{ padding: '12px 16px' }}>Estatus</th>
                            <th style={{ padding: '12px 16px', maxWidth: '300px' }}>Comentario Cliente</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cotizacionesPagadas.map(cot => (
                            <tr key={cot.id} className="row-quote-paid" style={{ background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                              <td data-label="Servicio" style={{ padding: '16px' }}><b>{cot.producto}</b> {cot.esEmergencia && <span className="prio-tag">SOS</span>}</td>
                              <td data-label="Estatus" style={{ padding: '16px' }}><span className="status-pill pill-pagada" style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', fontWeight: 'bold', padding: '6px 12px', borderRadius: '15px' }}>PAGADO</span></td>
                              <td data-label="Comentario" className="comment-cell" style={{ padding: '16px', maxWidth: '300px' }}>
                                <div className="flex-comment" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.4' }}>
                                  <MessageSquare size={16} className="icon-gray" style={{ flexShrink: 0, marginTop: '2px' }}/>
                                  <span style={{ color: '#475569', fontSize: '0.9rem' }}>{cot.comentario || "Sin observaciones"}</span>
                                </div>
                              </td>
                              <td data-label="Acciones" style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span className="text-closed" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2e7d32', fontWeight: 'bold', fontSize: '0.85rem', padding: '8px 12px', background: '#e8f5e9', borderRadius: '20px', border: '1px solid #c8e6c9' }}>
                                    <CheckCircle size={15}/> PAGADO
                                  </span>

                                  <button
                                    onClick={() => {
                                      setChatCotizacion(cot);
                                      setIsModalChatOpen(true);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '8px 16px',
                                      borderRadius: '20px',
                                      border: '1px solid #cbd5e1',
                                      background: 'white',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      color: '#334155',
                                      fontWeight: '600',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    title="Ver conversación con el cliente"
                                  >
                                    <MessageCircle size={15} color="#3b82f6" /> Chat
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCotizacionDetail(cot);
                                      setIsModalCotizacionDetailOpen(true);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '8px 16px',
                                      borderRadius: '20px',
                                      border: '1px solid #cbd5e1',
                                      background: 'white',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      color: '#334155',
                                      fontWeight: '600',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    title="Ver detalle de la cotización"
                                  >
                                    <Eye size={15} color="#f26624" /> Ver cotización
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* REPORTES REALIZADOS EN LA PROPIEDAD */}
        <section className="reports-section-container" style={{ marginTop: '40px', marginBottom: '40px' }}>
          <div className="card-header-ui" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <FileText size={20} className="icon-orange" style={{ color: '#f26624' }} />
            <h2 style={{ fontSize: '1.3rem', color: '#1e293b', margin: 0, fontWeight: 'bold' }}>Reportes realizados en la propiedad</h2>
          </div>

          {reportesPropiedad.length > 0 ? (
            <div className="reports-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '25px' 
            }}>
              {reportesPropiedad.map((rep) => {
                const techList = rep.technicians || [];
                let techName = "Por asignar";
                if (techList.length > 0) {
                  techName = techList.map(t => `${t.first_name || t.name || ''} ${t.last_name || ''}`.trim()).filter(Boolean).join(', ');
                } else if (rep.technician) {
                  techName = `${rep.technician.first_name || rep.technician.name || ''} ${rep.technician.last_name || ''}`.trim() || "Técnico";
                } else if (rep.tecnico_nombre) {
                  techName = rep.tecnico_nombre;
                } else if (rep.tecnico && typeof rep.tecnico === 'string') {
                  techName = rep.tecnico;
                }
                
                const techInitial = techName !== "Por asignar" && techName !== "Técnico" ? techName.charAt(0).toUpperCase() : "T";
                const imgUrl = rep.todas_fotos ? rep.todas_fotos[0] : (rep.image_url || rep.image_path || rep.foto || rep.photo || null);
                const trabajoId = rep.service_id || rep.work_order_id || rep.id;
                const fechaFormat = rep.created_at ? new Date(rep.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "---";

                return (
                  <div 
                    key={rep.id} 
                    className="report-card-modern"
                    onClick={() => {
                      const tipoRegistro = rep.work_order_id || rep.workOrder ? 'work_order' : 'servicio';
                      const realId = rep.service_id || rep.work_order_id || rep.id;
                      const producto = rep.service?.title || rep.workOrder?.type || rep.title || "Reporte de Trabajo";
                      const tecnico = techName;
                      const fecha = rep.service?.scheduled_start ? new Date(rep.service.scheduled_start).toLocaleDateString() : (rep.workOrder?.scheduled_at ? new Date(rep.workOrder.scheduled_at).toLocaleDateString() : (rep.created_at ? new Date(rep.created_at).toLocaleDateString() : "---"));
                      fetchDetalleTrabajo({
                        id: realId,
                        realId: realId,
                        tipo_registro: tipoRegistro,
                        producto: producto,
                        tecnico: tecnico,
                        fecha: fecha,
                        evidencias: rep.todas_fotos || [rep.image_url || rep.image_path || rep.foto || rep.photo].filter(Boolean)
                      });
                    }}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.06)'; }}
                  >
                    {imgUrl ? (
                      <div 
                        className="report-img-wrapper" 
                        style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden', backgroundColor: '#f8fafc' }}
                      >
                        <img 
                          src={imgUrl} 
                          alt="Reporte evidencia" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        />
                        <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: '#f26624', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                          <CheckCircle size={12} /> {rep.avances_count || 1} Avance{rep.avances_count > 1 ? 's' : ''}
                        </div>
                        <div style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', backdropFilter: 'blur(4px)' }}>
                          <Briefcase size={12} /> Abrir Bitácora
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '220px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <ImageIcon size={40} />
                      </div>
                    )}

                    <div className="report-card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      {/* Técnico info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#f26624', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', border: '1px solid #e2e8f0' }}>
                          {techInitial}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: '#f26624', fontWeight: '700' }}>{techName}</h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Técnico de Campo</span>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.85rem' }}>
                          <FileText size={16} style={{ color: '#f26624' }} />
                          <span><b>Trabajo ID:</b> {trabajoId}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.85rem' }}>
                          <Clock size={16} style={{ color: '#f26624' }} />
                          <span><b>Subido:</b> {fechaFormat}</span>
                        </div>
                      </div>

                      {/* Botón Ver Detalles */}
                      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8fafc', color: '#334155', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s ease' }}>
                        <Eye size={16} style={{ color: '#f26624' }} /> Ver Detalles de Servicio
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-reports-card" style={{ padding: '40px', textAlign: 'center', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <FileText size={48} style={{ color: '#cbd5e1', margin: '0 auto 15px auto' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '1.2rem' }}>Sin reportes en proceso</h3>
              <p style={{ margin: '0 auto', color: '#64748b', maxWidth: '400px' }}>Aún no se han registrado reportes de avance o de proceso para los trabajos activos en esta propiedad.</p>
            </div>
          )}
        </section>


      </main>

      {/* MODAL DE COTIZACIÓN EMERGENCIA */}
      {isModalCotizarEmergenciaOpen && (
        <div className="modal-overlay-ui">
          <div className="modal-card-ui invoice-modal animate-fade-in">
            <div className="modal-header-sos">
              <div className="header-info">
                <div className="icon-circle-white"><FileText size={20} /></div>
                <div><h3>Presupuesto Emergencia</h3><span>ID: #{emergenciaACotizar?.id}</span></div>
              </div>
              <button className="btn-close-modal" onClick={() => setIsModalCotizarEmergenciaOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={enviarCotizacionFinal} className="invoice-form">
              <div className="invoice-container">
                <div className="invoice-body-scrollable" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                  {itemsCotizacion.map((item, index) => (
                    <div key={item.id} className="invoice-row animate-fade-in">
                      <div className="col-desc"><input type="text" placeholder="Concepto" value={item.concepto} onChange={(e) => { const n = [...itemsCotizacion]; n[index].concepto = e.target.value; setItemsCotizacion(n); }} required /></div>
                      <div className="col-qty"><input type="number" value={item.cantidad} onChange={(e) => { const n = [...itemsCotizacion]; n[index].cantidad = e.target.value; setItemsCotizacion(n); }} /></div>
                      <div className="col-price"><input type="number" placeholder="0" value={item.precio} onChange={(e) => { const n = [...itemsCotizacion]; n[index].precio = e.target.value; setItemsCotizacion(n); }} required /></div>
                      <div className="col-total">${(Number(item.cantidad) * Number(item.precio)).toLocaleString()}</div>
                      <div className="col-actions">
                        {itemsCotizacion.length > 1 && (
                          <button type="button" className="btn-delete-row" onClick={() => setItemsCotizacion(itemsCotizacion.filter(i => i.id !== item.id))}><Trash2 size={16} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="add-row-container" style={{ margin: '15px 0' }}>
                    <button type="button" className="btn-add-item-orange" onClick={agregarFila} style={{ backgroundColor: '#ff6b00', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', width: 'fit-content' }}>
                      <Plus size={18} /> Agregar concepto
                    </button>
                  </div>
                </div>
                <div className="invoice-summary">
                  <div className="summary-row">
                    <span>Total</span>
                    <span className="grand-total">${calcularTotalCotizacion().toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="invoice-actions-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalCotizarEmergenciaOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-send-invoice"><Send size={18}/> ENVIAR COTIZACIÓN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Perfil */}
      {isModalPerfilOpen && (
        <div className="modal-overlay-ui" onClick={() => setIsModalPerfilOpen(false)}>
          <div className="modal-card-ui profile-modern animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div className="header-content">
                <div className="icon-badge-white"><User size={24} /></div>
                <div><h3>Perfil de Propiedad</h3><span>Datos Identificatorios</span></div>
              </div>
              <button className="btn-close-light" onClick={() => setIsModalPerfilOpen(false)}><X size={20}/></button>
            </div>
            <div className="modal-body modern-body">
              <div className="info-grid">
                <div className="info-item-card"><div className="item-icon"><User size={18} /></div><div className="item-details"><label>Responsable</label><p>{datosPropiedad.personaCargo}</p></div></div>
                <div className="info-item-card"><div className="item-icon"><CreditCard size={18} /></div><div className="item-details"><label>CURP</label><p className="mono-text">{datosPropiedad.curp}</p></div></div>
                <div className="info-item-card full-width"><div className="item-icon"><MapPin size={18} /></div><div className="item-details"><label>Dirección Física</label><p>{datosPropiedad.direccion}</p></div></div>
              </div>
              <div className="modal-footer-actions">
                <a href={datosPropiedad.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-gps-premium"><Map size={18} /><span>Abrir Ubicación en Google Maps</span><ExternalLink size={14} className="icon-ext" /></a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE HISTORIAL (HERO BANNER E IGUAL A LA VISTA DEL TÉCNICO) */}
      {isModalHistorialOpen && trabajoSeleccionado && (
        <div className="modal-overlay-ui" onClick={() => setIsModalHistorialOpen(false)} style={{ zIndex: 9999 }}>
          <div className="modal-card-container" onClick={e => e.stopPropagation()} style={{ width: '920px', maxWidth: '95vw', maxHeight: '92vh', background: '#f8fafc', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: 'none' }}>
            
            {/* HERO BANNER IGUAL AL DEL TÉCNICO */}
            <section className="tp-property-hero" style={{ height: '220px', borderRadius: 0, marginBottom: 0, position: 'relative', flexShrink: 0 }}>
              <div className="tp-hero-overlay"></div>
              <img 
                src={datosPropiedad.facadePhoto || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1000'} 
                alt="Fachada de la Propiedad" 
                className="tp-hero-bg" 
              />
              
              <button 
                onClick={() => setIsModalHistorialOpen(false)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  zIndex: 10,
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(8px)',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}
              >
                ×
              </button>

              <div className="tp-hero-content" style={{ padding: '20px 25px' }}>
                <div className="tp-hero-text">
                  <span className="tp-id-badge">
                    {datosPropiedad.curp || `PROP-#${id}`}
                  </span>
                  <h1 className="tp-property-name" style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
                    {datosPropiedad.nombre_propiedad || 'Propiedad'}
                  </h1>
                  <div className="tp-property-address">
                    <MapPin size={16} />
                    <p style={{ margin: 0 }}>{datosPropiedad.direccion}</p>
                  </div>
                </div>
                
                <div className="tp-hero-actions">
                  {datosPropiedad.mapsUrl && datosPropiedad.mapsUrl !== '#' && (
                    <button 
                      className="tp-action-btn maps" 
                      onClick={() => window.open(datosPropiedad.mapsUrl, '_blank')}
                    >
                      <Navigation size={16} />
                      <span>GPS</span>
                    </button>
                  )}
                  {trabajoSeleccionado?.tecnico_telefono && (
                    <button 
                      className="tp-action-btn call" 
                      onClick={() => window.open(`tel:${trabajoSeleccionado.tecnico_telefono}`)}
                    >
                      <Phone size={16} />
                      <span>Llamar Técnico</span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            {trabajoSeleccionado.isBatch && (
              <div style={{ 
                background: 'linear-gradient(135deg, #1e293b, #0f172a)', 
                padding: '12px 20px', 
                borderBottom: '2px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ color: '#f8fafc', fontWeight: '800', fontSize: '0.82rem', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚡ Servicios incluidos en este lote ({trabajoSeleccionado.batchTasks?.length || 0})
                  </span>
                </div>
                <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '4px' }}>
                  {trabajoSeleccionado.batchTasks.map((t, index) => {
                    const isActive = activeBatchTab === index;
                    return (
                      <button
                        key={t.dbId || index}
                        onClick={() => setActiveBatchTab(index)}
                        style={{
                          padding: '8px 14px',
                          background: isActive ? 'linear-gradient(135deg, #F26522, #ea580c)' : '#f8fafc',
                          border: isActive ? 'none' : '1px solid #cbd5e1',
                          borderRadius: '10px',
                          fontWeight: isActive ? '800' : '700',
                          color: isActive ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          fontSize: '0.85rem'
                        }}
                      >
                        Servicio #{index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="modal-inner-scroll" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {(() => {
                const activeTask = trabajoSeleccionado.isBatch ? trabajoSeleccionado.batchTasks[activeBatchTab] : trabajoSeleccionado;
                if(!activeTask) return null;

                const rawDesc = activeTask.description || activeTask.descripcion || activeTask.producto || activeTask.title || '';
                const cleanDesc = rawDesc
                  .replace(/\n?\[(SOLICITUD 2DA VISITA|RESPUESTA CLIENTE 2DA VISITA|PROGRAMACIÓN DIRECTA 2DA VISITA POR ADMIN|ALERTA DE REPROGRAMACIÓN)\].*/gs, '')
                  .trim();

                let problema = activeTask.producto || activeTask.title || 'Mantenimiento General';
                let equipo = 'No especificado';

                if (cleanDesc.includes('[EQUIPO AFECTADO]:')) {
                  const parts = cleanDesc.split('[EQUIPO AFECTADO]:');
                  problema = parts[0].trim() || problema;
                  equipo = parts[1].trim() || 'No especificado';
                } else if (cleanDesc.includes('---')) {
                  const parts = cleanDesc.split('---');
                  problema = parts[0].trim() || problema;
                  equipo = parts[1].trim() || 'No especificado';
                } else if (cleanDesc) {
                  problema = cleanDesc;
                }

                // Limpiar prefijo de lote tipo [LOTE-XXXX] (1/1) para que solo quede la sintaxis del problema
                problema = problema.replace(/\[LOTE-[A-Z0-9]+\]\s*(\(\d+\/\d+\))?\s*/gi, '').trim() || problema;

                // Cálculo robusto del banner de 2da visita
                const fullTaskDesc = (
                  activeTask.description || 
                  activeTask.descripcion || 
                  trabajoSeleccionado?.description || 
                  trabajoSeleccionado?.descripcion || 
                  ''
                );

                const isSegundaVisitaRequested = 
                  activeTask.status === 'Segunda Visita Solicitada' || 
                  activeTask.estado === 'Segunda Visita Solicitada' || 
                  trabajoSeleccionado?.status === 'Segunda Visita Solicitada' || 
                  trabajoSeleccionado?.estado === 'Segunda Visita Solicitada' || 
                  fullTaskDesc.includes('[SOLICITUD 2DA VISITA]');

                const isSegundaVisitaAgreed = 
                  activeTask.status === 'Segunda Visita Programada' || 
                  activeTask.estado === 'Segunda Visita Programada' ||
                  trabajoSeleccionado?.status === 'Segunda Visita Programada' || 
                  trabajoSeleccionado?.estado === 'Segunda Visita Programada' ||
                  fullTaskDesc.includes('[RESPUESTA CLIENTE 2DA VISITA]') || 
                  fullTaskDesc.includes('[PROGRAMACIÓN DIRECTA 2DA VISITA POR ADMIN]');

                const showBanner2daVisita = isSegundaVisitaRequested && !isSegundaVisitaAgreed;

                let fechaPropuesta2da = activeTask.second_visit_proposed_date || trabajoSeleccionado?.second_visit_proposed_date;
                let motivo2da = activeTask.second_visit_reason || trabajoSeleccionado?.second_visit_reason;
                if (!fechaPropuesta2da && fullTaskDesc.includes('[SOLICITUD 2DA VISITA]')) {
                  const matchFecha = fullTaskDesc.match(/propone la fecha:\s*([^\.\n]+)/i);
                  if (matchFecha) fechaPropuesta2da = matchFecha[1].trim();

                  const matchMotivo = fullTaskDesc.match(/Motivo:\s*([^\.\n]+)/i);
                  if (matchMotivo) motivo2da = matchMotivo[1].trim();
                }

                return (
                  <>
                    {/* ALERTA Y RESPUESTA DE SEGUNDA VISITA PARA EL CLIENTE (AL INICIO DEL MODAL) */}
                    {showBanner2daVisita && (
                      <div style={{ background: '#fff7ed', border: '2px solid #ea580c', borderRadius: '18px', padding: '20px', marginBottom: '25px', boxShadow: '0 10px 25px rgba(234, 88, 12, 0.18)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#c2410c', fontWeight: '900', fontSize: '1.05rem', marginBottom: '8px' }}>
                          <AlertTriangle size={24} color="#ea580c" />
                          <span>SOLICITUD DE SEGUNDA VISITA</span>
                        </div>
                        <p style={{ margin: '0 0 14px 0', fontSize: '0.9rem', color: '#431407', lineHeight: '1.4' }}>
                          El técnico solicita regresar a una segunda visita. Fecha propuesta: <strong>{fechaPropuesta2da || 'Por confirmar'}</strong>.
                          {motivo2da && <span style={{ display: 'block', marginTop: '4px' }}>Motivo: <em>"{motivo2da}"</em></span>}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button 
                            type="button"
                            onClick={() => handleResponderSegundaVisita('aceptar', fechaPropuesta2da || new Date().toISOString().slice(0,10))}
                            disabled={submitting2da}
                            style={{ flex: 1, minWidth: '180px', background: '#16a34a', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '12px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}
                          >
                            <CheckCircle size={18} />
                            <span>ACEPTAR FECHA PROPUESTA</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => setShowModalReprogramar2da(true)}
                            disabled={submitting2da}
                            style={{ flex: 1, minWidth: '180px', background: '#ea580c', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '12px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(234,88,12,0.25)' }}
                          >
                            <Calendar size={18} />
                            <span>ELEGIR OTRA FECHA</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 1. TARJETA CONSISTE EN: */}
                    <div className="tp-card tp-work-description-card" style={{ margin: 0, marginBottom: '20px' }}>
                      <div className="tp-card-header">
                        <FileText size={20} />
                        <h3>CONSISTE EN:</h3>
                      </div>

                      <div className="tp-work-description-v2">
                        <div className="tp-description-grid">
                          <div className="tp-desc-item">
                            <div className="tp-desc-icon problem">
                              <AlertTriangle size={20} />
                            </div>
                            <div className="tp-desc-text">
                              <label>TIPO DE FALLA / PROBLEMA</label>
                              <strong>{problema}</strong>
                            </div>
                          </div>

                          <div className="tp-desc-item">
                            <div className="tp-desc-icon equipment">
                              <Zap size={20} />
                            </div>
                            <div className="tp-desc-text">
                              <label>EQUIPO O COMPONENTE AFECTADO</label>
                              <strong>{equipo}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="tp-work-meta">
                        <div className="tp-meta-item">
                          <Clock size={16} />
                          <span>Programado: {activeTask.fecha || activeTask.scheduled_at || 'Pendiente'}</span>
                        </div>
                        <div className="tp-meta-item">
                          <Wrench size={16} />
                          <span>Título: {activeTask.producto || activeTask.title || 'Servicio'}</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. TARJETA DATOS DEL CLIENTE */}
                    <div className="tp-card tp-client-card" style={{ margin: 0, marginBottom: '20px' }}>
                      <div className="tp-card-header">
                        <User size={20} />
                        <h3>DATOS DEL CLIENTE</h3>
                      </div>
                      <div className="tp-client-info">
                        <p><strong>Nombre:</strong> {datosPropiedad.personaCargo || 'Cliente no asignado'}</p>
                        <p><strong>Teléfono:</strong> {datosPropiedad.telefono || 'No registrado'}</p>
                        <p><strong>Tipo:</strong> {datosPropiedad.tipoPropiedad || 'CASA'}</p>
                      </div>
                    </div>

                    {/* FOTOS DE EVIDENCIAS DIRECTAS DEBAJO DE DATOS DEL CLIENTE */}
                    <div className="tp-card tp-evidence-card" style={{ margin: 0, marginBottom: '20px' }}>
                      <div className="tp-card-header">
                        <ImageIcon size={20} />
                        <h3>EVIDENCIAS REGISTRADAS</h3>
                      </div>
                      <div className="tp-evidence-content" style={{ marginTop: '12px' }}>
                        {activeTask.evidencias && activeTask.evidencias.length > 0 ? (
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {activeTask.evidencias.map((img, imgIdx) => (
                              <img 
                                key={imgIdx} 
                                src={img} 
                                alt={`Evidencia ${imgIdx + 1}`} 
                                onClick={() => setImagenAmpliada(img)}
                                style={{ width: '135px', height: '100px', objectFit: 'cover', borderRadius: '12px', cursor: 'pointer', border: '2px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }} 
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                              />
                            ))}
                          </div>
                        ) : (
                          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>No hay evidencias fotográficas registradas aún.</p>
                        )}
                      </div>
                    </div>

                    {/* 3. TARJETA EQUIPO DE TRABAJO */}
                    <div className="tp-card tp-team-card" style={{ margin: 0, marginBottom: '20px' }}>
                      <div className="tp-card-header">
                        <User size={20} />
                        <h3>EQUIPO DE TRABAJO</h3>
                      </div>
                      <div className="tp-team-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#e2e2e2', padding: '12px 16px', borderRadius: '12px' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#d1d1d1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <User size={24} color="#000" />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 'bold', color: '#333', fontSize: '0.95rem' }}>{activeTask.tecnico || 'Sin asignar'}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#666' }}>ID: {activeTask.tecnico_id || '60'} | ÁREA: TÉCNICO</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BOTÓN: VER REPORTE DEL TRABAJO */}
                    <div style={{ marginBottom: '15px' }}>
                      <button 
                        onClick={() => {
                          const paramId = activeTask.tipo_registro === 'work_order' 
                            ? `work_order-${activeTask.realId}` 
                            : `servicio-${activeTask.realId || activeTask.id}`;
                          navigate(`/reporte-trabajo-admin/${paramId}`);
                        }}
                        style={{ 
                          width: '100%', 
                          background: '#3b82f6', 
                          color: 'white', 
                          padding: '14px', 
                          borderRadius: '14px', 
                          border: 'none', 
                          fontWeight: '800', 
                          fontSize: '0.95rem',
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          gap: '10px', 
                          cursor: 'pointer', 
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                          textTransform: 'uppercase'
                        }}
                      >
                        <FileText size={20} />
                        <span>Ver Reporte de este trabajo</span>
                      </button>
                    </div>

                    {/* BOTÓN PROGRAMACIÓN DIRECTA POR ROOT/ADMIN */}
                    {(user?.role_id === 0 || user?.role_id === 1) && (
                      <div style={{ marginBottom: '25px' }}>
                        <button 
                          type="button"
                          onClick={() => setShowModalAdmin2daVisita(true)}
                          style={{ 
                            width: '100%', 
                            background: '#ea580c', 
                            color: 'white', 
                            padding: '14px', 
                            borderRadius: '14px', 
                            border: 'none', 
                            fontWeight: '800', 
                            fontSize: '0.9rem',
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            gap: '10px', 
                            cursor: 'pointer', 
                            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
                            textTransform: 'uppercase'
                          }}
                        >
                          <Calendar size={20} />
                          <span>Programar Segunda Visita Directa (Admin)</span>
                        </button>
                      </div>
                    )}

              <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#1e293b' }}>
                <ImageIcon size={20} /> PASOS REALIZADOS EN EL TRABAJO
              </h4>

              {cargandoReportes ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Loader2 className="animate-spin" size={40} color="#f26624" />
                  <p style={{ marginTop: '10px', fontWeight: 'bold' }}>Cargando bitácora...</p>
                </div>
              ) : reportesDetallados.length > 0 ? (
                <div className="work-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {reportesDetallados.map((rep, idx) => (
                    <div key={rep.id} className="timeline-step" style={{ display: 'flex', gap: '20px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '15px', borderLeft: '5px solid #f26624' }}>
                      <div className="step-number" style={{ background: '#1e293b', color: 'white', minWidth: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                         <span style={{ margin: 'auto' }}>{idx + 1}</span>
                      </div>
                      <div className="step-content" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <h5 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{rep.title || `Avance ${idx + 1}`}</h5>
                          <span style={{ fontSize: '12px', color: '#64748b' }}><Clock size={12}/> {new Date(rep.created_at).toLocaleString()}</span>
                        </div>
                        <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.5, marginBottom: '15px' }}>{rep.description}</p>
                        
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {(rep.image_url || rep.image_path) && (
                            <img 
                              src={rep.image_url || rep.image_path} 
                              alt="evidencia" 
                              onClick={() => setImagenAmpliada(rep.image_url || rep.image_path)}
                              style={{ width: '150px', height: '110px', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer', border: '2px solid #e2e8f0' }} 
                            />
                          )}
                          {rep.galleries && rep.galleries.map((gal, gIdx) => (
                            <img 
                              key={gIdx}
                              src={gal.image_path} 
                              alt="extra" 
                              onClick={() => setImagenAmpliada(gal.image_path)}
                              style={{ width: '150px', height: '110px', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer', border: '2px solid #e2e8f0' }} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f1f5f9', borderRadius: '15px' }}>
                  <p style={{ margin: 0, color: '#64748b', fontStyle: 'italic' }}>El técnico no registró pasos detallados para este servicio.</p>
                </div>
              )}
            </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHAT */}
      {isModalChatOpen && chatCotizacion && (
        <div className="modal-overlay-ui" onClick={() => setIsModalChatOpen(false)}>
          <div className="modal-card-ui report-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', width: '90%', borderRadius: '20px', overflow: 'hidden' }}>
            <div className="modal-header-premium" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '20px 25px' }}>
              <div className="header-content" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="icon-badge-white" style={{ backgroundColor: 'white', color: '#f26624', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 style={{ color: 'white', margin: 0 }}>Chat con Cliente</h3>
                  <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Cotización #{chatCotizacion.id} – {chatCotizacion.producto}</span>
                </div>
              </div>
              <button className="btn-close-light" onClick={() => setIsModalChatOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20}/></button>
            </div>
            
            <div className="modal-body modern-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px', maxHeight: '60vh' }}>
              {/* Contenedor de mensajes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '350px', paddingRight: '5px' }}>
                {(chatCotizacion.chat_history || chatCotizacion.raw?.chat_history || []).length > 0 ? (
                  (chatCotizacion.chat_history || chatCotizacion.raw?.chat_history || []).map((msg, index) => {
                    const esMio = msg.sender_id === usuarioId;
                    const bgColor = esMio ? '#e0f2fe' : '#f1f5f9';
                    const align = esMio ? 'flex-end' : 'flex-start';
                    const textAlign = esMio ? 'right' : 'left';
                    const colorName = msg.sender_role === 'Cliente' ? '#0ea5e9' : (msg.sender_role === 'Admin' ? '#16a34a' : '#f59e0b');

                    return (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: align, width: '100%' }}>
                        <span style={{ fontSize: '0.7rem', color: colorName, fontWeight: 'bold', marginBottom: '2px' }}>
                          {msg.sender_name} ({msg.sender_role})
                        </span>
                        <div style={{ 
                          background: bgColor, 
                          padding: '10px 14px', 
                          borderRadius: '12px', 
                          maxWidth: '85%', 
                          color: '#334155', 
                          fontSize: '0.9rem', 
                          textAlign: textAlign,
                          borderBottomRightRadius: esMio ? '2px' : '12px',
                          borderBottomLeftRadius: !esMio ? '2px' : '12px'
                        }}>
                          {msg.message}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                          {new Date(msg.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', margin: '30px 0' }}>No hay mensajes en esta cotización.</p>
                )}
              </div>

              {/* Input y Botón de envío */}
              <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                <input 
                  type="text" 
                  placeholder="Escribe un mensaje para negociar o aclarar dudas..." 
                  style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  value={mensajeChat}
                  onChange={e => setMensajeChat(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') enviarMensajeChatModal(); }}
                  disabled={enviandoMensaje}
                />
                <button 
                  style={{ 
                    background: '#3b82f6', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0 20px', 
                    borderRadius: '20px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer', 
                    opacity: enviandoMensaje || !mensajeChat.trim() ? 0.5 : 1 
                  }}
                  onClick={enviarMensajeChatModal}
                  disabled={enviandoMensaje || !mensajeChat.trim()}
                >
                  {enviandoMensaje ? '...' : 'ENVIAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE COTIZACIÓN */}
      {isModalCotizacionDetailOpen && cotizacionDetail && (() => {
        const cotRaw = cotizacionDetail.raw || cotizacionDetail;
        const renderConceptoDetalle = (conceptoStr) => {
          try {
            const detalle = typeof conceptoStr === 'string' ? JSON.parse(conceptoStr) : conceptoStr;
            
            if (detalle && typeof detalle === 'object' && (detalle.conceptos || detalle.servicios || detalle.materiales || detalle.herramientas_basicas || detalle.seccionesLote)) {
              return (
                <div className="detalle-parseado">
                  {/* Conceptos / Servicios */}
                  {(detalle.conceptos || detalle.servicios) && (detalle.conceptos || detalle.servicios).some(c => c.descripcion) && (
                    <div className="detalle-seccion">
                      <h4 style={{ color: '#ff8800', borderBottom: '1px solid #ff8800', paddingBottom: '5px', marginBottom: '10px' }}>Servicios / Conceptos</h4>
                      <table className="modal-items-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #ff8800', textAlign: 'left', backgroundColor: '#fff7ed' }}>
                            <th style={{ padding: '10px' }}>Descripción</th>
                            <th style={{ textAlign: 'center', padding: '10px' }}>Cant.</th>
                            <th style={{ textAlign: 'right', padding: '10px' }}>Precio U.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detalle.conceptos || detalle.servicios).filter(c => c.descripcion).map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px' }}>{c.descripcion}</td>
                              <td style={{ textAlign: 'center', padding: '10px' }}>{c.cantidad || 1}</td>
                              <td style={{ textAlign: 'right', padding: '10px' }}>${parseFloat(c.precio_u || c.precio || 0).toLocaleString('es-MX')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Materiales */}
                  {detalle.materiales && detalle.materiales.some(m => m.nombre || m.descripcion) && (
                    <div className="detalle-seccion" style={{ marginTop: '15px' }}>
                      <h4 style={{ color: '#ff8800', borderBottom: '1px solid #ff8800', paddingBottom: '5px', marginBottom: '10px' }}>Materiales</h4>
                      <table className="modal-items-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #ff8800', textAlign: 'left', backgroundColor: '#fff7ed' }}>
                            <th style={{ padding: '10px' }}>Nombre</th>
                            <th style={{ textAlign: 'center', padding: '10px' }}>Cant.</th>
                            <th style={{ textAlign: 'right', padding: '10px' }}>Costo U.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalle.materiales.filter(m => m.nombre || m.descripcion).map((m, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px' }}>{m.nombre || m.descripcion}</td>
                              <td style={{ textAlign: 'center', padding: '10px' }}>{m.cantidad || 1}</td>
                              <td style={{ textAlign: 'right', padding: '10px' }}>${parseFloat(m.costo_u || m.precio || 0).toLocaleString('es-MX')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            }
          } catch (e) {
            console.log("No es un JSON de detalle, se muestra como texto.");
          }

          // Fallback si no es el JSON estructurado de técnico
          if (cotizacionDetail.items && cotizacionDetail.items.length > 0) {
            return (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ color: '#ff8800', borderBottom: '1px solid #ff8800', paddingBottom: '5px', marginBottom: '10px' }}>Servicios / Conceptos</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ff8800', textAlign: 'left', backgroundColor: '#fff7ed' }}>
                      <th style={{ padding: '10px' }}>Concepto</th>
                      <th style={{ textAlign: 'center', padding: '10px' }}>Cantidad</th>
                      <th style={{ textAlign: 'right', padding: '10px' }}>Precio</th>
                      <th style={{ textAlign: 'right', padding: '10px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizacionDetail.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px' }}>{item.concepto || item.descripcion}</td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>{item.cantidad || 1}</td>
                        <td style={{ textAlign: 'right', padding: '10px' }}>${Number(item.precio || item.precio_u || 0).toLocaleString('es-MX')}</td>
                        <td style={{ textAlign: 'right', padding: '10px' }}>${(Number(item.cantidad || 1) * Number(item.precio || item.precio_u || 0)).toLocaleString('es-MX')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return (
            <table className="modal-items-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ff8800', textAlign: 'left', backgroundColor: '#fff7ed' }}>
                  <th style={{ padding: '10px' }}>Descripción</th>
                  <th style={{ textAlign: 'right', padding: '10px' }}>Total Estimado</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>{typeof conceptoStr === 'object' ? (JSON.stringify(conceptoStr, null, 2) || 'Cotización') : (conceptoStr || (typeof cotRaw.concept === 'object' ? JSON.stringify(cotRaw.concept, null, 2) : cotRaw.concept) || cotizacionDetail.producto)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '10px' }}>
                    ${parseFloat(cotRaw.total || 0).toLocaleString('es-MX')}
                  </td>
                </tr>
              </tbody>
            </table>
          );
        };

        const handleImprimirPDFLocal = () => {
          localStorage.setItem('cotizacion_para_imprimir', JSON.stringify(cotRaw));
          window.open('/imprimir-cotizacion', '_blank'); 
        };

        return (
          <div className="modal-overlay-ui" onClick={() => setIsModalCotizacionDetailOpen(false)}>
            <div className="modal-card-ui invoice-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', width: '90%', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div className="modal-header-premium" style={{ backgroundColor: '#1e293b', color: 'white', padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-content" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div className="icon-badge-white" style={{ backgroundColor: 'white', color: '#f26624', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>DETALLE DE COTIZACIÓN #{cotRaw.folio || cotRaw.id}</h3>
                    <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{cotizacionDetail.producto}</span>
                  </div>
                </div>
                <button className="btn-close-light" onClick={() => setIsModalCotizacionDetailOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24}/></button>
              </div>

              <div className="modal-body modern-body" style={{ padding: '30px', maxHeight: '75vh', overflowY: 'auto' }}>
                
                {cotRaw.tecnico && (
                  <div style={{ background: '#f8fafc', padding: '16px', raw: '12px', borderLeft: '4px solid #f26624', marginBottom: '20px' }}>
                    <p style={{ margin: 0, fontSize: '1rem', color: '#334155', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🛠️ {cotRaw.created_by_role === 'Técnico' ? 'Propuesta técnica enviada al Administrador' : 'Cotización oficial para el Cliente'}
                    </p>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                      Propiedad: {cotRaw.propiedad_nombre || datosPropiedad.nombre_propiedad || 'Sin nombre'}
                    </p>
                  </div>
                )}

                <div className="modal-info-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', background: '#f1f5f9', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Cliente</label>
                    <p style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: '600' }}>{cotRaw.cliente || datosPropiedad.personaCargo || 'Cliente'}</p>
                  </div>
                  {cotRaw.tecnico && (
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Técnico</label>
                      <p style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: '600' }}>{cotRaw.tecnico}</p>
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Fecha</label>
                    <p style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: '600' }}>{cotRaw.fecha || cotizacionDetail.fecha}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Estado</label>
                    <p style={{ margin: 0, fontSize: '1.05rem', color: '#f26624', fontWeight: 'bold' }}>{cotRaw.status || cotizacionDetail.status}</p>
                  </div>
                </div>

                {cotRaw.type === 'archivo' ? (
                  <div style={{ position: 'relative', background: '#f8fafc', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', border: '1px solid #e2e8f0' }}>
                    {cotRaw.archivo_url ? (
                      cotRaw.archivo_url.endsWith('.pdf') ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 0' }}>
                          <span style={{ fontSize: '4rem', marginBottom: '15px' }}>📄</span>
                          <p style={{ fontWeight: 'bold', color: '#334155', marginBottom: '20px', fontSize: '1.1rem' }}>Documento PDF Adjunto</p>
                          <button 
                            onClick={() => window.open(cotRaw.archivo_url, '_blank')}
                            style={{ background: '#f26624', color: 'white', padding: '12px 30px', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(242, 102, 36, 0.3)' }}
                          >
                            ABRIR PDF ADJUNTO
                          </button>
                        </div>
                      ) : (
                        <img 
                          src={cotRaw.archivo_url} 
                          alt="Cotización" 
                          style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                        />
                      )
                    ) : (
                      <p style={{ color: '#ef4444', padding: '30px', fontWeight: 'bold' }}>El archivo no se encuentra disponible.</p>
                    )}
                  </div>
                ) : (
                  renderConceptoDetalle(cotRaw.concept)
                )}

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginTop: '25px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b', fontWeight: 'bold' }}>TOTAL ESTIMADO:</h3>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#f26624', fontWeight: 'bold' }}>${parseFloat(cotRaw.total || 0).toLocaleString('es-MX')}</h3>
                </div>

                {cotRaw.observations && (
                  <div style={{ padding: '16px', background: '#fff7ed', borderRadius: '12px', marginTop: '20px', borderLeft: '4px solid #f26624' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#9a3412', fontWeight: 'bold' }}>Mensajes al Cliente:</h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#431407', whiteSpace: 'pre-wrap' }}>
                      {cotRaw.observations}
                    </p>
                  </div>
                )}

                {cotRaw.internal_observations && (
                  <div style={{ padding: '16px', background: '#fef9c3', borderRadius: '12px', marginTop: '20px', borderLeft: '4px solid #eab308' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#854d0e', fontWeight: 'bold' }}>Comentarios Internos:</h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#422006', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                      {cotRaw.internal_observations}
                    </p>
                  </div>
                )}

                {/* --- SECCIÓN DE COMPROBANTE DE PAGO --- */}
                {cotRaw.payment_receipt_path && (
                  <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '12px', marginTop: '20px', borderLeft: '4px solid #fbbf24', border: '1px solid #fef3c7' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#b45309', fontWeight: 'bold' }}>🧾 Comprobante de Pago ({cotRaw.payment_status || 'En Revisión'}):</h4>
                    <div style={{ textAlign: 'center' }}>
                      <img 
                        src={cotRaw.payment_receipt_path} 
                        alt="Comprobante de Pago" 
                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'pointer', objectFit: 'contain', border: '1px solid #fcd34d' }} 
                        onClick={() => setImagenAmpliada(cotRaw.payment_receipt_path)}
                      />
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '5px 0 10px 0' }}>Click para ampliar</p>
                      
                      {(cotRaw.status === 'Pago en Revisión' || cotRaw.payment_status === 'Pago en Revisión') && (
                        <button 
                          onClick={handleValidarPagoDetail}
                          disabled={enviandoMensaje}
                          style={{ 
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                            color: 'white', border: 'none', padding: '12px 25px', borderRadius: '25px', 
                            fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
                            margin: '10px auto 0', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)', transition: 'all 0.2s' 
                          }}
                        >
                          <CheckCircle size={20} /> 
                          {enviandoMensaje ? 'VALIDANDO...' : 'VALIDAR PAGO'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* --- SECCIÓN DE CHAT DE NEGOCIACIÓN --- */}
                <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageCircle size={18} color="#f26624" /> Conversación de la Cotización
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                    {(cotRaw.chat_history || cotRaw.raw?.chat_history || []).length > 0 ? (
                      (cotRaw.chat_history || cotRaw.raw?.chat_history || []).map((msg, index) => {
                        const esMio = msg.sender_id === usuarioId;
                        const bgColor = esMio ? '#e0f2fe' : '#f1f5f9';
                        const align = esMio ? 'flex-end' : 'flex-start';
                        const textAlign = esMio ? 'right' : 'left';
                        const colorName = msg.sender_role === 'Cliente' ? '#0ea5e9' : (msg.sender_role === 'Admin' ? '#16a34a' : '#f59e0b');

                        return (
                          <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: align, width: '100%' }}>
                            <span style={{ fontSize: '0.7rem', color: colorName, fontWeight: 'bold', marginBottom: '2px' }}>
                              {msg.sender_name} ({msg.sender_role})
                            </span>
                            <div style={{ 
                              background: bgColor, 
                              padding: '10px 14px', 
                              borderRadius: '12px', 
                              maxWidth: '85%', 
                              color: '#334155', 
                              fontSize: '0.9rem', 
                              textAlign: textAlign,
                              borderBottomRightRadius: esMio ? '2px' : '12px',
                              borderBottomLeftRadius: !esMio ? '2px' : '12px'
                            }}>
                              {msg.message}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                              {new Date(msg.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', margin: '20px 0' }}>No hay mensajes en esta cotización.</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      placeholder="Escribe un mensaje para negociar o aclarar dudas..." 
                      style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                      value={mensajeChat}
                      onChange={e => setMensajeChat(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') enviarMensajeChatDetail(); }}
                      disabled={enviandoMensaje}
                    />
                    <button 
                      style={{ 
                        background: '#3b82f6', 
                        color: 'white', 
                        border: 'none', 
                        padding: '0 20px', 
                        borderRadius: '20px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer', 
                        opacity: enviandoMensaje || !mensajeChat.trim() ? 0.5 : 1 
                      }}
                      onClick={enviarMensajeChatDetail}
                      disabled={enviandoMensaje || !mensajeChat.trim()}
                    >
                      {enviandoMensaje ? '...' : 'ENVIAR'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                  {cotRaw.type !== 'archivo' && (
                    <button 
                      onClick={handleImprimirPDFLocal}
                      style={{ flex: 1, background: '#f26624', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(242, 102, 36, 0.25)' }}
                    >
                      <FileText size={20} /> VER PDF
                    </button>
                  )}
                  {(() => {
                    const cotHija = cotizaciones.find(c => String(c.parent_id) === String(cotRaw.id));
                    if (cotHija) {
                      return (
                        <button 
                          onClick={() => {
                            setCotizacionDetail(cotHija);
                          }}
                          style={{ flex: 1, background: '#3b82f6', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                        >
                          👁️ VER COTIZACIÓN NUEVA O ACTUALIZADA
                        </button>
                      );
                    } else {
                      return (
                        <button 
                          onClick={() => {
                            setCotizacionParaAsignar({ ...cotRaw, isDerived: true });
                            setIsModalCotizacionDetailOpen(false);
                            setShowCreateModal(true);
                          }}
                          style={{ flex: 1, background: '#3b82f6', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                        >
                          ➕ GENERAR COTIZACIÓN DERIVADA
                        </button>
                      );
                    }
                  })()}
                  <button 
                    onClick={() => setIsModalCotizacionDetailOpen(false)}
                    style={{ flex: 1, background: '#1e293b', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    CERRAR
                  </button>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX PARA IMAGEN AMPLIADA */}
      {imagenAmpliada && (
        <div 
          onClick={() => setImagenAmpliada(null)}
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, 
            display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' 
          }}
        >
          <img 
            src={imagenAmpliada} 
            alt="Zoom" 
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} 
          />
          <button 
             onClick={() => setImagenAmpliada(null)} 
             style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
             <X size={40} />
          </button>
        </div>
      )}

      {/* MODAL PLANIFICAR TRABAJO / ASIGNAR TÉCNICO */}
      {cotizacionSeleccionada && (
        <div className="modal-overlay-ui" onClick={() => setCotizacionSeleccionada(null)}>
          <div className="modal-card-ui planning-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', width: '90%', padding: '25px', borderRadius: '20px', background: 'white' }}>
            <div className="modal-header-premium" style={{ background: cotizacionSeleccionada.esEmergencia ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #f26624 0%, #ff8c52 100%)', padding: '20px', borderRadius: '15px 15px 0 0', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="header-content" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="icon-badge-white" style={{ background: 'white', color: cotizacionSeleccionada.esEmergencia ? '#ef4444' : '#f26624', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{cotizacionSeleccionada.esEmergencia ? "ASIGNAR SOS" : "Planificar Trabajo"}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>{cotizacionSeleccionada.producto}</span>
                </div>
              </div>
              <button className="btn-close-light" onClick={() => setCotizacionSeleccionada(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20}/></button>
            </div>
            <form className="modern-form" onSubmit={asignarTecnicoFinal} style={{ padding: '20px 0 0 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label style={{ fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'block' }}>Técnico Responsable</label>
                <select required value={formPlanificacion.tecnico} onChange={(e) => setFormPlanificacion({...formPlanificacion, tecnico: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}>
                  <option value="">Seleccionar técnico...</option>
                  {listaTecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="input-row" style={{ display: 'flex', gap: '15px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label style={{ fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'block' }}>Fecha Inicio</label>
                  <input 
                    type="date" 
                    value={formPlanificacion.fecha} 
                    onChange={(e) => setFormPlanificacion({...formPlanificacion, fecha: e.target.value})} 
                    required 
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label style={{ fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'block' }}>Prioridad</label>
                  <select value={formPlanificacion.prioridad} onChange={(e) => setFormPlanificacion({...formPlanificacion, prioridad: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}>
                    <option value="SOS">SOS</option>
                    <option value="ALTA">ALTA</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="BAJA">BAJA</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'block' }}>Descripción del trabajo (visible para el técnico)</label>
                <textarea
                  rows="3"
                  placeholder="Describe detalladamente lo que debe hacer el técnico…"
                  value={formPlanificacion.descripcionTrabajo}
                  onChange={(e) => setFormPlanificacion({ ...formPlanificacion, descripcionTrabajo: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setCotizacionSeleccionada(null)} style={{ padding: '12px 24px', borderRadius: '25px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '12px 24px', borderRadius: '25px', border: 'none', background: cotizacionSeleccionada.esEmergencia ? '#ef4444' : '#f26624', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(242,102,36,0.3)' }}>CONFIRMAR ASIGNACIÓN</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL REPROGRAMAR 2DA VISITA POR CLIENTE */}
      {showModalReprogramar2da && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '22px', padding: '28px', width: '100%', maxWidth: '480px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <button onClick={() => setShowModalReprogramar2da(false)} style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={24} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{ background: '#fff7ed', padding: '10px', borderRadius: '14px', border: '1px solid #ffedd5' }}>
                <Calendar size={26} color="#ea580c" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>PROPONER NUEVA FECHA</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Elige el día y hora que mejor te acomode</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleResponderSegundaVisita('reprogramar', fecha2daCliente); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                  NUEVA FECHA Y HORA <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input 
                  type="datetime-local"
                  value={fecha2daCliente}
                  onChange={(e) => setFecha2daCliente(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModalReprogramar2da(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  CANCELAR
                </button>
                <button type="submit" disabled={submitting2da} style={{ flex: 1, padding: '12px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: submitting2da ? 'not-allowed' : 'pointer', opacity: submitting2da ? 0.7 : 1, textTransform: 'uppercase' }}>
                  {submitting2da ? 'GUARDANDO...' : 'CONFIRMAR FECHA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PROGRAMAR 2DA VISITA DIRECTA POR ADMIN */}
      {showModalAdmin2daVisita && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '22px', padding: '28px', width: '100%', maxWidth: '520px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <button onClick={() => setShowModalAdmin2daVisita(false)} style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={24} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{ background: '#fff7ed', padding: '12px', borderRadius: '16px', border: '1px solid #ffedd5' }}>
                <Calendar size={28} color="#ea580c" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>PROGRAMAR 2DA VISITA DIRECTA</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Aviso o acuerdo directo con el cliente</p>
              </div>
            </div>

            <form onSubmit={handleAdminProgramarSegundaVisita} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                  FECHA Y HORA DE LA 2DA VISITA <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input 
                  type="datetime-local" 
                  value={fecha2daAdmin}
                  onChange={(e) => setFecha2daAdmin(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                  TÉCNICO ASIGNADO (OPCIONAL)
                </label>
                <select
                  value={tecnico2daAdmin}
                  onChange={(e) => setTecnico2daAdmin(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', background: '#ffffff' }}
                >
                  <option value="">Mantener técnico asignado actual</option>
                  {(listaTecnicos || []).map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.first_name || `Técnico #${t.id}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                  OBSERVACIONES DE LA 2DA VISITA
                </label>
                <textarea 
                  rows={3}
                  value={obs2daAdmin}
                  onChange={(e) => setObs2daAdmin(e.target.value)}
                  placeholder="Ej. Solicitado directamente por el cliente por llamada..."
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModalAdmin2daVisita(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  CANCELAR
                </button>
                <button type="submit" disabled={submitting2da} style={{ flex: 1, padding: '12px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: submitting2da ? 'not-allowed' : 'pointer', opacity: submitting2da ? 0.7 : 1, textTransform: 'uppercase' }}>
                  {submitting2da ? 'PROGRAMANDO...' : 'PROGRAMAR 2DA VISITA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    {showCreateModal && (
      <CreateQuotationModal 
        prefillData={cotizacionParaAsignar}
        onClose={() => {
          setShowCreateModal(false);
          setCotizacionParaAsignar(null);
        }}
        onSuccess={() => {
          setShowCreateModal(false);
          setCotizacionParaAsignar(null);
          // fetch data again
          // since fetchDashboardData isn't exposed globally we might just refresh
          window.location.reload();
        }}
      />
    )}
    </div>
  );
};

export default DetallePropiedad;
