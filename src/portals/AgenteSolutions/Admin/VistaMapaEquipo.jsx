import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView, InfoWindow, Polyline, Marker } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER } from "../../../components/Shared/googleMapsConfig";
import {
  Search, MapPin, Lock, RefreshCw, Phone, Navigation, Users, Wrench, Shield, X,
  Building2, Eye, MapPinOff, Loader2, SlidersHorizontal, Check,
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
import { useAuth } from '../../../context/AuthContext';
import '../../../styles/AgenteSolutions/Admin/VistaMapaEquipo.css';
import '../../../styles/AgenteSolutions/Admin/VistaMapaPropiedades.css';

const API = import.meta.env.VITE_API_BASE_URL;
const TEAM_REFRESH_MS = 20000;
const ROUTE_REFRESH_MS = 30000;
const RECENT_MINUTES = 60;
const MERIDA = { lat: 20.9674, lng: -89.5926 };
const SIN_CARPETA = 'sin-carpeta';

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

// Versión ligera de imágenes de Cloudinary para el mapa (el logo completo, sin recortar)
const ligera = (url, size = 96, modo = 'c_pad,b_white') => {
  if (!url || !/res\.cloudinary\.com\/.+\/upload\//.test(url)) return url;
  return url.replace('/upload/', `/upload/${modo},w_${size},h_${size},f_auto,q_auto/`);
};

const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// "20.9674, -89.5926" -> { lat, lng }
const parseCoords = (texto) => {
  const [lat, lng] = String(texto || '').split(',').map(n => parseFloat(n));
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { lat, lng } : null;
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

// Marcador de propiedad: logo de la empresa (carpeta) o, si no tiene, un círculo de color con un edificio
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

// Botón de filtro junto al buscador: abre un panel con las opciones y se cierra al tocar fuera
const FiltroMenu = ({ activo, children }) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => { if (!ref.current?.contains(e.target)) setAbierto(false); };
    const conTecla = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('pointerdown', cerrar);
    document.addEventListener('keydown', conTecla);
    return () => {
      document.removeEventListener('pointerdown', cerrar);
      document.removeEventListener('keydown', conTecla);
    };
  }, [abierto]);

  return (
    <div className="vme-filtro" ref={ref}>
      <button
        type="button"
        className={`vme-filtro-btn ${activo ? 'activo' : ''} ${abierto ? 'abierto' : ''}`}
        onClick={() => setAbierto(v => !v)}
        aria-haspopup="true"
        aria-expanded={abierto}
        title="Filtros"
        aria-label="Filtros"
      >
        <SlidersHorizontal size={16} />
        {activo > 0 && <span className="vme-filtro-badge">{activo}</span>}
      </button>
      {abierto && (
        <div className="vme-filtro-panel" onClick={(e) => { if (e.target.closest('[data-cierra]')) setAbierto(false); }}>
          {children}
        </div>
      )}
    </div>
  );
};

const OpcionFiltro = ({ activa, onClick, children }) => (
  <button type="button" className={`vme-filtro-opcion ${activa ? 'activa' : ''}`} onClick={onClick} data-cierra="">
    <span className="vme-filtro-opcion-txt">{children}</span>
    {activa && <Check size={15} />}
  </button>
);

const ROLES_FILTRO = { all: 'Todos', tech: 'Técnicos', admin: 'Admins' };

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

