import { useNavigate, useLocation } from 'react-router-dom';
import "../../../styles/AgenteSolutions/Tecnico/ReporteIndividual.css";
import { Image as ImageIcon, ChevronLeft } from 'lucide-react';
import Header from '../../../components/Shared/Header';

const ReporteIndividual = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const reporte = location.state?.reporte || {
    titulo: "REPORTE NO ENCONTRADO",
    description: "",
    image_url: null,
    technician: null
  };

  return (
    <>
      <Header />
      <div className="report-detail-body" style={{ marginTop: '20px', flexDirection: 'column' }}>
        <div style={{ width: '90%', maxWidth: '1000px', marginBottom: '20px', display: 'flex' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F26522', color: 'white', padding: '10px 20px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <ChevronLeft size={20} />
            <span>REGRESAR</span>
          </button>
        </div>

        <div className="report-main-card">
          <div className="report-inner-content">
            
            <h3 className="report-label">REPORTE DE: {reporte.technician?.name || 'TÉCNICO'}</h3>

            <div className="report-flex-container">
              
              {/* IMAGEN */}
              <div className="report-image-box">
                {reporte.image_url ? (
                  <img
                    src={reporte.image_url}
                    alt="Imagen del reporte"
                    className="report-image-preview"
                  />
                ) : (
                  <ImageIcon size={100} strokeWidth={1} color="#333" />
                )}
              </div>

              {/* INFORMACIÓN */}
              <div className="report-info-box">
                {reporte.description ? (
                  <p>{reporte.description}</p>
                ) : (
                  <p className="report-empty-text">
                    No hay información disponible para este reporte.
                  </p>
                )}
              </div>
            </div>

            {/* BOTÓN */}
            <div className="report-footer">
              <button
                type="button"
                className="btn-guardar-reporte"
                onClick={() => {
                  const id = reporte.work_order_id ? `work_order-${reporte.work_order_id}` : `servicio-${reporte.service_id}`;
                  navigate(`/galeria-reportes/${id}`, { state: { trabajoId: id } });
                }}
              >
                VOLVER A LA GALERÍA
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default ReporteIndividual;
