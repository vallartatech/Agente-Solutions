import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Capturar el evento de instalación lo antes posible (puede dispararse antes de que React monte InstallPrompt)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__agenteInstallPrompt = e;
  window.dispatchEvent(new Event('agente-install-available'));
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
