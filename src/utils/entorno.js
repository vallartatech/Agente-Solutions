// Agente Solutions (uso interno) y Agente Market (la red) son entornos separados.
// Root ve todo, pero trabaja desde las pantallas internas.
//   Interno: 0 Root, 1 Admin, 2 Técnico Agente, 3 Cliente
//   Red:     4 Cliente particular, 5 Gestor inmobiliario, 6 Técnico independiente,
//            7 Contratista / Líder, 8 Técnico de cuadrilla, 9 Técnico de cuadrilla con acceso a la red
export const ROLES_INTERNOS = [0, 1, 2, 3];
export const ROLES_RED = [4, 5, 6, 7, 8, 9];

export const esRoot = (user) => Number(user?.role_id) === 0;
export const esRed = (user) => ROLES_RED.includes(Number(user?.role_id));
export const esInterno = (user) => !esRed(user);
// Técnicos de la red: 6 Técnico independiente, 7 Contratista (técnico con una cuadrilla a su cargo),
// 8 Técnico de cuadrilla (solo recibe lo que le asigna su contratista) y 9 Técnico de cuadrilla con acceso a la red
export const ROLES_TECNICO_RED = [6, 7, 8, 9];
// Ven el Mercado abierto y cotizan (el 8 no)
export const ROLES_QUE_COTIZAN = [6, 7, 9];
// Todos los que trabajan como técnicos, incluido el Técnico Agente interno (2)
export const ROLES_TECNICO = [2, ...ROLES_TECNICO_RED];
// Clientes de la red: 4 Cliente particular, 5 Gestor inmobiliario
export const ROLES_CLIENTE_RED = [4, 5];

// Solo los técnicos de la red editan reportes; los demás roles de la red los consultan
export const esTecnicoRed = (user) => ROLES_TECNICO_RED.includes(Number(user?.role_id));
// El contratista es un técnico con cuadrilla: además de lo del técnico, administra a su equipo
export const esContratista = (user) => Number(user?.role_id) === 7;
// Clientes de la red: Reportes, Cotizaciones y Levantamientos comparten un botón del menú
export const usaSelectorRed = (user) => ROLES_CLIENTE_RED.includes(Number(user?.role_id));
// Ve el Mercado y cotiza: el técnico de cuadrilla (8) no, su contratista le asigna los trabajos
export const cotizaEnRed = (user) => ROLES_QUE_COTIZAN.includes(Number(user?.role_id));
// Técnico de cuadrilla (8, y 9 con acceso a la red)
export const esCuadrilla = (user) => [8, 9].includes(Number(user?.role_id));
// Quedó sin cuadrilla (lo quitaron o no aceptaron su registro): solo ve su pantalla de opciones
export const estaSinCuadrilla = (user) => ['sin_cuadrilla', 'rechazado_cuadrilla'].includes(user?.approval_status);
