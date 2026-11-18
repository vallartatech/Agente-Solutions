import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Type, Camera, MapPin, Loader2, Map, Building, Hash, Crosshair, MapPinned, CheckCircle2, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import SelectorUbicacionMapa from '../../../components/Shared/SelectorUbicacionMapa';
import { confirmarAccion } from '../../../utils/dialogos';
import '../../../styles/AgenteMarket/Cliente/ModalRegistroInmueble.css';

// Mismo diseño que ModalRegistroInmueble (clases mri-*): nombre, fachada y ubicación por partes con el mapa de Google.

const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Campos que se pueden llenar con la ubicación del mapa (los cruzamientos Google no los da)
const CAMPOS_DIRECCION = [
  ['estado', 'Estado'],
  ['municipio', 'Ciudad / Municipio'],
  ['colonia', 'Colonia'],
  ['calle', 'Calle'],
  ['numero', 'Número'],
];

// El backend solo rearma la dirección si llegan estas partes
const OBLIGATORIOS = [['municipio', 'ciudad / municipio'], ['colonia', 'colonia'], ['calle', 'calle'], ['numero', 'número']];

const AVISOS_MAPA = {
  sin_api: 'No se pudo obtener la dirección automáticamente: falta activar la Geocoding API de Google. Llénala a mano.',
  sin_resultados: 'Google no tiene la dirección de ese punto. Llénala a mano.',
  fallo: 'No se pudo obtener la dirección en este momento. Llénala a mano.',
};

const direccionDe = (p) => ({
  estado: p.estado || p.state || 'Yucatán',
  municipio: p.municipio || '',
  colonia: p.colonia || '',
  calle: p.calle || '',
  numero: p.numero || '',
  cruzamientos: p.cruzamientos || '',
  coordinates: p.coordenadas || p.coordinates || '',
});

