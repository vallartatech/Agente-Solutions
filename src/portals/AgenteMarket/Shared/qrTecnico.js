// QR del técnico de la red.
// El QR solo guarda una URL: {app}/t/{codigo}. El código es aleatorio y permanente (lo crea el servidor
// la primera vez y nunca cambia), así un QR impreso sirve para siempre. Dibujarlo es local y gratis.
import QRCode from 'qrcode';

// Dominio público de la app. VITE_APP_URL permite fijarlo para que el QR no dependa de dónde se abra la app.
const BASE = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/+$/, '');

const PATRON_CODIGO = /^[A-Za-z0-9]{6,20}$/;

export const urlDeCodigo = (codigo) => `${BASE}/t/${codigo}`;

/** Del texto que leyó la cámara saca el código del técnico, o null si no es un QR de la app. */
export const codigoDeTexto = (texto) => {
  const limpio = String(texto || '').trim();
  try {
    const url = new URL(limpio);
    const m = url.pathname.match(/\/t\/([A-Za-z0-9]{6,20})\/?$/);
    return m ? m[1] : null;
  } catch {
    return PATRON_CODIGO.test(limpio) ? limpio : null;
  }
};

/** Imagen (data URL) del QR. */
export const dibujarQr = (codigo, ancho = 560) =>
  QRCode.toDataURL(urlDeCodigo(codigo), {
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

// Corta el texto con "…" para que quepa en el ancho dado
const recortar = (ctx, texto, ancho) => {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > ancho) t = t.slice(0, -1);
  return `${t}…`;
};

/**
 * Tarjeta lista para imprimir o compartir: nombre, QR y una leyenda.
 * Devuelve un Blob PNG.
 */
export const tarjetaQrPng = async (codigo, nombre, subtitulo = 'Técnico de la red') => {
  const W = 720, H = 940, QR = 520;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f26522';
  ctx.fillRect(0, 0, W, 14);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 44px "Outfit", "Segoe UI", sans-serif';
  ctx.fillText(recortar(ctx, nombre || 'Técnico', W - 80), W / 2, 92);
  ctx.fillStyle = '#64748b';
  ctx.font = '600 26px "Plus Jakarta Sans", "Segoe UI", sans-serif';
  ctx.fillText(recortar(ctx, subtitulo, W - 80), W / 2, 134);

  const qr = await cargarImagen(await dibujarQr(codigo, QR));
  ctx.drawImage(qr, (W - QR) / 2, 170, QR, QR);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 32px "Outfit", "Segoe UI", sans-serif';
  ctx.fillText('Escanéame para contratarme', W / 2, 760);
  ctx.fillStyle = '#f26522';
  ctx.font = '700 26px "Plus Jakarta Sans", "Segoe UI", sans-serif';
  ctx.fillText('Agente Market · Red de técnicos', W / 2, 806);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 20px "Plus Jakarta Sans", "Segoe UI", sans-serif';
  ctx.fillText(recortar(ctx, urlDeCodigo(codigo).replace(/^https?:\/\//, ''), W - 80), W / 2, 870);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
};

export const nombreArchivoQr = (nombre) =>
  `QR_${String(nombre || 'tecnico').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_')}.png`;
