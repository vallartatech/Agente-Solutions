import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import {
  MapPin,
  CheckCircle,
  Clock,
  Eye,
  X,
  UserCheck,
  FileText,
  User,
  LayoutGrid,
  PencilLine,
  ClipboardList,
  Calendar,
  Users
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../../components/Shared/Header";
import CasaLoader from "../../../components/Shared/CasaLoader";
import "../../../styles/AgenteSolutions/Tecnico/TrabajosAsignados.css";
import { mostrarAviso } from '../../../utils/dialogos';



const TrabajosAsignados = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [servicios, setServicios] = useState([]);
  const [cargado, setCargado] = useState(false);
  // Propiedad a resaltar al volver de su levantamiento
  const resaltarPropiedadId = location.state?.resaltarPropiedadId ?? null;
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
    } finally {
      setCargado(true);
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
    mostrarAviso("Esta propiedad no tiene coordenadas ni dirección registradas.");
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

  // Llegada desde "Consultar levantamiento" de un trabajo: abrir el levantamiento de esa propiedad.
  // El historial queda: trabajo -> este listado (con la propiedad resaltada) -> levantamiento.
  useEffect(() => {
    const abrirId = location.state?.abrirPropiedadId;
    if (!abrirId || !cargado) return;

    const coincidencias = servicios.filter(s => String(s.property_id) === String(abrirId));
    const fila = coincidencias.find(s => s.es_levantamiento) || coincidencias[0];

    navigate(location.pathname, { replace: true, state: { resaltarPropiedadId: abrirId } });
    irARegistro(fila || {
      property_id: abrirId,
      custom_curp: location.state?.curp,
      id: location.state?.servicioId
    });
  }, [cargado, servicios, location.state]);

  // Al volver del levantamiento, desplazar hasta la propiedad resaltada
  useEffect(() => {
    if (!resaltarPropiedadId || !cargado) return;
    const el = document.querySelector(`[data-propiedad-id="${resaltarPropiedadId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [resaltarPropiedadId, cargado]);

  // Filtros por estatus
  // Solo levantamientos (las órdenes de trabajo van en "Trabajos") y una sola tarjeta por propiedad:
  // si hay registros duplicados de la misma propiedad se muestra el más reciente.
  const esCerrado = (s) => s.status === "completed" || s.status === "Finalizado" || s.status === "Listo";
  const unoPorPropiedad = (lista) => {
    const porPropiedad = new Map();
    lista.forEach((s) => {
      const clave = s.property_id ?? s.composite_id;
      const previo = porPropiedad.get(clave);
      if (!previo || Number(s.id) > Number(previo.id)) {
        porPropiedad.set(clave, { ...s, equipo_count: Math.max(s.equipo_count || 1, previo?.equipo_count || 1) });
      } else {
        previo.equipo_count = Math.max(previo.equipo_count || 1, s.equipo_count || 1);
      }
    });
    return Array.from(porPropiedad.values());
  };
  const levantamientos = servicios.filter((s) => s.es_levantamiento);
  const pendientes = unoPorPropiedad(levantamientos.filter((s) => !esCerrado(s)));
  const propiedadesAbiertas = new Set(pendientes.map((s) => String(s.property_id)));
  const finalizados = unoPorPropiedad(
    levantamientos.filter((s) => esCerrado(s) && !propiedadesAbiertas.has(String(s.property_id)))
  );

  const listaActual = activeTab === "asignados" ? pendientes : finalizados;
  const fotoDetalle = detalleServicio
    ? (detalleServicio.facade_photo || detalleServicio.property_photo || detalleServicio.foto_fachada)
    : null;

  return (
    <div className="ta-root">
      <Header />
      <main className="ta-main">

        {/* ── TÍTULO ── */}
        <div className="ta-action-bar">
          <div className="ta-page-title-badge">
            <ClipboardList size={18} className="ta-title-icon" />
            <span>MIS LEVANTAMIENTOS</span>
            <span className="ta-count-pill">{pendientes.length}</span>
          </div>
        </div>

        {/* ── PESTAÑAS: ASIGNADOS / FINALIZADOS ── */}
        <div className="ta-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "asignados"}
            className={`ta-tab ${activeTab === "asignados" ? "active" : ""}`}
            onClick={() => setActiveTab("asignados")}
          >
            <Clock size={16} />
            <span>Asignados</span>
            <span className="ta-tab-count">{pendientes.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "finalizados"}
            className={`ta-tab ${activeTab === "finalizados" ? "active" : ""}`}
            onClick={() => setActiveTab("finalizados")}
          >
            <CheckCircle size={16} />
            <span>Finalizados</span>
            <span className="ta-tab-count">{finalizados.length}</span>
          </button>
        </div>

        {/* ── LISTA DE TRABAJOS ── */}
        {!cargado ? (
          <CasaLoader texto="Cargando levantamientos..." />
        ) : listaActual.length === 0 ? (
          <div className="ta-empty">
            <span className="ta-empty-icon">
              {activeTab === "asignados" ? <Clock size={26} /> : <CheckCircle size={26} />}
            </span>
            <strong>
              {activeTab === "asignados" ? "No tienes levantamientos pendientes" : "Aún no hay levantamientos finalizados"}
            </strong>
            <span>
              {activeTab === "asignados"
                ? "Cuando te asignen una visita técnica aparecerá aquí."
                : "Los levantamientos que termines se guardarán aquí."}
            </span>
          </div>
        ) : (
          <div className="ta-grid">
            {activeTab === "asignados" && pendientes.map((s) => (
              <article
                key={s.composite_id || s.id}
                className={`ta-card ${resaltarPropiedadId != null && String(s.property_id) === String(resaltarPropiedadId) ? 'is-highlighted' : ''}`}
                data-propiedad-id={s.property_id}
              >
                <div className="ta-card-top">
                  <h3 className="ta-card-title">{s.property_name}</h3>
                  {s.priority && <span className={`ta-priority ${String(s.priority).toLowerCase()}`}>{s.priority}</span>}
                </div>

                <p className="ta-card-line">
                  <MapPin size={14} />
                  <span>{s.address || 'Sin dirección registrada'}</span>
                </p>

                {(s.tiene_levantamiento || s.equipo_count > 1) && (
                  <div className="ta-tags-row">
                    {s.tiene_levantamiento && (
                      <span className="ta-survey-tag">
                        <LayoutGrid size={12} /> Levantamiento iniciado
                      </span>
                    )}
                    {s.equipo_count > 1 && (
                      <span className="ta-team-tag" title="Todos los integrantes ven y editan el mismo levantamiento">
                        <Users size={12} /> Equipo de {s.equipo_count}
                      </span>
                    )}
                  </div>
                )}

                <div className="ta-card-actions">
                  <button
                    type="button"
                    className="ta-btn ta-btn-primary"
                    title={s.tiene_levantamiento ? 'Editar el levantamiento de zonas' : 'Iniciar levantamiento de zonas'}
                    onClick={() => irARegistro(s)}
                  >
                    {s.tiene_levantamiento ? <PencilLine size={16} /> : <LayoutGrid size={16} />}
                    <span>{s.tiene_levantamiento ? 'Editar levantamiento' : 'Iniciar levantamiento'}</span>
                  </button>
                  <div className="ta-card-actions-row">
                    <button
                      type="button"
                      className="ta-btn ta-btn-secondary"
                      title="Ver en Google Maps"
                      onClick={() => abrirMapa(s.coordinates || s.coordenadas, s.address)}
                    >
                      <MapPin size={16} />
                      <span>Mapa</span>
                    </button>
                    <button
                      type="button"
                      className="ta-btn ta-btn-secondary"
                      title="Ver información completa"
                      onClick={() => verDetalle(s)}
                    >
                      <Eye size={16} />
                      <span>Detalles</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {activeTab === "finalizados" && finalizados.map((s) => (
              <article key={s.composite_id || s.id} className="ta-card is-done">
                <div className="ta-card-top">
                  <h3 className="ta-card-title">{s.property_name}</h3>
                  <span className="ta-status-done"><CheckCircle size={12} /> {s.status}</span>
                </div>

                <p className="ta-card-line">
                  <Calendar size={14} />
                  <span>Cerrado el {new Date(s.real_end || s.updated_at).toLocaleDateString('es-MX')}</span>
                </p>

                {s.equipo_count > 1 && (
                  <div className="ta-tags-row">
                    <span className="ta-team-tag"><Users size={12} /> Equipo de {s.equipo_count}</span>
                  </div>
                )}

                <div className="ta-card-actions">
                  {/* Finalizado no es definitivo: el equipo puede seguir editando el levantamiento */}
                  {s.es_levantamiento && (
                    <button
                      type="button"
                      className="ta-btn ta-btn-primary"
                      title="Editar el levantamiento de zonas"
                      onClick={() => irARegistro(s)}
                    >
                      <PencilLine size={16} />
                      <span>Editar levantamiento</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="ta-btn ta-btn-secondary"
                    onClick={() => navigate(`/detalle-reporte/${s.id}`)}
                  >
                    <Eye size={16} />
                    <span>Ver detalles</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* ── MODAL DE SÓLO LECTURA: DETALLES DE LA PROPIEDAD ── */}
      {modalVisible && detalleServicio && (
        <div className="ta-modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="ta-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ta-modal-grabber" />

            <div className="ta-modal-header">
              <div className="ta-modal-header-text">
                <span className="ta-modal-tag">DETALLES DE LA PROPIEDAD</span>
                <h2>{detalleServicio.property_name}</h2>
              </div>
              <button type="button" className="ta-modal-close" onClick={() => setModalVisible(false)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="ta-modal-body">
              {fotoDetalle && (
                <div className="ta-modal-photo">
                  <img
                    src={fotoDetalle}
                    alt="Fachada"
                    onError={(e) => { e.target.parentElement.style.display = "none"; }}
                  />
                </div>
              )}

              <div className="ta-info-card">
                <div className="ta-info-row">
                  <MapPin size={16} />
                  <div>
                    <label>Dirección completa</label>
                    <p>{detalleServicio.address || 'Sin dirección registrada'}</p>
                    {(detalleServicio.coordinates || detalleServicio.coordenadas) && (
                      <p className="ta-info-coords">
                        Coordenadas: {detalleServicio.coordinates || detalleServicio.coordenadas}
                      </p>
                    )}
                    <button
                      type="button"
                      className="ta-link-btn"
                      onClick={() => abrirMapa(detalleServicio.coordinates || detalleServicio.coordenadas, detalleServicio.address)}
                    >
                      <MapPin size={14} /> Abrir en Google Maps
                    </button>
                  </div>
                </div>

                <div className="ta-info-row">
                  <User size={16} />
                  <div>
                    <label>Dueño / Cliente</label>
                    <p>{detalleServicio.client_name || detalleServicio.owner_name || "No especificado"}</p>
                  </div>
                </div>

                <div className="ta-info-row">
                  <UserCheck size={16} />
                  <div>
                    <label>Supervisor</label>
                    <p>{detalleServicio.supervisor_name || "No asignado"}</p>
                  </div>
                </div>
              </div>

              <div className="ta-note">
                <h4><FileText size={15} /> Instrucciones</h4>
                <p>{detalleServicio.description || "Sin instrucciones adicionales."}</p>
              </div>
            </div>

            <div className="ta-modal-footer">
              <button type="button" className="ta-btn ta-btn-secondary" onClick={() => setModalVisible(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrabajosAsignados;
