// Reduce fotos del celular (3–8 MB) a JPEG de ~1600 px antes de subirlas.
// El servidor acepta máximo 15 MB por envío, así que varias fotos sin comprimir no pasarían.
// PDFs, archivos chicos o formatos que el navegador no puede leer (HEIC fuera de Safari) se envían tal cual.
const LADO_MAX = 1600;
const CALIDAD = 0.82;
const PESO_SIN_TOCAR = 600 * 1024;

export const comprimirImagen = async (file) => {
  if (!file?.type?.startsWith('image/') || file.size <= PESO_SIN_TOCAR) return file;

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
    return new File([blob], nombre, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
};
