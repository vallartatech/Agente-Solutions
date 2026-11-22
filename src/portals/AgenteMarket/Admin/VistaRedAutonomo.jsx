import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER } from "../../../components/Shared/googleMapsConfig";
import Header from '../../../components/Shared/Header';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import ModalServicioAutonomo from './ModalServicioAutonomo';
import DetallePublicacionRed, { getJobScheduleStatus } from '../Cliente/DetallePublicacionRed';
import '../../../styles/AgenteMarket/Admin/VistaRedAutonomo.css';
import '../../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';
import { Plus, MapPin, Clock, User, Calendar, List, Map as MapIcon, MessageCircle, Trash2, ChevronLeft, ChevronRight, Sun, Moon, Globe, Briefcase, Maximize, Minimize, Search, SlidersHorizontal, ChevronDown, ChevronUp, Zap, Wrench, X, SearchX, BadgeCheck, Wallet } from 'lucide-react';
import { DARK_MAP_STYLES, getCategoryIcon, ICONOS_CATEGORIA, descripcionTarjeta, fechaDeseada } from '../Tecnico/MercadoTrabajos';
import { mostrarAviso, confirmarAccion } from '../../../utils/dialogos';

import AvisoCancelacionTecnico from '../Cliente/AvisoCancelacionTecnico';
import AvisoCambioHorario from '../Cliente/AvisoCambioHorario';
import { usaSelectorRed } from '../../../utils/entorno';
const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 21.0181, lng: -89.6242 }; // Mérida, Yucatán

// Los mensajes automáticos traen emojis (✅...); en la tarjeta se muestran sin ellos
const sinEmojis = (texto) => String(texto || '').replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').replace(/\s{2,}/g, ' ').trim();

const limpiarDescripcion = (rawDesc) => {
  if (!rawDesc) return 'Sin descripción adicional';
  let clean = rawDesc;
  clean = clean.replace(/\[LOTE-[A-Z0-9]+\]\s*(\(\d+\/\d+\))?\s*/gi, '');
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*(otro|Otro|ninguno|Ninguno|n\/a|N\/A)\s*/gi, '');
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*/gi, ' - Equipo: ');
  return clean.trim() || rawDesc;
};

