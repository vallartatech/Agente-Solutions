import {
  Zap, ShowerHead, Snowflake, PaintRoller, BrickWall, Hammer, KeyRound, SprayCan, Settings,
  Plug, TreePine, Cctv, Refrigerator, Wrench, Flame, Sun, Construction,
} from 'lucide-react';

// Ícono de línea según el nombre de la especialidad: se ve igual en todos los dispositivos
// y no depende del emoji guardado en el catálogo. El orden importa (lo más específico primero).
const REGLAS = [
  [/refriger|c[aá]mara fr[ií]a/i, Refrigerator],
  [/aire|hvac|clima|minisplit/i, Snowflake],
  [/el[eé]ctrodom|l[ií]nea blanca|equipos/i, Plug],
  [/el[eé]ctric/i, Zap],
  [/plomer|hidr[aá]ul|fontaner|tuber/i, ShowerHead],
  [/pintur|impermeab/i, PaintRoller],
  [/alba[nñ]il|remodel|construc|obra/i, BrickWall],
  [/carpinter|mueble|madera/i, Hammer],
  [/cerrajer|seguridad|chapa/i, KeyRound],
  [/limpieza/i, SprayCan],
  [/jardin|exterior|poda/i, TreePine],
  [/redes|cctv|c[aá]mara|internet/i, Cctv],
  [/gas|calentador|boiler/i, Flame],
  [/solar|panel/i, Sun],
  [/herrer|soldad/i, Construction],
  [/multi|general|mantenimiento/i, Settings],
];

export const iconoEspecialidad = (nombre = '') => {
  const regla = REGLAS.find(([patron]) => patron.test(nombre));
  return regla ? regla[1] : Wrench;
};

/** <IconoEspecialidad nombre="Plomería" size={16} /> */
export const IconoEspecialidad = ({ nombre, ...props }) => {
  const Icono = iconoEspecialidad(nombre);
  return <Icono aria-hidden="true" {...props} />;
};
