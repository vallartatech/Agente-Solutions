// Fecha y hora en que el cliente de la Red prefiere la visita del levantamiento
// ('YYYY-MM-DDTHH:MM' o 'YYYY-MM-DD HH:MM:SS') -> "sáb 14 nov, 10:30 a.m."
export const fechaPreferidaLegible = (valor) => {
  if (!valor) return '';
  const f = new Date(String(valor).replace(' ', 'T'));
  if (Number.isNaN(f.getTime())) return String(valor);
  const dia = f.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const hora = f.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  return `${dia}, ${hora}`;
};

// 'YYYY-MM-DDTHH:MM' (formato del campo de fecha y hora) a partir del valor guardado
export const fechaPreferidaParaCampo = (valor) => (valor ? String(valor).replace(' ', 'T').slice(0, 16) : '');
