import { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  X, 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Shield, 
  Edit3, 
  Trash2,
  Sparkles,
  Building2,
  MapPin,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/Logo3.png"; 
import defaultPropImg from "../../assets/propiedad_ejemplo.jpg";
import "../../styles/Shared/Profile.css"; 

const ESPECIALIDADES_CATALOGO = [
  { id: 1, name: "Electricidad", icon: "⚡" },
  { id: 2, name: "Plomería", icon: "🚰" },
  { id: 3, name: "Aire Acondicionado (HVAC)", icon: "❄️" },
  { id: 4, name: "Pintura e Impermeabilización", icon: "🎨" },
  { id: 5, name: "Albañilería y Remodelación", icon: "🧱" },
  { id: 6, name: "Carpintería y Muebles", icon: "🪚" },
  { id: 7, name: "Cerrajería y Seguridad", icon: "🔑" },
  { id: 8, name: "Limpieza y Mantenimiento", icon: "🧹" },
  { id: 9, name: "Multi-técnico / General", icon: "🧰" },
  { id: 10, name: "Electrodomésticos y Equipos", icon: "🔌" },
  { id: 11, name: "Jardinería y Exteriores", icon: "🪴" },
  { id: 12, name: "Redes y CCTV", icon: "🖥️" }
];

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80';

const Profile = () => {
  const { user, loginGlobal, logoutGlobal } = useAuth();
  const navigate = useNavigate();

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const uploadTargetRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Propiedades del usuario para el carrusel de la derecha
  const [propiedades, setPropiedades] = useState([]);
  const [selectedPropId, setSelectedPropId] = useState(null);

  useEffect(() => {
    const fetchProps = async () => {
      try {
        const token = localStorage.getItem('agente_token');
        const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades`, authHeader);
        const rawProps = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        
        const forThisUser = rawProps.filter(p => 
          (user?.id && (p.user_id === user.id || p.usuario_id === user.id || p.cliente_id === user.id || p.cliente?.id === user.id)) ||
          (user?.tenant_id && p.tenant_id === user.tenant_id)
        );
        const list = forThisUser.length > 0 ? forThisUser : rawProps;
        setPropiedades(list);
        if (list.length > 0) {
          setSelectedPropId(list[0].id);
        }
      } catch (err) {
        console.error("Error al cargar propiedades en perfil:", err);
      }
    };
    fetchProps();
  }, [user?.id, user?.tenant_id]);

  const getPropImage = (p) => {
    if (!p) return defaultPropImg;
    return (
      p.foto_url ||
      p.facade_photo_path ||
      p.facade_photo ||
      p.imagen_url ||
      p.foto_fachada ||
      p.foto ||
      p.image ||
      defaultPropImg
    );
  };

  const activeProperty = useMemo(() => {
    if (!propiedades || propiedades.length === 0) {
      return {
        id: 1,
        nombre_propiedad: 'MI PROPIEDAD',
        address: 'Residencial Las Palmas #142, Mérida, Yucatán',
        imagen_url: defaultPropImg
      };
    }
    return propiedades.find(p => p.id === selectedPropId) || propiedades[0];
  }, [propiedades, selectedPropId]);

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmEmail !== user?.email) {
      setDeleteError("El correo no coincide con tu usuario.");
      return;
    }
    setDeletingAccount(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem("agente_token");
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/users/delete-my-account`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      logoutGlobal();
      navigate('/login');
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
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    birth_date: ''
  });

  useEffect(() => {
    if (user?.role_id === 2 && user?.id) {
      const fetchMySpecialties = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/u_${user.id}/specialties`);
          if (res.data?.success && res.data?.specialties) {
            const specsArray = res.data.specialties;
            const specsNames = specsArray.map(s => typeof s === 'string' ? s : s.name);
            setSelectedSpecialties(specsNames);
            if (loginGlobal && JSON.stringify(user.specialties || []) !== JSON.stringify(specsArray)) {
              loginGlobal({ ...user, specialties: specsArray });
            }
          }
        } catch (err) {
          console.error("Error cargando especialidades del técnico:", err);
        }
      };
      fetchMySpecialties();
    }
  }, [user?.id, user?.role_id]);

  const obtenerNombreRol = (roleId) => {
    switch(roleId) {
      case 0: return 'Usuario Root';
      case 1: return 'Administrador';
      case 2: return 'Técnico';
      case 3: return 'Cliente';
      case 4: return 'Negocio';
      case 5: return 'Autónomo';
      case 6: return 'Contratista';
      case 7: return 'Admin Propiedades';
      case 8: return 'Técnico de la Red';
      default: return 'Usuario';
    }
  };

  const formatearFecha = (fechaDb) => {
    if (!fechaDb) return 'No registrada'; 
    const fecha = new Date(fechaDb);
    fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset());
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const openModal = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      birth_date: user?.birth_date || ''
    });
    if (user?.role_id === 2 || user?.role_id === 8) {
      const specs = (user?.specialties && user.specialties.length > 0)
        ? user.specialties.map(s => typeof s === 'string' ? s : s.name)
        : (selectedSpecialties.length > 0 ? selectedSpecialties : ["Electricidad"]);
      setSelectedSpecialties(specs);
    }
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault(); 
    try {
      const token = localStorage.getItem('agente_token');
      
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/usuarios/update-profile`, {
        user_id: user.id,
        ...formData
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let updatedSpecs = user?.specialties || [];
      if (user?.role_id === 2 || user?.role_id === 8) {
        const specRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/u_${user.id}/specialties`, {
          specialties: selectedSpecialties
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (specRes.data?.specialties) {
          updatedSpecs = specRes.data.specialties;
        }
      }
      
      loginGlobal({
        ...user,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        birth_date: formData.birth_date,
        specialties: updatedSpecs
      });

      setIsModalOpen(false);
      alert("¡Datos actualizados con éxito!");
    } catch (error) {
      console.error("Error en handleSaveProfile:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Hubo un error al actualizar los datos.";
      alert(errorMsg);
    }
  };

  // --- SUBIDA CLOUDINARY ---
  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!user?.id) return alert("Error: La sesión no tiene el ID.");

    if (file.size > 10 * 1024 * 1024) {
      return alert("La imagen es muy pesada. Por favor elige una menor a 10MB.");
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

      alert(`¡${type === 'profile_picture' ? 'Foto de perfil' : 'Portada'} actualizada con éxito!`);

    } catch (error) {
      console.error("Error en handleFileUpload:", error);
      alert("Error al subir la imagen. Revisa la consola.");
    } finally {
      setIsUploading(false);
    }
  };

  const nombreCompleto = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.name || 'Usuario';
  const coverUrl = user?.cover_picture || getPropImage(activeProperty) || DEFAULT_COVER;

  return (
    <div className="profile-liquid-root">
      {/* Cinematic Full-bleed Background */}
      <div 
        className="profile-liquid-bg-layer"
        style={{ backgroundImage: `url("${coverUrl}")` }}
      />
      <div className="profile-liquid-bg-overlay" />

      {/* Top Floating Action Bar */}
      <header className="profile-liquid-topbar">
        <div className="profile-topbar-left">
          <button 
            type="button"
            className="profile-glass-pill-btn" 
            onClick={() => navigate(-1)}
            title="Volver atrás"
          >
            <ChevronLeft size={16} />
            <span>REGRESAR</span>
          </button>

          <button 
            type="button"
            className="profile-glass-pill-btn" 
            onClick={() => openPhotoMenu('cover_picture')}
            title="Cambiar imagen de portada"
          >
            <Camera size={14} />
            <span>CAMBIAR PORTADA</span>
          </button>
        </div>

        <div className="profile-topbar-right">
          <div className="profile-logo-glass-badge">
            <img src={logo} alt="Agente Solutions" className="profile-top-logo" />
          </div>
        </div>
      </header>

      {/* Main Split Layout: 3 Columns Architecture (Identidad Propia Izquierda | Datos Centro | Propiedades Derecha) */}
      <main className="profile-three-col-viewport">
        
        {/* ── COLUMNA 1: IDENTIDAD Y FOTO DE PERFIL (PROPIA A LA IZQUIERDA) ── */}
        <section className="profile-col-identity">
          <div className="profile-identity-card">
            
            <div className="profile-identity-avatar-wrap" onClick={() => openPhotoMenu('profile_picture')} title="Cambiar foto de perfil">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Avatar" className="profile-identity-avatar-img" />
              ) : (
                <div className="profile-identity-avatar-initial">
                  {user?.first_name ? user.first_name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : '👤')}
                </div>
              )}
              <div className="profile-identity-avatar-hover">
                <Camera size={24} color="#ffffff" />
                <span>CAMBIAR FOTO</span>
              </div>
            </div>

            <input type="file" ref={cameraRef} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, uploadTargetRef.current)} accept="image/*" capture="environment" />
            <input type="file" ref={galleryRef} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, uploadTargetRef.current)} accept="image/*" />

            <div className="profile-identity-info-box">
              <h1 className="profile-identity-name">{nombreCompleto}</h1>
              <div className="profile-identity-badges">
                <span className="profile-identity-role-badge">
                  <Shield size={11} /> {obtenerNombreRol(user?.role_id)}
                </span>
                <span className="profile-identity-status-badge">
                  <Sparkles size={10} /> ACTIVO
                </span>
              </div>
            </div>

            <button 
              type="button" 
              className="profile-identity-edit-btn" 
              onClick={openModal}
              title="Editar información de perfil"
            >
              <Edit3 size={15} />
              <span>EDITAR DATOS</span>
            </button>

            {user?.role_id !== 0 && (
              <div className="profile-identity-danger-zone">
                <button
                  type="button"
                  className="profile-identity-delete-btn"
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
              </div>
            )}

          </div>
        </section>

        {/* ── COLUMNA 2: DATOS DEL USUARIO (CENTRO) ── */}
        <section className="profile-col-data">
          
          <div className="profile-data-heading">
            <span className="profile-heading-text">DATOS DEL USUARIO</span>
            <div className="profile-heading-line" />
          </div>

          <div className="profile-data-tiles-list">
            <div className="profile-floating-tile">
              <div className="profile-tile-icon-wrap">
                <User size={15} />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">NOMBRE COMPLETO</span>
                <span className="profile-tile-val">{nombreCompleto}</span>
              </div>
            </div>

            <div className="profile-floating-tile is-accent">
              <div className="profile-tile-icon-wrap is-accent">
                <Shield size={15} />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">ROL EN SISTEMA</span>
                <span className="profile-tile-val is-accent-text">{obtenerNombreRol(user?.role_id)}</span>
              </div>
            </div>

            <div className="profile-floating-tile">
              <div className="profile-tile-icon-wrap">
                <Mail size={15} />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">CORREO ELECTRÓNICO</span>
                <span className="profile-tile-val" title={user?.email}>{user?.email || 'No registrado'}</span>
              </div>
            </div>

            <div className="profile-floating-tile">
              <div className="profile-tile-icon-wrap">
                <Phone size={15} />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">TELÉFONO</span>
                <span className="profile-tile-val">{user?.phone_number || 'No registrado'}</span>
              </div>
            </div>

            <div className="profile-floating-tile">
              <div className="profile-tile-icon-wrap">
                <Calendar size={15} />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">FECHA DE NACIMIENTO</span>
                <span className="profile-tile-val">{formatearFecha(user?.birth_date)}</span>
              </div>
            </div>

            <div className="profile-floating-tile">
              <div className="profile-tile-icon-wrap">
                <Clock size={15} />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">MIEMBRO DESDE</span>
                <span className="profile-tile-val">{formatearFecha(user?.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Specialties for Technicians */}
          {(user?.role_id === 2 || user?.role_id === 8) && (() => {
            const displaySpecs = (user?.specialties && user.specialties.length > 0)
              ? user.specialties
              : (selectedSpecialties.length > 0 ? selectedSpecialties : null);
            return (
              <div className="profile-floating-specs-bar">
                <span className="profile-specs-label">🛠️ ESPECIALIDADES:</span>
                <div className="profile-specs-pills">
                  {displaySpecs ? (
                    displaySpecs.map((s, idx) => {
                      const specName = typeof s === 'string' ? s : s.name;
                      const specObj = ESPECIALIDADES_CATALOGO.find(item => item.name === specName) || (typeof s === 'object' ? s : null);
                      const icon = specObj ? (specObj.icon || '⚡') : '⚡';
                      return (
                        <span key={idx} className="profile-spec-pill">
                          {icon} {specName}
                        </span>
                      );
                    })
                  ) : (
                    <span className="profile-no-specs">Sin especialidades</span>
                  )}
                </div>
              </div>
            );
          })()}

        </section>

        {/* ── COLUMNA 3: PROPIEDADES ASOCIADAS Y CARRUSEL (DERECHA) ── */}
        <section className="profile-col-properties">
          
          {/* Header de Propiedades */}
          <div className="profile-props-header-row">
            <div className="profile-props-title-wrap">
              <Building2 size={18} color="#FF6600" />
              <h2 className="profile-props-title">MIS PROPIEDADES</h2>
              <span className="profile-props-count-pill">
                {propiedades.length || 1} {propiedades.length === 1 ? 'Propiedad' : 'Propiedades'}
              </span>
            </div>
            
            <button 
              type="button"
              className="profile-props-view-btn"
              onClick={() => navigate('/VistaMarket')}
              title="Ir al Portal de Propiedades"
            >
              <span>EXPLORAR</span>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Big Featured Property Showcase Visual Card */}
          <div 
            className="profile-prop-featured-card"
            style={{ backgroundImage: `url("${getPropImage(activeProperty)}")` }}
          >
            <div className="profile-prop-featured-overlay" />
            
            <div className="profile-prop-featured-info-pill">
              <div className="profile-prop-featured-badge">
                ★ PROPIEDAD SELECCIONADA
              </div>
              <h3 className="profile-prop-featured-name">
                {activeProperty?.nombre_propiedad || activeProperty?.nombre || activeProperty?.alias || 'MI PROPIEDAD'}
              </h3>
              <div className="profile-prop-featured-address">
                <MapPin size={13} color="#FF8548" />
                <span>{activeProperty?.address || activeProperty?.direccion || 'Mérida, Yucatán'}</span>
              </div>
            </div>
          </div>

          {/* Horizontal Thumbnails Carousel */}
          <div className="profile-thumbs-container">
            <span className="profile-thumbs-label">GALERÍA DE PROPIEDADES:</span>
            <div className="profile-thumbs-scroll-track">
              {propiedades && propiedades.length > 0 ? (
                propiedades.map((prop, idx) => {
                  const isActive = prop.id === activeProperty?.id;
                  const thumbImg = getPropImage(prop);
                  return (
                    <div 
                      key={prop.id}
                      className={`profile-thumb-card ${isActive ? 'is-active' : ''}`}
                      onClick={() => setSelectedPropId(prop.id)}
                      title={`Seleccionar para vista previa:\n${prop.nombre_propiedad || prop.nombre || `Propiedad #${prop.id}`}`}
                    >
                      <img 
                        src={thumbImg} 
                        alt={prop.nombre_propiedad || 'Propiedad'} 
                        className="profile-thumb-img" 
                      />
                      {idx === 0 && (
                        <div className="profile-thumb-star" title="Propiedad Principal">
                          ★
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="profile-thumb-card is-active">
                  <img src={defaultPropImg} alt="Propiedad" className="profile-thumb-img" />
                </div>
              )}
            </div>
          </div>

        </section>

      </main>

      {/* ── MODAL: EDITAR PERFIL (LIQUID GLASS) ── */}
      {isModalOpen && (
        <div className="profile-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="profile-modal-liquid-card" onClick={e => e.stopPropagation()}>
            <button className="profile-modal-close-btn" onClick={() => setIsModalOpen(false)}>
              <X size={18} />
            </button>
            
            <h3 className="profile-modal-title">
              <Edit3 size={20} color="#FF6600" /> EDITAR PERFIL
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

              {(user?.role_id === 2 || user?.role_id === 8) && (
                <div className="profile-form-group" style={{ marginTop: '6px' }}>
                  <label style={{ color: '#FF6600' }}>🛠️ Editar Especialidades:</label>
                  <div className="profile-modal-specs-list">
                    {ESPECIALIDADES_CATALOGO.map(spec => {
                      const isSelected = selectedSpecialties.includes(spec.name);
                      return (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (selectedSpecialties.length > 1) {
                                setSelectedSpecialties(prev => prev.filter(s => s !== spec.name));
                              }
                            } else {
                              setSelectedSpecialties(prev => [...prev, spec.name]);
                            }
                          }}
                          className={`profile-spec-toggle-btn ${isSelected ? 'is-selected' : ''}`}
                        >
                          <span>{spec.icon}</span> <span>{spec.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="profile-modal-actions">
                <button type="button" className="profile-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="profile-btn-save">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ELIMINAR CUENTA (LIQUID GLASS) ── */}
      {isDeleteModalOpen && (
        <div className="profile-modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="profile-modal-liquid-card delete-card" onClick={e => e.stopPropagation()}>
            <button className="profile-modal-close-btn" onClick={() => setIsDeleteModalOpen(false)}>
              <X size={18} />
            </button>
            <h3 className="profile-modal-title" style={{ color: '#ef4444' }}>
              <Trash2 size={20} /> Eliminar Cuenta
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.88rem', lineHeight: '1.5' }}>
                Estás a punto de solicitar la eliminación y desactivación de tu cuenta en <strong>Agente Solutions</strong>. 
                Dejarás de tener acceso inmediato al sistema.
              </p>
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '10px 14px', borderRadius: '10px' }}>
                <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.80rem' }}>
                  💡 <em>Para confirmar, escribe tu correo electrónico exacto (<strong>{user?.email}</strong>):</em>
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

      {/* ── MODAL: CAMBIAR FOTO (LIQUID GLASS) ── */}
      {isPhotoMenuOpen && (
        <div className="profile-modal-backdrop" onClick={() => setIsPhotoMenuOpen(false)}>
          <div className="profile-modal-liquid-card photo-card" onClick={e => e.stopPropagation()}>
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

    </div>
  );
};

export default Profile;