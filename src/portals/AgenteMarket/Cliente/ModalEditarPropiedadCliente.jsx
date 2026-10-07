import React, { useState, useEffect } from 'react';
import { X, Building2, Camera, UploadCloud, Save, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import defaultPropImg from '../../../assets/propiedad_ejemplo.jpg';

const ModalEditarPropiedadCliente = ({ isOpen, onClose, propiedad, onSuccess }) => {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  if (!isOpen || !propiedad) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
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

  return (
    <div className="vcp-modal-backdrop" onClick={onClose}>
      <div
        className="vcp-edit-prop-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="vcp-edit-modal-header">
          <div className="vcp-edit-modal-title-wrap">
            <div className="vcp-edit-modal-icon-badge">
              <Building2 size={20} color="#ff8c42" />
            </div>
            <div>
              <h2 className="vcp-edit-modal-title">EDITAR PROPIEDAD</h2>
              <span className="vcp-edit-modal-subtitle">
                ID REGISTRO: #{propiedad.id}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="vcp-edit-modal-close-btn"
            onClick={onClose}
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="vcp-edit-modal-form">
          {errorMsg && (
            <div className="vcp-edit-modal-error">
              {errorMsg}
            </div>
          )}

          {/* Photo Preview & Selector */}
          <div className="vcp-edit-photo-section">
            <div className="vcp-edit-photo-preview-wrap">
              <img
                src={fotoPreview || defaultPropImg}
                alt="Fachada de la propiedad"
                className="vcp-edit-photo-img"
              />
              <label className="vcp-edit-photo-overlay" htmlFor="vcp-edit-file-input">
                <Camera size={22} />
                <span>CAMBIAR FACHADA</span>
              </label>
              <input
                id="vcp-edit-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
            <div className="vcp-edit-photo-hint">
              <UploadCloud size={14} />
              <span>Haz clic en la imagen para subir una nueva foto de fachada</span>
            </div>
          </div>

          {/* Field: Nombre */}
          <div className="vcp-edit-input-group">
            <label className="vcp-edit-input-label">
              NOMBRE / ALIAS DE LA PROPIEDAD *
            </label>
            <input
              type="text"
              className="vcp-edit-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Casa de mi Infancia, Departamento Norte..."
              required
            />
          </div>

          {/* Field: Dirección */}
          <div className="vcp-edit-input-group">
            <label className="vcp-edit-input-label">
              DIRECCIÓN
            </label>
            <input
              type="text"
              className="vcp-edit-input"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej. Calle 37 #120 x 4 y 6, Col. Centro"
            />
          </div>

          {/* Action Buttons */}
          <div className="vcp-edit-modal-actions">
            <button
              type="button"
              className="vcp-edit-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="vcp-edit-btn-submit"
              disabled={loading}
            >
              {loading ? (
                'GUARDANDO...'
              ) : (
                <>
                  <Save size={16} /> GUARDAR CAMBIOS
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarPropiedadCliente;
