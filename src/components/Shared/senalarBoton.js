// "Muéstrame" del asistente de ayuda: lleva a la pantalla e ilumina el botón marcado con data-ayuda="<id>".
// La IA solo elige el id; si se agrega un botón aquí, agregarlo también en la lista del backend
// (AsistenteController::BOTONES).

// id → ruta donde vive el botón (null: está en el menú, que sale en todas las pantallas) y texto del botón
export const BOTONES_AYUDA = {
  'solicitar-servicio': { ruta: '/VistaMarket', texto: 'Solicitar servicio' },
  'agregar-propiedad': { ruta: '/VistaMarket', texto: 'Agregar propiedad' },
  'editar-propiedad': { ruta: '/VistaMarket', texto: 'Editar propiedad' },
  'info-propiedad': { ruta: '/VistaMarket', texto: 'Ver información de la propiedad' },
  'tablero-control': { ruta: '/VistaMarket', texto: 'Tablero de Control' },
  'menu-mercado': { ruta: null, texto: 'Mercado' },
  'menu-propiedades': { ruta: null, texto: 'Propiedades' },
  'menu-tablero-global': { ruta: null, texto: 'Tablero global' },
  'menu-perfil': { ruta: null, texto: 'Menú del perfil' },
  'calendario': { ruta: null, texto: 'Calendario' },
  'publicar-problema': { ruta: '/red-autonomos', texto: 'Publicar problema' },
  'pestana-en-red': { ruta: '/red-autonomos', texto: 'En Mercado' },
  'pestana-aceptados': { ruta: '/red-autonomos', texto: 'Aceptados' },
  'ver-ofertas': { ruta: '/red-autonomos', texto: 'Ver ofertas' },
  'agregar-favorito': { ruta: '/mis-tecnicos', texto: 'Agregar a favoritos' },
};

const ESPERA_MS = 4000; // lo que se espera a que la pantalla cargue el botón
const DURACION_MS = 9000; // lo que dura iluminado si no se toca nada

const esVisible = (el) => {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const estilo = window.getComputedStyle(el);
  return estilo.visibility !== 'hidden' && estilo.display !== 'none' && Number(estilo.opacity) !== 0;
};

// El primero visible: el mismo id puede estar en el menú de computadora y en la barra del celular
const buscarVisible = (id) =>
  [...document.querySelectorAll(`[data-ayuda="${id}"]`)].find(esVisible) || null;

const esperarBoton = (id) =>
  new Promise((resolve) => {
    const inicio = Date.now();
    const revisar = () => {
      const el = buscarVisible(id);
      if (el) return resolve(el);
      if (Date.now() - inicio > ESPERA_MS) return resolve(null);
      setTimeout(revisar, 150);
    };
    revisar();
  });

let quitarActual = null;

const iluminar = (el) => {
  quitarActual?.();
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

  const marco = document.createElement('div');
  marco.className = 'asis-senal';
  const etiqueta = document.createElement('div');
  etiqueta.className = 'asis-senal-etiqueta';
  document.body.append(marco, etiqueta);

  let cuadro = 0;
  const seguir = () => {
    // El botón puede moverse (scroll, animaciones): el marco lo sigue
    const r = el.getBoundingClientRect();
    marco.style.top = `${r.top - 6}px`;
    marco.style.left = `${r.left - 6}px`;
    marco.style.width = `${r.width + 12}px`;
    marco.style.height = `${r.height + 12}px`;
    const abajo = r.top < 70; // si el botón está hasta arriba, la etiqueta va debajo
    etiqueta.style.top = abajo ? `${r.bottom + 12}px` : `${r.top - 44}px`;
    etiqueta.textContent = abajo ? '👆 Presiona aquí' : '👇 Presiona aquí';
    etiqueta.style.left = `${Math.min(Math.max(r.left + r.width / 2, 70), window.innerWidth - 70)}px`;
    cuadro = requestAnimationFrame(seguir);
  };
  seguir();

  const quitar = () => {
    cancelAnimationFrame(cuadro);
    marco.remove();
    etiqueta.remove();
    clearTimeout(temporizador);
    document.removeEventListener('pointerdown', quitar, true);
    if (quitarActual === quitar) quitarActual = null;
  };
  const temporizador = setTimeout(quitar, DURACION_MS);
  // Cualquier toque lo quita (el toque sigue su curso: si fue en el botón, el botón responde)
  setTimeout(() => document.addEventListener('pointerdown', quitar, true), 300);
  quitarActual = quitar;
};

// Devuelve true si encontró e iluminó el botón
export const senalarBoton = async (id, navigate, rutaActual) => {
  const destino = BOTONES_AYUDA[id];
  if (!destino) return false;
  if (destino.ruta && destino.ruta.toLowerCase() !== rutaActual.toLowerCase()) {
    navigate(destino.ruta);
  }
  const el = await esperarBoton(id);
  if (!el) return false;
  iluminar(el);
  return true;
};
