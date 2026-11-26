// Folio de un trabajo para el cliente de la red (se muestra en el tablero y se puede buscar).

/** Folio que se le muestra al cliente: el número de la orden (#237) o el folio del levantamiento. */
export const folioVisible = (trabajo) => (
  trabajo?.kind === 'trabajo' && trabajo?.id ? `#${trabajo.id}` : String(trabajo?.uid || '').toUpperCase()
);
