import { useMemo, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutGrid, FileText, History, MapPin, Tag, Phone, Mail, UserRound, HardHat,
  CalendarClock, CalendarCheck, AlertTriangle, ExternalLink, ImageOff, Building2, Wrench, ShoppingCart
} from 'lucide-react';
import Header from '../../../../components/Shared/Header';
import CasaLoader from '../../../../components/Shared/CasaLoader';
import useExpediente from './useExpediente';
import { Chip, FlujoBarra, ListaCotizaciones, LineaTiempo, VisorFotos } from './ExpedienteUI';
import { API, authHeaders, etiquetaEstado, etiquetaTipo, fechaHora, visitaLocal, construirHistorial } from './flujoTrabajo';
import EquiposDelTrabajo from '../Mantenimiento/EquiposDelTrabajo';
import CarritoCotizaciones from '../Mantenimiento/CarritoCotizaciones';
import { AccesoQRAdmin } from '../../Shared/AccesoQR';
import ModalCotizacion from './ModalCotizacion';
import { useAuth } from '../../../../context/AuthContext';
import { esRed } from '../../../../utils/entorno';
import '../../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';

const TABS = [
  { key: 'datos', label: 'Datos', Icon: LayoutGrid },
  { key: 'cotizaciones', label: 'Cotizaciones', Icon: FileText },
  { key: 'historial', label: 'Historial', Icon: History },
];

const Contacto = ({ nombre, rol, telefono, email, foto, Icono }) => (
  <div className="xp-contacto">
    <span className="xp-contacto-avatar">
      {foto ? <img src={foto} alt="" /> : <Icono size={20} />}
    </span>
    <div className="xp-contacto-texto">
      <strong>{nombre || 'Sin registrar'}</strong>
      <small>{rol}</small>
      <div className="xp-contacto-links">
        {telefono ? <a href={`tel:${telefono}`}><Phone size={13} /> {telefono}</a> : <span><Phone size={13} /> Sin teléfono</span>}
        {email ? <a href={`mailto:${email}`}><Mail size={13} /> {email}</a> : <span><Mail size={13} /> Sin correo</span>}
      </div>
    </div>
  </div>
);

