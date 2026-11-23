// Red: historial de una oferta antes de ser aceptada.
// El servidor sobrescribe la cotización al "Actualizar oferta", así que el técnico deja en el chat
// un mensaje automático con la versión anterior; el cliente arma el historial a partir de esos mensajes.

const MARCA = '🔄 Actualicé mi cotización';
const PREFIJO_PROPUESTA = 'Propuesta anterior:';

// Texto que el servidor ponía al abrir el chat antes de cotizar: no es una propuesta del técnico
const INICIO_CHAT = 'Chat iniciado por el técnico';
const RE_INICIO_CHAT = new RegExp(`\\n?${PREFIJO_PROPUESTA}\\s*${INICIO_CHAT}\\s*$`);

/** Mensaje de la cotización sin el texto automático de "chat iniciado" (queda en blanco). */
export const limpiarPropuesta = (texto) => {
  const t = String(texto || '').trim();
  if (t === INICIO_CHAT) return '';
  return t.replace(RE_INICIO_CHAT, '').trim();
};

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const mensajeCotizacionActualizada = (precioAnterior, precioNuevo, propuestaAnterior) =>
  `${MARCA}: de $${fmt(precioAnterior)} a $${fmt(precioNuevo)}.` +
  (propuestaAnterior ? `\n${PREFIJO_PROPUESTA} ${propuestaAnterior}` : '');

const RE_PRECIOS = /de \$([\d,]+(?:\.\d+)?) a \$([\d,]+(?:\.\d+)?)/;
const aNumero = (txt) => Number(String(txt).replace(/,/g, ''));

export const esMensajeCotizacionActualizada = (msg) => String(msg?.message || '').startsWith(MARCA);

// Versiones anteriores de la oferta (la más reciente primero): { precio, precioNuevo, propuesta, reemplazada_at }
export const versionesDesdeChat = (chat = []) => (chat || [])
  .filter((m) => esMensajeCotizacionActualizada(m) && m.sender_role !== 'Cliente' && m.sender_role !== 'Usuario')
  .map((m) => {
    const texto = String(m.message);
    const precios = texto.match(RE_PRECIOS);
    if (!precios) return null;
    const i = texto.indexOf(PREFIJO_PROPUESTA);
    return {
      precio: aNumero(precios[1]),
      precioNuevo: aNumero(precios[2]),
      propuesta: i >= 0 ? limpiarPropuesta(texto.slice(i + PREFIJO_PROPUESTA.length)) : '',
      reemplazada_at: m.created_at,
    };
  })
  .filter(Boolean)
  .reverse();
