import { useEffect, useMemo } from 'react';
import { Camera } from 'lucide-react';
import CampoFechaHora from '../../../../components/Shared/CampoFechaHora';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoyISO = () => aISO(new Date());

// Fecha + n meses; un fin de mes no se pasa al mes siguiente (igual que el backend)
export const sumarMeses = (iso, n) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const destino = new Date(y, m - 1 + n, 1);
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  destino.setDate(Math.min(d, ultimoDia));
  return aISO(destino);
};

export const dentroDeMeses = (n) => sumarMeses(hoyISO(), n);

// Mantenimiento por periodo: cada cuántos meses
export const FRECUENCIAS = [1, 2, 3, 4, 6, 12];
export const textoFrecuencia = (n) => {
  if (Number(n) === 1) return 'Cada mes';
  if (Number(n) === 12) return 'Cada año';
  return `Cada ${n} meses`;
};

export const textoFecha = (iso) => {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number);
  return y ? `${d} ${MESES[m - 1]} ${y}` : '';
};

// "Faltan 2 semanas", "Vencido hace 3 días"... y el tono según qué tan cerca está
export const tiempoRestante = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const hoy = new Date();
  const dias = Math.round((new Date(y, m - 1, d) - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000);
  if (dias === 0) return { texto: 'Es hoy', tono: 'urgente' };

  const n = Math.abs(dias);
  let cantidad = n;
  let unidad = n === 1 ? 'día' : 'días';
  if (n >= 60) {
    cantidad = Math.round(n / 30);
    unidad = 'meses';
  } else if (n >= 14) {
    cantidad = Math.round(n / 7);
    unidad = 'semanas';
  }
  if (dias < 0) return { texto: `Vencido hace ${cantidad} ${unidad}`, tono: 'vencido' };
  return { texto: `${cantidad === 1 ? 'Falta' : 'Faltan'} ${cantidad} ${unidad}`, tono: dias <= 14 ? 'urgente' : 'a-tiempo' };
};

export const nombreEquipo = (e) => (e.cantidad > 1 ? `${e.cantidad} × ${e.tipo}` : e.tipo);
export const proximaFecha = (e) => e.visits?.[0]?.fecha_programada?.slice(0, 10) || null;
// Primero lo más próximo; los que no tienen fecha pendiente, al final
export const porFecha = (a, b) => (proximaFecha(a) || '9999').localeCompare(proximaFecha(b) || '9999');

// Se elige siempre en el calendario: así no se puede escribir una fecha que no existe
export const CampoFecha = ({ value, onChange, min, max, ariaLabel }) => (
  <CampoFechaHora
    type="date"
    className="mt-input-fecha"
    min={min}
    max={max}
    aria-label={ariaLabel}
    value={value || ''}
    onChange={onChange}
  />
);

// `actual`: URL de la foto ya guardada, se muestra hasta que se elija otra
export const CampoFoto = ({ etiqueta, archivo, actual = null, onChange }) => {
  const vista = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);
  const imagen = vista || actual;

  return (
    <label className={`mt-foto ${imagen ? 'con-foto' : ''}`}>
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { if (e.target.files?.[0]) onChange(e.target.files[0]); e.target.value = ''; }}
      />
      {imagen ? <img src={imagen} alt={etiqueta} /> : <Camera size={20} />}
      <span>{etiqueta}</span>
    </label>
  );
};
