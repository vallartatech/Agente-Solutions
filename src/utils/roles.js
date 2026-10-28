// Nombre visible de cada rol. La clave es roles.id en la BD (root, admin, technician,
// client, market_*); el código compara por id, así que aquí solo cambia el texto.
export const NOMBRES_ROLES = {
  0: "ROOT",
  1: "ADMINISTRADOR",
  2: "TÉCNICO",
  3: "CLIENTE",
  4: "CLIENTE PARTICULAR",
  5: "GESTOR INMOBILIARIO",
  6: "TÉCNICO INDEPENDIENTE",
  7: "CONTRATISTA / LÍDER",
  8: "TÉCNICO DE CUADRILLA"
};

export const nombreRol = (roleId) => NOMBRES_ROLES[Number(roleId)] || "USUARIO";
