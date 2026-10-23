// Reduce fotos del celular (3–8 MB, o más en iPhone) a JPEG de 1920 px por lado antes de subirlas.
// 1920 px conserva legibles placas, números de serie y detalles de evidencia; queda en ~300–700 KB.
// El servidor acepta máximo 15 MB por envío, así que varias fotos sin comprimir no pasarían.
// PDFs, archivos chicos o formatos que el navegador no puede leer (HEIC fuera de Safari) se envían tal cual.
const LADO_MAX = 1920;
const CALIDAD = 0.8;
const PESO_SIN_TOCAR = 500 * 1024;

// Formatos que se recomprimen. PNG/WebP/GIF/SVG se respetan: pueden tener transparencia
// (logos, stickers) o animación, y convertirlos a JPEG los arruinaría.
const TIPOS_FOTO = ['image/jpeg', 'image/jpg', 'image/heic', 'image/heif'];

// Archivos que ya salieron de aquí: no se vuelven a comprimir (evita perder calidad dos veces)
const yaComprimidos = new WeakSet();

export const comprimirImagen = async (file) => {
  if (!file?.type?.startsWith('image/') || file.size <= PESO_SIN_TOCAR || yaComprimidos.has(file)) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', CALIDAD));
    if (!blob || blob.size >= file.size) return file;

    const nombre = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    const comprimido = new File([blob], nombre, { type: 'image/jpeg', lastModified: Date.now() });
    yaComprimidos.add(comprimido);
    return comprimido;
  } catch {
    return file;
  }
};

// Comprime las fotos de un FormData (lo usa el interceptor global de subidas).
// Devuelve el mismo FormData si no había nada que comprimir.
export const comprimirFormData = async (data) => {
  const entradas = [...data.entries()];
  const esFoto = (v) => v instanceof File && TIPOS_FOTO.includes((v.type || '').toLowerCase()) && v.size > PESO_SIN_TOCAR;
  if (!entradas.some(([, v]) => esFoto(v))) return data;

  const nuevo = new FormData();
  for (const [clave, valor] of entradas) {
    if (esFoto(valor)) {
      const archivo = await comprimirImagen(valor);
      nuevo.append(clave, archivo, archivo.name);
    } else if (valor instanceof File) {
      nuevo.append(clave, valor, valor.name);
    } else {
      nuevo.append(clave, valor);
    }
  }
  return nuevo;
};
