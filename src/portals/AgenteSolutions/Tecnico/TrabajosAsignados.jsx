import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import {
  MapPin,
  CheckCircle,
  Clock,
  Eye,
  X,
  ArrowLeft,
  Building,
  UserCheck,
  Wrench,
  FileText,
  User,
  LayoutGrid,
  ChevronLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Shared/Header";
import "../../../styles/AgenteSolutions/Tecnico/TrabajosAsignados.css";

//Esto es un cambio//

const TrabajosAsignados = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [servicios, setServicios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detalleServicio, setDetalleServicio] = useState(null);
  const [activeTab, setActiveTab] = useState("asignados");

  useEffect(() => {
    if (user?.id) fetchServicios();
  }, [user]);

  const fetchServicios = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/tecnico/${user.id}/servicios`,
      );
      setServicios(res.data);
    } catch (error) {
      console.error("Error al obtener trabajos:", error);
    }
  };

  const abrirMapa = (coords, direccion) => {
    const coordenadasValidas = coords && typeof coords === 'string' && coords.trim() !== '' && coords.trim() !== 'null';
    if (coordenadasValidas) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords.trim())}`;
      window.open(url, "_blank");
      return;
    }
    const direccionValida = direccion && typeof direccion === 'string' && direccion.trim() !== '' && direccion.trim() !== 'null';
    if (direccionValida) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion.trim())}`;
      window.open(url, "_blank");
      return;
    }
    alert("Esta propiedad no tiene coordenadas ni dirección registradas.");
  };

  const verDetalle = (servicio) => {
    setDetalleServicio(servicio);
    setModalVisible(true);
  };

  /**
   * Navega a la vista de Registro de Zonas
   * Pasamos el CURP por URL y el ID por estado para asegurar que RegistroZonas
   * tenga toda la información necesaria.
   */
  const irARegistro = (propiedad) => {
    // Validamos qué nombre de campo trae el objeto para evitar el 'undefined'
    const curpValido = propiedad.custom_curp || propiedad.curp || "S-N";
    const idValido = propiedad.property_id || propiedad.id;

    navigate(`/RegistroZonas/${curpValido}`, { 
      state: { id: idValido, servicioId: propiedad.id } 
    });
  };

  // Filtros por estatus
  const pendientes = servicios.filter((s) => s.status !== "completed" && s.status !== "Finalizado" && s.status !== "Listo");
  const finalizados = servicios.filter((s) => s.status === "completed" || s.status === "Finalizado" || s.status === "Listo");

  const handleRegresar = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/VistaTecnico");
    }
  };

  return (
    <>
      <Header />
      <div className="trabajos-container">
        <div className="top-actions" style={{ marginBottom: '15px' }}>
          <button 
            onClick={handleRegresar} 
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F26522', color: 'white', padding: '8px 25px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
          >
            <ChevronLeft size={18} />
            <span>REGRESAR</span>
          </button>
        </div>

        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === "asignados" ? "active" : ""}`}
            onClick={() => setActiveTab("asignados")}
          >
            <Clock size={18} />
            Trabajos Asignados
          </button>
          <button
            className={`tab-btn ${activeTab === "finalizados" ? "active" : ""}`}
            onClick={() => setActiveTab("finalizados")}
          >
            <CheckCircle size={18} />
            Trabajos Finalizados
          </button>
        </div>

        {/* --- SECCIÓN 1: TRABAJOS ASIGNADOS --- */}
        {activeTab === "asignados" && (
          <section className="seccion-trabajos fade-in">
            <div className="titulo-seccion pending">
              <Clock size={22} />
              <h2>Trabajos Asignados</h2>
            </div>
            <div className="tabla-wrapper">
              <table className="tabla-general">
                <thead>
                  <tr>
                    <th>Propiedad</th>
                    <th>Dirección</th>
                    <th>Prioridad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.length > 0 ? (
                    pendientes.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.property_name}</strong>
                        </td>
                        <td>{s.address}</td>
                        <td>
                          <span className={`badge ${s.priority}`}>
                            {s.priority}
                          </span>
                        </td>
                        <td className="btns-accion">
                          <button
                            className="btn-action map"
                            title="Ver en Google Maps"
                            onClick={() => abrirMapa(s.coordinates || s.coordenadas, s.address)}
                          >
                            <MapPin size={18} />
                            <span>Mapa</span>
                          </button>

                          <button
                            className="btn-action zones"
                            title="Iniciar Levantamiento de Zonas"
                            onClick={() => irARegistro(s)}
                          >
                            <LayoutGrid size={18} />
                            <span>Empezar levantamiento:</span>
                          </button>

                          <button
                            className="btn-action view"
                            title="Ver Información Completa"
                            onClick={() => verDetalle(s)}
                          >
                            <Eye size={18} />
                            <span>Detalles</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="empty-state">
                        No tienes trabajos pendientes por ahora.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* --- SECCIÓN 2: TRABAJOS FINALIZADOS --- */}
        {activeTab === "finalizados" && (
          <section className="seccion-trabajos fade-in">
            <div className="titulo-seccion success">
              <CheckCircle size={22} />
              <h2>Trabajos Finalizados</h2>
            </div>
            <div className="tabla-wrapper">
              <table className="tabla-general">
                <thead>
                  <tr>
                    <th>Propiedad</th>
                    <th>Fecha Cierre</th>
                    <th>Resultado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {finalizados.map((s) => (
                    <tr key={s.id} className="row-finalizado">
                      <td>{s.property_name}</td>
                      <td>
                        {new Date(
                          s.real_end || s.updated_at,
                        ).toLocaleDateString()}
                      </td>
                      <td>{s.status}</td>
                      <td>
                        <button
                          className="btn-action view"
                          onClick={() => navigate(`/detalle-reporte/${s.id}`)}
                        >
                          <Eye size={18} />
                          <span>Ver detalles</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {finalizados.length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty-state">
                        No hay trabajos finalizados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* --- MODAL DE SÓLO LECTURA --- */}
        {modalVisible && detalleServicio && (
          <div className="modal-overlay">
            <div className="modal-detalle-formal">
              <div className="modal-header">
                <h3>Detalles de la Propiedad</h3>
                <button
                  className="close-modal"
                  onClick={() => setModalVisible(false)}
                >
                  <X />
                </button>
              </div>

              <div className="modal-body-formal">
                {(detalleServicio.facade_photo ||
                  detalleServicio.property_photo ||
                  detalleServicio.foto_fachada) && (
                  <div className="facade-photo-container">
                    <img
                      src={
                        detalleServicio.facade_photo ||
                        detalleServicio.property_photo ||
                        detalleServicio.foto_fachada
                      }
                      alt="Fachada"
                      className="facade-img"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}

                <div className="info-grid-formal">
                  <div className="info-item-formal">
                    <span className="icon-wrapper"><Building size={20} /></span>
                    <div className="info-content">
                      <label>Nombre Propiedad</label>
                      <p>{detalleServicio.property_name}</p>
                    </div>
                  </div>

                  <div className="info-item-formal">
                    <span className="icon-wrapper"><MapPin size={20} /></span>
                    <div className="info-content">
                      <label>Dirección Completa</label>
                      <p>{detalleServicio.address}</p>
                      {(detalleServicio.coordinates || detalleServicio.coordenadas) && (
                        <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '3px' }}>
                          📍 Coordenadas: <strong style={{ color: '#E5E7EB' }}>{detalleServicio.coordinates || detalleServicio.coordenadas}</strong>
                        </p>
                      )}
                      <button
                        onClick={() => abrirMapa(detalleServicio.coordinates || detalleServicio.coordenadas, detalleServicio.address)}
                        style={{
                          marginTop: '6px',
                          background: 'none',
                          border: 'none',
                          color: '#FF6600',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0,
                          fontSize: '0.85rem'
                        }}
                      >
                        <MapPin size={14} /> Abrir en Google Maps
                      </button>
                    </div>
                  </div>

                  <div className="info-item-formal">
                    <span className="icon-wrapper"><User size={20} /></span>
                    <div className="info-content">
                      <label>Dueño / Cliente</label>
                      <p>
                        {detalleServicio.client_name ||
                          detalleServicio.owner_name ||
                          "No especificado"}
                      </p>
                    </div>
                  </div>

                  <div className="info-item-formal">
                    <span className="icon-wrapper"><UserCheck size={20} /></span>
                    <div className="info-content">
                      <label>Supervisor</label>
                      <p>{detalleServicio.supervisor_name || "No asignado"}</p>
                    </div>
                  </div>

                  <div className="info-item-formal full">
                    <span className="icon-wrapper"><FileText size={20} /></span>
                    <div className="info-content">
                      <label>Instrucciones</label>
                      <div className="desc-box-formal">
                        {detalleServicio.description || "Sin instrucciones adicionales."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer-formal">
                <button
                  className="btn-close-formal"
                  onClick={() => setModalVisible(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TrabajosAsignados;
