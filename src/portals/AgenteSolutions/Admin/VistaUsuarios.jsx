import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft,
  User,
  LogOut,
  CalendarDays,
  Search,
  Trash2,
  Lock,
  Unlock,
  UserPlus,
  Users,
  CheckCircle2,
  Wrench,
  ChevronDown,
  Phone,
  Filter,
  Eye,
  Star,
  Edit3,
  Mail,
  MapPin,
  Shield,
  Sparkles,
  MousePointerClick
} from 'lucide-react';
import { useAuth } from "../../../context/AuthContext";
import UniversalSearch from "../../../components/Shared/UniversalSearch";
import RegisterModal from "../../../components/Auth/Register";
import ModalCalendarioCliente from "../../AgenteMarket/Cliente/ModalCalendarioCliente";
import NotificationBell from "../../../components/Shared/NotificationBell";
import defaultLogo from "../../../assets/Logo4.png";
import "../../../styles/AgenteSolutions/Admin/VistaUsuarios.css";

const MAPA_ROLES = {
  0: "ROOT",
  1: "ADMIN",
  2: "TECNICO",
  3: "CLIENTE",
  4: "AUTONOMO EMP.",
  5: "AUTONOMO PER.",
  6: "CONTRATISTA",
  7: "ADMIN. PROP.",
  8: "TECNICO RED"
};

const OPCIONES_ROLES = [
  { id: 2, label: "TÉCNICO AGENTE" },
  { id: 8, label: "TÉCNICO DE LA RED" },
  { id: 6, label: "CONTRATISTA" }
];

