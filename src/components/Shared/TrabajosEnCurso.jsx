import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Activity, Building2, ChevronDown, ChevronRight, Globe, Hammer, ClipboardList, UserRound, RefreshCw, ChevronUp } from 'lucide-react';
import { API, authHeaders, esActivo, calcularFlujo, etiquetaEstado, nombreTecnicos } from '../../portals/AgenteSolutions/Admin/Expediente/flujoTrabajo';
import '../../styles/Shared/TrabajosEnCurso.css';

// Cada vez que se vuelve al inicio se monta de nuevo: se guarda lo último cargado para mostrarlo al instante
// (la clave incluye si es la Red o la interna, para no mezclar)
let cache = { clave: null, grupos: [] };

// Pide los expedientes de pocos en pocos: en la interna puede haber muchas propiedades
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

const enCurso = (t) => esActivo(t) && !String(t.status || '').trim().toLowerCase().startsWith('cancel');

// Trabajos sin terminar de todas las propiedades, agrupados por propiedad.
// conRed: marca los trabajos publicados en la Red (solo clientes de la Red).
// cadaMinuto: refresca solo cada 60 s (la interna solo al abrir o con el botón).
export const useTrabajosEnCurso = (activo, usuarioId, { conRed = true, cadaMinuto = true } = {}) => {
  const clave = `${usuarioId}|${conRed ? 'red' : 'interna'}`;
  const [grupos, setGrupos] = useState(cache.clave === clave ? cache.grupos : []);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    if (!activo) return;
    setCargando(true);
    try {
      const headers = authHeaders();
      const [propsRes, redRes] = await Promise.allSettled([
        axios.get(`${API}/propiedades`, { headers }),
        conRed ? axios.get(`${API}/mercado-trabajos?only_mine=1`, { headers }) : Promise.resolve(null),
      ]);
      if (propsRes.status !== 'fulfilled') return;
      const propiedades = Array.isArray(propsRes.value.data) ? propsRes.value.data : (propsRes.value.data?.data || []);
      // Órdenes publicadas en la Red (su id es el de la orden de trabajo de la propiedad)
      const enRed = new Set(
        redRes.status === 'fulfilled' && redRes.value?.data?.success
          ? (redRes.value.data.data || []).map((o) => String(o.id))
          : []
      );

      const expedientes = await enLotes(propiedades, (p) => axios.get(`${API}/propiedades/${p.id}/expediente`, { headers }));

      const nuevos = propiedades.map((p, i) => {
        const r = expedientes[i];
        const trabajos = r.status === 'fulfilled' ? (r.value.data?.trabajos || []) : [];
        return {
          id: p.id,
          nombre: p.property_name || p.nombre_propiedad || p.nombre || `Propiedad ${p.id}`,
          trabajos: trabajos.filter(enCurso).map((t) => ({
            ...t,
            enRed: t.kind === 'trabajo' && enRed.has(String(t.id)),
          })),
        };
      }).filter((g) => g.trabajos.length);

      cache = { clave, grupos: nuevos };
      setGrupos(nuevos);
    } catch (e) {
      console.error('No se pudieron cargar los trabajos en curso', e);
    } finally {
      setCargando(false);
    }
  }, [activo, clave, conRed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    recargar();
    if (!activo || !cadaMinuto) return undefined;
    const intervalo = setInterval(recargar, 60000);
    return () => clearInterval(intervalo);
  }, [recargar, activo, cadaMinuto]);

  const total = useMemo(() => grupos.reduce((n, g) => n + g.trabajos.length, 0), [grupos]);
  return { grupos, total, cargando, recargar };
};

const FilaTrabajo = ({ trabajo, propiedadId, onIr }) => {
  const { pasos, hechos, total, actual } = calcularFlujo(trabajo);
  const estado = etiquetaEstado(trabajo);
  const Icono = trabajo.kind === 'levantamiento' ? ClipboardList : Hammer;

  return (
    <div className="tec-trabajo">
      <button
        type="button"
        className="tec-trabajo-main"
        onClick={() => onIr(`/detalle-propiedad/${propiedadId}/trabajo/${trabajo.uid}`)}
        title="Ver el trabajo en la propiedad"
      >
        <span className="tec-trabajo-icono"><Icono size={16} /></span>
        <span className="tec-trabajo-texto">
          <span className="tec-trabajo-arriba">
            <span className={`tec-chip ${estado.tono}`}>{estado.texto}</span>
            {trabajo.enRed && <span className="tec-chip red-net"><Globe size={11} /> En la Red</span>}
          </span>
          <strong>{trabajo.titulo || 'Sin título'}</strong>
          <span className="tec-trabajo-meta"><UserRound size={12} /> {nombreTecnicos(trabajo)}</span>
          <span className="tec-barra" title={`${hechos} de ${total} pasos`}>
            {pasos.map((p) => <span key={p.key} className={`seg ${p.estado}`} />)}
          </span>
          <span className="tec-paso">
            Paso {Math.min(hechos + 1, total)} de {total}{actual ? ` · ${actual.label}` : ''}
          </span>
        </span>
        <ChevronRight size={16} className="tec-flecha" />
      </button>
      {trabajo.enRed && (
        <button
          type="button"
          className="tec-btn-red"
          onClick={() => onIr(`/red-autonomos?trabajo=${trabajo.id}`)}
        >
          <Globe size={13} /> Ver en la Red
        </button>
      )}
    </div>
  );
};

