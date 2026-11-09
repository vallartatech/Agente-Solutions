import { useEffect, useRef, useState } from 'react';
import { IdCard, Camera, CheckCircle2, Loader2, AlertCircle, RefreshCw, Lock, FileText, UserRound, CalendarDays, FolderCheck } from 'lucide-react';
import { guardarPerfil, mensajeError, subirDocumento, subirFotoPerfil, subirIne, urlArchivoPrivado } from './perfilProfesionalApi';
import { comprimirImagen } from '../../../../components/Shared/comprimirImagen';
import { useAuth } from '../../../../context/AuthContext';

// Fecha máxima de nacimiento: hoy hace 18 años (yyyy-mm-dd)
const fechaMayorEdad = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
};
const edadDe = (iso) => {
  if (!iso) return null;
  const n = new Date(`${iso}T00:00:00`);
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() < n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) e -= 1;
  return e;
};

/** Foto de perfil (la ven los clientes) y fecha de nacimiento: obligatorias para validar. */
const DatosPersonales = ({ perfil, onPerfil }) => {
  const { user, loginGlobal } = useAuth();
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState('');
  const [fecha, setFecha] = useState(perfil?.fecha_nacimiento || '');
  const [guardandoFecha, setGuardandoFecha] = useState(false);
  const [estadoFecha, setEstadoFecha] = useState(null); // { ok, texto }

  const foto = String(perfil?.foto || '').startsWith('http') ? perfil.foto : null;

  const elegirFoto = async (e) => {
    const original = e.target.files?.[0];
    e.target.value = '';
    if (!original) return;
    setErrorFoto('');
    setSubiendo(true);
    try {
      const archivo = await comprimirImagen(original).catch(() => original);
      const res = await subirFotoPerfil(archivo);
      onPerfil(res.data);
      // La foto nueva también en la sesión (encabezado, menú)
      if (user && res.url) loginGlobal({ ...user, profile_picture: res.url });
    } catch (err) {
      setErrorFoto(mensajeError(err, 'No se pudo subir la foto. Intenta de nuevo.'));
    } finally {
      setSubiendo(false);
    }
  };

  const guardarFecha = async (valor) => {
    setEstadoFecha(null);
    if (!valor || valor === perfil?.fecha_nacimiento) return;
    if (valor > fechaMayorEdad()) { setEstadoFecha({ ok: false, texto: 'Debes ser mayor de edad para trabajar en la red.' }); return; }
    setGuardandoFecha(true);
    try {
      const data = await guardarPerfil({ fecha_nacimiento: valor });
      onPerfil(data);
      setEstadoFecha({ ok: true, texto: 'Guardada' });
    } catch (err) {
      setEstadoFecha({ ok: false, texto: mensajeError(err, 'No se pudo guardar la fecha.') });
    } finally {
      setGuardandoFecha(false);
    }
  };

  const edad = edadDe(fecha);

  return (
    <div className="pp-bloque">
      <h3 className="pp-bloque-titulo"><UserRound size={18} /> Foto y datos personales</h3>
      <p className="pp-nota">Usa una foto reciente de tu cara, de frente y con buena luz. Los clientes la verán en tu currículum.</p>

      <div className="pp-personales">
        <button type="button" className={`pp-foto ${foto ? 'con-foto' : ''}`} onClick={() => inputRef.current?.click()} disabled={subiendo} aria-label={foto ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}>
          {subiendo ? <Loader2 size={26} className="pp-girar" />
            : foto ? <img src={foto} alt="Tu foto de perfil" />
              : <span><Camera size={26} /> Subir foto</span>}
          {foto && !subiendo && <i><Camera size={14} /></i>}
        </button>

        <div className="pp-personales-datos">
          <strong>{perfil?.nombre}</strong>
          {foto ? <span className="pp-ok"><CheckCircle2 size={14} /> Foto lista</span> : <span className="pp-error"><AlertCircle size={13} /> Falta tu foto</span>}
          {errorFoto && <small className="pp-error"><AlertCircle size={13} /> {errorFoto}</small>}

          <label className="pp-campo pp-campo-corto">
            <span><CalendarDays size={13} /> Fecha de nacimiento</span>
            <input
              type="date"
              value={fecha}
              min="1930-01-01"
              max={fechaMayorEdad()}
              onChange={(e) => setFecha(e.target.value)}
              onBlur={(e) => guardarFecha(e.target.value)}
              className={estadoFecha ? (estadoFecha.ok ? 'con-ok' : 'con-error') : ''}
              disabled={guardandoFecha}
            />
          </label>
          {guardandoFecha && <small className="pp-ayuda"><Loader2 size={12} className="pp-girar" /> Guardando…</small>}
          {!guardandoFecha && estadoFecha && (
            <small className={estadoFecha.ok ? 'pp-ok' : 'pp-error'}>
              {estadoFecha.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {estadoFecha.texto}{estadoFecha.ok && edad != null ? ` · ${edad} años` : ''}
            </small>
          )}
          {!fecha && !estadoFecha && <small className="pp-error"><AlertCircle size={13} /> Falta tu fecha de nacimiento</small>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={elegirFoto} />
    </div>
  );
};

const LADOS = [
  { clave: 'frente', tipo: 'ine_frente', tiene: 'tiene_ine_frente', titulo: 'Frente', ayuda: 'El lado con tu foto' },
  { clave: 'reverso', tipo: 'ine_reverso', tiene: 'tiene_ine_reverso', titulo: 'Reverso', ayuda: 'El lado con el código de barras' },
];

// Documentos obligatorios además de la INE (mismo recuadro de subida)
const DOCUMENTOS = [
  {
    clave: 'comprobante_domicilio', tipo: 'comprobante_domicilio', tiene: 'tiene_comprobante_domicilio',
    titulo: 'Comprobante de domicilio', ayuda: 'Luz, agua, teléfono o predial; no mayor a 3 meses',
    subir: (archivo) => subirDocumento('comprobante_domicilio', archivo),
  },
  {
    clave: 'antecedentes_penales', tipo: 'antecedentes_penales', tiene: 'tiene_antecedentes_penales',
    titulo: 'Antecedentes no penales', ayuda: 'Constancia vigente (foto o PDF)',
    subir: (archivo) => subirDocumento('antecedentes_penales', archivo),
  },
];

/** Un lado de la INE o un documento: se sube en cuanto se elige y muestra la vista previa. */
const LadoIne = ({ lado, perfil, onPerfil }) => {
  const inputRef = useRef(null);
  const [vista, setVista] = useState(null); // { url, pdf }
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const subido = Boolean(perfil?.[lado.tiene]);

  // Vista previa de lo que ya está guardado (archivo privado: se pide con la sesión)
  useEffect(() => {
    if (!subido || !perfil?.user_id || vista) return undefined;
    let url = null;
    let cancelado = false;
    urlArchivoPrivado(perfil.user_id, lado.tipo)
      .then((u) => { url = u; if (!cancelado) setVista({ url: u, pdf: false }); })
      .catch(() => {});
    return () => { cancelado = true; if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subido, perfil?.user_id]);

  const elegir = async (e) => {
    const original = e.target.files?.[0];
    e.target.value = '';
    if (!original) return;
    setError('');
    setSubiendo(true);
    try {
      const esPdf = original.type === 'application/pdf';
      // Fotos del celular: se reducen antes de subir (legibles y más rápidas)
      const archivo = esPdf ? original : await comprimirImagen(original).catch(() => original);
      const data = lado.subir ? await lado.subir(archivo) : await subirIne({ [lado.clave]: archivo });
      setVista({ url: URL.createObjectURL(archivo), pdf: esPdf });
      onPerfil(data);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo subir la foto. Intenta de nuevo.'));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className={`pp-ine ${subido ? 'subido' : ''}`}>
      <div className="pp-ine-head">
        <strong>{lado.titulo}</strong>
        {subido && <span className="pp-ok"><CheckCircle2 size={14} /> Subida</span>}
      </div>
      <button type="button" className="pp-ine-caja" onClick={() => inputRef.current?.click()} disabled={subiendo}>
        {subiendo ? (
          <span className="pp-ine-vacio"><Loader2 size={26} className="pp-girar" /> Subiendo…</span>
        ) : vista && !vista.pdf ? (
          <img src={vista.url} alt={`INE ${lado.titulo}`} />
        ) : vista?.pdf ? (
          <span className="pp-ine-vacio"><FileText size={28} /> PDF subido</span>
        ) : (
          <span className="pp-ine-vacio"><Camera size={28} /> Tomar foto o elegir archivo<small>{lado.ayuda}</small></span>
        )}
      </button>
      {subido && !subiendo && (
        <button type="button" className="pp-btn-link" onClick={() => inputRef.current?.click()}>
          <RefreshCw size={14} /> Cambiar
        </button>
      )}
      {error && <small className="pp-error"><AlertCircle size={13} /> {error}</small>}
      <input ref={inputRef} type="file" accept="image/*,application/pdf" hidden onChange={elegir} />
    </div>
  );
};

/** Foto, fecha de nacimiento e INE por ambos lados. La INE solo la ven el técnico y Admin/Root. */
const SeccionIdentidad = ({ perfil, onPerfil }) => (
  <div className="pp-seccion">
    <DatosPersonales perfil={perfil} onPerfil={onPerfil} />
    <div className="pp-bloque">
      <h3 className="pp-bloque-titulo"><IdCard size={18} /> Identificación oficial (INE)</h3>
      <p className="pp-nota">
        Sube una foto clara de tu INE por ambos lados: sin reflejos y con los datos legibles.
      </p>
      <div className="pp-grid-2">
        {LADOS.map(lado => <LadoIne key={lado.clave} lado={lado} perfil={perfil} onPerfil={onPerfil} />)}
      </div>
      <p className="pp-privado"><Lock size={14} /> Tu INE es privada: solo la ve el equipo de Agente Solutions para validar tu identidad. Los clientes no la ven.</p>
    </div>
    <div className="pp-bloque">
      <h3 className="pp-bloque-titulo"><FolderCheck size={18} /> Documentos</h3>
      <p className="pp-nota">
        Sube tu comprobante de domicilio y tu constancia de antecedentes no penales. Pueden ser fotos claras o PDF.
      </p>
      <div className="pp-grid-2">
        {DOCUMENTOS.map(doc => <LadoIne key={doc.clave} lado={doc} perfil={perfil} onPerfil={onPerfil} />)}
      </div>
      <p className="pp-privado"><Lock size={14} /> Tus documentos son privados: solo los ve el equipo de Agente Solutions. Los clientes no los ven.</p>
    </div>
  </div>
);

export default SeccionIdentidad;
