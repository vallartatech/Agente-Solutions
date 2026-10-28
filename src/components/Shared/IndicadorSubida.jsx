import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { suscribirSubidas } from './progresoSubida';
import '../../styles/Shared/IndicadorSubida.css';

// No aparece en subidas instantáneas (evita un parpadeo en archivos chicos o en computadora)
const RETRASO_MS = 450;

const mb = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Tarjeta flotante con el avance de las subidas de archivos (fotos, videos, PDFs) de toda la app
const IndicadorSubida = () => {
  const [subidas, setSubidas] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => suscribirSubidas(lista => setSubidas(lista)), []);

  useEffect(() => {
    if (!subidas.length) { setVisible(false); return undefined; }
    if (visible) return undefined;
    const t = setTimeout(() => setVisible(true), RETRASO_MS);
    return () => clearTimeout(t);
  }, [subidas.length, visible]);

  if (!visible || !subidas.length) return null;

  const total = subidas.reduce((s, x) => s + (x.total || 0), 0);
  const cargado = subidas.reduce((s, x) => s + Math.min(x.cargado || 0, x.total || 0), 0);
  const archivos = subidas.reduce((s, x) => s + x.archivos, 0);
  const procesando = subidas.every(x => x.fase === 'procesando');
  const porcentaje = total ? Math.min(100, Math.round((cargado / total) * 100)) : 0;

  return createPortal(
    <div className={`isub ${procesando ? 'procesando' : ''}`} role="status" aria-live="polite">
      <div className="isub-nube" aria-hidden="true">
        <svg viewBox="0 0 64 48" className="isub-nube-svg">
          <path
            className="isub-nube-forma"
            d="M50 44H16C8.3 44 2 37.7 2 30c0-6.9 5-12.6 11.6-13.8C15.8 8.6 22.6 3 30.7 3c8.5 0 15.6 6.1 17.1 14.2C55.8 17.8 62 24.3 62 32.3 62 38.8 56.7 44 50 44Z"
          />
        </svg>
        <span className="isub-flecha">↑</span>
      </div>

      <div className="isub-cuerpo">
        <div className="isub-titulo">
          <strong>{procesando ? 'Guardando en la nube…' : `Subiendo… ${porcentaje}%`}</strong>
          <small>
            {procesando
              ? (archivos > 1 ? `${archivos} archivos` : 'Casi listo')
              : `${mb(cargado)} de ${mb(total)}${archivos > 1 ? ` · ${archivos} archivos` : ''}`}
          </small>
        </div>
        <div className="isub-barra">
          <div className="isub-barra-relleno" style={{ width: procesando ? '100%' : `${porcentaje}%` }} />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IndicadorSubida;
