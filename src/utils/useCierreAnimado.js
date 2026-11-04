import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';

// Último punto tocado en la pantalla. Sirve como origen de la animación de apertura,
// así cualquier botón que abra el modal funciona sin tener que pasar referencias.
let ultimoToque = null;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => {
    ultimoToque = { x: e.clientX, y: e.clientY };
  }, true);
}

/**
 * Animación de apertura y cierre para modales.
 * - `ventanaRef`: ponerlo en la tarjeta/ventana; recibe --anim-ox / --anim-oy
 *   (punto donde se tocó, relativo a la ventana) para usarlo en transform-origin.
 * - `cerrar()`: activa `cerrando` (para la clase CSS de salida) y llama a onClose
 *   cuando termina la animación.
 */
export default function useCierreAnimado(isOpen, onClose, duracion = 300) {
  const [cerrando, setCerrando] = useState(false);
  const ventanaRef = useRef(null);
  const timerRef = useRef(null);

  const cerrar = useCallback(() => {
    if (timerRef.current) return;
    setCerrando(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setCerrando(false);
      onClose?.();
    }, duracion);
  }, [onClose, duracion]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = ventanaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const o = ultimoToque || { x: r.left + r.width / 2, y: r.top };
    el.style.setProperty('--anim-ox', `${o.x - r.left}px`);
    el.style.setProperty('--anim-oy', `${o.y - r.top}px`);
  }, [isOpen]);

  return { cerrando, cerrar, ventanaRef };
}
