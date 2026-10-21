import { Fragment, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';

// Ruta "dónde estoy" del levantamiento: Propiedades › Propiedad › Levantamiento › Zona › ...
// items: [{ label, Icon?, onClick? }]; el último es la vista actual.
// En celular es una sola línea deslizable que arranca mostrando la vista actual.
const RutaLevantamiento = ({ items }) => {
  const navRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    if (nav) nav.scrollLeft = nav.scrollWidth;
  }, [items.length]);

  return (
    <nav ref={navRef} className="lz-card lz-ruta" aria-label="Ruta de navegación">
      {items.map(({ label, Icon, onClick }, i) => {
        const actual = i === items.length - 1;
        const contenido = <>{Icon && <Icon size={15} />}{label}</>;
        return (
          <Fragment key={`${i}-${label}`}>
            {i > 0 && <ChevronRight size={15} className="lz-ruta-sep" />}
            {onClick && !actual ? (
              <button type="button" className="lz-ruta-item" onClick={onClick} title={label}>{contenido}</button>
            ) : (
              <span className={`lz-ruta-item ${actual ? 'actual' : ''}`} aria-current={actual ? 'page' : undefined} title={label}>
                {contenido}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
};

export default RutaLevantamiento;