const VistaRedAutonomo = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedJobForQuotes, setSelectedJobForQuotes] = useState(null);
  const [networkJobs, setNetworkJobs] = useState([]);
  // En celular la lista empieza abierta debajo del mapa (como Mapa en vivo); la barrita la oculta
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(true);
  // Abierta tiene dos niveles en celular: a la mitad (normal) y hasta arriba (hojaCompleta)
  const [hojaCompleta, setHojaCompleta] = useState(false);
  useEffect(() => { if (!mobileDrawerOpen) setHojaCompleta(false); }, [mobileDrawerOpen]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('en_red'); // 'en_red' | 'aceptados'

  // Buscador y menú de filtro de la tarjeta lateral (mismo diseño que Mapa en vivo)
  const [busqueda, setBusqueda] = useState('');
  // Filtro por fecha y hora: de publicación o de la visita
  const [campoFecha, setCampoFecha] = useState('publicacion'); // 'publicacion' | 'visita'
  const [filtroFecha, setFiltroFecha] = useState('');
  const [horaDesde, setHoraDesde] = useState('');
  const [horaHasta, setHoraHasta] = useState('');
  const filtroFechaActivo = Boolean(filtroFecha || horaDesde || horaHasta);
  const limpiarFiltroFecha = () => { setFiltroFecha(''); setHoraDesde(''); setHoraHasta(''); };
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const filtroRef = useRef(null);
  useEffect(() => {
    if (!filtroAbierto) return;
    const cerrar = (e) => { if (!filtroRef.current?.contains(e.target)) setFiltroAbierto(false); };
    const conTecla = (e) => { if (e.key === 'Escape') setFiltroAbierto(false); };
    document.addEventListener('pointerdown', cerrar);
    document.addEventListener('keydown', conTecla);
    return () => {
      document.removeEventListener('pointerdown', cerrar);
      document.removeEventListener('keydown', conTecla);
    };
  }, [filtroAbierto]);
  const [mapTheme, setMapTheme] = useState(() => localStorage.getItem('agente_map_theme') || 'dark');

  const alternarTemaMapa = () => {
    const next = mapTheme === 'dark' ? 'light' : 'dark';
    setMapTheme(next);
    localStorage.setItem('agente_map_theme', next);
  };

  // Pantalla completa propia del mapa (botón de vidrio, igual que Mapa en vivo).
  // Se oculta donde el navegador no la permite, p. ej. Safari de iPhone.
  const mapaSeccionRef = useRef(null);
  const [enPantallaCompleta, setEnPantallaCompleta] = useState(false);
  const puedePantallaCompleta = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  useEffect(() => {
    const cambio = () => setEnPantallaCompleta(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', cambio);
    document.addEventListener('webkitfullscreenchange', cambio);
    return () => {
      document.removeEventListener('fullscreenchange', cambio);
      document.removeEventListener('webkitfullscreenchange', cambio);
    };
  }, []);
  const salirPantallaCompleta = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  };
  const alternarPantallaCompleta = () => {
    const el = mapaSeccionRef.current;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      salirPantallaCompleta();
    } else if (el) {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    }
  };

  // Gesto táctil para subir y bajar el cajón inferior en móvil
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const pointerStartYRef = useRef(null);
  const currentDragYRef = useRef(0);
  const isDraggingSheetRef = useRef(false);
  const didDragRef = useRef(false);

  const handleSheetPointerDown = (e) => {
    if (window.innerWidth > 992) return;
    if (e.target.closest('button, input, select, textarea, a')) return;
    e.preventDefault();

    pointerStartYRef.current = e.clientY;
    currentDragYRef.current = 0;
    didDragRef.current = false;
    isDraggingSheetRef.current = true;
    setIsDraggingSheet(true);

    if (e.currentTarget?.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleSheetPointerMove = (e) => {
    if (!isDraggingSheetRef.current || pointerStartYRef.current === null) return;
    const deltaY = e.clientY - pointerStartYRef.current;
    currentDragYRef.current = deltaY;

    if (Math.abs(deltaY) > 6) {
      didDragRef.current = true;
    }

    if (mobileDrawerOpen) {
      // Abierto: al arrastrar hacia abajo (deltaY > 0) se va cerrando
      if (deltaY > 0) {
        setDragOffsetY(deltaY);
      } else {
        setDragOffsetY(deltaY * 0.2); // ligera resistencia hacia arriba
      }
    } else {
      // Plegado: al arrastrar hacia arriba (deltaY < 0) se va abriendo
      if (deltaY < 0) {
        setDragOffsetY(deltaY);
      } else {
        setDragOffsetY(deltaY * 0.2);
      }
    }
  };

  const handleSheetPointerUp = (e) => {
    if (!isDraggingSheetRef.current) return;
    const deltaY = currentDragYRef.current;

    if (!didDragRef.current) {
      // Toque simple (sin arrastre): plegada → mitad, mitad → plegada, arriba → mitad
      if (hojaCompleta) setHojaCompleta(false);
      else setMobileDrawerOpen(prev => !prev);
    } else if (mobileDrawerOpen && hojaCompleta) {
      // Hasta arriba: bajar regresa a la mitad (un jalón largo la pliega)
      if (deltaY > 220) setMobileDrawerOpen(false);
      else if (deltaY > 45) setHojaCompleta(false);
    } else if (mobileDrawerOpen) {
      // A la mitad: hacia arriba sube al segundo nivel; hacia abajo se pliega
      if (deltaY < -40) setHojaCompleta(true);
      else if (deltaY > 45) setMobileDrawerOpen(false);
    } else {
      // Si se arrastró hacia arriba más de 40px, abrir
      if (deltaY < -40) {
        setMobileDrawerOpen(true);
      }
    }

    if (e.currentTarget?.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    isDraggingSheetRef.current = false;
    pointerStartYRef.current = null;
    currentDragYRef.current = 0;
    setIsDraggingSheet(false);
    setDragOffsetY(0);
    setTimeout(() => {
      didDragRef.current = false;
    }, 120);
  };

  // Agrupar cotizaciones por técnico para consolidar el chat y ofertas
  const groupQuotesByTechnician = (quotesList, order) => {
    if (!Array.isArray(quotesList)) return [];
    const techMap = new Map();

    quotesList.forEach(quote => {
      const techId = quote.technician_id || quote.technician?.id;
      if (!techId) return;

      const techName = quote.technician?.first_name 
        ? `${quote.technician.first_name} ${quote.technician.last_name || ''}`.trim()
        : (quote.technician?.name || 'Técnico de la Red');

      const isThisQuoteAccepted = Boolean(
        quote.status === 'accepted' || 
        (order && (order.status === 'Asignado' || order.status === 'En Progreso' || order.status === 'Terminado') && Number(order.tecnico_id) === Number(techId))
      );

      const existing = techMap.get(techId);
      if (!existing) {
        const msgs = quote.chat_history || [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const hasNewTechMessage = Boolean(
          (lastMsg && Number(lastMsg.sender_id) !== Number(user?.id) && lastMsg.sender_role !== 'Cliente') ||
          (quote.message && quote.message.trim().length > 0)
        );
        const displayAlertMsg = lastMsg?.message || quote.message || '';

        techMap.set(techId, {
          ...quote,
          status: isThisQuoteAccepted ? 'accepted' : quote.status,
          is_assigned: isThisQuoteAccepted,
          allQuotes: [quote],
          lastMsg,
          hasNewTechMessage,
          displayAlertMsg,
          technicianName: techName,
        });
      } else {
        existing.allQuotes.push(quote);
        if (isThisQuoteAccepted) {
          existing.status = 'accepted';
          existing.is_assigned = true;
        }
        if (quote.id > existing.id || (quote.price > 0 && existing.price == 0)) {
          existing.id = quote.id;
          if (quote.price > 0) existing.price = quote.price;
          if (quote.message) existing.message = quote.message;
          if (quote.status === 'accepted' || existing.is_assigned) {
            existing.status = 'accepted';
            existing.is_assigned = true;
          } else if (existing.status !== 'accepted') {
            existing.status = quote.status;
          }
          existing.created_at = quote.created_at;
        }
        if (quote.chat_history && (!existing.chat_history || quote.chat_history.length > existing.chat_history.length)) {
          existing.chat_history = quote.chat_history;
        }
        const msgs = existing.chat_history || [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        existing.lastMsg = lastMsg;
        existing.hasNewTechMessage = Boolean(
          (lastMsg && Number(lastMsg.sender_id) !== Number(user?.id) && lastMsg.sender_role !== 'Cliente') ||
          (existing.message && existing.message.trim().length > 0)
        );
        existing.displayAlertMsg = lastMsg?.message || existing.message || '';
      }
    });

    const result = Array.from(techMap.values());
    result.sort((a, b) => {
      if (a.is_assigned || a.status === 'accepted') return -1;
      if (b.is_assigned || b.status === 'accepted') return 1;
      return b.id - a.id;
    });

    return result;
  };

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos?only_mine=1`, { headers });
      
      if (res.data.success) {
        const userFullName = user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name) : '';

        // Filtrar estrictamente solo las publicaciones creadas por este usuario autónomo
        const rawFiltered = res.data.data.filter(order => {
          if (!user) return false;
          if (user.role_id === 0) return true; // SuperAdmin / Root puede ver todas
          if (order.is_mine === true) return true;

          const matchesTenant = Boolean(user.tenant_id && (
            order.tenant_id == user.tenant_id || 
            order.owner_tenant_id == user.tenant_id || 
            order.property?.tenant_id == user.tenant_id
          ));
          const matchesUser = Boolean(
            order.owner_user_id == user.id || 
            order.client_id == user.id || 
            order.property?.client?.user_id == user.id || 
            order.user_id == user.id
          );
          const matchesEmail = Boolean(
            user.email && (
              order.property?.client?.email?.toLowerCase() === user.email.toLowerCase() ||
              order.client?.email?.toLowerCase() === user.email.toLowerCase()
            )
          );
          const matchesName = Boolean(
            order.owner_name && userFullName && (
              order.owner_name.toLowerCase().trim() === userFullName.toLowerCase().trim() ||
              order.owner_name.toLowerCase().includes(userFullName.toLowerCase()) ||
              userFullName.toLowerCase().includes(order.owner_name.toLowerCase())
            )
          );

          return matchesTenant || matchesUser || matchesEmail || matchesName;
        });

        const jobs = rawFiltered.map(order => {
          const rawLat = order.lat ? parseFloat(order.lat) : (order.area_lat ? parseFloat(order.area_lat) : (21.0181 + Math.sin(order.id * 17) * 0.025));
          const rawLng = order.lng ? parseFloat(order.lng) : (order.area_lng ? parseFloat(order.area_lng) : (-89.6242 + Math.cos(order.id * 17) * 0.025));
          const coloniaTexto = order.colonia_cercana || order.zona_colonia || order.zona || 'Mérida, Yucatán';
          const tituloProblema = order.type 
            ? `${order.type}${order.equipment ? ' - ' + order.equipment : ''}` 
            : 'Problema / Servicio Solicitado';

          const isGenericOwner = !order.owner_name || 
            order.owner_name === 'Cliente de la Red' || 
            order.owner_name === 'Cliente Desconocido' || 
            order.owner_name === 'Cliente de Prueba';

          const displayOwner = !isGenericOwner ? order.owner_name : (userFullName || 'Mi Solicitud');

          const fotos = [
            order.evidence_path,
            order.evidence_path_2,
            order.property?.facade_photo_path
          ].filter(Boolean);

          const groupedQuotes = groupQuotesByTechnician(order.network_quotes || [], order);
          const hasNewTechMessage = groupedQuotes.some(q => q.hasNewTechMessage);
          const lastTechMsg = groupedQuotes.find(q => q.hasNewTechMessage)?.lastMsg || null;

          const acceptedQuote = groupedQuotes.find(q => q.status === 'accepted' || q.is_assigned) || null;
          const isAccepted = Boolean(
            order.status === 'Asignado' ||
            order.status === 'En Progreso' ||
            order.status === 'Terminado' ||
            acceptedQuote ||
            order.tecnico_id
          );

          const assignedTechName = acceptedQuote?.technicianName || (order.technician ? `${order.technician.first_name} ${order.technician.last_name || ''}`.trim() : null);
          const agreedPrice = acceptedQuote?.price ? parseFloat(acceptedQuote.price) : 0;

          return {
            id: order.id,
            titulo: tituloProblema,
            tipo: order.type || 'Problema',
            equipo: order.equipment || '',
            lat: rawLat,
            lng: rawLng,
            presupuesto: "A convenir",
            estado: isAccepted ? (order.status === 'Terminado' ? 'Terminado' : 'Asignado') : (order.status || 'Por Hacer'),
            // Estado real y datos de cancelación / reenvío a la red
            status: order.status,
            tecnico_id: order.tecnico_id,
            cancellation_reason: order.cancellation_reason,
            reabierta_at: order.reabierta_at,
            is_accepted: isAccepted,
            assigned_tech_name: assignedTechName,
            agreed_price: agreedPrice,
            fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
            created_at: order.created_at,
            lugar: order.property?.property_name || 'Lugar no especificado',
            zona: coloniaTexto,
            colonia: coloniaTexto,
            calle: order.property?.address || 'Dirección no especificada',
            descripcion: limpiarDescripcion(order.description),
            foto: fotos[0] || null,
            fotos: fotos,
            cotizaciones: groupedQuotes.length,
            cotizaciones_list: groupedQuotes,
            cliente: displayOwner,
            is_mine: true,
            priority: order.priority || 'Normal',
            is_urgent: Boolean(order.is_urgent || order.priority === 'Urgente' || order.type === 'SOS'),
            scheduled_at: order.scheduled_at,
            // Llegada del técnico (el cliente la confirma) y solicitud dirigida a un favorito
            arrived_at: order.arrived_at || null,
            arrival_confirmed_at: order.arrival_confirmed_at || null,
            tecnico_dirigido_id: order.tecnico_dirigido_id || null,
            tecnico_dirigido_nombre: order.tecnico_dirigido_nombre || null,
            service_id: order.service_id,
            // Quién va a la casa (el contratista y/o los técnicos de su cuadrilla)
            equipo_en_sitio: order.equipo_en_sitio || [],
            hasNewTechMessage,
            lastTechMsg,
          };
        });

        setNetworkJobs(jobs);

        // El detalle abierto recibe el trabajo actualizado
        setSelectedJobForQuotes(prevSel => (prevSel ? (jobs.find(j => j.id === prevSel.id) || prevSel) : prevSel));
      }
    } catch (e) {
      console.error("Error fetching network jobs", e);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleDeleteJob = async (jobId) => {
    if (!await confirmarAccion("¿Estás seguro de que deseas eliminar y cancelar esta publicación de la Red? Ya no será visible para los técnicos ni recibirá más cotizaciones.")) {
      return;
    }

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        mostrarAviso("✅ Publicación eliminada y cancelada con éxito.");
        setShowQuotesModal(false);
        setSelectedJob(null);
        fetchJobs();
      } else {
        mostrarAviso(res.data?.message || "Hubo un error al eliminar.");
      }
    } catch (e) {
      console.error("Error al eliminar publicación:", e);
      mostrarAviso("Hubo un error al eliminar la publicación de la Red.");
    }
  };

  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER);

  const openQuotesModal = (job) => {
    // El modal vive fuera del mapa: en pantalla completa no se vería
    salirPantallaCompleta();
    setSelectedJobForQuotes(job);
    setShowQuotesModal(true);
  };

  // Desde una notificación (/red-autonomos?trabajo=ID): abrir ese trabajo en cuanto carguen
  // (también si el cliente ya estaba en esta pantalla y toca la notificación desde la campana)
  const location = useLocation();
  const navigate = useNavigate();
  const trabajoDelEnlaceRef = useRef(null);
  const [enlacePendiente, setEnlacePendiente] = useState(0);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('trabajo');
    if (!id) return;
    trabajoDelEnlaceRef.current = id;
    setEnlacePendiente(n => n + 1);
  }, [location.search]);
  useEffect(() => {
    const id = trabajoDelEnlaceRef.current;
    if (!id || !networkJobs.length) return;
    const job = networkJobs.find(j => String(j.id) === String(id));
    if (!job) return;
    trabajoDelEnlaceRef.current = null;
    navigate(location.pathname, { replace: true });
    if (job.is_accepted) setActiveTab('aceptados');
    openQuotesModal(job);
  }, [networkJobs, enlacePendiente]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeQuotesModal = () => {
    setShowQuotesModal(false);
    setSelectedJobForQuotes(null);
  };

  const enRedJobs = networkJobs.filter(j => !j.is_accepted);
  const aceptadosJobs = networkJobs.filter(j => j.is_accepted);
  const textoBusqueda = busqueda.trim().toLowerCase();
  const dosDigitos = (n) => String(n).padStart(2, '0');
  const coincideFechaHora = (j) => {
    if (!filtroFechaActivo) return true;
    const valor = campoFecha === 'visita' ? j.scheduled_at : j.created_at;
    if (!valor) return false;
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return false;
    const dia = `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
    const hora = `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
    if (filtroFecha && dia !== filtroFecha) return false;
    if (horaDesde && hora < horaDesde) return false;
    if (horaHasta && hora > horaHasta) return false;
    return true;
  };
  const displayedJobs = (activeTab === 'en_red' ? enRedJobs : aceptadosJobs).filter(j =>
    (!textoBusqueda ||
      [j.titulo, j.zona, j.descripcion, j.assigned_tech_name].some(v => String(v || '').toLowerCase().includes(textoBusqueda)))
    && coincideFechaHora(j)
  );

  const sidebarDragTransform = isDraggingSheet
    ? mobileDrawerOpen
      ? `translateY(${Math.max(0, dragOffsetY)}px)`
      : `translateY(calc(100% - 68px + ${Math.min(0, dragOffsetY)}px))`
    : undefined;

  return (
    <div className="mercado-container red-mapa-vivo">
      <Header title="Red de Autónomos / Mis Publicaciones" />
      
      <div className="mercado-content">
        {/* Floating Mobile Toggle Button (Tipo Uber) */}
        <button 
          className="mercado-mobile-toggle-btn"
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
        >
          {mobileDrawerOpen ? (
            <><MapIcon size={16} /> Ver Mapa</>
          ) : (
            <><List size={16} /> Ver Lista ({displayedJobs.length})</>
          )}
        </button>

        {/* Backdrop para cerrar el cajón al tocar el mapa en móvil */}
        {mobileDrawerOpen && (
          <div 
            className="mercado-mobile-drawer-backdrop"
            onClick={() => setMobileDrawerOpen(false)}
          />
        )}

        {/* ─── Map Section ─── */}
        <div ref={mapaSeccionRef} className={`mercado-map-section ${mapTheme === 'dark' ? 'es-oscuro' : ''}`}>
          {isLoaded ? (
            <>
              <div className="mercado-map-top-bar">
                <div className="mercado-map-overlay-badge">
                  <span className="mercado-map-live-dot" />
                  {activeTab === 'en_red' ? `${enRedJobs.length} en red` : `${aceptadosJobs.length} asignados`}
                </div>
              </div>

              {/* Cambiar entre mapa claro y oscuro (junto al botón de pantalla completa) */}
              <button
                type="button"
                className={`red-tema-btn ${mapTheme === 'dark' ? 'es-oscuro' : ''} ${puedePantallaCompleta ? '' : 'sin-pantalla'}`}
                onClick={alternarTemaMapa}
                title={mapTheme === 'dark' ? 'Mapa claro' : 'Mapa oscuro'}
                aria-label={mapTheme === 'dark' ? 'Cambiar a mapa claro' : 'Cambiar a mapa oscuro'}
              >
                {/* Los dos íconos siempre montados: uno sale girando y el otro entra (animación en CSS) */}
                <Moon size={18} className="red-tema-icono red-tema-luna" aria-hidden="true" />
                <Sun size={18} className="red-tema-icono red-tema-sol" aria-hidden="true" />
              </button>

              {puedePantallaCompleta && (
                <button
                  type="button"
                  className={`red-pantalla-btn ${mapTheme === 'dark' ? 'es-oscuro' : ''}`}
                  onClick={alternarPantallaCompleta}
                  title={enPantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  aria-label={enPantallaCompleta ? 'Salir de pantalla completa' : 'Ver mapa en pantalla completa'}
                >
                  {enPantallaCompleta ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              )}

              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={13}
                options={{
                  disableDefaultUI: false,
                  styles: mapTheme === 'dark' ? DARK_MAP_STYLES : [],
                  fullscreenControl: false, // se usa un botón propio de vidrio (.red-pantalla-btn)
                  mapTypeControl: false,
                  streetViewControl: false
                }}
              >
                {displayedJobs.map(job => (
                  <React.Fragment key={job.id}>
                    <Circle
                      center={{ lat: job.lat, lng: job.lng }}
                      radius={550}
                      options={{
                        fillColor: job.is_accepted ? '#16a34a' : (job.hasNewTechMessage ? '#2563eb' : (job.cotizaciones > 0 ? '#16a34a' : '#ff6600')),
                        fillOpacity: 0.16,
                        strokeColor: job.is_accepted ? '#15803d' : (job.hasNewTechMessage ? '#1d4ed8' : (job.cotizaciones > 0 ? '#15803d' : '#ea580c')),
                        strokeWeight: 1.5,
                        clickable: true
                      }}
                      onClick={() => openQuotesModal(job)}
                    />
                    <Marker
                      position={{ lat: job.lat, lng: job.lng }}
                      onClick={() => openQuotesModal(job)}
                      title={job.is_accepted ? `Asignado: ${job.titulo}` : `Zona: ${job.zona}`}
                      icon={{
                        url: job.is_accepted
                          ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                          : (job.hasNewTechMessage
                            ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                            : (job.cotizaciones > 0 
                              ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                              : 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'))
                      }}
                    />
                  </React.Fragment>
                ))}

                {selectedJob && (
                  <InfoWindow
                    position={{ lat: selectedJob.lat, lng: selectedJob.lng }}
                    onCloseClick={() => setSelectedJob(null)}
                  >
                    <div className="mercado-info-window">
                      <h4>{selectedJob.titulo}</h4>
                      <p style={{ margin: '4px 0', fontWeight: 'bold', color: selectedJob.is_accepted ? '#16a34a' : '#ff6600' }}>
                        {selectedJob.is_accepted ? '✓ Asignado a Técnico' : selectedJob.estado}
                      </p>
                      <p style={{ color: '#ea580c', fontWeight: '700' }}><MapPin size={11} /> {selectedJob.zona}</p>
                      <p><Clock size={11} /> {selectedJob.fecha}</p>
                      <button 
                        className="mercado-btn-details"
                        onClick={() => openQuotesModal(selectedJob)}
                      >
                        {selectedJob.is_accepted ? 'Ver Detalle y Coordinación' : `Ver ${selectedJob.cotizaciones} ${selectedJob.cotizaciones === 1 ? 'Cotización' : 'Cotizaciones'}`}
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>

              {/* Leyenda de colores de los marcadores */}
              <div className="red-map-legend">
                <span><i style={{ background: '#ff6600' }} /> Sin ofertas</span>
                <span><i style={{ background: '#16a34a' }} /> Con ofertas / Asignado</span>
                <span><i style={{ background: '#2563eb' }} /> Mensaje nuevo</span>
              </div>
            </>
          ) : (
            <div className="mercado-loading-map">Cargando Mapa...</div>
          )}
        </div>

        {/* ─── Sidebar (Tipo Uber) con soporte de arrastre táctil ─── */}
        <div 
          className={`mercado-sidebar ${mobileDrawerOpen ? 'mobile-open' : ''} ${mobileDrawerOpen && hojaCompleta ? 'hoja-completa' : ''} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isDraggingSheet ? 'is-dragging' : ''}`}
          style={
            isDraggingSheet && sidebarDragTransform
              ? { '--sidebar-drag-transform': sidebarDragTransform }
              : undefined
          }
        >
          
          {/* Pestaña lateral con flecha para ocultar / mostrar (Edge Tab) */}
          <button
            type="button"
            className="mercado-sidebar-edge-tab"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Mostrar panel" : "Ocultar panel"}
            aria-label={isSidebarCollapsed ? "Mostrar panel" : "Ocultar panel"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={22} color="#ffffff" strokeWidth={2.8} />
            ) : (
              <ChevronLeft size={22} color="#ffffff" strokeWidth={2.8} />
            )}
          </button>

          <div 
            className="mercado-sidebar-header"
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
            onPointerCancel={handleSheetPointerUp}
          >
            <div
              className="mercado-mobile-drag-handle"
              title={hojaCompleta ? "Desliza hacia abajo o toca para bajar" : mobileDrawerOpen ? "Desliza hacia arriba para ver más, o hacia abajo para plegar" : "Desliza hacia arriba o toca para abrir"}
            />
            {/* Solo celular: texto de la barrita (como "Ver mapa completo" de Mapa en vivo) */}
            <span className="red-grabber-txt">
              {hojaCompleta
                ? <><ChevronDown size={15} /> Ver mapa</>
                : mobileDrawerOpen
                ? <><ChevronDown size={15} /> Ver mapa completo</>
                : <><ChevronUp size={15} /> Mostrar lista ({displayedJobs.length})</>}
            </span>
          </div>

          {/* Título: fuera del encabezado para que en celular se desplace con la lista */}
          <div className="red-sidebar-head">
            <h2><Globe size={18} /> Trabajos en Red</h2>
            <p>
              <span className="mercado-map-live-dot" />
              {activeTab === 'en_red'
                ? `${enRedJobs.length} ${enRedJobs.length === 1 ? 'publicación' : 'publicaciones'} en red`
                : `${aceptadosJobs.length} ${aceptadosJobs.length === 1 ? 'trabajo asignado' : 'trabajos asignados'}`}
            </p>
          </div>

          {/* Buscador + filtro de fecha y hora */}
          <div className="red-buscador">
            <label className="red-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Buscar trabajo o colonia..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </label>

            <div className="red-filtro" ref={filtroRef}>
              <button
                type="button"
                className={`red-filtro-btn ${filtroAbierto ? 'abierto' : ''} ${filtroFechaActivo ? 'con-filtro' : ''}`}
                onClick={() => setFiltroAbierto(v => !v)}
                aria-haspopup="true"
                aria-expanded={filtroAbierto}
                title="Buscar por fecha y hora"
                aria-label="Buscar por fecha y hora"
              >
                <SlidersHorizontal size={16} />
              </button>

              {filtroAbierto && (
                <div className="red-filtro-panel red-filtro-fecha">
                  <span className="red-filtro-titulo">Buscar por fecha y hora</span>
                  <div className="red-filtro-segmento">
                    <button
                      type="button"
                      className={campoFecha === 'publicacion' ? 'activo' : ''}
                      onClick={() => setCampoFecha('publicacion')}
                    >
                      Publicación
                    </button>
                    <button
                      type="button"
                      className={campoFecha === 'visita' ? 'activo' : ''}
                      onClick={() => setCampoFecha('visita')}
                    >
                      Visita
                    </button>
                  </div>
                  <label className="red-filtro-campo">
                    <span><Calendar size={13} /> Fecha</span>
                    <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />
                  </label>
                  <div className="red-filtro-horas">
                    <label className="red-filtro-campo">
                      <span><Clock size={13} /> Desde</span>
                      <input type="time" value={horaDesde} onChange={(e) => setHoraDesde(e.target.value)} />
                    </label>
                    <label className="red-filtro-campo">
                      <span><Clock size={13} /> Hasta</span>
                      <input type="time" value={horaHasta} onChange={(e) => setHoraHasta(e.target.value)} />
                    </label>
                  </div>
                  {filtroFechaActivo && (
                    <button type="button" className="red-filtro-limpiar" onClick={limpiarFiltroFecha}>
                      <X size={14} /> Quitar filtro
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* En red / Aceptados: botones a la vista (antes estaban dentro del filtro) */}
          <div className="red-vista-botones" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'en_red'}
              className={activeTab === 'en_red' ? 'activo' : ''}
              onClick={() => setActiveTab('en_red')}
            >
              <Globe size={15} /> En red <span>{enRedJobs.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'aceptados'}
              className={activeTab === 'aceptados' ? 'activo' : ''}
              onClick={() => setActiveTab('aceptados')}
            >
              <Briefcase size={15} /> Aceptados <span>{aceptadosJobs.length}</span>
            </button>
          </div>

          {/* Acción principal a la vista (antes estaba escondida dentro del filtro) */}
          <div className="red-publicar-fila">
            <button
              type="button"
              className="red-publicar-btn"
              onClick={() => { setFiltroAbierto(false); setShowModal(true); }}
            >
              <Plus size={17} strokeWidth={2.8} /> Publicar problema
            </button>
          </div>

          <div className="mercado-job-list">
            {displayedJobs.length === 0 && (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 20px', fontSize: '14px' }}>
                {textoBusqueda || filtroFechaActivo ? (
                  <>
                    <div className="red-vacio-icono"><SearchX size={24} /></div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '700', color: '#ffffff' }}>Ningún trabajo coincide con la búsqueda o el filtro</p>
                  </>
                ) : activeTab === 'en_red' ? (
                  <>
                    <div className="red-vacio-icono"><Globe size={24} /></div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '700', color: '#ffffff' }}>No tienes publicaciones abiertas en la red</p>
                    <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>Toca "Publicar problema" para solicitar cotizaciones de técnicos.</span>
                  </>
                ) : (
                  <>
                    <div className="red-vacio-icono"><BadgeCheck size={24} /></div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '700', color: '#ffffff' }}>No tienes trabajos asignados</p>
                    <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>Cuando aceptes la cotización de un técnico, tu servicio aparecerá aquí para coordinar visita y chatear directamente.</span>
                  </>
                )}
              </div>
            )}

            {displayedJobs.map(job => {
              const cat = getCategoryIcon(job.tipo, job.titulo, job.equipo);
              const IconoCategoria = ICONOS_CATEGORIA[cat.label] || Wrench;
              const sched = job.scheduled_at ? getJobScheduleStatus(job) : null;
              const desc = descripcionTarjeta(job.descripcion);
              // Fechas legibles: "sáb 22 nov, 2:05 a.m." y "17 nov 2026"
              const visitaBonita = job.scheduled_at
                ? new Date(job.scheduled_at).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
                : '';
              const publicadoBonito = job.created_at
                ? new Date(job.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
                : '';
              const estadoVisita = !sched
                ? { texto: 'Por coordinar', tono: 'gris' }
                : sched.isRescheduleRequested
                  ? { texto: 'Cambio solicitado', tono: 'naranja' }
                  : sched.isScheduleConfirmed
                    ? { texto: 'Confirmada', tono: 'verde' }
                    : { texto: 'Por confirmar', tono: 'azul' };
              return (
                <div
                  key={job.id}
                  className={`mercado-job-card red-job-card ${job.is_accepted ? 'accepted-job' : ''} ${job.is_urgent ? 'es-urgente' : ''}`}
                  onClick={() => openQuotesModal(job)}
                >
                  {/* Encabezado: ícono de categoría, título y estado */}
                  <div className="rj-head">
                    <div
                      className="rj-avatar"
                      style={{ '--rj-cat': cat.color }}
                      title={cat.label}
                    >
                      <IconoCategoria size={19} strokeWidth={2.2} />
                    </div>

                    <div className="rj-head-text">
                      <h4 className="rj-title">{job.titulo}</h4>
                      <div className="rj-meta">
                        <span className="rj-meta-item">
                          <MapPin size={12} />
                          {job.zona}
                        </span>
                        {/* Con la visita confirmada la fecha solo se muestra una vez (aviso verde "Visita confirmada") */}
                        {job.is_urgent ? (
                          <span className="rj-chip urgente"><Zap size={11} /> Urgente</span>
                        ) : sched?.isScheduleConfirmed ? null : fechaDeseada(job.descripcion) ? (
                          <span className="rj-chip programado" title="Fecha estimada en que necesitas el trabajo">
                            <Calendar size={11} /> Para: {fechaDeseada(job.descripcion).texto}
                          </span>
                        ) : (job.scheduled_at || job.priority === 'Programado') ? (
                          <span className="rj-chip programado"><Calendar size={11} /> Programado</span>
                        ) : null}
                      </div>
                    </div>

                    <span className={`rj-estado ${job.is_accepted ? 'asignado' : ''}`}>
                      {job.is_accepted ? 'Asignado' : job.estado}
                    </span>
                  </div>

                  {desc && <p className="rj-desc">{desc}</p>}

                  {/* Aceptado: ficha con etiquetas (quién, cuánto, cuándo) */}
                  {job.is_accepted ? (
                    <div className="rj-ficha">
                      <div className="rj-ficha-fila">
                        <span className="rj-ficha-etq"><User size={13} /> Técnico</span>
                        <span className="rj-ficha-val">{job.assigned_tech_name || 'Asignado'}</span>
                      </div>
                      {job.agreed_price > 0 && (
                        <div className="rj-ficha-fila">
                          <span className="rj-ficha-etq"><Wallet size={13} /> Precio acordado</span>
                          <span className="rj-ficha-val precio">
                            ${job.agreed_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="rj-ficha-fila">
                        <span className="rj-ficha-etq"><Calendar size={13} /> Visita</span>
                        <span className="rj-ficha-val">
                          {visitaBonita || 'Sin fecha'}
                          <span className={`rj-ficha-chip ${estadoVisita.tono}`}>{estadoVisita.texto}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rj-ficha">
                      <div className="rj-ficha-fila">
                        <span className="rj-ficha-etq"><MessageCircle size={13} /> Ofertas recibidas</span>
                        <span className="rj-ficha-val">
                          {job.cotizaciones}
                          <span className={`rj-ficha-chip ${job.cotizaciones > 0 ? 'naranja' : 'gris'}`}>
                            {job.cotizaciones > 0 ? 'Por revisar' : 'Esperando técnicos'}
                          </span>
                        </span>
                      </div>
                      <div className="rj-ficha-fila">
                        <span className="rj-ficha-etq"><Clock size={13} /> Publicado</span>
                        <span className="rj-ficha-val">{publicadoBonito || job.fecha}</span>
                      </div>
                      {sched && (
                        <div className="rj-ficha-fila">
                          <span className="rj-ficha-etq"><Calendar size={13} /> Visita</span>
                          <span className="rj-ficha-val">
                            {visitaBonita}
                            <span className={`rj-ficha-chip ${estadoVisita.tono}`}>{estadoVisita.texto}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mensaje de técnico */}
                  {job.hasNewTechMessage && (
                    <div className="rj-mensaje">
                      <MessageCircle size={15} className="rj-mensaje-icono" />
                      <div className="rj-mensaje-texto">
                        <strong>Último mensaje del técnico <span className="red-msg-dot-pulse" /></strong>
                        <span>&ldquo;{sinEmojis(job.lastTechMsg?.message)}&rdquo;</span>
                      </div>
                    </div>
                  )}

                  {/* Pie: ofertas y fecha a la izquierda, acciones a la derecha */}
                  <div className="rj-footer">
                    <div className="rj-footer-info">
                      {job.is_accepted && (
                        <span className="rj-fecha" title="Fecha en que publicaste el trabajo">
                          <Clock size={11} /> Publicado {publicadoBonito || job.fecha}
                        </span>
                      )}
                    </div>

                    <div className="rj-footer-acciones">
                      {job.is_mine && !job.is_accepted && (
                        <button
                          type="button"
                          className="rj-btn-eliminar"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteJob(job.id);
                          }}
                          title="Eliminar mi publicación"
                          aria-label="Eliminar mi publicación"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <span className={`rj-btn-ver ${job.is_accepted ? 'verde' : ''}`}>
                        {job.is_accepted ? 'Coordinar' : 'Ver ofertas'}
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal para Crear / Publicar Servicio */}
      {showModal && (
        <ModalServicioAutonomo 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            fetchJobs();
          }}
        />
      )}

      {/* ─── DETALLE DE PUBLICACIÓN Y COTIZACIONES (mismo componente que el calendario) ─── */}
      {showQuotesModal && selectedJobForQuotes && (
        <DetallePublicacionRed
          key={selectedJobForQuotes.id}
          job={selectedJobForQuotes}
          user={user}
          onClose={closeQuotesModal}
          onRefresh={fetchJobs}
          onAceptada={() => setActiveTab('aceptados')}
        />
      )}

      {/* El técnico canceló: calificarlo es obligatorio y después se elige reenviar o cancelar */}
      {usaSelectorRed(user) && <AvisoCancelacionTecnico onResuelto={() => fetchJobs()} />}
      {usaSelectorRed(user) && <AvisoCambioHorario onResuelto={() => fetchJobs()} />}
    </div>
  );
};

export default VistaRedAutonomo;
