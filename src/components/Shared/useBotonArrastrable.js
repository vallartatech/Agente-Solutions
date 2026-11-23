// Botón flotante que se puede mover: en celular se mantiene presionado y se arrastra; en computadora,
// se arrastra con el mouse. Al soltarlo se pega al lado más cercano y recuerda su lugar.
import { useCallback, useEffect, useRef, useState } from 'react';

const ESPERA_TOQUE_MS = 350; // mantener presionado para empezar a moverlo (celular)
const UMBRAL_MOUSE = 6;      // px que hay que mover el mouse para que cuente como arrastre
const UMBRAL_SCROLL = 10;    // si el dedo se mueve antes de tiempo, era scroll: no se arrastra
const MARGEN = 12;           // separación de las orillas de la pantalla
const MARGEN_ABAJO = 84;     // la barra de navegación de abajo

const leer = (clave) => {
  try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch { return null; }
};
const guardar = (clave, valor) => {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento: dura esta visita */ }
};

const limitarAlto = (top, alto) => Math.min(Math.max(top, MARGEN + 56), window.innerHeight - alto - MARGEN_ABAJO);

/**
 * clave: dónde se guarda la posición (localStorage).
 * Devuelve { ref, style, moviendo, onPointerDown, onClickCapture } para el botón.
 */
const useBotonArrastrable = (clave) => {
  const ref = useRef(null);
  const [pos, setPos] = useState(() => leer(clave)); // { lado: 'izq' | 'der', top } o null (lugar de siempre)
  const [libre, setLibre] = useState(null);           // { left, top } mientras se arrastra
  const estado = useRef(null);
  const acabaDeMover = useRef(false);

  const terminar = useCallback(() => {
    const e = estado.current;
    estado.current = null;
    clearTimeout(e?.timer);
    window.removeEventListener('pointermove', e?.mover);
    window.removeEventListener('pointerup', e?.soltar);
    window.removeEventListener('pointercancel', e?.soltar);
  }, []);

  useEffect(() => terminar, [terminar]);

  // Mientras se arrastra con el dedo, la página no se desplaza
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const bloquear = (ev) => { if (estado.current?.arrastrando) ev.preventDefault(); };
    el.addEventListener('touchmove', bloquear, { passive: false });
    return () => el.removeEventListener('touchmove', bloquear);
  });

  // Si cambia el tamaño de la pantalla, que no quede fuera
  useEffect(() => {
    const ajustar = () => setPos((p) => (p && ref.current ? { ...p, top: limitarAlto(p.top, ref.current.offsetHeight) } : p));
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, []);

  const onPointerDown = (ev) => {
    if (ev.button !== undefined && ev.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    const caja = el.getBoundingClientRect();
    const e = {
      x0: ev.clientX, y0: ev.clientY,
      dx: ev.clientX - caja.left, dy: ev.clientY - caja.top,
      ancho: caja.width, alto: caja.height,
      esToque: ev.pointerType !== 'mouse',
      arrastrando: false,
    };

    const empezar = () => {
      e.arrastrando = true;
      setLibre({ left: caja.left, top: caja.top });
      if (e.esToque) navigator.vibrate?.(15);
    };

    e.mover = (m) => {
      const distancia = Math.hypot(m.clientX - e.x0, m.clientY - e.y0);
      if (!e.arrastrando) {
        if (e.esToque) {
          if (distancia > UMBRAL_SCROLL) terminar(); // se movió antes de tiempo: era scroll
          return;
        }
        if (distancia < UMBRAL_MOUSE) return;
        empezar();
      }
      const left = Math.min(Math.max(m.clientX - e.dx, MARGEN), window.innerWidth - e.ancho - MARGEN);
      const top = limitarAlto(m.clientY - e.dy, e.alto);
      setLibre({ left, top });
    };

    e.soltar = (s) => {
      if (e.arrastrando) {
        const centro = (s.clientX - e.dx) + e.ancho / 2;
        const nueva = { lado: centro < window.innerWidth / 2 ? 'izq' : 'der', top: limitarAlto(s.clientY - e.dy, e.alto) };
        setPos(nueva);
        guardar(clave, nueva);
        acabaDeMover.current = true; // el clic que sigue no abre el asistente
      }
      setLibre(null);
      terminar();
    };

    if (e.esToque) e.timer = setTimeout(empezar, ESPERA_TOQUE_MS);
    estado.current = e;
    window.addEventListener('pointermove', e.mover);
    window.addEventListener('pointerup', e.soltar);
    window.addEventListener('pointercancel', e.soltar);
  };

  const onClickCapture = (ev) => {
    if (acabaDeMover.current) {
      acabaDeMover.current = false;
      ev.preventDefault();
      ev.stopPropagation();
    }
  };

  let style;
  if (libre) {
    style = { left: libre.left, top: libre.top, right: 'auto', bottom: 'auto', transition: 'none' };
  } else if (pos) {
    style = {
      top: limitarAlto(pos.top, ref.current?.offsetHeight || 52),
      bottom: 'auto',
      ...(pos.lado === 'izq' ? { left: MARGEN, right: 'auto' } : { right: MARGEN, left: 'auto' }),
    };
  }

  return { ref, style, moviendo: Boolean(libre), onPointerDown, onClickCapture };
};

export default useBotonArrastrable;
