import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoogleMap, useJsApiLoader, MarkerF, Autocomplete } from '@react-google-maps/api';
import { X, Search, LocateFixed, Loader2, Check, MapPin, AlertTriangle } from 'lucide-react';
import { GOOGLE_MAPS_LOADER } from './googleMapsConfig';
import '../../styles/Shared/SelectorUbicacionMapa.css';

const CENTRO_MERIDA = { lat: 20.9673, lng: -89.6236 };
// Más de esto (en metros) se considera una lectura imprecisa (WiFi / red celular)
const PRECISION_ACEPTABLE = 60;

// Códigos de GeolocationPositionError
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;
const MOTIVOS_ERROR = {
  sinSoporte: 'Este navegador no puede detectar la ubicación. Busca la dirección o toca el mapa para marcarla.',
  [PERMISSION_DENIED]: 'El navegador tiene bloqueada la ubicación. Actívala en el candado junto a la dirección de la página y vuelve a tocar el botón de ubicación, o marca el punto en el mapa.',
  [POSITION_UNAVAILABLE]: 'Tu dispositivo no dio una ubicación. Revisa que la ubicación esté activada en su configuración, o busca la dirección o toca el mapa.',
  [TIMEOUT]: 'La ubicación tardó demasiado. Vuelve a tocar el botón de ubicación, o busca la dirección o toca el mapa.'
};

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  gestureHandling: 'greedy'
};

