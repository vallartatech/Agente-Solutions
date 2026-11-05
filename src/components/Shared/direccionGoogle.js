// Convierte un punto del mapa en los campos de dirección del formulario de propiedades
// (geocodificación inversa de Google Maps). Requiere la "Geocoding API" activa en la llave.
// Google no da cruzamientos y en Mérida a veces no tiene el número o la colonia: el usuario verifica.

const TIEMPO_MAXIMO = 8000;

const componente = (resultados, tipos) => {
  for (const r of resultados) {
    const c = r.address_components?.find((ac) => tipos.some((t) => ac.types.includes(t)));
    if (c) return c.long_name;
  }
  return '';
};

// "C. 69" → "Calle 69" (Google abrevia las calles numeradas de Mérida).
// Las calles sin nombre ("C. Ninguno", "Unnamed Road") se dejan vacías para llenarlas a mano.
const limpiarCalle = (calle) => {
  if (/ningun|unnamed|sin nombre/i.test(calle)) return '';
  return calle.replace(/^C\.\s*/i, 'Calle ').trim();
};

export const direccionDesdeResultados = (resultados = []) => {
  if (!resultados.length) return null;
  // El resultado más preciso primero; los demás solo completan lo que le falte
  const precisos = ['street_address', 'premise', 'subpremise'];
  const ordenados = [...resultados].sort(
    (a, b) => Number(precisos.some((t) => b.types?.includes(t))) - Number(precisos.some((t) => a.types?.includes(t)))
  );

  const direccion = {
    estado: componente(ordenados, ['administrative_area_level_1']),
    municipio: componente(ordenados, ['locality']) || componente(ordenados, ['administrative_area_level_2']),
    colonia: componente(ordenados, ['sublocality_level_1', 'sublocality', 'neighborhood']),
    calle: limpiarCalle(componente(ordenados.slice(0, 1), ['route'])),
    numero: componente(ordenados.slice(0, 1), ['street_number']),
  };
  return Object.values(direccion).some(Boolean) ? direccion : null;
};

/**
 * @returns {Promise<{ direccion: object|null, error: null|'sin_api'|'sin_resultados'|'fallo' }>}
 */
export const obtenerDireccion = ({ lat, lng }) => new Promise((resolve) => {
  const Geocoder = window.google?.maps?.Geocoder;
  if (!Geocoder) {
    resolve({ direccion: null, error: 'fallo' });
    return;
  }

  const limite = setTimeout(() => resolve({ direccion: null, error: 'fallo' }), TIEMPO_MAXIMO);
  new Geocoder().geocode({ location: { lat, lng }, language: 'es', region: 'mx' }, (resultados, estado) => {
    clearTimeout(limite);
    if (estado === 'OK') {
      const direccion = direccionDesdeResultados(resultados);
      resolve({ direccion, error: direccion ? null : 'sin_resultados' });
    } else if (estado === 'ZERO_RESULTS') {
      resolve({ direccion: null, error: 'sin_resultados' });
    } else if (estado === 'REQUEST_DENIED') {
      // La llave no tiene activa la Geocoding API
      resolve({ direccion: null, error: 'sin_api' });
    } else {
      resolve({ direccion: null, error: 'fallo' });
    }
  });
});
