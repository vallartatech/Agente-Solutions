import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Receipt, Wrench, GraduationCap, IdCard, Check, ChevronLeft, ChevronRight, Loader2, LogOut,
  AlertTriangle, Send, Clock, RefreshCw, PartyPopper, CircleAlert,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import logo from '../../../../assets/Logo4.png';
import { enviarARevision, guardarPerfil, mensajeError, obtenerPerfil } from './perfilProfesionalApi';
import SeccionCobro, { erroresCobro, formCobro, payloadCobro } from './SeccionCobro';
import SeccionHabilidades, { formHabilidades, payloadHabilidades } from './SeccionHabilidades';
import SeccionCurriculum, { erroresCurriculum, formCurriculum, payloadCurriculum } from './SeccionCurriculum';
import SeccionIdentidad from './SeccionIdentidad';
import ConsentimientoDatos from './ConsentimientoDatos';
import '../../../../styles/AgenteMarket/Tecnico/PerfilProfesional.css';

// Qué datos pide cada paso (claves de "faltantes" del backend)
const PASOS = [
  { titulo: 'Cobro y facturación', corto: 'Cobro', Icono: Receipt, claves: ['consentimiento_datos', 'emite_factura', 'rfc', 'razon_social', 'banco', 'titular_cuenta', 'clabe', 'acepta_efectivo', 'tiene_terminal'] },
  { titulo: 'Habilidades y experiencia', corto: 'Habilidades', Icono: Wrench, claves: ['especialidades', 'anios_experiencia'] },
  { titulo: 'Currículum', corto: 'Currículum', Icono: GraduationCap, claves: ['nivel_estudios', 'presentacion'] },
  { titulo: 'Identidad y documentos', corto: 'Identidad', Icono: IdCard, claves: ['foto', 'fecha_nacimiento', 'ine_frente', 'ine_reverso', 'comprobante_domicilio', 'antecedentes_penales'] },
];

const pasoCompleto = (paso, faltantes = {}) => !paso.claves.some(c => c in faltantes);

const fechaHora = (iso) => (iso
  ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  : '');

/**
 * "Completa tu perfil": el técnico nuevo de la red (roles 6 y 8) solo ve esta pantalla
 * hasta que Admin/Root aprueba su perfil (como al solicitar una tarjeta de crédito).
 */