const getRoleStyle = (roleId) => {
  switch (Number(roleId)) {
    case 0:
      return { background: 'linear-gradient(135deg, #ffd700, #f59e0b)', color: '#000000', border: '1px solid #e5c100', textShadow: 'none' };
    case 1:
      return { background: 'linear-gradient(135deg, #ff8800, #ea580c)', color: '#ffffff', border: '1px solid rgba(255, 136, 0, 0.4)' };
    case 7:
      return { background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#ffffff', border: '1px solid rgba(217, 119, 6, 0.4)' };
    case 2:
      return { background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff', border: '1px solid rgba(2, 132, 199, 0.4)' };
    case 3:
      return { background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#ffffff', border: '1px solid rgba(22, 163, 74, 0.4)' };
    case 4:
      return { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#ffffff', border: '1px solid rgba(139, 92, 246, 0.4)' };
    case 5:
      return { background: 'linear-gradient(135deg, #f26522, #ea580c)', color: '#ffffff', border: '1px solid rgba(242, 101, 34, 0.4)' };
    case 6:
      return { background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#ffffff', border: '1px solid rgba(139, 92, 246, 0.4)' };
    case 8:
      return { background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#ffffff', border: '1px solid rgba(6, 182, 212, 0.4)' };
    default:
      return { background: 'linear-gradient(135deg, #64748b, #475569)', color: '#ffffff', border: '1px solid rgba(100, 116, 139, 0.4)' };
  }
};

const VistaUsuarios = () => {
  const navigate = useNavigate();
  const { user, logout, logoutGlobal } = useAuth();
  const [filtro, setFiltro] = useState("TODOS");
  const [cargando, setCargando] = useState(true);
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [selectedTecnicoId, setSelectedTecnicoId] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [appLogo, setAppLogo] = useState(defaultLogo);

  const dropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const isRoot = user?.role_id === 0;

  // Auto-seleccionar el primer técnico si no hay ninguno seleccionado o se filtró la lista
  useEffect(() => {
    if (usuariosFiltrados.length > 0) {
      const exists = usuariosFiltrados.some(u => u.id === selectedTecnicoId);
      if (!exists) {
        setSelectedTecnicoId(usuariosFiltrados[0].id);
      }
    } else {
      setSelectedTecnicoId(null);
    }
  }, [usuariosFiltrados]);

  // Técnico actualmente seleccionado
  const selectedTecnico = useMemo(() => {
    return usuariosFiltrados.find(u => u.id === selectedTecnicoId) || listaUsuarios.find(u => u.id === selectedTecnicoId) || null;
  }, [usuariosFiltrados, listaUsuarios, selectedTecnicoId]);

  // Cargar logo de personalización
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`)
      .then(res => {
        if (res.data?.logo_url) {
          setAppLogo(res.data.logo_url);
        } else if (res.data?.settings?.appLogo) {
          setAppLogo(res.data.settings.appLogo);
        }
      })
      .catch(() => { });
  }, []);

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const obtenerUsuarios = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios`);
      const formateados = data
        .filter(u => u.role_id === 2 || u.role_id === 8 || u.role_id === 6 || (typeof u.rol === 'string' && u.rol.includes("TECNICO")))
        .map((u) => ({
          id: u.id,
          nombre: `${u.first_name} ${u.last_name || ""}`.trim(),
          correo: u.email,
          rol: MAPA_ROLES[u.role_id] || "TECNICO",
          role_id: u.role_id,
          approval_status: u.approval_status,
          estado: u.is_active ? "Activo" : "Inactivo",
          bloqueado: u.is_active === 0,
          profile_picture_url: u.profile_picture_url,
          telefono: u.phone_number || "",
        }));
      setListaUsuarios(formateados);
    } catch (error) {
      console.error("Error al cargar los usuarios:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  const cambiarRol = async (id, nuevoRolId, nombreUsuario) => {
    if (!window.confirm(`¿Estás seguro de cambiar el tipo de usuario de ${nombreUsuario}?`)) {
      setListaUsuarios([...listaUsuarios]);
      return;
    }
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/usuarios/${id}/rol`, {
        role_id: Number(nuevoRolId)
      });
      const nuevoRolStr = MAPA_ROLES[nuevoRolId];
      setListaUsuarios(prev => prev.map(u =>
        u.id === id ? { ...u, rol: nuevoRolStr, role_id: Number(nuevoRolId) } : u
      ));
      alert("¡Rol actualizado correctamente!");
    } catch (error) {
      alert(error.response?.data?.message || "Error al actualizar el rol.");
    }
  };

  const toggleBloqueo = async (id, role_id, estaBloqueado) => {
    if (role_id === 0) return alert("⚠️ SEGURIDAD: No puedes bloquear al ROOT.");
    const accion = estaBloqueado ? "desbloquear" : "bloquear";
    if (!window.confirm(`¿Estás seguro de que deseas ${accion} a este usuario?`)) return;

    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/usuarios/${id}/toggle-bloqueo`);
      setListaUsuarios(prev => prev.map(u => u.id === id ? {
        ...u, bloqueado: !u.bloqueado, estado: !u.bloqueado ? 'Inactivo' : 'Activo'
      } : u));
    } catch (error) {
      console.error("Error al procesar la solicitud:", error);
      alert("Error al procesar la solicitud.");
    }
  };

  const eliminarUsuario = async (id, role_id) => {
    if (role_id === 0) return alert("⚠️ SEGURIDAD: No puedes eliminar al ROOT.");
    if (!window.confirm("¿Deseas eliminar este usuario? Esta acción es irreversible.")) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/usuarios/${id}`);
      setListaUsuarios(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error(error);
      alert("Hubo un problema al eliminar el usuario.");
    }
  };

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
    return MAPA_ROLES[user?.role_id] || "USUARIO";
  }, [user]);

  const userAvatar = user?.profile_picture || user?.avatar_url || user?.foto || null;
  const userInitial = user?.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : (user?.name ? user.name.charAt(0).toUpperCase() : (user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'));

  const totalTecnicos = listaUsuarios.length;
  const activosCount = useMemo(() => listaUsuarios.filter(u => !u.bloqueado).length, [listaUsuarios]);
  const bloqueadosCount = useMemo(() => listaUsuarios.filter(u => u.bloqueado).length, [listaUsuarios]);

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

  return (
    <div className="vu-root">
      {/* ── TOP NAVIGATION BAR (Matching exact modules: USUARIOS, REPORTE, COTIZACION, SERVICIOS, MERCADO / RED) ── */}
      <header className="vcp-header vu-header">
        <div className="vcp-header-left">
          <img
            src={appLogo}
            alt="Agente Solutions Logo"
            className="vcp-brand-logo"
            onClick={irAlInicio}
            title="Ir al Inicio"
          />
        </div>

        {/* Center Nav Links: INICIO + 5 modules */}
        <nav className="vcp-header-nav">
          <button className="vcp-nav-btn" onClick={irAlInicio}>
            INICIO
          </button>
          <button className="vcp-nav-btn active" onClick={() => navigate('/usuarios')}>
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

        {/* User profile section on top right: Calendar + NotificationBell + Avatar */}
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
      <main className="vu-main-container">

        {/* Top Action Header Bar */}
        <div className="vu-action-bar">
          <div className="vu-page-title-badge">
            <Users size={18} className="vu-title-icon" />
            <span>DIRECTORIO DE TÉCNICOS</span>
            <span className="vu-count-pill">{listaUsuarios.length}</span>
          </div>
        </div>

        {/* Barra Unificada: Buscador + Filtro Icono + Registrar Icono en la misma línea */}
        <div className="vu-toolbar-unified">
          {/* Buscador Universal que toma el espacio principal */}
          <div className="vu-search-unified">
            <UniversalSearch
              type="USUARIOS"
              data={listaUsuarios}
              setFilteredData={setUsuariosFiltrados}
              filtroActual={filtro}
              placeholder="BUSCAR TÉCNICO POR NOMBRE, CORREO O TELÉFONO..."
            />
          </div>

          {/* Grupo de Botones de Acción (Iconos) */}
          <div className="vu-toolbar-actions">
            {/* 1. Botón Icono Filtro con Menú Desplegable */}
            <div className="vu-filter-dropdown-wrapper" ref={filterDropdownRef}>
              <button
                type="button"
                className={`vu-icon-btn vu-icon-btn-filter ${filterDropdownOpen ? "open" : filtro !== "TODOS" ? "filtered" : ""}`}
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                title={`Filtrar técnicos (Estado actual: ${filtro})`}
              >
                <Filter size={20} />
                {filtro !== "TODOS" && (
                  <span className={`vu-filter-indicator ${filtro === "ACTIVOS" ? "green" : "red"}`} />
                )}
              </button>

              {filterDropdownOpen && (
                <div className="vu-filter-menu-dropdown vu-filter-menu-dropdown-right">
                  <button
                    type="button"
                    className={`vu-filter-menu-item ${filtro === "TODOS" ? "selected" : ""}`}
                    onClick={() => { setFiltro("TODOS"); setFilterDropdownOpen(false); }}
                  >
                    <Wrench size={14} />
                    <span>Todos los Técnicos</span>
                    <span className="vu-menu-badge">{totalTecnicos}</span>
                  </button>
                  <button
                    type="button"
                    className={`vu-filter-menu-item ${filtro === "ACTIVOS" ? "selected-green" : ""}`}
                    onClick={() => { setFiltro("ACTIVOS"); setFilterDropdownOpen(false); }}
                  >
                    <CheckCircle2 size={14} color="#10b981" />
                    <span>Activos</span>
                    <span className="vu-menu-badge green">{activosCount}</span>
                  </button>
                  <button
                    type="button"
                    className={`vu-filter-menu-item ${filtro === "BLOQUEADOS" ? "selected-red" : ""}`}
                    onClick={() => { setFiltro("BLOQUEADOS"); setFilterDropdownOpen(false); }}
                  >
                    <Lock size={14} color="#ef4444" />
                    <span>Bloqueados</span>
                    <span className="vu-menu-badge red">{bloqueadosCount}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Botón Icono Registrar Técnico */}
            <button
              type="button"
              className="vu-icon-btn vu-icon-btn-register"
              onClick={() => setShowRegisterModal(true)}
              title="Registrar nuevo técnico"
            >
              <UserPlus size={20} />
            </button>
          </div>
        </div>

        {/* Register Modal */}
        <RegisterModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={obtenerUsuarios}
        />

        {/* Calendar Modal */}
        {showModalCalendario && (
          <ModalCalendarioCliente onClose={() => setShowModalCalendario(false)} />
        )}

        {/* ── CONTENT SPLIT: TABLE ON LEFT, VERTICAL PROFILE CARD ON RIGHT ── */}
        <div className="vu-content-split">
          
          {/* Left Table Section */}
          <div className="vu-table-section">
            <div className="vu-table-card">
              <div className="vu-table-responsive-wrapper">
                <table className="vu-modern-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>NOMBRE</th>
                      <th>FOTO</th>
                      <th>ESTADO</th>
                      <th>ESPECIALIDAD</th>
                      <th>CONTACTO</th>
                      <th>CALIFICACIÓN</th>
                      <th>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan="8" className="vu-loading-cell">
                          <div className="vu-loader-content">
                            <div className="vu-spinner"></div>
                            <span>Cargando directorio de técnicos...</span>
                          </div>
                        </td>
                      </tr>
                    ) : usuariosFiltrados.length > 0 ? (
                      usuariosFiltrados.map((u) => {
                        const isSelected = selectedTecnicoId === u.id;
                        return (
                          <tr
                            key={u.id}
                            className={`${u.bloqueado ? "vu-row-blocked" : ""} ${isSelected ? "vu-row-selected" : ""}`}
                            onClick={() => setSelectedTecnicoId(u.id)}
                          >
                            {/* ID Formateado */}
                            <td data-label="ID" className="vu-id-cell">
                              <span className="vu-id-code">{String(u.id).padStart(5, '0')}</span>
                            </td>

                            {/* Nombre */}
                            <td
                              data-label="Nombre"
                              className="vu-name-cell vu-clickable-name"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTecnicoId(u.id);
                                navigate("/detalle-tecnico", { state: { tecnico: u } });
                              }}
                              title="Clic para ver detalle de perfil"
                            >
                              <div className="vu-name-block">
                                <span className="vu-user-name-title">{u.nombre}</span>
                                {u.bloqueado && <span className="vu-blocked-tag">Bloqueado</span>}
                              </div>
                            </td>

                            {/* Foto / Avatar Redondo */}
                            <td data-label="Foto" className="vu-photo-cell">
                              <div className="vu-avatar-wrap">
                                {u.profile_picture_url ? (
                                  <img src={u.profile_picture_url} alt={u.nombre} className="vu-avatar-circle" />
                                ) : (
                                  <div className="vu-avatar-circle fallback">
                                    {u.nombre ? u.nombre.charAt(0).toUpperCase() : <User size={16} />}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Estado (Online/Offline Badge) */}
                            <td data-label="Estado" className="vu-status-cell">
                              <span className={`vu-status-badge ${u.bloqueado ? "offline" : "online"}`}>
                                {u.bloqueado ? "Offline" : "Online"}
                              </span>
                            </td>

                            {/* Especialidad / Rol */}
                            <td data-label="Especialidad" className="vu-role-cell" onClick={(e) => e.stopPropagation()}>
                              {u.role_id === 0 ? (
                                <span className="vu-role-pill-root">ROOT MASTER</span>
                              ) : (
                                <div className="vu-role-select-box">
                                  <select
                                    className="vu-role-select-mockup"
                                    value={u.role_id}
                                    onChange={(e) => cambiarRol(u.id, parseInt(e.target.value), u.nombre)}
                                    title="Cambiar especialidad / rol"
                                  >
                                    {OPCIONES_ROLES.map((op) => (
                                      <option key={op.id} value={op.id} className="vu-select-option">
                                        {op.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </td>

                            {/* Contacto / Ubicación */}
                            <td data-label="Contacto" className="vu-contact-cell">
                              <div className="vu-contact-box">
                                <span className="vu-contact-item" title={u.correo}>
                                  <Mail size={12} className="vu-contact-icon" /> {u.correo}
                                </span>
                                {u.telefono && (
                                  <span className="vu-contact-item phone" title={u.telefono}>
                                    <Phone size={12} className="vu-contact-icon" /> {u.telefono}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Calificación */}
                            <td data-label="Calificación" className="vu-rating-cell">
                              <div className="vu-rating-badge">
                                <Star size={13} className="vu-star-filled" fill="#f59e0b" color="#f59e0b" />
                                <span>4.9</span>
                              </div>
                            </td>

                            {/* Acciones (Icon Buttons) */}
                            <td data-label="Acciones" className="vu-actions-cell" onClick={(e) => e.stopPropagation()}>
                              {u.role_id === 0 ? (
                                <span className="vu-protected-chip" title="Usuario con privilegios máximos">
                                  <Lock size={12} style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} />
                                  Protegido
                                </span>
                              ) : (
                                <div className="vu-mockup-actions">
                                  {/* Ver Detalle */}
                                  <button
                                    type="button"
                                    className="vu-mockup-btn view"
                                    onClick={() => navigate("/detalle-tecnico", { state: { tecnico: u } })}
                                    title="Ver detalle del perfil"
                                  >
                                    <Eye size={15} />
                                  </button>

                                  {/* Bloquear / Desbloquear */}
                                  <button
                                    type="button"
                                    className={`vu-mockup-btn ${u.bloqueado ? "unblock" : "lock"}`}
                                    onClick={() => toggleBloqueo(u.id, u.role_id, u.bloqueado)}
                                    title={u.bloqueado ? "Desbloquear técnico" : "Bloquear técnico"}
                                  >
                                    {u.bloqueado ? <Unlock size={15} /> : <Lock size={15} />}
                                  </button>

                                  {/* Eliminar */}
                                  <button
                                    type="button"
                                    className="vu-mockup-btn delete"
                                    onClick={() => eliminarUsuario(u.id, u.role_id)}
                                    title="Eliminar técnico permanentemente"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              )}
                            </td>

                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="vu-empty-cell">
                          <div className="vu-empty-state">
                            <Users size={36} className="vu-empty-icon" />
                            <p className="vu-empty-title">No se encontraron usuarios</p>
                            <p className="vu-empty-desc">Prueba cambiando el filtro o término de búsqueda.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Vertical Profile Card */}
          <aside className="vu-profile-sidebar-wrap">
            {selectedTecnico ? (
              <div className="vu-sidebar-card">
                {/* Banner Top Accent */}
                <div className="vu-sidebar-top-accent" />

                {/* Header with ID & Status */}
                <div className="vu-sidebar-card-header">
                  <div className="vu-sidebar-badge-id">
                    <span>ID #{String(selectedTecnico.id).padStart(5, '0')}</span>
                  </div>
                  <span className={`vu-status-badge ${selectedTecnico.bloqueado ? "offline" : "online"}`}>
                    <span className="vu-status-dot"></span>
                    {selectedTecnico.bloqueado ? "Inactivo" : "Disponible"}
                  </span>
                </div>

                {/* Profile Avatar & Primary Info */}
                <div className="vu-sidebar-profile-main">
                  <div className="vu-sidebar-avatar-wrap">
                    {selectedTecnico.profile_picture_url ? (
                      <img
                        src={selectedTecnico.profile_picture_url}
                        alt={selectedTecnico.nombre}
                        className="vu-sidebar-avatar-img"
                      />
                    ) : (
                      <div className="vu-sidebar-avatar-fallback">
                        {selectedTecnico.nombre ? selectedTecnico.nombre.charAt(0).toUpperCase() : <User size={32} />}
                      </div>
                    )}
                    <div className="vu-sidebar-avatar-badge" title="Técnico Verificado">
                      <CheckCircle2 size={15} color="#ffffff" />
                    </div>
                  </div>

                  <h3 className="vu-sidebar-name">{selectedTecnico.nombre}</h3>

                  <div className="vu-sidebar-role-pill" style={getRoleStyle(selectedTecnico.role_id)}>
                    {MAPA_ROLES[selectedTecnico.role_id] || "TÉCNICO"}
                  </div>

                  <div className="vu-sidebar-rating-row">
                    <div className="vu-sidebar-stars">
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    </div>
                    <span className="vu-sidebar-rating-num">4.9</span>
                    <span className="vu-sidebar-rating-reviews">(38 reseñas)</span>
                  </div>
                </div>

                {/* Details / Contact items */}
                <div className="vu-sidebar-details-list">
                  <div className="vu-sidebar-detail-item">
                    <div className="vu-sidebar-detail-icon">
                      <Mail size={15} />
                    </div>
                    <div className="vu-sidebar-detail-text">
                      <label>CORREO ELECTRÓNICO</label>
                      <span title={selectedTecnico.correo}>{selectedTecnico.correo}</span>
                    </div>
                  </div>

                  <div className="vu-sidebar-detail-item">
                    <div className="vu-sidebar-detail-icon">
                      <Phone size={15} />
                    </div>
                    <div className="vu-sidebar-detail-text">
                      <label>TELÉFONO DE CONTACTO</label>
                      <span>{selectedTecnico.telefono || "No especificado"}</span>
                    </div>
                  </div>

                  <div className="vu-sidebar-detail-item">
                    <div className="vu-sidebar-detail-icon">
                      <Shield size={15} />
                    </div>
                    <div className="vu-sidebar-detail-text">
                      <label>ESTADO DE CUENTA</label>
                      <span className={selectedTecnico.bloqueado ? "vu-text-danger" : "vu-text-success"}>
                        {selectedTecnico.bloqueado ? "Acceso Restringido / Bloqueado" : "Cuenta Verificada & Activa"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bottom */}
                <div className="vu-sidebar-actions">
                  <button
                    type="button"
                    className="vu-sidebar-btn-primary"
                    onClick={() => navigate("/detalle-tecnico", { state: { tecnico: selectedTecnico } })}
                  >
                    <Eye size={16} />
                    <span>VER PERFIL COMPLETO</span>
                  </button>

                  {selectedTecnico.role_id !== 0 && (
                    <div className="vu-sidebar-secondary-actions">
                      <button
                        type="button"
                        className={`vu-sidebar-btn-sub ${selectedTecnico.bloqueado ? "unblock" : "lock"}`}
                        onClick={() => toggleBloqueo(selectedTecnico.id, selectedTecnico.role_id, selectedTecnico.bloqueado)}
                      >
                        {selectedTecnico.bloqueado ? <Unlock size={14} /> : <Lock size={14} />}
                        <span>{selectedTecnico.bloqueado ? "Desbloquear" : "Bloquear"}</span>
                      </button>

                      <button
                        type="button"
                        className="vu-sidebar-btn-sub delete"
                        onClick={() => eliminarUsuario(selectedTecnico.id, selectedTecnico.role_id)}
                      >
                        <Trash2 size={14} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="vu-sidebar-card vu-sidebar-empty">
                <div className="vu-sidebar-top-accent" />
                <div className="vu-sidebar-empty-pill">
                  <Sparkles size={12} className="vu-sidebar-pill-icon" />
                  <span>VISTA PREVIA</span>
                </div>

                <div className="vu-sidebar-empty-orb">
                  <div className="vu-sidebar-empty-orb-inner">
                    <Users size={34} className="vu-sidebar-empty-icon" />
                  </div>
                  <div className="vu-sidebar-empty-orb-glow" />
                </div>

                <div className="vu-sidebar-empty-text-wrap">
                  <h4>Ningún Técnico Seleccionado</h4>
                  <p>Selecciona un técnico de la lista para ver su tarjeta de perfil y acciones rápidas.</p>
                </div>

                <div className="vu-sidebar-empty-hint">
                  <MousePointerClick size={13} className="vu-hint-icon" />
                  <span>Haz clic en una fila para activar</span>
                </div>
              </div>
            )}
          </aside>

        </div>

      </main>
    </div>
  );
};

export default VistaUsuarios;
