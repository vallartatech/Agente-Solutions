import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Shield, 
  Edit3, 
  Trash2,
  Sparkles,
  MapPin,
  ShieldCheck,
  Award
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Shared/Header';
import '../../../styles/Shared/Profile.css';
import { mostrarAviso } from '../../../utils/dialogos';
import PanelPerfilProfesional from './PerfilProfesional/PanelPerfilProfesional';
import MiQrTecnico from './MiQrTecnico';

export const ESPECIALIDADES_CATALOGO = [
  { id: 1, name: "Electricidad", icon: "⚡", desc: "Instalaciones, cableado, tableros y cortos" },
  { id: 2, name: "Plomería", icon: "🚰", desc: "Fugas, bombas, tinacos y tuberías" },
  { id: 3, name: "Aire Acondicionado (HVAC)", icon: "❄️", desc: "Mantenimiento, gas y climatización" },
  { id: 4, name: "Pintura e Impermeabilización", icon: "🎨", desc: "Muros, fachadas y techos" },
  { id: 5, name: "Albañilería y Remodelación", icon: "🧱", desc: "Acabados, pisos y mampostería" },
  { id: 6, name: "Carpintería y Muebles", icon: "🪚", desc: "Puertas, closets y cocinas integrales" },
  { id: 7, name: "Cerrajería y Seguridad", icon: "🔑", desc: "Chapas, duplicados y cerraduras" },
  { id: 8, name: "Limpieza y Mantenimiento", icon: "🧹", desc: "Limpieza profunda y mantenimiento gral" },
  { id: 9, name: "Multi-técnico / General", icon: "🧰", desc: "Servicios varios de reparación" },
  { id: 10, name: "Electrodomésticos y Equipos", icon: "🔌", desc: "Lavadoras, refrigeradores y hornos" },
  { id: 11, name: "Jardinería y Exteriores", icon: "🪴", desc: "Pasto, poda, sistemas de riego" },
  { id: 12, name: "Redes y CCTV", icon: "🖥️", desc: "Cámaras de seguridad y cableado de red" }
];

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1920&q=80';

