import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import "../../../styles/AgenteMarket/Admin/VistaCotizaciones.css";
import "../../../styles/AgenteMarket/Tecnico/MercadoTrabajosBase.css";
import "../../../styles/Shared/ToolbarAcciones.css";
import Header from "../../../components/Shared/Header";
import CasaLoader from "../../../components/Shared/CasaLoader";
import AssignWorkModal from "../../../components/Modals/AssignWorkModal";
import { 
  Plus, Search, Filter, Calendar, 
  ArrowUpDown, FileText, Upload, 
  MoreVertical, Eye, CheckCircle, 
  XCircle, Clock, ChevronDown, ChevronRight,
  User, Wrench, Truck, Layout, Home, Phone, MapPin, ShoppingCart, RefreshCw,
  MessageCircle, Maximize2, Image as ImageIcon, Send,
  X, Globe, Briefcase, CalendarDays, CheckCircle2
} from 'lucide-react';
import CreateQuotationModal from "../../../components/Modals/CreateQuotationModal";
import ModalCrearCotizacion from "../../../components/Shared/ModalCrearCotizacion";
import ModalConfirmarPagoEfectivo from "../../../components/Modals/ModalConfirmarPagoEfectivo";
import UniversalSearch from "../../../components/Shared/UniversalSearch";
import Pago from "../Cliente/Pago";
import mpLogo from "../../../assets/Mercado-Pago.png";
import { mostrarAviso, confirmarAccion } from '../../../utils/dialogos';

// Repara texto UTF-8 que llegó leído como Latin-1 ("TÃ©cnico" → "Técnico")
const arreglarTexto = (texto) => {
  if (typeof texto !== 'string' || !/Ã|Â/.test(texto)) return texto;
  try {
    return decodeURIComponent(escape(texto));
  } catch {
    return texto;
  }
};

