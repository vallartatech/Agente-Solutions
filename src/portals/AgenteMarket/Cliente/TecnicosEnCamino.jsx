// Red: técnicos que van en camino a los trabajos del cliente (de "Iniciar ruta" a "Llegué al lugar").
// - useTecnicosEnCamino: consulta cada 15 s mientras la pantalla está visible.
// - MarcadorTecnicoEnCamino: pin del técnico que se desliza a su nueva posición + línea a la propiedad.
// - TarjetasTecnicosEnCamino: aviso "inició tu trabajo" + tarjeta con barra de progreso (estilo DiDi);
//   al tocarla abre el detalle del trabajo.
import { useEffect, useRef, useState } from 'react';
import { Marker, Polyline } from '@react-google-maps/api';
import { ChevronRight, WifiOff, HardHat, House, BellRing, X } from 'lucide-react';
import { obtenerTecnicosEnCamino, minutosEstimados, distanciaMetros } from '../Shared/seguimientoTecnicoApi';
import '../../../styles/AgenteMarket/Cliente/TecnicosEnCamino.css';

const CONSULTAR_CADA_MS = 15000;
const SIN_SENAL_S = 90; // más de esto sin datos: se avisa "última ubicación hace X min"

export const useTecnicosEnCamino = (activo = true) => {
  const [lista, setLista] = useState([]);
  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    const consultar = () => {
      if (document.visibilityState !== 'visible') return;
      obtenerTecnicosEnCamino()
        .then((datos) => { if (vivo) setLista(datos); })
        .catch(() => { /* sin señal: se conserva lo último */ });
    };
    consultar();
    const intervalo = setInterval(consultar, CONSULTAR_CADA_MS);
    document.addEventListener('visibilitychange', consultar);
    return () => {
      vivo = false;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', consultar);
    };
  }, [activo]);
  return lista;
};

/** Destino del técnico: la propiedad con coordenadas reales o, si no tiene, el punto del trabajo en el mapa. */
export const destinoDe = (item, trabajo) =>
  item.destino || (trabajo?.lat && trabajo?.lng ? { lat: Number(trabajo.lat), lng: Number(trabajo.lng) } : null);

// Íconos del mapa: trazos de lucide (HardHat y House) dentro de un círculo, sin emojis
const TRAZO_CASCO = '<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M14 6a6 6 0 0 1 6 6v3"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><rect x="2" y="15" width="20" height="4" rx="1"/>';
const TRAZO_CASA = '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';

const iconoCircular = (trazo, fondo, tam) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 48 48">`
    + `<circle cx="24" cy="24" r="21" fill="${fondo}" stroke="#ffffff" stroke-width="3"/>`
    + `<g transform="translate(12 12)" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${trazo}</g>`
    + '</svg>';
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
const ICONO_TECNICO = iconoCircular(TRAZO_CASCO, '#f26522', 46);
const ICONO_PROPIEDAD = iconoCircular(TRAZO_CASA, '#0f172a', 40);

