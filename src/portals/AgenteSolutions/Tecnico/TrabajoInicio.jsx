import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import "../../../styles/AgenteSolutions/Tecnico/TrabajoInicio.css";
import { User, Navigation } from 'lucide-react';
import Header from '../../../components/Shared/Header';

const TrabajoInicio = () => {
  const navigate = useNavigate();
  const { id } = useParams();

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

  if (loading) return <div className="tt-body-full"><div style={{padding: '50px', color: '#000'}}>Cargando información...</div></div>;
  if (!data) return <div className="tt-body-full"><div style={{padding: '50px', color: '#000'}}>Error al cargar datos.</div></div>;

  const equipo = data?.technicians || [];



  return (
    <>
    <Header />
    <div className="tt-body-full" style={{ marginTop: '10px' }}>
      <div className="tt-main-card-large">
        
        {/* BURBUJAS SUPERIORES - SIN LOGO AQUÍ */}
        <div className="tt-top-info-group">
          <div className="tt-bubble-info">
            <span>FOLIO</span>
            <strong>{data.id}</strong>
          </div>
          <div className="tt-bubble-info">
            <span>PROPIEDAD</span>
            <strong>{data.propiedad_nombre || 'Sin Nombre'}</strong>
          </div>
          <div className="tt-bubble-info">
            <span>CURP / ID</span>
            <strong>{data.identificador_curp || data.property_id}</strong>
          </div>
          <div className="tt-bubble-info">
            <span>FECHA PROGRAMADA</span>
            <strong>{data.fecha_programada ? new Date(data.fecha_programada).toLocaleDateString() : 'Por asignar'}</strong>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="tt-detail-layout">
          
          {/* IZQUIERDA */}
          <div className="tt-detail-left">
            <div className="tt-label-pill">DESCRIPCIÓN</div>
            <div className="tt-description-box">
              <p style={{ color: '#000', margin: 0 }}>{data.descripcion || 'Sin descripción disponible.'}</p>
              <div style={{ marginTop: '15px', color: '#000', fontSize: '14px' }}>
                <p><strong>Propiedad:</strong> {data.propiedad_nombre}</p>
                <p><strong>Dirección:</strong> {data.direccion}</p>
                <p><strong>Propietario:</strong> {data.propietario}</p>
              </div>
              {data.coordenadas && (
                <button 
                  style={{ marginTop: '15px', padding: '10px 20px', borderRadius: '15px', backgroundColor: '#333', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                  onClick={() => window.open(`https://maps.google.com/?q=${data.coordenadas}`, '_blank')}
                >
                  <Navigation size={16} /> CÓMO LLEGAR
                </button>
              )}
            </div>
          </div>

          {/* DERECHA */}
          <div className="tt-detail-right">
            <div className="tt-label-pill">EQUIPO DE TRABAJO</div>
            <div className="tt-team-container">
              <div className="tt-team-scroll">
                {equipo.map((miembro, index) => (
                  <div key={index} className="tt-member-card">
                    <div className="tt-member-avatar">
                      {miembro.picture ? (
                        <img src={miembro.picture} alt={miembro.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <User size={22} color="#000" />
                      )}
                    </div>
                    <div className="tt-member-data">
                      <p style={{ color: '#fff', fontSize: '12px' }}>{miembro.name}</p>
                      <p style={{ color: '#ddd' }}>ID: {miembro.id}</p>
                      <p style={{ color: '#ddd' }}>ÁREA: {miembro.role || 'TÉCNICO'}</p>
                    </div>
                  </div>
                ))}
                {equipo.length === 0 && <p style={{ color: '#000', fontWeight: 'bold' }}>No hay equipo asignado.</p>}
              </div>
              {/* Línea negra sólida de scroll */}
              <div className="tt-black-scroll-line"></div>
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="tt-footer-actions">
          <button className="tt-btn-action orange" onClick={() => navigate('/detalleTrabajo/' + id)}>
            INICIAR
          </button>
          <button className="tt-btn-action purple" onClick={() => navigate('/agendar')}>
            AGENDAR
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default TrabajoInicio;