const VistaCotizaciones = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [cotizacionParaAsignar, setCotizacionParaAsignar] = useState(null);
  const [cotizacionParaEditarTecnico, setCotizacionParaEditarTecnico] = useState(null);
  const [modalConfirmarEfectivoVisible, setModalConfirmarEfectivoVisible] = useState(false);
  const [cotizacionEfectivoParaConfirmar, setCotizacionEfectivoParaConfirmar] = useState(null);

  const [carritoCotizaciones, setCarritoCotizaciones] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');
    } catch {
      return [];
    }
  });

  const isCotizacionEnCarrito = (cot) => {
    if (!cot) return false;
    return carritoCotizaciones.some(item => 
      String(item.id) === String(cot.id) || 
      (cot.folio && String(item.folio) === String(cot.folio))
    );
  };

  // Aceptar cotización y mandarla automáticamente al carrito (CotizacionesPendientes)
  const handleAceptarYEnviarAlCarrito = async (cot, e) => {
    if (e) e.stopPropagation();
    if (!cot) return;

    if (cot.status === 'Rechazado') {
      if (!await confirmarAccion('¿Deseas aceptar esta cotización que habías rechazado?')) {
        return;
      }
    }

    const carritoGuardado = JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');
    const yaExiste = carritoGuardado.some(item => String(item.id) === String(cot.id) || String(item.folio) === String(cot.folio));

    let conceptoTexto = 'Servicio registrado en espera.';
    if (cot.concept) {
      if (typeof cot.concept === 'string') {
        try {
          const parsed = JSON.parse(cot.concept);
          if (parsed && parsed.conceptos) {
            conceptoTexto = parsed.conceptos.map(x => x.descripcion || x.titulo || 'Servicio').join(', ');
          } else {
            conceptoTexto = cot.concept;
          }
        } catch {
          conceptoTexto = cot.concept;
        }
      } else if (typeof cot.concept === 'object' && cot.concept.conceptos) {
        conceptoTexto = cot.concept.conceptos.map(x => x.descripcion || x.titulo || 'Servicio').join(', ');
      }
    }

    const fechaOriginal = cot.fecha || cot.created_at || new Date().toISOString().split('T')[0];

    const nuevoItemCarrito = {
      id: cot.id || Date.now(),
      titulo: cot.propiedad_nombre || cot.cliente || cot.producto || `Cotización #${cot.id}`,
      folio: cot.folio || `COT-${cot.id}`,
      fecha: fechaOriginal,
      total: Number(cot.total || cot.total_amount || 0),
      estado: 'Pendiente de aprobación',
      descripcion: cot.observations || conceptoTexto,
      vencida: false,
      diasRestantes: 15
    };

    if (!yaExiste) {
      const nuevoCarrito = [nuevoItemCarrito, ...carritoGuardado];
      localStorage.setItem('carrito_cotizaciones', JSON.stringify(nuevoCarrito));
      setCarritoCotizaciones(nuevoCarrito);
    }

    // Actualizar estado en backend a 'Aprobado'
    try {
      setProcesando(true);
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cot.id}/status`, { status: 'Aprobado' });
      cargarCotizaciones();
    } catch (err) {
      console.warn("Error actualizando estado a Aprobado:", err);
    } finally {
      setProcesando(false);
    }

    setCotizacionSeleccionada(null);
    navigate('/cotizaciones-pendientes');
  };

  // Enviar cotización / servicio a la vista Carrito (CotizacionesPendientes)
  const handleMandarAlCarrito = (cot, e) => {
    handleAceptarYEnviarAlCarrito(cot, e);
  };
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [filtro, setFiltro] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);

  const [esCliente, setEsCliente] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const [rechazando, setRechazando] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [imagenModal, setImagenModal] = useState(null);

  // --- NUEVOS ESTADOS ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ordenMonto, setOrdenMonto] = useState(null); // 'asc' | 'desc' | null
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'manual' | 'archivo'
  const [filtroOrigen, setFiltroOrigen] = useState('todos'); // 'todos' | 'admin' | 'tecnicos' | 'proveedores'
  const [cotizacionesFiltradas, setCotizacionesFiltradas] = useState([]);
  const [esTecnico, setEsTecnico] = useState(false);

  const [propiedadCotizKey, setPropiedadCotizKey] = useState(null);

  // MENÚ DE FILTROS JUNTO AL BUSCADOR (estado, origen, tipo y orden por monto)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const filtrosRef = useRef(null);

  useEffect(() => {
    if (!filtrosAbiertos) return;
    const handleClickOutside = (e) => {
      if (filtrosRef.current && !filtrosRef.current.contains(e.target)) {
        setFiltrosAbiertos(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [filtrosAbiertos]);

  const [mensajeChat, setMensajeChat] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
      if (session?.userData) {
        setUsuarioId(session.userData.id || null);
        if (session.userData.role_id === 3) {
          setEsCliente(true);
        }
        if (session.userData.role_id === 2 || session.userData.role_id === 8) {
          setEsTecnico(true);
        }
      }
    } catch(e) {}
    cargarCotizaciones();
  }, []);

  useEffect(() => {
    if (cotizaciones && cotizaciones.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      const quoteIdParam = searchParams.get('quote_id') || searchParams.get('quoteId');
      const paymentStatus = searchParams.get('payment_status');
      const collectionStatus = searchParams.get('collection_status') || searchParams.get('status');
      const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
      const stageParam = searchParams.get('stage') || 'full';

      if (paymentStatus) {
        if (paymentStatus === 'success' && quoteIdParam) {
          if (collectionStatus === 'rejected' || collectionStatus === 'cancelled') {
            mostrarAviso('La transacción fue cancelada o rechazada. No se ha cobrado ningún monto.');
          } else {
            axios.post(`${import.meta.env.VITE_API_BASE_URL}/mercadopago/verify`, { 
              quote_id: quoteIdParam,
              payment_id: paymentId,
              stage: stageParam
            })
              .then(res => {
                if (res.data.status === 'success') {
                  cargarCotizaciones();
                  setFiltro('Pagadas');
                  mostrarAviso('¡Tu pago fue validado y procesado con éxito a través de MercadoPago!');
                } else {
                  mostrarAviso('El pago no se detectó o está en proceso de validación. Si lo completaste, se actualizará en breve.');
                }
              }).catch(err => {
                console.error(err);
              });
          }
        } else if (paymentStatus === 'failure') {
          mostrarAviso('El pago no pudo ser procesado o fue cancelado.');
        } else if (paymentStatus === 'pending') {
          mostrarAviso('Tu pago está en proceso. Te notificaremos en cuanto MercadoPago o el banco lo apruebe.');
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (quoteIdParam && !paymentStatus) {
        const found = cotizaciones.find(c => String(c.id) === String(quoteIdParam));
        if (found) {
          const statusLower = String(found.status || found.estado || '').toLowerCase();
          if (statusLower.includes('recotiza') || found.recotizacionSolicitada) {
            setFiltro('Recotizaciones');
          } else if (statusLower.includes('rechazad')) {
            setFiltro('Rechazadas');
          } else if (statusLower.includes('pagad') || statusLower.includes('pago en revisión')) {
            setFiltro('Pagadas');
          } else if (statusLower.includes('aprobad') || statusLower === 'procesada por admin' || statusLower.includes('aceptad') || statusLower.includes('validado')) {
            setFiltro('Por Pagar');
          } else {
            setFiltro('Todas');
          }
          setCotizacionSeleccionada(found);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      const filtroParam = searchParams.get('filtro');
      if (filtroParam) {
        if (filtroParam.toLowerCase().includes('recotiz')) {
          setFiltro('Recotizaciones');
        } else {
          setFiltro(filtroParam);
        }
      }
    }
  }, [cotizaciones]);

  const cargarCotizaciones = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
      const userId = session?.userData?.id;
      const roleId = session?.userData?.role_id;

      const token = localStorage.getItem('agente_token');

      let data = [];
      try {
        const respuesta = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (Array.isArray(respuesta.data)) {
          data = respuesta.data;
        } else if (respuesta.data && Array.isArray(respuesta.data.quotes || respuesta.data.data)) {
          data = respuesta.data.quotes || respuesta.data.data;
        }
      } catch (apiErr) {
        console.warn("Utilizando cotizaciones guardadas localmente como respaldo:", apiErr);
      }

      const carritoGuardado = JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');
      const notifsAdmin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');

      const mapa = new Map();
      data.forEach(item => mapa.set(String(item.id), item));

      notifsAdmin.forEach(notif => {
        if (notif.type === 'solicitud_recotizacion' && notif.cotizacionOriginal && !notif.resuelta) {
          const orig = notif.cotizacionOriginal;
          const idKey = String(orig.id);
          const prev = mapa.get(idKey) || {};
          mapa.set(idKey, {
            ...prev,
            ...orig,
            id: orig.id,
            folio: orig.folio || prev.folio || `COT-${orig.id}`,
            status: 'Pendiente de recotización',
            estado: 'Pendiente de recotización',
            recotizacionSolicitada: true,
            cliente: orig.cliente || orig.titulo || prev.cliente || 'Solicitud del Cliente'
          });
        }
      });

      carritoGuardado.forEach(item => {
        if (item.estado === 'Pendiente de recotización' || item.recotizacionSolicitada) {
          const idKey = String(item.id);
          const prev = mapa.get(idKey) || {};
          mapa.set(idKey, {
            ...prev,
            ...item,
            id: item.id,
            folio: item.folio || prev.folio || `COT-${item.id}`,
            status: 'Pendiente de recotización',
            estado: 'Pendiente de recotización',
            recotizacionSolicitada: true,
            cliente: item.cliente || item.titulo || prev.cliente || 'Solicitud del Cliente'
          });
        }
      });

      let listaCombinada = Array.from(mapa.values());

      // FILTRO PARA TÉCNICOS: Solo ver sus propuestas al Admin, cotizaciones de la Red y solicitudes de recotización
      if (roleId === 2 || roleId === 8) {
        listaCombinada = listaCombinada.filter(c => 
          c.is_network_quote ||
          c.created_by_role === 'Técnico de la Red' ||
          (
            (c.tecnico_user_id == userId || c.tecnico_id == userId || c.user_id == userId || c.tecnico === session?.userData?.name || !c.tecnico_user_id) 
            && (c.created_by_role === 'Técnico' || c.status?.toLowerCase().includes('recotiza') || c.recotizacionSolicitada)
          )
        );
      }

      setCotizaciones(listaCombinada);

      // Sincronizar cotizacionSeleccionada si está abierta
      setCotizacionSeleccionada(prev => {
        if (!prev) return null;
        const updated = listaCombinada.find(c => String(c.id) === String(prev.id));
        return updated || prev;
      });
    } catch (error) {
      console.error("Error al cargar cotizaciones:", error);
    } finally {
      setCargando(false);
    }
  };

  const handleSolicitarRecotizacionATecnico = async (cot) => {
    if (!cot) return;
    try {
      const tecnicoNombre = cot.tecnico || 'Técnico';
      const confirmacion = await confirmarAccion(`¿Confirmas que deseas enviar la solicitud de recotización (V2) al técnico ${tecnicoNombre}?`);
      if (!confirmacion) return;

      const cotizLocales = JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');
      const ind = cotizLocales.findIndex(item => String(item.id) === String(cot.id));
      if (ind !== -1) {
        cotizLocales[ind].estado = 'Pendiente recotización por técnico';
        cotizLocales[ind].status = 'Pendiente recotización por técnico';
        cotizLocales[ind].recotizacionSolicitada = true;
        cotizLocales[ind].tecnico = tecnicoNombre;
        cotizLocales[ind].tecnico_id = cot.tecnico_id || cot.tecnico_user_id;
      } else {
        cotizLocales.unshift({
          ...cot,
          estado: 'Pendiente recotización por técnico',
          status: 'Pendiente recotización por técnico',
          recotizacionSolicitada: true,
          tecnico: tecnicoNombre,
          tecnico_id: cot.tecnico_id || cot.tecnico_user_id
        });
      }
      localStorage.setItem('carrito_cotizaciones', JSON.stringify(cotizLocales));

      const notifsTecnico = JSON.parse(localStorage.getItem('notificaciones_tecnico') || '[]');
      notifsTecnico.unshift({
        id: Date.now(),
        type: 'solicitud_recotizacion_tecnico',
        title: '🔄 Solicitud de Recotización (V2)',
        message: `El administrador ha solicitado crear la Versión 2 de la cotización ${cot.folio || cot.id}.`,
        created_at: new Date().toISOString(),
        read_at: null,
        tecnico_user_id: cot.tecnico_user_id || cot.tecnico_id,
        tecnico: tecnicoNombre,
        data: { quote_id: cot.id }
      });
      localStorage.setItem('notificaciones_tecnico', JSON.stringify(notifsTecnico));
      window.dispatchEvent(new Event('notif_update'));
      window.dispatchEvent(new Event('storage'));

      try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cot.id}/solicitar-recotizacion-tecnico`, {
          tecnico: tecnicoNombre,
          tecnico_id: cot.tecnico_id || cot.tecnico_user_id
        });
      } catch (e) {
        console.warn("API de notificaciones a técnico offline, usado respaldo local:", e);
      }

      mostrarAviso(`📩 ¡Solicitud de recotización V2 enviada al técnico ${tecnicoNombre}! La cotización V1 permanece guardada en el historial.`);
      setCotizacionSeleccionada(null);
      cargarCotizaciones();
    } catch (error) {
      console.error("Error al enviar recotización a técnico:", error);
    }
  };

  const calcularMontoFinalNum = (cot) => {
    if (!cot || cot.type === 'archivo') return 0;
    let subtotalItems = 0;
    try {
      const rawConcept = cot.concept || cot.concepto;
      const detalle = typeof rawConcept === 'string' ? JSON.parse(rawConcept) : rawConcept;
      if (detalle && typeof detalle === 'object') {
        const listado = detalle.conceptos || detalle.servicios || [];
        if (Array.isArray(listado)) {
          listado.forEach(c => subtotalItems += (parseFloat(c.precio_u || c.precio || 0) * parseFloat(c.cantidad || c.cant || 1)));
        }
        if (Array.isArray(detalle.materiales)) {
          detalle.materiales.forEach(m => subtotalItems += (parseFloat(m.costo_u || m.precio || 0) * parseFloat(m.cantidad || m.cant || 1)));
        }
        if (Array.isArray(detalle.seccionesLote)) {
          detalle.seccionesLote.forEach(sec => {
            if (Array.isArray(sec.conceptos)) {
              sec.conceptos.forEach(c => subtotalItems += (parseFloat(c.precio_u || c.precio || 0) * parseFloat(c.cantidad || c.cant || 1)));
            }
            if (Array.isArray(sec.materiales)) {
              sec.materiales.forEach(m => subtotalItems += (parseFloat(m.costo_u || m.precio || 0) * parseFloat(m.cantidad || m.cant || 1)));
            }
          });
        }
      }
    } catch(e) {}
    let base = subtotalItems > 0 ? subtotalItems : parseFloat(cot.total || cot.estimated_amount || 0);
    if (base > 0) {
      const iva = base * 0.16;
      const subConIva = base + iva;
      
      const esPagadoMP = Boolean(
        (cot.status === 'Pagado' || cot.payment_status === 'approved') &&
        !cot.cash_confirmed &&
        !cot.cash_requested &&
        (cot.mp_payment_data || cot.metodo_pago === 'mercadopago' || cot.payment_method === 'mercadopago')
      );

      // Si fue pagado a través de pasarela Mercado Pago, incluye su comisión
      if (esPagadoMP) {
        const comisionMP = (subConIva * 0.0349 + 4) * 1.16;
        return subConIva + comisionMP;
      }

      // Por defecto (efectivo, estándar, por pagar, etc.), el total es Subtotal + 16% IVA (sin comisión MP)
      return subConIva;
    }
    return base;
  };

  const filtradas = cotizaciones.filter(c => {
    const searchParams = new URLSearchParams(location.search);
    const filterPropId = searchParams.get('propertyId');
    const coincidePropiedad = !filterPropId || 
                              String(c.property_id) === String(filterPropId) || 
                              String(c.propiedad_id) === String(filterPropId) || 
                              String(c.propertyId) === String(filterPropId);

    const coincideFiltro = 
      filtro === 'Todas' ||
      (filtro === 'Por Pagar' && (
        c.status?.toLowerCase().includes('por pagar') ||
        c.estado?.toLowerCase().includes('por pagar') ||
        c.status?.toLowerCase().includes('aprobad') || 
        c.status === 'Procesada por Admin' || 
        c.status?.toLowerCase() === 'aceptado' || 
        c.status?.toLowerCase() === 'aceptada' || 
        c.status === 'Validado' || 
        (c.cash_requested && !c.cash_confirmed) || 
        c.status?.toLowerCase().includes('efectivo solicitado')
      )) ||
      (filtro === 'Rechazadas' && c.status?.toLowerCase().includes('rechazad')) ||
      (filtro === 'Pagadas' && !c.status?.toLowerCase().includes('efectivo solicitado') && !(c.cash_requested && !c.cash_confirmed) && (c.status?.toLowerCase().includes('pago') || c.status?.toLowerCase().includes('pagad'))) ||
      (filtro === 'Recotizaciones' && (
        c.status?.toLowerCase().includes('recotiza') ||
        c.estado?.toLowerCase().includes('recotiza') ||
        c.recotizacionSolicitada === true
      ));

    const coincideBusqueda = (c.cliente?.toLowerCase() || "").includes(busqueda?.toLowerCase() || "") || 
                             (c.folio?.toString() || "").includes(busqueda || "");

    const correspondeAlCliente = !esCliente || c.cliente_user_id === usuarioId;

    const coincideTipo = 
      filtroTipo === 'todos' || 
      (filtroTipo === 'manual' && c.type !== 'archivo') || 
      (filtroTipo === 'archivo' && c.type === 'archivo');

    return coincideFiltro && coincideBusqueda && correspondeAlCliente && coincideTipo && coincidePropiedad;
  }).sort((a, b) => {
    if (!ordenMonto) return 0;
    const valA = calcularMontoFinalNum(a);
    const valB = calcularMontoFinalNum(b);
    return ordenMonto === 'asc' ? valA - valB : valB - valA;
  });


  const verPantallaCompleta = (url) => {
    if (!url) return;
    if (url.toLowerCase().endsWith('.pdf')) {
      window.open(url, '_blank');
    } else {
      setImagenModal(url);
    }
  };

  const procesarCotizacion = async (nuevoEstado) => {
    try {
      setProcesando(true);
      const payload = { status: nuevoEstado };
      if (nuevoEstado === 'Rechazado') {
        payload.rejection_reason = motivoRechazo;
      }
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacionSeleccionada.id}/status`, payload);
      setCotizacionSeleccionada(null);
      setRechazando(false);
      setMotivoRechazo('');
      cargarCotizaciones();
    } catch (error) {
      console.error('Error actualizando cotización:', error);
    } finally {
      setProcesando(false);
    }
  };

  const handleValidarPago = async () => {
    try {
      setProcesando(true);
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacionSeleccionada.id}/validar-pago`);
      setCotizacionSeleccionada(prev => ({ ...prev, status: 'Pagado' }));
      cargarCotizaciones();
      mostrarAviso("¡Pago validado y servicio programado!");
    } catch (error) {
      console.error('Error validando pago:', error);
      mostrarAviso('Hubo un error al validar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  const enviarMensajeChat = async () => {
    if (!mensajeChat.trim()) return;
    setEnviandoMensaje(true);
    try {
      const token = localStorage.getItem('agente_token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacionSeleccionada.id}/chat`,
        { message: mensajeChat },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      // Actualizamos el chat history localmente
      setCotizacionSeleccionada(prev => ({
        ...prev,
        chat_history: res.data.chat_history
      }));
      setMensajeChat('');
    } catch (e) {
      console.error(e);
      mostrarAviso('Error al enviar el mensaje');
    } finally {
      setEnviandoMensaje(false);
    }
  };

  const handleImprimirPDF = () => {
    // Guardamos los datos temporalmente
    localStorage.setItem('cotizacion_para_imprimir', JSON.stringify(cotizacionSeleccionada));
    
    // Abrimos la vista en una NUEVA PESTAÑA
    window.open('/imprimir-cotizacion', '_blank'); 
  };

  const renderConceptoDetalle = (conceptoStr) => {
    try {
      const detalle = typeof conceptoStr === 'string' ? JSON.parse(conceptoStr) : conceptoStr;
      
      if (detalle && typeof detalle === 'object' && (detalle.conceptos || detalle.servicios || detalle.materiales || detalle.herramientas_basicas || detalle.seccionesLote)) {
        
        // ── Factor de precio para el Cliente ──────────────────────────────────
        // El Admin ingresa precios base (sin IVA ni comisión MP).
        // Para que al Cliente le cuadre la suma de ítems exactamente con el total visible
        // calculamos el factor en base a la misma fórmula fiscal del sistema:
        let priceFactor = 1;
        if (esCliente) {
          let subtotalBase = 0;
          (detalle.conceptos || detalle.servicios || []).forEach(c => {
            subtotalBase += parseFloat(c.precio_u || c.precio || 0) * parseFloat(c.cantidad || c.cant || 1);
          });
          (detalle.materiales || []).forEach(m => {
            subtotalBase += parseFloat(m.costo_u || m.precio || 0) * parseFloat(m.cantidad || m.cant || 1);
          });
          if (detalle.seccionesLote) {
            detalle.seccionesLote.forEach(sec => {
              (sec.conceptos || []).forEach(c => subtotalBase += parseFloat(c.precio_u || c.precio || 0) * parseFloat(c.cantidad || c.cant || 1));
              (sec.materiales || []).forEach(m => subtotalBase += parseFloat(m.costo_u || m.precio || 0) * parseFloat(m.cantidad || m.cant || 1));
            });
          }
          if (subtotalBase > 0) {
            const ivaCalc = subtotalBase * 0.16;
            const subtotalConIva = subtotalBase + ivaCalc;
            const esPagadoMP = Boolean(
              (cotizacionSeleccionada?.status === 'Pagado' || cotizacionSeleccionada?.payment_status === 'approved') &&
              !cotizacionSeleccionada?.cash_confirmed &&
              !cotizacionSeleccionada?.cash_requested &&
              (cotizacionSeleccionada?.mp_payment_data || cotizacionSeleccionada?.metodo_pago === 'mercadopago' || cotizacionSeleccionada?.payment_method === 'mercadopago')
            );
            const comisionMP = esPagadoMP ? ((subtotalConIva * 0.0349 + 4) * 1.16) : 0;
            const totalConTodo = subtotalConIva + comisionMP;
            priceFactor = totalConTodo / subtotalBase;
          }
        }

        const fmtPrecio = (rawPrice) => {
          const precioAjustado = parseFloat(rawPrice || 0) * priceFactor;
          return `$${precioAjustado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        if (detalle.isUnifiedBatch && detalle.seccionesLote) {
          return (
            <div className="detalle-parseado">
              <div style={{ background: '#1e293b', color: '#fff', padding: '12px 16px', borderRadius: '10px', fontWeight: '800', marginBottom: '18px', borderLeft: '4px solid #F26522', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📦 COTIZACIÓN UNIFICADA DE LOTE ({detalle.seccionesLote.length} SERVICIOS DIVIDIDOS)
              </div>
              {detalle.seccionesLote.map((sec, sIdx) => (
                <div key={sIdx} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
                  <h4 style={{ color: '#0f172a', borderBottom: '2px solid #F26522', paddingBottom: '8px', marginBottom: '14px', fontWeight: '800', fontSize: '1.05rem' }}>
                    {sec.titulo || `Servicio #${sIdx + 1}`}
                  </h4>
                  {sec.conceptos && sec.conceptos.filter(c => c.descripcion || c.precio_u || c.precio).length > 0 && (
                    <div className="detalle-seccion" style={{ marginBottom: '15px' }}>
                      <h5 style={{ color: '#ff8800', borderBottom: '1px solid #ff8800', paddingBottom: '4px', margin: '0 0 8px 0' }}>Servicios / Conceptos</h5>
                      <table className="modal-items-table">
                        <thead>
                          <tr>
                            <th>Descripción</th>
                            <th style={{ textAlign: 'center' }}>Cant.</th>
                            <th style={{ textAlign: 'center' }}>Precio U.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.conceptos.filter(c => c.descripcion || c.precio_u || c.precio).map((c, i) => (
                            <tr key={i}>
                              <td>{c.descripcion}</td>
                              <td style={{ textAlign: 'center' }}>{c.cantidad || 1}</td>
                              <td style={{ textAlign: 'center' }}>{fmtPrecio(c.precio_u || c.precio)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {sec.materiales && sec.materiales.filter(m => m.nombre || m.descripcion || m.costo_u || m.precio).length > 0 && (
                    <div className="detalle-seccion">
                      <h5 style={{ color: '#ff8800', borderBottom: '1px solid #ff8800', paddingBottom: '4px', margin: '0 0 8px 0' }}>Materiales</h5>
                      <table className="modal-items-table">
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th style={{ textAlign: 'center' }}>Cant.</th>
                            <th style={{ textAlign: 'center' }}>Costo U.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.materiales.filter(m => m.nombre || m.descripcion || m.costo_u || m.precio).map((m, i) => (
                            <tr key={i}>
                              <td>{m.nombre || m.descripcion}</td>
                              <td style={{ textAlign: 'center' }}>{m.cantidad || 1}</td>
                              <td style={{ textAlign: 'center' }}>{fmtPrecio(m.costo_u || m.precio)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        }

        return (
          <div className="detalle-parseado">
            {/* Conceptos / Servicios */}
            {(detalle.conceptos || detalle.servicios) && (detalle.conceptos || detalle.servicios).some(c => c.descripcion || c.precio_u || c.precio) && (
              <div className="detalle-seccion">
                <h4 style={{ color: '#ff8800', borderBottom: '1px solid #ff8800', paddingBottom: '5px' }}>Servicios / Conceptos</h4>
                <table className="modal-items-table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th style={{ textAlign: 'center' }}>Cant.</th>
                      <th style={{ textAlign: 'center' }}>Precio U.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detalle.conceptos || detalle.servicios).filter(c => c.descripcion || c.precio_u || c.precio).map((c, i) => (
                      <tr key={i}>
                        <td>{c.descripcion}</td>
                        <td style={{ textAlign: 'center' }}>{c.cantidad || 1}</td>
                        <td style={{ textAlign: 'center' }}>{fmtPrecio(c.precio_u || c.precio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Materiales */}
            {detalle.materiales && detalle.materiales.some(m => m.nombre || m.descripcion || m.costo_u || m.precio) && (
              <div className="detalle-seccion" style={{ marginTop: '15px' }}>
                <h4 style={{ color: '#ff8800', borderBottom: '1px solid #ff8800', paddingBottom: '5px' }}>Materiales</h4>
                <table className="modal-items-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th style={{ textAlign: 'center' }}>Cant.</th>
                      <th style={{ textAlign: 'center' }}>Costo U.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.materiales.filter(m => m.nombre || m.descripcion || m.costo_u || m.precio).map((m, i) => (
                      <tr key={i}>
                        <td>{m.nombre || m.descripcion}</td>
                        <td style={{ textAlign: 'center' }}>{m.cantidad || 1}</td>
                        <td style={{ textAlign: 'center' }}>{fmtPrecio(m.costo_u || m.precio)}</td>
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

    // Fallback: Mostrar como antes si no es el JSON esperado
    return (
      <table className="modal-items-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th style={{ textAlign: 'center' }}>Total Estimado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{typeof conceptoStr === 'object' ? (JSON.stringify(conceptoStr, null, 2) || 'Cotización') : (conceptoStr || 'Cotización')}</td>
            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
              ${calcularMontoFinalNum(cotizacionSeleccionada).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>
    );
  };

  // Cotizaciones visibles con filtros de tipo/origen y orden por monto aplicados
  const cotizacionesVisibles = cotizacionesFiltradas
    .filter(c => {
      const coincideTipo =
        filtroTipo === 'todos' ||
        (filtroTipo === 'manual' && c.type !== 'archivo') ||
        (filtroTipo === 'archivo' && c.type === 'archivo');

      const coincideOrigen =
        filtroOrigen === 'todos' ||
        (filtroOrigen === 'admin' && (c.created_by_role === 'Admin' || (!c.created_by_role && !c.tecnico))) ||
        (filtroOrigen === 'tecnicos' && c.created_by_role === 'Técnico') ||
        (filtroOrigen === 'proveedores' && c.created_by_role === 'Proveedor');

      return coincideTipo && coincideOrigen;
    })
    .sort((a, b) => {
      if (!ordenMonto) return 0;
      const valA = parseFloat(a.total) || 0;
      const valB = parseFloat(b.total) || 0;
      return ordenMonto === 'asc' ? valA - valB : valB - valA;
    });

  // Agrupar por propiedad: una tarjeta por propiedad con sus cotizaciones
  const propiedadesCotizadas = Object.values(
    cotizacionesVisibles.reduce((acc, c) => {
      const nombre = c.propiedad_nombre && c.propiedad_nombre !== 'N/A' ? c.propiedad_nombre : 'SIN PROPIEDAD';
      const key = `${nombre}|${c.cliente || ''}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          nombre,
          cliente: c.cliente,
          telefono: c.cliente_telefono || c.telefono_cliente || c.telefono || null,
          direccion: c.propiedad_direccion || null,
          foto: null,
          cotizaciones: []
        };
      }
      if (!acc[key].foto && c.foto_fachada) acc[key].foto = c.foto_fachada;
      acc[key].cotizaciones.push(c);
      return acc;
    }, {})
  );

  const propiedadCotizSeleccionada = propiedadesCotizadas.find(p => p.key === propiedadCotizKey) || null;

  const formatearMonto = (c) => c.type === 'archivo'
    ? 'Ver Archivo'
    : `$${calcularMontoFinalNum(c).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderEstadoBadge = (c) => {
    const statusLower = String(c.status || c.estado || '').toLowerCase();
    if (statusLower.includes('recotiza') || c.recotizacionSolicitada) {
      return <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b', fontSize: '0.65rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>🔄 RECOTIZACIÓN SOLICITADA</span>;
    }
    if ((c.cash_requested && !c.cash_confirmed) || statusLower.includes('efectivo solicitado')) {
      return <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b', fontSize: '0.65rem', fontWeight: 'bold' }}>💵 EFECTIVO PENDIENTE</span>;
    }
    if (c.cash_confirmed || statusLower.includes('pagado (efectivo)') || statusLower.includes('anticipo pagado')) {
      if (statusLower.includes('anticipo') || c.cash_amount_type === 'advance') {
        return <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#047857', border: '1px solid #10b981', fontSize: '0.65rem', fontWeight: '800' }}>💵 ANTICIPO 60% (EFECTIVO)</span>;
      }
      return <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#047857', border: '1px solid #10b981', fontSize: '0.65rem', fontWeight: '800' }}>💵 PAGADA EN EFECTIVO</span>;
    }
    if (statusLower.includes('rechazad')) {
      return <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#ef4444', fontSize: '0.65rem', fontWeight: 'bold' }}>RECHAZADA</span>;
    }
    if (statusLower.includes('pagad') || statusLower.includes('pago en revisión')) {
      return <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a', fontSize: '0.65rem', fontWeight: 'bold' }}>PAGADA</span>;
    }
    if (statusLower.includes('por pagar') || statusLower.includes('aprobad') || statusLower === 'procesada por admin' || statusLower.includes('aceptad') || statusLower.includes('validado')) {
      return <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#d97706', fontSize: '0.65rem', fontWeight: 'bold' }}>POR PAGAR</span>;
    }
    if (isCotizacionEnCarrito(c)) {
      return <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a', border: '1px solid #10b981', fontSize: '0.65rem', fontWeight: 'bold' }}>🛒 EN CARRITO</span>;
    }
    return <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0284c7', fontSize: '0.65rem', fontWeight: 'bold' }}>PENDIENTE</span>;
  };

  const renderLoteBadge = (c) => (c.is_unified_batch || (c.related_service_ids && c.related_service_ids.length > 0) || (typeof c.concept === 'string' ? c.concept.includes('isUnifiedBatch') : c.concept?.isUnifiedBatch)) && (
    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#1e293b', color: '#fff', border: '1px solid #F26522', fontSize: '0.65rem', fontWeight: '800', marginTop: '2px' }}>
      📦 UNIFICADA (LOTE)
    </span>
  );

  const renderOrigenTag = (c) => c.created_by_role === 'Técnico' ? (
    <div className="origin-tag-mini">
      <Wrench size={10} /> TÉCNICO: {c.tecnico}
    </div>
  ) : (
    <div className="origin-tag-mini admin">
      <User size={10} /> ADMINISTRATIVO
    </div>
  );

  // Botones de acción de una cotización. "antesDeModal" cierra el panel de propiedad
  // antes de abrir modales que no son el detalle (crear / asignar).
  const renderAcciones = (c, antesDeModal = () => {}) => (
    <div className="cotiz-actions-cell">
      <button
        className={`btn-view-detail ${isCotizacionEnCarrito(c) ? 'en-carrito' : ''}`}
        onClick={() => setCotizacionSeleccionada(c)}
        style={isCotizacionEnCarrito(c) ? {
          background: '#10b981',
          boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
          fontSize: 'clamp(0.7rem, 2vw, 0.9rem)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        } : { fontSize: 'clamp(0.7rem, 2vw, 0.9rem)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
      >
        {isCotizacionEnCarrito(c)
          ? <><ShoppingCart size={15} color="#ffffff" strokeWidth={2.4} /> EN CARRITO</>
          : <><Eye size={16} color="#ffffff" strokeWidth={2.4} /> VER</>}
      </button>
      {/* Botón para recotizar si fue solicitada recotización */}
      {!esCliente && (c.status?.toLowerCase().includes('recotiza') || c.estado?.toLowerCase().includes('recotiza') || c.recotizacionSolicitada) && (
        <button
          className="btn-view-detail"
          style={{ background: '#f26624', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          onClick={() => {
            antesDeModal();
            setCotizacionParaAsignar(c);
            setShowCreateModal(true);
          }}
        >
          <RefreshCw size={13} /> RECOTIZAR
        </button>
      )}
      {/* Botón para editar si está rechazada */}
      {!esCliente && c.status === 'Rechazado' && (
        <button
          className="btn-view-detail"
          style={{ background: '#3b82f6', color: 'white', border: 'none' }}
          onClick={() => {
            antesDeModal();
            setCotizacionParaAsignar(c);
            setShowCreateModal(true);
          }}
        >
          ✏️ RE-EDITAR
        </button>
      )}
      {/* Solo mostrar acciones de asignación si es admin y está aprobada */}
      {!esCliente && !esTecnico && filtro === 'Aprobado' && (
        c.tecnico ? (
          // Mostrar cuando YA está asignado
          <>
            <span style={{ fontWeight: 'bold', color: '#2e7d32', margin: '0 2px', fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)' }}>✓ Asignado</span>
            <button
              className="btn-view-detail"
              style={{ background: '#fb8c00', fontSize: 'clamp(0.7rem, 2vw, 0.9rem)' }}
              onClick={() => {
                antesDeModal();
                setCotizacionParaAsignar(c);
                setShowAssignModal(true);
              }}
            >
              🔄
            </button>
          </>
        ) : (
          // Mostrar cuando NO está asignado
          <button
            className="btn-view-detail"
            style={{ background: '#2e7d32', fontSize: 'clamp(0.7rem, 2vw, 0.9rem)' }}
            onClick={() => {
              antesDeModal();
              setCotizacionParaAsignar(c);
              setShowAssignModal(true);
            }}
          >
            🛠️
          </button>
        )
      )}
    </div>
  );

  return (
    <div className={`cotiz-page ${!esCliente ? 'cotiz-glass-page' : ''}`}>
      
      {/* 👇 AQUÍ ESTÁ EL NUEVO HEADER GLOBAL 👇 */}
      {!esCliente && <Header activeModule="cotizaciones" titulo="COTIZACIONES" />}


      {/* 👆 Se eliminaron los div de las barras manuales y el tag <header> 👆 */}

      <main className="cotiz-main-content" style={esCliente ? { padding: '20px 0', width: '100%', maxWidth: '1000px', margin: '0 auto' } : {}}>
        
        {/* ── BARRA DE TÍTULO ── */}
        <div className="cotiz-action-bar">
          <div className="cotiz-page-title-badge">
            <FileText size={18} className="cotiz-title-icon" />
            <span>COTIZACIONES</span>
            <span className="cotiz-count-pill">{cotizaciones.length}</span>
          </div>
        </div>

        {/* ── BARRA UNIFICADA: BUSCADOR + FILTROS + NUEVA COTIZACIÓN ── */}
        <div className="tb-toolbar cotiz-toolbar">
          <div className="tb-toolbar-search">
            <UniversalSearch
              data={(() => {
                const searchParams = new URLSearchParams(location.search);
                const filterPropId = searchParams.get('propertyId');
                if (!filterPropId) return cotizaciones;
                return cotizaciones.filter(c => String(c.property_id) === String(filterPropId) || String(c.propiedad_id) === String(filterPropId) || String(c.propertyId) === String(filterPropId));
              })()}
              setFilteredData={setCotizacionesFiltradas}
              placeholder="BUSCAR POR FOLIO, CLIENTE, PROPIEDAD, TÉCNICO..."
              filtroActual={filtro}
              type="COTIZACIONES"
            />
          </div>

          {/* Botón Filtros con menú desplegable */}
          <div className="tb-actions-wrapper" ref={filtrosRef}>
            {(() => {
              const hayFiltros = filtro !== 'Todas' || filtroOrigen !== 'todos' || filtroTipo !== 'todos' || ordenMonto !== null;
              return (
                <button
                  type="button"
                  className={`cotiz-filter-btn ${filtrosAbiertos ? 'open' : ''} ${hayFiltros ? 'filtered' : ''}`}
                  onClick={() => setFiltrosAbiertos(v => !v)}
                  title="Filtrar cotizaciones"
                  aria-label="Filtrar cotizaciones"
                  aria-expanded={filtrosAbiertos}
                >
                  <Filter size={20} />
                  {hayFiltros && <span className="cotiz-filter-indicator" />}
                </button>
              );
            })()}

            {filtrosAbiertos && (
              <div className="tb-actions-menu cotiz-filter-menu">
                <span className="cotiz-filter-section">ESTADO</span>
                {[
                  { value: 'Todas', label: 'Todas', icon: <Layout size={15} /> },
                  { value: 'Por Pagar', label: 'Por pagar', icon: <Clock size={15} /> },
                  { value: 'Rechazadas', label: 'Rechazadas', icon: <XCircle size={15} /> },
                  { value: 'Pagadas', label: 'Pagadas', icon: <CheckCircle size={15} /> },
                  { value: 'Recotizaciones', label: 'Recotizaciones', icon: <RefreshCw size={15} /> },
                ].map(op => (
                  <button
                    key={op.value}
                    type="button"
                    className={`tb-actions-item ${filtro === op.value ? 'selected' : ''}`}
                    onClick={() => { setFiltro(op.value); setFiltrosAbiertos(false); }}
                  >
                    <span className="cotiz-filter-icon">{op.icon}</span>
                    <span>{op.label}</span>
                  </button>
                ))}

                {!esCliente && !esTecnico && (
                  <>
                    <span className="cotiz-filter-section">CREADA POR</span>
                    {[
                      { value: 'todos', label: 'Todos', icon: <Layout size={15} /> },
                      { value: 'admin', label: 'Admin', icon: <User size={15} /> },
                      { value: 'tecnicos', label: 'Técnicos', icon: <Wrench size={15} /> },
                      { value: 'proveedores', label: 'Proveedores', icon: <Truck size={15} /> },
                    ].map(op => (
                      <button
                        key={op.value}
                        type="button"
                        className={`tb-actions-item ${filtroOrigen === op.value ? 'selected' : ''}`}
                        onClick={() => { setFiltroOrigen(op.value); setFiltrosAbiertos(false); }}
                      >
                        <span className="cotiz-filter-icon">{op.icon}</span>
                        <span>{op.label}</span>
                      </button>
                    ))}
                  </>
                )}

                <span className="cotiz-filter-section">TIPO Y ORDEN</span>
                <div className="cotiz-filter-inline">
                  {[
                    { value: 'todos', label: 'Todos' },
                    { value: 'manual', label: 'Manual' },
                    { value: 'archivo', label: 'Archivo' },
                  ].map(op => (
                    <button
                      key={op.value}
                      type="button"
                      className={`cotiz-filter-chip ${filtroTipo === op.value ? 'selected' : ''}`}
                      onClick={() => setFiltroTipo(op.value)}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`tb-actions-item ${ordenMonto ? 'selected' : ''}`}
                  onClick={() => setOrdenMonto(prev => prev === 'asc' ? 'desc' : (prev === 'desc' ? null : 'asc'))}
                >
                  <span className="cotiz-filter-icon"><ArrowUpDown size={15} /></span>
                  <span>Monto {ordenMonto === 'asc' ? '(Min-Max)' : (ordenMonto === 'desc' ? '(Max-Min)' : '(sin orden)')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Botón Nueva cotización (o Explorar red para técnicos de la red) */}
          {!esCliente && (
            (() => {
              const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
              const esRed = session?.userData?.role_id === 8;
              return (
                <button
                  type="button"
                  className="tb-actions-btn"
                  onClick={() => esRed ? navigate('/mercado-trabajos') : setShowCreateModal(true)}
                  title={esRed ? 'Explorar red de trabajos' : 'Nueva cotización'}
                  aria-label={esRed ? 'Explorar red de trabajos' : 'Nueva cotización'}
                >
                  <Plus size={20} />
                </button>
              );
            })()
          )}
        </div>

        {/* ── PORTAL ADMIN / TÉCNICO: UNA TARJETA POR PROPIEDAD ── */}
        {!esCliente && (
          cargando ? (
            <CasaLoader texto="Cargando cotizaciones..." />
          ) : propiedadesCotizadas.length === 0 ? (
            <div className="cotiz-glass-card cotiz-empty-state">No se encontraron resultados</div>
          ) : (
            <div className="cotiz-prop-grid">
              {propiedadesCotizadas.map(prop => (
                <button
                  key={prop.key}
                  type="button"
                  className="cotiz-glass-card cotiz-prop-card"
                  onClick={() => setPropiedadCotizKey(prop.key)}
                >
                  <div className="cotiz-prop-photo">
                    {prop.foto ? (
                      <img src={prop.foto} alt={prop.nombre} />
                    ) : (
                      <div className="cotiz-prop-photo-empty"><Home size={34} /></div>
                    )}
                    <span className="cotiz-prop-count">
                      <FileText size={13} /> {prop.cotizaciones.length} {prop.cotizaciones.length === 1 ? 'COTIZACIÓN' : 'COTIZACIONES'}
                    </span>
                  </div>
                  <div className="cotiz-prop-body">
                    <div className="cotiz-prop-name">
                      <Home size={17} />
                      <h3>{prop.nombre}</h3>
                    </div>
                    <div className="cotiz-prop-meta">
                      <span><User size={13} /> {prop.cliente || 'Sin cliente'}</span>
                      {prop.telefono && <span><Phone size={13} /> {prop.telefono}</span>}
                    </div>
                    <span className="cotiz-prop-cta">
                      Ver cotizaciones <ChevronRight size={16} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {esCliente && (
        <div className="cotiz-table-container" style={esCliente ? { width: '100%' } : {}}>
          <table className="cotiz-data-table">
            <thead>
              <tr>
                <th>FOLIO</th>
                <th>FECHA</th>
                {!esCliente && <th>CLIENTE</th>}
                <th>TOTAL</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
  {cargando ? (
    <tr><td colSpan="5"><CasaLoader texto="Cargando cotizaciones..." /></td></tr>
  ) : cotizacionesVisibles.length > 0 ? (
    cotizacionesVisibles
      .map((c) => (
      <tr key={c.id} style={c.status === 'Rechazado' ? { backgroundColor: '#fff5f5', borderLeft: '4px solid #ef4444' } : {}}>
        <td className="bold-folio" data-label="FOLIO">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <span>{c.folio}</span>
            {renderEstadoBadge(c)}
            {renderLoteBadge(c)}
            {c.propiedad_nombre && c.propiedad_nombre !== 'N/A' && (
              <span style={{ fontSize: '0.78rem', color: '#f26624', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Home size={12} /> {c.propiedad_nombre}
              </span>
            )}
          </div>
        </td>
        <td className="cotiz-date" data-label="FECHA">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: '#666' }}>
            <Calendar size={14} />
            {c.created_at ? new Date(c.created_at).toLocaleDateString('es-MX') : c.fecha || '---'}
          </div>
        </td>
        {!esCliente && (
          <td className="cliente-name" data-label="CLIENTE">
            <div className="cliente-info-wrapper">
              <div style={{ fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <span>{c.cliente}</span>
                {(c.cliente_telefono || c.telefono_cliente || c.telefono) && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: '#f26624', background: 'rgba(242,102,36,0.08)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(242,102,36,0.15)', fontWeight: '600' }}>
                    <Phone size={10} /> {c.cliente_telefono || c.telefono_cliente || c.telefono}
                  </span>
                )}
              </div>
              {renderOrigenTag(c)}
            </div>
          </td>
        )}
        <td className="monto-final" data-label="TOTAL">
          {c.type === 'archivo' ? 'Ver Archivo' : `$${calcularMontoFinalNum(c).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </td>
        <td data-label="ACCIONES">
          {renderAcciones(c)}
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="4" className="no-data">No se encontraron resultados</td>
    </tr>
  )}
</tbody>
          </table>
        </div>
        )}
      </main>

      {/* ── PANEL DE PROPIEDAD: FOTO + COTIZACIONES DE LA PROPIEDAD ── */}
      {propiedadCotizSeleccionada && !esCliente && createPortal(
        <div className="cotiz-sheet-overlay" onClick={() => setPropiedadCotizKey(null)}>
          <div className="cotiz-sheet" onClick={e => e.stopPropagation()}>
            <div className="cotiz-sheet-grabber" />

            <div className="cotiz-sheet-header">
              <div className="cotiz-sheet-header-text">
                <span className="cotiz-sheet-tag">
                  {propiedadCotizSeleccionada.cotizaciones.length} {propiedadCotizSeleccionada.cotizaciones.length === 1 ? 'COTIZACIÓN' : 'COTIZACIONES'}
                </span>
                <h2>{propiedadCotizSeleccionada.nombre}</h2>
              </div>
              <button type="button" className="cotiz-sheet-close" onClick={() => setPropiedadCotizKey(null)} aria-label="Cerrar">
                <XCircle size={20} />
              </button>
            </div>

            {propiedadCotizSeleccionada.foto && (
              <div className="cotiz-sheet-photo">
                <img src={propiedadCotizSeleccionada.foto} alt={propiedadCotizSeleccionada.nombre} />
              </div>
            )}

            <div className="cotiz-sheet-info">
              <span><User size={15} /> <strong>Cliente / Dueño:</strong> {propiedadCotizSeleccionada.cliente || 'Sin cliente'}</span>
              {propiedadCotizSeleccionada.telefono && (
                <span><Phone size={15} /> <strong>Teléfono:</strong> {propiedadCotizSeleccionada.telefono}</span>
              )}
              {propiedadCotizSeleccionada.direccion && (
                <span><MapPin size={15} /> <strong>Dirección:</strong> {propiedadCotizSeleccionada.direccion}</span>
              )}
            </div>

            <div className="cotiz-sheet-list">
              {propiedadCotizSeleccionada.cotizaciones.map(c => (
                <div key={c.id} className={`cotiz-quote-card ${c.status === 'Rechazado' ? 'rechazada' : ''}`}>
                  <div className="cotiz-quote-top">
                    <div className="cotiz-quote-folio">
                      <span className="cotiz-quote-folio-text">{c.folio}</span>
                      <div className="cotiz-quote-badges">
                        {renderEstadoBadge(c)}
                        {renderLoteBadge(c)}
                      </div>
                    </div>
                    <span className="cotiz-quote-total">{formatearMonto(c)}</span>
                  </div>

                  <div className="cotiz-quote-meta">
                    <span><Calendar size={13} /> {c.created_at ? new Date(c.created_at).toLocaleDateString('es-MX') : c.fecha || '---'}</span>
                    {renderOrigenTag(c)}
                  </div>

                  {renderAcciones(c, () => setPropiedadCotizKey(null))}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {cotizacionSeleccionada && (
        <div
          className={`mercado-modal-overlay ${!(cotizacionSeleccionada.is_network_quote || String(cotizacionSeleccionada.folio || '').startsWith('RED-')) ? 'cotiz-detail-overlay' : ''}`}
          onClick={() => setCotizacionSeleccionada(null)}
        >
          {cotizacionSeleccionada.is_network_quote || String(cotizacionSeleccionada.folio || '').startsWith('RED-') ? (
            /* ─── DETALLE DE COTIZACIÓN DE LA RED (RED-XXX): vidrio blanco, 2 columnas ─── */
            (() => {
              const c = cotizacionSeleccionada;
              const estado = c.status || 'Por Pagar';
              const tonoEstado = estado === 'Pagado' || estado === 'Aprobado' ? 'ok' : (estado === 'Rechazado' ? 'mal' : 'pendiente');
              const foto = c.foto_fachada || c.evidence_photo_path;
              return (
                <div className="rq-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                  {/* Encabezado */}
                  <div className="rq-header">
                    <div className="rq-header-icon"><Briefcase size={20} /></div>
                    <div className="rq-header-text">
                      <span className="rq-tag"><Globe size={12} /> Cotización de la red</span>
                      <h2>{c.folio}</h2>
                    </div>
                    <span className={`rq-estado rq-estado-${tonoEstado}`}>{estado}</span>
                    <button type="button" className="rq-close" onClick={() => setCotizacionSeleccionada(null)} aria-label="Cerrar">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="rq-body">
                    {/* Columna izquierda: foto y datos del trabajo */}
                    <div className="rq-col rq-col-datos">
                      {foto ? (
                        <button type="button" className="rq-foto" onClick={() => verPantallaCompleta(foto)} title="Clic para ampliar foto">
                          <img src={foto} alt="Evidencia" />
                          <span className="rq-foto-zoom"><Maximize2 size={12} /> Ampliar</span>
                        </button>
                      ) : (
                        <div className="rq-foto rq-foto-vacia">
                          <ImageIcon size={32} />
                          <span>Sin fotografías de evidencia</span>
                        </div>
                      )}

                      <h3 className="rq-titulo">{c.propiedad_nombre || 'Trabajo de la Red'}</h3>

                      <div className="rq-datos">
                        <div className="rq-dato">
                          <span className="rq-dato-icon"><MapPin size={15} /></span>
                          <div>
                            <small>Ubicación</small>
                            <strong>{c.propiedad_direccion || c.propiedad_nombre || 'Mérida, Yucatán'}</strong>
                          </div>
                        </div>
                        <div className="rq-dato">
                          <span className="rq-dato-icon"><User size={15} /></span>
                          <div>
                            <small>Cliente / Solicitante</small>
                            <strong>{c.cliente}</strong>
                            {c.cliente_telefono && (
                              <span className="rq-dato-extra"><Phone size={11} /> {c.cliente_telefono}</span>
                            )}
                          </div>
                        </div>
                        <div className="rq-dato">
                          <span className="rq-dato-icon"><Wrench size={15} /></span>
                          <div>
                            <small>Técnico oferente</small>
                            <strong>{c.tecnico || 'Técnico de la Red'}</strong>
                          </div>
                        </div>
                        <div className="rq-dato">
                          <span className="rq-dato-icon"><CalendarDays size={15} /></span>
                          <div>
                            <small>Fecha</small>
                            <strong>{c.fecha}</strong>
                          </div>
                        </div>
                        <div className="rq-dato rq-dato-ancho">
                          <span className="rq-dato-icon"><FileText size={15} /></span>
                          <div>
                            <small>Descripción / Mensaje</small>
                            <strong className="rq-dato-normal">{c.observations || 'Sin observaciones'}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna derecha: monto, estado y conversación */}
                    <div className="rq-col rq-col-lado">
                      <div className="rq-monto">
                        <small>Propuesta económica</small>
                        <div className="rq-monto-valor">
                          ${parseFloat(c.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span>MXN</span>
                        </div>
                        <span className="rq-origen"><Globe size={12} /> Red de trabajos</span>
                      </div>

                      {estado === 'Aprobado' && (
                        <div className="rq-aviso rq-aviso-ok">
                          <p><CheckCircle2 size={16} /> Cotización aceptada</p>
                          {esTecnico && (
                            <button type="button" className="rq-aviso-btn" onClick={() => navigate('/trabajos-tecnico')}>
                              <Layout size={15} /> Ir a mis trabajos asignados
                            </button>
                          )}
                        </div>
                      )}

                      {estado === 'Rechazado' && (
                        <div className="rq-aviso rq-aviso-mal">
                          <p><XCircle size={16} /> Cotización rechazada</p>
                          {esTecnico && (
                            <button type="button" className="rq-aviso-btn" onClick={() => navigate('/mercado-trabajos')}>
                              <Globe size={15} /> Ir al mercado de trabajos
                            </button>
                          )}
                        </div>
                      )}

                      {/* Conversación en vivo */}
                      <div className="rq-chat">
                        <div className="rq-chat-head">
                          <MessageCircle size={16} />
                          <span>Conversación</span>
                        </div>

                        <div className="rq-chat-mensajes">
                          {c.chat_history && c.chat_history.length > 0 ? (
                            c.chat_history.map((msg, index) => {
                              const esMio = msg.sender_id === usuarioId;
                              return (
                                <div key={index} className={`rq-msg ${esMio ? 'es-mio' : ''}`}>
                                  <span className="rq-msg-autor">
                                    {arreglarTexto(msg.sender_name)}{msg.sender_role ? ` · ${arreglarTexto(msg.sender_role)}` : ''}
                                  </span>
                                  <div className="rq-msg-burbuja">{arreglarTexto(msg.message)}</div>
                                  <span className="rq-msg-hora">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="rq-chat-vacio">
                              <MessageCircle size={22} />
                              <span>No hay mensajes en esta cotización.<br />Escribe para consultar dudas o coordinar.</span>
                            </div>
                          )}
                        </div>

                        <div className="rq-chat-escribir">
                          <input
                            type="text"
                            placeholder="Escribe un mensaje..."
                            value={mensajeChat}
                            onChange={e => setMensajeChat(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') enviarMensajeChat(); }}
                            disabled={enviandoMensaje}
                          />
                          <button
                            type="button"
                            className="rq-chat-enviar"
                            onClick={enviarMensajeChat}
                            disabled={enviandoMensaje || !mensajeChat.trim()}
                            title="Enviar mensaje"
                            aria-label="Enviar mensaje"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pie */}
                  <div className="rq-footer">
                    <button type="button" className="rq-btn-sec" onClick={() => setCotizacionSeleccionada(null)}>Cerrar</button>
                    <button type="button" className="rq-btn-pdf" onClick={handleImprimirPDF}>
                      <FileText size={15} /> Ver PDF
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            /* ─── MODAL ESTÁNDAR ─── */
            <div className="modal-box-card cotiz-detail-sheet" onClick={e => e.stopPropagation()}>
              <div className="cotiz-sheet-grabber" />

              <div className="modal-header-dark cotiz-detail-header">
                <div className="cotiz-sheet-header-text">
                  <div className="cotiz-detail-header-badges">
                    <span className="cotiz-sheet-tag">DETALLE DE COTIZACIÓN</span>
                    {renderEstadoBadge(cotizacionSeleccionada)}
                  </div>
                  <h2>{cotizacionSeleccionada.folio}</h2>
                </div>
                <button
                  type="button"
                  className="cotiz-sheet-close"
                  aria-label="Cerrar"
                  onClick={() => { setCotizacionSeleccionada(null); setRechazando(false); setMotivoRechazo(''); }}
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="modal-body-content cotiz-detail-body">
                
                {cotizacionSeleccionada.created_by_role === 'Técnico' && !esCliente && (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #f26624', marginBottom: '15px' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', fontWeight: '600' }}>
                      🛠️ Propuesta técnica enviada al Administrador
                    </p>
                  </div>
                )}
                
                {cotizacionSeleccionada.foto_fachada && (
                  <div className="cotiz-sheet-photo">
                    <img
                      src={cotizacionSeleccionada.foto_fachada}
                      alt="Fachada de la propiedad"
                      onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="cotiz-sheet-info">
                  <span>
                    <User size={15} /> <strong>Cliente / Dueño:</strong> {cotizacionSeleccionada.cliente}
                  </span>
                  {(cotizacionSeleccionada.cliente_telefono || cotizacionSeleccionada.telefono_cliente || cotizacionSeleccionada.telefono) && (
                    <span>
                      <Phone size={15} /> <strong>Teléfono:</strong> {cotizacionSeleccionada.cliente_telefono || cotizacionSeleccionada.telefono_cliente || cotizacionSeleccionada.telefono}
                    </span>
                  )}
                  {cotizacionSeleccionada.propiedad_nombre && cotizacionSeleccionada.propiedad_nombre !== 'N/A' && (
                    <span>
                      <Home size={15} /> <strong>Propiedad:</strong> {cotizacionSeleccionada.propiedad_nombre}
                    </span>
                  )}
                  {cotizacionSeleccionada.propiedad_direccion && cotizacionSeleccionada.propiedad_direccion !== 'N/A' && (
                    <span>
                      <MapPin size={15} /> <strong>Dirección:</strong> {cotizacionSeleccionada.propiedad_direccion}
                    </span>
                  )}
                  {cotizacionSeleccionada.tecnico && (
                    <span>
                      <Wrench size={15} /> <strong>Técnico responsable:</strong> {cotizacionSeleccionada.tecnico}
                    </span>
                  )}
                  <span className="cotiz-sheet-info-divider">
                    <Calendar size={15} /> <strong>Fecha de creación:</strong> {cotizacionSeleccionada.fecha}
                  </span>
                </div>

                {cotizacionSeleccionada.type === 'archivo' ? (
                  
                  <div style={{ position: 'relative', background: '#e0e0e0', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
                    
                    {cotizacionSeleccionada.archivo_url && (
                      <button 
                        onClick={() => verPantallaCompleta(cotizacionSeleccionada.archivo_url)}
                        title="Ver en pantalla completa"
                        style={{
                          position: 'absolute', top: '25px', right: '25px',
                          background: 'rgba(34, 34, 34, 0.8)', color: 'white', border: 'none',
                          borderRadius: '8px', padding: '10px 14px', cursor: 'pointer',
                          fontSize: '1.2rem', transition: 'background 0.3s', zIndex: 10
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(34, 34, 34, 0.8)'}
                      >
                        ⛶
                      </button>
                    )}

                    {cotizacionSeleccionada.archivo_url ? (
                      cotizacionSeleccionada.archivo_url.endsWith('.pdf') ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', padding: '40px 0' }}>
                          <span style={{ fontSize: '5rem', marginBottom: '15px' }}>📄</span>
                          <p style={{ fontWeight: 'bold', color: '#555', marginBottom: '20px', textAlign: 'center', fontSize: '1.2rem' }}>Documento PDF Adjunto</p>
                          <button 
                            onClick={() => verPantallaCompleta(cotizacionSeleccionada.archivo_url)}
                            style={{ background: '#ff8800', color: 'white', padding: '12px 30px', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(255, 136, 0, 0.3)' }}
                          >
                            ABRIR PDF
                          </button>
                        </div>
                      ) : (
                        <img 
                          src={cotizacionSeleccionada.archivo_url} 
                          alt="Cotización" 
                          style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }} 
                          onClick={() => verPantallaCompleta(cotizacionSeleccionada.archivo_url)}
                        />
                      )
                    ) : (
                      <p style={{ color: 'red', padding: '30px' }}>El archivo no se encuentra disponible.</p>
                    )}
                  </div>

                ) : (
                  renderConceptoDetalle(cotizacionSeleccionada.concept)
                )}

                {cotizacionSeleccionada.status === 'Aprobado' && !esCliente && (
                    <div style={{ marginTop: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #16a34a', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 10px 0', color: '#16a34a', fontWeight: 'bold' }}>✅ ESTA COTIZACIÓN HA SIDO APROBADA</p>
                      {esTecnico ? (
                        <button 
                          onClick={() => navigate('/trabajos-tecnico')}
                          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}
                        >
                          <Layout size={18} /> IR A MIS TRABAJOS ASIGNADOS
                        </button>
                      ) : (
                        <button 
                          onClick={() => navigate(`/tablero-servicios?jobId=${cotizacionSeleccionada.work_order_id || cotizacionSeleccionada.service_id}`)}
                          style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                        >
                          <Layout size={18} /> IR AL TABLERO DE TRABAJO
                        </button>
                      )}
                    </div>
                  )}

                {cotizacionSeleccionada.status === 'Rechazado' && !esCliente && (
                    <div style={{ marginTop: '20px', padding: '15px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #ef4444', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 10px 0', color: '#ef4444', fontWeight: 'bold' }}>❌ ESTA COTIZACIÓN HA SIDO RECHAZADA / CANCELADA</p>
                      {cotizacionSeleccionada.is_network_quote ? (
                        <button 
                          onClick={() => navigate('/mercado-trabajos')}
                          style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)' }}
                        >
                          🌍 IR AL MERCADO PARA ENVIAR NUEVA OFERTA
                        </button>
                      ) : (
                        <button 
                          onClick={() => navigate(`/tablero-servicios?jobId=${cotizacionSeleccionada.work_order_id || cotizacionSeleccionada.service_id}`)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                        >
                          <Layout size={18} /> IR AL TABLERO PARA CANCELAR TRABAJO
                        </button>
                      )}
                    </div>
                  )}

                {(() => {
                  let subtotalItems = 0;
                  try {
                    const rawConcept = cotizacionSeleccionada.concept || cotizacionSeleccionada.concepto;
                    const detalle = typeof rawConcept === 'string' ? JSON.parse(rawConcept) : rawConcept;
                    if (detalle && typeof detalle === 'object') {
                      const listado = detalle.conceptos || detalle.servicios || [];
                      if (Array.isArray(listado)) {
                        listado.forEach(c => subtotalItems += (parseFloat(c.precio_u || c.precio || 0) * parseFloat(c.cantidad || c.cant || 1)));
                      }
                      if (Array.isArray(detalle.materiales)) {
                        detalle.materiales.forEach(m => subtotalItems += (parseFloat(m.costo_u || m.precio || 0) * parseFloat(m.cantidad || m.cant || 1)));
                      }
                      if (Array.isArray(detalle.seccionesLote)) {
                        detalle.seccionesLote.forEach(sec => {
                          if (Array.isArray(sec.conceptos)) {
                            sec.conceptos.forEach(c => subtotalItems += (parseFloat(c.precio_u || c.precio || 0) * parseFloat(c.cantidad || c.cant || 1)));
                          }
                          if (Array.isArray(sec.materiales)) {
                            sec.materiales.forEach(m => subtotalItems += (parseFloat(m.costo_u || m.precio || 0) * parseFloat(m.cantidad || m.cant || 1)));
                          }
                        });
                      }
                    }
                  } catch(e) {}
                  
                  const baseMonto = subtotalItems > 0 ? subtotalItems : parseFloat(cotizacionSeleccionada.total || cotizacionSeleccionada.estimated_amount || 0);
                  const iva = baseMonto * 0.16;
                  const subtotalConIva = baseMonto + iva;

                  const esPagadoMP = Boolean(
                    (cotizacionSeleccionada.status === 'Pagado' || cotizacionSeleccionada.payment_status === 'approved') &&
                    !cotizacionSeleccionada.cash_confirmed &&
                    !cotizacionSeleccionada.cash_requested &&
                    (cotizacionSeleccionada.mp_payment_data || cotizacionSeleccionada.metodo_pago === 'mercadopago' || cotizacionSeleccionada.payment_method === 'mercadopago')
                  );

                  const esEfectivo = Boolean(
                    cotizacionSeleccionada.cash_requested || 
                    cotizacionSeleccionada.payment_scheme === 'cash' || 
                    cotizacionSeleccionada.cash_amount_type || 
                    cotizacionSeleccionada.cash_timing || 
                    cotizacionSeleccionada.metodo_pago === 'efectivo' || 
                    cotizacionSeleccionada.payment_method === 'cash' || 
                    String(cotizacionSeleccionada.status || cotizacionSeleccionada.estado || '').toLowerCase().includes('efectivo') || 
                    String(cotizacionSeleccionada.status || cotizacionSeleccionada.estado || '').toLowerCase().includes('anticipo pagado')
                  );

                  const comisionMP = esPagadoMP ? ((subtotalConIva * 0.0349 + 4) * 1.16) : 0;
                  const totalCalc = baseMonto > 0 
                    ? (esPagadoMP ? (subtotalConIva + comisionMP) : subtotalConIva) 
                    : parseFloat(cotizacionSeleccionada.total || 0);

                  return (
                    <div className="modal-total-section cotiz-detail-total">
                      {esTecnico ? (
                        <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b' }}>
                          TOTAL DEL TRABAJO: ${(baseMonto > 0 ? baseMonto : parseFloat(cotizacionSeleccionada.total || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                      ) : baseMonto > 0 ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px', marginBottom: '8px', color: '#64748b' }}>
                            <span>Subtotal:</span>
                            <span style={{ fontWeight: 'bold' }}>${baseMonto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px', marginBottom: '8px', color: '#64748b' }}>
                            <span>IVA (16%):</span>
                            <span style={{ fontWeight: 'bold' }}>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          {esPagadoMP && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px', marginBottom: '12px', color: '#009ee3', alignItems: 'center' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <img src={mpLogo} alt="MP" style={{ height: '14px', objectFit: 'contain' }} /> Comisión (T. Oficial):
                              </span>
                              <span style={{ fontWeight: 'bold' }}>${comisionMP.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {esEfectivo && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px', marginBottom: '12px', color: '#16a34a', alignItems: 'center', fontSize: '0.82rem' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                                💵 Pago en Efectivo:
                              </span>
                              <span style={{ fontWeight: 'bold' }}>Sin Comisión MP ($0.00)</span>
                            </div>
                          )}
                          <h3 style={{ margin: 0, paddingTop: '10px', borderTop: '2px solid #cbd5e1', width: '100%', maxWidth: '300px', textAlign: 'right', fontSize: '1.4rem' }}>
                            TOTAL: ${totalCalc.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h3>
                        </>
                      ) : (
                        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>TOTAL: ${totalCalc.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                      )}
                    </div>
                  );
                })()}

                {cotizacionSeleccionada.observations && (
                  <div className="cotiz-detail-note">
                    <h4>Mensajes al cliente</h4>
                    <p>
                      {cotizacionSeleccionada.observations}
                    </p>
                  </div>
                )}

                {!esCliente && cotizacionSeleccionada.internal_observations && (
                  <div className="cotiz-detail-note interna">
                    <h4>Comentarios internos</h4>
                    <p>
                      {cotizacionSeleccionada.internal_observations}
                    </p>
                  </div>
                )}
                
                {cotizacionSeleccionada.evidence_photo_path && (
                  <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', marginTop: '15px', borderLeft: '4px solid #3b82f6' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#1e40af' }}>📷 Evidencia Fotográfica:</h4>
                    <div style={{ textAlign: 'center' }}>
                      <img 
                        src={cotizacionSeleccionada.evidence_photo_path} 
                        alt="Evidencia" 
                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'pointer', objectFit: 'contain' }} 
                        onClick={() => verPantallaCompleta(cotizacionSeleccionada.evidence_photo_path)}
                      />
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '5px 0 0 0' }}>Click para ampliar</p>
                    </div>
                  </div>
                )}

                {cotizacionSeleccionada.payment_receipt_path && (
                  <div style={{ padding: '15px', background: '#fffbeb', borderRadius: '8px', marginTop: '15px', borderLeft: '4px solid #fbbf24' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#b45309' }}>🧾 Comprobante de Pago ({cotizacionSeleccionada.payment_status || 'En Revisión'}):</h4>
                    <div style={{ textAlign: 'center' }}>
                      <img 
                        src={cotizacionSeleccionada.payment_receipt_path} 
                        alt="Comprobante de Pago" 
                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'pointer', objectFit: 'contain' }} 
                        onClick={() => verPantallaCompleta(cotizacionSeleccionada.payment_receipt_path)}
                      />
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '5px 0 10px 0' }}>Click para ampliar</p>
                      
                      {!esCliente && (cotizacionSeleccionada.status === 'Pago en Revisión' || cotizacionSeleccionada.payment_status === 'Pago en Revisión') && (
                        <button 
                          onClick={handleValidarPago}
                          disabled={procesando}
                          style={{ 
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                            color: 'white', border: 'none', padding: '12px 25px', borderRadius: '25px', 
                            fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
                            margin: '10px auto 0', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' 
                          }}
                        >
                          <CheckCircle size={20} /> 
                          {procesando ? 'VALIDANDO...' : 'VALIDAR PAGO'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* --- SECCIÓN DE CHAT DE NEGOCIACIÓN --- */}
                <div className="cotiz-detail-chat">
                  <h4>
                    <MessageCircle size={17} /> Conversación de la cotización
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                    {cotizacionSeleccionada.chat_history && cotizacionSeleccionada.chat_history.length > 0 ? (
                      cotizacionSeleccionada.chat_history.map((msg, index) => {
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
                            <div style={{ background: bgColor, padding: '10px 14px', borderRadius: '12px', maxWidth: '85%', color: '#334155', fontSize: '0.9rem', textAlign: textAlign, borderBottomRightRadius: esMio ? '2px' : '12px', borderBottomLeftRadius: !esMio ? '2px' : '12px' }}>
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

                  <div className="cotiz-detail-chat-input">
                    <input
                      type="text"
                      placeholder="Escribe un mensaje..." 
                      value={mensajeChat}
                      onChange={e => setMensajeChat(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') enviarMensajeChat(); }}
                      disabled={enviandoMensaje}
                    />
                    <button
                      type="button"
                      aria-label="Enviar mensaje"
                      onClick={enviarMensajeChat}
                      disabled={enviandoMensaje || !mensajeChat.trim()}
                    >
                      {enviandoMensaje ? '...' : <Send size={18} />}
                    </button>
                  </div>
                </div>

                {rechazando && (
                  <div style={{ padding: '15px', background: '#ffebee', borderRadius: '8px', marginTop: '15px' }}>
                    <label style={{ fontWeight: 'bold', color: '#b71c1c', display: 'block', marginBottom: '8px' }}>
                      Motivo del rechazo:
                    </label>
                    <textarea 
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ffcdd2', outline: 'none' }}
                      rows="3"
                      placeholder="Escribe por qué rechazas la cotización..."
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                    />
                  </div>
                )}

                  {/* Banner Pagado por MercadoPago */}
                  {cotizacionSeleccionada.status === 'Pagado' && !cotizacionSeleccionada.cash_confirmed && (() => {
                    const pd = cotizacionSeleccionada.mp_payment_data;
                    const formatDate = (dateStr) => {
                      if (!dateStr) return '—';
                      try {
                        return new Date(dateStr).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
                      } catch { return dateStr; }
                    };
                    return (
                      <div style={{ width: '100%', marginBottom: '20px', marginTop: '15px', border: '2px solid #4caf50', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(135deg, #1b8a5a, #2e7d32)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                            <CheckCircle size={22} />
                            <span>✅ Cotización Pagada</span>
                          </div>
                          <img src={mpLogo} alt="MercadoPago" style={{ height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                        </div>
                        <div style={{ background: '#f0faf4', padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: '0.85rem', color: '#333' }}>
                          {pd?.mp_payment_id && (
                            <div>
                              <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '2px' }}>🔖 N° de Operación</div>
                              <div style={{ fontWeight: 'bold', color: '#1b8a5a', fontFamily: 'monospace' }}>#{pd.mp_payment_id}</div>
                            </div>
                          )}
                          {pd?.amount && (
                            <div>
                              <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '2px' }}>💰 Monto Pagado</div>
                              <div style={{ fontWeight: 'bold', color: '#1b8a5a' }}>${Number(pd.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} {pd.currency || 'MXN'}</div>
                            </div>
                          )}
                          {pd?.payment_type && (
                            <div>
                              <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '2px' }}>💳 Método</div>
                              <div style={{ fontWeight: '600', color: '#333' }}>{pd.payment_type}{pd.payment_method ? ` (${pd.payment_method})` : ''}{pd.last_four_digits ? ` **** ${pd.last_four_digits}` : ''}</div>
                            </div>
                          )}
                          {pd?.payer_email && (
                            <div>
                              <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '2px' }}>📧 Correo</div>
                              <div style={{ fontWeight: '600', wordBreak: 'break-all', color: '#333' }}>{pd.payer_email}</div>
                            </div>
                          )}
                          {pd?.date_approved && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '2px' }}>📅 Fecha y Hora de Pago</div>
                              <div style={{ fontWeight: '600', color: '#333' }}>{formatDate(pd.date_approved)}</div>
                            </div>
                          )}
                          {!pd && (
                            <div style={{ gridColumn: '1 / -1', color: '#555', textAlign: 'center', padding: '8px 0' }}>
                              ✅ Pago confirmado por MercadoPago
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Banner: Comprobante de Pago en Efectivo Confirmado */}
                  {(cotizacionSeleccionada.cash_confirmed || String(cotizacionSeleccionada.status || '').toLowerCase().includes('pagado (efectivo)') || String(cotizacionSeleccionada.status || '').toLowerCase().includes('anticipo pagado')) && (() => {
                    const formatDate = (dateStr) => {
                      if (!dateStr) return '—';
                      try {
                        return new Date(dateStr).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
                      } catch { return dateStr; }
                    };
                    const statusStr = String(cotizacionSeleccionada.status || '').toLowerCase();
                    const esAnticipo = cotizacionSeleccionada.cash_amount_type === 'advance' || statusStr.includes('anticipo');
                    const labelTipo = esAnticipo ? 'Anticipo del 60% Pagado en Efectivo' : 'Cotización Pagada al 100% en Efectivo';
                    const monto = esAnticipo
                      ? (parseFloat(cotizacionSeleccionada.advance_amount) || (calcularMontoFinalNum(cotizacionSeleccionada) * 0.60))
                      : calcularMontoFinalNum(cotizacionSeleccionada);
                    const autorizador = esCliente ? 'Jorge Ernesto Vallarta (Jefe General)' : (cotizacionSeleccionada.cash_confirmed_by_name || 'Administración');
                    const fechaConfirmacion = cotizacionSeleccionada.cash_confirmed_at || cotizacionSeleccionada.advance_paid_at || cotizacionSeleccionada.remaining_paid_at || cotizacionSeleccionada.updated_at;

                    return (
                      <div style={{ width: '100%', marginBottom: '20px', marginTop: '15px', border: '2px solid #059669', borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', fontWeight: '800', fontSize: '1.05rem' }}>
                            <CheckCircle size={24} />
                            <span>💵 {labelTipo}</span>
                          </div>
                          <span style={{ background: '#ecfdf5', color: '#047857', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' }}>PAGO EN EFECTIVO</span>
                        </div>
                        <div style={{ background: '#f0faf4', padding: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', fontSize: '0.88rem', color: '#333' }}>
                          <div>
                            <div style={{ color: '#047857', fontSize: '0.78rem', fontWeight: '700', marginBottom: '2px' }}>💰 MONTO RECIBIDO EN EFECTIVO</div>
                            <div style={{ fontWeight: '800', color: '#065f46', fontSize: '1.25rem' }}>${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                          </div>
                          <div>
                            <div style={{ color: '#047857', fontSize: '0.78rem', fontWeight: '700', marginBottom: '2px' }}>👤 AUTORIZADO Y RECIBIDO POR</div>
                            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.05rem' }}>{autorizador}</div>
                          </div>
                          <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #d1fae5', paddingTop: '10px' }}>
                            <div style={{ color: '#047857', fontSize: '0.78rem', fontWeight: '700', marginBottom: '2px' }}>📅 FECHA Y HORA DE REGISTRO / AUTORIZACIÓN</div>
                            <div style={{ fontWeight: '700', color: '#334155' }}>{formatDate(fechaConfirmacion)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sección: Saldo Pendiente del 40% */}
                  {((cotizacionSeleccionada.advance_paid || String(cotizacionSeleccionada.status || '').toLowerCase().includes('anticipo pagado') || (cotizacionSeleccionada.cash_confirmed && cotizacionSeleccionada.cash_amount_type === 'advance')) && !cotizacionSeleccionada.remaining_paid && !(cotizacionSeleccionada.cash_requested && !cotizacionSeleccionada.cash_confirmed && cotizacionSeleccionada.cash_amount_type === 'remaining')) && (() => {
                    const montoRestante = parseFloat(cotizacionSeleccionada.remaining_amount) || (calcularMontoFinalNum(cotizacionSeleccionada) * 0.40);
                    let montoRestanteEf = montoRestante;

                    return (
                      <div style={{ width: '100%', marginBottom: '20px', border: '2px solid #ea580c', borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '1rem' }}>
                            <span>⏳ SALDO RESTANTE DEL 40% PENDIENTE</span>
                          </div>
                          <span style={{ background: '#fff7ed', color: '#c2410c', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800' }}>AL FINALIZAR</span>
                        </div>
                        <div style={{ background: '#fffbeb', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                          <div>
                            <div style={{ color: '#9a3412', fontSize: '0.82rem', fontWeight: '700' }}>MONTO A LIQUIDAR AL CONCLUIR EL TRABAJO:</div>
                            <div style={{ color: '#c2410c', fontSize: '1.3rem', fontWeight: '800' }}>${montoRestante.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                          </div>
                          {esCliente ? (
                            <button
                              onClick={() => setShowPagoModal(true)}
                              style={{ background: '#ea580c', color: 'white', border: 'none', padding: '12px 22px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 10px rgba(234, 88, 12, 0.3)' }}
                            >
                              💳 Liquidar Saldo (40%)
                            </button>
                          ) : !esTecnico ? (
                            <button
                              onClick={() => {
                                setCotizacionEfectivoParaConfirmar(cotizacionSeleccionada);
                                setModalConfirmarEfectivoVisible(true);
                              }}
                              style={{ background: '#16a34a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}
                            >
                              ✅ Confirmar Cobro Saldo en Efectivo
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Banner: Pago en Efectivo Solicitado — Visible para Admin y Cliente */}
                  {((cotizacionSeleccionada.cash_requested && !cotizacionSeleccionada.cash_confirmed) || String(cotizacionSeleccionada.status || '').toLowerCase().includes('efectivo solicitado')) && (() => {
                    const amountLabel = cotizacionSeleccionada.cash_amount_type === 'advance' ? 'Anticipo (60%)' : cotizacionSeleccionada.cash_amount_type === 'remaining' ? 'Saldo Restante (40%)' : 'Total (100%)';
                    const timingLabel = cotizacionSeleccionada.cash_timing === 'immediate' ? 'de forma INMEDIATA' : 'AL FINALIZAR EL TRABAJO';
                    
                    const calcularMontoEfectivoBanner = (cot) => {
                      return calcularMontoFinalNum(cot);
                    };

                    const monto = cotizacionSeleccionada.cash_amount_type === 'advance'
                      ? (parseFloat(cotizacionSeleccionada.advance_amount) || (calcularMontoEfectivoBanner(cotizacionSeleccionada) * 0.60))
                      : cotizacionSeleccionada.cash_amount_type === 'remaining'
                      ? (parseFloat(cotizacionSeleccionada.remaining_amount) || (calcularMontoEfectivoBanner(cotizacionSeleccionada) * 0.40))
                      : calcularMontoEfectivoBanner(cotizacionSeleccionada);

                    if (!esCliente && !esTecnico) {
                      return (
                        <div style={{ width: '100%', marginBottom: '20px', marginTop: '15px', border: '2px solid #f59e0b', borderRadius: '12px', overflow: 'hidden' }}>
                          <div style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.4rem' }}>💵</span>
                            <div style={{ color: 'white' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>Solicitud de Pago en Efectivo</div>
                              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>El cliente desea pagar el {amountLabel} {timingLabel}</div>
                            </div>
                          </div>
                          <div style={{ background: '#fffbeb', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '0.8rem', color: '#78350f', marginBottom: '2px' }}>Monto en efectivo a recibir:</div>
                              <div style={{ fontWeight: 'bold', fontSize: '1.15rem', color: '#92400e' }}>${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <button
                              onClick={() => {
                                setCotizacionEfectivoParaConfirmar(cotizacionSeleccionada);
                                setModalConfirmarEfectivoVisible(true);
                              }}
                              style={{ background: '#16a34a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
                            >
                              ✅ Confirmar Pago en Efectivo
                            </button>
                          </div>
                        </div>
                      );
                    } else if (esCliente) {
                      return (
                        <div style={{ width: '100%', marginBottom: '20px', marginTop: '15px', border: '2px solid #10b981', borderRadius: '12px', overflow: 'hidden' }}>
                          <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                            <span style={{ fontSize: '1.5rem' }}>💵</span>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: '1.05rem' }}>Solicitud de Pago en Efectivo Registrada</div>
                              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Acordaste pagar el {amountLabel} {timingLabel}</div>
                            </div>
                          </div>
                          <div style={{ background: '#ecfdf5', padding: '16px 18px', color: '#065f46', fontSize: '0.9rem', lineHeight: '1.5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                              Monto a entregar presencialmente: <strong style={{ fontSize: '1.1rem', color: '#047857' }}>${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                              <div style={{ fontSize: '0.82rem', marginTop: '4px', color: '#065f46' }}>Tu pago está pendiente de validación por el administrador una vez entregado.</div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

            </div>
            <div className="modal-footer-btns cotiz-detail-footer">
                  
                  {/* SECCIÓN ESPECIAL ADMIN: ACCIONES DE GENERACIÓN / DERIVACIÓN */}
                  {!esCliente && !esTecnico && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', width: '100%', marginBottom: '2px' }}>
                      {cotizacionSeleccionada.created_by_role === 'Técnico' && (
                        <button 
                          className="btn-modal-action-premium" 
                          style={{ 
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                            color: 'white', 
                            width: '100%', 
                            minHeight: '42px', 
                            padding: '10px 16px', 
                            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
                            fontSize: '0.88rem'
                          }} 
                          onClick={() => {
                            setCotizacionParaAsignar(cotizacionSeleccionada);
                            setCotizacionSeleccionada(null);
                            setShowCreateModal(true);
                          }}
                        >
                          🛠️ GENERAR COTIZACIÓN A CLIENTE
                        </button>
                      )}

                      {(() => {
                        const cotHija = cotizaciones.find(c => String(c.parent_id) === String(cotizacionSeleccionada.id));
                        if (cotHija) {
                          return (
                            <button 
                              className="btn-modal-action-premium" 
                              style={{ 
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                                color: 'white', 
                                width: '100%', 
                                minHeight: '42px', 
                                padding: '10px 16px', 
                                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
                                fontSize: '0.88rem'
                              }} 
                              onClick={() => setCotizacionSeleccionada(cotHija)}
                            >
                              <Eye size={16} color="#ffffff" strokeWidth={2.4} style={{ verticalAlign: '-3px', marginRight: '6px' }} />VER COTIZACIÓN NUEVA O ACTUALIZADA
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  {/* Seccion de Recotización / Opciones de Versión V2 */}
                  {!esCliente && (cotizacionSeleccionada.status?.toLowerCase().includes('recotiza') || cotizacionSeleccionada.estado?.toLowerCase().includes('recotiza') || cotizacionSeleccionada.recotizacionSolicitada) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginBottom: '6px', background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #fed7aa', boxShadow: '0 3px 10px rgba(249, 115, 22, 0.08)' }}>
                      <div style={{ color: '#c2410c', fontSize: '0.86rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={16} className="spin-slow" /> El cliente solicitó recotizar este servicio por caducidad.
                      </div>

                      {(() => {
                        // 1. Buscar cotización padre o antecesora en el listado de cotizaciones
                        const cotPadre = cotizacionSeleccionada.parent_id 
                          ? cotizaciones.find(c => String(c.id) === String(cotizacionSeleccionada.parent_id) || (cotizacionSeleccionada.folio && c.folio === cotizacionSeleccionada.folio.split('-V')[0])) 
                          : (cotizacionSeleccionada.folio ? cotizaciones.find(c => String(c.id) !== String(cotizacionSeleccionada.id) && c.folio === cotizacionSeleccionada.folio.split('-V')[0]) : null);

                        // 2. Extraer el técnico original o asignado (de la cotización actual, del padre o de campos técnicos)
                        const nombreTecnico = cotizacionSeleccionada.tecnico || 
                                              cotizacionSeleccionada.tecnico_nombre || 
                                              cotPadre?.tecnico || 
                                              cotPadre?.tecnico_nombre ||
                                              cotizacionSeleccionada.technician_name;

                        const tecnicoId = cotizacionSeleccionada.tecnico_id || 
                                          cotizacionSeleccionada.tecnico_user_id || 
                                          cotPadre?.tecnico_id || 
                                          cotPadre?.tecnico_user_id ||
                                          cotPadre?.created_by_user_id;

                        // Comprobar si fue hecha primero por un técnico (incluso si luego fue modificada por Admin o Root)
                        const esDelTecnico = Boolean(
                          nombreTecnico && 
                          nombreTecnico !== 'Sin Técnico' && 
                          nombreTecnico !== 'N/A' && 
                          nombreTecnico !== 'Técnico' && 
                          nombreTecnico !== 'Admin' && 
                          nombreTecnico !== 'Root' &&
                          nombreTecnico !== 'Administrador' &&
                          nombreTecnico !== 'Administrativo'
                        ) || Boolean(
                          cotizacionSeleccionada.created_by_role === 'Técnico' || 
                          cotPadre?.created_by_role === 'Técnico' ||
                          cotizacionSeleccionada.user_role === 'Técnico' ||
                          cotPadre?.user_role === 'Técnico'
                        );

                        const displayNombreTecnico = (nombreTecnico && nombreTecnico !== 'Sin Técnico' && nombreTecnico !== 'N/A' && nombreTecnico !== 'Admin' && nombreTecnico !== 'Root' && nombreTecnico !== 'Administrador' && nombreTecnico !== 'Administrativo') 
                          ? nombreTecnico 
                          : 'TÉCNICO';

                        if (esDelTecnico) {
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px', width: '100%' }}>
                              <button 
                                className="btn-modal-action-premium" 
                                style={{ 
                                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                                  color: 'white', 
                                  padding: '10px 14px', 
                                  minHeight: '40px', 
                                  fontSize: '0.85rem',
                                  fontWeight: '800',
                                  boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)'
                                }}
                                onClick={() => handleSolicitarRecotizacionATecnico({
                                  ...cotizacionSeleccionada,
                                  tecnico: displayNombreTecnico,
                                  tecnico_id: tecnicoId,
                                  tecnico_user_id: tecnicoId
                                })}
                              >
                                📩 REENVIAR A TÉCNICO ({displayNombreTecnico})
                              </button>
                              <button 
                                className="btn-modal-action-premium" 
                                style={{ 
                                  background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', 
                                  color: 'white', 
                                  padding: '10px 14px', 
                                  minHeight: '40px', 
                                  fontSize: '0.85rem',
                                  fontWeight: '800',
                                  boxShadow: '0 3px 10px rgba(234, 88, 12, 0.35)'
                                }}
                                onClick={() => {
                                  const target = cotizacionSeleccionada;
                                  setCotizacionSeleccionada(null);
                                  setCotizacionParaAsignar({ ...target, isRecotizacionV2: true });
                                  setShowCreateModal(true);
                                }}
                              >
                                ✏️ RECOTIZAR DIRECTO (CREAR V2)
                              </button>
                            </div>
                          );
                        }

                        return (
                          <button 
                            className="btn-modal-action-premium" 
                            style={{ 
                              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', 
                              color: 'white', 
                              padding: '10px 16px', 
                              minHeight: '42px', 
                              width: '100%', 
                              fontSize: '0.9rem', 
                              fontWeight: '800', 
                              boxShadow: '0 3px 10px rgba(234, 88, 12, 0.35)' 
                            }}
                            onClick={() => {
                              const target = cotizacionSeleccionada;
                              setCotizacionSeleccionada(null);
                              setCotizacionParaAsignar({ ...target, isRecotizacionV2: true });
                              setShowCreateModal(true);
                            }}
                          >
                            ✏️ RECOTIZAR Y CREAR VERSIÓN 2 (V2)
                          </button>
                        );
                      })()}
                    </div>
                  )}

                  {/* Si el usuario es Técnico y la cotización requiere recotización */}
                  {esTecnico && (cotizacionSeleccionada.status?.toLowerCase().includes('recotiza') || cotizacionSeleccionada.recotizacionSolicitada) && (
                    <div style={{ width: '100%', marginBottom: '8px' }}>
                      <button 
                        className="btn-modal-action-premium" 
                        style={{ 
                          background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', 
                          color: 'white', 
                          padding: '10px 16px', 
                          minHeight: '42px', 
                          width: '100%', 
                          fontSize: '0.9rem', 
                          fontWeight: '800', 
                          boxShadow: '0 3px 10px rgba(234, 88, 12, 0.35)' 
                        }}
                        onClick={() => {
                          const target = cotizacionSeleccionada;
                          setCotizacionSeleccionada(null);
                          setCotizacionParaAsignar({ ...target, isRecotizacionV2: true });
                          setShowCreateModal(true);
                        }}
                      >
                        <RefreshCw size={16} /> ✏️ RECOTIZAR Y CREAR VERSIÓN 2 (V2)
                      </button>
                    </div>
                  )}

                  {/* ROW: Validación de Pago (Solo Admin) */}
                  {!esCliente && !esTecnico && cotizacionSeleccionada.status === 'Pago en Revisión' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginBottom: '8px' }}>
                      {cotizacionSeleccionada.payment_receipt_path && (
                        <button 
                          className="btn-modal-action-premium" 
                          style={{ background: '#334155', color: 'white', minHeight: '40px', fontSize: '0.86rem' }} 
                          onClick={() => verPantallaCompleta(cotizacionSeleccionada.payment_receipt_path)}
                        >
                          <Eye size={16} color="#ffffff" strokeWidth={2.4} style={{ verticalAlign: '-3px', marginRight: '6px' }} />VER COMPROBANTE
                        </button>
                      )}
                      <button 
                        className="btn-modal-action-premium" 
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', minHeight: '40px', fontSize: '0.88rem', fontWeight: '800', boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)' }} 
                        onClick={handleValidarPago}
                        disabled={procesando}
                      >
                        ✅ VALIDAR PAGO
                      </button>
                    </div>
                  )}

                  {/* Si está aprobada/aceptada, mostrar botón de pagar gigante */}
                  {esCliente && (cotizacionSeleccionada.status === 'Aprobado' || cotizacionSeleccionada.status === 'Aceptada') && (
                    <button 
                      className="btn-modal-action-premium" 
                      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #009ee3 100%)', color: 'white', width: '100%', padding: '12px', fontSize: '1rem', fontWeight: '800', marginBottom: '8px', minHeight: '46px', boxShadow: '0 4px 14px rgba(0, 158, 227, 0.35)' }} 
                      onClick={() => setShowPagoModal(true)}
                    >
                      PAGAR CON <img src={mpLogo} alt="MercadoPago" style={{ height: '22px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                    </button>
                  )}

                  {/* Si está pendiente o requiere acción, mostrar Aceptar / Rechazar */}
                  {(esCliente || (!esCliente && !esTecnico && cotizacionSeleccionada.created_by_role === 'Técnico')) && 
                    (cotizacionSeleccionada.status === 'Pendiente' || cotizacionSeleccionada.status === 'En proceso' || cotizacionSeleccionada.status?.includes('Admin') || cotizacionSeleccionada.status === 'Rechazado') && 
                    !rechazando && (
                      <div style={{ display: 'grid', gridTemplateColumns: cotizacionSeleccionada.status !== 'Rechazado' ? '1fr 1fr' : '1fr', gap: '8px', width: '100%', marginBottom: '8px' }}>
                        {(cotizacionSeleccionada.status !== 'Rechazado' || esCliente) && (
                          <button 
                            className="btn-modal-action-premium" 
                            style={{ 
                              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', 
                              color: 'white', 
                              width: '100%', 
                              minHeight: '42px', 
                              padding: '8px 14px', 
                              fontWeight: '800', 
                              fontSize: '0.9rem', 
                              boxShadow: '0 3px 10px rgba(22, 163, 74, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }} 
                            onClick={(e) => handleAceptarYEnviarAlCarrito(cotizacionSeleccionada, e)}
                            disabled={procesando}
                          >
                            <CheckCircle size={17} /> ✓ ACEPTAR
                          </button>
                        )}

                        {cotizacionSeleccionada.status !== 'Rechazado' && (
                          <button 
                            className="btn-modal-action-premium" 
                            style={{ 
                              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', 
                              color: 'white', 
                              width: '100%', 
                              minHeight: '42px', 
                              padding: '8px 14px', 
                              fontWeight: '700', 
                              fontSize: '0.9rem', 
                              boxShadow: '0 3px 10px rgba(220, 38, 38, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }} 
                            onClick={() => setRechazando(true)}
                          >
                            ✕ RECHAZAR
                          </button>
                        )}
                      </div>
                    )
                  }

                  {(esCliente || (!esCliente && !esTecnico && cotizacionSeleccionada.created_by_role === 'Técnico')) && rechazando && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginBottom: '8px' }}>
                      <button 
                        className="btn-modal-action-premium" 
                        style={{ background: '#64748b', color: 'white', width: '100%', minHeight: '40px', fontWeight: '700', fontSize: '0.85rem' }} 
                        onClick={() => { setRechazando(false); setMotivoRechazo(''); }}
                      >
                        CANCELAR
                      </button>
                      <button 
                        className="btn-modal-action-premium" 
                        style={{ 
                          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', 
                          color: 'white', 
                          width: '100%', 
                          minHeight: '40px',
                          fontWeight: '800',
                          fontSize: '0.85rem',
                          boxShadow: '0 3px 10px rgba(220, 38, 38, 0.3)',
                          opacity: (procesando || !motivoRechazo.trim()) ? 0.5 : 1,
                          cursor: (procesando || !motivoRechazo.trim()) ? 'not-allowed' : 'pointer'
                        }} 
                        onClick={() => procesarCotizacion('Rechazado')}
                        disabled={procesando || !motivoRechazo.trim()}
                      >
                        CONFIRMAR RECHAZO
                      </button>
                    </div>
                  )}

                  {esTecnico && !cotizacionSeleccionada.is_network_quote && (
                    <button 
                      className="btn-modal-action-premium" 
                      style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', width: '100%', minHeight: '40px', fontWeight: '800', marginBottom: '6px', fontSize: '0.88rem', boxShadow: '0 3px 10px rgba(59, 130, 246, 0.3)' }} 
                      onClick={() => {
                        setCotizacionParaEditarTecnico(cotizacionSeleccionada);
                        setCotizacionSeleccionada(null);
                      }}
                    >
                      ✏️ EDITAR MI COTIZACIÓN
                    </button>
                  )}

                  {/* Fila de Acciones Finales: VER PDF + CERRAR */}
                  <div style={{ display: 'grid', gridTemplateColumns: cotizacionSeleccionada.type !== 'archivo' ? '1fr 1fr' : '1fr', gap: '8px', width: '100%', marginTop: '2px' }}>
                    {cotizacionSeleccionada.type !== 'archivo' && (
                      <button 
                        className="btn-modal-action-premium" 
                        style={{ 
                          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                          color: 'white', 
                          minHeight: '42px', 
                          padding: '8px 14px', 
                          fontWeight: '800', 
                          fontSize: '0.9rem',
                          boxShadow: '0 3px 10px rgba(234, 88, 12, 0.3)'
                        }} 
                        onClick={handleImprimirPDF}
                      >
                        <FileText size={18} />
                        VER PDF
                      </button>
                    )}
                    <button 
                      className="btn-modal-close-premium" 
                      style={{
                        minHeight: '42px',
                        padding: '8px 14px',
                        background: 'rgba(255, 255, 255, 0.75)',
                        color: '#0f172a',
                        border: '1.5px solid rgba(15, 23, 42, 0.12)',
                        fontSize: '0.9rem',
                        fontWeight: '800'
                      }}
                      onClick={() => { setCotizacionSeleccionada(null); setRechazando(false); setMotivoRechazo(''); }}
                    >
                      CERRAR
                    </button>
                  </div>
            </div>
          </div>
          )}
        </div>
      )}


      {showAssignModal && cotizacionParaAsignar && (
        <AssignWorkModal 
          cotizacion={cotizacionParaAsignar} 
          onClose={() => {
            setShowAssignModal(false);
            setCotizacionParaAsignar(null);
          }}
          onAssign={() => {
            setShowAssignModal(false);
            setCotizacionParaAsignar(null);
            cargarCotizaciones();
          }}
        />
      )}

      {showCreateModal && (
        <CreateQuotationModal 
          prefillData={cotizacionParaAsignar} // Pasamos la cotización de técnico si existe
          onClose={() => {
            setShowCreateModal(false);
            setCotizacionParaAsignar(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            if (cotizacionParaAsignar) {
              setFiltro('Por Pagar');
            }
            setCotizacionParaAsignar(null);
            cargarCotizaciones();
          }}
        />
      )}

      {cotizacionParaEditarTecnico && (
        <ModalCrearCotizacion 
          cotizacionExistente={cotizacionParaEditarTecnico}
          isAdmin={false}
          onClose={() => setCotizacionParaEditarTecnico(null)}
          onSuccess={() => {
            setCotizacionParaEditarTecnico(null);
            cargarCotizaciones();
          }}
        />
      )}

      {showPagoModal && cotizacionSeleccionada && (
        <Pago 
          cotizacion={cotizacionSeleccionada} 
          onClose={async () => {
            setShowPagoModal(false);
            cargarCotizaciones();
            try {
              const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacionSeleccionada.id}`);
              if (res.data) setCotizacionSeleccionada(res.data);
            } catch(e) {}
          }} 
        />
      )}

      {imagenModal && (
        <div 
          className="modal-fixed-overlay" 
          onClick={() => setImagenModal(null)}
          style={{ zIndex: 200000, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
        >
          <div 
            style={{ position: 'relative', maxWidth: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }} 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setImagenModal(null)}
              style={{
                position: 'absolute', top: '-40px', right: '0px',
                background: 'transparent', color: 'white', border: 'none',
                fontSize: '2.5rem', cursor: 'pointer', outline: 'none'
              }}
            >
              &times;
            </button>
            <img 
              src={imagenModal} 
              alt="Ampliada" 
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }} 
            />
            <button 
              onClick={() => window.open(imagenModal, '_blank')}
              style={{
                marginTop: '15px',
                background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '25px', padding: '8px 25px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '0.85rem', transition: 'background 0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              Abrir en pestaña nueva ↗
            </button>
          </div>
        </div>
      )}
      {modalConfirmarEfectivoVisible && cotizacionEfectivoParaConfirmar && (
        <ModalConfirmarPagoEfectivo
          isOpen={modalConfirmarEfectivoVisible}
          cotizacion={cotizacionEfectivoParaConfirmar}
          onClose={() => {
            setModalConfirmarEfectivoVisible(false);
            setCotizacionEfectivoParaConfirmar(null);
          }}
          onPaymentConfirmed={async (res) => {
            mostrarAviso(res?.message || '¡Pago en efectivo confirmado exitosamente!');
            await cargarCotizaciones();
            setCotizacionSeleccionada(null);
          }}
        />
      )}
    </div>
  );
};

export default VistaCotizaciones;