// Desliza el pin de la posición anterior a la nueva (en vez de saltar)
const usePosicionSuave = (objetivo) => {
  const [pos, setPos] = useState(objetivo);
  const desde = useRef(objetivo);
  useEffect(() => {
    if (!objetivo) return undefined;
    const inicio = desde.current || objetivo;
    if (inicio.lat === objetivo.lat && inicio.lng === objetivo.lng) { setPos(objetivo); return undefined; }
    const t0 = performance.now();
    const DURACION = 1200;
    let cuadro;
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / DURACION);
      const e = 1 - (1 - k) ** 3;
      const actual = { lat: inicio.lat + (objetivo.lat - inicio.lat) * e, lng: inicio.lng + (objetivo.lng - inicio.lng) * e };
      desde.current = actual;
      setPos(actual);
      if (k < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [objetivo?.lat, objetivo?.lng]);
  return pos;
};

export const MarcadorTecnicoEnCamino = ({ item, destino }) => {
  const pos = usePosicionSuave(item.ubicacion);
  const g = window.google?.maps;
  if (!pos || !g) return null;
  return (
    <>
      {destino && (
        <Polyline
          path={[pos, destino]}
          options={{
            strokeOpacity: 0,
            icons: [{
              icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeColor: '#f26522', scale: 3 },
              offset: '0',
              repeat: '14px',
            }],
            clickable: false,
          }}
        />
      )}
      {/* Propiedad: casita */}
      {destino && (
        <Marker
          position={destino}
          title={item.propiedad || 'Tu propiedad'}
          icon={{ url: ICONO_PROPIEDAD, scaledSize: new g.Size(40, 40), anchor: new g.Point(20, 20) }}
          zIndex={997}
        />
      )}
      {/* Halo naranja bajo el técnico */}
      <Marker
        position={pos}
        clickable={false}
        icon={{ path: g.SymbolPath.CIRCLE, scale: 30, fillColor: '#f26522', fillOpacity: 0.16, strokeOpacity: 0 }}
        zIndex={998}
      />
      {/* Técnico: casco */}
      <Marker
        position={pos}
        title={`${item.tecnico?.nombre || 'Técnico'} va en camino`}
        icon={{ url: ICONO_TECNICO, scaledSize: new g.Size(46, 46), anchor: new g.Point(23, 23) }}
        zIndex={999}
      />
    </>
  );
};

const haceTexto = (s) => {
  const min = Math.round(s / 60);
  return min < 1 ? 'hace un momento' : `hace ${min} min`;
};

const inicial = (nombre) => String(nombre || 'T').trim().charAt(0).toUpperCase();

// Distancia con la que empezó cada recorrido (para la barra de progreso). Se guarda por dispositivo.
const CLAVE_INICIO = 'agente_seguimiento_inicio';
const DOCE_HORAS_MS = 12 * 60 * 60 * 1000;
const leerInicios = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE_INICIO) || '{}') || {}; } catch { return {}; }
};

// Avisos de "inició tu trabajo" que el cliente ya vio (una vez por recorrido)
const CLAVE_AVISADOS = 'agente_seguimiento_avisados';
const leerAvisados = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE_AVISADOS) || '{}') || {}; } catch { return {}; }
};

