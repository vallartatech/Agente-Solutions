// Agente Solutions (uso interno) y Agente Market (la red) son entornos separados.
// Root ve todo, pero trabaja desde las pantallas internas.
//   Interno: 0 Root, 1 Admin, 2 Técnico Agente, 3 Cliente
//   Red:     4 Cliente particular, 5 Gestor inmobiliario, 6 Técnico independiente,
//            7 Contratista / Líder, 8 Técnico de cuadrilla
export const ROLES_INTERNOS = [0, 1, 2, 3];
export const ROLES_RED = [4, 5, 6, 7, 8];

export const esRoot = (user) => Number(user?.role_id) === 0;
export const esRed = (user) => ROLES_RED.includes(Number(user?.role_id));
export const esInterno = (user) => !esRed(user);
// Clientes de la red: Reportes, Cotizaciones y Levantamientos comparten un botón del menú
// Solo los técnicos de la red editan reportes; los demás roles de la red los consultan
export const esTecnicoRed = (user) => [6, 8].includes(Number(user?.role_id));
export const usaSelectorRed = (user) => [4, 5, 7].includes(Number(user?.role_id));
