import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
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
  MousePointerClick,
  Briefcase,
  Building2,
  HardHat,
  Crown
} from 'lucide-react';
import { useAuth } from "../../../context/AuthContext";
import UniversalSearch from "../../../components/Shared/UniversalSearch";
import RegisterModal from "../../../components/Auth/Register";
import Header from "../../../components/Shared/Header";
import "../../../styles/AgenteSolutions/Admin/VistaUsuarios.css";

const MAPA_ROLES = {
  0: "ROOT MASTER",
  1: "ADMINISTRADOR GLOBAL",
  2: "TÉCNICO AGENTE",
  3: "CLIENTE",
  4: "AUTÓNOMO EMPRESARIAL",
  5: "AUTÓNOMO PERSONAL",
  6: "CONTRATISTA",
  7: "ADMIN. PROPIEDADES",
  8: "TÉCNICO DE LA RED"
};

// Opciones de rol asignables (ROOT no es asignable desde la interfaz por seguridad)
const OPCIONES_ROLES = [
  { id: 1, label: "ADMINISTRADOR (AGENTE)" },
  { id: 2, label: "TÉCNICO AGENTE" },
  { id: 7, label: "ADMIN. PROPIEDADES (AGENTE)" },
  { id: 3, label: "CLIENTE" },
  { id: 8, label: "TÉCNICO DE LA RED" },
  { id: 6, label: "CONTRATISTA" },
  { id: 4, label: "AUTÓNOMO EMPRESARIAL" },
  { id: 5, label: "AUTÓNOMO PERSONAL" }
];

