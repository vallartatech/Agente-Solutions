import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardList, Search, X, Zap } from 'lucide-react';

/*
  Hoja inferior del calendario (solo celular), como la lista de "Trabajos en Red":
  plegada solo asoma la barrita "Mostrar lista"; al tocarla o deslizarla hacia arriba
  se abre con dos pestañas (Trabajos próximos / Resumen de citas) y un buscador.
  Vive dentro de .modal-calendario-window para que los modales de detalle queden encima.
*/

const MQ_MOVIL = '(max-width: 900px)';
const ALTO_PLEGADA = 54; // px visibles cuando está cerrada

function useEsMovil() {
  const [esMovil, setEsMovil] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MQ_MOVIL).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(MQ_MOVIL);
    const alCambiar = (e) => setEsMovil(e.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);
  return esMovil;
}

const coincide = (job, q) =>
  [job.titulo, job.cliente, job.calle, job.zona, job.assigned_tech_name, job.timingBadge]
    .some((v) => v && String(v).toLowerCase().includes(q));

export default function HojaCitasMovil({ proximos = [], citas = [], tarjetaProximo, renderCita }) {
  const esMovil = useEsMovil();
  const [abierta, setAbierta] = useState(false);
  const [tab, setTab] = useState('proximos'); // 'proximos' | 'resumen'
  const [busqueda, setBusqueda] = useState('');
  const hojaRef = useRef(null);
  const arrastre = useRef(null); // { y, delta, movio }

  const q = busqueda.trim().toLowerCase();
  const listaProximos = useMemo(() => (q ? proximos.filter((j) => coincide(j, q)) : proximos), [proximos, q]);
  const listaCitas = useMemo(() => (q ? citas.filter((j) => coincide(j, q)) : citas), [citas, q]);

  if (!esMovil) return null;

  const posicion = (delta) => {
    const hoja = hojaRef.current;
    if (!hoja) return;
    const plegada = hoja.offsetHeight - ALTO_PLEGADA;
    const y = abierta ? Math.max(0, delta) : Math.min(plegada, Math.max(0, plegada + delta));
    hoja.style.transform = `translateY(${y}px)`;
  };

  const alBajar = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    arrastre.current = { y: e.clientY, delta: 0, movio: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    hojaRef.current?.classList.add('is-arrastrando');
  };

  const alMover = (e) => {
    const a = arrastre.current;
    if (!a) return;
    a.delta = e.clientY - a.y;
    if (Math.abs(a.delta) > 6) a.movio = true;
    if (a.movio) posicion(a.delta);
  };

  const alSoltar = () => {
    const a = arrastre.current;
    if (!a) return;
    arrastre.current = null;
    const hoja = hojaRef.current;
    hoja?.classList.remove('is-arrastrando');
    if (hoja) hoja.style.transform = '';
    if (!a.movio) setAbierta((v) => !v);
    else if (abierta && a.delta > 60) setAbierta(false);
    else if (!abierta && a.delta < -40) setAbierta(true);
  };

  const total = tab === 'proximos' ? proximos.length : citas.length;

  return (
    <>
      {abierta && <div className="cal-hoja-fondo" onClick={() => setAbierta(false)} />}

      <section
        ref={hojaRef}
        className={`cal-hoja-movil ${abierta ? 'is-abierta' : ''}`}
        aria-label="Trabajos y citas"
      >
        <div
          className="cal-hoja-grabber"
          role="button"
          tabIndex={0}
          aria-expanded={abierta}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAbierta((v) => !v); }
          }}
        >
          <span className="cal-hoja-barrita" />
          <span className="cal-hoja-grabber-txt">
            {abierta
              ? <><ChevronDown size={15} /> Ocultar lista</>
              : <><ChevronUp size={15} /> Mostrar lista ({proximos.length})</>}
          </span>
        </div>

        <div className="cal-hoja-contenido" aria-hidden={!abierta}>
          <div className="cal-hoja-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'proximos'}
              className={`cal-hoja-tab ${tab === 'proximos' ? 'is-activo' : ''}`}
              onClick={() => setTab('proximos')}
            >
              <Zap size={14} /> Trabajos próximos
              <span className="cal-hoja-tab-num">{proximos.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'resumen'}
              className={`cal-hoja-tab ${tab === 'resumen' ? 'is-activo' : ''}`}
              onClick={() => setTab('resumen')}
            >
              <ClipboardList size={14} /> Resumen de citas
              <span className="cal-hoja-tab-num">{citas.length}</span>
            </button>
          </div>

          <label className="cal-hoja-buscador">
            <Search size={16} />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={tab === 'proximos' ? 'Buscar trabajo, cliente o colonia...' : 'Buscar cita, cliente o colonia...'}
              aria-label="Buscar"
            />
            {busqueda && (
              <button type="button" className="cal-hoja-limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
                <X size={14} />
              </button>
            )}
          </label>

          <div className="cal-hoja-lista">
            {tab === 'proximos' ? (
              q ? (
                listaProximos.length ? listaProximos.map(renderCita) : <Vacio texto="Ningún trabajo coincide con tu búsqueda." />
              ) : (
                <>
                  {tarjetaProximo}
                  {proximos.length > 1 && (
                    <>
                      <div className="cal-hoja-subtitulo">Después</div>
                      {proximos.slice(1).map(renderCita)}
                    </>
                  )}
                </>
              )
            ) : (
              listaCitas.length
                ? listaCitas.map(renderCita)
                : <Vacio texto={q ? 'Ninguna cita coincide con tu búsqueda.' : 'No hay citas registradas.'} />
            )}
          </div>

          {q && <div className="cal-hoja-pie">{(tab === 'proximos' ? listaProximos : listaCitas).length} de {total}</div>}
        </div>
      </section>
    </>
  );
}

function Vacio({ texto }) {
  return <div className="sidebar-glass-card cal-hoja-vacio">{texto}</div>;
}
