// Agente Market: cláusula de intermediario. La app solo conecta a clientes con técnicos, no cobra comisiones
// y los pagos y cualquier problema son directamente entre ellos. Técnicos y clientes de la red (nuevos y ya
// registrados) la aceptan una vez; mientras no la acepten, esta ventana tapa la app. El botón se habilita
// solo con la casilla marcada.
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Handshake, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { esRed, esTecnicoRed } from '../../utils/entorno';
import '../../styles/Shared/TerminosMercado.css';

const API = import.meta.env.VITE_API_BASE_URL;
// Páginas públicas que se pueden leer sin aceptar (se abren desde la propia ventana o desde la tienda)
const RUTAS_LIBRES = ['/privacidad', '/eliminar-cuenta'];
const claveAceptado = (id) => `terminos_mercado_ok_${id}`;

const encabezados = () => {
  const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TerminosMercado = () => {
  const { user, logoutGlobal } = useAuth();
  const { pathname } = useLocation();
  const [pendiente, setPendiente] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const aplica = Boolean(user?.id) && esRed(user);

  useEffect(() => {
    if (!aplica) { setPendiente(false); return undefined; }
    try {
      if (localStorage.getItem(claveAceptado(user.id)) === '1') { setPendiente(false); return undefined; }
    } catch { /* sin almacenamiento: se consulta al backend */ }
    let vigente = true;
    axios.get(`${API}/mercado/terminos`, { headers: encabezados() })
      .then((res) => {
        if (!vigente) return;
        if (res.data?.aceptado) {
          try { localStorage.setItem(claveAceptado(user.id), '1'); } catch { /* nada que guardar */ }
          setPendiente(false);
        } else {
          setPendiente(true);
        }
      })
      .catch(() => { /* sin conexión: se vuelve a revisar al abrir la app */ });
    return () => { vigente = false; };
  }, [aplica, user?.id]);

  if (!aplica || !pendiente || RUTAS_LIBRES.some((r) => pathname.startsWith(r))) return null;

  const tecnico = esTecnicoRed(user);
  const otro = tecnico ? 'el cliente' : 'el técnico';

  const aceptar = async () => {
    if (!acepto) return;
    setEnviando(true);
    setError('');
    try {
      await axios.post(`${API}/mercado/terminos`, { acepto: true }, { headers: encabezados() });
      try { localStorage.setItem(claveAceptado(user.id), '1'); } catch { /* nada que guardar */ }
      setPendiente(false);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar tu aceptación. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="tm-fondo" role="dialog" aria-modal="true" aria-labelledby="tm-titulo">
      <div className="tm-tarjeta">
        <div className="tm-encabezado">
          <span className="tm-icono"><Handshake size={22} /></span>
          <h2 id="tm-titulo">Agente Market es solo una plataforma de contacto</h2>
        </div>

        <div className="tm-cuerpo">
          <p>
            Agente Market es una herramienta tecnológica que conecta a clientes con técnicos y proveedores
            independientes. <strong>No presta los servicios de mantenimiento o reparación</strong> y no es
            empleador, socio ni representante de ningún técnico.
          </p>
          <ul>
            <li>
              <strong>Sin comisiones:</strong> Agente Market <strong>no cobra comisiones</strong> por los trabajos
              {tecnico ? ' que consigas ni retiene parte de tus pagos.' : ' que contrates ni cobra cargos sobre el precio del técnico.'}
            </li>
            <li>
              <strong>El pago es entre {tecnico ? 'tú y el cliente' : 'tú y el técnico'}:</strong> el precio, la forma
              de pago y el cobro de cada trabajo se acuerdan <strong>directamente entre {tecnico ? 'el cliente y tú' : 'el técnico y tú'}</strong>.
              Agente Market no recibe, administra ni garantiza esos pagos.
            </li>
            <li>
              <strong>Responsabilidad:</strong> Agente Market <strong>no se hace responsable</strong> de la calidad,
              los resultados, los daños, los retrasos, los incumplimientos, los adeudos ni ningún otro problema o
              desacuerdo entre el técnico y el cliente. Cada parte responde por sus propias obligaciones.
            </li>
            {tecnico ? (
              <li>
                <strong>Tus obligaciones:</strong> eres responsable de tus trabajos, de tus herramientas y
                materiales, de tus impuestos y de las facturas que emitas.
              </li>
            ) : (
              <li>
                <strong>Tu decisión:</strong> tú eliges al técnico, revisas su perfil y calificaciones y acuerdas
                con él las condiciones del trabajo.
              </li>
            )}
          </ul>
        </div>

        <label className="tm-casilla">
          <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
          <span>
            Entiendo y acepto que Agente Market solo facilita el contacto, que no cobra comisiones y que cualquier
            pago o problema derivado de un trabajo es directamente entre {otro} y yo.
          </span>
        </label>

        {error && <div className="tm-error" role="alert">{error}</div>}

        <div className="tm-acciones">
          <button type="button" className="tm-salir" onClick={() => { logoutGlobal(); window.location.href = '/'; }}>
            <LogOut size={16} /> Cerrar sesión
          </button>
          <button type="button" className="tm-aceptar" onClick={aceptar} disabled={!acepto || enviando}>
            {enviando ? <Loader2 size={16} className="tm-girar" /> : <Handshake size={16} />} Aceptar y continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TerminosMercado;
