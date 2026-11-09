import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import jsQR from 'jsqr';
import { X, ScanLine, ImageUp, CameraOff } from 'lucide-react';
import { codigoDeTexto } from './qrTecnico';
import '../../../styles/AgenteMarket/Shared/TecnicoQr.css';

// Lado máximo del cuadro que se analiza: suficiente para leer el QR sin cargar el teléfono
const LADO_ANALISIS = 640;

const leerDe = (fuente, ancho, alto, canvas, intentarAmbos = false) => {
  const escala = Math.min(1, LADO_ANALISIS / Math.max(ancho, alto));
  const w = Math.round(ancho * escala);
  const h = Math.round(alto * escala);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(fuente, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return jsQR(data, w, h, { inversionAttempts: intentarAmbos ? 'attemptBoth' : 'dontInvert' });
};

/**
 * Escáner de QR de técnicos con la cámara trasera (o desde una foto).
 *  onCodigo(codigo): se llama una vez con el código del técnico leído
 *  onCerrar()
 */
const EscanerQr = ({ onCodigo, onCerrar }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const archivoRef = useRef(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const listoRef = useRef(false);
  // El ciclo de la cámara vive desde el primer render: lee siempre el callback más reciente
  const onCodigoRef = useRef(onCodigo);
  onCodigoRef.current = onCodigo;

  const procesar = (texto) => {
    const codigo = codigoDeTexto(texto);
    if (!codigo) {
      setAviso('Ese código QR no es de un técnico de Agente Market.');
      return false;
    }
    listoRef.current = true;
    onCodigoRef.current(codigo);
    return true;
  };

  useEffect(() => {
    let stream = null;
    let cuadro = null;
    let vivo = true;
    let ultimoAviso = 0;

    const analizar = () => {
      if (!vivo || listoRef.current) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth) {
        const res = leerDe(video, video.videoWidth, video.videoHeight, canvasRef.current);
        if (res?.data) {
          if (procesar(res.data)) return;
          ultimoAviso = Date.now();
        } else if (ultimoAviso && Date.now() - ultimoAviso > 2500) {
          setAviso(null);
          ultimoAviso = 0;
        }
      }
      cuadro = requestAnimationFrame(analizar);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador no permite usar la cámara. Sube una foto del código QR.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!vivo) { stream.getTracks().forEach(t => t.stop()); return; }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play().catch(() => {});
        cuadro = requestAnimationFrame(analizar);
      } catch (e) {
        setError(e?.name === 'NotAllowedError'
          ? 'No diste permiso para usar la cámara. Actívalo en la configuración del navegador o sube una foto del código QR.'
          : 'No se pudo abrir la cámara. Sube una foto del código QR.');
      }
    })();

    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => {
      vivo = false;
      if (cuadro) cancelAnimationFrame(cuadro);
      stream?.getTracks().forEach(t => t.stop());
      window.removeEventListener('keydown', alTeclear);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const desdeFoto = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const res = leerDe(img, img.naturalWidth, img.naturalHeight, canvasRef.current, true);
      URL.revokeObjectURL(url);
      if (!res?.data) setAviso('No se encontró un código QR en la foto. Intenta con una más clara.');
      else procesar(res.data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setAviso('No se pudo abrir la imagen.'); };
    img.src = url;
  };

  return createPortal(
    <div className="tqr-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="tqr-escaner" role="dialog" aria-modal="true" aria-label="Escanear código QR">
        <header className="tqr-escaner-cabeza">
          <span className="tqr-escaner-icono"><ScanLine size={18} /></span>
          <div>
            <h2>Escanear código QR</h2>
            <p>Apunta la cámara al QR del técnico</p>
          </div>
          <button type="button" className="tqr-cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </header>

        <div className="tqr-visor">
          {error ? (
            <div className="tqr-visor-error"><CameraOff size={30} /><p>{error}</p></div>
          ) : (
            <>
              <video ref={videoRef} playsInline muted />
              <span className="tqr-marco" aria-hidden="true" />
            </>
          )}
          {aviso && <div className="tqr-visor-aviso">{aviso}</div>}
        </div>

        <canvas ref={canvasRef} hidden />
        <input ref={archivoRef} type="file" accept="image/*" hidden onChange={desdeFoto} />
        <button type="button" className="tqr-btn tqr-btn-ancho" onClick={() => archivoRef.current?.click()}>
          <ImageUp size={16} /> Subir foto del código QR
        </button>
      </div>
    </div>,
    document.body
  );
};

export default EscanerQr;