const VistaTrabajoPropiedad = () => {
  const { id, uid } = useParams();
  // La red ve este mismo detalle, sin el QR de acceso (herramienta interna)
  const { user } = useAuth();
  const enRed = esRed(user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'datos';
  const { data, cargando, error, recargar } = useExpediente(id);

  const trabajo = data?.trabajos?.find((t) => t.uid === uid);
  const historial = useMemo(() => (trabajo ? construirHistorial(trabajo).reverse() : []), [trabajo]);
  // Índice de la foto abierta en el visor (null = cerrado)
  const [fotoAbierta, setFotoAbierta] = useState(null);
  const cerrarVisor = useCallback(() => setFotoAbierta(null), []);
  const [cotAbierta, setCotAbierta] = useState(null);
  const cerrarCotizacion = useCallback(() => setCotAbierta(null), []);

  // Equipos elegidos en la solicitud (mantenimiento de varios equipos en una sola orden)
  const ordenId = trabajo?.kind === 'trabajo' ? trabajo.id : null;
  const [equipos, setEquipos] = useState([]);
  const [versionEquipos, setVersionEquipos] = useState(0);
  useEffect(() => {
    if (!ordenId) { setEquipos([]); return undefined; }
    let vigente = true;
    axios.get(`${API}/work-orders/${ordenId}/elementos`, { headers: authHeaders() })
      .then(({ data }) => { if (vigente) setEquipos(Array.isArray(data) ? data : []); })
      .catch(() => { if (vigente) setEquipos([]); });
    return () => { vigente = false; };
  }, [ordenId, versionEquipos]);

  // Tras finalizar el carrito cambian los estados de las cotizaciones y de los equipos
  const alCambiarCarrito = useCallback(() => {
    recargar(true);
    setVersionEquipos((v) => v + 1);
  }, [recargar]);

  const headerTabs = TABS.map((t) => ({
    ...t,
    active: tab === t.key,
    onClick: () => setSearchParams(t.key === 'datos' ? {} : { tab: t.key }, { replace: true }),
  }));
  const header = (
    <Header
      activeModule="propiedades"
      titulo="DETALLE TRABAJO"
      navTabs={headerTabs}
      navBack={{ label: 'Propiedad', onClick: () => navigate(`/detalle-propiedad/${id}`) }}
    />
  );

  if (cargando) return <div className="xp-page">{header}<CasaLoader texto="Cargando trabajo..." /></div>;
  if (error || !trabajo) {
    return <div className="xp-page">{header}<p className="xp-vacio">{error || 'No se encontró este trabajo en la propiedad.'}</p></div>;
  }

  const { propiedad, encargado } = data;
  const estado = etiquetaEstado(trabajo);
  const coords = propiedad.coordinates;

  return (
    <div className="xp-page">
      {header}

      <main className="xp-container">
        <div className="xp-tabs-movil">
          {headerTabs.map(({ key, label, Icon, active, onClick }) => (
            <button key={key} type="button" className={active ? 'on' : ''} onClick={onClick}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Encabezado del trabajo + barra de flujo */}
        <section className="xp-card xp-trabajo-head">
          <div className="xp-trabajo-head-top">
            <div>
              <div className="xp-chips">
                <Chip tono="slate">{etiquetaTipo(trabajo.kind)}</Chip>
                <Chip tono={estado.tono}>{estado.texto}</Chip>
                {String(trabajo.prioridad).toLowerCase() === 'urgente' && <Chip tono="red"><AlertTriangle size={12} /> SOS</Chip>}
              </div>
              <h1>{trabajo.titulo}</h1>
              <p className="xp-trabajo-head-prop"><Building2 size={14} /> {propiedad.property_name || propiedad.nombre_propiedad || propiedad.address}</p>
            </div>
            <div className="xp-trabajo-fechas">
              <span><CalendarClock size={14} /> Solicitado: <strong>{fechaHora(trabajo.created_at) || '—'}</strong></span>
              <span><CalendarCheck size={14} /> Visita: <strong>{fechaHora(visitaLocal(trabajo.scheduled_at)) || 'Sin programar'}</strong></span>
              {/* Lleva al tablero de Servicios con la orden de trabajo ya abierta */}
              {!enRed && trabajo.kind === 'trabajo' && trabajo.id && (
                <button
                  type="button"
                  className="xp-btn-glass xp-btn-servicio"
                  onClick={() => navigate(`/tablero-servicios?jobId=${trabajo.id}`)}
                >
                  <Wrench size={16} /> Ver en Servicios
                </button>
              )}
            </div>
          </div>
          <FlujoBarra trabajo={trabajo} />
        </section>

        {tab === 'datos' && (
          <div className="xp-detalle-grid">
            <div className="xp-columna">
            <section className="xp-card xp-panel">
              <h3 className="xp-panel-titulo"><FileText size={18} /> Detalle de la solicitud</h3>
              <dl className="xp-datos">
                <div><dt>Tipo</dt><dd>{trabajo.tipo || etiquetaTipo(trabajo.kind)}</dd></div>
                <div><dt>Prioridad</dt><dd>{trabajo.prioridad || 'Normal'}</dd></div>
                <div><dt>Estado en sistema</dt><dd>{trabajo.status || '—'}</dd></div>
                <div><dt>Folio interno</dt><dd>{trabajo.uid.toUpperCase()}</dd></div>
              </dl>
              {equipos.length > 0 && <EquiposDelTrabajo equipos={equipos} />}
              <h4 className="xp-subtitulo">Descripción</h4>
              <p className="xp-descripcion">{trabajo.descripcion || 'Sin descripción.'}</p>
              <h4 className="xp-subtitulo">Imágenes de la solicitud</h4>
              {trabajo.fotos.length ? (
                <div className="xp-galeria">
                  {trabajo.fotos.map((f, i) => (
                    <button key={i} type="button" className="xp-galeria-item" onClick={() => setFotoAbierta(i)} aria-label={`Ver evidencia ${i + 1}`}>
                      <img src={f} alt={`Evidencia ${i + 1}`} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="xp-vacio xp-vacio-inline"><ImageOff size={16} /> No se adjuntaron imágenes.</p>
              )}
            </section>

              {/* Personas: lado a lado bajo el detalle para equilibrar las dos columnas */}
              <div className="xp-contactos-grid">
                <section className="xp-card xp-panel">
                  <h3 className="xp-panel-titulo"><HardHat size={18} /> Técnico asignado</h3>
                  {trabajo.tecnicos.length ? (
                    trabajo.tecnicos.map((t) => (
                      <Contacto key={t.id} nombre={t.nombre} rol="Técnico" telefono={t.telefono} email={t.email} foto={t.foto} Icono={HardHat} />
                    ))
                  ) : (
                    <p className="xp-vacio xp-vacio-inline">Aún no hay técnico asignado.</p>
                  )}
                </section>

                <section className="xp-card xp-panel">
                  <h3 className="xp-panel-titulo"><UserRound size={18} /> Encargado de la propiedad</h3>
                  <Contacto
                    nombre={encargado?.name}
                    rol="Responsable"
                    telefono={encargado?.phone}
                    email={encargado?.email}
                    foto={encargado?.profile_picture}
                    Icono={UserRound}
                  />
                </section>
              </div>
            </div>

            <div className="xp-columna">
              {!enRed && <AccesoQRAdmin tipo={trabajo.kind === 'trabajo' ? 'work_order' : 'servicio'} id={trabajo.id} />}

              <section className="xp-card xp-panel">
                <h3 className="xp-panel-titulo"><MapPin size={18} /> Lugar</h3>
                <p className="xp-lugar-nombre">{propiedad.property_name || propiedad.nombre_propiedad || 'Propiedad'}</p>
                <p className="xp-lugar-linea"><MapPin size={14} /> {propiedad.address || 'Sin dirección'}</p>
                <p className="xp-lugar-linea"><Tag size={14} /> CURP: <strong>{propiedad.custom_curp || 'S/N'}</strong></p>
                {coords ? (
                  <>
                    <iframe
                      className="xp-mapa"
                      title="Ubicación de la propiedad"
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(coords)}&z=16&output=embed`}
                    />
                    <a className="xp-link" href={`https://maps.google.com/?q=${encodeURIComponent(coords)}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} /> Abrir en Google Maps
                    </a>
                  </>
                ) : (
                  <p className="xp-vacio xp-vacio-inline">Sin coordenadas registradas.</p>
                )}
              </section>
            </div>
          </div>
        )}

        {tab === 'cotizaciones' && (
          <section className="xp-card xp-panel">
            {equipos.length >= 2 && (
              <>
                <h3 className="xp-panel-titulo"><ShoppingCart size={18} /> Carrito por equipo</h3>
                <CarritoCotizaciones
                  ordenId={trabajo.id}
                  onVer={(cotId) => setCotAbierta(trabajo.cotizaciones.find((c) => String(c.id) === String(cotId)) || null)}
                  onCambio={alCambiarCarrito}
                />
              </>
            )}
            <h3 className="xp-panel-titulo"><FileText size={18} /> Cotizaciones de este trabajo</h3>
            <ListaCotizaciones
              cotizaciones={trabajo.cotizaciones}
              equipos={equipos}
              onAbrir={setCotAbierta}
              vacio="Este trabajo todavía no tiene cotizaciones."
            />
          </section>
        )}

        {tab === 'historial' && (
          <section className="xp-card xp-panel">
            <h3 className="xp-panel-titulo"><History size={18} /> Historial de este trabajo</h3>
            <LineaTiempo eventos={historial} />
          </section>
        )}
      </main>

      {cotAbierta && (
        <ModalCotizacion cotizacion={cotAbierta} trabajo={trabajo} onClose={cerrarCotizacion} />
      )}

      {fotoAbierta !== null && (
        <VisorFotos fotos={trabajo.fotos} inicio={fotoAbierta} onClose={cerrarVisor} />
      )}
    </div>
  );
};

export default VistaTrabajoPropiedad;
