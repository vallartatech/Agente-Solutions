import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Layers, ArrowLeft, RefreshCw, AlertCircle, ClipboardList, Clock, CheckCircle2, XCircle,
  Search, Building2, CalendarDays, Hammer, UserRound, ChevronRight, FilterX, ListChecks, SlidersHorizontal, X
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
import {
  API, authHeaders, esFinalizado, esCancelado, etiquetaEstado, etiquetaTipo, nombreTecnicos, visitaLocal
} from '../../AgenteSolutions/Admin/Expediente/flujoTrabajo';
import '../../../styles/AgenteMarket/Cliente/VistaTableroGlobal.css';

// Pide los expedientes de pocos en pocos
const enLotes = async (items, fn, simultaneos = 6) => {
  const res = new Array(items.length);
  let i = 0;
  const trabajador = async () => {
    while (i < items.length) {
      const k = i++;
      try { res[k] = { status: 'fulfilled', value: await fn(items[k]) }; }
      catch (e) { res[k] = { status: 'rejected', reason: e }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(simultaneos, items.length) }, trabajador));
  return res;
};

const norm = (s) => String(s || '').trim().toLowerCase();
const aFecha = (v) => {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
};
const fechaCorta = (v) => {
  const d = aFecha(v);
  return d ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};
const fechaHoraCorta = (v) => {
  const d = aFecha(v);
  return d ? d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
};

// Estado del trabajo para el tablero (mismos grupos que el Tablero de Control)
const clasificar = (t) => {
  if (esFinalizado(t)) return 'listo';
  if (esCancelado(t)) return 'cancelado';
  if (norm(t.prioridad) === 'urgente') return 'sos';
  if (['en proceso', 'en progreso'].includes(norm(t.status)) || t.arrived_at || t.arrival_status === 'EN_SITIO') return 'proceso';
  return 'pendiente';
};

const ESTADOS = [
  { id: 'todos', texto: 'Todos', icono: ListChecks },
  { id: 'sos', texto: 'SOS', icono: AlertCircle },
  { id: 'pendiente', texto: 'Por hacer', icono: ClipboardList },
  { id: 'proceso', texto: 'En proceso', icono: Clock },
  { id: 'listo', texto: 'Terminados', icono: CheckCircle2 },
  { id: 'cancelado', texto: 'Cancelados', icono: XCircle },
];

const PERIODOS = [
  { id: 'todo', texto: 'Todo' },
  { id: '7', texto: '7 días' },
  { id: '30', texto: '30 días' },
  { id: 'mes', texto: 'Este mes' },
  { id: 'rango', texto: 'Rango' },
];

const TIPOS = [
  { id: 'todos', texto: 'Todos' },
  { id: 'trabajo', texto: 'Trabajos' },
  { id: 'levantamiento', texto: 'Levantamientos' },
];

const POR_PAGINA = 25;

const nombreProp = (p) => p.nombre_propiedad || p.property_name || p.nombre || p.alias || `Propiedad #${p.id}`;

