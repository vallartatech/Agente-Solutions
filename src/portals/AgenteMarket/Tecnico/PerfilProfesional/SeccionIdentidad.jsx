import { useEffect, useRef, useState } from 'react';
import { IdCard, Camera, CheckCircle2, Loader2, AlertCircle, RefreshCw, Lock, FileText } from 'lucide-react';
import { mensajeError, subirIne, urlArchivoPrivado } from './perfilProfesionalApi';
import { comprimirImagen } from '../../../../components/Shared/comprimirImagen';

const LADOS = [
  { clave: 'frente', tipo: 'ine_frente', tiene: 'tiene_ine_frente', titulo: 'Frente', ayuda: 'El lado con tu foto' },
  { clave: 'reverso', tipo: 'ine_reverso', tiene: 'tiene_ine_reverso', titulo: 'Reverso', ayuda: 'El lado con el código de barras' },
];

/** Un lado de la INE: se sube en cuanto se elige y muestra la vista previa. */
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
      const data = await subirIne({ [lado.clave]: archivo });
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

/** INE por ambos lados. Solo la ven el técnico y Admin/Root (almacenamiento privado). */
const SeccionIdentidad = ({ perfil, onPerfil }) => (
  <div className="pp-seccion">
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
  </div>
);

export default SeccionIdentidad;
