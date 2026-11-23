// QR para invitar a la cuadrilla de un contratista.
// Guarda el mismo enlace que "Compartir": abre el registro como Técnico de cuadrilla con el código puesto.
// Desde el formulario de registro también se puede escanear: se saca el código del enlace.
import QRCode from 'qrcode';
import { URL_PUBLICA } from '../../../plataforma';

// Códigos de cuadrilla: AUT_C_1732400000_45 o uno personalizado
const PATRON_CODIGO = /^[A-Za-z0-9_-]{3,64}$/;

export const enlaceInvitacionCuadrilla = (codigo) =>
  `${URL_PUBLICA}/registro-cliente?role=8&code=${encodeURIComponent(codigo)}`;

/** Del texto que leyó la cámara saca el código de la cuadrilla, o null si no es un QR de cuadrilla. */
export const codigoCuadrillaDeTexto = (texto) => {
  const limpio = String(texto || '').trim();
  try {
    const url = new URL(limpio);
    const codigo = (url.searchParams.get('code') || url.searchParams.get('company_code') || '').trim();
    return PATRON_CODIGO.test(codigo) ? codigo : null;
  } catch {
    return PATRON_CODIGO.test(limpio) ? limpio : null;
  }
};

/** Imagen (data URL) del QR de invitación. */
export const dibujarQrCuadrilla = (codigo, ancho = 560) =>
  QRCode.toDataURL(enlaceInvitacionCuadrilla(codigo), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: ancho,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
