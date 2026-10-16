import OneSignal from 'react-onesignal';

const TIMEOUT_MS = 10000;

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);

// Un solo init para toda la app. Cualquier llamada a OneSignal (login, optIn...) debe esperar
// a esta promesa: si se llama antes de que termine init, el SDK falla con
// "Cannot read properties of undefined (reading 'Qe')" en LoginManager.
let initPromise = null;
let initError = null;

export const iniciarOneSignal = () => {
  if (!initPromise) {
    initPromise = OneSignal.init({
      appId: "67944b3a-0f59-4080-a682-48dd6bee81ce",
      safari_web_id: "web.onesignal.auto.2d34c372-40ef-4eb5-956b-2d525ea9497b",
      allowLocalhostAsSecureOrigin: true,
      // Scope propio para no chocar con el service worker de la PWA (/sw.js en "/")
      serviceWorkerPath: "push/onesignal/OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/push/onesignal/" },
      // El permiso se pide desde el botón "Activar" de la campanita
      promptOptions: { slidedown: { prompts: [] } }
    })
      .then(() => true)
      .catch((err) => {
        initError = String(err?.message || err);
        console.warn("OneSignal initialization blocked/failed gracefully:", err);
        return false;
      });
  }
  return initPromise;
};

// login serializado: evita llamadas simultáneas y repetidas con el mismo usuario
let linkedUserId = null;
let loginChain = Promise.resolve();

export const vincularUsuarioOneSignal = (userId) => {
  if (!userId) return Promise.resolve();
  const id = String(userId);
  loginChain = loginChain.then(async () => {
    if (linkedUserId === id) return;
    if (!(await iniciarOneSignal())) return;
    try {
      await OneSignal.login(id);
      linkedUserId = id;
    } catch (err) {
      console.warn("[OneSignal] Error al asociar usuario:", err);
    }
  });
  return loginChain;
};

export const desvincularUsuarioOneSignal = () => {
  loginChain = loginChain.then(async () => {
    linkedUserId = null;
    if (!(await iniciarOneSignal())) return;
    try {
      await OneSignal.logout();
    } catch (err) {
      console.warn("[OneSignal] Error al cerrar sesión:", err);
    }
  });
  return loginChain;
};

export const estaSuscritoOneSignal = () => {
  try {
    return OneSignal.User?.PushSubscription?.optedIn === true;
  } catch {
    return false;
  }
};

/**
 * Pide permiso, suscribe este dispositivo y lo vincula al usuario (external_id).
 * Devuelve true si el dispositivo quedó suscrito.
 */
export const suscribirPushOneSignal = async (userId) => {
  const ready = await withTimeout(
    iniciarOneSignal(),
    TIMEOUT_MS,
    'OneSignal tardó demasiado en iniciar. Revisa tu conexión y recarga la página.'
  );
  if (!ready) {
    const bloqueado = /failed to load/i.test(initError || '');
    throw new Error(
      bloqueado
        ? 'El navegador bloqueó el script de OneSignal (bloqueador de anuncios o escudo de privacidad, p. ej. Brave Shields). Desactívalo para este sitio y recarga.'
        : `OneSignal no se pudo iniciar: ${initError}`
    );
  }

  await withTimeout(
    (async () => {
      await OneSignal.Notifications.requestPermission();
      await OneSignal.User.PushSubscription.optIn();
      await vincularUsuarioOneSignal(userId);
    })(),
    TIMEOUT_MS,
    'OneSignal no respondió al registrar este dispositivo. Recarga la página e inténtalo de nuevo.'
  );

  return estaSuscritoOneSignal();
};
