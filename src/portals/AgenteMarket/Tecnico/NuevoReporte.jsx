import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import "../../../styles/AgenteSolutions/Tecnico/ReporteIndividual.css";
import { Camera, ChevronLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import Header from '../../../components/Shared/Header';
import Swal from 'sweetalert2';

const NuevoReporte = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const trabajoId = location.state?.trabajoId;
  const servicio = location.state?.servicio;
  const returnPath = location.state?.from || '/mercado-trabajos';
  const stageKey = location.state?.stageKey || 'ANTES';

  const [imagePreview, setImagePreview] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const openPhotoMenu = () => {
    setIsPhotoMenuOpen(true);
  };

  const selectPhotoSource = (source) => {
    if (source === 'camera') {
      cameraRef.current?.click();
    } else {
      galleryRef.current?.click();
    }
    setIsPhotoMenuOpen(false);
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 12 * 1024 * 1024) {
        Swal.fire('Imagen muy pesada', 'Por favor selecciona una foto menor a 12MB.', 'warning');
        return;
      }
      const previewURL = URL.createObjectURL(file);
      setImagePreview(previewURL);
      setImageFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!descripcion.trim()) {
      Swal.fire('Descripción requerida', 'Por favor escribe una descripción del reporte.', 'warning');
      return;
    }
    if (!imageFile) {
      Swal.fire('Foto requerida', 'Debes subir una fotografía como evidencia.', 'warning');
      return;
    }
    if (!trabajoId) {
      Swal.fire('Error', 'No se encontró el identificador del trabajo.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const formData = new FormData();
      const tag = `[${stageKey}]`;
      const cleanDesc = descripcion.replace(/\[(ANTES|DURANTE|DESPUÉS|DESPUES|EXTRA)\]/gi, '').trim();
      formData.append('description', `${tag} ${cleanDesc}`);
      formData.append('image', imageFile);

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/servicios/${trabajoId}/reportes`, formData, { headers });

      Swal.fire({
        icon: 'success',
        title: '¡Reporte Guardado!',
        text: 'La evidencia inicial se ha registrado con éxito.',
        timer: 1800,
        showConfirmButton: false,
      });

      navigate(`/galeria-reportes/${trabajoId}`, { 
        state: { trabajoId, servicio, from: returnPath } 
      });
    } catch (error) {
      console.error('Error al guardar reporte:', error);
      Swal.fire('Error al Guardar', 'Ocurrió un error al intentar guardar el reporte. Inténtalo de nuevo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="report-detail-body" style={{ marginTop: '20px', flexDirection: 'column' }}>
        {/* BOTÓN REGRESAR */}
        <div style={{ width: '90%', maxWidth: '1000px', marginBottom: '20px', display: 'flex' }}>
          <button 
            onClick={() => navigate(returnPath, { state: { servicio, trabajoId } })}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F26522', color: 'white', padding: '10px 20px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(242, 101, 34, 0.25)' }}
          >
            <ChevronLeft size={20} />
            <span>REGRESAR</span>
          </button>
        </div>

        <div className="report-main-card">
          <div className="report-inner-content">
            
            <h3 className="report-label">NUEVO REPORTE DE SERVICIO</h3>
            
            <div className="report-flex-container">

              {/* IMAGEN */}
              <div 
                className="report-image-box upload-box"
                onClick={openPhotoMenu}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview del reporte"
                    className="report-image-preview"
                  />
                ) : (
                  <div className="upload-placeholder">
                    <Camera size={60} strokeWidth={1} color="#F26522" />
                    <p style={{ fontWeight: 800, color: '#1e293b' }}>TAP PARA SUBIR FOTO</p>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cámara o Galería</span>
                  </div>
                )}

                <input
                  type="file"
                  ref={cameraRef}
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  accept="image/*"
                  capture="environment"
                />
                <input
                  type="file"
                  ref={galleryRef}
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  accept="image/*"
                />
              </div>

              {/* DESCRIPCIÓN */}
              <div className="report-info-box">
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Escribe la descripción del reporte aquí..."
                  className="report-textarea"
                />
              </div>

            </div>

            {/* BOTÓN */}
            <div className="report-footer">
              <button
                type="button"
                className="btn-guardar-reporte"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>SUBIENDO REPORTE...</span>
                  </>
                ) : (
                  'GUARDAR REPORTE'
                )}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE FOTO */}
      {isPhotoMenuOpen && (
        <div className="modal-overlay" onClick={() => setIsPhotoMenuOpen(false)}>
          <div className="modal-content photo-menu-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: '#ff6600', borderBottom: '2px solid #EEEEEE' }}>Subir Evidencia</h3>
            <div className="photo-menu-actions">
              <button className="btn-menu-action" onClick={() => selectPhotoSource('camera')}>
                📷 Tomar Foto
              </button>
              <button className="btn-menu-action" onClick={() => selectPhotoSource('gallery')}>
                🖼️ Elegir de la Galería
              </button>
              <button className="btn-menu-action btn-menu-cancel" onClick={() => setIsPhotoMenuOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NuevoReporte;
