import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { MapPin, MapPinOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  refrescarEstadoUbicacion,
  suscribirEstadoUbicacion,
  cambiarConsentimientoUbicacion,
  cambiarPausaUbicacion,
  enviarPosicion
} from './ubicacionService';
import '../../styles/Shared/LocationSharing.css';

const TRACKED_ROLES = [1, 2];
const SEND_EVERY_MS = 45000;      // envío periódico mientras la app está abierta
const MIN_GAP_MS = 20000;         // nunca más seguido que esto
const MOVE_THRESHOLD_M = 50;      // si se movió más de esto, se envía antes
const ASK_AGAIN_DAYS = 3;
// Estados al pausar la ubicación (quien tiene el permiso); "Otro" permite escribir uno
const ESTADOS_PAUSA = ['Ocupado', 'En junta', 'En llamada', 'Comiendo', 'Fuera de oficina', 'Otro'];

const distanciaMetros = (a, b) => {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

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

    const timer = setTimeout(() => {
      Swal.fire({
        icon: 'info',
        title: 'Comparte tu ubicación',
        text: 'Necesitas compartir tu ubicación para usar la app.',
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

  // Envío en vivo mientras la app está visible (nunca mientras la ubicación está pausada)
  useEffect(() => {
    if (!isTracked || !estado?.consent || estado?.paused || !navigator.geolocation) return;
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
  }, [isTracked, estado?.consent, estado?.paused]);

  const [cambiandoPausa, setCambiandoPausa] = useState(false);
  const [estadoElegido, setEstadoElegido] = useState('Ocupado');
  const [estadoOtro, setEstadoOtro] = useState('');
  const pausada = Boolean(estado?.paused);
  const puedePausar = Boolean(estado?.can_pause);
  const estadoPausa = estado?.pause_status || 'Ubicación pausada';
  const estadoAGuardar = estadoElegido === 'Otro' ? estadoOtro.trim() : estadoElegido;

  const alternarPausa = async () => {
    if (!pausada && !estadoAGuardar) return;
    setCambiandoPausa(true);
    try {
      await cambiarPausaUbicacion(!pausada, pausada ? null : estadoAGuardar);
      if (!pausada) setGpsError(null);
      lastSent.current = { at: 0, coords: null, first: true }; // al reanudar se registra de inmediato
      setPanelOpen(false);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo cambiar', text: err.response?.data?.error || 'Inténtalo de nuevo.' });
    } finally {
      setCambiandoPausa(false);
    }
  };

  if (!isTracked || !estado?.consent) return null;

  // El indicador informa; si el GPS falla explica cómo activarlo, y con permiso permite pausar
  const mostrarPanel = panelOpen && (gpsError || puedePausar);
  return createPortal(
    <div className="loc-share">
      {mostrarPanel && (
        <div className="loc-share-panel" role="dialog" aria-label="Ubicación">
          <button type="button" className="loc-share-panel-close" onClick={() => setPanelOpen(false)} aria-label="Cerrar">
            <X size={16} />
          </button>
          {puedePausar ? (
            <>
              <strong>{pausada ? estadoPausa : 'En línea · compartiendo ubicación'}</strong>
              {pausada ? (
                <p>Tu ubicación está pausada. En el mapa del equipo apareces como «{estadoPausa}».</p>
              ) : (
                <>
                  <p>Si la pausas, en el mapa del equipo aparecerás con este estado:</p>
                  <div className="loc-share-estados">
                    {ESTADOS_PAUSA.map(e => (
                      <button
                        type="button"
                        key={e}
                        className={`loc-share-estado ${estadoElegido === e ? 'activo' : ''}`}
                        onClick={() => setEstadoElegido(e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  {estadoElegido === 'Otro' && (
                    <input
                      className="loc-share-otro"
                      placeholder="Ej. En obra, Visitando cliente"
                      maxLength={40}
                      value={estadoOtro}
                      onChange={e => setEstadoOtro(e.target.value)}
                      autoFocus
                    />
                  )}
                </>
              )}
              <button
                type="button"
                className={`loc-share-toggle ${pausada ? 'reanudar' : ''}`}
                onClick={alternarPausa}
                disabled={cambiandoPausa || (!pausada && !estadoAGuardar)}
              >
                {pausada ? <MapPin size={15} /> : <MapPinOff size={15} />}
                {cambiandoPausa ? 'Guardando…' : pausada ? 'Volver a En línea' : `Pausar · ${estadoAGuardar || 'escribe un estado'}`}
              </button>
            </>
          ) : (
            <strong>Activa tu ubicación</strong>
          )}
          {gpsError && !pausada && (
            <p className="loc-share-warn">
              {gpsError === 'denied'
                ? 'Tu navegador bloqueó el GPS. Actívalo en el candado 🔒 de la barra de direcciones y recarga la página.'
                : 'No se pudo obtener tu ubicación. Revisa que el GPS del celular esté encendido.'}
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        className={`loc-share-pill ${gpsError && !pausada ? 'has-error' : ''} ${pausada ? 'is-paused' : ''}`}
        onClick={() => { if ((gpsError && !pausada) || puedePausar) setPanelOpen(o => !o); }}
        title={pausada ? `${estadoPausa} · ubicación pausada` : 'Ubicación compartida'}
      >
        {pausada || gpsError ? <MapPinOff size={14} /> : <MapPin size={14} />}
        <span>{pausada ? estadoPausa : gpsError === 'denied' ? 'GPS bloqueado' : puedePausar ? 'En línea' : 'Ubicación'}</span>
        {!gpsError && !pausada && <span className="loc-share-dot" />}
      </button>
    </div>,
    document.body
  );
};

export default LocationSharing;