const textoDistancia = (m) => (m == null ? '' : m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

// avisos: otros avisos del mapa que van en la misma pila (p. ej. una recotización)
export const TarjetasTecnicosEnCamino = ({ lista, trabajos, onAbrir, avisos = [] }) => {
  // Distancia inicial de cada recorrido: la mayor que se haya visto (si el cliente abre a medio camino, se ajusta)
  const [inicios, setInicios] = useState(leerInicios);
  useEffect(() => {
    if (!lista.length) return;
    setInicios((prev) => {
      const ahora = Date.now();
      const nuevo = {};
      Object.entries(prev).forEach(([id, v]) => { if (v && ahora - v.t < DOCE_HORAS_MS) nuevo[id] = v; });
      let cambio = Object.keys(nuevo).length !== Object.keys(prev).length;
      lista.forEach((item) => {
        const trabajo = trabajos.find((t) => Number(t.id) === Number(item.work_order_id));
        const m = distanciaMetros(item.ubicacion, destinoDe(item, trabajo));
        if (m == null) return;
        const id = String(item.work_order_id);
        if (!nuevo[id] || m > nuevo[id].m) { nuevo[id] = { m, t: nuevo[id]?.t || ahora }; cambio = true; }
      });
      if (!cambio) return prev;
      try { localStorage.setItem(CLAVE_INICIO, JSON.stringify(nuevo)); } catch { /* sin almacenamiento */ }
      return nuevo;
    });
  }, [lista, trabajos]);

  // Aviso en el mapa cuando un técnico acaba de iniciar el trabajo (sale una vez por recorrido)
  const [avisados, setAvisados] = useState(leerAvisados);
  const marcarAvisado = (id) => {
    setAvisados((prev) => {
      const ahora = Date.now();
      const nuevo = { ...prev, [id]: ahora };
      Object.keys(nuevo).forEach((k) => { if (ahora - nuevo[k] > DOCE_HORAS_MS) delete nuevo[k]; });
      try { localStorage.setItem(CLAVE_AVISADOS, JSON.stringify(nuevo)); } catch { /* sin almacenamiento */ }
      return nuevo;
    });
  };
  const porAvisar = lista.find((item) => !avisados[String(item.work_order_id)]);
  useEffect(() => {
    if (!porAvisar) return undefined;
    const t = setTimeout(() => marcarAvisado(String(porAvisar.work_order_id)), 9000);
    return () => clearTimeout(t);
  }, [porAvisar?.work_order_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lista.length && !avisos.length) return null;
  return (
    <div className="tec-camino-pila">
      {avisos}
      {porAvisar && (
        <div className="tec-camino-aviso" role="status">
          <span className="tec-camino-aviso-icono"><BellRing size={16} strokeWidth={2.4} /></span>
          <span className="tec-camino-aviso-txt">
            <strong>{porAvisar.tecnico?.nombre || 'Tu técnico'} inició tu trabajo</strong>
            <small>Ya va en camino{porAvisar.propiedad ? ` a ${porAvisar.propiedad}` : ''}. Abajo ves cómo avanza.</small>
          </span>
          <button
            type="button"
            className="tec-camino-aviso-cerrar"
            onClick={() => marcarAvisado(String(porAvisar.work_order_id))}
            aria-label="Ocultar aviso"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {lista.map((item) => {
        const trabajo = trabajos.find((t) => Number(t.id) === Number(item.work_order_id));
        const destino = destinoDe(item, trabajo);
        const minutos = minutosEstimados(item.ubicacion, destino);
        const restante = distanciaMetros(item.ubicacion, destino);
        const inicio = inicios[String(item.work_order_id)]?.m;
        // Casi 0 al iniciar y casi 1 al llegar (se completa cuando el técnico marca "Llegué")
        const progreso = restante != null && inicio
          ? Math.min(0.96, Math.max(0.04, 1 - restante / inicio))
          : 0.04;
        const casiLlega = restante != null && restante < 250;
        const sinSenal = item.actualizado_hace_s > SIN_SENAL_S;
        const nombre = item.tecnico?.nombre || 'Tu técnico';
        return (
          <button
            key={item.work_order_id}
            type="button"
            className="tec-camino-tarjeta"
            onClick={() => onAbrir(item, trabajo)}
            aria-label={`${nombre} va en camino. Ver detalle del trabajo`}
          >
            <span className="tec-camino-fila">
              <span className="tec-camino-avatar">
                {item.tecnico?.foto ? <img src={item.tecnico.foto} alt="" /> : inicial(nombre)}
                <i className="tec-camino-pulso" aria-hidden="true" />
              </span>
              <span className="tec-camino-texto">
                <strong>{casiLlega ? `${nombre} está por llegar` : `${nombre} va en camino`}</strong>
                <small>{item.titulo}{item.propiedad ? ` · ${item.propiedad}` : ''}</small>
              </span>
              {minutos != null && (
                <span className="tec-camino-eta">
                  <em>Llega en</em>
                  <span><b>{minutos}</b> min</span>
                </span>
              )}
              <ChevronRight size={18} className="tec-camino-flecha" />
            </span>

            {/* Barra de progreso: el casco avanza hacia la casa */}
            <span className="tec-camino-progreso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progreso * 100)}>
              <span className="tec-camino-riel">
                <span className="tec-camino-relleno" style={{ width: `${progreso * 100}%` }} />
                <span className="tec-camino-casco" style={{ left: `${progreso * 100}%` }}>
                  <HardHat size={13} strokeWidth={2.4} />
                </span>
                <span className="tec-camino-casa"><House size={12} strokeWidth={2.4} /></span>
              </span>
              <span className="tec-camino-etapas">
                <span>Inició</span>
                <span className="tec-camino-restante">
                  {sinSenal
                    ? <><WifiOff size={11} /> Última ubicación {haceTexto(item.actualizado_hace_s)}</>
                    : (restante != null ? `Faltan ${textoDistancia(restante)}` : 'En camino')}
                </span>
                <span>Llegada</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
