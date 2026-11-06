import React, { useState, useRef } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import SelectorUbicacionMapa from '../../../components/Shared/SelectorUbicacionMapa';
import '../../../styles/AgenteMarket/Cliente/ModalRegistroInmueble.css';
import useCierreAnimado from '../../../utils/useCierreAnimado';
import { confirmarAccion } from '../../../utils/dialogos';

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

// Campos que se pueden llenar con la ubicación del mapa (los cruzamientos Google no los da)
const CAMPOS_DIRECCION = [
  ['estado', 'Estado'],
  ['municipio', 'Ciudad / Municipio'],
  ['colonia', 'Colonia'],
  ['calle', 'Calle'],
  ['numero', 'Número'],
];

const AVISOS_MAPA = {
  sin_api: 'No se pudo obtener la dirección automáticamente: falta activar la Geocoding API de Google. Llénala a mano.',
  sin_resultados: 'Google no tiene la dirección de ese punto. Llénala a mano.',
  fallo: 'No se pudo obtener la dirección en este momento. Llénala a mano.',
};

const ModalRegistroInmueble = ({ isOpen, onClose, onSuccess, user }) => {
  // Abre desde donde se tocó (o sube como hoja en celular) y se va animado al cerrar
  const { cerrando: mriCerrando, cerrar: cerrarAnimado, ventanaRef: mriVentanaRef } = useCierreAnimado(isOpen, onClose);

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
  const [mapaAbierto, setMapaAbierto] = useState(false);
  // Llenado con el mapa: qué escribió el usuario (no se pisa sin preguntar) y qué llenó el mapa (se marca para verificar)
  const [tocados, setTocados] = useState(() => new Set());
  const [autollenados, setAutollenados] = useState(() => new Set());
  const [notaMapa, setNotaMapa] = useState(null); // { tipo: 'ok' | 'aviso', texto }
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

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setTocados(prev => new Set(prev).add(name));
    if (autollenados.has(name)) {
      setAutollenados(prev => { const s = new Set(prev); s.delete(name); return s; });
    }
  };

  // Al confirmar el punto en el mapa: guarda las coordenadas y llena la dirección con lo que detecta Google.
  // Llena los campos vacíos (y Estado/Ciudad por defecto); si el usuario ya escribió algo distinto,
  // pregunta antes de reemplazarlo.
  const aplicarUbicacion = async (coords, resultado) => {
    setFormData(prev => ({ ...prev, coordinates: coords }));
    if (!resultado) return;
    const { direccion, error } = resultado;
    if (!direccion) {
      setNotaMapa({ tipo: 'aviso', texto: AVISOS_MAPA[error] || AVISOS_MAPA.fallo });
      return;
    }

    const libres = {};
    const distintos = [];
    CAMPOS_DIRECCION.forEach(([campo, etiqueta]) => {
      const sugerido = direccion[campo];
      const actual = String(formData[campo] || '').trim();
      if (!sugerido || sinAcentos(sugerido) === sinAcentos(actual)) return;
      const reemplazable = !actual || !tocados.has(campo);
      if (reemplazable) libres[campo] = sugerido;
      else distintos.push({ campo, etiqueta, actual, sugerido });
    });

    let cambios = libres;
    if (distintos.length) {
      const lista = distintos.map(d => `• ${d.etiqueta}: "${d.actual}" → "${d.sugerido}"`).join('\n');
      const reemplazar = await confirmarAccion(
        `El mapa sugiere una dirección distinta a la que escribiste:\n\n${lista}\n\n¿Quieres reemplazarla?`,
        { titulo: 'Dirección distinta', confirmar: 'Reemplazar', cancelar: 'Conservar la mía', peligro: false }
      );
      if (reemplazar) cambios = { ...libres, ...Object.fromEntries(distintos.map(d => [d.campo, d.sugerido])) };
    }

    const llenados = Object.keys(cambios);
    if (llenados.length) {
      setFormData(prev => ({ ...prev, ...cambios }));
      setAutollenados(prev => new Set([...prev, ...llenados]));
    }
    const faltan = CAMPOS_DIRECCION.filter(([campo]) => !direccion[campo]).map(([, etiqueta]) => etiqueta.toLowerCase());
    setNotaMapa({
      tipo: 'ok',
      texto: (llenados.length
        ? `Completamos ${llenados.length} ${llenados.length === 1 ? 'campo' : 'campos'} con el mapa (marcados en verde). Verifica que estén bien.`
        : 'La dirección del mapa coincide con la que tienes.')
        + (faltan.length ? ` Google no dio: ${faltan.join(', ')}.` : '')
        + ' Los cruzamientos van a mano.',
    });
  };

  const claseInput = (campo) => `mri-input${autollenados.has(campo) ? ' mri-input-auto' : ''}`;

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

  return createPortal(
    <div className={`mri-overlay ${mriCerrando ? 'is-cerrando' : ''}`} onClick={cerrarAnimado}>
      <div 
        ref={mriVentanaRef}
        className={`mri-card mri-anim ${mriCerrando ? 'is-cerrando' : ''}`}
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
            <span className="mri-tag">NUEVA PROPIEDAD</span>
            <h2 className="mri-title">Registrar Propiedad</h2>
          </div>
          <button className="mri-close-btn" onClick={cerrarAnimado} title="Cerrar ventana" aria-label="Cerrar ventana" type="button">
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

            {/* Ubicación: llena la dirección con el mapa */}
            <div className="mri-field-two-thirds">
              <div className="mri-gps-widget">
                <div className="mri-gps-left">
                  <div className="mri-gps-icon">
                    <MapPinned size={20} />
                  </div>
                  <div className="mri-gps-info">
                    <span className="mri-gps-label">UBICACIÓN GPS</span>
                    <span className={`mri-gps-val ${!formData.coordinates ? 'empty' : ''}`}>
                      {formData.coordinates || 'Llena la dirección con tu ubicación'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="mri-gps-btn"
                  onClick={() => setMapaAbierto(true)}
                >
                  <MapPin size={15} /> {formData.coordinates ? 'MODIFICAR' : 'USAR MI UBICACIÓN'}
                </button>
              </div>
            </div>

            {notaMapa && (
              <div className={`mri-field-full mri-mapa-nota ${notaMapa.tipo}`}>
                {notaMapa.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{notaMapa.texto}</span>
              </div>
            )}

            {/* Estado */}
            <div className="mri-field-one-third">
              <label className="mri-label">
                <Map size={16} /> Estado:
              </label>
              <input
                type="text"
                name="estado"
                className={claseInput('estado')}
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
                className={claseInput('municipio')}
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
                className={claseInput('colonia')}
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
                className={claseInput('calle')}
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
                className={claseInput('numero')}
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
                  <Loader2 size={18} className="animate-spin" /> GUARDANDO PROPIEDAD...
                </>
              ) : (
                'GUARDAR PROPIEDAD'
              )}
            </button>
          </div>
        </form>
      </div>

      <SelectorUbicacionMapa
        isOpen={mapaAbierto}
        onClose={() => setMapaAbierto(false)}
        onConfirm={aplicarUbicacion}
        coordenadasIniciales={formData.coordinates}
        pedirDireccion
      />
    </div>,
    document.body
  );
};

export default ModalRegistroInmueble;
