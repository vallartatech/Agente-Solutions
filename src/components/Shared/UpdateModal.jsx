import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import '../../styles/Shared/UpdateModal.css';

const UpdateModal = () => {
  const [actualizando, setActualizando] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        // Chequeo periódico cada 60 segundos
        const intervalId = setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 1000);

        // Chequeo inmediato cuando el usuario regresa a la app o cambia de pestaña
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        };

        const handleFocus = () => {
          registration.update().catch(() => {});
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
          clearInterval(intervalId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('focus', handleFocus);
        };
      }
    },
    onRegisterError(error) {
      console.warn('PWA Registration error:', error);
    },
  });

  // Bloquear scroll de la pantalla mientras el modal obligatorio esté visible
  useEffect(() => {
    if (needRefresh) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [needRefresh]);

  if (!needRefresh) {
    return null;
  }

  const handleActualizar = async () => {
    setActualizando(true);
    try {
      await updateServiceWorker(true);
    } catch (err) {
      console.error('Error al actualizar Service Worker:', err);
      // Fallback forzado si falla la promesa interna
      window.location.reload();
    }
  };

  return createPortal(
    <div 
      className="pwa-update-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-desc"
    >
      <div className="pwa-update-card" onClick={(e) => e.stopPropagation()}>
        <div className="pwa-update-icon-wrapper">
          <Sparkles className="pwa-update-icon" />
        </div>

        <div className="pwa-update-badge">
          <span className="pwa-update-badge-dot"></span>
          <span>Nueva Versión Lista</span>
        </div>

        <h2 id="pwa-update-title" className="pwa-update-title">
          ¡Nueva Actualización!
        </h2>

        <p id="pwa-update-desc" className="pwa-update-desc">
          Una nueva actualización ha llegado con mejoras y optimizaciones indispensables. 
          <strong> Actualiza ahora</strong> para continuar disfrutando del sistema.
        </p>

        <button
          type="button"
          className="pwa-update-btn-action"
          onClick={handleActualizar}
          disabled={actualizando}
        >
          {actualizando ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span>ACTUALIZANDO SISTEMA...</span>
            </>
          ) : (
            <>
              <RefreshCw size={20} />
              <span>ACTUALIZAR AHORA</span>
            </>
          )}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default UpdateModal;
