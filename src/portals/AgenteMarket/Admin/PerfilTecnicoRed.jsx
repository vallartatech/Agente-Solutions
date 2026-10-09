import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../../components/Shared/Header';
import { Star, Clock, MapPin, Phone, CheckCircle, Shield, Award, Calendar, MessageSquare, ArrowLeft } from 'lucide-react';
import '../../../styles/AgenteMarket/Admin/PerfilTecnicoRed.css';

const PerfilTecnicoRed = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tecnico, setTecnico] = useState({
    id: id || 1,
    nombre: "Técnico Especialista",
    especialidad: "Técnico en Refrigeración y A/C",
    rating_stars_avg: 4.9,
    rating_time_avg: 4.8,
    total_reviews_count: 14,
    ubicacion: "Mérida, Yucatán",
    telefono: "999-123-4567",
    trabajosCompletados: 42,
    miembroDesde: "2024",
    descripcion: "Especialista certificado con amplia experiencia en diagnóstico, instalación y mantenimiento preventivo y correctivo de sistemas. Compromiso de puntualidad y calidad garantizada.",
    comentarios: []
  });

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/technicians/${id}/reviews`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data) {
          setTecnico((prev) => ({
            ...prev,
            id: res.data.technician?.id || prev.id,
            nombre: res.data.technician?.name || prev.nombre,
            rating_stars_avg: res.data.technician?.rating_stars_avg ?? 5.0,
            rating_time_avg: res.data.technician?.rating_time_avg ?? 5.0,
            total_reviews_count: res.data.technician?.total_reviews_count ?? res.data.reviews?.length ?? 0,
            comentarios: res.data.reviews || []
          }));
        }
      } catch (err) {
        console.warn('Usando datos demostrativos para perfil:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [id]);

  return (
    <div className="perfil-tecnico-container">
      <Header title="Perfil del Técnico de la Red" />

      <div className="perfil-tecnico-content">
        <button className="perfil-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Volver
        </button>

        <div className="perfil-header-card">
          <div className="perfil-avatar-large">
            {tecnico.nombre ? tecnico.nombre.charAt(0).toUpperCase() : 'T'}
          </div>
          <div className="perfil-info-main">
            <h2>
              {tecnico.nombre}{' '}
              <Shield size={18} className="verified-badge" title="Técnico Certificado" />
            </h2>
            <p className="perfil-especialidad">{tecnico.especialidad}</p>

            <div className="perfil-stats-row">
              {/* Dual-Factor: ⭐ Calidad */}
              <span className="perfil-dual-badge stars" title="Calificación de Calidad">
                <Star size={16} className="star-filled" />
                <strong>{Number(tecnico.rating_stars_avg).toFixed(1)}</strong>
                <small>Calidad</small>
              </span>

              {/* Dual-Factor: ⏱️ Puntualidad */}
              <span className="perfil-dual-badge clocks" title="Calificación de Puntualidad y Tiempo">
                <Clock size={16} className="clock-filled" />
                <strong>{Number(tecnico.rating_time_avg).toFixed(1)}</strong>
                <small>Puntualidad</small>
              </span>

              <span className="perfil-reviews-counter">
                ({tecnico.total_reviews_count} {tecnico.total_reviews_count === 1 ? 'reseña' : 'reseñas'})
              </span>
              <span>
                <MapPin size={16} /> {tecnico.ubicacion}
              </span>
            </div>

            <div className="perfil-actions">
              <button className="perfil-btn-primary">Cotizar Trabajo Directo</button>
              <button className="perfil-btn-secondary">
                <Phone size={16} /> Contactar
              </button>
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
              {tecnico.comentarios && tecnico.comentarios.length > 0 ? (
                <div className="perfil-reviews-list">
                  {tecnico.comentarios.map((com, idx) => (
                    <div key={com.id || idx} className="perfil-review-item">
                      <div className="perfil-review-header">
                        <div className="perfil-reviewer-info">
                          <strong>{com.client_name || com.autor || 'Cliente'}</strong>
                          {com.created_at && (
                            <span className="perfil-review-date">
                              {new Date(com.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="perfil-review-dual-ratings">
                          {/* Calidad */}
                          <span className="perfil-review-metric stars" title="Calidad del trabajo">
                            <Star size={13} className="star-filled" />
                            <span>{com.rating_stars ?? com.rating ?? 5}/5</span>
                          </span>
                          {/* Puntualidad */}
                          <span className="perfil-review-metric clocks" title="Puntualidad">
                            <Clock size={13} className="clock-filled" />
                            <span>{com.rating_time ?? 5}/5</span>
                          </span>
                        </div>
                      </div>
                      <p className="perfil-review-comment">"{com.comment || com.texto || 'Excelente atención.'}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="perfil-no-reviews">Aún no hay reseñas registradas para este técnico.</p>
              )}
            </div>
          </div>

          <div className="perfil-side-column">
            <div className="perfil-info-card">
              <h3>Desempeño y Métricas</h3>
              <div className="perfil-stat-item">
                <Award size={20} className="stat-icon" />
                <div>
                  <strong>{tecnico.trabajosCompletados}</strong>
                  <span>Trabajos Completados</span>
                </div>
              </div>
              <div className="perfil-stat-item">
                <CheckCircle size={20} className="stat-icon" />
                <div>
                  <strong>100%</strong>
                  <span>Tasa de Finalización</span>
                </div>
              </div>
              <div className="perfil-stat-item">
                <Clock size={20} className="stat-icon" style={{ color: '#38bdf8' }} />
                <div>
                  <strong>{Number(tecnico.rating_time_avg).toFixed(1)} / 5.0</strong>
                  <span>Índice de Puntualidad</span>
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
