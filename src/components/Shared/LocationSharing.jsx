import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { MapPin, MapPinOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  refrescarEstadoUbicacion,
  suscribirEstadoUbicacion,
  cambiarConsentimientoUbicacion,
  enviarPosicion
} from './ubicacionService';
import '../../styles/Shared/LocationSharing.css';

const TRACKED_ROLES = [1, 2];
const SEND_EVERY_MS = 45000;      // envío periódico mientras la app está abierta
const MIN_GAP_MS = 20000;         // nunca más seguido que esto
const MOVE_THRESHOLD_M = 50;      // si se movió más de esto, se envía antes
const ASK_AGAIN_DAYS = 3;

const distanciaMetros = (a, b) => {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LocationSharing = () => {
  const { user } = useAuth();
  const isTracked = TRACKED_ROLES.includes(Number(user?.role_id));
  const [estado, setEstado] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const lastSent = useRef({ at: 0, coords: null, first: true });

  // Estado del usuario (se vuelve a pedir si cambia el usuario)
  useEffect(() => {
    if (!isTracked) { setEstado(null); return; }
    lastSent.current = { at: 0, coords: null, first: true };
    const unsub = suscribirEstadoUbicacion(setEstado);
    refrescarEstadoUbicacion();
    return unsub;
  }, [isTracked, user?.id]);

  // Pedir consentimiento una vez (y de nuevo a los pocos días si lo pospone)
  useEffect(() => {
    if (!isTracked || !estado || estado.consent) return;
    const key = `agente_ubicacion_pospuesto_${user.id}`;
    try {
      const at = Number(localStorage.getItem(key));
      if (at && Date.now() - at < ASK_AGAIN_DAYS * 86400000) return;
    } catch { /* almacenamiento bloqueado: se pregunta igual */ }

    const viewers = (estado.viewers || []).map(escapeHtml);
    const timer = setTimeout(() => {
      Swal.fire({
        icon: 'question',
        title: '¿Compartir tu ubicación?',
        html: `
          <div style="text-align:left;font-size:0.92rem;line-height:1.55;color:#334155">
            <p style="margin:0 0 10px">Para coordinar visitas y emergencias, el equipo puede ver tu ubicación
            <strong>solo mientras tengas la app abierta</strong> y en momentos clave (como al finalizar un trabajo).</p>
            ${viewers.length ? `<p style="margin:0 0 6px"><strong>Podrán verla:</strong></p>
            <ul style="margin:0 0 10px;padding-left:20px">${viewers.map(v => `<li>${v}</li>`).join('')}</ul>` : ''}
            <p style="margin:0;color:#64748b;font-size:0.84rem">Puedes dejar de compartir cuando quieras desde el indicador 📍.</p>
          </div>`,
        showCancelButton: true,
        confirmButtonText: 'Compartir',
        cancelButtonText: 'Ahora no',
        confirmButtonColor: '#f97316',
        reverseButtons: true
      }).then(async (r) => {
        if (r.isConfirmed) {
          try {
            await cambiarConsentimientoUbicacion(true);
          } catch {
            Swal.fire({ icon: 'error', title: 'No se pudo activar', text: 'Inténtalo de nuevo más tarde.' });
          }
        } else {
          try { localStorage.setItem(key, String(Date.now())); } catch { /* sin almacenamiento */ }
        }
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [isTracked, estado, user?.id]);

  // Envío en vivo mientras la app está visible
  useEffect(() => {
    if (!isTracked || !estado?.consent || !navigator.geolocation) return;
    let watchId = null;

    const onPosition = (pos) => {
      setGpsError(null);
      const now = Date.now();
      const prev = lastSent.current;
      const elapsed = now - prev.at;
      const moved = prev.coords ? distanciaMetros(prev.coords, pos.coords) : Infinity;
      if (!prev.first && (elapsed < MIN_GAP_MS || (elapsed < SEND_EVERY_MS && moved < MOVE_THRESHOLD_M))) return;

      const source = prev.first ? 'app_open' : 'live';
      lastSent.current = { at: now, coords: pos.coords, first: false };
      enviarPosicion(pos.coords, source).catch(err => console.warn('[Ubicación] Envío fallido:', err?.message));
    };

    const onError = (err) => {
      setGpsError(err.code === 1 ? 'denied' : 'unavailable');
    };

    const start = () => {
      if (watchId !== null || document.hidden) return;
      watchId = navigator.geolocation.watchPosition(onPosition, onError, {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 30000
      });
    };
    const stop = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = null;
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        lastSent.current.first = true; // al volver a abrir la app se registra de inmediato
        start();
      }
    };

    // Respaldo: algunos navegadores no disparan watchPosition si el usuario no se mueve
    const heartbeat = setInterval(() => {
      if (!document.hidden) {
        navigator.geolocation.getCurrentPosition(onPosition, onError, { maximumAge: 30000, timeout: 20000 });
      }
    }, SEND_EVERY_MS);

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isTracked, estado?.consent]);

  if (!isTracked || !estado?.consent) return null;

  const handleStop = async () => {
    const r = await Swal.fire({
      icon: 'warning',
      title: '¿Dejar de compartir tu ubicación?',
      text: 'El equipo ya no verá dónde estás. Puedes volver a activarlo cuando quieras.',
      showCancelButton: true,
      confirmButtonText: 'Dejar de compartir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      reverseButtons: true
    });
    if (!r.isConfirmed) return;
    try {
      await cambiarConsentimientoUbicacion(false);
      try { localStorage.setItem(`agente_ubicacion_pospuesto_${user.id}`, String(Date.now())); } catch { /* sin almacenamiento */ }
      setPanelOpen(false);
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo cambiar', text: 'Inténtalo de nuevo más tarde.' });
    }
  };

  return createPortal(
    <div className="loc-share">
      {panelOpen && (
        <div className="loc-share-panel" role="dialog" aria-label="Ubicación compartida">
          <button type="button" className="loc-share-panel-close" onClick={() => setPanelOpen(false)} aria-label="Cerrar">
            <X size={16} />
          </button>
          <strong>Compartiendo tu ubicación</strong>
          <p>Solo mientras la app está abierta y al finalizar trabajos.</p>
          {gpsError === 'denied' && (
            <p className="loc-share-warn">Tu navegador bloqueó el GPS. Actívalo en el candado 🔒 de la barra de direcciones.</p>
          )}
          {estado.viewers?.length > 0 && (
            <>
              <span className="loc-share-label">Pueden verla:</span>
              <ul>{estado.viewers.map(v => <li key={v}>{v}</li>)}</ul>
            </>
          )}
          <button type="button" className="loc-share-stop" onClick={handleStop}>
            <MapPinOff size={15} /> Dejar de compartir
          </button>
        </div>
      )}
      <button
        type="button"
        className={`loc-share-pill ${gpsError ? 'has-error' : ''}`}
        onClick={() => setPanelOpen(o => !o)}
        title="Ubicación compartida"
      >
        {gpsError ? <MapPinOff size={14} /> : <MapPin size={14} />}
        <span>{gpsError === 'denied' ? 'GPS bloqueado' : 'Ubicación'}</span>
        {!gpsError && <span className="loc-share-dot" />}
      </button>
    </div>,
    document.body
  );
};

export default LocationSharing;
