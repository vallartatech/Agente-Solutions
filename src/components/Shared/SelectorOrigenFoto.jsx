import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import '../../styles/Shared/SelectorOrigenFoto.css';

// Elegir de dónde sale una foto: cámara o galería. Vidrio blanco como el resto de la app;
// va en un portal para quedar encima de cualquier modal.
const SelectorOrigenFoto = ({ abierto, onCamara, onGaleria, onCerrar, titulo = 'Agregar foto' }) => {
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <div className="sof-overlay" onClick={onCerrar}>
      <div className="sof-hoja" role="dialog" aria-modal="true" aria-labelledby="sof-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="sof-cabecera">
          <h3 id="sof-titulo">{titulo}</h3>
          <button type="button" className="sof-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="sof-opciones">
          <button type="button" className="sof-opcion" onClick={() => { onCamara(); onCerrar(); }}>
            <span className="sof-icono naranja"><Camera size={22} /></span>
            <span className="sof-texto">
              <strong>Tomar foto</strong>
              <small>Usa la cámara del dispositivo</small>
            </span>
          </button>
          <button type="button" className="sof-opcion" onClick={() => { onGaleria(); onCerrar(); }}>
            <span className="sof-icono azul"><ImageIcon size={22} /></span>
            <span className="sof-texto">
              <strong>Elegir de la galería</strong>
              <small>Usa una foto guardada</small>
            </span>
          </button>
        </div>

        <button type="button" className="sof-cancelar" onClick={onCerrar}>Cancelar</button>
      </div>
    </div>,
    document.body
  );
};

export default SelectorOrigenFoto;
