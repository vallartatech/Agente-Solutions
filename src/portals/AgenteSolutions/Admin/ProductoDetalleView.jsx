import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios';
import { ChevronLeft, Camera, MapPin, Calendar, ClipboardList } from 'lucide-react';
import '../../../styles/AgenteSolutions/Admin/ProductoDetalleView.css';

const ProductoDetalleView = ({ producto, onBack }) => {
  const navigate = useNavigate();
  const [indexUbicacion, setIndexUbicacion] = useState(0);
  
  // Estados para manejar los datos 
  const [detalleProducto, setDetalleProducto] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!producto) return;

    const fetchDetalles = async () => {
      try {
        setCargando(true);
        const url = `${import.meta.env.VITE_API_BASE_URL}/catalog/details?brand=${encodeURIComponent(producto.brand)}&model=${encodeURIComponent(producto.product_model)}`;
        const respuesta = await axios.get(url);
        
        setDetalleProducto(respuesta.data);
      } catch (error) {
        console.error("Error al cargar los detalles de ubicaciones:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchDetalles();
  }, [producto]);

  const manejarVerDetalle = (rep) => {
    navigate('/reportepi', { 
      state: { 
        reporte: rep, 
        producto: producto 
      } 
    });
  };

  if (!producto) return null;

  if (cargando) {
    return (
      <div className="detalle-producto-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#fff' }}>
        <h2>Cargando ubicaciones y reportes...</h2>
      </div>
    );
  }

  const ubicaciones = detalleProducto?.ubicaciones || [];
  const ubiSeleccionada = ubicaciones[indexUbicacion];

  return (
    <div className="detalle-producto-page">
      <header className="detalle-header">
        <button onClick={onBack} className="btn-back">
          <ChevronLeft size={20} /> Volver
        </button>
        <div className="producto-main-title">
          <h1>{producto.product_model}</h1>
          <span className="badge-id">{producto.id}</span>
        </div>
      </header>

      <div className="propiedad-filter-bar">
        <label><MapPin size={18} /> INSTALACIONES DETECTADAS:</label>
        <div className="filter-chips">
          {ubicaciones.length > 0 ? ubicaciones.map((ubi, idx) => (
            <button 
              key={idx} 
              className={`chip ${indexUbicacion === idx ? 'active' : ''}`}
              onClick={() => setIndexUbicacion(idx)}
            >
              {ubi.nombre}
            </button>
          )) : (
            <span style={{ color: '#888', fontStyle: 'italic', paddingLeft: '10px' }}>No hay instalaciones registradas.</span>
          )}
        </div>
      </div>

      <div className="detalle-grid">
        <aside className="info-sidebar">
          <div className="card-static">
            <h4>DATOS DE ADQUISICIÓN</h4>
            <div className="info-item">
              <label>Proveedor Master:</label>
              <span>{detalleProducto?.proveedor || "No registrado"}</span>
            </div>
            <div className="info-item">
              <label>Garantía Global:</label>
              <span className="text-orange-600 font-bold">{producto.average_warranty || "N/A"}</span>
            </div>
          </div>

          <div className="card-static mt-4">
            <h4>RESUMEN DE UBICACIÓN</h4>
            <div className="info-item">
              <label>Equipos en sitio:</label>
              <span>{ubiSeleccionada?.totalInstalados || 0} Unidades</span>
            </div>
            <div className="info-item">
              <label>Estatus Garantía:</label>
              <span className="status-badge-active">Activa</span>
            </div>
          </div>
        </aside>

        <main className="propiedades-container">
          {ubiSeleccionada ? (
            <div className="propiedad-card">
              <div className="propiedad-header">
                <h3>📍 {ubiSeleccionada.nombre}</h3>
              </div>

              <div className="reportes-section">
                <h4><ClipboardList size={18} /> Historial de Equipos y Reportes</h4>
                <table className="table-mini">
                  <thead>
                    <tr>
                      <th>INSTALACIÓN</th>
                      <th>VENCIMIENTO</th>
                      <th>TÉCNICO</th>
                      <th>ACCIÓN / REPORTE</th>
                      <th>EVIDENCIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ubiSeleccionada.reportes && ubiSeleccionada.reportes.length > 0 ? (
                      ubiSeleccionada.reportes.map((rep, rIdx) => (
                        <tr key={rIdx}>
                          <td className="font-medium text-slate-700">
                            <div className="flex items-center gap-1">
                                <Calendar size={12} className="text-slate-400" />
                                {rep.fechaInstalacion || rep.fecha} 
                            </div>
                          </td>
                          <td>
                            <span className="status-badge-vence">
                                {rep.vencimiento || "N/A"}
                            </span>
                          </td>
                          <td>{rep.tecnico}</td>
                          <td className="text-left">{rep.tipo}</td>
                          <td>
                            <button 
                              className="btn-evidencia" 
                              onClick={() => manejarVerDetalle(rep)}
                            >
                              <Camera size={16} /> Ver Fotos
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ padding: '40px', color: '#94a3b8', textAlign: 'center' }}>
                          No hay reportes ni equipos registrados para esta ubicación.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card-static" style={{ textAlign: 'center', padding: '50px' }}>
              Selecciona una instalación para ver su historial.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductoDetalleView;
