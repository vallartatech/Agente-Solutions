import { useEffect, useState } from 'react';
import { QrCode, Download, Share2, Loader2 } from 'lucide-react';
import { dibujarQrTrabajo, tarjetaQrTrabajoPng, nombreArchivoQrTrabajo, folioVisible, urlDeTrabajo } from './qrTrabajo';
import { mostrarAviso } from '../../../utils/dialogos';
import '../../../styles/AgenteMarket/Shared/TecnicoQr.css';
import '../../../styles/AgenteMarket/Cliente/QrTrabajoCliente.css';

/**
 * Cliente de la red: QR del trabajo al final de su detalle. Lo descarga y luego, desde su
 * tablero, lo escanea (o sube la foto) para abrir directo este trabajo.
 */
const QrTrabajoCliente = ({ trabajo, propiedad }) => {
  const [imagen, setImagen] = useState(null);
  const [ocupado, setOcupado] = useState(null); // 'descargar' | 'compartir'
  const folio = folioVisible(trabajo);

  useEffect(() => {
    let vivo = true;
    setImagen(null);
    if (trabajo?.uid) dibujarQrTrabajo(trabajo.uid).then((src) => { if (vivo) setImagen(src); }).catch(() => {});
    return () => { vivo = false; };
  }, [trabajo?.uid]);

  const generar = () => tarjetaQrTrabajoPng(trabajo, propiedad);

  const descargar = async () => {
    setOcupado('descargar');
    try {
      const url = URL.createObjectURL(await generar());
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivoQrTrabajo(trabajo);
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

  // En el celular descargar no siempre guarda en la galería: compartir sí deja guardarlo
  const compartir = async () => {
    setOcupado('compartir');
    const texto = `Trabajo ${folio} · ${trabajo.titulo || ''}`.trim();
    try {
      const archivo = new File([await generar()], nombreArchivoQrTrabajo(trabajo), { type: 'image/png' });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: texto });
      } else if (navigator.share) {
        await navigator.share({ title: texto, url: urlDeTrabajo(trabajo.uid) });
      } else {
        await descargar();
      }
    } catch (e) {
      if (e?.name !== 'AbortError') mostrarAviso('No se pudo compartir el QR. Usa Descargar.', 'error');
    } finally {
      setOcupado(null);
    }
  };

  return (
    <section className="xp-card xp-panel qtc-panel">
      <h3 className="xp-panel-titulo"><QrCode size={18} /> QR del trabajo</h3>
      <div className="qtc-cuerpo">
        <div className="tqr-imagen qtc-imagen">
          {imagen ? <img src={imagen} alt={`Código QR del trabajo ${folio}`} /> : <Loader2 size={26} className="tqr-girar" />}
        </div>
        <div className="qtc-texto">
          <span className="qtc-folio">Folio {folio}</span>
          <p>Descárgalo y guárdalo. Para encontrar este trabajo, escanéalo desde tu <strong>Tablero</strong> con el botón del QR, o escribe el folio en el buscador.</p>
          <div className="tqr-acciones">
            <button type="button" className="tqr-btn tqr-btn-primario" onClick={descargar} disabled={!imagen || !!ocupado}>
              {ocupado === 'descargar' ? <Loader2 size={16} className="tqr-girar" /> : <Download size={16} />} Descargar
            </button>
            <button type="button" className="tqr-btn" onClick={compartir} disabled={!imagen || !!ocupado}>
              {ocupado === 'compartir' ? <Loader2 size={16} className="tqr-girar" /> : <Share2 size={16} />} Compartir
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QrTrabajoCliente;
