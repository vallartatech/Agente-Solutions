import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import "../../../styles/AgenteSolutions/Tecnico/CheckList.css";
import Header from "../../../components/Shared/Header";

const CheckList = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [seccionActiva, setSeccionActiva] = useState('herramientas');
  const [cargando, setCargando] = useState(true);

  const [items, setItems] = useState({
    herramientas: [],
    equipo: [],
    material: []
  });

  useEffect(() => {
    if (id) {
      cargarServicio();
    }
  }, [id]);

  const cargarServicio = async () => {
    try {
      const token = localStorage.getItem('agente_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/servicios/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data && data.custom_checklist) {
        setItems({
          herramientas: data.custom_checklist.herramientas || [],
          equipo: data.custom_checklist.equipo || [],
          material: data.custom_checklist.material || []
        });
      }
    } catch (e) {
      console.error("Error cargando checklist", e);
    }
    setCargando(false);
  };

  // ACTUALLY, ServiceController has a generic update method: Route::put('/servicios/{id}', [ServiceController::class, 'update']);
  // Let's use that one.
  const guardarProgresoReal = async (nuevoItems) => {
    try {
      const token = localStorage.getItem('agente_token');
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/servicios/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ custom_checklist: nuevoItems })
      });
    } catch (e) {
      console.error("Error guardando", e);
    }
  };

  const handleToggle = useCallback((itemId) => {
    setItems(prev => {
      const nuevosItems = {
        ...prev,
        [seccionActiva]: prev[seccionActiva].map(item =>
          item.id === itemId
            ? { ...item, completed: !item.completed, completado: item.completado !== undefined ? !item.completado : !item.completed }
            : item
        )
      };
      guardarProgresoReal(nuevosItems);
      return nuevosItems;
    });
  }, [seccionActiva, id]);

  return (
    <>
      <Header />
      <div className="cl-body" style={{ marginTop: '20px' }}>

        {/* TABS */}
        <div className="cl-tabs-container">
          {['herramientas', 'equipo', 'material'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`cl-tab ${seccionActiva === tab ? 'active' : ''}`}
              onClick={() => setSeccionActiva(tab)}
              style={{ textTransform: 'uppercase' }}
            >
              {tab === 'equipo' ? 'EQUIPO DE TRABAJO' : tab}
            </button>
          ))}
        </div>

        <div className="cl-main-card">
          <div className="cl-list-wrapper">
            <div className="cl-scroll-area">

              {cargando ? (
                <p style={{ textAlign: 'center', padding: '20px' }}>Cargando checklist...</p>
              ) : items[seccionActiva] && items[seccionActiva].length > 0 ? (
                items[seccionActiva].map((item) => {
                  const isChecked = item.completed || item.completado;
                  return (
                    <div
                      key={item.id}
                      className={`cl-item-row ${isChecked ? 'item-checked' : ''}`}
                      onClick={() => handleToggle(item.id)}
                    >
                      <div className="cl-check-box">
                        <input
                          type="checkbox"
                          className="cl-native-check"
                          checked={isChecked}
                          readOnly
                        />
                      </div>

                      <div className="cl-item-text">
                        {item.task || item.nombre}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No hay elementos en esta categoría.</p>
              )}

            </div>

            <div className="cl-black-bar"></div>
          </div>
        </div>

        <div className="cl-footer">
          <button
            type="button"
            className="cl-btn-siguiente"
            onClick={() => navigate('/detalleTrabajo')}
          >
            SIGUIENTE
          </button>
        </div>

      </div>
    </>
  );
};

export default CheckList;
