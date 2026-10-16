import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView, InfoWindow, Polyline } from '@react-google-maps/api';
import { Search, MapPin, Lock, RefreshCw, Phone, Navigation, Users, Wrench, Shield } from 'lucide-react';
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
  none: { color: '#475569', label: 'Sin ubicación' }
};

const SOURCE_LABEL = {
  live: 'En movimiento',
  app_open: 'Abrió la app',
  job_update: 'Actualizó un trabajo'
};

const statusOf = (m) => {
  if (!m.last_location) return 'none';
  if (m.online) return 'online';
  const mins = (Date.now() - new Date(m.last_location.recorded_at).getTime()) / 60000;
  return mins <= RECENT_MINUTES ? 'recent' : 'old';
};

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

// Marcador HTML: foto redonda (o iniciales) con borde del color de estado.
// Si la foto no carga, vuelve a las iniciales.
const PersonMarker = ({ member, color, selected, onClick }) => {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = member.profile_picture && !photoFailed;
  return (
    <button
      type="button"
      className={`vme-marker ${selected ? 'selected' : ''} ${member.online ? 'online' : ''}`}
      style={{ '--vme-marker-color': color, background: showPhoto ? '#ffffff' : color }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={member.name}
    >
      {showPhoto
        ? <img src={member.profile_picture} alt="" onError={() => setPhotoFailed(true)} />
        : <span>{initials(member.name)}</span>}
    </button>
  );
};

// Centra el marcador sobre la coordenada
const centerOverlay = (width, height) => ({ x: -(width / 2), y: -(height / 2) });

const VistaMapaEquipo = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDgyTj0X6kgGoMV8NxQGDp4-Nx0bxJd0Hw'
  });

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
  const mapRef = useRef(null);
  const fittedRef = useRef(false);

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
        const order = { online: 0, recent: 1, old: 2, none: 3 };
        const diff = order[statusOf(a)] - order[statusOf(b)];
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      });
  }, [members, search, roleFilter, onlyOnline]);

  const onMap = filtered.filter(m => m.last_location);
  const selected = members.find(m => m.id === selectedId) || null;
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
                      {m.profile_picture ? <img src={m.profile_picture} alt="" /> : initials(m.name)}
                      <span className="vme-avatar-dot" style={{ background: STATUS[st].color }} />
                    </span>
                    <span className="vme-person-info">
                      <span className="vme-person-name">{m.name}</span>
                      <span className="vme-person-meta">
                        {m.role_id === 2 ? 'Técnico' : 'Admin'} · {
                          !m.sharing && !m.last_location ? 'No comparte ubicación'
                            : m.last_location ? `${STATUS[st].label} · ${timeAgo(m.last_location.recorded_at)}`
                              : 'Sin ubicación todavía'
                        }
                      </span>
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
          {!isLoaded && !loadError && <div className="vme-map-msg">Cargando mapa…</div>}
          {isLoaded && (
            <GoogleMap
              mapContainerClassName="vme-map-canvas"
              center={MERIDA}
              zoom={12}
              onLoad={(map) => { mapRef.current = map; }}
              onClick={() => setInfoOpen(false)}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false }}
            >
              {selected && routePoints.length > 1 && (
                <Polyline
                  path={routePoints.map(p => ({ lat: p.lat, lng: p.lng }))}
                  options={{ strokeColor: '#f97316', strokeOpacity: 0.85, strokeWeight: 4 }}
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
                    onClick={() => { setSelectedId(m.id); setInfoOpen(true); }}
                  />
                </OverlayViewF>
              ))}

              {selected?.last_location && infoOpen && (
                <InfoWindow
                  position={{ lat: selected.last_location.lat, lng: selected.last_location.lng }}
                  onCloseClick={() => setInfoOpen(false)}
                  options={{ pixelOffset: new window.google.maps.Size(0, -22) }}
                >
                  <div className="vme-info">
                    <strong>{selected.name}</strong>
                    <span>{selected.role_id === 2 ? 'Técnico' : 'Admin'} · {STATUS[statusOf(selected)].label}</span>
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
          </div>
        </section>
      </main>
    </div>
  );
};

export default VistaMapaEquipo;
