import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft } from 'lucide-react';
import { useAuth } from "../../../context/AuthContext";
import UniversalSearch from "../../../components/Shared/UniversalSearch"; 
import Header from "../../../components/Shared/Header"; 
import RegisterModal from "../../../components/Auth/Register";
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
  { id: 1, label: "ADMIN (GLOBAL)" },
  { id: 7, label: "ADMIN. PROPIEDADES" },
  { id: 2, label: "TÉCNICO" },
  { id: 3, label: "CLIENTE" },
  { id: 4, label: "AUT. EMPRESARIAL ($999)" },
  { id: 5, label: "AUT. PERSONAL ($499)" },
  { id: 6, label: "CONTRATISTA" },
  { id: 8, label: "TÉCNICO DE LA RED" }
];

const getRoleStyle = (roleId) => {
  switch (Number(roleId)) {
    case 0:
      return { backgroundColor: '#ffd700', color: '#000000', border: '1px solid #e5c100' };
    case 1:
      return { backgroundColor: '#ff8800', color: '#ffffff', border: '1px solid #e67a00' };
    case 7:
      return { backgroundColor: '#d97706', color: '#ffffff', border: '1px solid #b45309' };
    case 2:
      return { backgroundColor: '#0284c7', color: '#ffffff', border: '1px solid #0369a1' };
    case 3:
      return { backgroundColor: '#16a34a', color: '#ffffff', border: '1px solid #15803d' };
    case 4:
      return { backgroundColor: '#8b5cf6', color: '#ffffff', border: '1px solid #7c3aed' };
    case 5:
      return { backgroundColor: '#f26522', color: '#ffffff', border: '1px solid #ea580c' };
    case 6:
      return { backgroundColor: '#0d9488', color: '#ffffff', border: '1px solid #0f766e' };
    case 8:
      return { backgroundColor: '#06b6d4', color: '#ffffff', border: '1px solid #0891b2' };
    default:
      return { backgroundColor: '#64748b', color: '#ffffff', border: '1px solid #475569' };
  }
};

const CATEGORIAS = [
  { label: "TODOS", icon: "👥" },
  { label: "CLIENTES", icon: "👤" },
  { label: "TECNICOS", icon: "🛠️" },
  { label: "ADMINS", icon: "💼" },
  { label: "AUTONOMOS", icon: "🏢" },
  { label: "ROOTS", icon: "🔑" },
];