// Píldora desplegable (igual que la del plan): al abrirla muestra los trabajos sin terminar
// interna: solo el flujo del trabajo, sin nada de la Red
export const PildoraTrabajosEnCurso = ({ usuarioId, interna = false }) => {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState('todas');
  const [plegados, setPlegados] = useState({});
  const { grupos, total, cargando, recargar } = useTrabajosEnCurso(true, usuarioId, { conRed: !interna, cadaMinuto: !interna });

  // Si la propiedad filtrada ya no tiene trabajos en curso, volver a "Todas"
  useEffect(() => {
    if (filtro !== 'todas' && !grupos.some((g) => String(g.id) === filtro)) setFiltro('todas');
  }, [grupos, filtro]);

  const abrir = () => { recargar(); setAbierto(true); };

  if (!abierto) {
    return (
      <div className="vcp-plan-floating-badge is-collapsed">
        <button
          type="button"
          className="vcp-plan-pill-toggle-btn tec-pill"
          onClick={abrir}
          title="Ver los trabajos que están en proceso"
        >
          <Activity size={14} />
          <span className="vcp-plan-pill-text">EN CURSO ({total})</span>
          <ChevronDown size={15} className="vcp-plan-chevron" />
        </button>
      </div>
    );
  }

  const visibles = filtro === 'todas' ? grupos : grupos.filter((g) => String(g.id) === filtro);
  const subtitulo = total ? `${total} sin terminar` : (cargando ? 'Cargando...' : 'Todo al día');

  return (
    <div className="vcp-plan-floating-badge is-expanded tec-caja">
      <div className="tec-head" onClick={() => setAbierto(false)} title="Ocultar trabajos en curso">
        <span className="tec-head-icono"><Activity size={16} /></span>
        <div className="tec-head-texto">
          <strong>Trabajos en curso</strong>
          <small>{subtitulo}</small>
        </div>
        <button
          type="button"
          className="tec-icon-btn"
          onClick={(e) => { e.stopPropagation(); recargar(); }}
          title="Actualizar"
          aria-label="Actualizar"
        >
          <RefreshCw size={15} className={cargando ? 'girando' : ''} />
        </button>
        <button
          type="button"
          className="tec-icon-btn"
          onClick={(e) => { e.stopPropagation(); setAbierto(false); }}
          title="Ocultar"
          aria-label="Ocultar trabajos en curso"
        >
          <ChevronUp size={16} />
        </button>
      </div>

      {grupos.length > 1 && (
        <div className="tec-filtros">
          <button type="button" className={`tec-filtro ${filtro === 'todas' ? 'activo' : ''}`} onClick={() => setFiltro('todas')}>
            Todas <span>{total}</span>
          </button>
          {grupos.map((g) => (
            <button
              type="button"
              key={g.id}
              className={`tec-filtro ${filtro === String(g.id) ? 'activo' : ''}`}
              onClick={() => setFiltro(String(g.id))}
            >
              {g.nombre} <span>{g.trabajos.length}</span>
            </button>
          ))}
        </div>
      )}

      <div className="tec-lista">
        {!grupos.length && (
          <p className="tec-vacio">{cargando ? 'Cargando trabajos...' : 'No tienes trabajos en proceso en este momento.'}</p>
        )}
        {visibles.map((g) => {
          const plegado = Boolean(plegados[g.id]);
          return (
            <section key={g.id} className="tec-grupo">
              <button
                type="button"
                className="tec-grupo-head"
                onClick={() => setPlegados((p) => ({ ...p, [g.id]: !p[g.id] }))}
                aria-expanded={!plegado}
              >
                <Building2 size={14} />
                <span>{g.nombre}</span>
                <span className="tec-grupo-n">{g.trabajos.length}</span>
                <ChevronDown size={15} className={`tec-grupo-flecha ${plegado ? 'plegado' : ''}`} />
              </button>
              {!plegado && g.trabajos.map((t) => (
                <FilaTrabajo key={t.uid} trabajo={t} propiedadId={g.id} onIr={navigate} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
};
