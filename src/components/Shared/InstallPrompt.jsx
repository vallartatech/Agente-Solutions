import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import '../../styles/Shared/InstallPrompt.css';

const DISMISS_KEY = 'agente_install_dismissed_at';
const DISMISS_DAYS = 3;

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

const wasDismissedRecently = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.__agenteInstallPrompt || null);
  const [visible, setVisible] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const onAvailable = () => {
      setDeferredPrompt(window.__agenteInstallPrompt);
      setVisible(true);
    };
    const onInstalled = () => {
      window.__agenteInstallPrompt = null;
      setVisible(false);
    };

    window.addEventListener('agente-install-available', onAvailable);
    window.addEventListener('appinstalled', onInstalled);

    // Android/escritorio: si el evento ya llegó. iPhone: Safari no tiene evento, se muestran instrucciones.
    let timer;
    if (window.__agenteInstallPrompt) setVisible(true);
    else if (isIOS()) timer = setTimeout(() => setVisible(true), 2500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('agente-install-available', onAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* almacenamiento bloqueado */ }
    setVisible(false);
  };

  const handleInstall = async () => {
    if (isIOS()) {
      setShowIOSSteps(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    window.__agenteInstallPrompt = null;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setVisible(false);
    else dismiss();
  };

  if (!visible) return null;

  return createPortal(
    <div className="install-prompt" role="dialog" aria-label="Instalar aplicación">
      <button type="button" className="install-prompt-close" onClick={dismiss} aria-label="Cerrar">
        <X size={18} />
      </button>
      <img src="/Logo_192.png" alt="" className="install-prompt-logo" />
      <div className="install-prompt-body">
        <strong className="install-prompt-title">¿Desea instalar esta app en el dispositivo?</strong>
        {showIOSSteps ? (
          <ol className="install-prompt-steps">
            <li>Toca <Share size={15} /> <b>Compartir</b> en la barra de Safari.</li>
            <li>Elige <PlusSquare size={15} /> <b>Agregar a inicio</b>.</li>
            <li>Abre Agente desde el ícono para recibir notificaciones.</li>
          </ol>
        ) : (
          <span className="install-prompt-text">Acceso rápido desde tu pantalla de inicio y notificaciones en tiempo real.</span>
        )}
        {!showIOSSteps && (
          <div className="install-prompt-actions">
            <button type="button" className="install-prompt-later" onClick={dismiss}>Ahora no</button>
            <button type="button" className="install-prompt-btn" onClick={handleInstall}>
              <Download size={16} /> Instalar
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default InstallPrompt;
