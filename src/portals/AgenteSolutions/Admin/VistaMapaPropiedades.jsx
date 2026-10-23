import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER } from '../../../components/Shared/googleMapsConfig';
import { Search, MapPinned, Building2, X, Navigation, Eye, RefreshCw, MapPinOff, Loader2 } from 'lucide-react';
import Header from '../../../components/Shared/Header';
import '../../../styles/AgenteSolutions/Admin/VistaMapaPropiedades.css';

const API = import.meta.env.VITE_API_BASE_URL;
const MERIDA = { lat: 20.9674, lng: -89.5926 };
const MAX_FIT_ZOOM = 16;
const SIN_CARPETA = 'sin-carpeta';

// Mapa limpio: sin íconos de negocios de Google (los nuestros son los importantes)
const MAP_OPTIONS = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  keyboardShortcuts: false,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }
  ]
};

const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// "20.9674, -89.5926" -> { lat, lng }
const parseCoords = (texto) => {
  const [lat, lng] = String(texto || '').split(',').map(n => parseFloat(n));
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { lat, lng } : null;
};

// Versión ligera de imágenes de Cloudinary para el mapa (el logo completo, sin recortar)
const ligera = (url, size = 96, modo = 'c_pad,b_white') => {
  if (!url || !/res\.cloudinary\.com\/.+\/upload\//.test(url)) return url;
  return url.replace('/upload/', `/upload/${modo},w_${size},h_${size},f_auto,q_auto/`);
};

const centrar = (w, h) => ({ x: -(w / 2), y: -(h / 2) });

// Marcador: logo de la empresa (carpeta) o, si no tiene, un círculo de color con un edificio
const MarcadorPropiedad = memo(({ propiedad, carpeta, seleccionado, onClick }) => {
  const [fallo, setFallo] = useState(false);
  const logo = carpeta?.logo_url && !fallo ? carpeta.logo_url : null;
  const color = carpeta?.color || '#F26522';
  return (
    <button
      type="button"
      className={`vmp-marcador ${logo ? 'con-logo' : ''} ${seleccionado ? 'seleccionado' : ''}`}
      style={{ borderColor: color, background: logo ? '#ffffff' : color }}
      onClick={(e) => { e.stopPropagation(); onClick(propiedad.id); }}
      title={propiedad.nombre_propiedad}
    >
      {logo
        ? <img src={ligera(logo)} alt="" draggable={false} decoding="async" onError={() => setFallo(true)} />
        : <Building2 size={18} color="#ffffff" strokeWidth={2.4} />}
    </button>
  );
});

const VistaMapaPropiedades = () => {
  const navigate = useNavigate();
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER);

  const [propiedades, setPropiedades] = useState([]);
  const [carpetas, setCarpetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todas'); // 'todas' | id de carpeta | SIN_CARPETA
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const mapRef = useRef(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [rp, rc] = await Promise.all([
        axios.get(`${API}/propiedades`),
        axios.get(`${API}/property-folders`).catch(() => ({ data: [] }))
      ]);
      setPropiedades(Array.isArray(rp.data) ? rp.data : []);
      setCarpetas(Array.isArray(rc.data) ? rc.data : []);
    } catch (err) {
      console.error('Error cargando el mapa de propiedades:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const carpetaPorId = useMemo(() => Object.fromEntries(carpetas.map(c => [c.id, c])), [carpetas]);

  // Propiedades con su posición ya interpretada
  const conPosicion = useMemo(() => propiedades.map(p => ({ ...p, pos: parseCoords(p.coordenadas) })), [propiedades]);

  const filtradas = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return conPosicion.filter(p => {
      if (filtro === SIN_CARPETA && p.folder_id) return false;
      if (filtro !== 'todas' && filtro !== SIN_CARPETA && Number(p.folder_id) !== Number(filtro)) return false;
      if (!q) return true;
      const carpeta = carpetaPorId[p.folder_id]?.name;
      return [p.nombre_propiedad, p.direccion, p.propietario, carpeta].some(v => sinAcentos(v).includes(q));
    });
  }, [conPosicion, filtro, busqueda, carpetaPorId]);

  const enMapa = useMemo(() => filtradas.filter(p => p.pos), [filtradas]);
  const sinUbicacion = filtradas.length - enMapa.length;
  const seleccionada = enMapa.find(p => p.id === seleccionadoId) || null;

  // Conteos por empresa (carpeta) para los filtros
  const conteos = useMemo(() => {
    const porCarpeta = {};
    let sinCarpeta = 0;
    conPosicion.forEach(p => {
      if (p.folder_id) porCarpeta[p.folder_id] = (porCarpeta[p.folder_id] || 0) + 1;
      else sinCarpeta += 1;
    });
    return { porCarpeta, sinCarpeta };
  }, [conPosicion]);

  // Encuadrar el mapa en lo que se está mostrando
  const encuadrar = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google || !enMapa.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    enMapa.forEach(p => bounds.extend(p.pos));
    map.fitBounds(bounds, 60);
    window.google.maps.event.addListenerOnce(map, 'idle', () => {
      if (map.getZoom() > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
    });
  }, [enMapa]);

  useEffect(() => { if (isLoaded && !cargando) encuadrar(); }, [isLoaded, cargando, filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  const seleccionar = (id) => {
    setSeleccionadoId(id);
    const p = enMapa.find(x => x.id === id);
    if (p && mapRef.current) {
      mapRef.current.panTo(p.pos);
      if (mapRef.current.getZoom() < 15) mapRef.current.setZoom(15);
    }
  };

  const irADetalles = (p) => {
    localStorage.setItem('current_property_id', p.id);
    navigate(`/detalle-propiedad/${p.id}`);
  };

  const carpetaDe = (p) => (p.folder_id ? carpetaPorId[p.folder_id] : null);

  return (
    <div className="vmp-root">
      <Header activeModule="mapa-propiedades" titulo="MAPA DE PROPIEDADES" />

      <div className="vmp-layout">
        {/* ── LISTA ── */}
        <aside className="vmp-lista">
          <div className="vmp-lista-head">
            <div>
              <h1><MapPinned size={22} /> Mapa de propiedades</h1>
              <p>{enMapa.length} en el mapa{sinUbicacion > 0 ? ` · ${sinUbicacion} sin ubicación` : ''}</p>
            </div>
            <button type="button" className="vmp-icon-btn" onClick={cargar} title="Actualizar" aria-label="Actualizar" disabled={cargando}>
              <RefreshCw size={17} className={cargando ? 'vmp-girar' : ''} />
            </button>
          </div>

          <label className="vmp-buscar">
            <Search size={16} />
            <input type="search" placeholder="Buscar propiedad, empresa o dirección" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </label>

          {/* Filtro por empresa (carpeta) */}
          <div className="vmp-filtros">
            <button type="button" className={`vmp-filtro ${filtro === 'todas' ? 'on' : ''}`} onClick={() => setFiltro('todas')}>
              Todas <span>{conPosicion.length}</span>
            </button>
            {carpetas.filter(c => conteos.porCarpeta[c.id]).map(c => (
              <button
                type="button"
                key={c.id}
                className={`vmp-filtro ${Number(filtro) === c.id ? 'on' : ''}`}
                style={{ '--c': c.color || '#F26522' }}
                onClick={() => setFiltro(c.id)}
              >
                {c.logo_url ? <img src={ligera(c.logo_url, 48)} alt="" /> : <span className="vmp-filtro-punto" />}
                {c.name} <span>{conteos.porCarpeta[c.id]}</span>
              </button>
            ))}
            {conteos.sinCarpeta > 0 && (
              <button type="button" className={`vmp-filtro ${filtro === SIN_CARPETA ? 'on' : ''}`} onClick={() => setFiltro(SIN_CARPETA)}>
                Sin empresa <span>{conteos.sinCarpeta}</span>
              </button>
            )}
          </div>

          <div className="vmp-items">
            {cargando && !propiedades.length ? (
              <div className="vmp-vacio"><Loader2 size={22} className="vmp-girar" /></div>
            ) : !filtradas.length ? (
              <div className="vmp-vacio">Ninguna propiedad coincide.</div>
            ) : filtradas.map(p => {
              const carpeta = carpetaDe(p);
              return (
                <button
                  type="button"
                  key={p.id}
                  className={`vmp-item ${p.id === seleccionadoId ? 'activo' : ''} ${!p.pos ? 'sin-pos' : ''}`}
                  onClick={() => (p.pos ? seleccionar(p.id) : irADetalles(p))}
                  title={p.pos ? 'Ver en el mapa' : 'Sin ubicación GPS: abrir detalles'}
                >
                  <span className="vmp-item-img" style={{ borderColor: carpeta?.color || '#334155' }}>
                    {carpeta?.logo_url
                      ? <img src={ligera(carpeta.logo_url, 80)} alt="" />
                      : p.foto_url ? <img src={ligera(p.foto_url, 80, 'c_fill')} alt="" className="foto" /> : <Building2 size={18} />}
                  </span>
                  <span className="vmp-item-cuerpo">
                    <strong>{p.nombre_propiedad || 'Propiedad sin nombre'}</strong>
                    <small>{carpeta ? carpeta.name : (p.propietario || 'Sin empresa')}</small>
                    <small className="vmp-item-dir">
                      {p.pos ? (p.direccion || 'Sin dirección') : <><MapPinOff size={12} /> Sin ubicación GPS</>}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── MAPA ── */}
        <section className="vmp-mapa">
          {loadError ? (
            <div className="vmp-vacio">No se pudo cargar Google Maps. Revisa tu conexión.</div>
          ) : !isLoaded ? (
            <div className="vmp-vacio"><Loader2 size={26} className="vmp-girar" /> Cargando mapa…</div>
          ) : (
            <GoogleMap
              mapContainerClassName="vmp-mapa-canvas"
              center={MERIDA}
              zoom={12}
              options={MAP_OPTIONS}
              onLoad={(map) => { mapRef.current = map; encuadrar(); }}
              onClick={() => setSeleccionadoId(null)}
            >
              {enMapa.map(p => (
                <OverlayViewF
                  key={p.id}
                  position={p.pos}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  getPixelPositionOffset={centrar}
                  zIndex={p.id === seleccionadoId ? 1000 : 100}
                >
                  <MarcadorPropiedad
                    propiedad={p}
                    carpeta={carpetaDe(p)}
                    seleccionado={p.id === seleccionadoId}
                    onClick={seleccionar}
                  />
                </OverlayViewF>
              ))}

              {seleccionada && (
                <InfoWindow
                  position={seleccionada.pos}
                  onCloseClick={() => setSeleccionadoId(null)}
                  options={{ pixelOffset: new window.google.maps.Size(0, -26), headerDisabled: true }}
                >
                  <div className="vmp-info">
                    <button type="button" className="vmp-info-cerrar" onClick={() => setSeleccionadoId(null)} aria-label="Cerrar"><X size={16} /></button>
                    {seleccionada.foto_url && <img className="vmp-info-foto" src={ligera(seleccionada.foto_url, 480, 'c_fill')} alt="" />}
                    <div className="vmp-info-cuerpo">
                      {carpetaDe(seleccionada) && (
                        <span className="vmp-info-empresa" style={{ '--c': carpetaDe(seleccionada).color || '#F26522' }}>
                          {carpetaDe(seleccionada).logo_url && <img src={ligera(carpetaDe(seleccionada).logo_url, 48)} alt="" />}
                          {carpetaDe(seleccionada).name}
                        </span>
                      )}
                      <strong>{seleccionada.nombre_propiedad || 'Propiedad sin nombre'}</strong>
                      {seleccionada.direccion && <p>{seleccionada.direccion}</p>}
                      <div className="vmp-info-acciones">
                        <button type="button" className="vmp-btn-primary" onClick={() => irADetalles(seleccionada)}>
                          <Eye size={15} /> Ver detalles
                        </button>
                        <a
                          className="vmp-btn-sec"
                          href={`https://www.google.com/maps/dir/?api=1&destination=${seleccionada.pos.lat},${seleccionada.pos.lng}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Navigation size={15} /> Cómo llegar
                        </a>
                      </div>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </section>
      </div>
    </div>
  );
};

export default VistaMapaPropiedades;
