import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutGrid, FileText, History, Search, SlidersHorizontal, Plus, MapPin, Tag,
  Building2, Check, LayoutDashboard, Inbox
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
import CasaLoader from '../../../components/Shared/CasaLoader';
import useExpediente from './Expediente/useExpediente';
import ModalNuevaSolicitud from './Expediente/ModalNuevaSolicitud';
import { TrabajoCard, ListaCotizaciones, LineaTiempo } from './Expediente/ExpedienteUI';
import { esActivo, esFinalizado, esCancelado, etiquetaTipo, nombreTecnicos } from './Expediente/flujoTrabajo';
import '../../../styles/Shared/UniversalSearch.css';
import '../../../styles/Shared/ToolbarAcciones.css';
import '../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';

const FACHADA_DEFAULT = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1000';

const FILTROS_ESTADO = [
  { key: 'todos', label: 'Todos' },
  { key: 'activos', label: 'Activos', fn: esActivo },
  { key: 'finalizados', label: 'Finalizados', fn: esFinalizado },
  { key: 'cancelados', label: 'Cancelados', fn: esCancelado },
];
const FILTROS_TIPO = [
  { key: 'todos', label: 'Todos los tipos' },
  { key: 'trabajo', label: 'Trabajos', fn: (t) => t.kind !== 'levantamiento' },
  { key: 'levantamiento', label: 'Levantamientos', fn: (t) => t.kind === 'levantamiento' },
];

const TABS = [
  { key: 'datos', label: 'Datos', Icon: LayoutGrid },
  { key: 'cotizaciones', label: 'Cotizaciones', Icon: FileText },
  { key: 'historial', label: 'Historial', Icon: History },
];

