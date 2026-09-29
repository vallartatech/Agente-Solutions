import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 
import '../../../styles/AgenteMarket/Tecnico/VistaInicioTecnico.css';
import { useAuth } from '../../../context/AuthContext';
import { Settings, Home, Wrench, Search, Upload, Download } from 'lucide-react';
import Header from '../../../components/Shared/Header';

const VistaInicioTecnico = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isIndependent = user?.role_id === 8;

  return (
    <div className="main-container">
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <div className="content-wrapper">
        
        <Header rolTexto="TÉCNICO" />

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

          {isIndependent ? (
            <div className="menu-card">
              <div className="card-inner" onClick={() => navigate('/mercado-trabajos')}>
                <div className="icon-placeholder">🌍</div>
                <span className="card-title">MERCADO / RED</span>
              </div>
            </div>
          ) : (
            <div className="menu-card">
              <div className="card-inner" onClick={() => navigate('/trabajos-asignados')}>
                <div className="icon-placeholder">📋</div>
                <span className="card-title">LEVANTAMIENTO</span>
              </div>
            </div>
          )}

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
