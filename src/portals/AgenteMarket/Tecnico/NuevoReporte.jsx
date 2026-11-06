import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Camera, ChevronLeft, Loader2, Upload, RefreshCw } from 'lucide-react';
import SelectorOrigenFoto from '../../../components/Shared/SelectorOrigenFoto';
import { ETAPAS_EVIDENCIA } from '../Shared/etapasEvidencia';
import '../../../styles/AgenteMarket/Tecnico/EvidenciasTrabajo.css';
import TecnicoHeader from '../../../components/Shared/TecnicoHeader';
import Swal from 'sweetalert2';

const NuevoReporte = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const trabajoId = location.state?.trabajoId;
  const servicio = location.state?.servicio;
  const returnPath = location.state?.from || '/mercado-trabajos';
  const stageKey = location.state?.stageKey || 'ANTES';

  const [imagePreview, setImagePreview] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const cerrarMenuFoto = useCallback(() => setIsPhotoMenuOpen(false), []);

  const selectPhotoSource = (source) => {
    if (source === 'camera') {
      cameraRef.current?.click();
    } else {
      galleryRef.current?.click();
    }
    setIsPhotoMenuOpen(false);
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 12 * 1024 * 1024) {
        Swal.fire('Imagen muy pesada', 'Por favor selecciona una foto menor a 12MB.', 'warning');
        return;
      }
      const previewURL = URL.createObjectURL(file);
      setImagePreview(previewURL);
      setImageFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!descripcion.trim()) {
      Swal.fire('Descripción requerida', 'Por favor escribe una descripción del reporte.', 'warning');
      return;
    }
    if (!imageFile) {
      Swal.fire('Foto requerida', 'Debes subir una fotografía como evidencia.', 'warning');
      return;
    }
    if (!trabajoId) {
      Swal.fire('Error', 'No se encontró el identificador del trabajo.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const formData = new FormData();
      const tag = `[${stageKey}]`;
      const cleanDesc = descripcion.replace(/\[(ANTES|DURANTE|DESPUÉS|DESPUES|EXTRA)\]/gi, '').trim();
      formData.append('description', `${tag} ${cleanDesc}`);
      formData.append('image', imageFile);

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/servicios/${trabajoId}/reportes`, formData, { headers });

      Swal.fire({
        icon: 'success',
        title: '¡Reporte Guardado!',
        text: 'La evidencia inicial se ha registrado con éxito.',
        timer: 1800,
        showConfirmButton: false,
      });

      navigate(`/galeria-reportes/${trabajoId}`, { 
        state: { trabajoId, servicio, from: returnPath } 
      });
    } catch (error) {
      console.error('Error al guardar reporte:', error);
      Swal.fire('Error al Guardar', 'Ocurrió un error al intentar guardar el reporte. Inténtalo de nuevo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const etapa = ETAPAS_EVIDENCIA.find((e) => e.key === stageKey);
  const nombreEtapa = etapa ? etapa.title.replace(/^\d+\.\s*/, '') : stageKey;

  return (
    <>
      <TecnicoHeader activeTab="tablero" />
      <div className="ge-page">
        <div className="ge-container ge-nuevo">
          <div className="ge-barra">
            <button type="button" className="ge-btn ge-btn-vidrio" onClick={() => navigate(returnPath, { state: { servicio, trabajoId } })}>
              <ChevronLeft size={18} /> Regresar
            </button>
          </div>

          <section className="ge-card ge-nuevo-card">
            <div className="ge-nuevo-head">
              <div>
                <h1>Nuevo reporte de servicio</h1>
                <p>Sube la foto y describe lo que encontraste.</p>
              </div>
              <span className="ge-estado requerido" style={{ background: '#64748b' }}>
                <Camera size={12} /> {nombreEtapa}
              </span>
            </div>

            <div className="ge-nuevo-grid">
              {/* Foto */}
              <div
                className={`ge-foto ${imagePreview ? '' : 'vacia'}`}
                onClick={() => setIsPhotoMenuOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsPhotoMenuOpen(true); }}
                aria-label={imagePreview ? 'Cambiar foto' : 'Subir foto'}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Vista previa del reporte" />
                    <span className="ge-foto-ampliar"><RefreshCw size={12} /> Cambiar foto</span>
                  </>
                ) : (
                  <>
                    <span className="ge-foto-icono"><Camera size={22} /></span>
                    <strong>Subir foto</strong>
                    <small>Cámara o galería · máx. 12 MB</small>
                  </>
                )}
              </div>

              {/* Descripción */}
              <div className="ge-campo">
                <label htmlFor="nuevo-reporte-desc">Descripción <em>*</em></label>
                <textarea
                  id="nuevo-reporte-desc"
                  className="ge-textarea"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder={etapa?.placeholderTecnico || 'Escribe la descripción del reporte...'}
                />
              </div>
            </div>

            <div className="ge-nuevo-pie">
              <button type="button" className="ge-btn ge-btn-primario" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 className="ge-girar" size={18} /> Subiendo reporte...</>
                  : <><Upload size={18} /> Guardar reporte</>}
              </button>
            </div>
          </section>

          <input type="file" ref={cameraRef} onChange={handleImageChange} style={{ display: 'none' }} accept="image/*" capture="environment" />
          <input type="file" ref={galleryRef} onChange={handleImageChange} style={{ display: 'none' }} accept="image/*" />
        </div>
      </div>

      <SelectorOrigenFoto
        abierto={isPhotoMenuOpen}
        titulo="Subir evidencia"
        onCamara={() => selectPhotoSource('camera')}
        onGaleria={() => selectPhotoSource('gallery')}
        onCerrar={cerrarMenuFoto}
      />
    </>
  );
};

export default NuevoReporte;