const VistaDetallePropiedad = () => {
  const { id: idParam } = useParams();
  const id = idParam || localStorage.getItem('current_property_id');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'datos';

  const { data, cargando, error, recargar } = useExpediente(id);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [modalSolicitud, setModalSolicitud] = useState(false);
  const filtroRef = useRef(null);

  useEffect(() => {
    if (!filtroAbierto) return;
    const cerrar = (e) => { if (!filtroRef.current?.contains(e.target)) setFiltroAbierto(false); };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [filtroAbierto]);

  const trabajos = useMemo(() => data?.trabajos || [], [data]);

  const trabajosFiltrados = useMemo(() => {
    const fEstado = FILTROS_ESTADO.find((f) => f.key === filtroEstado)?.fn;
    const fTipo = FILTROS_TIPO.find((f) => f.key === filtroTipo)?.fn;
    const q = busqueda.trim().toLowerCase();
    return trabajos.filter((t) => {
      if (fEstado && !fEstado(t)) return false;
      if (fTipo && !fTipo(t)) return false;
      if (!q) return true;
      return [t.titulo, t.descripcion, t.status, t.tipo, etiquetaTipo(t.kind), nombreTecnicos(t)]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [trabajos, busqueda, filtroEstado, filtroTipo]);

  const cotizaciones = useMemo(
    () => trabajos.flatMap((t) => (t.cotizaciones || []).map((c) => ({ ...c, _trabajo: t })))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    [trabajos]
  );

  const historial = useMemo(
    () => trabajos.filter((t) => !esActivo(t)).map((t) => ({
      fecha: t.updated_at,
      titulo: t.titulo,
      contexto: `${etiquetaTipo(t.kind)} · ${t.status} · ${nombreTecnicos(t)}`,
      texto: t.descripcion,
      fotos: [...(t.fotos || []), ...(t.reportes || []).map((r) => r.image_url).filter(Boolean)].slice(0, 4),
      tono: esFinalizado(t) ? 'green' : 'red',
      uid: t.uid,
    })).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
    [trabajos]
  );

  const cambiarTab = (key) => setSearchParams(key === 'datos' ? {} : { tab: key }, { replace: true });
  const abrirTrabajo = (uid, tabTrabajo) =>
    navigate(`/detalle-propiedad/${id}/trabajo/${uid}${tabTrabajo ? `?tab=${tabTrabajo}` : ''}`);

  const headerTabs = TABS.map((t) => ({ ...t, active: tab === t.key, onClick: () => cambiarTab(t.key) }));
  const header = (
    <Header
      activeModule="propiedades"
      titulo="DETALLE PROPIEDAD"
      navTabs={headerTabs}
      navBack={{ label: 'Propiedades', onClick: () => navigate('/propiedades') }}
    />
  );

  if (cargando) return <div className="xp-page">{header}<CasaLoader texto="Cargando propiedad..." /></div>;
  if (error || !data) return <div className="xp-page">{header}<p className="xp-vacio">{error || 'No se encontró la propiedad.'}</p></div>;

  const { propiedad, encargado } = data;
  const nombre = propiedad.property_name || propiedad.nombre_propiedad || 'Propiedad sin nombre';
  const activos = trabajos.filter(esActivo).length;
  const filtrosActivos = (filtroEstado !== 'todos') + (filtroTipo !== 'todos');

  return (
    <div className="xp-page">
      {header}

      <main className="xp-container">
        {/* Pestañas dentro de la vista en móvil (el menú superior se oculta) */}
        <div className="xp-tabs-movil">
          {headerTabs.map(({ key, label, Icon, active, onClick }) => (
            <button key={key} type="button" className={active ? 'on' : ''} onClick={onClick}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* BANNER: fachada + datos de la empresa */}
        <section className="xp-banner">
          <img src={propiedad.facade_photo_path || FACHADA_DEFAULT} alt="" className="xp-banner-img" />
          <div className="xp-banner-info">
            <span className="xp-banner-tag"><Building2 size={13} /> {propiedad.type || 'Propiedad'}</span>
            <h1>{nombre}</h1>
            <div className="xp-banner-datos">
              <span><Tag size={14} /> CURP: <strong>{propiedad.custom_curp || 'S/N'}</strong></span>
              <span><MapPin size={14} /> {propiedad.address || 'Sin dirección'}</span>
            </div>
          </div>
          <div className="xp-banner-stats">
            <div><strong>{activos}</strong><span>Activos</span></div>
            <div><strong>{trabajos.filter(esFinalizado).length}</strong><span>Finalizados</span></div>
            <div><strong>{cotizaciones.length}</strong><span>Cotizaciones</span></div>
          </div>
        </section>

        {tab === 'datos' && (
          <>
            <div className="tb-toolbar xp-toolbar">
              <div className="tb-toolbar-search">
                <div className="search-wrapper-full">
                  <div className="search-input-container">
                    <input
                      type="text"
                      className="search-input-large"
                      placeholder="Buscar trabajo, técnico o estado..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                    {busqueda === '' && <Search size={18} className="search-icon-inside" />}
                  </div>
                </div>
              </div>

              <div className="tb-actions-wrapper" ref={filtroRef}>
                <button
                  type="button"
                  className={`tb-actions-btn xp-filtro-btn ${filtroAbierto ? 'abierto' : ''}`}
                  onClick={() => setFiltroAbierto((v) => !v)}
                  title="Filtrar"
                  aria-label="Filtrar trabajos"
                  aria-expanded={filtroAbierto}
                >
                  <SlidersHorizontal size={20} />
                  {filtrosActivos > 0 && <span className="xp-filtro-badge">{filtrosActivos}</span>}
                </button>
                {filtroAbierto && (
                  <div className="tb-actions-menu xp-filtro-menu">
                    <span className="xp-filtro-titulo">Estado</span>
                    {FILTROS_ESTADO.map((f) => (
                      <button key={f.key} type="button" className={`tb-actions-item ${filtroEstado === f.key ? 'selected' : ''}`} onClick={() => setFiltroEstado(f.key)}>
                        {f.label} {filtroEstado === f.key && <Check size={15} className="xp-filtro-check" />}
                      </button>
                    ))}
                    <span className="xp-filtro-titulo">Tipo</span>
                    {FILTROS_TIPO.map((f) => (
                      <button key={f.key} type="button" className={`tb-actions-item ${filtroTipo === f.key ? 'selected' : ''}`} onClick={() => setFiltroTipo(f.key)}>
                        {f.label} {filtroTipo === f.key && <Check size={15} className="xp-filtro-check" />}
                      </button>
                    ))}
                    <span className="xp-filtro-titulo">Más</span>
                    <button type="button" className="tb-actions-item" onClick={() => navigate(`/propiedad/${id}/tablero`)}>
                      <span className="tb-actions-icon dark"><LayoutDashboard size={16} /></span> Tablero detallado
                    </button>
                  </div>
                )}
              </div>

              <button type="button" className="xp-btn-primary xp-btn-solicitud" onClick={() => setModalSolicitud(true)}>
                <Plus size={18} strokeWidth={2.8} /> <span>Nueva solicitud</span>
              </button>
            </div>

            {trabajosFiltrados.length ? (
              <div className="xp-grid">
                {trabajosFiltrados.map((t) => (
                  <TrabajoCard key={t.uid} trabajo={t} onClick={() => abrirTrabajo(t.uid)} />
                ))}
              </div>
            ) : (
              <div className="xp-card xp-vacio-card">
                <Inbox size={34} />
                <p>{trabajos.length ? 'Ningún trabajo coincide con la búsqueda.' : 'Esta propiedad aún no tiene solicitudes.'}</p>
                {!trabajos.length && (
                  <button type="button" className="xp-btn-primary" onClick={() => setModalSolicitud(true)}>
                    <Plus size={18} /> Crear la primera solicitud
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'cotizaciones' && (
          <section className="xp-card xp-panel">
            <h3 className="xp-panel-titulo"><FileText size={18} /> Cotizaciones de la propiedad</h3>
            <ListaCotizaciones
              cotizaciones={cotizaciones}
              onAbrir={(c) => abrirTrabajo(c._trabajo.uid, 'cotizaciones')}
              vacio="Esta propiedad todavía no tiene cotizaciones."
            />
          </section>
        )}

        {tab === 'historial' && (
          <section className="xp-card xp-panel">
            <h3 className="xp-panel-titulo"><History size={18} /> Historial de trabajos</h3>
            <LineaTiempo
              eventos={historial}
              onSelect={(e) => abrirTrabajo(e.uid, 'historial')}
              vacio="Aún no hay trabajos finalizados en esta propiedad."
            />
          </section>
        )}
      </main>

      {modalSolicitud && (
        <ModalNuevaSolicitud
          propiedad={{ ...propiedad, encargado }}
          onClose={() => setModalSolicitud(false)}
          onCreada={() => recargar(true)}
        />
      )}
    </div>
  );
};

export default VistaDetallePropiedad;