// Mapa en vivo: el equipo (ubicación en tiempo real) y las propiedades registradas en un solo mapa.
// El equipo solo lo ve quien tiene permiso de ubicación; las propiedades, Root (0) y Admin (1).
const VistaMapaEquipo = () => {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const puedeVerPropiedades = [0, 1].includes(Number(user?.role_id));

  const [pestana, setPestana] = useState(() =>
    searchParams.get('capa') === 'propiedades' && puedeVerPropiedades ? 'propiedades' : 'equipo'
  );
  const [capas, setCapas] = useState({ equipo: true, propiedades: puedeVerPropiedades });

  // ── Equipo ──
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

  // ── Propiedades ──
  const [propiedades, setPropiedades] = useState([]);
  const [carpetas, setCarpetas] = useState([]);
  const [cargandoProps, setCargandoProps] = useState(puedeVerPropiedades);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todas'); // 'todas' | id de carpeta | SIN_CARPETA
  const [propSelId, setPropSelId] = useState(null);

  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const fittedRef = useRef(false);

  const verEquipo = !forbidden;

  // Solo una ventana de información abierta a la vez (persona o propiedad)
  const handleMarkerClick = useCallback((id) => {
    setSelectedId(id);
    setInfoOpen(true);
    setPropSelId(null);
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

  const cargarPropiedades = useCallback(async () => {
    if (!puedeVerPropiedades) return;
    setCargandoProps(true);
    try {
      const [rp, rc] = await Promise.all([
        axios.get(`${API}/propiedades`),
        axios.get(`${API}/property-folders`).catch(() => ({ data: [] }))
      ]);
      setPropiedades(Array.isArray(rp.data) ? rp.data : []);
      setCarpetas(Array.isArray(rc.data) ? rc.data : []);
    } catch (err) {
      console.error('[Mapa] Error al cargar las propiedades:', err);
    } finally {
      setCargandoProps(false);
    }
  }, [puedeVerPropiedades]);

  useEffect(() => { cargarPropiedades(); }, [cargarPropiedades]);

  // Sin permiso para el equipo: se queda solo con las propiedades
  useEffect(() => {
    if (forbidden && puedeVerPropiedades) setPestana('propiedades');
  }, [forbidden, puedeVerPropiedades]);

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

  const onMap = verEquipo && capas.equipo ? filtered.filter(m => m.last_location) : [];
  const selected = members.find(m => m.id === selectedId) || null;
  const tramosRuta = useMemo(() => buildRouteSegments(routePoints), [routePoints]);
  const countOnline = members.filter(m => m.online).length;

  // ── Propiedades: filtros por búsqueda y por empresa (carpeta) ──
  const carpetaPorId = useMemo(() => Object.fromEntries(carpetas.map(c => [c.id, c])), [carpetas]);
  const carpetaDe = (p) => (p.folder_id ? carpetaPorId[p.folder_id] : null);
  const conPosicion = useMemo(() => propiedades.map(p => ({ ...p, pos: parseCoords(p.coordenadas) })), [propiedades]);

  const propsFiltradas = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return conPosicion.filter(p => {
      if (filtro === SIN_CARPETA && p.folder_id) return false;
      if (filtro !== 'todas' && filtro !== SIN_CARPETA && Number(p.folder_id) !== Number(filtro)) return false;
      if (!q) return true;
      const carpeta = carpetaPorId[p.folder_id]?.name;
      return [p.nombre_propiedad, p.direccion, p.propietario, carpeta].some(v => sinAcentos(v).includes(q));
    });
  }, [conPosicion, filtro, busqueda, carpetaPorId]);

  const propsEnMapa = useMemo(() => (capas.propiedades ? propsFiltradas.filter(p => p.pos) : []), [propsFiltradas, capas.propiedades]);
  const propsSinUbicacion = propsFiltradas.filter(p => !p.pos).length;
  const propSeleccionada = propsEnMapa.find(p => p.id === propSelId) || null;

  const conteos = useMemo(() => {
    const porCarpeta = {};
    let sinCarpeta = 0;
    conPosicion.forEach(p => {
      if (p.folder_id) porCarpeta[p.folder_id] = (porCarpeta[p.folder_id] || 0) + 1;
      else sinCarpeta += 1;
    });
    return { porCarpeta, sinCarpeta };
  }, [conPosicion]);

  // Encuadrar en todo lo que se está mostrando (personas y propiedades)
  const encuadrar = useCallback((puntos) => {
    const map = mapRef.current;
    if (!map || !window.google || puntos.length === 0) return;
    if (puntos.length === 1) {
      map.setCenter(puntos[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    puntos.forEach(p => bounds.extend(p));
    map.fitBounds(bounds, 60);
    // Si todo está casi en el mismo punto, fitBounds acerca demasiado: se limita el zoom
    window.google.maps.event.addListenerOnce(map, 'idle', () => {
      if (map.getZoom() > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
    });
  }, []);

  const puntosVisibles = useMemo(() => [
    ...onMap.map(m => ({ lat: m.last_location.lat, lng: m.last_location.lng })),
    ...propsEnMapa.map(p => p.pos),
  ], [onMap, propsEnMapa]);

  // La primera vez, cuando ya cargó todo lo que se va a mostrar
  useEffect(() => {
    if (!isLoaded || !mapRef.current || fittedRef.current || loading || cargandoProps) return;
    if (puntosVisibles.length === 0) return;
    encuadrar(puntosVisibles);
    fittedRef.current = true;
  }, [isLoaded, loading, cargandoProps, puntosVisibles, encuadrar]);

  // Al cambiar de empresa se encuadra en sus propiedades
  useEffect(() => {
    if (!fittedRef.current || !propsEnMapa.length) return;
    encuadrar(propsEnMapa.map(p => p.pos));
  }, [filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (m) => {
    if (selectedId === m.id) {
      setSelectedId(null);
      setInfoOpen(false);
      return;
    }
    setSelectedId(m.id);
    setPropSelId(null);
    setInfoOpen(Boolean(m.last_location));
    if (m.last_location && mapRef.current) {
      if (!capas.equipo) setCapas(c => ({ ...c, equipo: true }));
      mapRef.current.panTo({ lat: m.last_location.lat, lng: m.last_location.lng });
      if (mapRef.current.getZoom() < 14) mapRef.current.setZoom(15);
    }
  };

  const seleccionarPropiedad = useCallback((id) => {
    setPropSelId(id);
    setInfoOpen(false);
  }, []);

  const irAPropiedad = (p) => {
    seleccionarPropiedad(p.id);
    if (!capas.propiedades) setCapas(c => ({ ...c, propiedades: true }));
    if (mapRef.current) {
      mapRef.current.panTo(p.pos);
      if (mapRef.current.getZoom() < 15) mapRef.current.setZoom(15);
    }
  };

  const irADetalles = (p) => {
    localStorage.setItem('current_property_id', p.id);
    navigate(`/detalle-propiedad/${p.id}`);
  };

  const alternarCapa = (capa) => {
    setCapas(c => ({ ...c, [capa]: !c[capa] }));
    if (capa === 'equipo') setInfoOpen(false);
    if (capa === 'propiedades') setPropSelId(null);
  };

  if (forbidden && !puedeVerPropiedades) {
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
              <h2><Navigation size={18} /> Mapa en vivo</h2>
              {pestana === 'equipo' ? (
                <p>
                  <span className="vme-online-dot" /> {countOnline} en línea de {members.length}
                  {lastRefresh && <> · actualizado {lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</>}
                </p>
              ) : (
                <p>{propsFiltradas.length - propsSinUbicacion} en el mapa{propsSinUbicacion > 0 ? ` · ${propsSinUbicacion} sin ubicación` : ''}</p>
              )}
            </div>
            <button
              type="button"
              className="vme-icon-btn"
              onClick={pestana === 'equipo' ? fetchTeam : cargarPropiedades}
              title="Actualizar"
              aria-label="Actualizar"
            >
              <RefreshCw size={16} className={pestana === 'propiedades' && cargandoProps ? 'vmp-girar' : ''} />
            </button>
          </div>

          {/* Equipo / Propiedades */}
          {verEquipo && puedeVerPropiedades && (
            <div className="vme-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={pestana === 'equipo'} className={pestana === 'equipo' ? 'active' : ''} onClick={() => setPestana('equipo')}>
                <Users size={14} /> Equipo <span>{members.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={pestana === 'propiedades'} className={pestana === 'propiedades' ? 'active' : ''} onClick={() => setPestana('propiedades')}>
                <Building2 size={14} /> Propiedades <span>{conPosicion.length}</span>
              </button>
            </div>
          )}

          {pestana === 'equipo' ? (
            <>
              <div className="vme-buscador">
                <div className="vme-search">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Buscar persona..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <FiltroMenu activo={(roleFilter !== 'all' ? 1 : 0) + (onlyOnline ? 1 : 0)}>
                  <span className="vme-filtro-titulo">Rol</span>
                  <OpcionFiltro activa={roleFilter === 'all'} onClick={() => setRoleFilter('all')}><Users size={14} /> Todos</OpcionFiltro>
                  <OpcionFiltro activa={roleFilter === 'tech'} onClick={() => setRoleFilter('tech')}><Wrench size={14} /> Técnicos</OpcionFiltro>
                  <OpcionFiltro activa={roleFilter === 'admin'} onClick={() => setRoleFilter('admin')}><Shield size={14} /> Admins</OpcionFiltro>
                  <span className="vme-filtro-titulo">Estado</span>
                  <label className="vme-filtro-switch">
                    <span><span className="vme-online-dot" /> Solo en línea</span>
                    <input type="checkbox" checked={onlyOnline} onChange={(e) => setOnlyOnline(e.target.checked)} />
                  </label>
                </FiltroMenu>
              </div>

              {(roleFilter !== 'all' || onlyOnline) && (
                <div className="vme-filtros-activos">
                  {roleFilter !== 'all' && (
                    <button type="button" className="vme-filtro-tag" onClick={() => setRoleFilter('all')} title="Quitar filtro">
                      {ROLES_FILTRO[roleFilter]} <X size={12} />
                    </button>
                  )}
                  {onlyOnline && (
                    <button type="button" className="vme-filtro-tag" onClick={() => setOnlyOnline(false)} title="Quitar filtro">
                      Solo en línea <X size={12} />
                    </button>
                  )}
                </div>
              )}

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
            </>
          ) : (
            <>
              <div className="vme-buscador">
                <label className="vmp-buscar">
                  <Search size={16} />
                  <input type="search" placeholder="Buscar propiedad, empresa o dirección" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </label>
                {/* Filtro por empresa (carpeta) */}
                <FiltroMenu activo={filtro !== 'todas' ? 1 : 0}>
                  <span className="vme-filtro-titulo">Empresa</span>
                  <div className="vme-filtro-lista">
                    <OpcionFiltro activa={filtro === 'todas'} onClick={() => setFiltro('todas')}>
                      <Building2 size={14} /> Todas <small>{conPosicion.length}</small>
                    </OpcionFiltro>
                    {carpetas.filter(c => conteos.porCarpeta[c.id]).map(c => (
                      <OpcionFiltro key={c.id} activa={Number(filtro) === c.id} onClick={() => setFiltro(c.id)}>
                        {c.logo_url
                          ? <img src={ligera(c.logo_url, 48)} alt="" />
                          : <span className="vmp-filtro-punto" style={{ '--c': c.color || '#F26522' }} />}
                        {c.name} <small>{conteos.porCarpeta[c.id]}</small>
                      </OpcionFiltro>
                    ))}
                    {conteos.sinCarpeta > 0 && (
                      <OpcionFiltro activa={filtro === SIN_CARPETA} onClick={() => setFiltro(SIN_CARPETA)}>
                        <MapPinOff size={14} /> Sin empresa <small>{conteos.sinCarpeta}</small>
                      </OpcionFiltro>
                    )}
                  </div>
                </FiltroMenu>
              </div>

              {filtro !== 'todas' && (
                <div className="vme-filtros-activos">
                  <button type="button" className="vme-filtro-tag" onClick={() => setFiltro('todas')} title="Quitar filtro">
                    {filtro === SIN_CARPETA ? 'Sin empresa' : (carpetaPorId[filtro]?.name || 'Empresa')} <X size={12} />
                  </button>
                </div>
              )}

              <div className="vmp-items">
                {cargandoProps && !propiedades.length ? (
                  <div className="vmp-vacio"><Loader2 size={22} className="vmp-girar" /></div>
                ) : !propsFiltradas.length ? (
                  <div className="vmp-vacio">Ninguna propiedad coincide.</div>
                ) : propsFiltradas.map(p => {
                  const carpeta = carpetaDe(p);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      className={`vmp-item ${p.id === propSelId ? 'activo' : ''} ${!p.pos ? 'sin-pos' : ''}`}
                      onClick={() => (p.pos ? irAPropiedad(p) : irADetalles(p))}
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
            </>
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

          {/* Capas visibles en el mapa */}
          {verEquipo && puedeVerPropiedades && (
            <div className="vme-capas">
              <button type="button" className={capas.equipo ? 'on' : ''} onClick={() => alternarCapa('equipo')} aria-pressed={capas.equipo}>
                <Users size={14} /> Equipo
              </button>
              <button type="button" className={capas.propiedades ? 'on' : ''} onClick={() => alternarCapa('propiedades')} aria-pressed={capas.propiedades}>
                <Building2 size={14} /> Propiedades
              </button>
            </div>
          )}

          {isLoaded && (
            <GoogleMap
              mapContainerClassName="vme-map-canvas"
              center={MERIDA}
              zoom={12}
              onLoad={(map) => { mapRef.current = map; }}
              onTilesLoaded={() => { if (!mapReady) setMapReady(true); }}
              onClick={() => { setInfoOpen(false); setPropSelId(null); }}
              options={MAP_OPTIONS}
            >
              {/* Recorrido del día: continuo (con flechas) donde hay datos seguidos;
                  punteado donde la app estuvo cerrada y no se sabe el camino exacto */}
              {selected && capas.equipo && tramosRuta.continuos.map((path, i) => (
                <Polyline key={`cb-${i}`} path={path} options={ROUTE_CASING} />
              ))}
              {selected && capas.equipo && tramosRuta.continuos.map((path, i) => (
                <Polyline key={`c-${i}`} path={path} options={ROUTE_SOLID} />
              ))}
              {selected && capas.equipo && tramosRuta.sinDatos.map((path, i) => (
                <Polyline key={`d-${i}`} path={path} options={ROUTE_GAP} />
              ))}
              {selected && capas.equipo && tramosRuta.inicio && (
                <Marker
                  position={tramosRuta.inicio}
                  title="Inicio del recorrido de hoy"
                  clickable={false}
                  icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: '#10b981', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }}
                />
              )}

              {/* Propiedades debajo de las personas */}
              {propsEnMapa.map(p => (
                <OverlayViewF
                  key={`p-${p.id}`}
                  position={p.pos}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  getPixelPositionOffset={centerOverlay}
                  zIndex={p.id === propSelId ? 900 : 50}
                >
                  <MarcadorPropiedad
                    propiedad={p}
                    carpeta={carpetaDe(p)}
                    seleccionado={p.id === propSelId}
                    onClick={seleccionarPropiedad}
                  />
                </OverlayViewF>
              ))}

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

              {selected?.last_location && infoOpen && capas.equipo && (
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

              {propSeleccionada && (
                <InfoWindow
                  position={propSeleccionada.pos}
                  onCloseClick={() => setPropSelId(null)}
                  options={{ pixelOffset: new window.google.maps.Size(0, -26), headerDisabled: true }}
                >
                  <div className="vmp-info">
                    <button type="button" className="vmp-info-cerrar" onClick={() => setPropSelId(null)} aria-label="Cerrar"><X size={16} /></button>
                    {propSeleccionada.foto_url && <img className="vmp-info-foto" src={ligera(propSeleccionada.foto_url, 480, 'c_fill')} alt="" />}
                    <div className="vmp-info-cuerpo">
                      {carpetaDe(propSeleccionada) && (
                        <span className="vmp-info-empresa" style={{ '--c': carpetaDe(propSeleccionada).color || '#F26522' }}>
                          {carpetaDe(propSeleccionada).logo_url && <img src={ligera(carpetaDe(propSeleccionada).logo_url, 48)} alt="" />}
                          {carpetaDe(propSeleccionada).name}
                        </span>
                      )}
                      <strong>{propSeleccionada.nombre_propiedad || 'Propiedad sin nombre'}</strong>
                      {propSeleccionada.direccion && <p>{propSeleccionada.direccion}</p>}
                      <div className="vmp-info-acciones">
                        <button type="button" className="vmp-btn-primary" onClick={() => irADetalles(propSeleccionada)}>
                          <Eye size={15} /> Ver detalles
                        </button>
                        <a
                          className="vmp-btn-sec"
                          href={`https://www.google.com/maps/dir/?api=1&destination=${propSeleccionada.pos.lat},${propSeleccionada.pos.lng}`}
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

          <div className="vme-legend">
            {verEquipo && capas.equipo && ['online', 'recent', 'old'].map(k => (
              <span key={k}><i style={{ background: STATUS[k].color }} /> {STATUS[k].label}</span>
            ))}
            {capas.propiedades && puedeVerPropiedades && (
              <span><Building2 size={12} className="vme-legend-prop" /> Propiedad</span>
            )}
            {selected && capas.equipo && routePoints.length > 1 && (
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
