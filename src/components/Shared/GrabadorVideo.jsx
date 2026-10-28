import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, Check, SwitchCamera } from 'lucide-react';
import '../../styles/Shared/GrabadorVideo.css';

// Grabadora dentro de la app: graba a 720p y se detiene sola al llegar al límite
// (la cámara nativa del celular no deja limitar la duración).
export const puedeGrabarEnApp = () =>
  typeof window !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window.MediaRecorder !== 'undefined';

// iPhone graba MP4; Android/Chrome, WebM. El backend lo convierte a MP4 de todos modos.
const tipoGrabacion = () => {
  const opciones = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return opciones.find(t => window.MediaRecorder.isTypeSupported?.(t)) || '';
};

const GrabadorVideo = ({ maxSegundos = 4, onListo, onCerrar }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const grabadorRef = useRef(null);
  const partesRef = useRef([]);
  const temporizadorRef = useRef(null);

  const [camara, setCamara] = useState('environment');
  const [estado, setEstado] = useState('preparando'); // preparando | lista | grabando | revisar | error
  const [restante, setRestante] = useState(maxSegundos);
  const [grabado, setGrabado] = useState(null); // { file, url }
  const [error, setError] = useState('');

  const apagarCamara = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // Encender la cámara (y volver a encenderla al cambiar de frontal a trasera)
  useEffect(() => {
    let cancelado = false;
    setEstado('preparando');
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: camara, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    }).then(stream => {
      if (cancelado) { stream.getTracks().forEach(t => t.stop()); return; }
      apagarCamara();
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setEstado('lista');
    }).catch(() => {
      if (cancelado) return;
      setError('No se pudo abrir la cámara. Revisa que el navegador tenga permiso de cámara y micrófono.');
      setEstado('error');
    });
    return () => { cancelado = true; };
  }, [camara]);

  // Al cerrar: apagar cámara, temporizador y liberar el video grabado si no se usó
  useEffect(() => () => {
    clearInterval(temporizadorRef.current);
    if (grabadorRef.current?.state === 'recording') grabadorRef.current.stop();
    apagarCamara();
  }, []);

  const grabar = () => {
    if (!streamRef.current) return;
    const tipo = tipoGrabacion();
    const grabador = new MediaRecorder(streamRef.current, {
      ...(tipo ? { mimeType: tipo } : {}),
      videoBitsPerSecond: 2_500_000
    });
    partesRef.current = [];
    grabador.ondataavailable = (e) => { if (e.data?.size) partesRef.current.push(e.data); };
    grabador.onstop = () => {
      const mime = grabador.mimeType || tipo || 'video/webm';
      const blob = new Blob(partesRef.current, { type: mime.split(';')[0] });
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `evidencia-${Date.now()}.${ext}`, { type: blob.type, lastModified: Date.now() });
      setGrabado({ file, url: URL.createObjectURL(blob) });
      setEstado('revisar');
    };
    grabadorRef.current = grabador;
    grabador.start();
    setEstado('grabando');

    // Cuenta regresiva y corte automático al llegar al límite
    const inicio = Date.now();
    setRestante(maxSegundos);
    temporizadorRef.current = setInterval(() => {
      const pasados = (Date.now() - inicio) / 1000;
      setRestante(Math.max(0, Math.ceil(maxSegundos - pasados)));
      if (pasados >= maxSegundos) detener();
    }, 100);
  };

  const detener = () => {
    clearInterval(temporizadorRef.current);
    if (grabadorRef.current?.state === 'recording') grabadorRef.current.stop();
  };

  const repetir = () => {
    if (grabado) URL.revokeObjectURL(grabado.url);
    setGrabado(null);
    setRestante(maxSegundos);
    setEstado('lista');
  };

  const usar = () => {
    if (!grabado) return;
    apagarCamara();
    onListo(grabado.file);
  };

  const cerrar = () => {
    if (grabado) URL.revokeObjectURL(grabado.url);
    onCerrar();
  };

  return createPortal(
    <div className="gv-overlay" role="dialog" aria-label="Grabar video de evidencia">
      <div className="gv-caja">
        <button type="button" className="gv-cerrar" onClick={cerrar} aria-label="Cerrar"><X size={22} /></button>

        <div className="gv-pantalla">
          {estado === 'revisar' && grabado ? (
            <video src={grabado.url} controls autoPlay playsInline className="gv-video" />
          ) : (
            <video ref={videoRef} autoPlay muted playsInline className={`gv-video ${camara === 'user' ? 'espejo' : ''}`} />
          )}

          {estado === 'grabando' && (
            <div className="gv-contador"><span className="gv-punto" /> {restante}s</div>
          )}
          {estado === 'grabando' && (
            <div className="gv-barra"><div style={{ animationDuration: `${maxSegundos}s` }} /></div>
          )}
          {estado === 'preparando' && <div className="gv-aviso">Abriendo cámara…</div>}
          {estado === 'error' && <div className="gv-aviso">{error}</div>}
        </div>

        <div className="gv-controles">
          {estado === 'revisar' ? (
            <>
              <button type="button" className="gv-btn secundario" onClick={repetir}><RotateCcw size={18} /> Repetir</button>
              <button type="button" className="gv-btn primario" onClick={usar}><Check size={18} /> Usar video</button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="gv-btn icono"
                onClick={() => setCamara(c => (c === 'environment' ? 'user' : 'environment'))}
                disabled={estado === 'grabando' || estado === 'preparando'}
                aria-label="Cambiar cámara"
                title="Cambiar cámara"
              >
                <SwitchCamera size={20} />
              </button>
              <button
                type="button"
                className={`gv-grabar ${estado === 'grabando' ? 'on' : ''}`}
                onClick={estado === 'grabando' ? detener : grabar}
                disabled={estado !== 'lista' && estado !== 'grabando'}
                aria-label={estado === 'grabando' ? 'Detener' : 'Grabar'}
              />
              <span className="gv-hint">Máx. {maxSegundos} s</span>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GrabadorVideo;
