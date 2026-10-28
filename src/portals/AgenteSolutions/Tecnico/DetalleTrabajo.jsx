import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import "../../../styles/AgenteSolutions/Tecnico/DetalleTrabajo.css";
import { User, Image as ImageIcon, CheckCircle, Navigation } from 'lucide-react';
import Header from '../../../components/Shared/Header';

const DetalleTrabajo = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // ESTADO PARA EL MODAL
  const [mostrarModal, setMostrarModal] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/${id}`);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching work details:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchData();
    }
  }, [id]);

  const equipo = data?.technicians || [];

  if (loading) {
    return <div className="loading-screen">Cargando detalles...</div>;
  }

  if (!data) {
    return <div className="error-screen">No se encontraron los detalles del trabajo.</div>;
  }

  return (
    <>
      <Header />
      <div className="details-body" style={{ marginTop: '80px' }}>
        <div className="details-card">

          {/* FILA SUPERIOR */}
          <div className="details-top-row">
            <div className="info-pill">
              <span className="pill-label">FOLIO</span>
              <span className="pill-value">{data.id}</span>
            </div>

            <div className="info-pill">
              <span className="pill-label">ID PROPIEDAD</span>
              <span className="pill-value">{data.identificador_curp || data.property_id}</span>
            </div>
          </div>

          {/* GRID CENTRAL */}
          <div className="details-middle-grid">
            <div className="desc-box">
              <span className="box-label">DESCRIPCIÓN</span>
              <div className="custom-scrollbar-content">
                <p>{data.descripcion || 'Sin descripción disponible.'}</p>
                <div style={{ marginTop: '15px' }}>
                  <strong>Dirección:</strong> {data.direccion}
                </div>
                {data.coordenadas && (
                  <button className="btn-nav-map" onClick={() => window.open(`https://maps.google.com/?q=${data.coordenadas}`, '_blank')}>
                    <Navigation size={14} /> CÓMO LLEGAR
                  </button>
                )}
              </div>
            </div>

            <div className="photo-placeholder">
              {data.foto_fachada ? (
                <img src={data.foto_fachada} alt="Fachada" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '15px' }} />
              ) : (
                <ImageIcon size={60} strokeWidth={1.5} />
              )}
            </div>

            <div className="team-section">
              <div className="team-header-pill">EQUIPO DE TRABAJO</div>
              <div className="team-container">
                <div className="team-list">
                  {equipo.map((member) => (
                    <div key={member.id} className="team-member-card">
                      <div className="member-avatar">
                        {member.picture ? (
                          <img src={member.picture} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className="member-info">
                        <p className="team-member-name">{member.name}</p>
                        <p>ID: {member.id}</p>
                        <p>ÁREA: {member.role || 'TÉCNICO'}</p>
                      </div>
                    </div>
                  ))}
                  {equipo.length === 0 && <p className="no-team-msg">No hay equipo asignado.</p>}
                </div>
              </div>
            </div>
          </div>

          {/* GRID INFERIOR */}
          <div className="details-bottom-grid">
            <div className="reports-box">
              <div className="reports-column">
                <span className="box-label-reports">REPORTES</span>
                <button
                  type="button"
                  className="btn-ver-mas"
                  onClick={() => navigate(`/galeria-reportes/${id}`, { state: { trabajoId: id, servicio: data } })}
                >
                  VER MÁS
                </button>
              </div>
              <div className="photo-placeholder-small">
                <ImageIcon size={50} strokeWidth={1.5} />
              </div>
            </div>

            <div className="dates-and-action">
              <div className="dates-row">
                <div className="date-pill">
                  <span className="date-label">FECHA PROGRAMADA</span>
                  <span className="date-value">{data.fecha_programada ? new Date(data.fecha_programada).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <div className="action-buttons-container">
                <button 
                  type="button" 
                  className="btn-guardar"
                  onClick={() => navigate('/nuevo-reporte', { state: { trabajoId: data.id } })}
                >
                  INICIAR REPORTE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      <AnimatePresence>
        {mostrarModal && (
          <div className="modal-overlay-save">
            <motion.div 
              className="modal-content-save"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <CheckCircle size={50} color="#E68A4B" />
              <h3>¡LISTO!</h3>
              <p>Cambios guardados correctamente</p>
              <button 
                className="btn-aceptar-modal" 
                onClick={() => setMostrarModal(false)}
              >
                ACEPTAR
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DetalleTrabajo;
