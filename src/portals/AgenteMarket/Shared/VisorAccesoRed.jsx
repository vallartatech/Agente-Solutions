// Red: muestra el QR de acceso a pantalla completa (blob con sesión, sin caché) para escanearlo
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cargarImagenAcceso, errorDeAcceso } from './accesoRedApi';
import '../../../styles/AgenteMarket/Shared/AccesoPropiedad.css';

const VisorAccesoRed = ({ workOrderId, acceso, onCerrar }) => {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let url = null;
    let vivo = true;
    let wakeLock = null;

    cargarImagenAcceso(workOrderId, acceso.slot)
      .then((u) => { url = u; if (vivo) setSrc(u); else URL.revokeObjectURL(u); })
      .catch(async (e) => vivo && setError(await errorDeAcceso(e, 'No se pudo abrir el QR.')));

    // Pantalla encendida mientras se escanea
    navigator.wakeLock?.request?.('screen').then((w) => { wakeLock = w; }).catch(() => {});
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    document.body.style.overflow = 'hidden';

    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
      wakeLock?.release?.().catch(() => {});
      window.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = '';
    };
  }, [workOrderId, acceso.slot, onCerrar]);

  return createPortal(
    <div className="acr-visor" role="dialog" aria-modal="true" aria-label="QR de acceso">
      <button type="button" className="acr-visor-cerrar" onClick={onCerrar} aria-label="Cerrar">
        <X size={22} />
      </button>
      <div className="acr-visor-cuerpo">
        <strong>{acceso.label || 'Acceso a la propiedad'}</strong>
        {error ? <p className="acr-error">{error}</p> : src ? <img src={src} alt="QR de acceso" /> : <p>Cargando…</p>}
        {acceso.codigo && <span className="acr-visor-codigo">{acceso.codigo}</span>}
      </div>
    </div>,
    document.body
  );
};

export default VisorAccesoRed;
