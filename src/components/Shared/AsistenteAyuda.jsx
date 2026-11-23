import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, X, Send, RotateCcw, MousePointerClick } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BOTONES_AYUDA, senalarBoton } from './senalarBoton';
import '../../styles/Shared/AsistenteAyuda.css';

// Asistente de ayuda con IA: explica cómo usar la app. Solo el Cliente particular (rol 4) por ahora.
// La conversación vive en sessionStorage (se borra al cerrar la pestaña) y se manda completa al backend.
const ROLES_CON_ASISTENTE = [4];
const RUTAS_SIN_ASISTENTE = ['/', '/completar-perfil', '/sin-cuadrilla', '/registro', '/registro-cliente'];
const MAX_MENSAJES = 20; // el backend acepta hasta 20
const CLAVE = 'asistente_ayuda_conversacion';

const SALUDO = {
  rol: 'assistant',
  texto: '¡Hola! Soy tu asistente. Te ayudo a usar la app: registrar tu propiedad, pedir un servicio, elegir una cotización y más. ¿Qué necesitas?',
};
const SUGERENCIAS = [
  '¿Cómo registro mi propiedad?',
  '¿Cómo pido un servicio?',
  '¿Cómo acepto una cotización?',
];

const leerConversacion = () => {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(CLAVE) || 'null');
    return Array.isArray(guardada) && guardada.length ? guardada : [SALUDO];
  } catch {
    return [SALUDO];
  }
};

// La IA marca el botón a señalar con [[señalar:id]]: se quita del texto y se vuelve un botón "Muéstrame"
const ETIQUETA = /\[\[\s*se[ñn]alar\s*:\s*([a-z-]+)\s*\]\]/gi;
const separarSenales = (texto) => {
  const ids = [...texto.matchAll(ETIQUETA)].map((m) => m[1].toLowerCase()).filter((id) => BOTONES_AYUDA[id]);
  return { limpio: texto.replace(ETIQUETA, '').trim(), ids: [...new Set(ids)].slice(0, 2) };
};

// Negritas (**texto**), listas y saltos de línea, sin meter HTML
const conNegritas = (linea) =>
  linea.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') ? <strong key={i}>{parte.slice(2, -2)}</strong> : parte
  );

const TextoFormateado = ({ texto }) => (
  <>
    {texto.split('\n').filter((l) => l.trim() !== '').map((linea, i) => {
      const item = linea.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      return item
        ? <div key={i} className="asis-item">• {conNegritas(item[1])}</div>
        : <p key={i}>{conNegritas(linea)}</p>;
    })}
  </>
);

const AsistenteAyuda = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState(leerConversacion);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef(null);

  useEffect(() => {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(mensajes)); } catch { /* sin almacenamiento: no pasa nada */ }
  }, [mensajes]);

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, abierto, enviando]);

  const visible = user && ROLES_CON_ASISTENTE.includes(Number(user.role_id))
    && !RUTAS_SIN_ASISTENTE.includes(location.pathname);
  if (!visible) return null;

  const preguntar = async (pregunta) => {
    const limpia = pregunta.trim().slice(0, 1000);
    if (!limpia || enviando) return;
    const nuevos = [...mensajes, { rol: 'user', texto: limpia }];
    setMensajes(nuevos);
    setTexto('');
    setEnviando(true);
    try {
      // El saludo es local: al backend va desde la primera pregunta del usuario
      // Los avisos de error y los de "no encontré el botón" son locales: no van a la IA
      const conversacion = nuevos.filter((m) => !m.error && !m.local);
      const inicio = conversacion.findIndex((m) => m.rol === 'user');
      let historial = conversacion.slice(inicio).slice(-MAX_MENSAJES);
      if (historial[0]?.rol !== 'user') historial = historial.slice(1);
      const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/asistente/ayuda`, {
        mensajes: historial.map(({ rol, texto: t }) => ({ rol, texto: t })),
        pantalla: location.pathname,
      });
      setMensajes((prev) => [...prev, { rol: 'assistant', texto: data.respuesta }]);
    } catch (err) {
      const msg = err.response?.data?.error || 'No pude responder en este momento. Intenta de nuevo.';
      // Se quita la pregunta que falló para que la conversación siga alternando pregunta/respuesta
      setMensajes((prev) => [...prev.slice(0, -1), { rol: 'assistant', texto: msg, error: true }]);
      setTexto(limpia);
    } finally {
      setEnviando(false);
    }
  };

  // Cierra el chat para que se vea la pantalla, lleva al botón y lo ilumina
  const mostrar = async (id) => {
    setAbierto(false);
    const encontrado = await senalarBoton(id, navigate, location.pathname);
    if (!encontrado) {
      const { texto: nombre } = BOTONES_AYUDA[id];
      setMensajes((prev) => [...prev, {
        rol: 'assistant',
        texto: `No encontré el botón **${nombre}** en esta pantalla. Puede que todavía no aparezca (por ejemplo, si aún no tienes publicaciones o técnicos). Revisa los pasos de arriba o pregúntame de otra forma.`,
        local: true,
      }]);
      setAbierto(true);
    }
  };

  const reiniciar = () => setMensajes([SALUDO]);
  const soloSaludo = mensajes.length === 1;

  return (
    <>
      {!abierto && (
        <button type="button" className="asis-boton" onClick={() => setAbierto(true)} aria-label="Abrir asistente de ayuda" title="¿Necesitas ayuda?">
          <Sparkles size={24} />
        </button>
      )}

      {abierto && (
        <div className="asis-panel" role="dialog" aria-label="Asistente de ayuda">
          <div className="asis-encabezado">
            <Sparkles size={18} />
            <span className="asis-titulo">Asistente de ayuda</span>
            {!soloSaludo && (
              <button type="button" onClick={reiniciar} aria-label="Nueva conversación" title="Nueva conversación"><RotateCcw size={17} /></button>
            )}
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar asistente" title="Cerrar"><X size={19} /></button>
          </div>

          <div className="asis-mensajes">
            {mensajes.map((m, i) => {
              if (m.rol === 'user') {
                return <div key={i} className="asis-burbuja asis-usuario">{m.texto}</div>;
              }
              const { limpio, ids } = separarSenales(m.texto);
              return (
                <div key={i} className={`asis-burbuja asis-ia ${m.error ? 'asis-error' : ''}`}>
                  <TextoFormateado texto={limpio} />
                  {ids.map((id) => (
                    <button type="button" key={id} className="asis-mostrar" onClick={() => mostrar(id)}>
                      <MousePointerClick size={15} /> Muéstrame: {BOTONES_AYUDA[id].texto}
                    </button>
                  ))}
                </div>
              );
            })}
            {soloSaludo && (
              <div className="asis-sugerencias">
                {SUGERENCIAS.map((s) => (
                  <button type="button" key={s} onClick={() => preguntar(s)}>{s}</button>
                ))}
              </div>
            )}
            {enviando && <div className="asis-burbuja asis-ia asis-escribiendo"><span /><span /><span /></div>}
            <div ref={finRef} />
          </div>

          <form className="asis-entrada" onSubmit={(e) => { e.preventDefault(); preguntar(texto); }}>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe tu duda..."
              maxLength={1000}
              aria-label="Escribe tu duda"
            />
            <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar"><Send size={18} /></button>
          </form>
          <div className="asis-aviso">Respuestas generadas con IA; pueden tener errores.</div>
        </div>
      )}
    </>
  );
};

export default AsistenteAyuda;
