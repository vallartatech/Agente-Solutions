import React from 'react';
import Header from '../../../components/Shared/Header';
import { Star, MapPin, Phone, CheckCircle, Shield, Award } from 'lucide-react';
import '../../../styles/AgenteMarket/Admin/PerfilTecnicoRed.css';

const PerfilTecnicoRed = () => {
  // En la vida real, sacarías el ID de los params y harías un fetch
  const tecnico = {
    nombre: "Juan Pérez",
    especialidad: "Técnico en Refrigeración y A/C",
    rating: 4.8,
    reseñas: 124,
    ubicacion: "Mérida, Norte",
    telefono: "999-123-4567",
    trabajosCompletados: 89,
    miembroDesde: "2023",
    descripcion: "Especialista con más de 10 años de experiencia en instalación y mantenimiento de aires acondicionados residenciales e industriales. Trabajo rápido, limpio y garantizado.",
    comentarios: [
      { id: 1, autor: "María G.", texto: "Excelente servicio, muy puntual y limpio.", rating: 5, fecha: "Hace 2 días" },
      { id: 2, autor: "Carlos S.", texto: "Resolvió el problema rápido pero llegó un poco tarde.", rating: 4, fecha: "Hace 1 semana" }
    ]
  };

  return (
    <div className="perfil-tecnico-container">
      <Header title="Perfil del Técnico" />
      
      <div className="perfil-tecnico-content">
        <div className="perfil-header-card">
          <div className="perfil-avatar-large">
            {tecnico.nombre.charAt(0)}
          </div>
          <div className="perfil-info-main">
            <h2>{tecnico.nombre} <Shield size={18} className="verified-badge" title="Identidad Verificada" /></h2>
            <p className="perfil-especialidad">{tecnico.especialidad}</p>
            
            <div className="perfil-stats-row">
              <span className="perfil-rating-badge">
                <Star size={16} className="star-filled" /> {tecnico.rating}
              </span>
              <span>({tecnico.reseñas} reseñas)</span>
              <span><MapPin size={16} /> {tecnico.ubicacion}</span>
            </div>
            
            <div className="perfil-actions">
              <button className="perfil-btn-primary">Cotizar Trabajo Directo</button>
              <button className="perfil-btn-secondary"><Star size={16} /> Añadir a Favoritos</button>
            </div>
          </div>
        </div>

        <div className="perfil-body-grid">
          <div className="perfil-main-column">
            <div className="perfil-section">
              <h3>Acerca del Técnico</h3>
              <p>{tecnico.descripcion}</p>
            </div>

            <div className="perfil-section">
              <h3>Reseñas de Clientes</h3>
              <div className="perfil-reviews-list">
                {tecnico.comentarios.map(com => (
                  <div key={com.id} className="perfil-review-item">
                    <div className="perfil-review-header">
                      <strong>{com.autor}</strong>
                      <span className="perfil-review-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < com.rating ? "star-filled" : "star-empty"} />
                        ))}
                      </span>
                    </div>
                    <p>"{com.texto}"</p>
                    <span className="perfil-review-date">{com.fecha}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="perfil-side-column">
            <div className="perfil-info-card">
              <h3>Estadísticas</h3>
              <div className="perfil-stat-item">
                <Award size={20} className="stat-icon" />
                <div>
                  <strong>{tecnico.trabajosCompletados}</strong>
                  <span>Trabajos Completados en la Red</span>
                </div>
              </div>
              <div className="perfil-stat-item">
                <CheckCircle size={20} className="stat-icon" />
                <div>
                  <strong>100%</strong>
                  <span>Tasa de Finalización</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilTecnicoRed;
