import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  User,
  Mail,
  MapPin,
  Plus,
  ArrowRight,
  Home,
  ShieldCheck,
  X,
  Save,
  Phone,
  Lock,
  CheckCircle,
} from "lucide-react";
import "../../../styles/AgenteMarket/Admin/VistaDetalleCliente.css";
import { mostrarAviso } from '../../../utils/dialogos';

const VistaDetalleCliente = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- 1. Obtener usuario actual y verificar si es admin ---
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser?.rol === "admin";

  const [cliente, setCliente] = useState(
    location.state?.cliente || location.state?.u || null
  );
  const [propiedades, setPropiedades] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cargandoProp, setCargandoProp] = useState(true);

  const [formData, setFormData] = useState({
    nombre: cliente?.name || cliente?.nombre || "",
    correo: cliente?.email || cliente?.correo || "",
    telefono: cliente?.phone || cliente?.telefono || "",
    direccion: cliente?.address || cliente?.direccion || "",
    estado: cliente?.estado || "Activo",
    password: "", // para cambio de contraseña
  });

  useEffect(() => {
    if (!cliente) return;

    const obtenerPropiedadesDelCliente = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/propiedades`
        );

        // Buscamos propiedades que coincidan con el correo del cliente (forma más robusta)
        const emailCliente = (cliente.email || cliente.correo || "").toLowerCase();

        const misPropiedades = data.filter(
          (p) => (p.client_email || "").toLowerCase() === emailCliente
        );

        setPropiedades(misPropiedades);
      } catch (error) {
        console.error("Error al cargar propiedades:", error);
      } finally {
        setCargandoProp(false);
      }
    };
    obtenerPropiedadesDelCliente();
  }, [cliente, navigate, location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const guardarCambios = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id: cliente.id,
        first_name: formData.nombre.split(" ")[0] || "",
        last_name: formData.nombre.split(" ").slice(1).join(" ") || "",
        email: formData.correo,
        phone_number: formData.telefono,
        address: formData.direccion,
        is_active: formData.estado === "Activo" ? 1 : 0,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/usuarios/update-profile`,
        payload
      );

      setCliente({ ...cliente, ...formData });
      setIsModalOpen(false);
      mostrarAviso(data.message || "¡Expediente actualizado con éxito!");
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      mostrarAviso(
        "No se pudieron guardar los cambios: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  // --- 2. Navegar a registro de propiedad pasando el ID del cliente ---
  const irARegistroPropiedad = () => {
    navigate("/registro-propiedades", {
      state: {
        clienteId: cliente.id,
        clienteNombre: cliente.name || cliente.nombre,
      },
    });
  };

  if (!cliente)
    return <div className="text-center p-10">Cargando expediente...</div>;

  return (
    <div className="detalle-cliente-container">
      <header className="detalle-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} /> REGRESAR
        </button>
        <div className="header-title">
          <h1>Expediente del Cliente</h1>
        </div>
      </header>

      <div className="detalle-main-wrapper">
        <aside className="cliente-data-card">
          <div className="avatar-header-section">
            <div className="avatar-container-large">
              {cliente.profile_picture_url || cliente.profile_picture ? (
                <img
                  src={cliente.profile_picture_url || cliente.profile_picture}
                  alt="Perfil"
                  className="perfil-photo-circle-large"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/150?text=User";
                  }}
                />
              ) : (
                <User size={50} />
              )}
            </div>
            <h2>{cliente.name || cliente.nombre}</h2>
            <span className="badge-role-center">{cliente.rol}</span>
          </div>

          <div className="dossier-info-list">
            <div className="info-row-stack">
              <Mail size={18} className="icon-orange" />
              <div>
                <label>CORREO ELECTRÓNICO</label>
                <p>{cliente.email || cliente.correo}</p>
              </div>
            </div>

            <div className="info-row-stack">
              <Phone size={18} className="icon-orange" />
              <div>
                <label>TELÉFONO</label>
                <p>{cliente.phone || cliente.telefono || "Sin registrar"}</p>
              </div>
            </div>

            <div className="info-row-stack">
              <MapPin size={18} className="icon-orange" />
              <div>
                <label>DIRECCIÓN PARTICULAR</label>
                <p>
                  {cliente.address || cliente.direccion || "No especificada"}
                </p>
              </div>
            </div>

            <div className="info-row-stack">
              <ShieldCheck size={18} className="icon-orange" />
              <div>
                <label>ID DE EXPEDIENTE</label>
                <p>#{String(cliente.id).replace(/[^\d]/g, "")}</p>
              </div>
            </div>
          </div>

          <button
            className="btn-editar-perfil-new"
            onClick={() => setIsModalOpen(true)}
          >
            MODIFICAR PERFIL
          </button>
        </aside>

        <main className="propiedades-section">
          <div className="section-header">
            <h3>
              <Home size={22} /> PROPIEDADES REGISTRADAS
            </h3>

            {/* --- 3. Botón solo visible para admin --- */}
            {isAdmin && (
              <button
                className="btn-add-propiedad"
                onClick={irARegistroPropiedad}
              >
                <Plus size={18} /> NUEVA PROPIEDAD
              </button>
            )}
          </div>

          <div className="propiedades-list">
            {cargandoProp ? (
              <p className="text-center p-5">Buscando propiedades... ⏳</p>
            ) : propiedades.length > 0 ? (
              propiedades.map((prop) => (
                <div key={prop.id} className="propiedad-item-card">
                  <div className="prop-image-container">
                    {prop.foto_url ? (
                      <img
                        src={prop.foto_url}
                        alt="Fachada"
                        className="prop-facade-img"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="prop-icon-fallback">
                        <MapPin size={24} />
                      </div>
                    )}
                  </div>
                  <div className="prop-details">
                    <h4>{prop.nombre_propiedad || "Propiedad sin nombre"}</h4>
                    <p className="prop-address-text">{prop.direccion}</p>
                    <div className="prop-meta">
                      <span className="badge-tipo">{prop.tipo}</span>
                      <span className="equipos-count">Activa</span>
                    </div>
                  </div>
                  <button
                    className="btn-ver-propiedad"
                    onClick={() => {
                      const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
                      const role = session?.userData?.role_id;
                      if (role === 0 || role === 1) {
                        navigate(`/detalle-propiedad/${prop.id}`);
                      } else {
                        navigate(`/propiedad/${prop.id}`);
                      }
                    }}
                  >
                    Ver detalles de la Propiedad <ArrowRight size={18} />
                  </button>

                </div>
              ))
            ) : (
              <div className="no-propiedades">
                <p>Este cliente aún no tiene propiedades registradas.</p>
              </div>
            )}
          </div>
        </main>

        {isModalOpen && (
          <div className="modal-overlay-new">
            <div className="modal-card-new">
              <div className="modal-header-new">
                <div className="header-icon-box">
                  <User size={24} />
                </div>
                <div>
                  <h3>Editar Perfil</h3>
                  <p>
                    Actualizando información de{" "}
                    {cliente.nombre || cliente.name}
                  </p>
                </div>
                <button
                  className="btn-close-new"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={guardarCambios} className="modal-body-new">
                <div className="input-grid-new">
                  <div className="input-box-new">
                    <label>
                      <User size={14} /> Nombre Completo
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="input-box-new">
                    <label>
                      <Mail size={14} /> Correo Electrónico
                    </label>
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="input-box-new">
                    <label>
                      <Phone size={14} /> Número de Teléfono
                    </label>
                    <input
                      type="text"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="input-box-new">
                    <label>
                      <Lock size={14} /> Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="En blanco para no cambiar"
                    />
                  </div>

                  <div className="input-box-new full-width">
                    <label>
                      <MapPin size={14} /> Dirección Particular
                    </label>
                    <input
                      type="text"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleInputChange}
                      placeholder="Ej. Calle 23 #137, Col. Xcanatun..."
                    />
                  </div>

                  <div className="input-box-new full-width">
                    <label>
                      <CheckCircle size={14} /> Estatus del Cliente
                    </label>
                    <select
                      name="estado"
                      value={formData.estado}
                      onChange={handleInputChange}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="modal-actions-new">
                  <button
                    type="button"
                    className="btn-secondary-new"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary-new">
                    <Save size={18} /> Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VistaDetalleCliente;
