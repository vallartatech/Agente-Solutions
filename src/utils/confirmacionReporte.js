// Agente Market: fecha en la que el reporte se confirma solo (48 h después de enviarlo), para mostrarla al cliente
export const fechaConfirmacionAuto = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};
