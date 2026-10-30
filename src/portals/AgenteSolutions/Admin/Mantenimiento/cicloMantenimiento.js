// Ciclos de mantenimiento: mismas reglas que MaintenanceEquipment::fechasDelCiclo en el backend.
export const OPCIONES_VECES = [1, 2, 3, 4];

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// 1 vez = a los 12 meses, 2 = 6 y 12, 3 = 4, 8 y 12, 4 = 3, 6, 9 y 12.
// Un fin de mes no se pasa al mes siguiente (31 de agosto + 6 meses = 28 de febrero).
export const fechasDelCiclo = (base, veces) => {
  const [y, m, d] = String(base || '').split('-').map(Number);
  if (!y || !m || !d || !veces) return [];
  const meses = 12 / veces;
  return Array.from({ length: veces }, (_, i) => {
    const destino = new Date(y, m - 1 + meses * (i + 1), 1);
    const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
    destino.setDate(Math.min(d, ultimoDia));
    return destino;
  });
};

// "Abr 2027 / Oct 2027"
export const textoFechas = (base, veces) =>
  fechasDelCiclo(base, veces).map((f) => `${MESES[f.getMonth()]} ${f.getFullYear()}`).join(' / ');

// "26 Abr 2027" a partir de "2027-04-26"
export const textoFecha = (iso) => {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number);
  return y ? `${d} ${MESES[m - 1]} ${y}` : '';
};

export const grupoVacio = () => ({ tipo: '', cantidad: 1, detalle: '', foto_equipo: null, foto_datos: null, veces_al_ano: 2 });

// Un grupo se puede enviar con su tipo, su cantidad y las dos fotos
export const grupoCompleto = (g) => Boolean(g.tipo.trim() && Number(g.cantidad) >= 1 && g.foto_equipo && g.foto_datos);