const VistaTableroGlobal = () => {
  const navigate = useNavigate();
  const [propiedades, setPropiedades] = useState([]);
  const [trabajos, setTrabajos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [propiedad, setPropiedad] = useState('todas');
  const [estado, setEstado] = useState('todos');
  const [periodo, setPeriodo] = useState('todo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const headers = authHeaders();
      const res = await axios.get(`${API}/propiedades`, { headers });
      const listaProps = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const expedientes = await enLotes(listaProps, (p) => axios.get(`${API}/propiedades/${p.id}/expediente`, { headers }));
      const todos = [];
      listaProps.forEach((p, i) => {
        const r = expedientes[i];
        const lista = r.status === 'fulfilled' ? (r.value.data?.trabajos || []) : [];
        lista.forEach((t) => todos.push({ ...t, propId: p.id, propNombre: nombreProp(p), cat: clasificar(t) }));
      });
      setPropiedades(listaProps);
      setTrabajos(todos);
    } catch (e) {
      console.error('No se pudo cargar el tablero global', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Al cambiar un filtro se vuelve a mostrar desde el inicio
  useEffect(() => { setMostrar(POR_PAGINA); }, [propiedad, estado, periodo, desde, hasta, tipo, busqueda]);

  // Límites de fecha del periodo elegido (fecha de solicitud)
  const [inicio, fin] = useMemo(() => {
    const hoy = new Date();
    if (periodo === '7' || periodo === '30') {
      const d = new Date(hoy);
      d.setDate(d.getDate() - Number(periodo));
      return [d, null];
    }
    if (periodo === 'mes') return [new Date(hoy.getFullYear(), hoy.getMonth(), 1), null];
    if (periodo === 'rango') {
      const a = desde ? new Date(`${desde}T00:00:00`) : null;
      const b = hasta ? new Date(`${hasta}T23:59:59`) : null;
      return [a, b];
    }
    return [null, null];
  }, [periodo, desde, hasta]);

  const pasaFecha = useCallback((t) => {
    if (!inicio && !fin) return true;
    const f = aFecha(t.created_at);
    if (!f) return false;
    return (!inicio || f >= inicio) && (!fin || f <= fin);
  }, [inicio, fin]);

  const pasaTipo = useCallback((t) => tipo === 'todos' || (tipo === 'levantamiento' ? t.kind === 'levantamiento' : t.kind !== 'levantamiento'), [tipo]);

  const pasaBusqueda = useCallback((t) => {
    const q = norm(busqueda);
    if (!q) return true;
    return [t.titulo, t.descripcion, t.propNombre, nombreTecnicos(t)].some((x) => norm(x).includes(q));
  }, [busqueda]);

  // Fecha, tipo y búsqueda (sin propiedad ni estado)
  const basePeriodo = useMemo(
    () => trabajos.filter((t) => pasaFecha(t) && pasaTipo(t) && pasaBusqueda(t)),
    [trabajos, pasaFecha, pasaTipo, pasaBusqueda]
  );

  // + propiedad: base de los contadores por estado
  const base = useMemo(
    () => basePeriodo.filter((t) => propiedad === 'todas' || String(t.propId) === propiedad),
    [basePeriodo, propiedad]
  );

  const conteo = useMemo(() => {
    const c = { todos: base.length, sos: 0, pendiente: 0, proceso: 0, listo: 0, cancelado: 0 };
    base.forEach((t) => { c[t.cat] += 1; });
    return c;
  }, [base]);

  const lista = useMemo(() => (
    base
      .filter((t) => estado === 'todos' || t.cat === estado)
      .sort((a, b) => (aFecha(b.updated_at || b.created_at) || 0) - (aFecha(a.updated_at || a.created_at) || 0))
  ), [base, estado]);

  const sinCancelar = conteo.todos - conteo.cancelado;
  const avance = sinCancelar > 0 ? Math.round((conteo.listo / sinCancelar) * 100) : 0;

  const textoPeriodo = () => {
    if (periodo !== 'rango') return PERIODOS.find((x) => x.id === periodo)?.texto;
    const f = (v) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '…');
    return `${f(desde)} – ${f(hasta)}`;
  };
  const activos = [
    propiedad !== 'todas' && {
      id: 'propiedad', icono: Building2, quitar: () => setPropiedad('todas'),
      texto: nombreProp(propiedades.find((p) => String(p.id) === propiedad) || { id: propiedad }),
    },
    periodo !== 'todo' && {
      id: 'periodo', icono: CalendarDays, texto: textoPeriodo(),
      quitar: () => { setPeriodo('todo'); setDesde(''); setHasta(''); },
    },
    tipo !== 'todos' && {
      id: 'tipo', icono: Hammer, texto: TIPOS.find((x) => x.id === tipo)?.texto, quitar: () => setTipo('todos'),
    },
  ].filter(Boolean);

  const hayFiltros = propiedad !== 'todas' || estado !== 'todos' || periodo !== 'todo' || tipo !== 'todos' || busqueda.trim() !== '';
  const limpiar = () => {
    setPropiedad('todas'); setEstado('todos'); setPeriodo('todo'); setDesde(''); setHasta(''); setTipo('todos'); setBusqueda('');
  };

  return (
    <div className="tg-page">
      <Header activeModule="tablero-global" titulo="TABLERO GLOBAL" />

      <div className="tg-contenido">
        {/* Título */}
        <div className="tg-panel tg-titulo">
          <button type="button" className="tg-icon-btn" onClick={() => navigate(-1)} aria-label="Regresar" title="Regresar">
            <ArrowLeft size={18} />
          </button>
          <span className="tg-titulo-icono"><Layers size={18} /></span>
          <div className="tg-titulo-txt">
            <h1>Tablero global</h1>
            <p>{propiedades.length} {propiedades.length === 1 ? 'propiedad' : 'propiedades'} · {trabajos.length} trabajos registrados</p>
          </div>
          <button type="button" className="tg-icon-btn" onClick={cargar} aria-label="Actualizar" title="Actualizar">
            <RefreshCw size={17} className={cargando ? 'tg-girando' : ''} />
          </button>
        </div>

        {/* Contadores por estado: también filtran la lista */}
        <div className="tg-estados" role="tablist" aria-label="Filtrar por estado">
          {ESTADOS.map(({ id, texto, icono: Icono }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={estado === id}
              className={`tg-panel tg-estado tg-e-${id} ${estado === id ? 'activo' : ''}`}
              onClick={() => setEstado(id)}
            >
              <span className="tg-estado-ico"><Icono size={16} /></span>
              <strong>{conteo[id]}</strong>
              <span>{texto}</span>
            </button>
          ))}
        </div>

        {/* Avance */}
        <div className="tg-panel tg-avance">
          <div className="tg-avance-txt">
            <span>Avance {propiedad === 'todas' ? 'global' : 'de la propiedad'}</span>
            <strong>{avance}%</strong>
          </div>
          <div className="tg-barra">
            {sinCancelar > 0 && (
              <>
                <div className="seg tg-s-sos" style={{ flexGrow: conteo.sos }} />
                <div className="seg tg-s-pendiente" style={{ flexGrow: conteo.pendiente }} />
                <div className="seg tg-s-proceso" style={{ flexGrow: conteo.proceso }} />
                <div className="seg tg-s-listo" style={{ flexGrow: conteo.listo }} />
              </>
            )}
          </div>
          <span className="tg-nota">{conteo.listo} de {sinCancelar} trabajos terminados (sin contar cancelados)</span>
        </div>

        <div className="tg-columnas">
          {/* Lista de trabajos */}
          <div className="tg-col-principal">
            <div className="tg-panel tg-lista">
              <div className="tg-lista-head">
                <strong>Trabajos</strong>
                <span>{lista.length}</span>
              </div>

              {cargando && trabajos.length === 0 ? (
                <p className="tg-vacio">Cargando trabajos…</p>
              ) : lista.length === 0 ? (
                <p className="tg-vacio">No hay trabajos con estos filtros.</p>
              ) : (
                <>
                  {lista.slice(0, mostrar).map((t) => {
                    const est = etiquetaEstado(t);
                    const visita = fechaHoraCorta(visitaLocal(t.scheduled_at));
                    return (
                      <button
                        key={`${t.propId}-${t.uid || t.id}`}
                        type="button"
                        className="tg-trabajo"
                        onClick={() => navigate(`/detalle-propiedad/${t.propId}/trabajo/${t.uid}`)}
                      >
                        <span className={`tg-trabajo-ico tg-e-${t.cat}`}>
                          {t.kind === 'levantamiento' ? <ClipboardList size={16} /> : <Hammer size={16} />}
                        </span>
                        <span className="tg-trabajo-txt">
                          <span className="tg-trabajo-arriba">
                            <span className={`tg-tono tono-${est.tono}`}>{est.texto}</span>
                            <span className="tg-tipo">{etiquetaTipo(t.kind)}</span>
                          </span>
                          <strong>{t.titulo || 'Sin título'}</strong>
                          <span className="tg-meta">
                            <span><Building2 size={12} /> {t.propNombre}</span>
                            <span><UserRound size={12} /> {nombreTecnicos(t)}</span>
                          </span>
                          <span className="tg-meta tg-fechas">
                            <span><CalendarDays size={12} /> Solicitado: {fechaCorta(t.created_at)}</span>
                            {visita && <span><Clock size={12} /> Visita: {visita}</span>}
                          </span>
                        </span>
                        <ChevronRight size={17} className="tg-flecha" />
                      </button>
                    );
                  })}
                  {lista.length > mostrar && (
                    <button type="button" className="tg-mas" onClick={() => setMostrar((n) => n + POR_PAGINA)}>
                      Ver más ({lista.length - mostrar} restantes)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

                    {/* Panel de filtros: búsqueda, propiedad, fecha y tipo */}
          <aside className="tg-panel tg-resumen tg-panel-filtros" aria-label="Filtros del tablero">
              {/* Buscador + botón de filtros (las opciones se abren al tocarlo) */}
              <div className="tg-barra-busqueda">
                <label className="tg-buscador">
                  <Search size={17} />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar trabajo, técnico o propiedad..."
                  />
                  {busqueda && (
                    <button type="button" className="tg-borrar" onClick={() => setBusqueda('')} aria-label="Borrar búsqueda">
                      <X size={14} />
                    </button>
                  )}
                </label>
                <button
                  type="button"
                  className={`tg-btn-filtros ${filtrosAbiertos ? 'abierto' : ''} ${activos.length ? 'con-activos' : ''}`}
                  onClick={() => setFiltrosAbiertos((v) => !v)}
                  aria-expanded={filtrosAbiertos}
                  aria-controls="tg-opciones-filtro"
                >
                  <SlidersHorizontal size={17} />
                  <span>Filtros</span>
                  {activos.length > 0 && <span className="tg-btn-filtros-n">{activos.length}</span>}
                </button>
              </div>

              {/* Cerrado: los filtros activos se ven como etiquetas que se pueden quitar */}
              {!filtrosAbiertos && activos.length > 0 && (
                <div className="tg-activos">
                  {activos.map(({ id, icono: Icono, texto, quitar }) => (
                    <button key={id} type="button" className="tg-activo" onClick={quitar} title="Quitar filtro">
                      <Icono size={13} /> {texto} <X size={13} />
                    </button>
                  ))}
                </div>
              )}

              {filtrosAbiertos && (
              <div className="tg-opciones" id="tg-opciones-filtro">
              <div className="tg-filtro-fila">
                <span className="tg-filtro-label"><Building2 size={14} /> Propiedad</span>
                <div className="tg-chips">
                  <button type="button" className={`tg-chip ${propiedad === 'todas' ? 'activo' : ''}`} onClick={() => setPropiedad('todas')}>Todas</button>
                  {propiedades.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`tg-chip ${propiedad === String(p.id) ? 'activo' : ''}`}
                      onClick={() => setPropiedad(String(p.id))}
                    >
                      {nombreProp(p)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="tg-filtro-fila">
                <span className="tg-filtro-label"><CalendarDays size={14} /> Fecha de solicitud</span>
                <div className="tg-chips">
                  {PERIODOS.map((x) => (
                    <button key={x.id} type="button" className={`tg-chip ${periodo === x.id ? 'activo' : ''}`} onClick={() => setPeriodo(x.id)}>
                      {x.texto}
                    </button>
                  ))}
                </div>
                {periodo === 'rango' && (
                  <div className="tg-rango">
                    <label>Desde<input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} /></label>
                    <label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} /></label>
                  </div>
                )}
              </div>

              <div className="tg-filtro-fila">
                <span className="tg-filtro-label"><Hammer size={14} /> Tipo</span>
                <div className="tg-chips">
                  {TIPOS.map((x) => (
                    <button key={x.id} type="button" className={`tg-chip ${tipo === x.id ? 'activo' : ''}`} onClick={() => setTipo(x.id)}>
                      {x.texto}
                    </button>
                  ))}
                </div>
              </div>

              <div className="tg-opciones-pie">
                {hayFiltros && (
                  <button type="button" className="tg-limpiar" onClick={limpiar}>
                    <FilterX size={15} /> Limpiar filtros
                  </button>
                )}
                <button type="button" className="tg-aplicar" onClick={() => setFiltrosAbiertos(false)}>
                  Ver {lista.length} {lista.length === 1 ? 'trabajo' : 'trabajos'}
                </button>
              </div>
              </div>
              )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default VistaTableroGlobal;