const ModalEditarPropiedadCliente = ({ isOpen, onClose, propiedad, onSuccess }) => {
  const fileInputRef = useRef(null);

  const [nombre, setNombre] = useState('');
  const [dir, setDir] = useState(direccionDe({}));
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mapaAbierto, setMapaAbierto] = useState(false);
  // Llenado con el mapa: lo que ya tiene valor no se pisa sin preguntar; lo que llenó el mapa se marca en verde
  const [autollenados, setAutollenados] = useState(() => new Set());
  const [notaMapa, setNotaMapa] = useState(null); // { tipo: 'ok' | 'aviso', texto }

  // Gesto táctil: Arrastrar hacia abajo para cerrar (Swipe down to dismiss)
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (propiedad) {
      setNombre(propiedad.nombre_propiedad || propiedad.property_name || propiedad.nombre || propiedad.alias || '');
      setDir(direccionDe(propiedad));
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
      setAutollenados(new Set());
      setNotaMapa(null);
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

  const handleDirChange = (e) => {
    const { name, value } = e.target;
    setDir((prev) => ({ ...prev, [name]: value }));
    if (autollenados.has(name)) {
      setAutollenados((prev) => { const s = new Set(prev); s.delete(name); return s; });
    }
  };

  // Al confirmar el punto en el mapa: guarda las coordenadas y llena la dirección con lo que detecta Google.
  // Llena los campos vacíos; si ya había algo distinto, pregunta antes de reemplazarlo.
  const aplicarUbicacion = async (coords, resultado) => {
    setDir((prev) => ({ ...prev, coordinates: coords }));
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
      const actual = String(dir[campo] || '').trim();
      if (!sugerido || sinAcentos(sugerido) === sinAcentos(actual)) return;
      if (!actual) libres[campo] = sugerido;
      else distintos.push({ campo, etiqueta, actual, sugerido });
    });

    let cambios = libres;
    if (distintos.length) {
      const lista = distintos.map((d) => `• ${d.etiqueta}: "${d.actual}" → "${d.sugerido}"`).join('\n');
      const reemplazar = await confirmarAccion(
        `El mapa sugiere una dirección distinta a la que tienes:\n\n${lista}\n\n¿Quieres reemplazarla?`,
        { titulo: 'Dirección distinta', confirmar: 'Reemplazar', cancelar: 'Conservar la mía', peligro: false }
      );
      if (reemplazar) cambios = { ...libres, ...Object.fromEntries(distintos.map((d) => [d.campo, d.sugerido])) };
    }

    const llenados = Object.keys(cambios);
    if (llenados.length) {
      setDir((prev) => ({ ...prev, ...cambios }));
      setAutollenados((prev) => new Set([...prev, ...llenados]));
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

    // Si se tocó la dirección, deben ir completas las partes que el backend necesita para guardarla
    const original = direccionDe(propiedad);
    const dirCambio = ['estado', 'municipio', 'colonia', 'calle', 'numero', 'cruzamientos']
      .some((k) => String(dir[k] || '').trim() !== String(original[k] || '').trim());
    const faltan = OBLIGATORIOS.filter(([k]) => !String(dir[k] || '').trim()).map(([, etiqueta]) => etiqueta);
    if (dirCambio && faltan.length) {
      setErrorMsg(`Para guardar la dirección completa: ${faltan.join(', ')}.`);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('agente_token');
      const formData = new FormData();
      formData.append('property_name', nombre.trim());
      if (!faltan.length) {
        ['estado', 'municipio', 'colonia', 'calle', 'numero', 'cruzamientos'].forEach((k) => {
          formData.append(k, String(dir[k] || '').trim());
        });
      }
      if (dir.coordinates) {
        formData.append('coordinates', dir.coordinates);
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

      const guardada = data?.property || {};
      const updatedData = {
        ...propiedad,
        ...guardada,
        nombre_propiedad: nombre.trim(),
        property_name: nombre.trim(),
        nombre: nombre.trim(),
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

  const campo = (name, etiqueta, Icono, placeholder, conMapa = true) => (
    <div className="mri-field-one-third">
      <label className="mri-label">
        <Icono size={16} /> {etiqueta}:
      </label>
      <input
        type="text"
        name={name}
        className={conMapa ? claseInput(name) : 'mri-input'}
        placeholder={placeholder}
        value={dir[name]}
        onChange={handleDirChange}
      />
    </div>
  );

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

            {/* Ubicación: llena la dirección con el mapa (igual que al registrar) */}
            <div className="mri-field-full">
              <div className="mri-gps-widget">
                <div className="mri-gps-left">
                  <div className="mri-gps-icon">
                    <MapPinned size={20} />
                  </div>
                  <div className="mri-gps-info">
                    <span className="mri-gps-label">UBICACIÓN GPS</span>
                    <span className={`mri-gps-val ${!dir.coordinates ? 'empty' : ''}`}>
                      {dir.coordinates || 'Llena la dirección con tu ubicación'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="mri-gps-btn"
                  onClick={() => setMapaAbierto(true)}
                >
                  <MapPin size={15} /> {dir.coordinates ? 'MODIFICAR' : 'USAR MI UBICACIÓN'}
                </button>
              </div>
            </div>

            {notaMapa && (
              <div className={`mri-field-full mri-mapa-nota ${notaMapa.tipo}`}>
                {notaMapa.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{notaMapa.texto}</span>
              </div>
            )}

            {campo('estado', 'Estado', Map, 'Ej. Yucatán')}
            {campo('municipio', 'Ciudad / Municipio', Building, 'Ingresa tu Ciudad')}
            {campo('colonia', 'Colonia', Map, 'Ej. San Francisco')}
            {campo('calle', 'Calle', MapPin, 'Ej. 11 o Calle 11')}
            {campo('numero', '# Número', Hash, 'Ej. 108F')}
            {campo('cruzamientos', 'Cruzamientos', Crosshair, 'Ej. x 24 y 26', false)}

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

      <SelectorUbicacionMapa
        isOpen={mapaAbierto}
        onClose={() => setMapaAbierto(false)}
        onConfirm={aplicarUbicacion}
        coordenadasIniciales={dir.coordinates}
        pedirDireccion
      />
    </div>,
    document.body
  );
};

export default ModalEditarPropiedadCliente;
