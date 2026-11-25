// QR de un trabajo para el cliente de la red.
// El QR solo guarda una URL: {app}/tablero-global?folio={uid}. No lleva datos del trabajo:
// el tablero solo carga los trabajos de las propiedades del cliente, así que si lo escanea
// otra persona no verá nada. Dibujarlo es local y gratis.
import QRCode from 'qrcode';
import { URL_PUBLICA } from '../../../plataforma';

// uid del expediente (p. ej. "wo-237"): solo se usa para buscar dentro de los trabajos del cliente
const PATRON_UID = /^[\w-]{1,40}$/;

export const urlDeTrabajo = (uid) => `${URL_PUBLICA}/tablero-global?folio=${encodeURIComponent(uid)}`;

/** Folio que se le muestra al cliente: el número de la orden (#237) o el folio del levantamiento. */
export const folioVisible = (trabajo) => (
  trabajo?.kind === 'trabajo' && trabajo?.id ? `#${trabajo.id}` : String(trabajo?.uid || '').toUpperCase()
);

/** Del texto que leyó la cámara saca el folio (uid) del trabajo, o null si no es un QR de trabajo. */
export const folioDeTexto = (texto) => {
  const limpio = String(texto || '').trim();
  try {
    const url = new URL(limpio);
    const folio = url.searchParams.get('folio');
    return folio && PATRON_UID.test(folio) ? folio : null;
  } catch {
    return PATRON_UID.test(limpio) ? limpio : null;
  }
};

/** Busca en la lista el trabajo de un folio: por uid exacto o por el número (#237 / 237). */
export const buscarPorFolio = (trabajos, folio) => {
  const f = String(folio || '').trim().toLowerCase().replace(/^#/, '');
  if (!f) return null;
  return trabajos.find((t) => String(t.uid || '').toLowerCase() === f)
    || (/^\d+$/.test(f) ? trabajos.find((t) => t.kind === 'trabajo' && String(t.id) === f) : null)
    || null;
};

export const dibujarQrTrabajo = (uid, ancho = 480) =>
  QRCode.toDataURL(urlDeTrabajo(uid), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: ancho,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

const cargarImagen = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const recortar = (ctx, texto, ancho) => {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > ancho) t = t.slice(0, -1);
  return `${t}…`;
};

/** Tarjeta PNG para descargar: folio, título, propiedad y el QR. */
export const tarjetaQrTrabajoPng = async (trabajo, propiedad) => {
  const W = 720, H = 960, QR = 500;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f26522';
  ctx.fillRect(0, 0, W, 14);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f26522';
  ctx.font = '800 30px "Outfit", "Segoe UI", sans-serif';
  ctx.fillText(`Folio ${folioVisible(trabajo)}`, W / 2, 80);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 40px "Outfit", "Segoe UI", sans-serif';
  ctx.fillText(recortar(ctx, trabajo.titulo || 'Trabajo', W - 80), W / 2, 134);
  ctx.fillStyle = '#64748b';
  ctx.font = '600 24px "Plus Jakarta Sans", "Segoe UI", sans-serif';
  ctx.fillText(recortar(ctx, propiedad || '', W - 80), W / 2, 174);

  const qr = await cargarImagen(await dibujarQrTrabajo(trabajo.uid, QR));
  ctx.drawImage(qr, (W - QR) / 2, 210, QR, QR);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 30px "Outfit", "Segoe UI", sans-serif';
  ctx.fillText('Escanéalo en tu tablero para abrir este trabajo', W / 2, 785, W - 60);
  ctx.fillStyle = '#f26522';
  ctx.font = '700 24px "Plus Jakarta Sans", "Segoe UI", sans-serif';
  ctx.fillText('Agente Market', W / 2, 830);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
};

export const nombreArchivoQrTrabajo = (trabajo) =>
  `QR_Trabajo_${folioVisible(trabajo).replace(/[^\w-]+/g, '')}.png`;
