import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView, InfoWindow, Polyline, Marker } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER } from "../../../components/Shared/googleMapsConfig";
import { Search, MapPin, Lock, RefreshCw, Phone, Navigation, Users, Wrench, Shield, X } from 'lucide-react';
import Header from '../../../components/Shared/Header';
import '../../../styles/AgenteSolutions/Admin/VistaMapaEquipo.css';

const API = import.meta.env.VITE_API_BASE_URL;
const TEAM_REFRESH_MS = 20000;
const ROUTE_REFRESH_MS = 30000;
const RECENT_MINUTES = 60;
const MERIDA = { lat: 20.9674, lng: -89.5926 };

const STATUS = {
  online: { color: '#10b981', label: 'En línea' },
  recent: { color: '#f59e0b', label: 'Reciente' },
  old: { color: '#64748b', label: 'Inactivo' },
  paused: { color: '#a855f7', label: 'Ubicación pausada' },
  none: { color: '#475569', label: 'Sin ubicación' }
};

const SOURCE_LABEL = {
  live: 'En movimiento',
  app_open: 'Abrió la app',
  job_update: 'Actualizó un trabajo'
};

const statusOf = (m) => {
  if (m.paused) return 'paused';
  if (!m.last_location) return 'none';
  if (m.online) return 'online';
  const mins = (Date.now() - new Date(m.last_location.recorded_at).getTime()) / 60000;
  return mins <= RECENT_MINUTES ? 'recent' : 'old';
};

// "09:05" en la hora del dispositivo
const horaCorta = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '');

const timeAgo = (iso) => {
  if (!iso) return '';
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'hace unos segundos';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const date = new Date(iso);
  return date.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// Solo letras: "Jorge (Personal) Vallarta" -> "JP", no "J("
const initials = (name) => name
  .replace(/[^\p{L}\s]/gu, ' ')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(p => p[0].toUpperCase())
  .join('') || '?';

const MAX_FIT_ZOOM = 16;

// Miniatura de la foto: en Cloudinary se pide a 96×96 (en lugar de la original de varios MB).
// Es lo que más aligera el zoom en celulares: el navegador ya no reescala fotos grandes en cada cuadro.
const thumb = (url, size = 96) => {
  if (!url || !/res\.cloudinary\.com\/.+\/upload\//.test(url)) return url;
  return url.replace('/upload/', `/upload/c_fill,g_face,w_${size},h_${size},f_auto,q_auto/`);
};

// Marcador HTML ligero: solo la foto (o iniciales) con borde del color de estado.
// Sin sombras ni animaciones: el navegador lo reacomoda en cada cuadro del zoom.
// memo: solo se redibuja si cambia algo que se ve (no en cada actualización del equipo).
const PersonMarker = memo(({ member, color, selected, onClick }) => {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = member.profile_picture && !photoFailed;
  return (
    <button
      type="button"
      className={`vme-marker ${selected ? 'selected' : ''}`}
      style={{ borderColor: color, background: showPhoto ? '#ffffff' : color }}
      onClick={(e) => { e.stopPropagation(); onClick(member.id); }}
      title={member.name}
    >
      {showPhoto
        ? <img src={thumb(member.profile_picture)} alt="" decoding="async" draggable={false} onError={() => setPhotoFailed(true)} />
        : <span>{initials(member.name)}</span>}
    </button>
  );
}, (prev, next) =>
  prev.member.id === next.member.id &&
  prev.member.name === next.member.name &&
  prev.member.profile_picture === next.member.profile_picture &&
  prev.color === next.color &&
  prev.selected === next.selected
);

// Centra el marcador sobre la coordenada
const centerOverlay = (width, height) => ({ x: -(width / 2), y: -(height / 2) });

// ── Recorrido ──
// Más de este tiempo entre dos puntos = la app estuvo cerrada: no sabemos el camino real.
const ROUTE_GAP_MINUTES = 10;
// Puntos con peor precisión que esto se descartan (son los que dibujan zigzags).
const ROUTE_MAX_ACCURACY_M = 100;

// Azul tipo navegación: resalta sobre el mapa (el naranja se perdía entre íconos de negocios).
// Se dibuja dos veces: un borde blanco ancho debajo y la línea azul encima.
const ROUTE_COLOR = '#2563eb';

const ROUTE_CASING = {
  strokeColor: '#ffffff',
  strokeOpacity: 1,
  strokeWeight: 9,
  zIndex: 1
};

const ROUTE_SOLID = {
  strokeColor: ROUTE_COLOR,
  strokeOpacity: 1,
  strokeWeight: 5,
  zIndex: 2,
  icons: [{ icon: { path: 'M 0,-2 2,2 -2,2 z', fillColor: '#ffffff', fillOpacity: 1, strokeColor: ROUTE_COLOR, strokeWeight: 1, scale: 1.4 }, offset: '50%', repeat: '120px' }]
};

const ROUTE_GAP = {
  strokeOpacity: 0,
  strokeWeight: 4,
  zIndex: 2,
  icons: [{ icon: { path: 'M 0,-1 0,1', strokeColor: '#334155', strokeOpacity: 0.85, strokeWeight: 4, scale: 4 }, offset: '0', repeat: '18px' }]
};

// Mapa más limpio y ligero: se ocultan íconos de negocios y transporte de Google
const MAP_STYLES = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }
];

