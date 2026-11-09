import { useEffect, useState } from 'react';
import { Download, Share2, Link2, Loader2, Check } from 'lucide-react';
import { dibujarQr, tarjetaQrPng, nombreArchivoQr, urlDeCodigo } from './qrTecnico';
import { mostrarAviso } from '../../../utils/dialogos';
import '../../../styles/AgenteMarket/Shared/TecnicoQr.css';

/**
 * QR de un técnico con acciones: descargar (tarjeta PNG para imprimir), compartir y copiar enlace.
 *  codigo:    qr_codigo del técnico
 *  nombre:    nombre que va en la tarjeta descargable
 *  subtitulo: línea bajo el nombre (rol / especialidad)
 *  leyenda:   texto bajo el QR
 */
const CodigoQrTecnico = ({ codigo, nombre, subtitulo, leyenda = 'Escanéalo para ver el perfil y contratar' }) => {
  const [imagen, setImagen] = useState(null);
  const [ocupado, setOcupado] = useState(null); // 'descargar' | 'compartir'
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    setImagen(null);
    if (codigo) dibujarQr(codigo).then((src) => { if (vivo) setImagen(src); }).catch(() => {});
    return () => { vivo = false; };
  }, [codigo]);

  const descargar = async () => {
    setOcupado('descargar');
    try {
      const blob = await tarjetaQrPng(codigo, nombre, subtitulo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivoQr(nombre);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      mostrarAviso('No se pudo generar la imagen del QR.', 'error');
    } finally {
      setOcupado(null);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlDeCodigo(codigo));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      mostrarAviso(urlDeCodigo(codigo));
    }
  };

  const compartir = async () => {
    const enlace = urlDeCodigo(codigo);
    const texto = `${nombre || 'Técnico'} en Agente Market`;
    setOcupado('compartir');
    try {
      const blob = await tarjetaQrPng(codigo, nombre, subtitulo);
      const archivo = new File([blob], nombreArchivoQr(nombre), { type: 'image/png' });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: texto, text: `${texto}: ${enlace}` });
      } else if (navigator.share) {
        await navigator.share({ title: texto, text: texto, url: enlace });
      } else {
        await copiar();
      }
    } catch (e) {
      if (e?.name !== 'AbortError') await copiar();
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="tqr-bloque">
      <div className="tqr-imagen">
        {imagen ? <img src={imagen} alt={`Código QR de ${nombre || 'técnico'}`} /> : <Loader2 size={26} className="tqr-girar" />}
      </div>
      <p className="tqr-leyenda">{leyenda}</p>
      <div className="tqr-acciones">
        <button type="button" className="tqr-btn tqr-btn-primario" onClick={descargar} disabled={!imagen || !!ocupado}>
          {ocupado === 'descargar' ? <Loader2 size={16} className="tqr-girar" /> : <Download size={16} />} Descargar
        </button>
        <button type="button" className="tqr-btn" onClick={compartir} disabled={!imagen || !!ocupado}>
          {ocupado === 'compartir' ? <Loader2 size={16} className="tqr-girar" /> : <Share2 size={16} />} Compartir
        </button>
        <button type="button" className="tqr-btn tqr-btn-icono" onClick={copiar} disabled={!imagen} title="Copiar enlace" aria-label="Copiar enlace">
          {copiado ? <Check size={16} /> : <Link2 size={16} />}
        </button>
      </div>
    </div>
  );
};

export default CodigoQrTecnico;
