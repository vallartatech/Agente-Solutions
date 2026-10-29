import { useRef, useState, Children } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../../../styles/AgenteSolutions/Shared/CarruselEtapas.css';

// Debe coincidir con el @media de CarruselEtapas.css
const ES_CARRUSEL = '(max-width: 1100px)';

/**
 * Etapas de la evidencia de un trabajo (4 evidencias + ticket).
 * En computadora: una fila con todas. En tablet y celular: carrusel con la tarjeta del centro
 * grande y las de los lados asomándose; flechas, puntos y deslizar con el dedo.
 * La usan la galería del técnico y el panel de Reportes del admin.
 */
const CarruselEtapas = ({ children, className = '' }) => {
  const pistaRef = useRef(null);
  const [activa, setActiva] = useState(0);
  const items = Children.toArray(children);

  const irA = (i) => {
    const pista = pistaRef.current;
    const item = pista?.children[i];
    if (!item) return;
    pista.scrollTo({ left: item.offsetLeft - (pista.clientWidth - item.clientWidth) / 2, behavior: 'smooth' });
  };

  // La tarjeta activa es la más cercana al centro
  const alDeslizar = () => {
    const pista = pistaRef.current;
    if (!pista) return;
    const centro = pista.scrollLeft + pista.clientWidth / 2;
    let mejor = 0;
    let distancia = Infinity;
    [...pista.children].forEach((item, i) => {
      const d = Math.abs(item.offsetLeft + item.clientWidth / 2 - centro);
      if (d < distancia) { distancia = d; mejor = i; }
    });
    setActiva(mejor);
  };

  return (
    <div className={`ce-carrusel ${className}`}>
      <div className="ce-pista" ref={pistaRef} onScroll={alDeslizar}>
        {items.map((item, i) => (
          <div
            key={item.key}
            className={`ce-item ${i === activa ? 'activa' : ''}`}
            // En el carrusel, tocar una tarjeta de un lado la trae al centro (no abre nada)
            onClickCapture={(e) => {
              if (i !== activa && window.matchMedia(ES_CARRUSEL).matches) {
                e.preventDefault();
                e.stopPropagation();
                irA(i);
              }
            }}
          >
            {item}
          </div>
        ))}
      </div>

      <button type="button" className="ce-flecha izq" onClick={() => irA(activa - 1)} disabled={activa === 0} aria-label="Etapa anterior">
        <ChevronLeft size={22} />
      </button>
      <button type="button" className="ce-flecha der" onClick={() => irA(activa + 1)} disabled={activa === items.length - 1} aria-label="Etapa siguiente">
        <ChevronRight size={22} />
      </button>

      <div className="ce-puntos" role="tablist" aria-label="Etapas">
        {items.map((item, i) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={i === activa}
            aria-label={`Etapa ${i + 1}`}
            className={i === activa ? 'activo' : ''}
            onClick={() => irA(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default CarruselEtapas;
