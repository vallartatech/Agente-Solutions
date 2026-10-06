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
  Phone
} from 'lucide-react';
import { useAuth } from "../../../context/AuthContext";
import UniversalSearch from "../../../components/Shared/UniversalSearch"; 
import RegisterModal from "../../../components/Auth/Register";
import ModalCalendarioCliente from "../../AgenteMarket/Cliente/ModalCalendarioCliente";
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
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [appLogo, setAppLogo] = useState(defaultLogo);

  const dropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const isRoot = user?.role_id === 0;

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
      .catch(() => {});
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
      {/* ── TOP NAVIGATION BAR (Matching Application Master Menu) ── */}
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

        {/* Center Nav Links */}
        <nav className="vcp-header-nav">
          <button 
            className="vcp-nav-icon-btn" 
            title="Abrir Calendario"
            onClick={() => setShowModalCalendario(true)}
          >
            <CalendarDays size={20} color="#ffffff" strokeWidth={2.2} />
          </button>

          <button className="vcp-nav-btn active" onClick={() => navigate('/usuarios')}>
            USUARIOS
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/propiedades')}>
            PROPIEDADES
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/levantamientos')}>
            LEVANTAMIENTO
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

        {/* User profile section on top right */}
        <div className="vcp-header-right" ref={dropdownRef}>
          <div className="vcp-user-info-text">
            <span className="vcp-user-role-badge">{userRoleLabel}</span>
            <span className="vcp-user-name">{userFullName}</span>
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
          <button 
            type="button"
            className="vu-btn-regresar" 
            onClick={() => navigate(-1)} 
            title="Volver a la vista anterior"
          >
            <ChevronLeft size={19} strokeWidth={2.8} />
            <span>REGRESAR</span>
          </button>

          <div className="vu-page-title-badge">
            <Users size={18} className="vu-title-icon" />
            <span>DIRECTORIO DE TÉCNICOS</span>
            <span className="vu-count-pill">{listaUsuarios.length}</span>
          </div>
        </div>

        {/* Filter Buttons Grid: Exactamente 2 Botones (Técnicos con Filtro + Registrar) */}
        <div className="vu-filter-grid">
          {/* 1. Botón de Técnicos con filtro desplegable de estado */}
          <div className="vu-filter-dropdown-wrapper" ref={filterDropdownRef}>
            <button 
              type="button"
              className={`vu-filter-pill ${filterDropdownOpen ? "open" : "active"}`} 
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              title="Filtrar estado de los técnicos"
            >
              <Wrench size={16} />
              <span>
                TÉCNICOS: {filtro === "TODOS" ? `TODOS (${totalTecnicos})` : filtro === "ACTIVOS" ? `ACTIVOS (${activosCount})` : `BLOQUEADOS (${bloqueadosCount})`}
              </span>
              <ChevronDown size={15} className={`vu-filter-chevron ${filterDropdownOpen ? "rotate" : ""}`} />
            </button>

            {filterDropdownOpen && (
              <div className="vu-filter-menu-dropdown">
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

          {/* 2. Botón de Registrar Técnico */}
          <button 
            type="button"
            className="vu-filter-pill vu-action-pill-register" 
            onClick={() => setShowRegisterModal(true)}
            title="Registrar nuevo técnico"
          >
            <UserPlus size={16} />
            <span>REGISTRAR</span>
          </button>
        </div>

        {/* Universal Search Bar in Dark Glass */}
        <div className="vu-search-wrapper">
          <UniversalSearch 
            type="USUARIOS"
            data={listaUsuarios} 
            setFilteredData={setUsuariosFiltrados}
            filtroActual={filtro}
            placeholder="BUSCAR TÉCNICO POR NOMBRE, CORREO O TELÉFONO..."
          />
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

        {/* ── USERS LIQUID GLASS TABLE ── */}
        <div className="vu-table-card">
          <div className="vu-table-responsive-wrapper">
            <table className="vu-modern-table">
              <thead>
                <tr>
                  <th>FOTO</th>
                  <th>NOMBRE & CONTACTO</th>
                  <th>CORREO ELECTRÓNICO</th>
                  <th>ROL / PERMISO</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan="6" className="vu-loading-cell">
                      <div className="vu-loader-content">
                        <div className="vu-spinner"></div>
                        <span>Cargando directorio de usuarios...</span>
                      </div>
                    </td>
                  </tr>
                ) : usuariosFiltrados.length > 0 ? (
                  usuariosFiltrados.map((u) => (
                    <tr key={u.id} className={u.bloqueado ? "vu-row-blocked" : ""}>
                      
                      {/* Foto / Avatar */}
                      <td data-label="Foto">
                        <div className="vu-avatar-box">
                          {u.profile_picture_url ? (
                            <img src={u.profile_picture_url} alt={u.nombre} className="vu-avatar-img" />
                          ) : (
                            <div className="vu-avatar-fallback">
                              {u.nombre ? u.nombre.charAt(0).toUpperCase() : <User size={18} />}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Nombre & Enlace */}
                      <td 
                        data-label="Nombre"
                        className={`vu-name-cell ${u.role_id === 3 || u.role_id === 2 || u.role_id === 8 ? "vu-clickable-name" : ""}`} 
                        onClick={() => {
                          if (u.role_id === 3) {
                            navigate("/detalle-cliente", { state: { cliente: u } });
                          } else if (u.role_id === 2 || u.role_id === 8) {
                            navigate("/detalle-tecnico", { state: { tecnico: u } });
                          }
                        }}
                        title={u.role_id === 3 || u.role_id === 2 || u.role_id === 8 ? "Clic para ver detalle de perfil" : ""}
                      >
                        <div className="vu-user-name-wrapper">
                          <span className="vu-user-name-text">{u.nombre}</span>
                          {u.telefono && (
                            <span className="vu-user-phone">
                              <Phone size={12} style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} />
                              {u.telefono}
                            </span>
                          )}
                          {u.bloqueado && <span className="vu-blocked-badge">BLOQUEADO</span>}
                        </div>
                      </td>

                      {/* Correo */}
                      <td data-label="Correo" className="vu-email-cell">
                        <span className="vu-email-text">{u.correo}</span>
                      </td>

                      {/* Rol Selector Inline */}
                      <td data-label="Rol">
                        {u.role_id === 0 ? (
                          <span className="vu-role-badge root" style={getRoleStyle(0)}>ROOT MASTER</span>
                        ) : (
                          <div className="vu-select-role-wrapper">
                            <select 
                              className="vu-role-select"
                              style={getRoleStyle(u.role_id)}
                              value={u.role_id}
                              onChange={(e) => cambiarRol(u.id, parseInt(e.target.value), u.nombre)}
                              title="Cambiar tipo de usuario"
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

                      {/* Estado */}
                      <td data-label="Estado">
                        {u.approval_status === 'deleted_by_user' ? (
                          <span className="vu-status-pill deleted">
                            <span className="vu-dot dot-red" />
                            Eliminado por Usuario
                          </span>
                        ) : (
                          <span className={`vu-status-pill ${u.bloqueado ? "inactive" : "active"}`}>
                            <span className={`vu-dot ${u.bloqueado ? "dot-off" : "dot-on"}`} />
                            {u.bloqueado ? "Inactivo" : u.estado}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td data-label="Acciones" className="vu-actions-cell">
                        {u.role_id === 0 ? (
                          <span className="vu-protected-chip" title="Usuario con privilegios máximos">
                            <Lock size={12} style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} />
                            Protegido
                          </span>
                        ) : (
                          <div className="vu-action-btn-group">
                            <button 
                              type="button"
                              className={`vu-action-btn ${u.bloqueado ? "unblock" : "block"}`} 
                              onClick={() => toggleBloqueo(u.id, u.role_id, u.bloqueado)}
                              title={u.bloqueado ? "Desbloquear usuario" : "Bloquear acceso"}
                            >
                              {u.bloqueado ? (
                                <>
                                  <Unlock size={14} />
                                  <span>Desbloq</span>
                                </>
                              ) : (
                                <>
                                  <Lock size={14} />
                                  <span>Bloquear</span>
                                </>
                              )}
                            </button>

                            <button 
                              type="button"
                              className="vu-action-btn delete" 
                              onClick={() => eliminarUsuario(u.id, u.role_id)}
                              title="Eliminar usuario permanentemente"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="vu-empty-cell">
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

      </main>
    </div>
  );
};

export default VistaUsuarios;
