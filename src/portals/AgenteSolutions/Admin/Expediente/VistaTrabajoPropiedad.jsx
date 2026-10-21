import React, { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutGrid, FileText, History, MapPin, Tag, Phone, Mail, UserRound, HardHat,
  CalendarClock, CalendarCheck, AlertTriangle, ExternalLink, ImageOff, Building2
} from 'lucide-react';
import Header from '../../../../components/Shared/Header';
import CasaLoader from '../../../../components/Shared/CasaLoader';
import useExpediente from './useExpediente';
import { Chip, FlujoBarra, ListaCotizaciones, LineaTiempo } from './ExpedienteUI';
import { etiquetaEstado, etiquetaTipo, fechaHora, construirHistorial } from './flujoTrabajo';
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'datos';
  const { data, cargando, error } = useExpediente(id);

  const trabajo = data?.trabajos?.find((t) => t.uid === uid);
  const historial = useMemo(() => (trabajo ? construirHistorial(trabajo).reverse() : []), [trabajo]);

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
              <span><CalendarCheck size={14} /> Visita: <strong>{fechaHora(trabajo.scheduled_at) || 'Sin programar'}</strong></span>
            </div>
          </div>
          <FlujoBarra trabajo={trabajo} />
        </section>

        {tab === 'datos' && (
          <div className="xp-detalle-grid">
            <section className="xp-card xp-panel">
              <h3 className="xp-panel-titulo"><FileText size={18} /> Detalle de la solicitud</h3>
              <dl className="xp-datos">
                <div><dt>Tipo</dt><dd>{trabajo.tipo || etiquetaTipo(trabajo.kind)}</dd></div>
                <div><dt>Prioridad</dt><dd>{trabajo.prioridad || 'Normal'}</dd></div>
                <div><dt>Estado en sistema</dt><dd>{trabajo.status || '—'}</dd></div>
                <div><dt>Folio interno</dt><dd>{trabajo.uid.toUpperCase()}</dd></div>
              </dl>
              <h4 className="xp-subtitulo">Descripción</h4>
              <p className="xp-descripcion">{trabajo.descripcion || 'Sin descripción.'}</p>
              <h4 className="xp-subtitulo">Imágenes de la solicitud</h4>
              {trabajo.fotos.length ? (
                <div className="xp-galeria">
                  {trabajo.fotos.map((f, i) => (
                    <a key={i} href={f} target="_blank" rel="noopener noreferrer"><img src={f} alt={`Evidencia ${i + 1}`} /></a>
                  ))}
                </div>
              ) : (
                <p className="xp-vacio xp-vacio-inline"><ImageOff size={16} /> No se adjuntaron imágenes.</p>
              )}
            </section>

            <div className="xp-columna">
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
        )}

        {tab === 'cotizaciones' && (
          <section className="xp-card xp-panel">
            <h3 className="xp-panel-titulo"><FileText size={18} /> Cotizaciones de este trabajo</h3>
            <ListaCotizaciones
              cotizaciones={trabajo.cotizaciones}
              onAbrir={(c) => navigate(`/vista-cotizaciones?quote_id=${c.id}`)}
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
    </div>
  );
};

export default VistaTrabajoPropiedad;
