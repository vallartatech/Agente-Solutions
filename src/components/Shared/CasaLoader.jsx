import React from 'react';
import '../../styles/Shared/CasaLoader.css';

/**
 * Animación de carga: una casa en trazo blanco que se construye paso a paso
 * (suelo → paredes → techo → chimenea → puerta → ventanas) y se repite.
 * Cada trazo usa pathLength="1" para animar el dibujo con stroke-dashoffset.
 */
const CasaLoader = ({ texto = 'Cargando...', fondoOscuro = false }) => (
  <div className={`casa-loader ${fondoOscuro ? 'casa-loader--fondo-oscuro' : ''}`} role="status" aria-live="polite">
    <div className="casa-loader-tile">
      <svg className="casa-loader-svg" viewBox="0 0 120 120" aria-hidden="true">
        <path className="cl-trazo cl-suelo" pathLength="1" d="M14 100 H106" />
        <path className="cl-trazo cl-paredes" pathLength="1" d="M28 100 V60 H92 V100" />
        <path className="cl-trazo cl-techo" pathLength="1" d="M18 64 L60 26 L102 64" />
        <path className="cl-trazo cl-chimenea" pathLength="1" d="M78 42 V28 H88 V51" />
        <path className="cl-trazo cl-puerta" pathLength="1" d="M52 100 V78 H68 V100" />
        <path className="cl-trazo cl-ventana" pathLength="1" d="M35 68 H48 V79 H35 Z" />
        <path className="cl-trazo cl-ventana" pathLength="1" d="M72 68 H85 V79 H72 Z" />
      </svg>
    </div>
    <p className="casa-loader-texto">{texto}</p>
  </div>
);

export default CasaLoader;
