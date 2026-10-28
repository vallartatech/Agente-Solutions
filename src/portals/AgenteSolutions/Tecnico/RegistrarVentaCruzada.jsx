import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../../../styles/AgenteSolutions/Tecnico/TrabajosTecnico.css";
import { mostrarAviso } from '../../../utils/dialogos';

const RegistrarVentaCruzada = () => {
  const navigate = useNavigate();

  const hoy = new Date().toLocaleDateString('es-MX');

  const [formData, setFormData] = useState({
    folio: '',
    tecnico: 'MARIO',
    descripcion: '',
    fechaRegistro: hoy,
    propiedadId: 'JDJF123'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    if (!formData.folio || !formData.descripcion) {
      mostrarAviso('Completa todos los campos obligatorios.');
      return;
    }

    console.log('Venta cruzada registrada:', formData);

    navigate(-1);
  };

  return (
    <>
      <div className="tt-body">
        <div className="vc-register-container">
          
          {/* ID Propiedad */}
          <div className="id-prop-container align-end">
            <span className="id-label">ID PROPIEDAD</span>
            <span className="id-value">{formData.propiedadId}</span>
          </div>

          {/* FORMULARIO */}
          <div className="vc-form-box">
            
            <div className="form-group">
              <label>FOLIO</label>
              <input
                type="text"
                name="folio"
                value={formData.folio}
                onChange={handleChange}
                className="form-input-pill"
              />
            </div>

            <div className="form-group">
              <label>TÉCNICO</label>
              <input
                type="text"
                name="tecnico"
                value={formData.tecnico}
                readOnly
                className="form-input-pill"
              />
            </div>

            <div className="form-group">
              <label>DESCRIPCIÓN</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className="form-input-pill textarea-vc"
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>FECHA DE REGISTRO</label>
              <input
                type="text"
                name="fechaRegistro"
                value={formData.fechaRegistro}
                readOnly
                className="form-input-pill"
              />
            </div>

          </div>

          {/* BOTÓN */}
          <button
            type="button"
            className="btn-venta-cruzada-full"
            style={{ marginTop: '20px' }}
            onClick={handleSubmit}
          >
            REGISTRAR
          </button>
        </div>
      </div>
    </>
  );
};

export default RegistrarVentaCruzada;
