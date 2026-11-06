// CLABE interbancaria (18 dígitos). Misma validación que el backend (PerfilProfesional::clabeValida).

// Clave de banco (primeros 3 dígitos de la CLABE, catálogo de Banxico)
const BANCOS = {
  '002': 'Banamex', '006': 'Bancomext', '009': 'Banobras', '012': 'BBVA México', '014': 'Santander',
  '019': 'Banjército', '021': 'HSBC', '030': 'BanBajío', '036': 'Inbursa', '042': 'Mifel',
  '044': 'Scotiabank', '058': 'Banregio', '059': 'Invex', '060': 'Bansi', '062': 'Afirme',
  '072': 'Banorte', '106': 'Bank of America', '113': 'Ve por Más', '127': 'Banco Azteca',
  '130': 'Compartamos', '132': 'Multiva', '136': 'Intercam', '137': 'BanCoppel', '145': 'Bbase',
  '152': 'Bancrea', '166': 'Banco del Bienestar', '638': 'Nu México', '646': 'STP',
  '722': 'Mercado Pago', '728': 'Spin by OXXO',
};

export const soloDigitos = (valor) => String(valor || '').replace(/\D/g, '');

/** Dígito verificador oficial: ponderaciones 3, 7, 1 sobre los primeros 17 dígitos, módulo 10. */
export const clabeValida = (valor) => {
  const clabe = soloDigitos(valor);
  if (clabe.length !== 18) return false;
  const pesos = [3, 7, 1];
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += (Number(clabe[i]) * pesos[i % 3]) % 10;
  return (10 - (suma % 10)) % 10 === Number(clabe[17]);
};

/** Nombre del banco según la CLABE (o null si no se reconoce). */
export const bancoDeClabe = (valor) => BANCOS[soloDigitos(valor).slice(0, 3)] || null;

/** "072 910 01195878544 5": banco, plaza, cuenta y verificador, para leerla fácil. */
export const formatoClabe = (valor) => {
  const c = soloDigitos(valor).slice(0, 18);
  return [c.slice(0, 3), c.slice(3, 6), c.slice(6, 17), c.slice(17)].filter(Boolean).join(' ');
};

/** Mensaje para mostrar mientras escribe. */
export const estadoClabe = (valor) => {
  const c = soloDigitos(valor);
  if (!c) return { tipo: 'vacio', texto: '' };
  if (c.length < 18) return { tipo: 'pendiente', texto: `${c.length} de 18 dígitos` };
  if (c.length > 18) return { tipo: 'error', texto: 'La CLABE tiene 18 dígitos exactos.' };
  return clabeValida(c)
    ? { tipo: 'ok', texto: bancoDeClabe(c) ? `CLABE válida · ${bancoDeClabe(c)}` : 'CLABE válida' }
    : { tipo: 'error', texto: 'La CLABE no es válida: revisa que no falte o sobre un dígito.' };
};

/** RFC de persona física (13) o moral (12). */
export const rfcValido = (valor) => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(String(valor || '').toUpperCase().trim());