const PerfilTecnico = () => {
  const { user, loginGlobal, logoutGlobal } = useAuth();
  const navigate = useNavigate();

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const uploadTargetRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [, setModalSpecialties] = useState([]);
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteDoneMsg, setDeleteDoneMsg] = useState('');

  // Cargar especialidades del técnico desde el backend
  useEffect(() => {
    if (user?.id) {
      const fetchMySpecialties = async () => {
        try {
          const rawId = String(user.id).replace(/[^\d]/g, '');
          const token = localStorage.getItem('agente_token');
          const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/u_${rawId}/specialties`, authHeader);
          if (res.data?.success && res.data?.specialties) {
            const specsArray = res.data.specialties;
            const specsNames = specsArray.map(s => typeof s === 'string' ? s : s.name);
            if (specsNames.length > 0) {
              setSelectedSpecialties(specsNames);
              setModalSpecialties(specsNames);
            } else if (user.specialties && user.specialties.length > 0) {
              const fromUser = user.specialties.map(s => typeof s === 'string' ? s : s.name);
              setSelectedSpecialties(fromUser);
              setModalSpecialties(fromUser);
            }
          } else if (user.specialties && user.specialties.length > 0) {
            const fromUser = user.specialties.map(s => typeof s === 'string' ? s : s.name);
            setSelectedSpecialties(fromUser);
            setModalSpecialties(fromUser);
          }
        } catch (err) {
          console.error("Error cargando especialidades del técnico:", err);
          if (user?.specialties && user.specialties.length > 0) {
            const fromUser = user.specialties.map(s => typeof s === 'string' ? s : s.name);
            setSelectedSpecialties(fromUser);
            setModalSpecialties(fromUser);
          }
        }
      };
      fetchMySpecialties();
    }
  }, [user?.id, user?.specialties]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    birth_date: ''
  });

  const openModal = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      birth_date: user?.birth_date || ''
    });
    setModalSpecialties(selectedSpecialties.length > 0 ? selectedSpecialties : ["Electricidad"]);
    setIsModalOpen(true);
  };

  // Perfil profesional (cobro, habilidades, currículum, INE): sus insignias se muestran en la tarjeta izquierda
  const [insignias, setInsignias] = useState({ identidad_verificada: false, estudios_verificados: false });
  const actualizarPerfilProfesional = useCallback((perfilProfesional) => {
    setInsignias(perfilProfesional?.insignias || { identidad_verificada: false, estudios_verificados: false });
    const nombres = (perfilProfesional?.especialidades || []).map(e => e.name);
    if (nombres.length) setSelectedSpecialties(nombres);
  }, []);
  const calificacion = Number(user?.rating_stars_avg || 5).toFixed(1);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingSpecs(true);
    try {
      const token = localStorage.getItem('agente_token');

      // Datos personales (las habilidades se guardan en "Perfil profesional")
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/usuarios/update-profile`, {
        user_id: user.id,
        ...formData
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      loginGlobal({
        ...user,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        birth_date: formData.birth_date
      });

      setIsModalOpen(false);
      mostrarAviso("¡Datos actualizados con éxito!");
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Hubo un error al actualizar los datos.";
      mostrarAviso(errorMsg);
    } finally {
      setSavingSpecs(false);
    }
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!user?.id) return mostrarAviso("Error: La sesión no tiene el ID.");

    if (file.size > 10 * 1024 * 1024) {
      return mostrarAviso("La imagen es muy pesada. Por favor elige una menor a 10MB.");
    }

    const uploadData = new FormData();
    uploadData.append('image', file); 
    uploadData.append('type', type); 

    try {
      setIsUploading(true);
      const token = localStorage.getItem('agente_token'); 

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/upload-profile-picture`, uploadData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        }
      });

      const nuevaUrlNube = res.data.url;

      loginGlobal({
        ...user, 
        [type]: nuevaUrlNube
      });

      mostrarAviso(`¡${type === 'profile_picture' ? 'Foto de perfil' : 'Portada'} actualizada con éxito!`);

    } catch (error) {
      console.error("Error en handleFileUpload:", error);
      mostrarAviso("Error al subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  const cerrarTrasEliminar = () => {
    logoutGlobal();
    navigate('/');
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmEmail !== user?.email) {
      setDeleteError("El correo no coincide con tu usuario.");
      return;
    }
    setDeletingAccount(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem("agente_token");
      const res = await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/users/delete-my-account`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      // La cuenta queda en eliminación pendiente (30 días): se avisa y luego se cierra sesión
      setIsDeleteModalOpen(false);
      setDeletingAccount(false);
      setDeleteDoneMsg(res.data?.message || 'Tu cuenta se eliminará definitivamente en 30 días. Si fue un error, contacta a soporte.');
    } catch (error) {
      console.error("Error al eliminar cuenta:", error);
      setDeleteError(error.response?.data?.error || "No se pudo eliminar tu cuenta. Por favor contacta a soporte.");
      setDeletingAccount(false);
    }
  };

  const openPhotoMenu = (type) => {
    uploadTargetRef.current = type;
    setIsPhotoMenuOpen(true);
  };

  const selectPhotoSource = (source) => {
    if (source === 'camera') {
      cameraRef.current.click();
    } else {
      galleryRef.current.click();
    }
    setIsPhotoMenuOpen(false);
  };

  const obtenerNombreRol = (roleId) => {
    switch(Number(roleId)) {
      case 2: return 'Técnico Agente';
      case 6: return 'Contratista';
      case 8: return 'Técnico de la Red';
      default: return 'Técnico';
    }
  };

  const formatearFecha = (fechaDb) => {
    if (!fechaDb) return 'No registrada'; 
    const fecha = new Date(fechaDb);
    fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset());
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const nombreCompleto = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.name || 'Técnico';
  const coverUrl = user?.cover_picture || DEFAULT_COVER;


  return (
    <div className="profile-liquid-root">
      {/* Mismo encabezado que el resto del portal del técnico (incluye calendario, menú de perfil y barra móvil) */}
      <Header activeModule="perfil" />

      {/* ── MAIN DASHBOARD VIEWPORT ── */}
      <main className="profile-dashboard-viewport">
        <div className="profile-dashboard-content">

          {/* ── 1. WIDE HERO BANNER CARD ── */}
          <section className="profile-wide-banner-card">
            <img 
              src={coverUrl} 
              alt="Portada del perfil" 
              className="profile-wide-banner-img" 
            />
            <div className="profile-wide-banner-overlay" />
            <button 
              type="button" 
              className="profile-wide-banner-btn"
              onClick={() => openPhotoMenu('cover_picture')}
              disabled={isUploading}
              title="Cambiar imagen de portada"
            >
              <Camera size={14} />
              <span>{isUploading ? 'SUBIENDO...' : 'CAMBIAR PORTADA'}</span>
            </button>
          </section>

          {/* ── 2. TRES COLUMNAS (cada una con su propio scroll): datos del técnico, perfil profesional y código QR ── */}
          <div className="ptr-layout">

            {/* ── IZQUIERDA: identidad, insignias y datos personales ── */}
            <aside className="ptr-lateral">
              <div className="ptr-identidad">
                <div className="profile-identity-avatar-wrap" onClick={() => openPhotoMenu('profile_picture')} title="Cambiar foto de perfil">
                  {user?.profile_picture ? (
                    <img src={user.profile_picture} alt="Perfil" className="profile-identity-avatar-img" />
                  ) : (
                    <div className="profile-identity-avatar-initial">
                      {user?.first_name ? user.first_name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : 'T')}
                    </div>
                  )}
                  <div className="profile-identity-avatar-hover">
                    <Camera size={16} />
                    <span>CAMBIAR</span>
                  </div>
                </div>

                <h1 className="ptr-nombre" title={nombreCompleto}>{nombreCompleto}</h1>
                <div className="profile-identity-tags-row">
                  <span className="profile-identity-role-badge">
                    <Shield size={11} /> {obtenerNombreRol(user?.role_id)}
                  </span>
                  <span className="profile-identity-status-badge">
                    <Sparkles size={10} /> ACTIVO
                  </span>
                </div>

                {/* Insignias reales del perfil profesional */}
                <div className="ptr-insignias">
                  <span className={`ptr-insignia ${insignias.identidad_verificada ? 'on' : ''}`}>
                    {insignias.identidad_verificada ? <ShieldCheck size={13} /> : <Shield size={13} />}
                    {insignias.identidad_verificada ? 'Identidad verificada' : 'Identidad sin verificar'}
                  </span>
                  <span className={`ptr-insignia ${insignias.estudios_verificados ? 'on' : ''}`}>
                    <Award size={13} />
                    {insignias.estudios_verificados ? 'Estudios verificados' : 'Estudios sin verificar'}
                  </span>
                </div>

                <div className="ptr-stats">
                  <span><strong className="ptr-estrella">★ {calificacion}</strong> Calificación</span>
                  <span><MapPin size={13} /> <strong>Mérida</strong> Cobertura</span>
                </div>
              </div>

              {/* Datos personales en lista compacta */}
              <dl className="ptr-datos">
                <div><dt><Mail size={14} /> Correo</dt><dd title={user?.email}>{user?.email || 'No registrado'}</dd></div>
                <div><dt><Phone size={14} /> Teléfono</dt><dd>{user?.phone_number || 'No registrado'}</dd></div>
                <div><dt><Calendar size={14} /> Nacimiento</dt><dd>{formatearFecha(user?.birth_date)}</dd></div>
                <div><dt><Clock size={14} /> Miembro desde</dt><dd>{formatearFecha(user?.created_at)}</dd></div>
              </dl>

              <button
                type="button"
                className="profile-identity-edit-btn"
                onClick={openModal}
                title="Editar nombre, teléfono, correo y fecha de nacimiento"
              >
                <Edit3 size={15} />
                <span>EDITAR DATOS</span>
              </button>

              <button
                type="button"
                className="profile-identity-delete-btn ptr-eliminar"
                onClick={() => {
                  setDeleteConfirmEmail('');
                  setDeleteError('');
                  setIsDeleteModalOpen(true);
                }}
                title="Eliminar mi cuenta"
              >
                <Trash2 size={12} />
                <span>Eliminar mi Cuenta</span>
              </button>
            </aside>

            {/* ── CENTRO: perfil profesional (cobro, habilidades, currículum e INE) en ventanas desplegables ── */}
            <div className="ptr-principal">
              <PanelPerfilProfesional onCambio={actualizarPerfilProfesional} />
            </div>

            {/* ── DERECHA: código QR del técnico ── */}
            <aside className="ptr-qr">
              <MiQrTecnico
                nombre={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.name}
                subtitulo={obtenerNombreRol(user?.role_id)}
              />
            </aside>
          </div>

        </div>

      </main>

      {/* ── MODAL: EDITAR PERFIL Y ESPECIALIDADES DEL TÉCNICO ── */}
      {isModalOpen && (
        <div className="profile-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="profile-modal-liquid-card" onClick={e => e.stopPropagation()}>
            <button 
              type="button" 
              className="profile-modal-close-btn" 
              onClick={() => setIsModalOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={20} strokeWidth={2.5} color="#ffffff" />
            </button>
            
            <h3 className="profile-modal-title">
              <Edit3 size={20} color="#FF6600" /> EDITAR PERFIL TÉCNICO
            </h3>
            
            <form onSubmit={handleSaveProfile} className="profile-modal-form">
              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label>Nombre(s)</label>
                  <input type="text" required value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
                </div>
                <div className="profile-form-group">
                  <label>Apellidos</label>
                  <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
                </div>
              </div>

              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label>Teléfono Celular</label>
                  <input type="tel" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
                </div>
                <div className="profile-form-group">
                  <label>Fecha de Nacimiento</label>
                  <input type="date" value={formData.birth_date} onChange={(e) => setFormData({...formData, birth_date: e.target.value})} />
                </div>
              </div>

              <div className="profile-form-group">
                <label>Correo Electrónico</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>

              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                🛠️ Tus habilidades, datos de cobro, currículum e INE se editan en la columna <strong>Perfil profesional</strong>.
              </p>

              <div className="profile-modal-actions">
                <button type="button" className="profile-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="profile-btn-save" disabled={savingSpecs}>
                  {savingSpecs ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AVISO: ELIMINACIÓN SOLICITADA ── */}
      {deleteDoneMsg && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal-liquid-card delete-card" onClick={e => e.stopPropagation()}>
            <h3 className="profile-modal-title" style={{ color: '#ef4444' }}>
              <Trash2 size={20} /> Eliminación solicitada
            </h3>
            <p style={{ margin: '0 0 16px', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {deleteDoneMsg}
            </p>
            <div className="profile-modal-actions">
              <button type="button" className="profile-btn-danger" onClick={cerrarTrasEliminar}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ELIMINAR CUENTA ── */}
      {isDeleteModalOpen && (
        <div className="profile-modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="profile-modal-liquid-card delete-card" onClick={e => e.stopPropagation()}>
            <button 
              type="button" 
              className="profile-modal-close-btn" 
              onClick={() => setIsDeleteModalOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={20} strokeWidth={2.5} color="#ffffff" />
            </button>
            <h3 className="profile-modal-title" style={{ color: '#ef4444' }}>
              <Trash2 size={20} /> Eliminar Cuenta
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.88rem', lineHeight: '1.5' }}>
                Tu cuenta en <strong>Agente Solutions</strong> se desactivará de inmediato y se <strong>eliminará definitivamente en 30 días</strong>: nombre, correo, teléfono, fotos, documentos, ubicaciones y mensajes. Las órdenes de trabajo y los pagos se conservan sin tus datos personales. Si fue un error, contacta a soporte dentro de ese plazo.
              </p>
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '10px 14px', borderRadius: '10px' }}>
                <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.80rem' }}>
                  💡 <em>Para confirmar, escribe tu correo electrónico (<strong>{user?.email}</strong>):</em>
                </p>
              </div>
              <input
                type="text"
                placeholder={user?.email || 'Escribe tu correo...'}
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                className="profile-delete-input"
              />
              {deleteError && (
                <div style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 'bold' }}>
                  {deleteError}
                </div>
              )}
              <div className="profile-modal-actions" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="profile-btn-cancel"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={deletingAccount}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAccount}
                  disabled={deletingAccount || deleteConfirmEmail !== user?.email}
                  className="profile-btn-danger"
                >
                  {deletingAccount ? 'Eliminando...' : 'Sí, Eliminar Cuenta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CAMBIAR FOTO ── */}
      {isPhotoMenuOpen && (
        <div className="profile-modal-backdrop" onClick={() => setIsPhotoMenuOpen(false)}>
          <div className="profile-modal-liquid-card photo-card" onClick={e => e.stopPropagation()}>
            <button 
              type="button" 
              className="profile-modal-close-btn" 
              onClick={() => setIsPhotoMenuOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={20} strokeWidth={2.5} color="#ffffff" />
            </button>
            <h3 className="profile-modal-title" style={{ textAlign: 'center' }}>
              Actualizar Imagen
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <button className="profile-menu-action-btn" onClick={() => selectPhotoSource('camera')}>
                📷 Tomar Foto con Cámara
              </button>
              <button className="profile-menu-action-btn" onClick={() => selectPhotoSource('gallery')}>
                🖼️ Elegir de la Galería
              </button>
              <button className="profile-btn-cancel" style={{ marginTop: '6px' }} onClick={() => setIsPhotoMenuOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs for uploads */}
      <input 
        type="file" 
        ref={cameraRef} 
        accept="image/*" 
        capture="environment" 
        style={{ display: 'none' }} 
        onChange={(e) => handleFileUpload(e, uploadTargetRef.current)} 
      />
      <input 
        type="file" 
        ref={galleryRef} 
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={(e) => handleFileUpload(e, uploadTargetRef.current)} 
      />


    </div>
  );
};

export default PerfilTecnico;
