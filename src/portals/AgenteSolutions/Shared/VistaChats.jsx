import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  MessageCircle, Search, Plus, ArrowLeft, Users, Send, X, Check, CheckCheck,
  UserPlus, LogOut, Pencil, Loader2, UserMinus, Info, Smile, Paperclip, Trash2, Palette, Ban, ImagePlus
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
import { useAuth } from '../../../context/AuthContext';
import { comprimirImagen } from '../../../components/Shared/comprimirImagen';
import { avisarChatsActualizados } from '../../../components/Shared/chatService';
import '../../../styles/AgenteSolutions/Shared/VistaChats.css';

const API = import.meta.env.VITE_API_BASE_URL;
const POLL_CONVERSACION = 3000;
const POLL_LISTA = 8000;
const MAX_ARCHIVO_MB = 12; // límite de subida del servidor

// Stickers: incluir un tipo que no es imagen hace que Android abra el explorador de archivos
// (y no la galería), para poder entrar a la carpeta de stickers de WhatsApp.
const ACCEPT_STICKERS = 'image/webp,image/png,image/gif,image/jpeg,.webp,.png,.gif,.jpg,.jpeg,application/octet-stream';
const TIPO_POR_EXTENSION = { webp: 'image/webp', png: 'image/png', gif: 'image/gif', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

// Devuelve el archivo como imagen válida para sticker, o null si no lo es.
// Algunos exploradores entregan los .webp sin tipo: se corrige por la extensión.
const comoImagenSticker = (f) => {
  const tipo = TIPO_POR_EXTENSION[(f.name.split('.').pop() || '').toLowerCase()];
  if (f.type && Object.values(TIPO_POR_EXTENSION).includes(f.type)) return f;
  if (!tipo) return null;
  return new File([f], f.name, { type: tipo, lastModified: f.lastModified });
};

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘',
  '😋', '😛', '😜', '🤪', '🤗', '🤭', '🤫', '🤔', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
  '😌', '😔', '😪', '😴', '😷', '🤒', '🤕', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
  '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
  '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '💀', '💩', '🤡', '👻', '👽',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '✋', '👋', '👏', '🙌',
  '🙏', '💪', '🫡', '🤝', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💯', '🔥', '✨', '⭐',
  '🎉', '🎊', '✅', '❌', '⚠️', '❓', '❗', '📌', '📍', '📅', '⏰', '📷', '📞', '💬', '🏠', '🏢',
  '🔧', '🔨', '🛠️', '⚡', '💧', '🚿', '🚽', '❄️', '🌡️', '🧹', '🚗', '🚚', '☕', '🍕', '🌮', '🍺'
];

// Fondos predefinidos del chat (el backend valida estas claves)
const FONDOS = {
  default: { nombre: 'Predeterminado', css: 'radial-gradient(circle at 20% 10%, rgba(242,101,34,0.05), transparent 40%), #0b1120' },
  noche: { nombre: 'Noche', css: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)' },
  atardecer: { nombre: 'Atardecer', css: 'linear-gradient(160deg, #431407 0%, #7c2d12 45%, #1e1b4b 100%)' },
  oceano: { nombre: 'Océano', css: 'linear-gradient(160deg, #082f49 0%, #0c4a6e 100%)' },
  bosque: { nombre: 'Bosque', css: 'linear-gradient(160deg, #052e16 0%, #14532d 100%)' },
  naranja: { nombre: 'Agente', css: 'linear-gradient(160deg, #431407 0%, #c2410c 100%)' },
  claro: { nombre: 'Claro', css: 'linear-gradient(160deg, #e7e2d9 0%, #d6cfc4 100%)' },
  puntos: { nombre: 'Puntos', css: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px) 0 0 / 18px 18px, #0b1120' },
};
const cssFondo = (f) => (FONDOS[f]?.css ?? (f?.startsWith('http')
  ? `linear-gradient(rgba(2,6,23,0.35), rgba(2,6,23,0.35)), url("${f}") center / cover`
  : FONDOS.default.css));

const iniciales = (nombre) => (nombre || '?').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '');
const claveDia = (iso) => (iso ? new Date(iso).toDateString() : '');

