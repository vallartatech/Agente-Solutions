import React, { useState } from 'react';
import Header from '../../../components/Shared/Header';
import { Star, Trash2, MapPin, Phone } from 'lucide-react';
import '../../../styles/AgenteMarket/Admin/FavoritosAutonomo.css';

const mockFavoritos = [
  { id: 1, nombre: "Juan Pérez", especialidad: "Aire Acondicionado", rating: 4.8, ubicacion: "Mérida, Norte", telefono: "999-123-4567" },
  { id: 2, nombre: "Carlos Sánchez", especialidad: "Plomería General", rating: 4.5, ubicacion: "Mérida, Centro", telefono: "999-987-6543" }
];

const FavoritosAutonomo = () => {
  const [favoritos, setFavoritos] = useState(mockFavoritos);

  const removeFavorito = (id) => {
    setFavoritos(favoritos.filter(f => f.id !== id));
  };

  return (
    <div className="fav-autonomo-container">
      <Header title="Mis Técnicos Favoritos" />
      
      <div className="fav-content">
        <div className="fav-header">
          <p>Puedes guardar hasta un máximo de <strong>3 técnicos</strong> en tus favoritos para acceso rápido.</p>
          <div className="fav-counter">
            {favoritos.length} / 3 Guardados
          </div>
        </div>

        <div className="fav-grid">
          {favoritos.map(tecnico => (
            <div key={tecnico.id} className="fav-card">
              <div className="fav-card-header">
                <div className="fav-avatar">
                  {tecnico.nombre.charAt(0)}
                </div>
                <div className="fav-info">
                  <h3>{tecnico.nombre}</h3>
                  <span className="fav-especialidad">{tecnico.especialidad}</span>
                </div>
                <button 
                  className="fav-remove-btn" 
                  onClick={() => removeFavorito(tecnico.id)}
                  title="Eliminar de favoritos"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="fav-card-body">
                <div className="fav-stat">
                  <Star size={16} className="star-filled" />
                  <span>{tecnico.rating} Calificación Promedio</span>
                </div>
                <div className="fav-stat">
                  <MapPin size={16} />
                  <span>{tecnico.ubicacion}</span>
                </div>
                <div className="fav-stat">
                  <Phone size={16} />
                  <span>{tecnico.telefono}</span>
                </div>
              </div>
              
              <div className="fav-card-footer">
                <button className="fav-btn-contact">Contactar Directamente</button>
              </div>
            </div>
          ))}

          {favoritos.length === 0 && (
            <div className="fav-empty-state">
              <Star size={48} className="fav-empty-icon" />
              <h3>Aún no tienes técnicos favoritos</h3>
              <p>Al terminar un trabajo satisfactorio o desde la red, puedes agregar técnicos aquí.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FavoritosAutonomo;
