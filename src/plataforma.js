// Dónde corre la app: navegador/PWA/TWA (web) o app nativa de Capacitor (iOS).
// Dentro de la app nativa window.location.origin es "capacitor://localhost", así que los enlaces
// que se comparten (QR, registro, etc.) deben usar URL_PUBLICA.
import { Capacitor } from '@capacitor/core';

export const esNativo = Capacitor.isNativePlatform();
export const esIOS = Capacitor.getPlatform() === 'ios';

// En la app de iPhone no se venden suscripciones ni espacios extra ni se muestran sus precios:
// Apple (regla 3.1.1) exige cobrar lo digital con su sistema. Los pagos de trabajos físicos sí siguen.
export const sinVentasDigitales = esIOS;

// Quita los precios entre paréntesis de un texto, p. ej. "6 Meses Gratis ($299/mes posterior)"
export const sinPrecio = (texto) => (
  sinVentasDigitales && typeof texto === 'string' ? texto.replace(/\s*\([^)]*\$[^)]*\)/g, '') : texto
);

const URL_APP = 'https://app.agentesolutions.com.mx';

export const URL_PUBLICA = (
  import.meta.env.VITE_APP_URL || (esNativo ? URL_APP : window.location.origin)
).replace(/\/+$/, '');
