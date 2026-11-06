import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt, Wrench, GraduationCap, IdCard, Pencil, ShieldCheck, ShieldAlert, Award, X, Loader2,
  Check, Clock, AlertTriangle, Send, Info, Landmark,
} from 'lucide-react';
import { enviarARevision, guardarPerfil, mensajeError, obtenerPerfil } from './perfilProfesionalApi';
import SeccionCobro, { erroresCobro, formCobro, payloadCobro } from './SeccionCobro';
import SeccionHabilidades, { formHabilidades, payloadHabilidades } from './SeccionHabilidades';
import SeccionCurriculum, { erroresCurriculum, formCurriculum, payloadCurriculum } from './SeccionCurriculum';
import SeccionIdentidad from './SeccionIdentidad';
import '../../../../styles/AgenteMarket/Tecnico/PerfilProfesional.css';

const ESTADOS = {
  incompleto: { texto: 'Sin enviar', clase: 'gris', Icono: Info },
  en_revision: { texto: 'En revisión', clase: 'naranja', Icono: Clock },
  aprobado: { texto: 'Validado', clase: 'verde', Icono: Check },
  rechazado: { texto: 'Requiere cambios', clase: 'rojo', Icono: AlertTriangle },
};

const siNo = (v) => (v === true ? 'Sí' : v === false ? 'No' : '—');

// En qué sección se llena cada dato faltante (claves del backend)
const SECCION_DE = {
  emite_factura: 'cobro', rfc: 'cobro', razon_social: 'cobro', banco: 'cobro', titular_cuenta: 'cobro',
  clabe: 'cobro', acepta_efectivo: 'cobro', tiene_terminal: 'cobro',
  especialidades: 'habilidades', anios_experiencia: 'habilidades',
  nivel_estudios: 'curriculum', presentacion: 'curriculum',
  ine_frente: 'ine', ine_reverso: 'ine',
};

/** Ventana de edición de una sección (formulario claro, igual que en el registro). */
const VentanaEdicion = ({ titulo, Icono, aviso, onCerrar, onGuardar, guardando, error, soloCerrar, children }) => createPortal(
  <div className="ppm-overlay" onClick={() => !guardando && onCerrar()}>
    <div className="ppm-ventana pp-tema" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
      <header className="ppm-head">
        <h2><Icono size={20} /> {titulo}</h2>
        <button type="button" className="ppm-cerrar" onClick={onCerrar} disabled={guardando} aria-label="Cerrar"><X size={18} /></button>
      </header>
      <div className="ppm-cuerpo">
        {aviso && <div className="pp-info"><ShieldAlert size={16} /> {aviso}</div>}
        {children}
        {error && <div className="pp-aviso error" role="alert">{error}</div>}
      </div>
      <footer className="ppm-pie">
        {soloCerrar ? (
          <button type="button" className="pp-btn" onClick={onCerrar}>Listo</button>
        ) : (
          <>
            <button type="button" className="pp-btn-sec" onClick={onCerrar} disabled={guardando}>Cancelar</button>
            <button type="button" className="pp-btn" onClick={onGuardar} disabled={guardando}>
              {guardando ? <Loader2 size={16} className="pp-girar" /> : <Check size={16} />} Guardar cambios
            </button>
          </>
        )}
      </footer>
    </div>
  </div>,
  document.body
);

/**
 * Sección "Perfil profesional" en "Mi perfil" del técnico de la red: ver y editar cobro,
 * habilidades, currículum e INE después del registro. Cambiar la INE o los estudios ya verificados
 * quita la insignia y lo regresa a revisión, pero no bloquea la cuenta.
 */
