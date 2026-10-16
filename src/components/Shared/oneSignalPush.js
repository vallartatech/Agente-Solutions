import OneSignal from 'react-onesignal';

const TIMEOUT_MS = 10000;

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);

/**
 * Suscribe este dispositivo en OneSignal y lo vincula al usuario (external_id).
 * Si OneSignal no se inicializó (p. ej. la app no tiene Web Push configurado),
 * sus promesas nunca se resuelven; por eso todo va con tiempo límite.
 * Devuelve true si el dispositivo quedó suscrito.
 */
export const suscribirPushOneSignal = async (userId) => {
  if (window.__agenteOneSignalInitError) {
    throw new Error(`OneSignal no se pudo iniciar: ${window.__agenteOneSignalInitError}`);
  }

  await withTimeout(
    (async () => {
      await OneSignal.Notifications.requestPermission();
      await OneSignal.User.PushSubscription.optIn();
      if (userId) await OneSignal.login(String(userId));
    })(),
    TIMEOUT_MS,
    'OneSignal no respondió. Revisa que la app de OneSignal tenga configurada la plataforma Web con el dominio de este sitio.'
  );

  return OneSignal.User?.PushSubscription?.optedIn === true;
};
