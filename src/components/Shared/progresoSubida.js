import axios from 'axios';

// Progreso de TODAS las subidas de archivos de la app, sin tocar cada pantalla:
// un interceptor de axios detecta los envíos con archivos (FormData con Blob/File),
// sigue su avance con onUploadProgress y avisa al <IndicadorSubida /> global.
//
// Fases:
//  - 'subiendo': el archivo viaja del dispositivo al servidor (hay porcentaje real)
//  - 'procesando': ya llegó al servidor y este lo está guardando en la nube (Cloudinary)
// Para que una petición no muestre el indicador: axios.post(url, data, { sinProgreso: true })

const subidas = new Map();
const oyentes = new Set();
let siguienteId = 1;
let instalado = false;

const archivosDe = (data) => {
  if (typeof FormData === 'undefined' || !(data instanceof FormData)) return [];
  const archivos = [];
  for (const [, valor] of data.entries()) {
    if (valor instanceof Blob && valor.size > 0) archivos.push(valor);
  }
  return archivos;
};

const emitir = () => {
  const lista = [...subidas.values()];
  oyentes.forEach(fn => fn(lista));
};

const terminar = (config) => {
  if (config?.__subidaId && subidas.delete(config.__subidaId)) emitir();
};

export const instalarProgresoSubida = () => {
  if (instalado) return;
  instalado = true;

  axios.interceptors.request.use((config) => {
    if (config.sinProgreso) return config;
    const archivos = archivosDe(config.data);
    if (!archivos.length) return config;

    const id = siguienteId++;
    config.__subidaId = id;
    subidas.set(id, {
      id,
      archivos: archivos.length,
      cargado: 0,
      total: archivos.reduce((s, a) => s + a.size, 0),
      fase: 'subiendo',
      inicio: Date.now(),
    });
    emitir();

    // Se conserva el onUploadProgress propio de la pantalla, si lo tenía
    const original = config.onUploadProgress;
    config.onUploadProgress = (evento) => {
      const s = subidas.get(id);
      if (s) {
        s.cargado = evento.loaded;
        if (evento.total) s.total = evento.total;
        s.fase = evento.total && evento.loaded >= evento.total ? 'procesando' : 'subiendo';
        emitir();
      }
      if (typeof original === 'function') original(evento);
    };
    return config;
  });

  axios.interceptors.response.use(
    (respuesta) => { terminar(respuesta.config); return respuesta; },
    (error) => { terminar(error.config); return Promise.reject(error); }
  );
};

export const suscribirSubidas = (fn) => {
  oyentes.add(fn);
  fn([...subidas.values()]);
  return () => oyentes.delete(fn);
};
