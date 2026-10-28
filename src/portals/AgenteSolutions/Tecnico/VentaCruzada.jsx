import { useState } from 'react';
import "../../../styles/AgenteSolutions/Tecnico/VentaCruzada.css";
import { Trash2 } from 'lucide-react';

const VentaCruzada = () => {
  const [showModal, setShowModal] = useState(false);

  const ventas = [
    { folio: "1234", tecnico: "MARIO", desc: "PARED CUARTEADA ...", fecha: "06-02-2026" },
    { folio: "1234", tecnico: "MARIO", desc: "PARED CUARTEADA ...", fecha: "06-02-2026" },
  ];

  return (
    <>
      <div className="vc-body-content">
        <div className="vc-top-row">
          <div className="id-prop-box-horizontal">
            <span className="id-prop-label">ID PROPIEDAD:</span>
            <span className="id-prop-value">JDJF123</span>
          </div>
          
          <div className="vc-actions">
            <button className="btn-enviar-vc">ENVIAR</button>
<button 
  type="button" 
  className="btn-add-vc btn-plus-orange-slim" /* Agregamos ambas clases */
  onClick={() => setShowModal(true)}
>
  +
</button>         </div>
        </div>

        <div className="tt-table-container">
          <div className="vc-grid-header">
            <div className="tt-header-pill">FOLIO</div>
            <div className="tt-header-pill">TÉCNICO</div>
            <div className="tt-header-pill">DESCRIPCIÓN</div>
            <div className="tt-header-pill">FECHA DE REGISTRO</div>
            <div style={{ width: '40px' }}></div>
          </div>

          <div className="tt-scrollable-rows">
            {ventas.map((item, index) => (
              <div key={index} className="vc-row-card-slim">
                <div className="vc-grid-content">
                  <span className="col-text">{item.folio}</span>
                  <span className="col-text">{item.tecnico}</span>
                  <span className="col-text">{item.desc}</span>
                  <span className="col-text">{item.fecha}</span>
                  <div className="col-trash">
                    <button className="btn-trash-vc">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header-row">
              <h2 className="modal-main-title">NUEVA VENTA CRUZADA</h2>
              <button className="modal-close-small" onClick={() => setShowModal(false)}>X</button>
            </div>
            <div className="modal-form">
              <div className="form-row-vc">
                <div className="input-group-vc">
                  <label>FOLIO</label>
                  <input type="text" className="pill-input-vc" placeholder="0000" />
                </div>
                <div className="input-group-vc">
                  <label>FECHA</label>
                  <input type="text" className="pill-input-vc" value="06-02-2026" readOnly />
                </div>
              </div>
              <div className="input-group-vc">
                <label>TÉCNICO</label>
                <input type="text" className="pill-input-vc" value="MARIO" readOnly />
              </div>
              <div className="input-group-vc">
                <label>DESCRIPCIÓN</label>
                <textarea className="pill-input-vc tarea-vc" rows="3" placeholder="Escriba la descripción aquí..."></textarea>
              </div>
              <button className="btn-registrar-vc" onClick={() => setShowModal(false)}>REGISTRAR</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VentaCruzada;