const getRoleStyle = (roleId) => {
  switch (Number(roleId)) {
    case 0:
      return { background: 'linear-gradient(135deg, #ffd700, #f59e0b)', color: '#000000', border: '1px solid #e5c100', textShadow: 'none', fontWeight: '900' };
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
      return { background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#ffffff', border: '1px solid rgba(13, 148, 136, 0.4)' };
    case 8:
      return { background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#ffffff', border: '1px solid rgba(6, 182, 212, 0.4)' };
    default:
      return { background: 'linear-gradient(135deg, #64748b, #475569)', color: '#ffffff', border: '1px solid rgba(100, 116, 139, 0.4)' };
  }
};

const VistaUsuarios = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filtro, setFiltro] = useState("TODOS");
  const [cargando, setCargando] = useState(true);
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [selectedTecnicoId, setSelectedTecnicoId] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const filterDropdownRef = useRef(null);
  const isRoot = Number(user?.role_id) === 0;

  // Auto-seleccionar el primer usuario si no hay ninguno seleccionado o se filtró la lista
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

  // Usuario actualmente seleccionado en el panel lateral
  const selectedTecnico = useMemo(() => {
    return usuariosFiltrados.find(u => u.id === selectedTecnicoId) || listaUsuarios.find(u => u.id === selectedTecnicoId) || null;
  }, [usuariosFiltrados, listaUsuarios, selectedTecnicoId]);

  // Cerrar dropdown de filtro al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const isClientPortalUser = Number(user?.role_id) === 3;

  const obtenerUsuarios = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios`, { headers });
      
      const formateados = (data || []).map((u) => {
        const roleId = Number(u.role_id ?? 3);
        const isClient = roleId === 3 || String(u.id).startsWith('c_');
        const cleanName = `${u.first_name || u.name || ''} ${u.last_name || ''}`.trim() || 'Usuario sin nombre';
        const cleanPhone = u.phone_number || u.phone || '';
        const isBlocked = u.is_active === 0 || u.is_active === false || u.is_active === '0';

        return {
          id: u.id,
          rawId: String(u.id).replace(/\D/g, ''),
          nombre: cleanName,
          correo: u.email || 'Sin correo',
          rol: MAPA_ROLES[roleId] || (isClient ? 'CLIENTE' : 'USUARIO'),
          role_id: roleId,
          approval_status: u.approval_status,
          estado: isBlocked ? "Inactivo" : "Activo",
          bloqueado: isBlocked,
          profile_picture_url: u.profile_picture_url || u.profile_picture,
          telefono: cleanPhone,
          address: u.address || u.direccion || '',
          isCliente: isClient,
          specialties: u.specialties || [],
          rating_stars_avg: Number(u.rating_stars_avg || 5.0),
          rating_time_avg: Number(u.rating_time_avg || 5.0),
          total_reviews_count: Number(u.total_reviews_count || 0),
          my_review: u.my_review || null,
          jobs_count: Number(u.jobs_count || 0)
        };
      });

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

  // Cambiar Rol de Usuario
  const cambiarRol = async (id, nuevoRolId, nombreUsuario) => {
    const rolNombre = MAPA_ROLES[nuevoRolId] || `Rol ${nuevoRolId}`;
    const confirmacion = await Swal.fire({
      title: '¿Cambiar Rol?',
      text: `¿Deseas cambiar el rol de ${nombreUsuario} a "${rolNombre}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f26522',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, cambiar rol',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) {
      setListaUsuarios([...listaUsuarios]);
      return;
    }

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/usuarios/${id}/rol`, {
        role_id: Number(nuevoRolId)
      }, { headers });

      const nuevoRolStr = MAPA_ROLES[nuevoRolId] || "USUARIO";
      setListaUsuarios(prev => prev.map(u =>
        u.id === id ? { ...u, rol: nuevoRolStr, role_id: Number(nuevoRolId), isCliente: Number(nuevoRolId) === 3 } : u
      ));

      Swal.fire({
        icon: 'success',
        title: '¡Rol Actualizado!',
        text: `El usuario ahora tiene el rol "${nuevoRolStr}".`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || "Error al actualizar el rol.", 'error');
    }
  };

  // Alternar Estatus (Activar / Bloquear)
  const toggleBloqueo = async (id, role_id, estaBloqueado) => {
    if (role_id === 0) {
      return Swal.fire('Acción no permitida', 'No puedes bloquear al usuario ROOT.', 'warning');
    }

    const accion = estaBloqueado ? "activar / desbloquear" : "bloquear / inactivar";
    const confirmacion = await Swal.fire({
      title: `¿${estaBloqueado ? 'Activar' : 'Bloquear'} cuenta?`,
      text: `¿Deseas ${accion} el acceso de este usuario?`,
      icon: estaBloqueado ? 'info' : 'warning',
      showCancelButton: true,
      confirmButtonColor: estaBloqueado ? '#16a34a' : '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: estaBloqueado ? 'Sí, Activar' : 'Sí, Bloquear',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/usuarios/${id}/toggle-bloqueo`, {}, { headers });

      setListaUsuarios(prev => prev.map(u => u.id === id ? {
        ...u, bloqueado: !u.bloqueado, estado: !u.bloqueado ? 'Inactivo' : 'Activo'
      } : u));

      Swal.fire({
        icon: 'success',
        title: estaBloqueado ? 'Cuenta Activada' : 'Cuenta Bloqueada',
        text: `El estatus del usuario ha sido actualizado con éxito.`,
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error al procesar el cambio de estatus:", error);
      Swal.fire('Error', 'No se pudo actualizar el estatus.', 'error');
    }
  };

  const eliminarUsuario = async (id, role_id) => {
    if (role_id === 0) return Swal.fire('Seguridad', 'No puedes eliminar al usuario ROOT.', 'warning');

    const confirmacion = await Swal.fire({
      title: '¿Eliminar Usuario?',
      text: 'Esta acción es irreversible y eliminará el acceso de este usuario.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Eliminar Permanentemente',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/usuarios/${id}`, { headers });
      setListaUsuarios(prev => prev.filter(u => u.id !== id));
      Swal.fire('Eliminado', 'El usuario ha sido eliminado correctamente.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un problema al eliminar el usuario.', 'error');
    }
  };

  const handleVerExpediente = (u) => {
    setSelectedTecnicoId(u.id);
    if (Number(u.role_id) === 3 || String(u.id).startsWith('c_')) {
      navigate('/detalle-cliente', { state: { cliente: u, u } });
    } else {
      navigate('/detalle-tecnico', { state: { tecnico: u, u } });
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

  // Conteos por categoría adaptados para Cliente vs Admin
  const countClientes = useMemo(() => listaUsuarios.filter(u => Number(u.role_id) === 3 || String(u.id).startsWith('c_')).length, [listaUsuarios]);
  const countTecnicosAgente = useMemo(() => listaUsuarios.filter(u => Number(u.role_id) === 2).length, [listaUsuarios]);
  const countTecnicosRed = useMemo(() => listaUsuarios.filter(u => Number(u.role_id) === 8).length, [listaUsuarios]);
  const countCalificados = useMemo(() => listaUsuarios.filter(u => u.my_review !== null).length, [listaUsuarios]);
  const countContratistas = useMemo(() => listaUsuarios.filter(u => Number(u.role_id) === 6).length, [listaUsuarios]);
  const countAutonomos = useMemo(() => listaUsuarios.filter(u => Number(u.role_id) === 4 || Number(u.role_id) === 5).length, [listaUsuarios]);
  const countAdmins = useMemo(() => listaUsuarios.filter(u => Number(u.role_id) === 1 || Number(u.role_id) === 7 || Number(u.role_id) === 0).length, [listaUsuarios]);
  const activosCount = useMemo(() => listaUsuarios.filter(u => !u.bloqueado).length, [listaUsuarios]);
  const bloqueadosCount = useMemo(() => listaUsuarios.filter(u => u.bloqueado).length, [listaUsuarios]);

  return (
    <div className="vu-root">
      {/* ── SHARED HEADER BAR WITH MOBILE BOTTOM NAV ── */}
      <Header activeModule="usuarios" />

      {/* ── MAIN CONTENT AREA ── */}
      <main className="vu-main-container">

        {/* Top Action Header Bar */}
        <div className="vu-action-bar">
          <div className="vu-page-title-badge">
            <Users size={18} className="vu-title-icon" />
            <span>{isClientPortalUser ? "DIRECTORIO DE TÉCNICOS & HISTORIAL" : "DIRECTORIO GENERAL DE USUARIOS"}</span>
            <span className="vu-count-pill">{listaUsuarios.length}</span>
          </div>
        </div>

        {/* Barra Unificada: Buscador + Filtro Icono + Registrar Icono */}
        <div className="vu-toolbar-unified">
          <div className="vu-search-unified">
            <UniversalSearch
              type="USUARIOS"
              data={listaUsuarios}
              setFilteredData={setUsuariosFiltrados}
              filtroActual={filtro}
              placeholder={isClientPortalUser ? "BUSCAR TÉCNICO POR NOMBRE, ESPECIALIDAD, CORREO O TELÉFONO..." : "BUSCAR USUARIO POR NOMBRE, CORREO, TELÉFONO O ROL..."}
            />
          </div>

          <div className="vu-toolbar-actions">
            {/* Botón Icono Filtro con Menú Desplegable */}
            <div className="vu-filter-dropdown-wrapper" ref={filterDropdownRef}>
              <button
                type="button"
                className={`vu-icon-btn vu-icon-btn-filter ${filterDropdownOpen ? "open" : filtro !== "TODOS" ? "filtered" : ""}`}
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                title={`Filtrar usuarios (Estado actual: ${filtro})`}
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
                    <Users size={14} />
                    <span>{isClientPortalUser ? "Todos los Técnicos" : "Todos los Usuarios"}</span>
                    <span className="vu-menu-badge">{listaUsuarios.length}</span>
                  </button>

                  <button
                    type="button"
                    className={`vu-filter-menu-item ${filtro === "TECNICOS_AGENTE" ? "selected" : ""}`}
                    onClick={() => { setFiltro("TECNICOS_AGENTE"); setFilterDropdownOpen(false); }}
                  >
                    <Wrench size={14} color="#0284c7" />
                    <span>{isClientPortalUser ? "Mis Técnicos Agente" : "Técnicos Agente"}</span>
                    <span className="vu-menu-badge">{countTecnicosAgente}</span>
                  </button>

                  <button
                    type="button"
                    className={`vu-filter-menu-item ${filtro === "TECNICOS_RED" ? "selected" : ""}`}
                    onClick={() => { setFiltro("TECNICOS_RED"); setFilterDropdownOpen(false); }}
                  >
                    <Wrench size={14} color="#06b6d4" />
                    <span>Técnicos de la Red</span>
                    <span className="vu-menu-badge">{countTecnicosRed}</span>
                  </button>

                  {isClientPortalUser && (
                    <button
                      type="button"
                      className={`vu-filter-menu-item ${filtro === "CALIFICADOS" ? "selected" : ""}`}
                      onClick={() => { setFiltro("CALIFICADOS"); setFilterDropdownOpen(false); }}
                    >
                      <Star size={14} color="#f59e0b" fill="#f59e0b" />
                      <span>Historial de Calificados</span>
                      <span className="vu-menu-badge">{countCalificados}</span>
                    </button>
                  )}

                  {!isClientPortalUser && (
                    <>
                      <button
                        type="button"
                        className={`vu-filter-menu-item ${filtro === "CLIENTES" ? "selected" : ""}`}
                        onClick={() => { setFiltro("CLIENTES"); setFilterDropdownOpen(false); }}
                      >
                        <User size={14} color="#16a34a" />
                        <span>Clientes</span>
                        <span className="vu-menu-badge">{countClientes}</span>
                      </button>

                      <button
                        type="button"
                        className={`vu-filter-menu-item ${filtro === "CONTRATISTAS" ? "selected" : ""}`}
                        onClick={() => { setFiltro("CONTRATISTAS"); setFilterDropdownOpen(false); }}
                      >
                        <HardHat size={14} color="#0d9488" />
                        <span>Contratistas</span>
                        <span className="vu-menu-badge">{countContratistas}</span>
                      </button>

                      <button
                        type="button"
                        className={`vu-filter-menu-item ${filtro === "AUTONOMOS" ? "selected" : ""}`}
                        onClick={() => { setFiltro("AUTONOMOS"); setFilterDropdownOpen(false); }}
                      >
                        <Briefcase size={14} color="#8b5cf6" />
                        <span>Autónomos</span>
                        <span className="vu-menu-badge">{countAutonomos}</span>
                      </button>

                      <button
                        type="button"
                        className={`vu-filter-menu-item ${filtro === "ADMINS" ? "selected" : ""}`}
                        onClick={() => { setFiltro("ADMINS"); setFilterDropdownOpen(false); }}
                      >
                        <Shield size={14} color="#ea580c" />
                        <span>Administradores</span>
                        <span className="vu-menu-badge">{countAdmins}</span>
                      </button>
                    </>
                  )}

                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />

                  <button
                    type="button"
                    className={`vu-filter-menu-item ${filtro === "ACTIVOS" ? "selected-green" : ""}`}
                    onClick={() => { setFiltro("ACTIVOS"); setFilterDropdownOpen(false); }}
                  >
                    <CheckCircle2 size={14} color="#10b981" />
                    <span>Activos</span>
                    <span className="vu-menu-badge green">{activosCount}</span>
                  </button>

                  {!isClientPortalUser && (
                    <button
                      type="button"
                      className={`vu-filter-menu-item ${filtro === "BLOQUEADOS" ? "selected-red" : ""}`}
                      onClick={() => { setFiltro("BLOQUEADOS"); setFilterDropdownOpen(false); }}
                    >
                      <Lock size={14} color="#ef4444" />
                      <span>Bloqueados / Inactivos</span>
                      <span className="vu-menu-badge red">{bloqueadosCount}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Botón Icono Registrar Usuario (Solo Admin/Root) */}
            {!isClientPortalUser && (
              <button
                type="button"
                className="vu-icon-btn vu-icon-btn-register"
                onClick={() => setShowRegisterModal(true)}
                title="Registrar nuevo usuario"
              >
                <UserPlus size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Chips de Categorías Rápidas */}
        <div className="vu-category-chips-bar">
          {(isClientPortalUser ? [
            { key: 'TODOS', label: 'Todos los Técnicos', icon: '👥', count: listaUsuarios.length },
            { key: 'TECNICOS_AGENTE', label: 'Téc. Agente', icon: '🛠️', count: countTecnicosAgente },
            { key: 'TECNICOS_RED', label: 'Téc. de la Red', icon: '🌐', count: countTecnicosRed },
            { key: 'CALIFICADOS', label: 'Historial / Calificados', icon: '⭐', count: countCalificados },
            { key: 'ACTIVOS', label: 'Disponibles', icon: '🟢', count: activosCount },
          ] : [
            { key: 'TODOS', label: 'Todos', icon: '👥', count: listaUsuarios.length },
            { key: 'CLIENTES', label: 'Clientes', icon: '👤', count: countClientes },
            { key: 'TECNICOS_AGENTE', label: 'Téc. Agente', icon: '🛠️', count: countTecnicosAgente },
            { key: 'TECNICOS_RED', label: 'Téc. de la Red', icon: '🌐', count: countTecnicosRed },
            { key: 'CONTRATISTAS', label: 'Contratistas', icon: '🏗️', count: countContratistas },
            { key: 'AUTONOMOS', label: 'Autónomos', icon: '💼', count: countAutonomos },
            { key: 'ADMINS', label: 'Administradores', icon: '🛡️', count: countAdmins },
            { key: 'ACTIVOS', label: 'Activos', icon: '🟢', count: activosCount },
            { key: 'BLOQUEADOS', label: 'Bloqueados', icon: '🔒', count: bloqueadosCount },
          ]).map(chip => (
            <button
              key={chip.key}
              type="button"
              className={`vu-category-chip ${filtro === chip.key ? 'active' : ''}`}
              onClick={() => setFiltro(chip.key)}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
              <span className="vu-chip-count">{chip.count}</span>
            </button>
          ))}
        </div>

        {/* Register Modal */}
        {!isClientPortalUser && (
          <RegisterModal
            isOpen={showRegisterModal}
            onClose={() => setShowRegisterModal(false)}
            onSuccess={obtenerUsuarios}
          />
        )}

        {/* ── CONTENT SPLIT: TABLE ON LEFT, VERTICAL PROFILE CARD ON RIGHT ── */}
        <div className="vu-content-split">
          
          {/* Left Table Section */}
          <div className="vu-table-section">
            <div className="vu-table-card">
              <div className="vu-table-card-topbar">
                <div className="vu-table-title-group">
                  <Users size={16} className="vu-table-icon" />
                  <span className="vu-table-title">{isClientPortalUser ? "TÉCNICOS DISPONIBLES" : "LISTA DE USUARIOS"}</span>
                  <span className="vu-table-badge-count">{usuariosFiltrados.length}</span>
                </div>
                <span className="vu-table-hint-swipe">↔ Desliza la tabla</span>
              </div>
              <div className="vu-table-responsive-wrapper">
                <table className="vu-modern-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>NOMBRE</th>
                      <th>FOTO</th>
                      <th>ESTADO (ESTATUS)</th>
                      <th>ROL / TIPO</th>
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
                            <span>Cargando directorio...</span>
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
                              <span className="vu-id-code">{String(u.rawId || String(u.id).replace(/\D/g, '') || u.id).padStart(5, '0')}</span>
                            </td>

                            {/* Nombre */}
                            <td
                              data-label="Nombre"
                              className="vu-name-cell vu-clickable-name"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerExpediente(u);
                              }}
                              title="Clic para ver expediente"
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

                            {/* Estado / Estatus Interactivo */}
                            <td data-label="Estado" className="vu-status-cell" onClick={(e) => e.stopPropagation()}>
                              {isClientPortalUser ? (
                                <span
                                  className={`vu-status-pill-btn ${u.bloqueado ? "offline" : "online"}`}
                                  style={{ cursor: 'default' }}
                                >
                                  <span className="vu-status-dot"></span>
                                  {u.bloqueado ? "No disponible" : "Disponible"}
                                </span>
                              ) : isRoot ? (
                                <button
                                  type="button"
                                  className={`vu-status-pill-btn ${u.bloqueado ? "offline" : "online"}`}
                                  onClick={() => toggleBloqueo(u.id, u.role_id, u.bloqueado)}
                                  title={u.bloqueado ? "Cuenta Inactiva / Bloqueada (Clic para Activar)" : "Cuenta Activa (Clic para Bloquear)"}
                                >
                                  <span className="vu-status-dot"></span>
                                  {u.bloqueado ? "Inactivo" : "Activo"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={`vu-status-pill-btn ${u.bloqueado ? "offline" : "online"}`}
                                  onClick={() => toggleBloqueo(u.id, u.role_id, u.bloqueado)}
                                  title={u.bloqueado ? "Inactivo (Clic para Activar)" : "Activo (Clic para Bloquear / Inactivar)"}
                                >
                                  <span className="vu-status-dot"></span>
                                  {u.bloqueado ? "Inactivo" : "Activo"}
                                </button>
                              )}
                            </td>

                            {/* Rol / Tipo de Usuario */}
                            <td data-label="Rol" className="vu-role-cell" onClick={(e) => e.stopPropagation()}>
                              {Number(u.role_id) === 0 ? (
                                <span className="vu-role-pill-root" title="Usuario con privilegios máximos protegidos">
                                  👑 ROOT MASTER
                                </span>
                              ) : isRoot ? (
                                <div className="vu-role-select-box">
                                  <select
                                    className="vu-role-select-mockup"
                                    value={u.role_id}
                                    onChange={(e) => cambiarRol(u.id, parseInt(e.target.value), u.nombre)}
                                    title="Cambiar rol del usuario (Solo Root)"
                                    style={getRoleStyle(u.role_id)}
                                  >
                                    {OPCIONES_ROLES.map((op) => (
                                      <option key={op.id} value={op.id} className="vu-select-option">
                                        {op.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <span
                                  className="vu-role-badge-static"
                                  style={{
                                    ...getRoleStyle(u.role_id),
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '6px 14px',
                                    borderRadius: '12px',
                                    fontSize: '0.76rem',
                                    fontWeight: '800',
                                    letterSpacing: '0.4px',
                                    textTransform: 'uppercase',
                                    userSelect: 'none'
                                  }}
                                  title={`Rol: ${MAPA_ROLES[u.role_id] || u.rol}`}
                                >
                                  {MAPA_ROLES[u.role_id] || u.rol}
                                </span>
                              )}
                            </td>

                            {/* Contacto */}
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

                            {/* Calificación Dual: ⭐ Calidad y ⏱️ Relojes de Puntualidad */}
                            <td data-label="Calificación" className="vu-rating-cell">
                              <div className="vu-rating-dual-badge">
                                <div className="vu-rating-dual-item" title="Calidad promedio del trabajo">
                                  <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                  <span>{u.rating_stars_avg.toFixed(1)}</span>
                                </div>
                                <div className="vu-rating-dual-item" title="Puntualidad promedio de llegada">
                                  <Clock size={12} color="#06b6d4" />
                                  <span>{u.rating_time_avg.toFixed(1)}</span>
                                </div>
                              </div>
                              {u.my_review && (
                                <div>
                                  <span className="vu-my-review-pill" title={`Calificado por ti: ⭐ ${u.my_review.rating_stars} / ⏱️ ${u.my_review.rating_time}`}>
                                    ⭐ {u.my_review.rating_stars} ⏱️ {u.my_review.rating_time}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Acciones */}
                            <td data-label="Acciones" className="vu-actions-cell" onClick={(e) => e.stopPropagation()}>
                              <div className="vu-mockup-actions">
                                {/* Ver Expediente */}
                                <button
                                  type="button"
                                  className="vu-mockup-btn view"
                                  onClick={() => handleVerExpediente(u)}
                                  title="Ver expediente e historial"
                                >
                                  <Eye size={15} />
                                </button>

                                {!isClientPortalUser && u.role_id !== 0 && (isRoot || u.id !== user?.id) && (
                                  <>
                                    <button
                                      type="button"
                                      className={`vu-mockup-btn ${u.bloqueado ? "unblock" : "lock"}`}
                                      onClick={() => toggleBloqueo(u.id, u.role_id, u.bloqueado)}
                                      title={u.bloqueado ? "Desbloquear cuenta" : "Bloquear cuenta"}
                                    >
                                      {u.bloqueado ? <Unlock size={15} /> : <Lock size={15} />}
                                    </button>

                                    <button
                                      type="button"
                                      className="vu-mockup-btn delete"
                                      onClick={() => eliminarUsuario(u.id, u.role_id)}
                                      title="Eliminar usuario permanentemente"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>

                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="vu-empty-cell">
                          <div className="vu-empty-state">
                            <Users size={36} className="vu-empty-icon" />
                            <p className="vu-empty-title">No se encontraron técnicos</p>
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
                <div className="vu-sidebar-top-accent" />

                {/* Header with ID & Status */}
                <div className="vu-sidebar-card-header">
                  <div className="vu-sidebar-badge-id">
                    <span>ID #{String(selectedTecnico.rawId || String(selectedTecnico.id).replace(/\D/g, '') || selectedTecnico.id).padStart(5, '0')}</span>
                  </div>
                  <span className={`vu-status-badge ${selectedTecnico.bloqueado ? "offline" : "online"}`}>
                    <span className="vu-status-dot"></span>
                    {selectedTecnico.bloqueado ? "Inactivo" : "Activo"}
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
                    <div className="vu-sidebar-avatar-badge" title="Usuario Verificado">
                      <CheckCircle2 size={15} color="#ffffff" />
                    </div>
                  </div>

                  <h3 className="vu-sidebar-name">{selectedTecnico.nombre}</h3>

                  <div className="vu-sidebar-role-pill" style={getRoleStyle(selectedTecnico.role_id)}>
                    {MAPA_ROLES[selectedTecnico.role_id] || "USUARIO"}
                  </div>

                  {/* Promedios Generales de Calificación */}
                  <div className="vu-sidebar-rating-row" style={{ marginTop: '8px' }}>
                    <div className="vu-sidebar-stars">
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <span className="vu-sidebar-rating-num">{selectedTecnico.rating_stars_avg.toFixed(1)} ⭐</span>
                    </div>
                    <div className="vu-sidebar-stars" style={{ marginLeft: '10px' }}>
                      <Clock size={14} color="#06b6d4" />
                      <span className="vu-sidebar-rating-num" style={{ color: '#06b6d4' }}>{selectedTecnico.rating_time_avg.toFixed(1)} ⏱️</span>
                    </div>
                    <span className="vu-sidebar-rating-reviews">({selectedTecnico.total_reviews_count} opiniones)</span>
                  </div>
                </div>

                {/* HISTORIAL DE CALIFICACIÓN DEL CLIENTE (READ-ONLY) */}
                {isClientPortalUser ? (
                  selectedTecnico.my_review ? (
                    <div className="vu-client-rating-history-card">
                      <div className="vu-client-rating-history-header">
                        <Lock size={13} color="#f26522" />
                        <span>Tu Calificación Registrada (Fija)</span>
                      </div>

                      <div className="vu-client-rating-breakdown">
                        <div className="vu-rating-stat-box">
                          <span className="vu-stat-label">⭐ Calidad de Trabajo:</span>
                          <div className="vu-stars-readonly">
                            {[1, 2, 3, 4, 5].map(st => (
                              <Star
                                key={st}
                                size={13}
                                fill={st <= selectedTecnico.my_review.rating_stars ? "#f59e0b" : "none"}
                                color="#f59e0b"
                              />
                            ))}
                            <span className="vu-rating-val">{selectedTecnico.my_review.rating_stars}/5</span>
                          </div>
                        </div>

                        <div className="vu-rating-stat-box">
                          <span className="vu-stat-label">⏱️ Puntualidad de Llegada:</span>
                          <div className="vu-clocks-readonly">
                            {[1, 2, 3, 4, 5].map(ck => (
                              <Clock
                                key={ck}
                                size={13}
                                color={ck <= selectedTecnico.my_review.rating_time ? "#06b6d4" : "#475569"}
                              />
                            ))}
                            <span className="vu-rating-val" style={{ color: '#06b6d4' }}>{selectedTecnico.my_review.rating_time}/5</span>
                          </div>
                        </div>
                      </div>

                      {selectedTecnico.my_review.comment && (
                        <div className="vu-client-review-comment">
                          <span className="vu-comment-label">Tu Opinión / Motivo:</span>
                          <p>"{selectedTecnico.my_review.comment}"</p>
                        </div>
                      )}

                      <div className="vu-client-review-footer">
                        <span>📅 {selectedTecnico.my_review.created_at}</span>
                        <span>🔨 {selectedTecnico.jobs_count || 1} servicio(s)</span>
                      </div>

                      <p className="vu-readonly-disclaimer">
                        🔒 Esta calificación es definitiva y queda grabada en el historial de servicio.
                      </p>
                    </div>
                  ) : (
                    <div className="vu-client-rating-pending-card">
                      <Sparkles size={16} color="#f26522" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <h4>Sin Calificación Registrada</h4>
                        <p>Aún no has evaluado a este técnico. Cuando finalices un trabajo o se cancele, el sistema te solicitará su calificación de puntualidad y estrellas.</p>
                      </div>
                    </div>
                  )
                ) : (
                  /* Panel de Control de Root/Admin */
                  <div className="vu-sidebar-control-panel">
                    <label className="vu-sidebar-control-label">
                      {isRoot ? "⚙️ Control de Estatus & Rol (Root)" : "⚙️ Gestión de Usuario"}
                    </label>

                    {Number(selectedTecnico.role_id) === 0 ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.14)',
                        border: '1.5px solid rgba(245, 158, 11, 0.4)',
                        color: '#b45309',
                        fontWeight: '800',
                        fontSize: '0.8rem'
                      }}>
                        <Crown size={16} color="#d97706" />
                        <span>CUENTA PROTEGIDA (ROOT MASTER)</span>
                      </div>
                    ) : isRoot ? (
                      <>
                        <div style={{ marginBottom: '8px' }}>
                          <select
                            className="vu-sidebar-role-select"
                            value={selectedTecnico.role_id}
                            onChange={(e) => cambiarRol(selectedTecnico.id, parseInt(e.target.value), selectedTecnico.nombre)}
                            title="Cambiar rol del usuario (Solo Root)"
                          >
                            {OPCIONES_ROLES.map((op) => (
                              <option key={op.id} value={op.id}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          className={`vu-sidebar-status-toggle-btn ${selectedTecnico.bloqueado ? "to-activate" : "to-block"}`}
                          onClick={() => toggleBloqueo(selectedTecnico.id, selectedTecnico.role_id, selectedTecnico.bloqueado)}
                        >
                          {selectedTecnico.bloqueado ? (
                            <>
                              <Unlock size={14} />
                              <span>Activar / Desbloquear Cuenta</span>
                            </>
                          ) : (
                            <>
                              <Lock size={14} />
                              <span>Bloquear / Inactivar Cuenta</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={`vu-sidebar-status-toggle-btn ${selectedTecnico.bloqueado ? "to-activate" : "to-block"}`}
                        onClick={() => toggleBloqueo(selectedTecnico.id, selectedTecnico.role_id, selectedTecnico.bloqueado)}
                      >
                        {selectedTecnico.bloqueado ? (
                          <>
                            <Unlock size={14} />
                            <span>Activar / Desbloquear Técnico</span>
                          </>
                        ) : (
                          <>
                            <Lock size={14} />
                            <span>Bloquear / Inactivar Técnico</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

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
                      <label>ESTADO DEL TÉCNICO</label>
                      <span className={selectedTecnico.bloqueado ? "vu-text-danger" : "vu-text-success"}>
                        {selectedTecnico.bloqueado ? "No disponible para servicios" : "Verificado & Activo para servicios"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bottom */}
                <div className="vu-sidebar-actions">
                  {selectedTecnico.telefono && isClientPortalUser && (
                    <div className="vu-client-contact-actions">
                      <button
                        type="button"
                        className="vu-btn-contact-action call"
                        onClick={() => window.open(`tel:${selectedTecnico.telefono}`)}
                      >
                        <Phone size={14} /> Llamar
                      </button>
                      <button
                        type="button"
                        className="vu-btn-contact-action email"
                        onClick={() => window.open(`mailto:${selectedTecnico.correo}`)}
                      >
                        <Mail size={14} /> Correo
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    className="vu-sidebar-btn-primary"
                    onClick={() => handleVerExpediente(selectedTecnico)}
                  >
                    <Eye size={16} />
                    <span>{selectedTecnico.isCliente ? "EXPEDIENTE DEL CLIENTE" : "EXPEDIENTE COMPLETO"}</span>
                  </button>

                  {!isClientPortalUser && selectedTecnico.role_id !== 0 && (isRoot || selectedTecnico.id !== user?.id) && (
                    <div className="vu-sidebar-secondary-actions">
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
                  <p>Selecciona un técnico de la lista para ver su perfil, especialidad y tu historial de calificaciones.</p>
                </div>

                <div className="vu-sidebar-empty-hint">
                  <MousePointerClick size={13} className="vu-hint-icon" />
                  <span>Haz clic en una fila para ver detalles</span>
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

