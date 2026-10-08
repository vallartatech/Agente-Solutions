import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  ChevronLeft, 
  User, 
  LogOut, 
  CalendarDays, 
  Trash2, 
  Lock, 
  Unlock, 
  UserPlus, 
  Users, 
  CheckCircle2, 
  ClipboardList,
  PlusCircle,
  Clock,
  MapPin,
  Building,
  UserCheck,
  FileText,
  X,
  Shield
} from 'lucide-react';
import { useAuth } from "../../../context/AuthContext";
import UniversalSearch from "../../../components/Shared/UniversalSearch"; 
import ModalCalendarioCliente from "../../AgenteMarket/Cliente/ModalCalendarioCliente";
import NotificationBell from "../../../components/Shared/NotificationBell";
import defaultLogo from "../../../assets/Logo4.png";
import "../../../styles/AgenteSolutions/Admin/VistaLevantamientos.css";

const VistaLevantamientos = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, logoutGlobal } = useAuth();
  const isClient = user?.role_id === 3;

  const [tabActual, setTabActual] = useState("PENDIENTES");
  const [serviciosFiltrados, setServiciosFiltrados] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados para Header y Modal Calendario
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [appLogo, setAppLogo] = useState(defaultLogo);
  const dropdownRef = useRef(null);

  // ESTADOS PARA MODAL: SOLICITAR LEVANTAMIENTO
  const [mostrarModalSolicitar, setMostrarModalSolicitar] = useState(false);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [formSolicitud, setFormSolicitud] = useState({
    property_id: location.state?.selectedPropId || "",
    supervisor_name: "",
    priority: "Media",
    description: "Solicitud de visita técnica para levantamiento de la propiedad."
  });

  // ESTADOS PARA MODAL: ASIGNACIÓN (ADMIN)
  const [mostrarAsignar, setMostrarAsignar] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [datosAsignacion, setDatosAsignacion] = useState({
    tecnico_id: "",
    fecha: "",
    hora: "",
  });

  // Estados para Modal de Detalles de Propiedad
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [detallePropiedad, setDetallePropiedad] = useState(null);

  // Estados para Modal de Reagendar (Cliente)
  const [modalClientePaso, setModalClientePaso] = useState(0);
  const [motivoReprogramar, setMotivoReprogramar] = useState("");
  const [fechaSugerida, setFechaSugerida] = useState("");

  // Cargar Logo de Personalización
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`)
      .then(res => {
        if (res.data?.logo_url) {
          setAppLogo(res.data.logo_url);
        } else if (res.data?.settings?.appLogo) {
          setAppLogo(res.data.settings.appLogo);
        }
      })
      .catch(() => {});
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // CARGAR SERVICIOS, TÉCNICOS Y PROPIEDADES
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const peticiones = [
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios`, { headers }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades`, { headers })
      ];

      if (!isClient) {
        peticiones.push(axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios/tecnicos`, { headers }));
      }

      const respuestas = await Promise.all(peticiones);
      setServicios(respuestas[0].data || []);
      setPropiedades(respuestas[1].data || []);

      if (!isClient && respuestas[2]) {
        setTecnicos(respuestas[2].data || []);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [isClient]);

  // Si se envió una propiedad seleccionada en la navegación, asignarla al formulario
  useEffect(() => {
    if (location.state?.selectedPropId) {
      setFormSolicitud(prev => ({
        ...prev,
        property_id: location.state.selectedPropId
      }));
    }
  }, [location.state]);

  // Conteo de servicios
  const pendientesCount = useMemo(() => {
    return servicios.filter(s => s.status !== "Finalizado" && s.status !== "completed").length;
  }, [servicios]);

  const finalizadosCount = useMemo(() => {
    return servicios.filter(s => s.status === "Finalizado" || s.status === "completed").length;
  }, [servicios]);

  // Nombres y roles de usuario para el header
  const userFullName = useMemo(() => {
    const parts = [user?.first_name, user?.last_name].filter(Boolean);
    if (parts.length > 0) return parts.join(' ').toUpperCase();
    if (user?.name) return user.name.toUpperCase();
    if (user?.nombre) return user.nombre.toUpperCase();
    return 'USUARIO';
  }, [user]);

  const userRoleLabel = useMemo(() => {
    if (user?.role_id === 0) return "ROOT_MASTER";
    if (user?.role_id === 1) return "ADMIN_GLOBAL";
    if (user?.role_id === 4) return "AUT_EMPRESARIAL";
    if (user?.role_id === 5) return "AUT_PERSONAL";
    if (user?.role_id === 7) return "GESTOR_INMUEBLES";
    if (user?.role_id === 2) return "TECNICO_OFICIAL";
    if (user?.role_id === 3) return "MARKET_CLIENT_PERSONAL";
    return "USUARIO";
  }, [user]);

  const userAvatar = user?.profile_picture || user?.avatar_url || user?.foto || null;
  const userInitial = user?.first_name 
    ? user.first_name.charAt(0).toUpperCase() 
    : (user?.name ? user.name.charAt(0).toUpperCase() : (user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'));

  const handleCerrarSesion = () => {
    if (logoutGlobal) logoutGlobal();
    else if (logout) logout();
    navigate("/", { replace: true });
  };

  const irAlInicio = () => {
    if (!user) return navigate('/');
    const role = Number(user.role_id);
    if (role === 0 || role === 1) navigate('/VistaRoot');
    else if (role === 4 || role === 5 || role === 7 || role === 3) navigate('/VistaMarket');
    else if (role === 2) navigate('/VistaTecnico');
    else if (role === 6 || role === 8) navigate('/mercado-trabajos');
    else navigate('/');
  };

  // --- SOLICITAR LEVANTAMIENTO ---
  const handleEnviarSolicitudLevantamiento = async (e) => {
    e.preventDefault();
    if (!formSolicitud.property_id) {
      alert("Por favor selecciona una propiedad para solicitar el levantamiento.");
      return;
    }

    setEnviandoSolicitud(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const payload = {
        property_id: formSolicitud.property_id,
        title: "Levantamiento Inicial",
        description: formSolicitud.description || "Solicitud de visita técnica para registro inicial de la propiedad.",
        priority: formSolicitud.priority || "Media",
        supervisor_name: formSolicitud.supervisor_name.trim() !== "" ? formSolicitud.supervisor_name : (userFullName || "El propietario"),
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/servicios`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (res.data?.success || res.status === 200 || res.status === 201) {
        alert("¡Levantamiento solicitado con éxito!");
        setMostrarModalSolicitar(false);
        setFormSolicitud({
          property_id: "",
          supervisor_name: "",
          priority: "Media",
          description: "Solicitud de visita técnica para levantamiento de la propiedad."
        });
        cargarDatos();
      }
    } catch (error) {
      console.error("Error al solicitar levantamiento:", error);
      alert(error.response?.data?.message || "Hubo un error al solicitar el levantamiento.");
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  // --- ASIGNACIÓN (ADMIN) ---
  const abrirAsignacion = (servicio) => {
    setServicioSeleccionado(servicio);
    setMostrarAsignar(true);
  };

  const manejarConfirmarAgenda = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const payload = {
        tecnico_id: datosAsignacion.tecnico_id,
        scheduled_start: `${datosAsignacion.fecha} ${datosAsignacion.hora}:00`,
      };

      const respuesta = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/servicios/${servicioSeleccionado.id}/asignar`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (respuesta.data.success) {
        alert("¡Visita técnica programada con éxito!");
        setMostrarAsignar(false);
        cargarDatos();
      }
    } catch (error) {
      console.error("Error al asignar técnico:", error);
      alert("Error al asignar técnico.");
    }
  };

  // --- DETALLES Y CLIENTE ---
  const verDetallesPropiedad = (item) => {
    setDetallePropiedad(item);
    setModalDetalleVisible(true);
  };

  const abrirDetallesCliente = (servicio) => {
    setServicioSeleccionado(servicio);
    setModalClientePaso(1);
    setMotivoReprogramar("");
    setFechaSugerida("");
  };

  const confirmarCitaCliente = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const respuesta = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/servicios/${servicioSeleccionado.id}/confirmar-cliente`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (respuesta.data.success) {
        alert("¡Cita confirmada! El técnico ha sido notificado.");
        setModalClientePaso(0);
        cargarDatos();
      }
    } catch (error) {
      alert("Error al confirmar la cita.");
    }
  };

  const enviarReprogramacion = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const payload = {
        fecha_sugerida: fechaSugerida,
        motivo: motivoReprogramar,
      };
      const respuesta = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/servicios/${servicioSeleccionado.id}/solicitar-reprogramacion`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (respuesta.data.success) {
        alert("Solicitud enviada. El administrador revisará tu nueva fecha.");
        setModalClientePaso(0);
        cargarDatos();
      }
    } catch (error) {
      alert("Error al solicitar reprogramación.");
    }
  };

  return (
    <div className="lev-root">
      {/* ── TOP MASTER MENU NAVBAR ── */}
      <header className="vcp-header lev-header-nav">
        <div className="vcp-header-left">
          <img 
            src={appLogo} 
            alt="Agente Solutions Logo" 
            className="vcp-brand-logo"
            onClick={irAlInicio} 
            title="Ir al Inicio"
          />
        </div>

        {/* Navigation Links: INICIO + 5 core modules */}
        <nav className="vcp-header-nav">
          <button className="vcp-nav-btn" onClick={irAlInicio}>
            INICIO
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/usuarios')}>
            USUARIOS
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/reportes-globales')}>
            REPORTE
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/vista-cotizaciones')}>
            COTIZACION
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/tablero-servicios')}>
            SERVICIOS
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/red-autonomos')}>
            MERCADO / RED
          </button>
        </nav>

        {/* User Profile on top right: Calendar + NotificationBell + Avatar */}
        <div className="vcp-header-right" ref={dropdownRef}>
          <div className="vcp-header-actions-group">
            <button 
              type="button"
              className="vcp-nav-icon-btn" 
              title="Abrir Calendario y Citas"
              onClick={() => setShowModalCalendario(true)}
            >
              <CalendarDays size={18} strokeWidth={2.2} />
            </button>

            <NotificationBell />
          </div>

          <button 
            className="vcp-avatar-btn" 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            title="Opciones de perfil"
            aria-label="Perfil"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Avatar" className="vcp-avatar-img" />
            ) : (
              <div className="vcp-avatar-initial">{userInitial}</div>
            )}
          </button>

          {profileDropdownOpen && (
            <div className="vcp-profile-dropdown">
              <div className="vcp-dropdown-user-header">
                <div className="vcp-dropdown-role-pill">
                  <Shield size={12} className="vcp-dropdown-role-icon" />
                  <span>{userRoleLabel}</span>
                </div>
                <div className="vcp-dropdown-user-name">{userFullName}</div>
                {user?.email && (
                  <div className="vcp-dropdown-user-email">{user.email}</div>
                )}
              </div>

              <div className="vcp-dropdown-divider" />

              <button 
                className="vcp-dropdown-item" 
                onClick={() => { setProfileDropdownOpen(false); navigate('/mi-perfil'); }}
              >
                <User size={16} /> Mi Perfil
              </button>
              <button 
                className="vcp-dropdown-item logout" 
                onClick={() => { 
                  setProfileDropdownOpen(false); 
                  handleCerrarSesion();
                }}
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="lev-main-container">
        
        {/* Top Action Bar */}
        <div className="lev-action-bar">
          <button 
            type="button"
            className="lev-btn-regresar" 
            onClick={() => navigate(-1)} 
            title="Volver a la vista anterior"
          >
            <ChevronLeft size={19} strokeWidth={2.8} />
            <span>REGRESAR</span>
          </button>

          <div className="lev-page-title-badge">
            <ClipboardList size={18} className="lev-title-icon" />
            <span>DIRECTORIO DE LEVANTAMIENTOS</span>
            <span className="lev-count-pill">{servicios.length}</span>
          </div>
        </div>

        {/* ── BOTONES DE FILTRO Y SOLICITUD ── */}
        <div className="lev-filter-grid">
          <button
            type="button"
            className={`lev-filter-pill ${tabActual === "PENDIENTES" ? "active" : ""}`}
            onClick={() => setTabActual("PENDIENTES")}
            title="Ver visitas técnicas pendientes"
          >
            <Clock size={16} />
            <span>VISITAS PENDIENTES ({pendientesCount})</span>
          </button>

          <button
            type="button"
            className={`lev-filter-pill ${tabActual === "REALIZADOS" ? "active-completed" : ""}`}
            onClick={() => setTabActual("REALIZADOS")}
            title="Ver levantamientos finalizados"
          >
            <CheckCircle2 size={16} />
            <span>FINALIZADOS ({finalizadosCount})</span>
          </button>

          {/* BOTÓN SOLICITAR LEVANTAMIENTO */}
          <button
            type="button"
            className="lev-filter-pill lev-action-pill-solicitar"
            onClick={() => setMostrarModalSolicitar(true)}
            title="Solicitar nuevo levantamiento para una propiedad"
          >
            <PlusCircle size={17} />
            <span>SOLICITAR LEVANTAMIENTO</span>
          </button>
        </div>

        {/* ── UNIVERSAL SEARCH IN DARK GLASS ── */}
        <div className="lev-search-wrapper">
          <UniversalSearch 
            data={servicios}
            setFilteredData={setServiciosFiltrados}
            placeholder="BUSCAR POR PROPIEDAD, ID O ESTADO..."
            filtroActual={tabActual}
            type="LEVANTAMIENTOS"
          />
        </div>

        {/* ── LIQUID GLASS TABLE ── */}
        <div className="lev-table-card">
          <div className="lev-table-responsive-wrapper">
            <table className="lev-modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>PROPIEDAD</th>
                  <th>PRIORIDAD</th>
                  {tabActual === "PENDIENTES" ? <th>ESTADO</th> : <th>TÉCNICO</th>}
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan="5" className="lev-empty-state">
                      <div className="vu-spinner" style={{ margin: '0 auto 10px auto' }}></div>
                      <span>Cargando levantamientos...</span>
                    </td>
                  </tr>
                ) : serviciosFiltrados.length > 0 ? (
                  serviciosFiltrados.map((s) => (
                    <tr key={s.id}>
                      {/* ID */}
                      <td>
                        <span className="lev-id-badge">#{s.id || "0"}</span>
                      </td>

                      {/* Propiedad */}
                      <td className="lev-prop-cell" onClick={() => verDetallesPropiedad(s)}>
                        <span className="lev-prop-name">
                          {s.title === "Levantamiento Inicial" && s.cliente_nombre 
                            ? `Levantamiento de ${s.cliente_nombre}` 
                            : (s.propiedad_nombre || s.title)}
                        </span>
                        {s.direccion && <span className="lev-prop-client">{s.direccion}</span>}
                      </td>

                      {/* Prioridad */}
                      <td>
                        <span className={`lev-prio-badge lev-prio-${(s.priority || 'media').toLowerCase()}`}>
                          {s.priority || "Media"}
                        </span>
                      </td>

                      {/* Estado / Técnico */}
                      <td>
                        {tabActual === "PENDIENTES" ? (
                          <span className={`lev-status-chip ${
                            s.status === 'Reprogramación Solicitada' ? 'reschedule' :
                            s.status === 'Visita Confirmada' ? 'confirmed' :
                            s.assigned_to ? 'programmed' : 'pending'
                          }`}>
                            {s.status === 'Reprogramación Solicitada' ? 'Pide Reprogramar' :
                             s.status === 'Visita Confirmada' ? 'Confirmada' :
                             s.assigned_to ? 'Programado' : 'Por Asignar'}
                          </span>
                        ) : (
                          <span style={{ fontWeight: '700', color: '#e2e8f0' }}>
                            {s.tecnico_nombre || "Técnico Agente"}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td>
                        {tabActual === "REALIZADOS" ? (
                          <button 
                            type="button"
                            className="lev-btn-table-action report"
                            onClick={() => navigate(`/detalle-reporte/${s.id}`)}
                          >
                            <FileText size={14} />
                            <span>Ver Reporte</span>
                          </button>
                        ) : isClient ? (
                          <button 
                            type="button"
                            className="lev-btn-table-action view-details"
                            onClick={() => {
                              if (s.assigned_to && s.status !== 'Reprogramación Solicitada' && s.status !== 'Visita Confirmada') {
                                abrirDetallesCliente(s);
                              }
                            }}
                            disabled={!s.assigned_to || s.status === 'Reprogramación Solicitada' || s.status === 'Visita Confirmada'}
                          >
                            {s.status === 'Reprogramación Solicitada' ? 'Reprogramando' :
                             s.status === 'Visita Confirmada' ? 'Cita Confirmada' :
                             s.assigned_to ? 'Ver Cita' : 'En Revisión'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="lev-btn-table-action schedule"
                            onClick={() => abrirAsignacion(s)}
                          >
                            <CalendarDays size={14} />
                            <span>Programar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="lev-empty-state">
                      <ClipboardList size={36} className="lev-empty-icon" />
                      <p className="lev-empty-title">
                        {isClient ? "Aún no has solicitado ningún levantamiento" : "No hay servicios en esta sección"}
                      </p>
                      <p className="lev-empty-desc">
                        Haz clic en "SOLICITAR LEVANTAMIENTO" para crear una nueva visita técnica.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* ── MODAL: SOLICITAR LEVANTAMIENTO ── */}
      {mostrarModalSolicitar && (
        <div className="lev-modal-overlay" onClick={() => setMostrarModalSolicitar(false)}>
          <div className="lev-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lev-modal-header">
              <div className="lev-modal-title">
                <PlusCircle size={22} color="#F26522" />
                <span>SOLICITAR LEVANTAMIENTO TÉCNICO</span>
              </div>
              <button 
                type="button" 
                className="lev-modal-close" 
                onClick={() => setMostrarModalSolicitar(false)}
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEnviarSolicitudLevantamiento}>
              <div className="lev-form-group">
                <label className="lev-form-label">SELECCIONAR PROPIEDAD *</label>
                <select
                  className="lev-form-select"
                  required
                  value={formSolicitud.property_id}
                  onChange={(e) => setFormSolicitud({ ...formSolicitud, property_id: e.target.value })}
                >
                  <option value="">-- Selecciona un inmueble --</option>
                  {propiedades.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_propiedad || p.property_name || `Propiedad #${p.id}`} {p.direccion ? `- ${p.direccion}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lev-form-group">
                <label className="lev-form-label">SUPERVISOR / CONTACTO EN SITIO (OPCIONAL)</label>
                <input
                  type="text"
                  className="lev-form-input"
                  placeholder="Ej. Ing. Juan Pérez / Propietario"
                  value={formSolicitud.supervisor_name}
                  onChange={(e) => setFormSolicitud({ ...formSolicitud, supervisor_name: e.target.value })}
                />
              </div>

              <div className="lev-form-group">
                <label className="lev-form-label">PRIORIDAD DEL SERVICIO</label>
                <select
                  className="lev-form-select"
                  value={formSolicitud.priority}
                  onChange={(e) => setFormSolicitud({ ...formSolicitud, priority: e.target.value })}
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media (Estándar)</option>
                  <option value="Alta">Alta (Urgente)</option>
                </select>
              </div>

              <div className="lev-form-group">
                <label className="lev-form-label">NOTAS / INSTRUCCIONES ADICIONALES</label>
                <textarea
                  className="lev-form-textarea"
                  rows={3}
                  placeholder="Detalles sobre acceso, horarios preferidos o requerimientos..."
                  value={formSolicitud.description}
                  onChange={(e) => setFormSolicitud({ ...formSolicitud, description: e.target.value })}
                />
              </div>

              <button 
                type="submit" 
                className="lev-btn-submit-modal" 
                disabled={enviandoSolicitud || propiedades.length === 0}
              >
                {enviandoSolicitud ? "ENVIANDO SOLICITUD..." : "CONFIRMAR Y SOLICITAR LEVANTAMIENTO"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AGENDAR VISITA TÉCNICA (ADMIN) ── */}
      {mostrarAsignar && !isClient && (
        <div className="lev-modal-overlay" onClick={() => setMostrarAsignar(false)}>
          <div className="lev-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lev-modal-header">
              <div className="lev-modal-title">
                <CalendarDays size={22} color="#F26522" />
                <span>AGENDAR VISITA TÉCNICA</span>
              </div>
              <button 
                type="button" 
                className="lev-modal-close" 
                onClick={() => setMostrarAsignar(false)}
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '16px' }}>
              Servicio: <strong style={{ color: '#fff' }}>{servicioSeleccionado?.title}</strong>
            </p>

            <form onSubmit={manejarConfirmarAgenda}>
              <div className="lev-form-group">
                <label className="lev-form-label">TÉCNICO RESPONSABLE *</label>
                <select
                  className="lev-form-select"
                  required
                  value={datosAsignacion.tecnico_id}
                  onChange={(e) => setDatosAsignacion({ ...datosAsignacion, tecnico_id: e.target.value })}
                >
                  <option value="">Seleccione un técnico...</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name || ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lev-form-group">
                <label className="lev-form-label">FECHA DE VISITA *</label>
                <input
                  type="date"
                  className="lev-form-input"
                  required
                  value={datosAsignacion.fecha}
                  onChange={(e) => setDatosAsignacion({ ...datosAsignacion, fecha: e.target.value })}
                />
              </div>

              <div className="lev-form-group">
                <label className="lev-form-label">HORARIO SUGERIDO *</label>
                <input
                  type="time"
                  className="lev-form-input"
                  required
                  value={datosAsignacion.hora}
                  onChange={(e) => setDatosAsignacion({ ...datosAsignacion, hora: e.target.value })}
                />
              </div>

              <button type="submit" className="lev-btn-submit-modal">
                PROGRAMAR Y NOTIFICAR
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR / REAGENDAR VISITA (CLIENTE) ── */}
      {modalClientePaso > 0 && servicioSeleccionado && (
        <div className="lev-modal-overlay" onClick={() => setModalClientePaso(0)}>
          <div className="lev-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lev-modal-header">
              <div className="lev-modal-title">
                <CalendarDays size={22} color="#F26522" />
                <span>{modalClientePaso === 1 ? "DETALLES DE VISITA TÉCNICA" : "SOLICITAR REPROGRAMACIÓN"}</span>
              </div>
              <button 
                type="button" 
                className="lev-modal-close" 
                onClick={() => setModalClientePaso(0)}
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {modalClientePaso === 1 ? (
              <div>
                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '14px' }}>
                  Un técnico ha sido asignado para tu visita técnica:
                </p>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem' }}>
                    <strong>Técnico:</strong> {servicioSeleccionado.tecnico_nombre || "Técnico Agente"}
                  </p>
                  <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem' }}>
                    <strong>Fecha & Hora:</strong> {servicioSeleccionado.scheduled_start || "Por definir"}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    <strong>Propiedad:</strong> {servicioSeleccionado.propiedad_nombre || servicioSeleccionado.direccion}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button 
                    type="button" 
                    className="lev-btn-submit-modal" 
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', marginTop: 0 }}
                    onClick={confirmarCitaCliente}
                  >
                    CONFIRMAR CITA
                  </button>
                  <button 
                    type="button" 
                    className="lev-btn-submit-modal" 
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', marginTop: 0 }}
                    onClick={() => setModalClientePaso(2)}
                  >
                    REAGENDAR
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={enviarReprogramacion}>
                <div className="lev-form-group">
                  <label className="lev-form-label">NUEVA FECHA Y HORA SUGERIDA *</label>
                  <input
                    type="datetime-local"
                    className="lev-form-input"
                    required
                    value={fechaSugerida}
                    onChange={(e) => setFechaSugerida(e.target.value)}
                  />
                </div>

                <div className="lev-form-group">
                  <label className="lev-form-label">MOTIVO DEL CAMBIO (OPCIONAL)</label>
                  <textarea
                    className="lev-form-textarea"
                    rows={3}
                    placeholder="Ej. Tuve una emergencia familiar o no estaré en ese horario..."
                    value={motivoReprogramar}
                    onChange={(e) => setMotivoReprogramar(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button 
                    type="button" 
                    className="lev-btn-submit-modal" 
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', marginTop: 0 }}
                    onClick={() => setModalClientePaso(1)}
                  >
                    VOLVER
                  </button>
                  <button 
                    type="submit" 
                    className="lev-btn-submit-modal" 
                    style={{ marginTop: 0 }}
                  >
                    ENVIAR SOLICITUD
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: DETALLES DE PROPIEDAD ── */}
      {modalDetalleVisible && detallePropiedad && (
        <div className="lev-modal-overlay" onClick={() => setModalDetalleVisible(false)}>
          <div className="lev-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lev-modal-header">
              <div className="lev-modal-title">
                <Building size={22} color="#F26522" />
                <span>DETALLES DE LA PROPIEDAD</span>
              </div>
              <button 
                type="button" 
                className="lev-modal-close" 
                onClick={() => setModalDetalleVisible(false)}
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {detallePropiedad.foto_fachada && (
              <div style={{ width: '100%', height: '200px', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
                <img 
                  src={detallePropiedad.foto_fachada} 
                  alt="Fachada" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>NOMBRE</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: '700', fontSize: '1rem', color: '#fff' }}>
                  {detallePropiedad.propiedad_nombre || detallePropiedad.title}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>DIRECCIÓN</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '0.9rem', color: '#cbd5e1' }}>
                  {detallePropiedad.direccion || "No especificada"}
                </p>
              </div>

              {detallePropiedad.cliente_nombre && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>CLIENTE / PROPIETARIO</span>
                  <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '0.9rem', color: '#cbd5e1' }}>
                    {detallePropiedad.cliente_nombre}
                  </p>
                </div>
              )}

              {detallePropiedad.description && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>NOTAS / INSTRUCCIONES</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px' }}>
                    {detallePropiedad.description}
                  </p>
                </div>
              )}
            </div>

            <button 
              type="button" 
              className="lev-btn-submit-modal" 
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', marginTop: '20px' }}
              onClick={() => setModalDetalleVisible(false)}
            >
              CERRAR
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: CALENDARIO ── */}
      {showModalCalendario && (
        <ModalCalendarioCliente onClose={() => setShowModalCalendario(false)} />
      )}
    </div>
  );
};

export default VistaLevantamientos;
