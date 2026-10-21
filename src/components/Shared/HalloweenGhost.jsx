import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '../../styles/Shared/HalloweenGhost.css';
import fantasmaImg from '../../assets/fantasma-halloween.png';

// Primera aparición poco después de entrar, luego cada 60–120 s al azar
const PRIMERA_APARICION_MS = 4000;
const MIN_ESPERA_MS = 60000;
const MAX_ESPERA_MS = 120000;
const DULCES = ['🍬', '🍭', '🎃', '🍬', '🍫'];

const azar = (min, max) => min + Math.random() * (max - min);

const prefiereMenosMovimiento = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const HalloweenGhost = () => {
  const [vuelo, setVuelo] = useState(null);
  const [susto, setSusto] = useState(null);
  const timerRef = useRef(null);

  const programar = useCallback((ms) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Si la pestaña no está visible, esperar a la siguiente vuelta
      if (document.hidden) return programar(azar(MIN_ESPERA_MS, MAX_ESPERA_MS));
      setVuelo({
        id: Date.now(),
        // Entre 15% y 60% de la altura: lejos del header y del menú inferior
        top: azar(15, 60),
        haciaIzquierda: Math.random() < 0.5,
        duracion: azar(4.5, 6.5),
      });
    }, ms);
  }, []);

  useEffect(() => {
    if (prefiereMenosMovimiento()) return;
    programar(PRIMERA_APARICION_MS);
    return () => clearTimeout(timerRef.current);
  }, [programar]);

  const terminarVuelo = () => {
    setVuelo(null);
    programar(azar(MIN_ESPERA_MS, MAX_ESPERA_MS));
  };

  const asustar = (e) => {
    setSusto({ id: Date.now(), x: e.clientX, y: e.clientY });
    setVuelo((v) => (v ? { ...v, asustado: true } : v));
  };

  useEffect(() => {
    if (!susto) return;
    const t = setTimeout(() => setSusto(null), 1400);
    return () => clearTimeout(t);
  }, [susto]);

  if (!vuelo && !susto) return null;

  return createPortal(
    <div className="hg-capa" aria-hidden="true">
      {vuelo && (
        <div
          key={vuelo.id}
          className={`hg-vuelo ${vuelo.haciaIzquierda ? 'hg-izquierda' : ''}`}
          style={{ top: `${vuelo.top}%`, animationDuration: `${vuelo.duracion}s` }}
          onAnimationEnd={(e) => e.target === e.currentTarget && terminarVuelo()}
        >
          <div className="hg-flotar">
            <div className="hg-espejo">
              <img
                src={fantasmaImg}
                alt=""
                draggable="false"
                className={`hg-fantasma ${vuelo.asustado ? 'hg-asustado' : ''}`}
                onClick={asustar}
                onAnimationEnd={(e) => {
                  e.stopPropagation();
                  if (vuelo.asustado) terminarVuelo();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {susto && (
        <div key={susto.id} className="hg-susto" style={{ left: susto.x, top: susto.y }}>
          <span className="hg-bu">¡Bu! 👻</span>
          {DULCES.map((d, i) => (
            <span
              key={i}
              className="hg-dulce"
              style={{ '--ang': `${-150 + i * 30}deg`, animationDelay: `${i * 40}ms` }}
            >
              {d}
            </span>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
};

export default HalloweenGhost;
