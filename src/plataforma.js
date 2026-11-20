// Dónde corre la app: navegador/PWA/TWA (web) o app nativa de Capacitor (iOS).
// Dentro de la app nativa window.location.origin es "capacitor://localhost", así que los enlaces
// que se comparten (QR, registro, etc.) deben usar URL_PUBLICA.
import { Capacitor } from '@capacitor/core';

export const esNativo = Capacitor.isNativePlatform();
export const esIOS = Capacitor.getPlatform() === 'ios';

const URL_APP = 'https://app.agentesolutions.com.mx';

export const URL_PUBLICA = (
  import.meta.env.VITE_APP_URL || (esNativo ? URL_APP : window.location.origin)
).replace(/\/+$/, '');
