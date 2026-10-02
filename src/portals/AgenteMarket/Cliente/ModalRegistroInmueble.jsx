import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  Type,
  Camera,
  Home,
  Map,
  Building,
  MapPin,
  Hash,
  Crosshair,
  MapPinned,
  X,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import '../../../styles/AgenteMarket/Cliente/ModalRegistroInmueble.css';

const TIPOS_INMUEBLE = [
  { value: 'Casa', label: 'CASA' },
  { value: 'Mansión', label: 'MANSION' },
  { value: 'Departamento', label: 'DEPARTAMENTO' },
  { value: 'Oficina', label: 'OFICINA' },
  { value: 'Bodega', label: 'BODEGA' },
  { value: 'Terreno', label: 'TERRENO' },
  { value: 'Local Comercial', label: 'LOCAL COMERCIAL' }
];

const ModalRegistroInmueble = ({ isOpen, onClose, onSuccess, user }) => {
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    property_name: '',
    type: 'Casa',
    estado: 'Yucatán',
    municipio: 'Mérida',
    colonia: '',
    calle: '',
    numero: '',
    cruzamientos: '',
    coordinates: ''
  });

  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  // Detección de coordenadas GPS del navegador
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        setFormData(prev => ({ ...prev, coordinates: coords }));
        setDetectingGps(false);
      },
      (err) => {
        console.warn('Error al obtener ubicación:', err);
        // Coordenadas por defecto en caso de denegar permisos
        setFormData(prev => ({ ...prev, coordinates: '20.967370, -89.592586' }));
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setTipoMensaje('');

    if (!formData.property_name.trim()) {
      setMensaje('Por favor asigna un nombre a la propiedad.');
      setTipoMensaje('error');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('agente_token');
      const dataToSend = new FormData();

      dataToSend.append('property_name', formData.property_name.trim());
      dataToSend.append('nombre_propiedad', formData.property_name.trim());
      dataToSend.append('type', formData.type);
      dataToSend.append('tipo', formData.type);
      dataToSend.append('estado', formData.estado.trim());
      dataToSend.append('municipio', formData.municipio.trim());
      dataToSend.append('colonia', formData.colonia.trim());
      dataToSend.append('calle', formData.calle.trim());
      dataToSend.append('numero', formData.numero.trim());
      dataToSend.append('cruzamientos', formData.cruzamientos.trim());
      dataToSend.append('coordinates', formData.coordinates || '20.967370, -89.592586');

      const clientId = user?.client_id || 1;
      dataToSend.append('client_id', clientId);
      if (user?.id) {
        dataToSend.append('user_id', user.id);
      }

      if (fotoFile) {
        dataToSend.append('facade_photo', fotoFile);
        dataToSend.append('foto_fachada', fotoFile);
      }

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/registro-propiedad`,
        dataToSend,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setLoading(false);
      setTipoMensaje('success');
      setMensaje('¡Propiedad guardada exitosamente!');

      const createdProperty = res.data?.property || res.data?.propiedad || res.data;

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(createdProperty);
        }
        onClose();
      }, 1200);

    } catch (err) {
      setLoading(false);
      setTipoMensaje('error');
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Error al guardar la propiedad. Intenta nuevamente.';
      setMensaje(errMsg);
    }
  };

  return (
    <div className="mri-overlay" onClick={onClose}>
      <div className="mri-card" onClick={e => e.stopPropagation()}>
        <div className="mri-top-orange-bar" />

        <div className="mri-header">
          <h2 className="mri-title">REGISTRO DE INMUEBLE</h2>
          <button className="mri-close-btn" onClick={onClose} title="Cerrar ventana">
            <X size={18} />
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
                name="property_name"
                className="mri-input"
                placeholder="Ej. Casa de Verano, Oficina Central, Bodega Norte"
                value={formData.property_name}
                onChange={handleChange}
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
                  onChange={handlePhotoSelect}
                />
                <button
                  type="button"
                  className="mri-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={16} /> Seleccionar Archivo
                </button>

                {fotoPreview && (
                  <img src={fotoPreview} alt="Preview Fachada" className="mri-photo-preview" />
                )}

                <span className="mri-file-name">
                  {fotoFile ? fotoFile.name : 'Ninguna imagen seleccionada'}
                </span>
              </div>
            </div>

            {/* Tipo */}
            <div className="mri-field-one-third">
              <label className="mri-label">
                <Home size={16} /> Tipo:
              </label>
              <select
                name="type"
                className="mri-select"
                value={formData.type}
                onChange={handleChange}
              >
                {TIPOS_INMUEBLE.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div className="mri-field-one-third">
              <label className="mri-label">
                <Map size={16} /> Estado:
              </label>
              <input
                type="text"
                name="estado"
                className="mri-input"
                placeholder="Ej. Yucatán"
                value={formData.estado}
                onChange={handleChange}
              />
            </div>

            {/* Ciudad / Municipio */}
            <div className="mri-field-one-third">
              <label className="mri-label">
                <Building size={16} /> Ciudad / Municipio:
              </label>
              <input
                type="text"
                name="municipio"
                className="mri-input"
                placeholder="Ingresa tu Ciudad"
                value={formData.municipio}
                onChange={handleChange}
              />
            </div>

            {/* Colonia */}
            <div className="mri-field-one-third">
              <label className="mri-label">
                <Map size={16} /> Colonia:
              </label>
              <input
                type="text"
                name="colonia"
                className="mri-input"
                placeholder="Ej. San Francisco"
                value={formData.colonia}
                onChange={handleChange}
              />
            </div>

            {/* Calle */}
            <div className="mri-field-one-third">
              <label className="mri-label">
                <MapPin size={16} /> Calle:
              </label>
              <input
                type="text"
                name="calle"
                className="mri-input"
                placeholder="Ej. 11 o Calle 11"
                value={formData.calle}
                onChange={handleChange}
              />
            </div>

            {/* Número */}
            <div className="mri-field-one-third">
              <label className="mri-label">
                <Hash size={16} /> # Número:
              </label>
              <input
                type="text"
                name="numero"
                className="mri-input"
                placeholder="Ej. 108F"
                value={formData.numero}
                onChange={handleChange}
              />
            </div>

            {/* Cruzamientos */}
            <div className="mri-field-one-third">
              <label className="mri-label">
                <Crosshair size={16} /> Cruzamientos:
              </label>
              <input
                type="text"
                name="cruzamientos"
                className="mri-input"
                placeholder="Ej. x 24 y 26"
                value={formData.cruzamientos}
                onChange={handleChange}
              />
            </div>

            {/* Coordenadas GPS Widget */}
            <div className="mri-field-two-thirds">
              <div className="mri-gps-widget">
                <div className="mri-gps-left">
                  <div className="mri-gps-icon">
                    <MapPinned size={20} />
                  </div>
                  <div className="mri-gps-info">
                    <span className="mri-gps-label">COORDENADAS GPS</span>
                    <span className={`mri-gps-val ${!formData.coordinates ? 'empty' : ''}`}>
                      {formData.coordinates || 'Sin ubicación asignada'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="mri-gps-btn"
                  onClick={handleDetectGPS}
                  disabled={detectingGps}
                >
                  {detectingGps ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> OBTENIENDO...
                    </>
                  ) : (
                    <>
                      <MapPin size={15} /> FIJAR EN MAPA
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {mensaje && (
            <div className={`mri-msg ${tipoMensaje}`}>
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            className="mri-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> GUARDANDO PROPIEDAD...
              </>
            ) : (
              'GUARDAR PROPIEDAD'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModalRegistroInmueble;