const etiquetaDia = (iso) => {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return 'Hoy';
  if (d.toDateString() === ayer.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
};

// Hora o fecha corta para la lista de chats
const cuandoCorto = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return hora(iso);
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

// "En línea" / "últ. vez hoy a las 17:20"
const textoPresencia = (p) => {
  if (!p) return '';
  if (p.en_linea) return 'En línea';
  if (!p.ultima_vez) return '';
  const etiqueta = etiquetaDia(p.ultima_vez);
  const dia = etiqueta === 'Hoy' ? 'hoy' : etiqueta === 'Ayer' ? 'ayer' : `el ${new Date(p.ultima_vez).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;
  return `últ. vez ${dia} a las ${hora(p.ultima_vez)}`;
};

// Un mensaje de 1 a 3 emojis se muestra grande, sin burbuja (como en WhatsApp)
const esEmojiGrande = (texto) => {
  if (!texto || texto.length > 24) return false;
  const sinEspacios = texto.replace(/\s/g, '');
  if (!/^(\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️)+$/u.test(sinEspacios)) return false;
  const cuantos = typeof Intl !== 'undefined' && Intl.Segmenter
    ? [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(sinEspacios)].length
    : sinEspacios.length;
  return cuantos <= 3;
};

const previaDe = (u) => {
  if (!u) return '';
  if (u.tipo === 'deleted') return '🚫 Mensaje eliminado';
  if (u.tipo === 'sticker') return '💟 Sticker';
  if (u.tipo === 'video') return u.texto ? `🎥 ${u.texto}` : '🎥 Video';
  if (u.tipo === 'image') return u.texto ? `📷 ${u.texto}` : '📷 Foto';
  return u.texto || '';
};

const Avatar = ({ foto, nombre, grupo = false, size = 44, enLinea = false }) => (
  <span className={`vch-avatar ${grupo ? 'grupo' : ''}`} style={{ width: size, height: size }}>
    {grupo ? <Users size={size * 0.45} /> : foto ? <img src={foto} alt="" /> : iniciales(nombre)}
    {enLinea && <span className="vch-en-linea" aria-label="En línea" />}
  </span>
);

// Selector de personas (nuevo chat y agregar al grupo)
const SelectorPersonas = ({ titulo, contactos, excluir = [], modoNuevo = false, enviando, onConfirmar, onCerrar }) => {
  const [busqueda, setBusqueda] = useState('');
  const [elegidos, setElegidos] = useState([]);
  const [nombreGrupo, setNombreGrupo] = useState('');

  const disponibles = contactos.filter(c => !excluir.includes(c.id));
  const q = sinAcentos(busqueda.trim());
  const filtrados = q ? disponibles.filter(c => sinAcentos(c.nombre).includes(q)) : disponibles;
  const toggle = (id) => setElegidos(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const esGrupo = modoNuevo && elegidos.length > 1;

  const textoBoton = !elegidos.length
    ? 'Elige al menos a una persona'
    : modoNuevo
      ? (esGrupo ? `Crear grupo (${elegidos.length + 1})` : 'Abrir chat')
      : `Agregar (${elegidos.length})`;

  return createPortal(
    <div className="vch-overlay" onClick={() => !enviando && onCerrar()}>
      <div className="vch-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="vch-modal-head">
          <h3>{titulo}</h3>
          <button type="button" className="vch-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        {elegidos.length > 0 && (
          <div className="vch-elegidos">
            {elegidos.map(id => {
              const c = contactos.find(x => x.id === id);
              return (
                <button type="button" key={id} className="vch-elegido" onClick={() => toggle(id)} title="Quitar">
                  {c?.nombre} <X size={12} />
                </button>
              );
            })}
          </div>
        )}

        {esGrupo && (
          <input
            className="vch-input"
            placeholder="Nombre del grupo (opcional)"
            maxLength={80}
            value={nombreGrupo}
            onChange={e => setNombreGrupo(e.target.value)}
          />
        )}

        <label className="vch-buscar">
          <Search size={16} />
          <input type="search" placeholder="Buscar admin o técnico" value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
        </label>

        <ul className="vch-personas">
          {filtrados.map(c => {
            const sel = elegidos.includes(c.id);
            return (
              <li key={c.id}>
                <button type="button" className={`vch-persona ${sel ? 'sel' : ''}`} onClick={() => toggle(c.id)}>
                  <Avatar foto={c.foto} nombre={c.nombre} size={36} />
                  <span className="vch-persona-nombre">{c.nombre}</span>
                  <span className={`vch-rol ${c.rol === 'Técnico' ? 'tec' : ''}`}>{c.rol}</span>
                  <span className="vch-check">{sel && <Check size={14} strokeWidth={3} />}</span>
                </button>
              </li>
            );
          })}
          {!filtrados.length && <li className="vch-vacio-lista">{contactos.length ? 'Nadie coincide con la búsqueda' : 'Cargando equipo…'}</li>}
        </ul>

        <button
          type="button"
          className="vch-btn-primary"
          disabled={!elegidos.length || enviando}
          onClick={() => onConfirmar(elegidos, nombreGrupo.trim())}
        >
          {enviando ? <Loader2 size={17} className="vch-spin" /> : null} {textoBoton}
        </button>
      </div>
    </div>,
    document.body
  );
};

const VistaChats = () => {
  const { id: chatIdParam } = useParams();
  const chatId = chatIdParam ? Number(chatIdParam) : null;
  const navigate = useNavigate();
  const { user } = useAuth();
  const yo = Number(user?.id);

  // ── Lista de chats ──
  const [chats, setChats] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargarLista = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/chats`);
      setChats(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error cargando chats:', err);
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    cargarLista();
    const t = setInterval(cargarLista, POLL_LISTA);
    return () => clearInterval(t);
  }, [cargarLista]);

  const chatsFiltrados = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return q ? chats.filter(c => sinAcentos(c.titulo).includes(q)) : chats;
  }, [chats, busqueda]);

  // ── Preferencias: fondo del chat ──
  const [fondo, setFondo] = useState('default');
  const [fondoAbierto, setFondoAbierto] = useState(false);
  const [guardandoFondo, setGuardandoFondo] = useState(false);

  useEffect(() => {
    axios.get(`${API}/chats/preferencias`).then(res => setFondo(res.data?.fondo || 'default')).catch(() => {});
  }, []);

  // Solo fondos predefinidos: subir imagen está desactivado por ahora para no llenar el almacenamiento
  const guardarFondo = async ({ clave }) => {
    setGuardandoFondo(true);
    try {
      const data = new FormData();
      data.append('fondo', clave);
      const res = await axios.post(`${API}/chats/fondo`, data);
      setFondo(res.data.fondo || 'default');
      setFondoAbierto(false);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo cambiar el fondo', text: err.response?.data?.error || 'Intenta de nuevo.' });
    } finally {
      setGuardandoFondo(false);
    }
  };

  // ── Conversación abierta ──
  const [conv, setConv] = useState(null);
  const [cargandoConv, setCargandoConv] = useState(false);
  const [errorConv, setErrorConv] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(0); // cuántos envíos hay en curso
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [visor, setVisor] = useState(null);
  const [menuMensaje, setMenuMensaje] = useState(null); // id del mensaje propio con acciones abiertas
  const [panel, setPanel] = useState(null); // 'emojis' | 'stickers' | null

  const mensajesRef = useRef(null);
  const archivoRef = useRef(null);
  const textoRef = useRef(null);
  const pegadoAbajo = useRef(true);
  const scrollAntes = useRef(null);
  const convIdRef = useRef(null);

  // Último mensaje ya guardado (los que se están enviando tienen id temporal)
  const ultimoId = useMemo(() => {
    const reales = (conv?.mensajes || []).filter(m => !m.temporal);
    return reales.length ? reales[reales.length - 1].id : 0;
  }, [conv?.mensajes]);

  const bajarAlFinal = () => {
    const el = mensajesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // Abrir un chat
  useEffect(() => {
    convIdRef.current = chatId;
    setConv(null);
    setErrorConv('');
    setTexto('');
    setPanel(null);
    setMenuMensaje(null);
    if (!chatId) return;
    let cancelado = false;
    setCargandoConv(true);
    axios.get(`${API}/chats/${chatId}/mensajes`)
      .then(res => {
        if (cancelado) return;
        pegadoAbajo.current = true;
        setConv(res.data);
        setChats(prev => prev.map(c => (c.id === chatId ? { ...c, no_leidos: 0 } : c)));
        avisarChatsActualizados();
      })
      .catch(err => { if (!cancelado) setErrorConv(err.response?.data?.error || 'No se pudo abrir el chat.'); })
      .finally(() => { if (!cancelado) setCargandoConv(false); });
    return () => { cancelado = true; };
  }, [chatId]);

  // Mensajes nuevos (y eliminados) cada pocos segundos
  useEffect(() => {
    if (!chatId || !conv) return;
    const t = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/chats/${chatId}/mensajes`, { params: { after_id: ultimoId } });
        if (convIdRef.current !== chatId) return;
        const nuevos = res.data.mensajes || [];
        const eliminados = new Set(res.data.eliminados || []);
        setConv(prev => {
          if (!prev) return prev;
          let mensajes = nuevos.length
            ? [...prev.mensajes.filter(m => !m.temporal), ...nuevos.filter(n => !prev.mensajes.some(m => m.id === n.id))]
            : prev.mensajes;
          if (eliminados.size) {
            mensajes = mensajes.map(m => (eliminados.has(m.id) && m.tipo !== 'deleted'
              ? { ...m, tipo: 'deleted', texto: null, imagen: null, video: null }
              : m));
          }
          return {
            ...prev,
            chat: res.data.chat,
            activo: res.data.activo,
            puede_administrar: res.data.puede_administrar,
            participantes: res.data.participantes,
            mensajes,
          };
        });
        if (nuevos.length) avisarChatsActualizados();
      } catch { /* reintenta en el siguiente ciclo */ }
    }, POLL_CONVERSACION);
    return () => clearInterval(t);
  }, [chatId, conv, ultimoId]);

  // Mantener el scroll: abajo si ya estaba abajo; en su lugar al cargar anteriores
  useLayoutEffect(() => {
    const el = mensajesRef.current;
    if (!el) return;
    if (scrollAntes.current !== null) {
      el.scrollTop = el.scrollHeight - scrollAntes.current;
      scrollAntes.current = null;
    } else if (pegadoAbajo.current) {
      bajarAlFinal();
    }
  }, [conv?.mensajes]);

  const onScrollMensajes = () => {
    const el = mensajesRef.current;
    if (el) pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Al abrir el teclado (o el panel de emojis) la zona de mensajes se encoge:
  // si estabas viendo el final, se mantiene el último mensaje a la vista, como en WhatsApp
  const hayConversacion = Boolean(conv);
  useEffect(() => {
    const el = mensajesRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { if (pegadoAbajo.current) bajarAlFinal(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [chatId, hayConversacion]);

  const cargarAnteriores = async () => {
    if (!conv?.mensajes?.length || cargandoAnteriores) return;
    setCargandoAnteriores(true);
    try {
      const res = await axios.get(`${API}/chats/${chatId}/mensajes`, { params: { before_id: conv.mensajes[0].id } });
      scrollAntes.current = mensajesRef.current ? mensajesRef.current.scrollHeight - mensajesRef.current.scrollTop : null;
      setConv(prev => ({ ...prev, mensajes: [...res.data.mensajes, ...prev.mensajes], hay_anteriores: res.data.hay_anteriores }));
    } catch { /* sin cambios */ } finally {
      setCargandoAnteriores(false);
    }
  };

  // Envío genérico con el mensaje visible al instante (texto, foto, video o sticker)
  const enviarMensaje = async ({ tipo, contenido = '', archivo = null, sticker = null }) => {
    if (!conv?.activo) return;
    const temporal = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      temporal: true,
      tipo,
      texto: tipo === 'text' ? contenido : null,
      imagen: tipo === 'sticker' ? sticker.url : tipo === 'image' && archivo ? URL.createObjectURL(archivo) : null,
      video: tipo === 'video' && archivo ? URL.createObjectURL(archivo) : null,
      autor_id: yo,
      fecha: new Date().toISOString(),
    };
    pegadoAbajo.current = true;
    setConv(prev => ({ ...prev, mensajes: [...prev.mensajes, temporal] }));
    setEnviando(n => n + 1);
    try {
      const data = new FormData();
      if (tipo === 'text') data.append('body', contenido);
      if (archivo) data.append('media', archivo);
      if (sticker) data.append('sticker_id', sticker.id);
      const res = await axios.post(`${API}/chats/${chatId}/mensajes`, data);
      setConv(prev => ({ ...prev, mensajes: prev.mensajes.map(m => (m.id === temporal.id ? res.data.mensaje : m)) }));
      cargarLista();
      return true;
    } catch (err) {
      setConv(prev => ({ ...prev, mensajes: prev.mensajes.filter(m => m.id !== temporal.id) }));
      Swal.fire({
        icon: 'error',
        title: 'No se envió',
        text: err.response?.status === 413
          ? `El archivo es demasiado pesado (máximo ${MAX_ARCHIVO_MB} MB).`
          : (err.response?.data?.error || 'Revisa tu conexión e inténtalo de nuevo.'),
        confirmButtonColor: '#f26522'
      });
      return false;
    } finally {
      setEnviando(n => n - 1);
    }
  };

  const enviarTexto = async () => {
    const contenido = texto.trim();
    if (!contenido) return;
    setTexto('');
    setPanel(null);
    const ok = await enviarMensaje({ tipo: 'text', contenido });
    if (!ok) setTexto(contenido);
    textoRef.current?.focus();
  };

  // Fotos y videos (varios a la vez, uno tras otro)
  const elegirArchivos = async (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = '';
    for (const f of archivos) {
      const esVideo = f.type.startsWith('video/');
      if (!esVideo && !f.type.startsWith('image/')) continue;
      if (esVideo && f.size > MAX_ARCHIVO_MB * 1024 * 1024) {
        Swal.fire({ icon: 'warning', title: 'Video muy pesado', text: `«${f.name}» pesa ${(f.size / 1048576).toFixed(1)} MB. El máximo es ${MAX_ARCHIVO_MB} MB (aprox. 1 minuto de video).`, confirmButtonColor: '#f26522' });
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const archivo = esVideo ? f : await comprimirImagen(f);
      // eslint-disable-next-line no-await-in-loop
      await enviarMensaje({ tipo: esVideo ? 'video' : 'image', archivo });
    }
  };

  const onKeyDownTexto = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviarTexto();
    }
  };

  // Insertar emoji donde está el cursor
  const insertarEmoji = (emoji) => {
    const el = textoRef.current;
    const inicio = el?.selectionStart ?? texto.length;
    const fin = el?.selectionEnd ?? texto.length;
    const nuevo = texto.slice(0, inicio) + emoji + texto.slice(fin);
    setTexto(nuevo);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = inicio + emoji.length;
    });
  };

  // Textarea que crece con el texto (hasta 5 líneas)
  useLayoutEffect(() => {
    const el = textoRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  }, [texto]);

  // ── Stickers: paquete del equipo (lo administra el encargado) + los míos (subidos o guardados) ──
  const [stickers, setStickers] = useState(null); // { equipo: [], mios: [], puede_administrar }
  const [subiendoSticker, setSubiendoSticker] = useState(null); // 'mios' | 'equipo' | null
  const stickerRef = useRef(null);
  const stickerEquipoRef = useRef(null);

  const cargarStickers = useCallback(() => (
    axios.get(`${API}/chats/stickers`)
      .then(res => setStickers({ equipo: res.data.equipo || [], mios: res.data.mios || [], puede_administrar: Boolean(res.data.puede_administrar) }))
      .catch(() => setStickers({ equipo: [], mios: [], puede_administrar: false }))
  ), []);

  const abrirPanel = (cual) => {
    setPanel(p => (p === cual ? null : cual));
    if (cual === 'stickers' && stickers === null) cargarStickers();
  };

  // Varios a la vez. PNG/WebP/GIF se suben sin comprimir para conservar transparencia y animación.
  const subirStickers = async (e, equipo) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = '';
    if (!archivos.length) return;
    setSubiendoSticker(equipo ? 'equipo' : 'mios');
    const fallidos = [];
    for (const original of archivos) {
      // El explorador de archivos deja elegir cualquier cosa: solo se aceptan imágenes
      const f = comoImagenSticker(original);
      if (!f) { fallidos.push(`${original.name}: no es una imagen (.webp, .png, .gif o .jpg)`); continue; }
      const conservar = ['image/png', 'image/webp', 'image/gif'].includes(f.type);
      if (conservar && f.size > 4 * 1024 * 1024) { fallidos.push(`${f.name}: pesa más de 4 MB`); continue; }
      try {
        const data = new FormData();
        // eslint-disable-next-line no-await-in-loop
        data.append('image', conservar ? f : await comprimirImagen(f));
        if (equipo) data.append('equipo', '1');
        // eslint-disable-next-line no-await-in-loop
        const res = await axios.post(`${API}/chats/stickers`, data);
        const nuevo = { id: res.data.id, url: res.data.url };
        setStickers(prev => (equipo
          ? { ...prev, equipo: [nuevo, ...prev.equipo] }
          : { ...prev, mios: [nuevo, ...prev.mios] }));
      } catch (err) {
        fallidos.push(`${f.name}: ${err.response?.data?.error || 'no se pudo subir'}`);
      }
    }
    setSubiendoSticker(null);
    if (fallidos.length) {
      Swal.fire({ icon: 'warning', title: 'Algunos stickers no se subieron', html: fallidos.map(x => `• ${x}`).join('<br>'), confirmButtonColor: '#f26522' });
    }
  };

  const borrarSticker = async (s, equipo) => {
    const ok = await Swal.fire({
      title: equipo ? '¿Quitar del paquete del equipo?' : '¿Borrar este sticker?',
      text: equipo
        ? 'Nadie del equipo lo verá en su lista. Quien ya lo guardó lo conserva y los mensajes enviados no cambian.'
        : 'Se quita de tu colección. Los mensajes ya enviados no cambian.',
      imageUrl: s.url,
      imageHeight: 100,
      showCancelButton: true,
      confirmButtonText: equipo ? 'Quitar' : 'Borrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });
    if (!ok.isConfirmed) return;
    try {
      await axios.delete(`${API}/chats/stickers/${s.id}`);
      setStickers(prev => ({ ...prev, [equipo ? 'equipo' : 'mios']: prev[equipo ? 'equipo' : 'mios'].filter(x => x.id !== s.id) }));
    } catch { /* se queda como estaba */ }
  };

  // Guardar en mis stickers uno que me enviaron (luego se usa igual que los propios)
  const guardarSticker = async (m) => {
    setMenuMensaje(null);
    try {
      const res = await axios.post(`${API}/chats/stickers/guardar`, { mensaje_id: m.id });
      if (stickers) {
        setStickers(prev => (prev.mios.some(x => x.id === res.data.id) ? prev : { ...prev, mios: [{ id: res.data.id, url: res.data.url }, ...prev.mios] }));
      }
      Swal.fire({
        icon: 'success',
        title: res.data.ya_estaba ? 'Ya lo tenías guardado' : 'Sticker guardado',
        text: 'Lo encuentras en 😊 → Stickers → Mis stickers.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: err.response?.data?.error || 'Intenta de nuevo.' });
    }
  };

  // ── Eliminar mensaje (para todos) ──
  const eliminarMensaje = async (m) => {
    setMenuMensaje(null);
    const ok = await Swal.fire({
      title: '¿Eliminar para todos?',
      text: 'En el chat quedará "Se eliminó este mensaje".',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });
    if (!ok.isConfirmed) return;
    try {
      const res = await axios.delete(`${API}/chats/${chatId}/mensajes/${m.id}`);
      setConv(prev => ({ ...prev, mensajes: prev.mensajes.map(x => (x.id === m.id ? res.data.mensaje : x)) }));
      cargarLista();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: err.response?.data?.error || 'Intenta de nuevo.' });
    }
  };

  // ── Nuevo chat / agregar / info del chat ──
  const [contactos, setContactos] = useState([]);
  const [selector, setSelector] = useState(null); // 'nuevo' | 'agregar'
  const [procesando, setProcesando] = useState(false);
  const [infoAbierta, setInfoAbierta] = useState(false);

  const abrirSelector = (modo) => {
    setSelector(modo);
    axios.get(`${API}/chats/contactos`).then(res => setContactos(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  };

  const refrescarConversacion = async () => {
    const res = await axios.get(`${API}/chats/${chatId}/mensajes`, { params: { after_id: ultimoId } });
    setConv(prev => ({ ...prev, ...res.data, mensajes: [...prev.mensajes, ...res.data.mensajes] }));
    cargarLista();
  };

  const confirmarSelector = async (ids, nombreGrupo) => {
    setProcesando(true);
    try {
      if (selector === 'nuevo') {
        const res = await axios.post(`${API}/chats`, { user_ids: ids, title: nombreGrupo || null });
        setSelector(null);
        await cargarLista();
        navigate(`/chats/${res.data.chat.id}`);
      } else {
        await axios.post(`${API}/chats/${chatId}/participantes`, { user_ids: ids });
        setSelector(null);
        await refrescarConversacion();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo completar', text: err.response?.data?.error || 'Intenta de nuevo.', confirmButtonColor: '#f26522' });
    } finally {
      setProcesando(false);
    }
  };

  const quitarPersona = async (persona) => {
    const esYo = persona.id === yo;
    setInfoAbierta(false); // la confirmación se abre encima, no detrás
    const ok = await Swal.fire({
      icon: 'warning',
      title: esYo ? '¿Salir del grupo?' : `¿Sacar a ${persona.nombre}?`,
      text: esYo
        ? 'Conservarás los mensajes anteriores, pero ya no verás los nuevos ni podrás escribir.'
        : 'Conservará los mensajes anteriores, pero ya no verá los nuevos ni podrá escribir.',
      showCancelButton: true,
      confirmButtonText: esYo ? 'Salir' : 'Sacar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });
    if (!ok.isConfirmed) return;
    try {
      await axios.delete(`${API}/chats/${chatId}/participantes/${persona.id}`);
      await refrescarConversacion();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo completar', text: err.response?.data?.error || 'Intenta de nuevo.' });
    }
  };

  const renombrar = async () => {
    setInfoAbierta(false);
    const { value, isConfirmed } = await Swal.fire({
      title: 'Nombre del grupo',
      input: 'text',
      inputValue: conv.chat.nombre_grupo || '',
      inputAttributes: { maxlength: 80 },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f26522',
      inputValidator: (v) => (!v.trim() ? 'Escribe un nombre' : undefined)
    });
    if (!isConfirmed) return;
    try {
      await axios.put(`${API}/chats/${chatId}`, { title: value.trim() });
      await refrescarConversacion();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo cambiar', text: err.response?.data?.error || 'Intenta de nuevo.' });
    }
  };

  // "Eliminar chat": lo quita de MI lista; en un grupo activo, además sale de él
  const eliminarChat = async () => {
    setInfoAbierta(false);
    const enGrupo = conv.chat.es_grupo && conv.activo;
    const ok = await Swal.fire({
      icon: 'warning',
      title: enGrupo ? '¿Salir y eliminar el grupo?' : '¿Eliminar este chat?',
      text: enGrupo
        ? 'Saldrás del grupo y desaparecerá de tu lista. Los demás conservan la conversación.'
        : 'Desaparecerá de tu lista. La otra persona conserva la conversación. Si te vuelve a escribir, verás solo lo nuevo.',
      showCancelButton: true,
      confirmButtonText: enGrupo ? 'Salir y eliminar' : 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });
    if (!ok.isConfirmed) return;
    try {
      await axios.delete(`${API}/chats/${chatId}`);
      setChats(prev => prev.filter(c => c.id !== chatId));
      avisarChatsActualizados();
      navigate('/chats');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: err.response?.data?.error || 'Intenta de nuevo.' });
    }
  };

  // "Visto": en chats de 2, si la otra persona ya leyó; en grupos, cuántos lo leyeron
  const vistoDe = (m) => {
    if (m.temporal) return { icono: <Check size={14} />, texto: 'Enviando…' };
    const otros = (conv?.participantes || []).filter(p => p.id !== yo);
    const leyeron = otros.filter(p => p.last_read_message_id >= m.id).length;
    if (!otros.length || !leyeron) return { icono: <Check size={14} />, texto: 'Enviado' };
    if (leyeron === otros.length) return { icono: <CheckCheck size={14} />, texto: conv.chat.es_grupo ? 'Visto por todos' : 'Visto', visto: true };
    return { icono: <CheckCheck size={14} />, texto: `Visto por ${leyeron}` };
  };

  const ultimoMioId = useMemo(() => {
    const mios = (conv?.mensajes || []).filter(m => m.autor_id === yo && !['system', 'deleted'].includes(m.tipo));
    return mios.length ? mios[mios.length - 1].id : null;
  }, [conv?.mensajes, yo]);

  // ── Render de mensajes ──
  const renderContenido = (m) => {
    if (m.tipo === 'deleted') {
      return <p className="vch-texto vch-eliminado"><Ban size={14} /> Se eliminó este mensaje</p>;
    }
    return (
      <>
        {m.tipo === 'video' && m.video && (
          <video className="vch-video" src={m.video} controls preload="metadata" playsInline />
        )}
        {m.tipo !== 'sticker' && m.imagen && (
          <button type="button" className="vch-foto" onClick={(e) => { e.stopPropagation(); setVisor(m.imagen); }}>
            <img src={m.imagen} alt="Foto" loading="lazy" />
          </button>
        )}
        {m.texto && <p className="vch-texto">{m.texto}</p>}
      </>
    );
  };

  const renderMensajes = () => {
    let diaAnterior = null;
    return conv.mensajes.map((m, i) => {
      const dia = claveDia(m.fecha);
      const separador = dia !== diaAnterior ? <div className="vch-dia" key={`d-${m.id}`}><span>{etiquetaDia(m.fecha)}</span></div> : null;
      diaAnterior = dia;

      if (m.tipo === 'system') {
        return <React.Fragment key={m.id}>{separador}<div className="vch-sistema"><span>{m.texto}</span></div></React.Fragment>;
      }

      const mio = m.autor_id === yo;
      const anterior = conv.mensajes[i - 1];
      const mismoAutor = anterior && anterior.autor_id === m.autor_id && anterior.tipo !== 'system' && claveDia(anterior.fecha) === dia;
      const visto = mio && m.id === ultimoMioId ? vistoDe(m) : null;
      const esSticker = m.tipo === 'sticker' && m.imagen;
      const grande = m.tipo === 'text' && esEmojiGrande(m.texto);
      const sinBurbuja = esSticker || grande;
      const puedeBorrar = mio && conv.activo && !m.temporal && m.tipo !== 'deleted';
      const puedeGuardar = !mio && esSticker; // stickers que me envían: "Guardar en mis stickers"
      const accionable = puedeBorrar || puedeGuardar;
      const menuAbierto = menuMensaje === m.id;

      return (
        <React.Fragment key={m.id}>
          {separador}
          <div className={`vch-msg ${mio ? 'mio' : 'otro'} ${mismoAutor ? 'seguido' : ''}`}>
            {!mio && conv.chat.es_grupo && !mismoAutor && (
              <Avatar foto={m.autor_foto} nombre={m.autor} size={28} />
            )}
            <div
              className={`vch-burbuja ${sinBurbuja ? 'sin-burbuja' : ''} ${grande ? 'emoji-grande' : ''} ${m.tipo === 'deleted' ? 'eliminada' : ''} ${accionable ? 'accionable' : ''}`}
              onClick={accionable ? () => setMenuMensaje(menuAbierto ? null : m.id) : undefined}
            >
              {!mio && conv.chat.es_grupo && !mismoAutor && <span className="vch-autor">{m.autor}</span>}
              {esSticker
                ? <img className="vch-sticker" src={m.imagen} alt="Sticker" loading="lazy" />
                : grande ? <p className="vch-texto">{m.texto}</p> : renderContenido(m)}
              <span className="vch-hora">{hora(m.fecha)}</span>
            </div>
          </div>
          {menuAbierto && (
            <div className={`vch-msg-acciones ${mio ? '' : 'otro'}`}>
              {puedeGuardar && <button type="button" className="guardar" onClick={() => guardarSticker(m)}><Plus size={14} /> Guardar en mis stickers</button>}
              {puedeBorrar && <button type="button" className="peligro" onClick={() => eliminarMensaje(m)}><Trash2 size={14} /> Eliminar para todos</button>}
              <button type="button" onClick={() => setMenuMensaje(null)}>Cancelar</button>
            </div>
          )}
          {visto && <div className={`vch-visto ${visto.visto ? 'ok' : ''}`}>{visto.icono} {visto.texto}</div>}
        </React.Fragment>
      );
    });
  };

  const chat = conv?.chat;
  const subtitulo = chat
    ? (chat.es_grupo
      ? conv.participantes.map(p => (p.id === yo ? 'Tú' : p.nombre.split(' ')[0])).join(', ')
      : (textoPresencia(chat.presencia) || conv.participantes.find(p => p.id !== yo)?.rol || ''))
    : '';

  return (
    <div className={`vch-root ${chatId ? 'con-chat' : ''}`}>
      <Header activeModule="chats" titulo="CHATS" />

      <div className="vch-layout">
        {/* ── LISTA ── */}
        <aside className="vch-lista">
          <div className="vch-lista-head">
            <h1><MessageCircle size={22} /> Chats</h1>
            <button type="button" className="vch-btn-nuevo" onClick={() => abrirSelector('nuevo')} title="Nuevo chat" aria-label="Nuevo chat">
              <Plus size={20} strokeWidth={2.6} />
            </button>
          </div>
          <label className="vch-buscar">
            <Search size={16} />
            <input type="search" placeholder="Buscar chat" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </label>

          <div className="vch-lista-items">
            {cargandoLista ? (
              <div className="vch-vacio"><Loader2 size={22} className="vch-spin" /></div>
            ) : !chatsFiltrados.length ? (
              <div className="vch-vacio">
                <MessageCircle size={30} />
                <span>{chats.length ? 'Ningún chat coincide' : 'Aún no tienes chats'}</span>
                {!chats.length && <button type="button" className="vch-btn-primary" onClick={() => abrirSelector('nuevo')}><Plus size={16} /> Nuevo chat</button>}
              </div>
            ) : chatsFiltrados.map(c => {
              const u = c.ultimo_mensaje;
              const previa = !u ? 'Sin mensajes'
                : u.tipo === 'system' ? u.texto
                  : `${u.autor_id === yo ? 'Tú: ' : (c.es_grupo && u.autor ? `${u.autor.split(' ')[0]}: ` : '')}${previaDe(u)}`;
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`vch-item ${c.id === chatId ? 'activo' : ''} ${c.no_leidos ? 'sin-leer' : ''}`}
                  onClick={() => navigate(`/chats/${c.id}`)}
                >
                  <Avatar foto={c.foto} nombre={c.titulo} grupo={c.es_grupo} enLinea={!c.es_grupo && c.presencia?.en_linea} />
                  <span className="vch-item-cuerpo">
                    <span className="vch-item-top">
                      <strong>{c.titulo}</strong>
                      <small>{cuandoCorto(u?.fecha)}</small>
                    </span>
                    <span className="vch-item-bottom">
                      <span className={`vch-previa ${u?.tipo === 'system' ? 'sistema' : ''}`}>{!c.activo ? 'Ya no participas · ' : ''}{previa}</span>
                      {c.no_leidos > 0 && <span className="vch-badge">{c.no_leidos > 99 ? '99+' : c.no_leidos}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── CONVERSACIÓN ── */}
        <section className="vch-conv">
          {!chatId ? (
            <div className="vch-conv-vacia">
              <MessageCircle size={46} />
              <h2>Chat del equipo</h2>
              <p>Elige un chat o empieza uno nuevo. Puedes hablar con una persona o armar grupos.</p>
            </div>
          ) : cargandoConv && !conv ? (
            <div className="vch-conv-vacia"><Loader2 size={28} className="vch-spin" /></div>
          ) : errorConv ? (
            <div className="vch-conv-vacia"><p>{errorConv}</p></div>
          ) : conv && (
            <>
              <header className="vch-conv-head">
                <button type="button" className="vch-icon-btn vch-volver" onClick={() => navigate('/chats')} aria-label="Volver a chats"><ArrowLeft size={20} /></button>
                <button type="button" className="vch-conv-titulo" onClick={() => setInfoAbierta(true)}>
                  <Avatar foto={chat.foto} nombre={chat.titulo} grupo={chat.es_grupo} size={40} enLinea={!chat.es_grupo && chat.presencia?.en_linea} />
                  <span>
                    <strong>{chat.titulo}</strong>
                    <small className={!chat.es_grupo && chat.presencia?.en_linea ? 'en-linea' : ''}>{subtitulo}</small>
                  </span>
                </button>
                <button type="button" className="vch-icon-btn" onClick={() => setFondoAbierto(true)} aria-label="Fondo del chat" title="Fondo del chat"><Palette size={19} /></button>
                <button type="button" className="vch-icon-btn" onClick={() => setInfoAbierta(true)} aria-label="Información del chat" title="Información del chat"><Info size={19} /></button>
              </header>

              <div
                className={`vch-mensajes ${fondo === 'claro' ? 'fondo-claro' : ''}`}
                ref={mensajesRef}
                onScroll={onScrollMensajes}
                onClick={() => panel && setPanel(null)}
                style={{ background: cssFondo(fondo) }}
              >
                {conv.hay_anteriores && (
                  <button type="button" className="vch-anteriores" onClick={cargarAnteriores} disabled={cargandoAnteriores}>
                    {cargandoAnteriores ? 'Cargando…' : 'Ver mensajes anteriores'}
                  </button>
                )}
                {!conv.mensajes.length && <div className="vch-sistema"><span>Escribe el primer mensaje 👋</span></div>}
                {renderMensajes()}
              </div>

              {conv.activo ? (
                <div className="vch-escribir-wrap">
                  {/* Panel de emojis / stickers */}
                  {panel && (
                    <div className="vch-panel">
                      <div className="vch-panel-tabs">
                        <button type="button" className={panel === 'emojis' ? 'on' : ''} onClick={() => setPanel('emojis')}>😊 Emojis</button>
                        <button type="button" className={panel === 'stickers' ? 'on' : ''} onClick={() => abrirPanel('stickers')}>💟 Stickers</button>
                        <button type="button" className="vch-icon-btn vch-panel-cerrar" onClick={() => setPanel(null)} aria-label="Cerrar"><X size={16} /></button>
                      </div>
                      {panel === 'emojis' ? (
                        <div className="vch-emojis">
                          {EMOJIS.map(e => <button type="button" key={e} onClick={() => insertarEmoji(e)}>{e}</button>)}
                        </div>
                      ) : (
                        <div className="vch-stickers-panel">
                          {/* Sin "accept" de solo imágenes: en Android eso abre la galería, que no muestra
                              la carpeta de stickers de WhatsApp (.nomedia). Así abre el explorador de archivos. */}
                          <input ref={stickerRef} type="file" accept={ACCEPT_STICKERS} multiple hidden onChange={e => subirStickers(e, false)} />
                          <input ref={stickerEquipoRef} type="file" accept={ACCEPT_STICKERS} multiple hidden onChange={e => subirStickers(e, true)} />
                          {stickers === null ? (
                            <div className="vch-panel-vacio"><Loader2 size={18} className="vch-spin" /></div>
                          ) : (
                            <>
                              {/* Paquete del equipo: todos lo usan; solo el encargado lo administra */}
                              {(stickers.equipo.length > 0 || stickers.puede_administrar) && (
                                <>
                                  <span className="vch-stickers-titulo">Del equipo</span>
                                  <div className="vch-stickers">
                                    {stickers.puede_administrar && (
                                      <button type="button" className="vch-sticker-nuevo" onClick={() => stickerEquipoRef.current?.click()} disabled={Boolean(subiendoSticker)}>
                                        {subiendoSticker === 'equipo' ? <Loader2 size={20} className="vch-spin" /> : <Plus size={20} />}
                                        <span>Agregar</span>
                                      </button>
                                    )}
                                    {stickers.equipo.map(s => (
                                      <div key={`e-${s.id}`} className="vch-sticker-item">
                                        <button type="button" onClick={() => { setPanel(null); enviarMensaje({ tipo: 'sticker', sticker: s }); }} title="Enviar sticker">
                                          <img src={s.url} alt="Sticker" loading="lazy" />
                                        </button>
                                        {stickers.puede_administrar && (
                                          <button type="button" className="vch-sticker-borrar" onClick={() => borrarSticker(s, true)} aria-label="Quitar del paquete del equipo"><X size={12} /></button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}

                              <span className="vch-stickers-titulo">Mis stickers</span>
                              <div className="vch-stickers">
                                <button type="button" className="vch-sticker-nuevo" onClick={() => stickerRef.current?.click()} disabled={Boolean(subiendoSticker)}>
                                  {subiendoSticker === 'mios' ? <Loader2 size={20} className="vch-spin" /> : <ImagePlus size={20} />}
                                  <span>Crear</span>
                                </button>
                                {stickers.mios.map(s => (
                                  <div key={`m-${s.id}`} className="vch-sticker-item">
                                    <button type="button" onClick={() => { setPanel(null); enviarMensaje({ tipo: 'sticker', sticker: s }); }} title="Enviar sticker">
                                      <img src={s.url} alt="Sticker" loading="lazy" />
                                    </button>
                                    <button type="button" className="vch-sticker-borrar" onClick={() => borrarSticker(s, false)} aria-label="Borrar sticker"><X size={12} /></button>
                                  </div>
                                ))}
                                {!stickers.mios.length && (
                                  <p className="vch-panel-vacio">Toca un sticker que te envíen para guardarlo, o crea uno desde una imagen (PNG transparente o GIF animado se ven mejor).</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="vch-escribir">
                    <button type="button" className={`vch-icon-btn ${panel ? 'on' : ''}`} onClick={() => abrirPanel(panel === 'stickers' ? 'stickers' : 'emojis')} aria-label="Emojis y stickers" title="Emojis y stickers">
                      <Smile size={21} />
                    </button>
                    <button type="button" className="vch-icon-btn" onClick={() => archivoRef.current?.click()} aria-label="Enviar fotos o videos" title="Fotos y videos">
                      <Paperclip size={20} />
                    </button>
                    <input ref={archivoRef} type="file" accept="image/*,video/*" multiple hidden onChange={elegirArchivos} />
                    <textarea
                      ref={textoRef}
                      rows={1}
                      className="vch-textarea"
                      placeholder="Escribe un mensaje"
                      value={texto}
                      maxLength={4000}
                      onChange={e => setTexto(e.target.value)}
                      onKeyDown={onKeyDownTexto}
                    />
                    <button type="button" className="vch-enviar" onClick={enviarTexto} disabled={!texto.trim()} aria-label="Enviar" title="Enviar">
                      {enviando > 0 && !texto.trim() ? <Loader2 size={18} className="vch-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="vch-fuera">Ya no participas en este grupo. Puedes leer los mensajes hasta tu salida.</div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ── Info del chat ── */}
      {infoAbierta && conv && createPortal(
        <div className="vch-overlay" onClick={() => setInfoAbierta(false)}>
          <div className="vch-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Información del chat">
            <div className="vch-modal-head">
              <h3>{chat.es_grupo ? 'Info del grupo' : 'Info del chat'}</h3>
              <button type="button" className="vch-icon-btn" onClick={() => setInfoAbierta(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>

            <div className="vch-info-top">
              <Avatar foto={chat.foto} nombre={chat.titulo} grupo={chat.es_grupo} size={64} />
              <strong>{chat.titulo}</strong>
              {chat.es_grupo
                ? <small>{conv.participantes.length} participantes</small>
                : textoPresencia(chat.presencia) && <small>{textoPresencia(chat.presencia)}</small>}
              {chat.es_grupo && conv.puede_administrar && (
                <button type="button" className="vch-link" onClick={renombrar}><Pencil size={14} /> Cambiar nombre</button>
              )}
            </div>

            {conv.activo && conv.puede_administrar && (
              <button type="button" className="vch-accion" onClick={() => { setInfoAbierta(false); abrirSelector('agregar'); }}>
                <UserPlus size={18} /> {chat.es_grupo ? 'Agregar participantes' : 'Agregar personas (crear grupo)'}
              </button>
            )}
            <button type="button" className="vch-accion" onClick={() => { setInfoAbierta(false); setFondoAbierto(true); }}>
              <Palette size={18} /> Fondo del chat
            </button>

            <ul className="vch-personas vch-participantes">
              {conv.participantes.map(p => (
                <li key={p.id} className="vch-persona">
                  <Avatar foto={p.foto} nombre={p.nombre} size={36} />
                  <span className="vch-persona-nombre">{p.id === yo ? 'Tú' : p.nombre}</span>
                  {p.es_creador && <span className="vch-rol creador">Creador</span>}
                  <span className={`vch-rol ${p.rol === 'Técnico' ? 'tec' : ''}`}>{p.rol}</span>
                  {chat.es_grupo && conv.activo && conv.puede_administrar && p.id !== yo && (
                    <button type="button" className="vch-icon-btn peligro" onClick={() => quitarPersona(p)} title="Sacar del grupo" aria-label={`Sacar a ${p.nombre}`}>
                      <UserMinus size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {chat.es_grupo && conv.activo && (
              <button type="button" className="vch-accion peligro" onClick={() => quitarPersona({ id: yo, nombre: 'Tú' })}>
                <LogOut size={18} /> Salir del grupo
              </button>
            )}
            <button type="button" className="vch-accion peligro" onClick={eliminarChat}>
              <Trash2 size={18} /> {chat.es_grupo && conv.activo ? 'Salir y eliminar chat' : 'Eliminar chat'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Fondo del chat ── */}
      {fondoAbierto && createPortal(
        <div className="vch-overlay" onClick={() => !guardandoFondo && setFondoAbierto(false)}>
          <div className="vch-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Fondo del chat">
            <div className="vch-modal-head">
              <h3>Fondo del chat</h3>
              <button type="button" className="vch-icon-btn" onClick={() => setFondoAbierto(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <p className="vch-modal-nota">Se aplica a todos tus chats y se guarda en tu cuenta.</p>
            <div className="vch-fondos">
              {Object.entries(FONDOS).map(([clave, f]) => (
                <button
                  type="button"
                  key={clave}
                  className={`vch-fondo ${fondo === clave ? 'on' : ''}`}
                  style={{ background: f.css }}
                  onClick={() => guardarFondo({ clave })}
                  disabled={guardandoFondo}
                >
                  <span>{f.nombre}</span>
                  {fondo === clave && <Check size={16} strokeWidth={3} className="vch-fondo-check" />}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {selector && (
        <SelectorPersonas
          titulo={selector === 'nuevo' ? 'Nuevo chat' : 'Agregar participantes'}
          contactos={contactos}
          excluir={selector === 'agregar' ? (conv?.participantes || []).map(p => p.id) : []}
          modoNuevo={selector === 'nuevo'}
          enviando={procesando}
          onConfirmar={confirmarSelector}
          onCerrar={() => setSelector(null)}
        />
      )}

      {visor && createPortal(
        <div className="vch-visor" onClick={() => setVisor(null)}>
          <button type="button" className="vch-visor-cerrar" aria-label="Cerrar"><X size={22} /></button>
          <img src={visor} alt="Foto" onClick={e => e.stopPropagation()} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default VistaChats;
