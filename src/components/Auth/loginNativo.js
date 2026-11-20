// Inicio de sesión con Google y Apple dentro de la app nativa (iPhone).
// En el WebView no funciona la ventana emergente de Google, así que se usan los SDK nativos
// (@capgo/capacitor-social-login) y al backend se le manda el id_token que devuelven.
import { SocialLogin } from '@capgo/capacitor-social-login';

// Client ID tipo "iOS" de Google Cloud (bundle mx.com.agentesolutions.app)
const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || '';

export const googleNativoConfigurado = Boolean(GOOGLE_IOS_CLIENT_ID);

let inicializando = null;
const inicializar = () => {
  if (!inicializando) {
    const opciones = { apple: {} };
    if (GOOGLE_IOS_CLIENT_ID) {
      opciones.google = { iOSClientId: GOOGLE_IOS_CLIENT_ID, mode: 'online' };
    }
    inicializando = SocialLogin.initialize(opciones).catch((e) => {
      inicializando = null; // permitir reintentar
      throw e;
    });
  }
  return inicializando;
};

// El usuario cerró la ventana de Google o de Apple: no es un error que haya que mostrar
export const fueCancelado = (error) => {
  const texto = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return texto.includes('cancel') || texto.includes('1001') || texto.includes('-5');
};

// Devuelven { token, nombre, apellido }. Apple da el nombre solo la primera vez que el usuario autoriza la app.
export const tokenGoogleNativo = async () => {
  await inicializar();
  const { result } = await SocialLogin.login({
    provider: 'google',
    options: { scopes: ['email', 'profile'], forcePrompt: true },
  });
  if (!result?.idToken) throw new Error('Google no devolvió el token');
  return { token: result.idToken, nombre: result.profile?.givenName || '', apellido: result.profile?.familyName || '' };
};

export const tokenAppleNativo = async () => {
  await inicializar();
  const { result } = await SocialLogin.login({
    provider: 'apple',
    options: { scopes: ['email', 'name'] },
  });
  if (!result?.idToken) throw new Error('Apple no devolvió el token');
  return { token: result.idToken, nombre: result.profile?.givenName || '', apellido: result.profile?.familyName || '' };
};
