import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Type, Camera, MapPin, Loader2 } from 'lucide-react';
import axios from 'axios';
import '../../../styles/AgenteMarket/Cliente/ModalRegistroInmueble.css';

// Mismo diseño que ModalRegistroInmueble (clases mri-*), pero solo edita nombre, dirección y fachada.
const ModalEditarPropiedadCliente = ({ isOpen, onClose, propiedad, onSuccess }) => {
  const fileInputRef = useRef(null);

  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Gesto táctil: Arrastrar hacia abajo para cerrar (Swipe down to dismiss)
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (propiedad) {
      setNombre(propiedad.nombre_propiedad || propiedad.nombre || propiedad.alias || '');
      setDireccion(propiedad.address || propiedad.direccion || propiedad.calle || '');
      setFoto(null);
      setFotoPreview(
        propiedad.foto_url ||
        propiedad.facade_photo_path ||
        propiedad.facade_photo ||
        propiedad.imagen_url ||
        propiedad.foto ||
        null
      );
      setErrorMsg('');
    }
  }, [propiedad, isOpen]);

  const handleTouchStart = (e) => {
    if (e.target.closest('button, input, select, textarea, a')) return;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!touchStartY.current) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartY.current) return;
    setIsDragging(false);
    if (dragY > 80) {
      setDragY(window.innerHeight);
      setTimeout(() => {
        onClose();
        setDragY(0);
      }, 200);
    } else {
      setDragY(0);
    }
    touchStartY.current = 0;
  };

  if (!isOpen || !propiedad) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('La imagen seleccionada supera los 10MB.');
        return;
      }
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la propiedad es obligatorio.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('agente_token');
      const formData = new FormData();
      formData.append('property_name', nombre.trim());
      if (direccion.trim()) {
        formData.append('address', direccion.trim());
      }
      if (foto) {
        formData.append('facade_photo', foto);
      }

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/propiedades/${propiedad.id}/update`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const updatedData = {
        ...propiedad,
        nombre_propiedad: nombre.trim(),
        property_name: nombre.trim(),
        nombre: nombre.trim(),
        address: direccion.trim() || propiedad.address,
        direccion: direccion.trim() || propiedad.direccion,
        foto_url: data.foto_url || (foto ? fotoPreview : propiedad.foto_url),
        facade_photo_path: data.foto_url || (foto ? fotoPreview : propiedad.facade_photo_path),
      };

      if (onSuccess) {
        onSuccess(updatedData);
      }
      onClose();
    } catch (err) {
      console.error('Error al actualizar propiedad:', err);
      setErrorMsg(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Hubo un error al actualizar la propiedad.'
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="mri-overlay" onClick={onClose}>
      <div
        className="mri-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Mobile grabber pill táctil */}
        <div
          className="mri-grabber-area"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mri-grabber" />
        </div>

        <div
          className="mri-header"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mri-header-text">
            <span className="mri-tag">ID REGISTRO: #{propiedad.id}</span>
            <h2 className="mri-title">Editar Propiedad</h2>
          </div>
          <button className="mri-close-btn" onClick={onClose} title="Cerrar ventana" aria-label="Cerrar ventana" type="button">
            <X size={18} color="#ffffff" strokeWidth={2.6} />
          </button>
        </div>

        <form className="mri-body" onSubmit={handleSubmit}>
          <div className="mri-form-grid">

            {/* Nombre de la Propiedad */}
            <div className="mri-field-full">
              <label className="mri-label">
                <Type size={16} /> Nombre de la Propiedad:
              </label>
              <input
                type="text"
                className="mri-input"
                placeholder="Ej. Casa de Verano, Oficina Central, Bodega Norte"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            {/* Foto de la Fachada */}
            <div className="mri-field-full">
              <label className="mri-label">
                <Camera size={16} /> Foto de la Fachada:
              </label>
              <div className="mri-file-wrapper">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="mri-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={16} /> Cambiar Foto
                </button>

                {fotoPreview && (
                  <img src={fotoPreview} alt="Fachada de la propiedad" className="mri-photo-preview" />
                )}

                <span className="mri-file-name">
                  {foto ? foto.name : (fotoPreview ? 'Foto actual' : 'Ninguna imagen seleccionada')}
                </span>
              </div>
            </div>

            {/* Dirección */}
            <div className="mri-field-full">
              <label className="mri-label">
                <MapPin size={16} /> Dirección:
              </label>
              <input
                type="text"
                className="mri-input"
                placeholder="Ej. Calle 37 #120 x 4 y 6, Col. Centro"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </div>

          </div>

          {errorMsg && (
            <div className="mri-msg error">
              {errorMsg}
            </div>
          )}

          <div className="mri-footer-sticky">
            <button
              type="submit"
              className="mri-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> GUARDANDO CAMBIOS...
                </>
              ) : (
                'GUARDAR CAMBIOS'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ModalEditarPropiedadCliente;
