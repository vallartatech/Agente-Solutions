import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SelectorUbicacionMapa from './SelectorUbicacionMapa';
import '../../styles/AgenteMarket/Cliente/ModalRegistroInmueble.css';
import '../../styles/Shared/LiquidGlass.css';

const TIPOS_INMUEBLE = [
  { value: 'Casa', label: 'CASA' },
  { value: 'Mansión', label: 'MANSION' },
  { value: 'Departamento', label: 'DEPARTAMENTO' },
  { value: 'Oficina', label: 'OFICINA' },
  { value: 'Bodega', label: 'BODEGA' },
  { value: 'Terreno', label: 'TERRENO' },
  { value: 'Local Comercial', label: 'LOCAL COMERCIAL' }
];

const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Formulario vacío (registro) o con los datos de la propiedad (edición)
const formularioInicial = (property) => {
  if (!property) {
    return {
      property_name: '',
      type: 'Casa',
      estado: 'Yucatán',
      municipio: 'Mérida',
      colonia: '',
      calle: '',
      numero: '',
      cruzamientos: '',
      coordinates: ''
    };
  }
  const tipoRaw = property.type || property.tipo || '';
  const tipo = TIPOS_INMUEBLE.find(t => sinAcentos(t.value) === sinAcentos(tipoRaw))?.value || tipoRaw || 'Casa';
  return {
    property_name: property.property_name ?? (property.nombre_propiedad === 'Propiedad sin nombre' ? '' : property.nombre_propiedad) ?? '',
    type: tipo,
    estado: property.estado || property.state || 'Yucatán',
    municipio: property.municipio || '',
    colonia: property.colonia || '',
    calle: property.calle || '',
    numero: property.numero || '',
    cruzamientos: property.cruzamientos || '',
    coordinates: property.coordenadas || property.coordinates || ''
  };
};

/**
 * Registrar o editar una propiedad con el mismo formulario.
 * Con `property` entra en modo edición: precarga sus datos y guarda en /propiedades/{id}/update.
 */
const ModalRegistroInmueble = ({ isOpen, onClose, onSuccess, user: propUser, property = null }) => {
  const esEdicion = Boolean(property?.id);
  const { user: authUser } = useAuth();
  const user = propUser || authUser || (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || localStorage.getItem('agente_session') || '{}')?.userData || {};
    } catch {
      return {};
    }
  })();

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState(() => formularioInicial(property));

  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(property?.foto_url || null);
  const [loading, setLoading] = useState(false);
  const [mapaAbierto, setMapaAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');

  // Gesto táctil: Arrastrar hacia abajo para cerrar (Swipe down to dismiss)
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    if (e.target.closest('button, input, select, textarea, a')) return;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!touchStartY.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
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

  // En modo edición, cada vez que se abre carga los datos de esa propiedad
  useEffect(() => {
    if (!isOpen || !esEdicion) return;
    setFormData(formularioInicial(property));
    setFotoFile(null);
    setFotoPreview(property?.foto_url || null);
    setMensaje('');
    setTipoMensaje('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, property?.id]);

  if (!isOpen) return null;

  // Tipo que no está en el catálogo (propiedades antiguas): se agrega para no perderlo
  const tiposOpciones = TIPOS_INMUEBLE.some(t => t.value === formData.type)
    ? TIPOS_INMUEBLE
    : [...TIPOS_INMUEBLE, { value: formData.type, label: String(formData.type).toUpperCase() }];
  // Dirección con formato distinto que no se pudo separar: se muestra como referencia
  const direccionSinSeparar = esEdicion && !formData.calle && !formData.numero && property?.direccion;

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
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
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
      if (esEdicion) {
        // Editar: sin coordenadas inventadas; si no se tocan, se conservan las actuales
        if (formData.coordinates) dataToSend.append('coordinates', formData.coordinates);
      } else {
        dataToSend.append('coordinates', formData.coordinates || '20.967370, -89.592586');

        const clientId = user?.client_id || 1;
        dataToSend.append('client_id', clientId);
        if (user?.id) {
          dataToSend.append('user_id', user.id);
        }
        if (user?.tenant_id) {
          dataToSend.append('tenant_id', user.tenant_id);
        }
      }

      if (fotoFile) {
        dataToSend.append('facade_photo', fotoFile);
        dataToSend.append('foto_fachada', fotoFile);
      }

      const res = await axios.post(
        esEdicion
          ? `${import.meta.env.VITE_API_BASE_URL}/propiedades/${property.id}/update`
          : `${import.meta.env.VITE_API_BASE_URL}/registro-propiedad`,
        dataToSend,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setLoading(false);
      setTipoMensaje('success');
      setMensaje(esEdicion ? '¡Cambios guardados!' : '¡Propiedad guardada exitosamente!');

      const createdProperty = res.data?.property || res.data?.propiedad || res.data;

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(createdProperty);
        }
        onClose();
      }, 1000);

    } catch (err) {
      setLoading(false);
      setTipoMensaje('error');
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Error al guardar la propiedad. Intenta nuevamente.';
      setMensaje(errMsg);
    }
  };

  return createPortal(
    <div className="mri-overlay" onClick={onClose}>
      <div 
        className="mri-card" 
        onClick={e => e.stopPropagation()}
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
            <span className="mri-tag">{esEdicion ? 'EDITAR PROPIEDAD' : 'NUEVA PROPIEDAD'}</span>
            <h2 className="mri-title">{esEdicion ? (property.nombre_propiedad || 'Editar Propiedad') : 'Registrar Propiedad'}</h2>
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
                  {fotoFile ? fotoFile.name : (esEdicion && fotoPreview ? 'Foto actual · elige otra para cambiarla' : 'Ninguna imagen seleccionada')}
                </span>
              </div>
            </div>

            {direccionSinSeparar && (
              <div className="mri-field-full mri-address-hint">
                <strong>Dirección actual:</strong> {property.direccion}
                <span>Llena calle, número, colonia y ciudad para actualizarla; si los dejas vacíos se conserva.</span>
              </div>
            )}

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
                {tiposOpciones.map(t => (
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
                  onClick={() => setMapaAbierto(true)}
                >
                  <MapPin size={15} /> {formData.coordinates ? 'MODIFICAR' : 'FIJAR EN MAPA'}
                </button>
              </div>
            </div>

          </div>

          {mensaje && (
            <div className={`mri-msg ${tipoMensaje}`}>
              {mensaje}
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
                  <Loader2 size={18} className="animate-spin" /> {esEdicion ? 'GUARDANDO CAMBIOS...' : 'GUARDANDO PROPIEDAD...'}
                </>
              ) : (
                esEdicion ? 'GUARDAR CAMBIOS' : 'GUARDAR PROPIEDAD'
              )}
            </button>
          </div>
        </form>
      </div>

      <SelectorUbicacionMapa
        isOpen={mapaAbierto}
        onClose={() => setMapaAbierto(false)}
        onConfirm={(coords) => setFormData(prev => ({ ...prev, coordinates: coords }))}
        coordenadasIniciales={formData.coordinates}
      />
    </div>,
    document.body
  );
};

export default ModalRegistroInmueble;
