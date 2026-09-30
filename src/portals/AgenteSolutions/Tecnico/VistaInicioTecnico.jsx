import React from 'react';
import { useNavigate } from 'react-router-dom'; 
import '../../../styles/AgenteSolutions/Tecnico/VistaInicioTecnico.css';
import Header from '../../../components/Shared/Header';

const VistaInicioTecnico = () => {
  const navigate = useNavigate();

  return (
    <div className="main-container">
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <div className="content-wrapper">
        <Header rolTexto="TÉCNICO INTERNO" />

        <div className="search-container">
          <div className="search-bar">
            <input type="text" placeholder="BUSCAR" />
          </div> 
        </div>

        <nav className="menu-grid">
          <div className="menu-card">
            <div className="card-inner" onClick={() => navigate('/trabajos-tecnico')}>
              <div className="icon-placeholder">⚙️</div>
              <span className="card-title">TRABAJOS</span>
            </div>
          </div>

          <div className="menu-card">
            <div className="card-inner" onClick={() => navigate('/trabajos-asignados')}>
              <div className="icon-placeholder">📋</div>
              <span className="card-title">LEVANTAMIENTOS</span>
            </div>
          </div>

          <div className="menu-card">
            <div className="card-inner" onClick={() => navigate('/vista-cotizaciones')}>
              <div className="icon-placeholder">📄</div>
              <span className="card-title">COTIZACIONES</span>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default VistaInicioTecnico;

