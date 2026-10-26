// Evidencias de reporte: la 4ª (EXTRA) puede ser un video de máximo 4 segundos.
export const VIDEO_MAX_SEGUNDOS = 4;
export const VIDEO_MAX_MB = 12;

export const esVideoUrl = (url) =>
  /\/video\/upload\//.test(String(url || '')) || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(url || ''));

// Cuadro del video como imagen (Cloudinary la genera al cambiar la extensión), para el reporte impreso
export const miniaturaVideo = (url) =>
  String(url || '').replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, '.jpg');

// Duración real del video antes de subirlo
export const duracionVideo = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.onloadedmetadata = () => {
    URL.revokeObjectURL(url);
    resolve(video.duration);
  };
  video.onerror = () => {
    URL.revokeObjectURL(url);
    resolve(null);
  };
  video.src = url;
});

// Devuelve el motivo del rechazo, o null si el video sirve
export const validarVideoEvidencia = async (file) => {
  if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
    return `El video pesa ${(file.size / 1048576).toFixed(1)} MB. El máximo es ${VIDEO_MAX_MB} MB.`;
  }
  const segundos = await duracionVideo(file);
  if (segundos === null) return 'No se pudo leer el video. Prueba con otro archivo (MP4 o MOV).';
  if (segundos > VIDEO_MAX_SEGUNDOS + 0.5) {
    return `El video dura ${segundos.toFixed(1)} s. El máximo es ${VIDEO_MAX_SEGUNDOS} segundos.`;
  }
  return null;
};