const buildRouteSegments = (points) => {
  const validos = points.filter(p => p.accuracy == null || p.accuracy <= ROUTE_MAX_ACCURACY_M);
  const continuos = [];
  const sinDatos = [];
  let actual = [];

  for (let i = 0; i < validos.length; i++) {
    const p = { lat: validos[i].lat, lng: validos[i].lng };
    if (i === 0) { actual = [p]; continue; }
    const minutos = (new Date(validos[i].recorded_at) - new Date(validos[i - 1].recorded_at)) / 60000;
    if (minutos > ROUTE_GAP_MINUTES) {
      if (actual.length > 1) continuos.push(actual);
      sinDatos.push([actual[actual.length - 1], p]);
      actual = [p];
    } else {
      actual.push(p);
    }
  }
  if (actual.length > 1) continuos.push(actual);

  return {
    continuos,
    sinDatos,
    inicio: validos.length ? { lat: validos[0].lat, lng: validos[0].lng } : null
  };
};

// Opciones fijas del mapa (un objeto nuevo en cada render obliga a Google Maps a reaplicarlas)
const MAP_OPTIONS = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  keyboardShortcuts: false,
  gestureHandling: 'greedy', // en celular se mueve con un dedo
  styles: MAP_STYLES
};

const VistaMapaEquipo = () => {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all | tech | admin
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const fittedRef = useRef(false);

  const handleMarkerClick = useCallback((id) => {
    setSelectedId(id);
    setInfoOpen(true);
  }, []);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/mapa-equipo`);
      setMembers(res.data.members || []);
      setLastRefresh(new Date());
      setForbidden(false);
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true);
      else console.warn('[Mapa] Error al cargar el equipo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
    const id = setInterval(() => { if (!document.hidden) fetchTeam(); }, TEAM_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchTeam]);

  // Recorrido del día de la persona seleccionada
  useEffect(() => {
    if (!selectedId) { setRoutePoints([]); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get(`${API}/mapa-equipo/${selectedId}/recorrido`);
        if (!cancelled) setRoutePoints(res.data.points || []);
      } catch (err) {
        if (!cancelled) setRoutePoints([]);
        console.warn('[Mapa] Error al cargar el recorrido:', err);
      }
    };
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, ROUTE_REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter(m => roleFilter === 'all' || (roleFilter === 'tech' ? m.role_id === 2 : m.role_id === 1))
      .filter(m => !onlyOnline || m.online)
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const order = { online: 0, recent: 1, old: 2, paused: 3, none: 4 };
        const diff = order[statusOf(a)] - order[statusOf(b)];
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      });
  }, [members, search, roleFilter, onlyOnline]);

  const onMap = filtered.filter(m => m.last_location);
  const selected = members.find(m => m.id === selectedId) || null;
  const tramosRuta = useMemo(() => buildRouteSegments(routePoints), [routePoints]);
  const countOnline = members.filter(m => m.online).length;

  // Encuadrar a todos la primera vez que hay ubicaciones
  useEffect(() => {
    if (!isLoaded || !mapRef.current || fittedRef.current || onMap.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    onMap.forEach(m => bounds.extend({ lat: m.last_location.lat, lng: m.last_location.lng }));
    if (onMap.length === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(15);
    } else {
      mapRef.current.fitBounds(bounds, 60);
      // Si todos están casi en el mismo punto, fitBounds acerca demasiado: se limita el zoom
      window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
        if (mapRef.current.getZoom() > MAX_FIT_ZOOM) mapRef.current.setZoom(MAX_FIT_ZOOM);
      });
    }
    fittedRef.current = true;
  }, [isLoaded, onMap]);

  const handleSelect = (m) => {
    if (selectedId === m.id) {
      setSelectedId(null);
      setInfoOpen(false);
      return;
    }
    setSelectedId(m.id);
    setInfoOpen(Boolean(m.last_location));
    if (m.last_location && mapRef.current) {
      mapRef.current.panTo({ lat: m.last_location.lat, lng: m.last_location.lng });
      if (mapRef.current.getZoom() < 14) mapRef.current.setZoom(15);
    }
  };

  if (forbidden) {
    return (
      <div className="vme-root">
        <Header activeModule="mapa" />
        <main className="vme-forbidden">
          <Lock size={42} />
          <h2>Acceso restringido</h2>
          <p>Solo las personas autorizadas pueden ver la ubicación del equipo.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="vme-root">
      <Header activeModule="mapa" />

      <main className="vme-layout">
        <aside className="vme-sidebar">
          <div className="vme-sidebar-head">
            <div>
              <h2><Navigation size={18} /> Mapa del equipo</h2>
              <p>
                <span className="vme-online-dot" /> {countOnline} en línea de {members.length}
                {lastRefresh && <> · actualizado {lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</>}
              </p>
            </div>
            <button type="button" className="vme-icon-btn" onClick={fetchTeam} title="Actualizar">
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="vme-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar persona..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="vme-filters">
            <button type="button" className={`vme-chip ${roleFilter === 'all' ? 'active' : ''}`} onClick={() => setRoleFilter('all')}>
              <Users size={13} /> Todos
            </button>
            <button type="button" className={`vme-chip ${roleFilter === 'tech' ? 'active' : ''}`} onClick={() => setRoleFilter('tech')}>
              <Wrench size={13} /> Técnicos
            </button>
            <button type="button" className={`vme-chip ${roleFilter === 'admin' ? 'active' : ''}`} onClick={() => setRoleFilter('admin')}>
              <Shield size={13} /> Admins
            </button>
            <label className="vme-toggle">
              <input type="checkbox" checked={onlyOnline} onChange={(e) => setOnlyOnline(e.target.checked)} />
              Solo en línea
            </label>
          </div>

          <ul className="vme-list">
            {loading && <li className="vme-empty">Cargando equipo…</li>}
            {!loading && filtered.length === 0 && <li className="vme-empty">No hay personas con estos filtros.</li>}
            {filtered.map(m => {
              const st = statusOf(m);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`vme-person ${selectedId === m.id ? 'selected' : ''}`}
                    onClick={() => handleSelect(m)}
                  >
                    <span className="vme-avatar" style={{ borderColor: STATUS[st].color }}>
                      {m.profile_picture ? <img src={thumb(m.profile_picture)} alt="" loading="lazy" decoding="async" /> : initials(m.name)}
                      <span className="vme-avatar-dot" style={{ background: STATUS[st].color }} />
                    </span>
                    <span className="vme-person-info">
                      <span className="vme-person-name">{m.name}</span>
                      <span className="vme-person-meta">
                        {m.role_id === 2 ? 'Técnico' : 'Admin'} · {
                          m.paused ? `${m.pause_status || 'Ocupado'} · ubicación pausada${m.paused_at ? ` · ${timeAgo(m.paused_at)}` : ''}`
                          : !m.sharing && !m.last_location ? 'No comparte ubicación'
                            : m.last_location ? `${STATUS[st].label} · ${timeAgo(m.last_location.recorded_at)}`
                              : 'Sin ubicación todavía'
                        }
                      </span>
                      {m.place && (
                        <span className="vme-person-place">📍 En {m.place.nombre} desde {horaCorta(m.place.desde)}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <div className="vme-route">
              <h3>Recorrido de hoy · {selected.name.split(' ')[0]}</h3>
              {routePoints.length === 0 ? (
                <p className="vme-empty">Sin movimientos registrados hoy.</p>
              ) : (
                <ol>
                  {[...routePoints].reverse().slice(0, 12).map((p, i) => (
                    <li key={`${p.recorded_at}-${i}`}>
                      <span>{new Date(p.recorded_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                      {SOURCE_LABEL[p.source] || p.source}
                      {p.work_order_id ? ` #${p.work_order_id}` : ''}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </aside>

        <section className="vme-map">
          {loadError && <div className="vme-map-msg">No se pudo cargar Google Maps.</div>}

          {/* Pantalla de carga liviana (solo un círculo que gira) hasta que el mapa termina de dibujarse */}
          {!loadError && (!isLoaded || !mapReady) && (
            <div className="vme-map-loading" role="status" aria-live="polite">
              <span className="vme-spinner" aria-hidden="true" />
              <strong>Cargando mapa…</strong>
              <span>Espera un momento</span>
            </div>
          )}

          {isLoaded && (
            <GoogleMap
              mapContainerClassName="vme-map-canvas"
              center={MERIDA}
              zoom={12}
              onLoad={(map) => { mapRef.current = map; }}
              onTilesLoaded={() => { if (!mapReady) setMapReady(true); }}
              onClick={() => setInfoOpen(false)}
              options={MAP_OPTIONS}
            >
              {/* Recorrido del día: continuo (con flechas) donde hay datos seguidos;
                  punteado donde la app estuvo cerrada y no se sabe el camino exacto */}
              {selected && tramosRuta.continuos.map((path, i) => (
                <Polyline key={`cb-${i}`} path={path} options={ROUTE_CASING} />
              ))}
              {selected && tramosRuta.continuos.map((path, i) => (
                <Polyline key={`c-${i}`} path={path} options={ROUTE_SOLID} />
              ))}
              {selected && tramosRuta.sinDatos.map((path, i) => (
                <Polyline key={`d-${i}`} path={path} options={ROUTE_GAP} />
              ))}
              {selected && tramosRuta.inicio && (
                <Marker
                  position={tramosRuta.inicio}
                  title="Inicio del recorrido de hoy"
                  clickable={false}
                  icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: '#10b981', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }}
                />
              )}

              {onMap.map(m => (
                <OverlayViewF
                  key={m.id}
                  position={{ lat: m.last_location.lat, lng: m.last_location.lng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  getPixelPositionOffset={centerOverlay}
                  zIndex={m.id === selectedId ? 1000 : (m.online ? 500 : 100)}
                >
                  <PersonMarker
                    member={m}
                    color={STATUS[statusOf(m)].color}
                    selected={m.id === selectedId}
                    onClick={handleMarkerClick}
                  />
                </OverlayViewF>
              ))}

              {selected?.last_location && infoOpen && (
                <InfoWindow
                  position={{ lat: selected.last_location.lat, lng: selected.last_location.lng }}
                  onCloseClick={() => setInfoOpen(false)}
                  // Encabezado propio de Google oculto: su ✕ heredaba el color blanco de la app
                  // y no se veía. Usamos nuestra propia ✕ dentro del contenido.
                  options={{ pixelOffset: new window.google.maps.Size(0, -22), headerDisabled: true }}
                >
                  <div className="vme-info">
                    <button type="button" className="vme-info-close" onClick={() => setInfoOpen(false)} aria-label="Cerrar">
                      <X size={16} />
                    </button>
                    <strong>{selected.name}</strong>
                    <span>{selected.role_id === 2 ? 'Técnico' : 'Admin'} · {STATUS[statusOf(selected)].label}</span>
                    {selected.place && (
                      <span className="vme-person-place">📍 En {selected.place.nombre} desde {horaCorta(selected.place.desde)}</span>
                    )}
                    <span>{SOURCE_LABEL[selected.last_location.source] || ''} · {timeAgo(selected.last_location.recorded_at)}</span>
                    {selected.last_location.accuracy != null && <span>Precisión ±{Math.round(selected.last_location.accuracy)} m</span>}
                    <div className="vme-info-actions">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selected.last_location.lat},${selected.last_location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin size={13} /> Cómo llegar
                      </a>
                      {selected.phone_number && (
                        <a href={`tel:${selected.phone_number}`}><Phone size={13} /> Llamar</a>
                      )}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}

          <div className="vme-legend">
            {['online', 'recent', 'old'].map(k => (
              <span key={k}><i style={{ background: STATUS[k].color }} /> {STATUS[k].label}</span>
            ))}
            {selected && routePoints.length > 1 && (
              <>
                <span><b className="vme-legend-line" /> Recorrido</span>
                <span><b className="vme-legend-line dashed" /> Sin datos (app cerrada)</span>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default VistaMapaEquipo;