const PanelPerfilProfesional = ({ onCambio }) => {
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(null); // 'cobro' | 'habilidades' | 'curriculum' | 'ine'
  const [cobro, setCobro] = useState(formCobro());
  const [habilidades, setHabilidades] = useState(formHabilidades());
  const [curriculum, setCurriculum] = useState(formCurriculum());
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorVentana, setErrorVentana] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const aplicar = useCallback((data) => {
    setPerfil(data);
    onCambio?.(data);
  }, [onCambio]);

  useEffect(() => {
    obtenerPerfil().then(aplicar).catch((err) => setError(mensajeError(err, 'No se pudo cargar tu perfil profesional.')));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const abrir = (seccion) => {
    setErrores({});
    setErrorVentana('');
    if (seccion === 'cobro') setCobro(formCobro(perfil));
    if (seccion === 'habilidades') setHabilidades(formHabilidades(perfil));
    if (seccion === 'curriculum') setCurriculum(formCurriculum(perfil));
    setEditando(seccion);
  };

  const guardar = async () => {
    let errs = {};
    let payload = null;
    if (editando === 'cobro') { errs = erroresCobro(cobro); payload = payloadCobro(cobro); }
    if (editando === 'habilidades') { payload = payloadHabilidades(habilidades); }
    if (editando === 'curriculum') { errs = erroresCurriculum(curriculum); payload = payloadCurriculum(curriculum); }
    setErrores(errs);
    if (Object.keys(errs).length) { setErrorVentana('Revisa los campos marcados en rojo.'); return; }

    setGuardando(true);
    setErrorVentana('');
    try {
      const data = await guardarPerfil(payload);
      aplicar(data);
      setEditando(null);
      setMensaje({ tipo: 'ok', texto: data.estado === 'en_revision' && perfil?.estado === 'aprobado'
        ? 'Cambios guardados. Tus estudios vuelven a revisión; puedes seguir trabajando.'
        : 'Cambios guardados.' });
    } catch (err) {
      const campos = err?.response?.data?.errors;
      if (campos) setErrores(Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v[0]])));
      setErrorVentana(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const enviar = async () => {
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await enviarARevision();
      aplicar(res.data);
      setMensaje({ tipo: 'ok', texto: res.message || 'Enviamos tu perfil a revisión.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeError(err, 'No se pudo enviar.') });
    } finally {
      setEnviando(false);
    }
  };

  if (error) return <section className="ppp-panel"><p className="ppp-vacio">{error}</p></section>;
  if (!perfil) return <section className="ppp-panel"><p className="ppp-vacio"><Loader2 size={18} className="pp-girar" /> Cargando perfil profesional…</p></section>;

  const estado = ESTADOS[perfil.estado] || ESTADOS.incompleto;
  const faltantesMapa = perfil.faltantes || {};
  const faltantes = Object.values(faltantesMapa);
  const puedeEnviar = faltantes.length === 0 && ['incompleto', 'rechazado'].includes(perfil.estado);
  // Avance: datos obligatorios completos (RFC y razón social solo cuentan si factura)
  const totalObligatorios = 12 + (perfil.emite_factura ? 2 : 0);
  const completos = Math.max(totalObligatorios - faltantes.length, 0);
  const porcentaje = Math.round((completos / totalObligatorios) * 100);
  const { identidad_verificada: idOk, estudios_verificados: estOk } = perfil.insignias || {};
  const clabe = perfil.clabe ? `···· ${String(perfil.clabe).slice(-4)}` : 'Sin registrar';

  const tarjetas = [
    {
      clave: 'cobro', titulo: 'Cobro y facturación', Icono: Receipt,
      filas: [
        ['Factura', perfil.emite_factura ? `Sí · ${perfil.rfc || 'sin RFC'}` : siNo(perfil.emite_factura)],
        ['CLABE', perfil.banco ? `${perfil.banco} ${clabe}` : clabe],
        ['Efectivo', siNo(perfil.acepta_efectivo)],
        ['Terminal', siNo(perfil.tiene_terminal)],
      ],
    },
    {
      clave: 'habilidades', titulo: 'Habilidades', Icono: Wrench,
      chips: perfil.especialidades || [],
      filas: [['Experiencia', perfil.anios_experiencia != null ? `${perfil.anios_experiencia} ${perfil.anios_experiencia === 1 ? 'año' : 'años'}` : '—']],
    },
    {
      clave: 'curriculum', titulo: 'Currículum', Icono: GraduationCap, verificado: estOk,
      filas: [
        ['Estudios', perfil.nivel_estudios_texto || '—'],
        ['Cursos', perfil.cursos?.length ? `${perfil.cursos.length}` : (perfil.sin_cursos ? 'Ninguno' : '—')],
        ['Empleos', perfil.experiencias?.length ? `${perfil.experiencias.length}` : (perfil.sin_empleos ? 'Por su cuenta' : '—')],
      ],
      texto: perfil.presentacion,
    },
    {
      clave: 'ine', titulo: 'Identificación (INE)', Icono: IdCard, verificado: idOk, boton: 'Cambiar',
      filas: [['Frente', perfil.tiene_ine_frente ? 'Subida' : 'Falta'], ['Reverso', perfil.tiene_ine_reverso ? 'Subida' : 'Falta']],
    },
  ];

  return (
    <section className="ppp-panel">
      <div className="ppp-head">
        <h2 className="ppp-titulo"><Award size={18} /> PERFIL PROFESIONAL</h2>
        <span className={`ppp-estado ${estado.clase}`}><estado.Icono size={13} /> {estado.texto}</span>
      </div>

      {/* Avance y lo que falta: cada dato abre su sección */}
      <div className="ppp-avance">
        <div className="ppp-avance-fila">
          <span>{faltantes.length ? `Perfil ${porcentaje}% completo` : 'Perfil completo'}</span>
          <strong>{completos} / {totalObligatorios}</strong>
        </div>
        <div className="ppp-barra" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${porcentaje}%` }} />
        </div>
        {faltantes.length > 0 && (
          <div className="ppp-faltan">
            <span className="ppp-faltan-titulo">Te falta:</span>
            {Object.entries(faltantesMapa).map(([clave, texto]) => (
              <button key={clave} type="button" className="ppp-falta" onClick={() => abrir(SECCION_DE[clave] || 'cobro')}>
                {texto.replace(/\s*\(.*\)$/, '').replace(/^¿|\?$/g, '')}
              </button>
            ))}
          </div>
        )}
      </div>

      {perfil.estado === 'rechazado' && perfil.motivo_rechazo && (
        <div className="ppp-alerta rojo"><AlertTriangle size={16} /><div><strong>Corrige esto y vuelve a enviar:</strong> {perfil.motivo_rechazo}</div></div>
      )}
      {perfil.estado === 'en_revision' && (
        <div className="ppp-alerta naranja"><Clock size={16} /><div>Estamos revisando tus cambios. Puedes seguir trabajando normalmente.</div></div>
      )}
      {puedeEnviar && (
        <div className="ppp-enviar">
          <span>Tu perfil está completo. Envíalo para que validemos tu identidad y tus estudios.</span>
          <button type="button" className="ppp-btn" onClick={enviar} disabled={enviando}>
            {enviando ? <Loader2 size={15} className="pp-girar" /> : <Send size={15} />} Enviar a revisión
          </button>
        </div>
      )}
      {mensaje && <div className={`ppp-alerta ${mensaje.tipo === 'ok' ? 'verde' : 'rojo'}`} role="status">{mensaje.texto}</div>}

      <div className="ppp-tarjetas">
        {tarjetas.map(t => (
          <article key={t.clave} className="ppp-tarjeta">
            <div className="ppp-tarjeta-head">
              <h3><t.Icono size={16} /> {t.titulo}</h3>
              {t.verificado && <ShieldCheck size={16} className="ppp-ok" aria-label="Verificado" />}
            </div>
            {t.chips && (
              <div className="ppp-chips">
                {t.chips.slice(0, 6).map(c => <span key={c.id}>{c.icon || '🔧'} {c.name}</span>)}
                {t.chips.length > 6 && <span>+{t.chips.length - 6}</span>}
                {t.chips.length === 0 && <span className="vacio">Sin habilidades</span>}
              </div>
            )}
            <dl className="ppp-filas">
              {t.filas.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd className={v === 'Falta' ? 'falta' : ''}>{v}</dd></div>
              ))}
            </dl>
            {t.texto && <p className="ppp-texto">{t.texto}</p>}
            <button type="button" className="ppp-editar" onClick={() => abrir(t.clave)}>
              <Pencil size={14} /> {t.boton || 'Editar'}
            </button>
          </article>
        ))}
      </div>

      {editando === 'cobro' && (
        <VentanaEdicion titulo="Cobro y facturación" Icono={Landmark} onCerrar={() => setEditando(null)} onGuardar={guardar} guardando={guardando} error={errorVentana}>
          <SeccionCobro form={cobro} setForm={setCobro} errores={errores} />
        </VentanaEdicion>
      )}
      {editando === 'habilidades' && (
        <VentanaEdicion titulo="Habilidades y experiencia" Icono={Wrench} onCerrar={() => setEditando(null)} onGuardar={guardar} guardando={guardando} error={errorVentana}>
          <SeccionHabilidades form={habilidades} setForm={setHabilidades} />
        </VentanaEdicion>
      )}
      {editando === 'curriculum' && (
        <VentanaEdicion
          titulo="Currículum"
          Icono={GraduationCap}
          aviso={estOk ? 'Tus estudios ya están verificados. Si cambias el nivel de estudios o tus cursos, perderás la insignia hasta que los revisemos de nuevo. Puedes seguir trabajando mientras tanto.' : null}
          onCerrar={() => setEditando(null)}
          onGuardar={guardar}
          guardando={guardando}
          error={errorVentana}
        >
          <SeccionCurriculum form={curriculum} setForm={setCurriculum} perfil={perfil} onPerfil={aplicar} errores={errores} />
        </VentanaEdicion>
      )}
      {editando === 'ine' && (
        <VentanaEdicion
          titulo="Identificación (INE)"
          Icono={IdCard}
          aviso={idOk ? 'Tu identidad ya está verificada. Si cambias tu INE, perderás la insignia hasta que la revisemos de nuevo. Puedes seguir trabajando mientras tanto.' : null}
          onCerrar={() => setEditando(null)}
          soloCerrar
        >
          <SeccionIdentidad perfil={perfil} onPerfil={aplicar} />
        </VentanaEdicion>
      )}
    </section>
  );
};

export default PanelPerfilProfesional;
