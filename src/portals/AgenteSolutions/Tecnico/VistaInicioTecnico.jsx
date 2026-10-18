import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Wrench, ClipboardList, FileText, ChevronRight, MapPin, Clock, AlertTriangle,
  CheckCircle2, Package, Navigation, CalendarDays, Sun, Moon, Sunset
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Shared/Header';
import CasaLoader from '../../../components/Shared/CasaLoader';
import '../../../styles/AgenteSolutions/Tecnico/VistaInicioTecnico.css';

// Mismo formato YYYY-MM-DD que usa TrabajosTecnico para comparar días
const getDayStr = (d) => {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10);
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const esFinalizado = (s) => ['completed', 'finalizado', 'listo'].includes(String(s.status || '').toLowerCase());
const esUrgente = (s) => s.priority === 'Urgente';
const fechaDe = (s) => s.scheduled_start || s.created_at;

const horaDe = (s) => {
  const d = new Date(fechaDe(s));
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

const saludoPorHora = () => {
  const h = new Date().getHours();
  if (h < 12) return { texto: 'Buenos días', Icono: Sun };
  if (h < 19) return { texto: 'Buenas tardes', Icono: Sunset };
  return { texto: 'Buenas noches', Icono: Moon };
};

const abrirMapa = (s) => {
  const coords = s.coordinates || s.coordenadas;
  const destino = (coords && String(coords).trim() && String(coords).trim() !== 'null') ? coords : s.address;
  if (!destino) return;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(destino).trim())}`, '_blank');
};

const VistaInicioTecnico = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [servicios, setServicios] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const cargar = async () => {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [resServicios, resCotizaciones] = await Promise.allSettled([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/tecnico/${user.id}/servicios`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones`, { headers })
      ]);

      if (resServicios.status === 'fulfilled' && Array.isArray(resServicios.value.data)) {
        setServicios(resServicios.value.data.filter(s => s.status !== 'Rechazado' && s.status !== 'Cancelado'));
      }

      if (resCotizaciones.status === 'fulfilled') {
        const data = resCotizaciones.value.data;
        const lista = Array.isArray(data) ? data : (data?.quotes || data?.data || []);
        // Mismo criterio que la vista de Cotizaciones: propuestas hechas por este técnico
        setCotizaciones(lista.filter(c =>
          c.created_by_role === 'Técnico' &&
          (c.tecnico_user_id == user.id || c.tecnico_id == user.id || c.user_id == user.id)
        ));
      }

      setCargando(false);
    };

    cargar();
  }, [user?.id]);

  // ── Cálculos del resumen ──
  const hoyStr = getDayStr(new Date());
  const pendientes = servicios.filter(s => !esFinalizado(s));

  const trabajosHoy = pendientes
    .filter(s => getDayStr(fechaDe(s)) === hoyStr || esUrgente(s))
    .sort((a, b) => (esUrgente(b) - esUrgente(a)) || (new Date(fechaDe(a)) - new Date(fechaDe(b))));
  const atrasados = pendientes.filter(s => getDayStr(fechaDe(s)) < hoyStr && !esUrgente(s));
  const sosHoy = trabajosHoy.filter(esUrgente).length;
  const finalizadosHoy = servicios.filter(s => esFinalizado(s) && getDayStr(s.real_end || s.updated_at) === hoyStr).length;

  // Próximo trabajo: SOS primero; si no, el siguiente de hoy o el próximo programado
  const proximos = pendientes
    .filter(s => getDayStr(fechaDe(s)) >= hoyStr || esUrgente(s))
    .sort((a, b) => (esUrgente(b) - esUrgente(a)) || (new Date(fechaDe(a)) - new Date(fechaDe(b))));
  const proximo = proximos[0] || null;
  const proximoEsHoy = proximo && getDayStr(fechaDe(proximo)) === hoyStr;

  const levantamientosPendientes = pendientes.filter(s => s.es_levantamiento);
  const levantamientosSinIniciar = levantamientosPendientes.filter(s => !s.tiene_levantamiento).length;

  const cotizRechazadas = cotizaciones.filter(c => String(c.status || c.estado || '').toLowerCase().includes('rechaz')).length;
  const cotizRecotizar = cotizaciones.filter(c => String(c.status || c.estado || '').toLowerCase().includes('recotiza') || c.recotizacionSolicitada).length;
  const cotizPorAtender = cotizRechazadas + cotizRecotizar;

  const listaRutaConfirmada = localStorage.getItem(`materialRecibido_${user?.id}_${hoyStr}`) === 'true';
  const listaRutaPendiente = trabajosHoy.length > 0 && !listaRutaConfirmada;

  const { texto: saludo, Icono: IconoSaludo } = saludoPorHora();
  const nombre = user?.first_name || (user?.name ? user.name.split(' ')[0] : 'Técnico');
  const fechaLarga = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="vit-root">
      <Header activeModule="inicio" rolTexto="TÉCNICO INTERNO" />

      <main className="vit-main">
        {cargando ? (
          <CasaLoader texto="Preparando tu día..." />
        ) : (
          <>
            {/* ── SALUDO + ESTADO DEL DÍA ── */}
            <section className="vit-hero">
              <div className="vit-hero-text">
                <span className="vit-hero-date"><CalendarDays size={14} /> {fechaLarga}</span>
                <h1><IconoSaludo size={26} className="vit-hero-saludo-icon" /> {saludo}, {nombre}</h1>
                <p>
                  {trabajosHoy.length === 0
                    ? 'No tienes trabajos programados para hoy.'
                    : `Tienes ${trabajosHoy.length} ${trabajosHoy.length === 1 ? 'trabajo' : 'trabajos'} para hoy${sosHoy ? `, ${sosHoy} ${sosHoy === 1 ? 'es SOS' : 'son SOS'}` : ''}.`}
                </p>
              </div>

              <div className="vit-hero-stats">
                <div className="vit-hero-stat">
                  <strong>{trabajosHoy.length}</strong>
                  <span>Hoy</span>
                </div>
                <div className="vit-hero-stat">
                  <strong>{finalizadosHoy}</strong>
                  <span>Terminados</span>
                </div>
                <div className={`vit-hero-stat ${atrasados.length ? 'is-alert' : ''}`}>
                  <strong>{atrasados.length}</strong>
                  <span>Atrasados</span>
                </div>
              </div>

              {trabajosHoy.length > 0 && (
                <button
                  type="button"
                  className={`vit-route-chip ${listaRutaPendiente ? 'is-pending' : 'is-ready'}`}
                  onClick={() => navigate('/trabajos-tecnico')}
                >
                  {listaRutaPendiente ? <Package size={16} /> : <CheckCircle2 size={16} />}
                  <span>{listaRutaPendiente ? 'Confirma tu lista de ruta para empezar' : 'Lista de ruta confirmada'}</span>
                  {listaRutaPendiente && <ChevronRight size={16} />}
                </button>
              )}
            </section>

            <div className="vit-layout">
              {/* ── PRÓXIMO TRABAJO ── */}
              <section className="vit-panel vit-next">
                <div className="vit-panel-head">
                  <h2><Navigation size={16} /> Próximo trabajo</h2>
                  {proximo && esUrgente(proximo) && <span className="vit-sos-badge"><AlertTriangle size={12} /> SOS</span>}
                </div>

                {proximo ? (
                  <>
                    <div className="vit-next-time">
                      <span className="vit-next-hour">{horaDe(proximo)}</span>
                      <span className="vit-next-day">
                        {proximoEsHoy ? 'Hoy' : new Date(fechaDe(proximo)).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <h3 className="vit-next-title">{proximo.property_name || 'Sin nombre'}</h3>
                    <p className="vit-next-line"><MapPin size={14} /> {proximo.address || `Zona: ${proximo.zone || 'General'}`}</p>
                    {proximo.title && <p className="vit-next-line"><Wrench size={14} /> {proximo.title}</p>}

                    <div className="vit-next-actions">
                      <button type="button" className="vit-btn vit-btn-primary" onClick={() => navigate('/trabajos-tecnico')}>
                        <Wrench size={16} /> Ir a mis trabajos
                      </button>
                      {(proximo.address || proximo.coordinates || proximo.coordenadas) && (
                        <button type="button" className="vit-btn vit-btn-secondary" onClick={() => abrirMapa(proximo)}>
                          <MapPin size={16} /> Cómo llegar
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="vit-panel-empty">
                    <CheckCircle2 size={28} />
                    <strong>Todo al día</strong>
                    <span>No tienes trabajos pendientes por ahora.</span>
                  </div>
                )}
              </section>

              {/* ── ACCESOS CON CONTADORES ── */}
              <section className="vit-tiles">
                <button type="button" className="vit-tile" onClick={() => navigate('/trabajos-tecnico')}>
                  <span className="vit-tile-icon"><Wrench size={22} /></span>
                  <span className="vit-tile-body">
                    <span className="vit-tile-label">Trabajos</span>
                    <span className="vit-tile-sub">
                      {sosHoy ? `${sosHoy} SOS · ` : ''}{atrasados.length ? `${atrasados.length} atrasados` : 'Al corriente'}
                    </span>
                  </span>
                  <span className="vit-tile-count">{trabajosHoy.length}</span>
                </button>

                <button type="button" className="vit-tile" onClick={() => navigate('/trabajos-asignados')}>
                  <span className="vit-tile-icon"><ClipboardList size={22} /></span>
                  <span className="vit-tile-body">
                    <span className="vit-tile-label">Levantamientos</span>
                    <span className="vit-tile-sub">
                      {levantamientosPendientes.length
                        ? `${levantamientosSinIniciar} sin iniciar`
                        : 'Sin pendientes'}
                    </span>
                  </span>
                  <span className="vit-tile-count">{levantamientosPendientes.length}</span>
                </button>

                <button type="button" className="vit-tile" onClick={() => navigate('/vista-cotizaciones')}>
                  <span className="vit-tile-icon"><FileText size={22} /></span>
                  <span className="vit-tile-body">
                    <span className="vit-tile-label">Cotizaciones</span>
                    <span className="vit-tile-sub">
                      {cotizPorAtender
                        ? `${cotizRechazadas ? `${cotizRechazadas} rechazadas` : ''}${cotizRechazadas && cotizRecotizar ? ' · ' : ''}${cotizRecotizar ? `${cotizRecotizar} por recotizar` : ''}`
                        : `${cotizaciones.length} enviadas`}
                    </span>
                  </span>
                  <span className={`vit-tile-count ${cotizPorAtender ? 'is-alert' : ''}`}>
                    {cotizPorAtender || cotizaciones.length}
                  </span>
                </button>
              </section>

              {/* ── AGENDA DE HOY ── */}
              <section className="vit-panel vit-agenda">
                <div className="vit-panel-head">
                  <h2><Clock size={16} /> Agenda de hoy</h2>
                  {trabajosHoy.length > 0 && (
                    <button type="button" className="vit-link" onClick={() => navigate('/trabajos-tecnico')}>
                      Ver todo <ChevronRight size={14} />
                    </button>
                  )}
                </div>

                {trabajosHoy.length > 0 ? (
                  <ul className="vit-agenda-list">
                    {trabajosHoy.slice(0, 5).map(s => (
                      <li key={s.composite_id || s.id}>
                        <button type="button" className="vit-agenda-item" onClick={() => navigate('/trabajos-tecnico')}>
                          <span className="vit-agenda-hour">{horaDe(s)}</span>
                          <span className={`vit-agenda-dot ${esUrgente(s) ? 'is-sos' : ''} ${s.arrival_status === 'EN_SITIO' ? 'is-here' : ''}`} />
                          <span className="vit-agenda-info">
                            <strong>{s.property_name || 'Sin nombre'}</strong>
                            <span>
                              {esUrgente(s) ? 'SOS · ' : ''}
                              {s.es_levantamiento ? 'Levantamiento' : (s.title || 'Servicio')}
                              {s.arrival_status === 'EN_SITIO' ? ' · En el lugar' : ''}
                            </span>
                          </span>
                          <ChevronRight size={16} className="vit-agenda-chevron" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="vit-panel-empty">
                    <CalendarDays size={28} />
                    <strong>Agenda libre</strong>
                    <span>No hay visitas programadas para hoy.</span>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default VistaInicioTecnico;
