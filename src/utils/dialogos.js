import Swal from 'sweetalert2';

// Reemplazo de alert / confirm / prompt nativos del navegador con SweetAlert2,
// que toma el diseño white liquid glass de SweetAlertGlass.css (cargado en main.jsx).

const NARANJA = '#f26522';
const ROJO = '#dc2626';
const GRIS = '#94a3b8';

const TITULOS = {
  success: '¡Listo!',
  error: 'Algo salió mal',
  warning: 'Atención',
  info: 'Aviso',
};

// Quita los emojis del inicio (el ícono de la alerta ya lo indica)
const limpiar = (texto) => String(texto ?? '').replace(/^[\s\p{Extended_Pictographic}️]+/u, '').trim();

const escapar = (texto) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

const tipoDe = (texto) => {
  const s = String(texto ?? '').toLowerCase();
  if (/❌|🚫|error|no se pudo|no pudo|falló|fallo|hubo un|inválid|invalid|no tienes|denegad/.test(s)) return 'error';
  if (/✅|🎉|éxito|exito|correctamente|guardad|actualizad|enviad|eliminad|registrad|cread|asignad|programad|completad|finalizad|aprobad|aceptad|copiad|listo/.test(s)) return 'success';
  if (/⚠|🚨|debes|por favor|selecciona|falta|ingresa|completa|necesitas|requerid|obligatori/.test(s)) return 'warning';
  return 'info';
};

const esPeligroso = (texto) => /eliminar|borrar|quitar|cancelar|rechazar|desheredar|traspasar/i.test(String(texto ?? ''));

/** Reemplazo de alert(): muestra un aviso con el diseño de la app. */
export const mostrarAviso = (mensaje, tipo) => {
  const t = tipo || tipoDe(mensaje);
  return Swal.fire({
    icon: t,
    title: TITULOS[t],
    html: escapar(limpiar(mensaje)),
    confirmButtonText: 'Entendido',
    confirmButtonColor: NARANJA,
  });
};

/** Reemplazo de window.confirm(): resuelve true si el usuario acepta. */
export const confirmarAccion = async (mensaje, opciones = {}) => {
  const peligro = opciones.peligro ?? esPeligroso(mensaje);
  const r = await Swal.fire({
    icon: peligro ? 'warning' : 'question',
    title: opciones.titulo || (peligro ? '¿Estás seguro?' : 'Confirmar'),
    html: escapar(limpiar(mensaje)),
    showCancelButton: true,
    confirmButtonText: opciones.confirmar || (peligro ? 'Sí, continuar' : 'Aceptar'),
    cancelButtonText: opciones.cancelar || 'Cancelar',
    confirmButtonColor: peligro ? ROJO : NARANJA,
    cancelButtonColor: GRIS,
    reverseButtons: true,
    focusCancel: peligro,
  });
  return r.isConfirmed;
};

/** Reemplazo de window.prompt(): resuelve el texto escrito, o null si se cancela. */
export const pedirTexto = async (mensaje, valorInicial = '') => {
  const r = await Swal.fire({
    title: limpiar(mensaje),
    input: 'text',
    inputValue: valorInicial ?? '',
    showCancelButton: true,
    confirmButtonText: 'Aceptar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: NARANJA,
    cancelButtonColor: GRIS,
    reverseButtons: true,
  });
  return r.isConfirmed ? r.value : null;
};