const parseCoords = (texto) => {
  const [lat, lng] = String(texto || '').split(',').map(n => parseFloat(n));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

/**
 * Ventana para fijar la ubicación de una propiedad, estilo Google Maps:
 * intenta detectar el GPS y, si falla o es impreciso, deja buscar la dirección
 * o marcarla tocando el mapa / arrastrando el pin.
 */
const SelectorUbicacionMapa = ({ isOpen, onClose, onConfirm, coordenadasIniciales }) => {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER);

  const [posicion, setPosicion] = useState(CENTRO_MERIDA);
  const [centro, setCentro] = useState(CENTRO_MERIDA);
  const [zoom, setZoom] = useState(13);
  // 'detectando' | 'ok' | 'aproximada' | 'error' | 'manual'
  const [estado, setEstado] = useState('manual');
  const [precision, setPrecision] = useState(null);

  const [motivoError, setMotivoError] = useState('');

  const autocompleteRef = useRef(null);
  const tocoManualmente = useRef(false);
  const intentoActual = useRef(0);

  const detectarUbicacion = () => {
    if (!navigator.geolocation) {
      setMotivoError(MOTIVOS_ERROR.sinSoporte);
      setEstado('error');
      return;
    }
    const intento = ++intentoActual.current;
    // Si el usuario ya marcó a mano o pidió otra lectura mientras esperábamos, se ignora esta
    const vigente = () => intento === intentoActual.current && !tocoManualmente.current;
    setEstado('detectando');

    const exito = (pos) => {
      if (!vigente()) return;
      const punto = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPosicion(punto);
      setCentro(punto);
      setZoom(18);
      setPrecision(Math.round(pos.coords.accuracy));
      setEstado(pos.coords.accuracy <= PRECISION_ACEPTABLE ? 'ok' : 'aproximada');
    };
    const fallo = (err) => {
      console.warn('No se pudo obtener la ubicación:', err);
      if (!vigente()) return;
      setMotivoError(MOTIVOS_ERROR[err.code] || MOTIVOS_ERROR[POSITION_UNAVAILABLE]);
      setEstado('error');
    };

    navigator.geolocation.getCurrentPosition(
      exito,
      (err) => {
        // Sin permiso no hay más que intentar
        if (err.code === PERMISSION_DENIED) {
          fallo(err);
          return;
        }
        // Computadoras sin GPS: la lectura precisa falla, pero por WiFi o red suele responder
        if (vigente()) {
          navigator.geolocation.getCurrentPosition(exito, fallo, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!isOpen) return;
    tocoManualmente.current = false;
    setPrecision(null);

    const previas = parseCoords(coordenadasIniciales);
    if (previas) {
      setPosicion(previas);
      setCentro(previas);
      setZoom(18);
      setEstado('manual');
    } else {
      setPosicion(CENTRO_MERIDA);
      setCentro(CENTRO_MERIDA);
      setZoom(13);
      detectarUbicacion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const moverPin = (punto) => {
    tocoManualmente.current = true;
    setPosicion(punto);
    setEstado('manual');
  };

  const onMapClick = (e) => moverPin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  const onMarkerDragEnd = (e) => moverPin({ lat: e.latLng.lat(), lng: e.latLng.lng() });

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) return;
    const punto = { lat: loc.lat(), lng: loc.lng() };
    moverPin(punto);
    setCentro(punto);
    setZoom(18);
  };

  const usarMiUbicacion = () => {
    tocoManualmente.current = false;
    detectarUbicacion();
  };

  const confirmar = () => {
    onConfirm(`${posicion.lat.toFixed(6)}, ${posicion.lng.toFixed(6)}`);
    onClose();
  };

  const avisos = {
    detectando: { icon: <Loader2 size={15} className="sum-spin" />, texto: 'Detectando tu ubicación...' },
    ok: { icon: <Check size={15} />, texto: `Ubicación detectada (±${precision} m). Ajusta el pin si hace falta.` },
    aproximada: { icon: <AlertTriangle size={15} />, texto: `Ubicación aproximada (±${precision} m). Busca la dirección o toca el mapa para marcarla exacta.` },
    error: { icon: <AlertTriangle size={15} />, texto: motivoError },
    manual: { icon: <MapPin size={15} />, texto: 'Toca el mapa o arrastra el pin para ajustar la ubicación.' }
  };
  const aviso = avisos[estado];

  return createPortal(
    // stopPropagation: los eventos de React cruzan el portal y cerrarían el modal padre
    <div className="sum-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="sum-card" onClick={e => e.stopPropagation()}>
        <div className="sum-header">
          <div>
            <span className="sum-tag">UBICACIÓN</span>
            <h3 className="sum-title">Fijar en el mapa</h3>
          </div>
          <button type="button" className="sum-close" onClick={onClose} aria-label="Cerrar mapa">
            <X size={18} strokeWidth={2.6} />
          </button>
        </div>

        {loadError ? (
          <div className="sum-placeholder">No se pudo cargar Google Maps. Revisa tu conexión.</div>
        ) : !isLoaded ? (
          <div className="sum-placeholder"><Loader2 size={22} className="sum-spin" /> Cargando mapa...</div>
        ) : (
          <>
            <div className="sum-search">
              <Search size={16} />
              <Autocomplete
                onLoad={(ac) => { autocompleteRef.current = ac; }}
                onPlaceChanged={onPlaceChanged}
                options={{ componentRestrictions: { country: 'mx' }, fields: ['geometry', 'name'] }}
                className="sum-search-ac"
              >
                <input type="text" placeholder="Buscar calle, colonia o lugar..." className="sum-search-input" />
              </Autocomplete>
            </div>

            <div className="sum-map-wrap">
              <GoogleMap
                mapContainerClassName="sum-map"
                center={centro}
                zoom={zoom}
                options={MAP_OPTIONS}
                onClick={onMapClick}
              >
                <MarkerF position={posicion} draggable onDragEnd={onMarkerDragEnd} />
              </GoogleMap>

              <button
                type="button"
                className="sum-locate"
                onClick={usarMiUbicacion}
                disabled={estado === 'detectando'}
                title="Usar mi ubicación"
                aria-label="Usar mi ubicación"
              >
                {estado === 'detectando' ? <Loader2 size={20} className="sum-spin" /> : <LocateFixed size={20} />}
              </button>
            </div>

            <div className={`sum-aviso ${estado}`}>
              {aviso.icon}
              <span>{aviso.texto}</span>
            </div>
          </>
        )}

        <div className="sum-footer">
          <span className="sum-coords">{posicion.lat.toFixed(6)}, {posicion.lng.toFixed(6)}</span>
          <div className="sum-actions">
            <button type="button" className="sum-btn-sec" onClick={onClose}>Cancelar</button>
            <button type="button" className="sum-btn-main" onClick={confirmar} disabled={!isLoaded}>
              <Check size={17} /> Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SelectorUbicacionMapa;
