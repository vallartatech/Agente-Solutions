import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Star, Clock, X, CheckCircle, Award, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import '../../styles/Shared/ModalCalificarTecnico.css';

const ModalCalificarTecnico = ({
  isOpen,
  onClose,
  technician, // { id, name, picture, specialty }
  workOrderId,
  serviceId,
  scheduledAt,
  arrivedAt,
  onlyTime = false,
  isCancellation = false,
  cancellationReason = '',
  onSuccess
}) => {
  const [ratingStars, setRatingStars] = useState(onlyTime ? null : 5);
  const [hoverStars, setHoverStars] = useState(0);
  const [ratingTime, setRatingTime] = useState(isCancellation ? 1 : 5);
  const [hoverTime, setHoverTime] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const starLabels = {
    1: '1/5 - Muy insatisfecho',
    2: '2/5 - Trabajo deficiente',
    3: '3/5 - Regular / Aceptable',
    4: '4/5 - Buen trabajo',
    5: '5/5 - ¡Excelente calidad!'
  };

  const timeLabels = {
    1: '1/5 - Canceló / Muy impuntual',
    2: '2/5 - Llegó tarde / Desfase notable',
    3: '3/5 - Pequeño retraso tolerable',
    4: '4/5 - Puntual a tiempo',
    5: '5/5 - ¡Súper puntual / Llegada impecable!'
  };

  const getArrivalDelayText = () => {
    if (isCancellation) {
      return { text: 'Servicio cancelado por el técnico', onTime: false };
    }
    if (!scheduledAt || !arrivedAt) return null;
    try {
      const sched = new Date(scheduledAt);
      const arr = new Date(arrivedAt);
      const diffMinutes = Math.round((arr - sched) / 60000);
      if (diffMinutes <= 0) {
        return { text: `Llegó a tiempo (${Math.abs(diffMinutes)} min antes)`, onTime: true };
      }
      return { text: `Llegó con ${diffMinutes} min de desfase`, onTime: false };
    } catch {
      return null;
    }
  };

  const delayInfo = getArrivalDelayText();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!technician?.id) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró la información del técnico.',
        background: '#191e2b',
        color: '#fff'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/technician-reviews`,
        {
          technician_id: technician.id,
          work_order_id: workOrderId || null,
          service_id: serviceId || null,
          rating_stars: onlyTime ? null : ratingStars,
          rating_time: ratingTime,
          comment: comment.trim()
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      Swal.fire({
        icon: 'success',
        title: '¡Muchas Gracias!',
        text: isCancellation 
          ? 'Se ha registrado la evaluación de puntualidad del técnico y se aplicó la penalización correspondiente.' 
          : 'Tu calificación y opinión ayudan a mantener la más alta calidad en el servicio.',
        confirmButtonColor: '#f26522',
        background: '#191e2b',
        color: '#fff'
      });

      if (onSuccess) {
        onSuccess(response.data);
      }
      onClose();
    } catch (error) {
      console.error('Error al enviar la reseña:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al enviar',
        text: error.response?.data?.message || 'No fue posible registrar tu calificación. Inténtalo de nuevo.',
        background: '#191e2b',
        color: '#fff'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="calif-modal-backdrop" onClick={onClose}>
      <div className="calif-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="calif-modal-header">
          <div className="calif-header-title-box">
            <Sparkles size={22} className="calif-sparkle-icon" />
            <div>
              <h3>
                {isCancellation 
                  ? 'Evaluación de Puntualidad' 
                  : (onlyTime ? 'Calificar Puntualidad' : 'Calificar Servicio')}
              </h3>
              <p className="calif-header-sub">
                {isCancellation
                  ? 'El técnico canceló su asistencia. Califica su puntualidad para el registro de la red.'
                  : 'Tu evaluación ayuda a reconocer el buen trabajo y la puntualidad'}
              </p>
            </div>
          </div>
          <button className="calif-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Notice if cancelled */}
        {isCancellation && (
          <div style={{
            margin: '16px 24px 0 24px',
            padding: '12px 14px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#fca5a5', fontSize: '13px', display: 'block' }}>
                Servicio Cancelado por el Técnico
              </strong>
              <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '12.5px' }}>
                {cancellationReason ? `Motivo indicado: "${cancellationReason}"` : 'El técnico notificó que no asistirá a la cita programada.'}
              </p>
            </div>
          </div>
        )}

        {/* Technician summary card */}
        <div className="calif-tech-pill">
          <div className="calif-tech-avatar">
            {technician?.picture ? (
              <img src={technician.picture} alt={technician.name} />
            ) : (
              <span>{technician?.name ? technician.name.charAt(0).toUpperCase() : 'T'}</span>
            )}
          </div>
          <div className="calif-tech-meta">
            <h4>{technician?.name || 'Técnico Especialista'}</h4>
            <span className="calif-tech-spec">{technician?.specialty || 'Servicio Técnico Profesional'}</span>
          </div>
          {delayInfo && (
            <div className={`calif-delay-badge ${delayInfo.onTime ? 'ontime' : 'delayed'}`}>
              <Clock size={13} />
              <span>{delayInfo.text}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="calif-form-body">
          {/* Factor 1: ⏱️ Puntualidad y Tiempo (Relojes) */}
          <div className="calif-factor-block">
            <div className="calif-factor-header">
              <div className="calif-factor-badge time-badge">
                <Clock size={16} />
                <span>{onlyTime ? 'Puntualidad y Cumplimiento (5 Relojes)' : '1. Puntualidad y Tiempo de Llegada'}</span>
              </div>
              <span className="calif-current-label">
                {timeLabels[hoverTime || ratingTime]}
              </span>
            </div>
            <p className="calif-factor-desc">
              {isCancellation 
                ? '¿Cómo evalúas el aviso y cumplimiento de tiempos de este técnico?' 
                : '¿Qué tan puntual fue el técnico al arribar al domicilio?'}
            </p>
            <div className="calif-watches-row">
              {[1, 2, 3, 4, 5].map((num) => {
                const isFilled = (hoverTime || ratingTime) >= num;
                return (
                  <button
                    key={num}
                    type="button"
                    className={`calif-watch-btn ${isFilled ? 'filled' : ''}`}
                    onMouseEnter={() => setHoverTime(num)}
                    onMouseLeave={() => setHoverTime(0)}
                    onClick={() => setRatingTime(num)}
                    title={`${num} Relojes`}
                  >
                    <Clock size={28} className="calif-watch-icon" />
                    <span className="calif-btn-num">{num}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Factor 2: ⭐ Calidad del Trabajo (Estrellas) - Oculto si es cancelación / onlyTime */}
          {!onlyTime && (
            <div className="calif-factor-block">
              <div className="calif-factor-header">
                <div className="calif-factor-badge star-badge">
                  <Star size={16} />
                  <span>2. Calidad del Trabajo y Atención</span>
                </div>
                <span className="calif-current-label">
                  {starLabels[hoverStars || ratingStars]}
                </span>
              </div>
              <p className="calif-factor-desc">
                ¿Cómo calificas el resultado, diagnóstico, limpieza y solución técnica?
              </p>
              <div className="calif-stars-row">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isFilled = (hoverStars || ratingStars) >= num;
                  return (
                    <button
                      key={num}
                      type="button"
                      className={`calif-star-btn ${isFilled ? 'filled' : ''}`}
                      onMouseEnter={() => setHoverStars(num)}
                      onMouseLeave={() => setHoverStars(0)}
                      onClick={() => setRatingStars(num)}
                      title={`${num} Estrellas`}
                    >
                      <Star size={30} className="calif-star-icon" />
                      <span className="calif-btn-num">{num}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments section */}
          <div className="calif-comment-block">
            <label className="calif-comment-label">
              <MessageSquare size={15} />
              <span>Comentario u Observaciones (Opcional):</span>
            </label>
            <textarea
              className="calif-textarea"
              rows="3"
              placeholder="Cuéntanos más sobre el trato, la rapidez, o detalles del servicio realizado..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength="800"
            />
          </div>

          {/* Submit buttons */}
          <div className="calif-footer-actions">
            <button
              type="button"
              className="calif-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="calif-btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Award size={18} />
                  <span>Enviar Calificación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCalificarTecnico;