const CompletarPerfil = () => {
  const navigate = useNavigate();
  const { user, loginGlobal, logoutGlobal } = useAuth();

  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [paso, setPaso] = useState(0);
  const [vista, setVista] = useState('pasos'); // 'pasos' | 'revision' | 'aprobado'

  const [cobro, setCobro] = useState(formCobro());
  const [habilidades, setHabilidades] = useState(formHabilidades());
  const [curriculum, setCurriculum] = useState(formCurriculum());
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'error' | 'ok', texto }

  // Actualiza el candado en la sesión (la redirección de App.jsx depende de esto)
  const actualizarSesion = useCallback((data) => {
    if (!user) return;
    loginGlobal({ ...user, perfil_profesional: { bloqueado: Boolean(data.bloqueado), estado: data.estado } });
  }, [user, loginGlobal]);

  const aplicarPerfil = useCallback((data, { reiniciarForms = false } = {}) => {
    setPerfil(data);
    if (reiniciarForms) {
      setCobro(formCobro(data));
      setHabilidades(formHabilidades(data));
      setCurriculum(formCurriculum(data));
    }
  }, []);

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true);
    setErrorCarga('');
    try {
      const data = await obtenerPerfil();
      aplicarPerfil(data, { reiniciarForms: !silencioso });
      if (!data.bloqueado) {
        actualizarSesion(data);
        // Recién aprobado: pantalla de bienvenida. Técnicos que ya existían (no obligatorios): a su perfil.
        if (data.estado === 'aprobado') setVista('aprobado');
        else navigate('/mi-perfil', { replace: true });
      } else if (data.estado === 'en_revision') {
        setVista('revision');
      } else if (!silencioso) {
        // Empieza en el primer paso con datos pendientes
        const primero = PASOS.findIndex(p => !pasoCompleto(p, data.faltantes));
        setPaso(primero === -1 ? PASOS.length - 1 : primero);
      }
      return data;
    } catch (err) {
      setErrorCarga(mensajeError(err, 'No pudimos cargar tu perfil. Revisa tu conexión.'));
      return null;
    } finally {
      setCargando(false);
    }
  }, [aplicarPerfil, actualizarSesion, navigate]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // En revisión: se revisa solo cada minuto si ya lo aprobaron
  useEffect(() => {
    if (vista !== 'revision') return undefined;
    const t = setInterval(() => cargar({ silencioso: true }), 60000);
    return () => clearInterval(t);
  }, [vista, cargar]);

  const faltantes = useMemo(() => perfil?.faltantes || {}, [perfil]);
  const totalFaltan = Object.keys(faltantes).length;
  const completos = useMemo(() => PASOS.filter(p => pasoCompleto(p, faltantes)).length, [faltantes]);

  const guardarPaso = async () => {
    let erroresPaso = {};
    let payload = null;
    // Sin consentimiento esos pasos solo muestran la casilla: no hay nada que guardar
    if (!perfil?.consentimiento_datos_at && (paso === 0 || paso === 3)) return true;
    if (paso === 0) { erroresPaso = erroresCobro(cobro); payload = payloadCobro(cobro); }
    if (paso === 1) { payload = payloadHabilidades(habilidades); }
    if (paso === 2) { erroresPaso = erroresCurriculum(curriculum); payload = payloadCurriculum(curriculum); }
    setErrores(erroresPaso);
    if (Object.keys(erroresPaso).length) {
      setAviso({ tipo: 'error', texto: 'Revisa los campos marcados en rojo.' });
      return false;
    }
    if (!payload) return true;

    setGuardando(true);
    setAviso(null);
    try {
      const data = await guardarPerfil(payload);
      aplicarPerfil(data);
      // Las habilidades nuevas ya tienen id del catálogo
      if (paso === 1) setHabilidades(formHabilidades(data));
      return true;
    } catch (err) {
      const campos = err?.response?.data?.errors;
      if (campos) setErrores(Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v[0]])));
      setAviso({ tipo: 'error', texto: mensajeError(err) });
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const siguiente = async () => {
    if (await guardarPaso()) {
      setPaso(p => Math.min(p + 1, PASOS.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const irAPaso = async (i) => {
    if (i === paso) return;
    if (await guardarPaso()) setPaso(i);
  };

  const enviar = async () => {
    setGuardando(true);
    setAviso(null);
    try {
      const res = await enviarARevision();
      aplicarPerfil(res.data);
      setVista('revision');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const pendientes = err?.response?.data?.faltantes;
      if (pendientes) setPerfil(p => ({ ...p, faltantes: pendientes }));
      setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudo enviar. Intenta de nuevo.') });
    } finally {
      setGuardando(false);
    }
  };

  const salir = async () => {
    try { await axios.post(`${import.meta.env.VITE_API_BASE_URL}/logout`); } catch { /* la sesión se cierra igual */ }
    logoutGlobal();
    navigate('/', { replace: true });
  };

  const encabezado = (
    <header className="pp-top">
      <img src={logo} alt="Agente Solutions" className="pp-logo" />
      <div className="pp-top-texto">
        <span>Hola, {user?.first_name || 'técnico'}</span>
        <strong>Tu perfil profesional</strong>
      </div>
      <button type="button" className="pp-salir" onClick={salir}><LogOut size={16} /> <span>Salir</span></button>
    </header>
  );

  // Google Play: eliminar la cuenta debe estar disponible aunque el perfil no esté aprobado
  const enlaceEliminar = (
    <p style={{ textAlign: 'center', margin: '18px 0 8px', fontSize: '0.82rem' }}>
      <button type="button" className="pp-btn-link" onClick={() => navigate('/eliminar-cuenta')} style={{ color: '#94a3b8' }}>
        Eliminar mi cuenta
      </button>
    </p>
  );

  if (cargando) {
    return (
      <div className="pp-pagina">{encabezado}
        <main className="pp-card pp-centro"><Loader2 size={30} className="pp-girar" /><p>Cargando tu perfil…</p></main>
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="pp-pagina">{encabezado}
        <main className="pp-card pp-centro">
          <CircleAlert size={34} className="pp-icono-error" />
          <p>{errorCarga}</p>
          <button type="button" className="pp-btn" onClick={() => cargar()}><RefreshCw size={16} /> Reintentar</button>
        </main>
      </div>
    );
  }

  if (vista === 'aprobado') {
    return (
      <div className="pp-pagina">{encabezado}
        <main className="pp-card pp-centro">
          <PartyPopper size={40} className="pp-icono-ok" />
          <h2>¡Tu perfil fue aprobado!</h2>
          <p>Ya puedes usar tu cuenta, ver trabajos de la red y enviar cotizaciones.</p>
          <button type="button" className="pp-btn" onClick={() => navigate('/mercado-trabajos', { replace: true })}>
            Entrar a mi cuenta <ChevronRight size={16} />
          </button>
        </main>
      </div>
    );
  }

  if (vista === 'revision') {
    return (
      <div className="pp-pagina">{encabezado}
        <main className="pp-card pp-centro">
          <Clock size={40} className="pp-icono-espera" />
          <h2>Estamos revisando tus datos</h2>
          <p>
            Recibimos tu perfil{perfil?.enviado_at ? ` el ${fechaHora(perfil.enviado_at)}` : ''}. Nuestro equipo validará tu identidad
            y tus datos; te avisaremos con una notificación en cuanto tu cuenta esté lista.
          </p>
          <div className="pp-acciones-centro">
            <button type="button" className="pp-btn" onClick={() => cargar({ silencioso: true })}><RefreshCw size={16} /> Revisar estado</button>
            <button type="button" className="pp-btn-sec" onClick={() => { setVista('pasos'); setPaso(0); }}>Ver o corregir mis datos</button>
          </div>
        </main>
        {enlaceEliminar}
      </div>
    );
  }

  const { Icono } = PASOS[paso];
  const esUltimo = paso === PASOS.length - 1;

  return (
    <div className="pp-pagina">
      {encabezado}

      <main className="pp-card">
        <div className="pp-intro">
          <h1>Completa tu perfil para empezar</h1>
          <p>Antes de trabajar en la red necesitamos conocerte. Tus datos se guardan en cada paso; puedes salir y continuar después.</p>
          <div className="pp-progreso" aria-label={`${completos} de ${PASOS.length} pasos completos`}>
            <span style={{ width: `${(completos / PASOS.length) * 100}%` }} />
          </div>
        </div>

        {perfil?.estado === 'rechazado' && perfil?.motivo_rechazo && (
          <div className="pp-rechazo" role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Necesitamos que corrijas algo</strong>
              <p>{perfil.motivo_rechazo}</p>
              <small>Haz los cambios y vuelve a enviar tu perfil a revisión.</small>
            </div>
          </div>
        )}

        {perfil?.estado === 'en_revision' && (
          <div className="pp-info" role="status"><Clock size={16} /> Tu perfil ya está en revisión. Si cambias algo, el equipo verá la versión nueva.</div>
        )}

        <nav className="pp-pasos" aria-label="Pasos">
          {PASOS.map((p, i) => {
            const ok = pasoCompleto(p, faltantes);
            return (
              <button
                key={p.titulo}
                type="button"
                className={`pp-paso ${i === paso ? 'actual' : ''} ${ok ? 'completo' : ''}`}
                onClick={() => irAPaso(i)}
                aria-current={i === paso ? 'step' : undefined}
                disabled={guardando}
              >
                <span className="pp-paso-num">{ok ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                <span className="pp-paso-txt">{p.corto}</span>
              </button>
            );
          })}
        </nav>

        <h2 className="pp-titulo-paso"><Icono size={20} /> {PASOS[paso].titulo}</h2>

        {(paso === 0 || paso === 3) && !perfil?.consentimiento_datos_at ? (
          <ConsentimientoDatos onAceptado={(data) => { aplicarPerfil(data); setAviso(null); }} />
        ) : (
          <>
            {paso === 0 && <SeccionCobro form={cobro} setForm={setCobro} errores={errores} />}
            {paso === 3 && <SeccionIdentidad perfil={perfil} onPerfil={aplicarPerfil} />}
          </>
        )}
        {paso === 1 && <SeccionHabilidades form={habilidades} setForm={setHabilidades} />}
        {paso === 2 && <SeccionCurriculum form={curriculum} setForm={setCurriculum} perfil={perfil} onPerfil={aplicarPerfil} errores={errores} />}

        {esUltimo && (
          <div className="pp-resumen">
            {totalFaltan === 0 ? (
              <p className="pp-ok"><Check size={16} strokeWidth={3} /> Todo listo. Envía tu perfil para que lo revisemos.</p>
            ) : (
              <>
                <p><strong>Antes de enviar, te falta:</strong></p>
                <ul>
                  {Object.entries(faltantes).map(([clave, texto]) => {
                    const i = PASOS.findIndex(p => p.claves.includes(clave));
                    return (
                      <li key={clave}>
                        <button type="button" className="pp-btn-link" onClick={() => setPaso(i)}>{texto}</button>
                        <small> · {PASOS[i]?.corto}</small>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        )}

        {aviso && <div className={`pp-aviso ${aviso.tipo}`} role="alert">{aviso.texto}</div>}

        <footer className="pp-pie">
          <button type="button" className="pp-btn-sec" onClick={() => setPaso(p => Math.max(p - 1, 0))} disabled={paso === 0 || guardando}>
            <ChevronLeft size={16} /> Atrás
          </button>
          {esUltimo ? (
            <button type="button" className="pp-btn" onClick={enviar} disabled={guardando || totalFaltan > 0}>
              {guardando ? <Loader2 size={16} className="pp-girar" /> : <Send size={16} />} Enviar a revisión
            </button>
          ) : (
            <button type="button" className="pp-btn" onClick={siguiente} disabled={guardando}>
              {guardando ? <Loader2 size={16} className="pp-girar" /> : null} Guardar y continuar <ChevronRight size={16} />
            </button>
          )}
        </footer>
      </main>
      {enlaceEliminar}
    </div>
  );
};

export default CompletarPerfil;