const VistaUsuarios = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filtro, setFiltro] = useState("TODOS");
  const [cargando, setCargando] = useState(true);
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  const isRoot = user?.role_id === 0;

  const obtenerUsuarios = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios`);
      const isPersonal = user?.role_id === 5;
      const isEmpresa  = user?.role_id === 4;
      const formateados = data
        .filter(u => {
          if (isRoot) return true;
          if (isPersonal) return u.role_id === 2; // Autónomo Personal solo ve Técnicos
          if (isEmpresa) return u.role_id === 2 || u.role_id === 3; // Autónomo Empresa ve Clientes y Técnicos
          if (user?.role_id === 1) return u.role_id !== 0 && u.role_id !== 4 && u.role_id !== 5;
          return true;
        })
        .map((u) => ({
          id: u.id,
          nombre: `${u.first_name} ${u.last_name || ""}`.trim(),
          correo: u.email,
          rol: MAPA_ROLES[u.role_id] || "DESCONOCIDO",
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

  return (
    <div className="main-container-users bg-light">
      <div className="top-bar-orange" />
      <div className="top-bar-black" />

      <Header titulo="USUARIOS" />
      
      {/* BOTÓN REGRESAR */}
      <div style={{ padding: '0 10px', marginTop: '10px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F26522', color: 'white', padding: '8px 25px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
        >
          <ChevronLeft size={18} />
          <span>REGRESAR</span>
        </button>
      </div>

      {/* 🔥 QUITAMOS overflowX:hidden */}
      <section className="content-area" style={{ padding: '10px' }}>
        
        <div className="filter-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '10px', 
          marginBottom: '20px' 
        }}>
          
          {CATEGORIAS.filter((cat) => {
            if (!isRoot && cat.label === "ROOTS") return false;
            if (!isRoot && user?.role_id !== 1 && (cat.label === "ADMINS" || cat.label === "AUTONOMOS")) return false;
            if (user?.role_id === 5 && cat.label === "CLIENTES") return false; // Autónomo Personal no tiene clientes
            return true;
          }).map((cat) => (
            <div 
              key={cat.label} 
              className={`filter-item ${filtro === cat.label ? "active" : ""}`} 
              onClick={() => setFiltro(cat.label)}
              style={{ margin: 0, width: '100%' }}
            >
              <span className="icon-box">{cat.icon}</span> {cat.label}
            </div>
          ))}

          <div 
            className="filter-item" 
            onClick={() => navigate("/map")}
            style={{ backgroundColor: "#fff4e6", border: "1px solid #FF6600", margin: 0, width: "100%" }}
          >
            <span className="icon-box">🗺️</span> VER MAPA
          </div>

          {user?.role_id !== 5 && (
            <div 
              className="filter-item" 
              onClick={() => setShowRegisterModal(true)}
              style={{ backgroundColor: "#fff4e6", border: "1px solid #FF6600", margin: 0, width: "100%" }}
            >
              <span className="icon-box">📝</span> REGISTRAR
            </div>
          )}
        </div>

        <UniversalSearch 
          type="USUARIOS"
          data={listaUsuarios} 
          setFilteredData={setUsuariosFiltrados}
          filtroActual={filtro}
          placeholder="BUSCAR..."
        />

        <RegisterModal 
          isOpen={showRegisterModal} 
          onClose={() => setShowRegisterModal(false)} 
          onSuccess={obtenerUsuarios} 
        />

        {/* 🔥 CONTENEDOR LIMPIO */}
        <div className="table-wrapper-scroll">
          
          {/* 🔥 TABLA SIN estilos inline */}
          <table className="modern-table">
            <thead>
              <tr>
                <th>PHOTO</th>
                <th>NOMBRE</th>
                <th>CORREO</th>
                <th>ROL</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="6">Cargando usuarios... ⏳</td></tr>
              ) : usuariosFiltrados.length > 0 ? (
                usuariosFiltrados.map((u) => (
                  <tr key={u.id} className={u.bloqueado ? "user-row-blocked" : ""}>
                    
                    <td data-label="Foto">
                      <div className="avatar-circle">
                        {u.profile_picture_url ? (
                          <img src={u.profile_picture_url} alt="Perfil" className="perfil-photo" />
                        ) : "👤"}
                      </div>
                    </td>

                    <td 
                      data-label="Nombre"
                      className={u.role_id === 3 || u.role_id === 2 || u.role_id === 8 ? "clickable-name" : ""} 
                      onClick={() => {
                        if (u.role_id === 3) {
                          navigate("/detalle-cliente", { state: { cliente: u } });
                        } else if (u.role_id === 2 || u.role_id === 8) {
                          navigate("/detalle-tecnico", { state: { tecnico: u } });
                        }
                      }}
                    >
                      {u.nombre} {u.bloqueado && <span className="blocked-tag">BLOQUEADO</span>}
                    </td>

                    <td data-label="Correo">{u.correo}</td>

                    <td data-label="Rol">
                      {u.role_id === 0 ? (
                        <span className="badge-rol root" style={getRoleStyle(0)}>ROOT</span>
                      ) : (
                        <select 
                          className="badge-rol select-rol-inline"
                          style={{
                            ...getRoleStyle(u.role_id),
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                          value={u.role_id}
                          onChange={(e) => cambiarRol(u.id, parseInt(e.target.value), u.nombre)}
                        >
                          {OPCIONES_ROLES.map((op) => (
                            <option key={op.id} value={op.id} style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td data-label="Estado">
                      {u.approval_status === 'deleted_by_user' ? (
                        <span style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #F87171', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          🔴 Eliminado por Usuario
                        </span>
                      ) : (
                        <>
                          <span className={`status-dot ${u.bloqueado ? "status-off" : "status-on"}`} />
                          {u.bloqueado ? "Inactivo" : u.estado}
                        </>
                      )}
                    </td>

                    <td data-label="Acciones" className="actions-cell">
                      {u.role_id === 0 ? (
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🔒 Protegido
                        </span>
                      ) : (
                        <>
                          <button 
                            className={`btn-table-oval ${u.bloqueado ? "is-blocked" : "is-unblocked"}`} 
                            onClick={() => toggleBloqueo(u.id, u.role_id, u.bloqueado)}
                          >
                            {u.bloqueado ? "🔓 OK" : "🔒 Bloq"}
                          </button>

                          <button 
                            className="btn-table-oval-small delete-oval" 
                            onClick={() => eliminarUsuario(u.id, u.role_id)}
                            title="Eliminar usuario"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </td>

                  </tr>
                ))
              ) : (
                <tr><td colSpan="6">No se encontraron usuarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default VistaUsuarios;
