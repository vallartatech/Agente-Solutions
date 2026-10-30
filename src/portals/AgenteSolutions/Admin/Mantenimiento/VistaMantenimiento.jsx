import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  Building2, CalendarClock, CheckCircle2, ClipboardList, FileText, Hammer, Package, Search, Users, X,
} from 'lucide-react';
import Header from '../../../../components/Shared/Header';
import CasaLoader from '../../../../components/Shared/CasaLoader';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import GruposEquipos, { SelectorVeces } from './GruposEquipos';
import PanelMantenimiento from './PanelMantenimiento';
import { grupoCompleto, grupoVacio, textoFechas } from './cicloMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const VECES_INICIAL = 2;
const MAX_RESULTADOS = 8;

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const etiquetaGrupo = (g) => (Number(g.cantidad) > 1 ? `${g.cantidad} × ${String(g.tipo).trim()}` : String(g.tipo).trim());
const aviso = (icon, title, text) => Swal.fire({ icon, title, text, confirmButtonColor: '#f26522' });
const mensajeError = (error) => error.response?.data?.error || error.response?.data?.message || 'Intenta de nuevo.';

// Mantenimiento de Agente Solutions: se elige la propiedad, sus elementos salen del levantamiento
// y lo que no esté registrado se agrega a mano. Desde aquí se programan ciclos y se crean trabajos.
const VistaMantenimiento = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const propiedadId = searchParams.get('propiedad');

  const [propiedades, setPropiedades] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [datos, setDatos] = useState(null);
  const [marcados, setMarcados] = useState({}); // id de elemento → veces al año
  const [capturados, setCapturados] = useState({}); // id de grupo ya registrado → veces al año
  const [nuevos, setNuevos] = useState([]);
  const [fechaBase, setFechaBase] = useState(hoyISO());
  const [panelVersion, setPanelVersion] = useState(0);

  const [programar, setProgramar] = useState(true);
  const [crearTrabajo, setCrearTrabajo] = useState(false);
  const [trabajo, setTrabajo] = useState({ tipo: 'Mantenimiento', descripcion: '', fecha: hoyISO(), hora: '' });
  const [tecnicos, setTecnicos] = useState([]);
  const [tecnicoIds, setTecnicoIds] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    axios.get(`${API}/mantenimiento/propiedades`, { headers: authHeaders() })
      .then(({ data }) => setPropiedades(data || []))
      .catch(() => aviso('error', 'No se pudieron cargar las propiedades', 'Recarga la página para intentarlo de nuevo.'))
      .finally(() => setCargandoLista(false));

    axios.get(`${API}/usuarios`, { headers: authHeaders() })
      .then(({ data }) => setTecnicos((data || [])
        .filter((u) => [1, 2].includes(Number(u.role_id)))
        .map((u) => ({ ...u, id: String(u.id).replace(/^u_/, '') }))
        .sort((a, b) => Number(b.role_id) - Number(a.role_id))))
      .catch(() => setTecnicos([]));
  }, []);

  const cargarPropiedad = useCallback(() => {
    if (!propiedadId) {
      setDatos(null);
      return;
    }
    setDatos(null);
    setMarcados({});
    setCapturados({});
    setNuevos([]);
    setTecnicoIds([]);
    axios.get(`${API}/mantenimiento/formulario`, { params: { property_id: propiedadId }, headers: authHeaders() })
      .then(({ data }) => {
        setDatos(data);
        setFechaBase(data.fecha_base);
        // Sin levantamiento: el formulario manual ya queda abierto
        if (!data.elementos.length && !data.grupos.length) setNuevos([grupoVacio()]);
      })
      .catch((error) => {
        aviso('error', 'No se pudo abrir la propiedad', mensajeError(error));
        setSearchParams({}, { replace: true });
      });
  }, [propiedadId, setSearchParams]);

  useEffect(() => { cargarPropiedad(); }, [cargarPropiedad]);

  const resultados = useMemo(() => {
    const texto = normalizar(busqueda);
    return propiedades
      .filter((p) => !texto || normalizar(`${p.property_name} ${p.address}`).includes(texto))
      .slice(0, MAX_RESULTADOS);
  }, [propiedades, busqueda]);

  const porZona = useMemo(() => (datos?.elementos || []).reduce((acc, e) => {
    (acc[e.area] = acc[e.area] || []).push(e);
    return acc;
  }, {}), [datos]);

  const alternar = (setter, id, inicial) => setter((prev) => {
    const copia = { ...prev };
    if (id in copia) delete copia[id];
    else copia[id] = inicial || VECES_INICIAL;
    return copia;
  });

  const toggleTecnico = (id) => setTecnicoIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  // El ciclo se cuenta desde el trabajo cuando se crea uno
  const base = crearTrabajo ? trabajo.fecha : fechaBase;
  const totalEquipos = Object.keys(marcados).length + Object.keys(capturados).length + nuevos.length;

  const validar = () => {
    if (!programar && !crearTrabajo) return 'Elige si quieres programar el mantenimiento, crear un trabajo o ambos.';
    if (!totalEquipos) return 'Marca al menos un equipo o agrega uno a mano.';
    if (nuevos.some((g) => !grupoCompleto(g))) return 'Cada grupo necesita tipo, cantidad, foto del equipo y tarjeta de datos.';
    if (!base) return 'Indica la fecha.';
    if (crearTrabajo && !trabajo.descripcion.trim()) return 'Describe el trabajo.';
    if (crearTrabajo && !trabajo.hora) return 'Indica la hora de la visita para que aparezca en el calendario.';
    return null;
  };

  const guardarCiclos = async () => {
    const fd = new FormData();
    fd.append('property_id', datos.property_id);
    fd.append('fecha_base', base);

    let i = 0;
    Object.entries(marcados).forEach(([id, veces]) => {
      fd.append(`items[${i}][property_component_id]`, id);
      fd.append(`items[${i}][veces_al_ano]`, veces);
      i += 1;
    });
    Object.entries(capturados).forEach(([id, veces]) => {
      fd.append(`items[${i}][id]`, id);
      fd.append(`items[${i}][veces_al_ano]`, veces);
      i += 1;
    });
    nuevos.forEach((g) => {
      fd.append(`items[${i}][tipo]`, g.tipo.trim());
      fd.append(`items[${i}][cantidad]`, g.cantidad);
      fd.append(`items[${i}][veces_al_ano]`, g.veces_al_ano);
      if (g.detalle.trim()) fd.append(`items[${i}][detalle]`, g.detalle.trim());
      fd.append(`items[${i}][foto_equipo]`, g.foto_equipo);
      fd.append(`items[${i}][foto_datos]`, g.foto_datos);
      i += 1;
    });

    const { data } = await axios.post(`${API}/mantenimiento`, fd, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
    return data.equipos.map((e) => e.id);
  };

  const guardarTrabajo = async (equipoIds) => {
    const elegidos = datos.elementos.filter((e) => e.id in marcados);
    const capturadosElegidos = datos.grupos.filter((g) => g.id in capturados);
    const etiquetas = [
      ...elegidos.map((e) => e.label),
      ...capturadosElegidos.map(etiquetaGrupo),
      ...nuevos.map(etiquetaGrupo),
    ].join(', ');

    const fd = new FormData();
    fd.append('property_id', datos.property_id);
    fd.append('type', trabajo.tipo);
    fd.append('zone', totalEquipos === 1 && elegidos.length === 1 ? elegidos[0].area : 'Varias zonas');
    fd.append('equipment', etiquetas.length > 150 ? `${etiquetas.slice(0, 149)}…` : etiquetas);
    fd.append('description', `${trabajo.descripcion.trim()}\n\n[EQUIPO AFECTADO]: ${etiquetas}`);
    if (tecnicoIds[0]) fd.append('tecnico_id', tecnicoIds[0]);

    if (equipoIds) {
      // Ya quedaron guardados al programarlos: el trabajo los usa tal cual
      equipoIds.forEach((id) => fd.append('equipo_ids[]', id));
    } else {
      elegidos.forEach((e) => fd.append('component_ids[]', e.id));
      capturadosElegidos.forEach((g) => fd.append('equipo_ids[]', g.id));
      nuevos.forEach((g, i) => {
        fd.append(`grupos[${i}][tipo]`, g.tipo.trim());
        fd.append(`grupos[${i}][cantidad]`, g.cantidad);
        if (g.detalle.trim()) fd.append(`grupos[${i}][detalle]`, g.detalle.trim());
        fd.append(`grupos[${i}][foto_equipo]`, g.foto_equipo);
        fd.append(`grupos[${i}][foto_datos]`, g.foto_datos);
      });
    }

    const { data } = await axios.post(`${API}/work-orders/cliente`, fd, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
    // Cuadrilla y visita en una sola llamada, igual que en Nueva solicitud
    await axios.put(`${API}/work-orders/${data.id}/assign`, {
      ...(tecnicoIds.length && { tecnicos_ids: tecnicoIds.map(Number) }),
      scheduled_at: `${trabajo.fecha} ${trabajo.hora}`,
    }, { headers: authHeaders() });
  };

  const guardar = async () => {
    const problema = validar();
    if (problema) {
      aviso('warning', 'Faltan datos', problema);
      return;
    }

    setGuardando(true);
    let ciclosGuardados = false;
    try {
      const equipoIds = programar ? await guardarCiclos() : null;
      ciclosGuardados = programar;
      if (crearTrabajo) await guardarTrabajo(equipoIds);

      Swal.fire({
        icon: 'success',
        title: crearTrabajo && programar ? '¡Trabajo creado y mantenimiento programado!' : crearTrabajo ? '¡Trabajo creado!' : '¡Mantenimiento programado!',
        text: programar ? 'Las fechas ya están en tu calendario.' : 'Ya aparece en Servicios.',
        timer: 2400,
        showConfirmButton: false,
      });
      setTrabajo((t) => ({ ...t, descripcion: '', hora: '' }));
      setCrearTrabajo(false);
      setPanelVersion((v) => v + 1);
      cargarPropiedad();
    } catch (error) {
      if (ciclosGuardados) {
        // Los ciclos ya se guardaron: se recarga para no volver a subir los mismos equipos
        aviso('warning', 'El mantenimiento sí se programó, pero el trabajo no se creó', mensajeError(error));
        setPanelVersion((v) => v + 1);
        cargarPropiedad();
      } else {
        aviso('error', 'No se pudo guardar', mensajeError(error));
      }
    } finally {
      setGuardando(false);
    }
  };

  const filaEquipo = (clave, titulo, nota, on, veces, onAlternar, onVeces) => (
    <div key={clave} className={`mt-elemento ${on ? 'on' : ''}`}>
      <button type="button" className="mt-elemento-check" onClick={onAlternar} aria-pressed={on}>
        <span className="mt-casilla">{on && <CheckCircle2 size={18} />}</span>
        <span className="mt-elemento-texto">
          <strong>{titulo}</strong>
          {nota && <small>{nota}</small>}
        </span>
      </button>
      {on && programar && (
        <div className="mt-elemento-ciclo">
          <SelectorVeces valor={veces} onChange={onVeces} />
          <span className="mt-fechas">{textoFechas(base, veces)}</span>
        </div>
      )}
    </div>
  );

  const seleccionada = propiedades.find((p) => String(p.id) === String(propiedadId));

  return (
    <div className="xp-page">
      <Header activeModule="mantenimiento" />
      <main className="xp-container mt-vista">
        <h1 className="mt-vista-titulo">Mantenimiento</h1>

        {!propiedadId ? (
          <section className="xp-card xp-panel">
            <h3 className="xp-panel-titulo"><Building2 size={18} /> Elige una propiedad</h3>
            <label className="mt-buscador">
              <Search size={17} />
              <input
                type="search"
                placeholder="Buscar por nombre o dirección..."
                aria-label="Buscar propiedad"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </label>
            {cargandoLista ? (
              <p className="mt-panel-vacio">Cargando propiedades...</p>
            ) : !resultados.length ? (
              <p className="mt-panel-vacio">Ninguna propiedad coincide con la búsqueda.</p>
            ) : (
              <div className="mt-propiedades">
                {resultados.map((p) => (
                  <button key={p.id} type="button" className="mt-propiedad" onClick={() => setSearchParams({ propiedad: p.id })}>
                    <strong>{p.property_name || p.address || `Propiedad ${p.id}`}</strong>
                    {p.property_name && p.address && <span>{p.address}</span>}
                    <small>{p.elementos_count > 0 ? `${p.elementos_count} ${p.elementos_count === 1 ? 'elemento' : 'elementos'} en el levantamiento` : 'Sin levantamiento'}</small>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : !datos ? (
          <CasaLoader texto="Cargando equipos..." />
        ) : (
          <>
            <section className="xp-card xp-panel mt-propiedad-actual">
              <div>
                <strong>{datos.property_name || seleccionada?.address || `Propiedad ${datos.property_id}`}</strong>
                {seleccionada?.address && datos.property_name && <span>{seleccionada.address}</span>}
              </div>
              <button type="button" className="xp-btn-glass" onClick={() => setSearchParams({})}>
                <X size={16} /> Cambiar
              </button>
            </section>

            <section className="xp-card xp-panel">
              <h3 className="xp-panel-titulo"><ClipboardList size={18} /> Del levantamiento</h3>
              {datos.elementos.length ? (
                Object.entries(porZona).map(([zona, elementos]) => (
                  <div key={zona}>
                    <p className="mt-zona">{zona}</p>
                    {elementos.map((e) => filaEquipo(
                      `e-${e.id}`,
                      e.label,
                      e.veces_al_ano ? `Ya programado: ${e.veces_al_ano} ${e.veces_al_ano === 1 ? 'vez' : 'veces'} al año` : null,
                      e.id in marcados,
                      marcados[e.id],
                      () => alternar(setMarcados, e.id, e.veces_al_ano),
                      (n) => setMarcados((p) => ({ ...p, [e.id]: n })),
                    ))}
                  </div>
                ))
              ) : (
                <p className="mt-panel-vacio">Esta propiedad no tiene elementos en su levantamiento. Agrégalos a mano abajo.</p>
              )}
            </section>

            <section className="xp-card xp-panel">
              <h3 className="xp-panel-titulo"><Package size={18} /> Agregados a mano</h3>
              {datos.grupos.map((g) => filaEquipo(
                `g-${g.id}`,
                etiquetaGrupo(g),
                g.detalle,
                g.id in capturados,
                capturados[g.id],
                () => alternar(setCapturados, g.id, g.veces_al_ano),
                (n) => setCapturados((p) => ({ ...p, [g.id]: n })),
              ))}
              <GruposEquipos grupos={nuevos} onChange={setNuevos} conVeces={programar} />
            </section>

            <section className="xp-card xp-panel">
              <h3 className="xp-panel-titulo"><FileText size={18} /> ¿Qué quieres hacer?</h3>
              <div className="mt-acciones">
                <button type="button" className={`mt-accion ${programar ? 'on' : ''}`} onClick={() => setProgramar((v) => !v)} aria-pressed={programar}>
                  <CalendarClock size={18} /> Programar mantenimiento
                </button>
                <button type="button" className={`mt-accion ${crearTrabajo ? 'on' : ''}`} onClick={() => setCrearTrabajo((v) => !v)} aria-pressed={crearTrabajo}>
                  <Hammer size={18} /> Crear un trabajo ahora
                </button>
              </div>

              {crearTrabajo ? (
                <div className="mt-trabajo">
                  <div className="mt-campos-fila">
                    <label className="mt-campo">
                      <span>Tipo de servicio</span>
                      <select value={trabajo.tipo} onChange={(e) => setTrabajo({ ...trabajo, tipo: e.target.value })}>
                        <option value="Mantenimiento">Mantenimiento Preventivo</option>
                        <option value="Problema">Problema / Reparación</option>
                        <option value="SOS">SOS / Urgente</option>
                      </select>
                    </label>
                    <label className="mt-campo">
                      <span>Fecha de la visita</span>
                      <input type="date" min={hoyISO()} value={trabajo.fecha} onChange={(e) => setTrabajo({ ...trabajo, fecha: e.target.value })} />
                    </label>
                    <label className="mt-campo">
                      <span>Hora</span>
                      <input type="time" value={trabajo.hora} onChange={(e) => setTrabajo({ ...trabajo, hora: e.target.value })} />
                    </label>
                  </div>
                  <label className="mt-campo">
                    <span>Descripción</span>
                    <textarea
                      rows="3"
                      placeholder="Describe el trabajo..."
                      value={trabajo.descripcion}
                      onChange={(e) => setTrabajo({ ...trabajo, descripcion: e.target.value })}
                    />
                  </label>
                  <div className="mt-campo">
                    <span><Users size={15} /> Equipo de trabajo (opcional; la primera persona queda como responsable)</span>
                    <div className="mt-tecnicos">
                      {tecnicos.map((t) => {
                        const on = tecnicoIds.includes(t.id);
                        return (
                          <button key={t.id} type="button" className={`mt-tecnico ${on ? 'on' : ''}`} onClick={() => toggleTecnico(t.id)} aria-pressed={on}>
                            {t.first_name} {t.last_name ? `${t.last_name.charAt(0)}.` : ''}
                            {on && tecnicoIds[0] === t.id && tecnicoIds.length > 1 && <em>Responsable</em>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {totalEquipos > 0 && (
                    <p className="mt-resumen">
                      <strong>{totalEquipos} {totalEquipos === 1 ? 'elemento' : 'elementos'}:</strong>{' '}
                      {totalEquipos === 1 ? 'se piden las 4 evidencias normales.' : 'se pide antes y después de cada uno.'}
                    </p>
                  )}
                </div>
              ) : programar && (
                <label className="mt-campo mt-campo-fecha">
                  <span>Contar el ciclo desde</span>
                  <input type="date" value={fechaBase} onChange={(e) => setFechaBase(e.target.value)} />
                </label>
              )}

              <button type="button" className="xp-btn-primary mt-guardar" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </section>

            <PanelMantenimiento key={panelVersion} propiedadId={datos.property_id} />
          </>
        )}
      </main>
    </div>
  );
};

export default VistaMantenimiento;
