import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, X, ArrowUp, RotateCcw, MousePointerClick, Home, Wrench, FileCheck2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BOTONES_AYUDA, senalarBoton } from './senalarBoton';
import useBotonArrastrable from './useBotonArrastrable';
import '../../styles/Shared/AsistenteAyuda.css';

// Asistente de ayuda con IA: explica cómo usar la app y consulta los datos del propio usuario
// (trabajos, técnicos, citas, Mercado). Solo el Cliente particular (rol 4) por ahora.
// La conversación la guarda el backend 30 días: aquí se carga al abrir y solo se manda la pregunta nueva.
const ROLES_CON_ASISTENTE = [4];
const RUTAS_SIN_ASISTENTE = ['/', '/completar-perfil', '/sin-cuadrilla', '/registro', '/registro-cliente'];
const API = import.meta.env.VITE_API_BASE_URL;

const SALUDO = {
  rol: 'assistant',
  texto: '¡Hola! Soy tu asistente. Te ayudo a usar la app y también puedo decirte tus últimos trabajos, técnicos, citas y cotizaciones. ¿Qué necesitas?',
};
const SUGERENCIAS = [
  { texto: '¿Cómo pido un servicio?', icono: Wrench },
  { texto: '¿Cuál fue mi último trabajo?', icono: Home },
  { texto: '¿Tengo cotizaciones pendientes?', icono: FileCheck2 },
];
const MAX_CARACTERES = 1000;
const ALTO_MAX_ENTRADA = 132; // ~5 renglones; después la caja se desplaza por dentro

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
  const [mensajes, setMensajes] = useState([SALUDO]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Usuario cuya conversación ya se cargó (null = falta cargarla)
  const [cargadaDe, setCargadaDe] = useState(null);
  const finRef = useRef(null);
  const entradaRef = useRef(null);
  // El botón se puede mover: mantener presionado (celular) o arrastrar (computadora)
  const arrastre = useBotonArrastrable('asistente_boton_posicion');

  // La caja crece hacia arriba conforme se escribe, hasta ALTO_MAX_ENTRADA
  useEffect(() => {
    const el = entradaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, ALTO_MAX_ENTRADA)}px`;
    el.style.overflowY = el.scrollHeight > ALTO_MAX_ENTRADA ? 'auto' : 'hidden';
  }, [texto, abierto]);

  const puedeUsarlo = !!user && ROLES_CON_ASISTENTE.includes(Number(user.role_id));

  // Al cambiar de usuario o cerrar sesión se olvida la conversación de la pantalla
  useEffect(() => {
    setMensajes([SALUDO]);
    setCargadaDe(null);
    setAbierto(false);
    // Copia vieja de cuando la conversación vivía en el navegador
    try { sessionStorage.removeItem('asistente_ayuda_conversacion'); } catch { /* sin almacenamiento */ }
  }, [user?.id]);

  // La conversación guardada se carga la primera vez que se abre el panel
  useEffect(() => {
    if (!abierto || !puedeUsarlo || cargadaDe === user.id) return;
    let vigente = true;
    const id = user.id;
    axios.get(`${API}/asistente/conversacion`)
      .then(({ data }) => {
        if (!vigente) return;
        const guardados = Array.isArray(data?.mensajes) ? data.mensajes : [];
        // Si ya preguntó algo mientras cargaba, se conserva lo de la pantalla
        setMensajes((prev) => (prev.length > 1 ? prev : [SALUDO, ...guardados]));
        setCargadaDe(id);
      })
      .catch((err) => {
        console.warn('No se pudo cargar la conversación del asistente', err);
        if (vigente) setCargadaDe(id);
      });
    return () => { vigente = false; };
  }, [abierto, puedeUsarlo, cargadaDe, user?.id]);

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, abierto, enviando]);

  const visible = puedeUsarlo && !RUTAS_SIN_ASISTENTE.includes(location.pathname);
  if (!visible) return null;

  const preguntar = async (pregunta) => {
    const limpia = pregunta.trim().slice(0, MAX_CARACTERES);
    if (!limpia || enviando) return;
    setMensajes((prev) => [...prev, { rol: 'user', texto: limpia }]);
    setTexto('');
    setEnviando(true);
    try {
      // El historial lo arma el backend con lo guardado; aquí solo va la pregunta nueva.
      // Los avisos de error y los de "no encontré el botón" son locales: no se guardan ni van a la IA
      const { data } = await axios.post(`${API}/asistente/ayuda`, {
        pregunta: limpia,
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

  // "Nueva conversación": también se borra lo guardado en el servidor
  const reiniciar = async () => {
    setMensajes([SALUDO]);
    try {
      await axios.delete(`${API}/asistente/conversacion`);
    } catch (err) {
      console.warn('No se pudo borrar la conversación del asistente', err);
    }
  };
  const soloSaludo = mensajes.length === 1;

  return (
    <>
      {!abierto && (
        <button
          type="button"
          ref={arrastre.ref}
          className={`asis-boton ${arrastre.moviendo ? 'is-moviendo' : ''}`}
          style={arrastre.style}
          onPointerDown={arrastre.onPointerDown}
          onClickCapture={arrastre.onClickCapture}
          onClick={() => setAbierto(true)}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Abrir asistente de ayuda (mantén presionado para moverlo)"
          title="¿Necesitas ayuda? Arrástralo para moverlo"
        >
          <Sparkles size={24} />
          <span className="asis-boton-txt">Ayuda</span>
        </button>
      )}

      {abierto && (
        <div className="asis-panel" role="dialog" aria-label="Asistente de ayuda">
          <div className="asis-encabezado">
            <span className="asis-avatar is-grande"><Sparkles size={18} /></span>
            <div className="asis-titulos">
              <span className="asis-titulo">Asistente de ayuda</span>
              <span className="asis-subtitulo">Te ayudo con la app y tus servicios</span>
            </div>
            {!soloSaludo && (
              <button type="button" className="asis-icono-btn" onClick={reiniciar} aria-label="Nueva conversación" title="Nueva conversación"><RotateCcw size={16} /></button>
            )}
            <button type="button" className="asis-icono-btn" onClick={() => setAbierto(false)} aria-label="Cerrar asistente" title="Cerrar"><X size={18} /></button>
          </div>

          <div className="asis-mensajes">
            {mensajes.map((m, i) => {
              if (m.rol === 'user') {
                return <div key={i} className="asis-burbuja asis-usuario">{m.texto}</div>;
              }
              const { limpio, ids } = separarSenales(m.texto);
              return (
                <div key={i} className="asis-fila-ia">
                  <span className="asis-avatar"><Sparkles size={13} /></span>
                  <div className={`asis-burbuja asis-ia ${m.error ? 'asis-error' : ''}`}>
                    <TextoFormateado texto={limpio} />
                    {ids.map((id) => (
                      <button type="button" key={id} className="asis-mostrar" onClick={() => mostrar(id)}>
                        <MousePointerClick size={15} /> Muéstrame: {BOTONES_AYUDA[id].texto}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {soloSaludo && (
              <div className="asis-sugerencias">
                {SUGERENCIAS.map(({ texto: s, icono: Icono }) => (
                  <button type="button" key={s} onClick={() => preguntar(s)}>
                    <span className="asis-sug-ico"><Icono size={14} /></span>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {enviando && (
              <div className="asis-fila-ia">
                <span className="asis-avatar"><Sparkles size={13} /></span>
                <div className="asis-burbuja asis-ia asis-escribiendo"><span /><span /><span /></div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          <form className="asis-entrada" onSubmit={(e) => { e.preventDefault(); preguntar(texto); }}>
            <div className="asis-caja">
              {/* Crece hacia arriba hasta ~5 renglones; Enter envía y Shift+Enter hace un salto de línea */}
              <textarea
                ref={entradaRef}
                rows={1}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    preguntar(texto);
                  }
                }}
                placeholder="Escribe tu duda..."
                maxLength={MAX_CARACTERES}
                aria-label="Escribe tu duda"
              />
              <button type="submit" className="asis-enviar" disabled={enviando || !texto.trim()} aria-label="Enviar">
                <ArrowUp size={18} />
              </button>
            </div>
            {texto.length > MAX_CARACTERES * 0.8 && (
              <span className={`asis-contador ${texto.length >= MAX_CARACTERES ? 'al-limite' : ''}`}>
                {texto.length}/{MAX_CARACTERES}
              </span>
            )}
          </form>
          <div className="asis-aviso">Respuestas generadas con IA; pueden tener errores.</div>
        </div>
      )}
    </>
  );
};

export default AsistenteAyuda;
