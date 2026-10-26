import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/Shared/SweetAlertGlass.css'
import App from './App.jsx'

// Capturar el evento de instalación lo antes posible (puede dispararse antes de que React monte InstallPrompt)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__agenteInstallPrompt = e;
  window.dispatchEvent(new Event('agente-install-available'));
});

// iOS (sobre todo instalada en pantalla de inicio): al cerrar el teclado, Safari a veces no
// devuelve el viewport a su altura y todo lo position:fixed (barra inferior, chips) se queda
// flotando a media pantalla donde estaba el teclado. Un empujón de scroll lo obliga a recalcular.
const esIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (esIOS) {
  const recolocarFijos = () => {
    setTimeout(() => {
      const x = window.scrollX, y = window.scrollY;
      window.scrollTo(x, y + 1);
      window.scrollTo(x, y);
    }, 60);
  };
  document.addEventListener('focusout', (e) => {
    if (e.target.matches?.('input, textarea, select, [contenteditable="true"]')) recolocarFijos();
  });
  // Por si el teclado se cierra sin focusout (deslizar hacia abajo, cambiar de app)
  let altoPrevio = window.visualViewport?.height ?? 0;
  window.visualViewport?.addEventListener('resize', () => {
    const alto = window.visualViewport.height;
    if (alto > altoPrevio + 100) recolocarFijos();
    altoPrevio = alto;
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
