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
  ExternalLink,
  CalendarDays,
  Bell,
  LogOut
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/Logo4.png"; 
import defaultPropImg from "../../assets/propiedad_ejemplo.jpg";
import ModalCalendarioCliente from "../../portals/AgenteMarket/Cliente/ModalCalendarioCliente";
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
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('propiedades');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      {/* Top Floating Action Bar (Full Liquid Glass Header) */}
      <header className="profile-liquid-topbar" ref={dropdownRef}>
        <div className="profile-topbar-left">
          <img 
            src={logo} 
            alt="Agente Solutions" 
            className="profile-brand-logo"
            onClick={() => navigate('/VistaMarket')} 
          />

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

        {/* Center Nav Links */}
        <nav className="profile-topbar-nav">
          <button className="profile-nav-btn" onClick={() => navigate('/usuarios')}>
            USUARIOS
          </button>
          <button className="profile-nav-btn" onClick={() => navigate('/reportes-globales')}>
            REPORTE
          </button>
          <button className="profile-nav-btn" onClick={() => navigate('/vista-cotizaciones')}>
            COTIZACION
          </button>
          <button className="profile-nav-btn" onClick={() => navigate('/tablero-servicios')}>
            SERVICIOS
          </button>
          <button className="profile-nav-btn" onClick={() => navigate('/red-autonomos')}>
            MERCADO / RED
          </button>
        </nav>

        {/* Right Actions & User Profile */}
        <div className="profile-topbar-right">
          <div className="profile-topbar-actions-group">
            {/* Botón Calendario */}
            <button 
              type="button"
              className="profile-header-icon-btn" 
              title="Abrir Calendario y Citas"
              onClick={() => setShowModalCalendario(true)}
            >
              <CalendarDays size={18} color="#ffffff" strokeWidth={2} />
            </button>

            {/* Botón Notificaciones */}
            <button 
              type="button"
              className="profile-header-icon-btn" 
              title="Notificaciones"
              onClick={() => navigate('/notificaciones')}
            >
              <Bell size={18} color="#ffffff" strokeWidth={2} />
              <span className="profile-header-notif-dot" />
            </button>
          </div>

          <div className="profile-user-info-text">
            <span className="profile-user-role-badge">
              {obtenerNombreRol(user?.role_id)}
            </span>
            <span className="profile-user-name">{nombreCompleto}</span>
          </div>

          <button 
            type="button"
            className="profile-avatar-btn" 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            title="Opciones de sesión"
          >
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Avatar" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-initial">
                {user?.first_name ? user.first_name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}
              </div>
            )}
          </button>

          {profileDropdownOpen && (
            <div className="profile-header-dropdown">
              <button 
                className="profile-dropdown-item" 
                onClick={() => { setProfileDropdownOpen(false); navigate('/mi-perfil'); }}
              >
                <User size={16} /> Mi Perfil
              </button>
              <button 
                className="profile-dropdown-item logout" 
                onClick={() => { 
                  setProfileDropdownOpen(false); 
                  if (logoutGlobal) logoutGlobal(); 
                  navigate('/', { replace: true }); 
                }}
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── YOUTUBE CHANNEL STYLE MAIN DASHBOARD ── */}
      <main className="profile-yt-dashboard">
        
        {/* ── 1. CANAL HEADER / PERFIL INFO (HORIZONTAL) ── */}
        <section className="profile-yt-header-card">
          <div className="profile-yt-header-main">
            
            {/* Avatar a la izquierda */}
            <div 
              className="profile-yt-avatar-wrap" 
              onClick={() => openPhotoMenu('profile_picture')} 
              title="Cambiar foto de perfil"
            >
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Avatar" className="profile-yt-avatar-img" />
              ) : (
                <div className="profile-yt-avatar-initial">
                  {user?.first_name ? user.first_name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : '👤')}
                </div>
              )}
              <div className="profile-yt-avatar-hover">
                <Camera size={22} color="#ffffff" />
                <span>CAMBIAR</span>
              </div>
            </div>

            <input type="file" ref={cameraRef} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, uploadTargetRef.current)} accept="image/*" capture="environment" />
            <input type="file" ref={galleryRef} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, uploadTargetRef.current)} accept="image/*" />

            {/* Datos del usuario a la derecha de la foto */}
            <div className="profile-yt-info-col">
              <div className="profile-yt-title-row">
                <h1 className="profile-yt-name">{nombreCompleto}</h1>
                <div className="profile-yt-badges-inline">
                  <span className="profile-yt-role-badge">
                    <Shield size={12} /> {obtenerNombreRol(user?.role_id)}
                  </span>
                  <span className="profile-yt-status-badge">
                    <Sparkles size={11} /> ACTIVO
                  </span>
                </div>
              </div>

              {/* Handle y metadatos */}
              <div className="profile-yt-handle-row">
                <span className="profile-yt-handle">@{user?.email ? user.email.split('@')[0] : 'usuario'}</span>
                <span className="profile-yt-handle-dot">•</span>
                <span className="profile-yt-meta-item">
                  <Clock size={12} /> Miembro desde {formatearFecha(user?.created_at)}
                </span>
                {user?.birth_date && (
                  <>
                    <span className="profile-yt-handle-dot">•</span>
                    <span className="profile-yt-meta-item">
                      <Calendar size={12} /> {formatearFecha(user?.birth_date)}
                    </span>
                  </>
                )}
              </div>

              {/* Chips de contacto */}
              <div className="profile-yt-chips-row">
                <div className="profile-yt-chip" title={user?.email}>
                  <Mail size={13} color="#FF8548" />
                  <span>{user?.email || 'Sin correo'}</span>
                </div>
                <div className="profile-yt-chip">
                  <Phone size={13} color="#FF8548" />
                  <span>{user?.phone_number || 'Sin teléfono'}</span>
                </div>
              </div>

              {/* Especialidades si es técnico */}
              {(user?.role_id === 2 || user?.role_id === 8) && (() => {
                const displaySpecs = (user?.specialties && user.specialties.length > 0)
                  ? user.specialties
                  : (selectedSpecialties.length > 0 ? selectedSpecialties : null);
                return (
                  <div className="profile-yt-specs-row">
                    <span className="profile-yt-specs-label">🛠️ ESPECIALIDADES:</span>
                    {displaySpecs ? (
                      displaySpecs.map((s, idx) => {
                        const specName = typeof s === 'string' ? s : s.name;
                        const specObj = ESPECIALIDADES_CATALOGO.find(item => item.name === specName) || (typeof s === 'object' ? s : null);
                        const icon = specObj ? (specObj.icon || '⚡') : '⚡';
                        return (
                          <span key={idx} className="profile-yt-spec-tag">
                            {icon} {specName}
                          </span>
                        );
                      })
                    ) : (
                      <span className="profile-no-specs">Sin especialidades</span>
                    )}
                  </div>
                );
              })()}

              {/* Fila de botones de acción */}
              <div className="profile-yt-actions-row">
                <button 
                  type="button" 
                  className="profile-yt-btn-primary" 
                  onClick={openModal}
                  title="Editar información de perfil"
                >
                  <Edit3 size={15} />
                  <span>Personalizar datos</span>
                </button>

                <button 
                  type="button" 
                  className="profile-yt-btn-secondary" 
                  onClick={() => openPhotoMenu('cover_picture')}
                  title="Cambiar imagen de portada"
                >
                  <Camera size={15} />
                  <span>Cambiar Portada</span>
                </button>

                {user?.role_id !== 0 && (
                  <button
                    type="button"
                    className="profile-yt-btn-danger"
                    onClick={() => {
                      setDeleteConfirmEmail('');
                      setDeleteError('');
                      setIsDeleteModalOpen(true);
                    }}
                    title="Eliminar mi cuenta"
                  >
                    <Trash2 size={13} />
                    <span>Eliminar Cuenta</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        </section>

        {/* ── 2. BARRA DE PESTAÑAS ESTILO YOUTUBE (Playlists / Propiedades) ── */}
        <nav className="profile-yt-tabs-bar">
          <div className="profile-yt-tabs-left">
            <button 
              type="button" 
              className={`profile-yt-tab-btn ${activeTab === 'propiedades' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('propiedades')}
            >
              <Building2 size={15} />
              <span>Mis Propiedades ({propiedades.length > 0 ? propiedades.length : 1})</span>
              {activeTab === 'propiedades' && <div className="profile-yt-tab-indicator" />}
            </button>

            <button 
              type="button" 
              className={`profile-yt-tab-btn ${activeTab === 'datos' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('datos')}
            >
              <User size={15} />
              <span>Datos Completos</span>
              {activeTab === 'datos' && <div className="profile-yt-tab-indicator" />}
            </button>
          </div>

          <div className="profile-yt-tabs-right">
            <button 
              type="button" 
              className="profile-yt-tab-action-btn"
              onClick={() => navigate('/VistaMarket')}
              title="Explorar propiedades en el mercado"
            >
              <span>Explorar Mercado</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </nav>

        {/* ── 3. CONTENIDO PRINCIPAL (DONDE VAN LOS VIDEOS / PROPIEDADES) ── */}
        <section className="profile-yt-content-grid-wrap">
          
          {activeTab === 'propiedades' && (
            <div className="profile-yt-props-grid">
              {propiedades && propiedades.length > 0 ? (
                propiedades.map((prop, idx) => {
                  const isSelected = prop.id === activeProperty?.id;
                  const propImg = getPropImage(prop);
                  return (
                    <article 
                      key={prop.id}
                      className={`profile-yt-prop-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedPropId(prop.id)}
                      title={`Seleccionar ${prop.nombre_propiedad || prop.nombre || `Propiedad #${prop.id}`}`}
                    >
                      {/* Miniatura estilo video de YouTube */}
                      <div className="profile-yt-thumb-wrap">
                        <img src={propImg} alt={prop.nombre_propiedad || 'Propiedad'} className="profile-yt-thumb-img" />
                        <div className="profile-yt-thumb-overlay" />
                        
                        <div className="profile-yt-thumb-badge-top">
                          <Building2 size={11} color="#FF6600" />
                          <span>MIS PROPIEDADES</span>
                        </div>

                        <div className="profile-yt-thumb-badge-bottom">
                          {isSelected ? '★ ACTIVA' : `#${idx + 1}`}
                        </div>
                      </div>

                      {/* Información debajo de la miniatura (como el título del video en YouTube) */}
                      <div className="profile-yt-prop-meta">
                        <div className="profile-yt-prop-header-line">
                          <h4 className="profile-yt-prop-title">
                            {prop.nombre_propiedad || prop.nombre || prop.alias || `PROPIEDAD #${prop.id}`}
                          </h4>
                        </div>

                        <div className="profile-yt-prop-address-line">
                          <MapPin size={12} color="#FF8548" />
                          <span>{prop.address || prop.direccion || 'Calle 37 #sin numero x 4 y 6, Mérida, Yucatán'}</span>
                        </div>

                        <div className="profile-yt-prop-actions-line">
                          <span className={`profile-yt-prop-status-tag ${isSelected ? 'is-selected' : ''}`}>
                            {isSelected ? '▲ Propiedad Seleccionada' : 'Hacer clic para activar'}
                          </span>
                          <button 
                            type="button" 
                            className="profile-yt-prop-link-btn"
                            onClick={(e) => { e.stopPropagation(); navigate('/VistaMarket'); }}
                          >
                            <span>Ver</span>
                            <ExternalLink size={11} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <article className="profile-yt-prop-card is-selected">
                  <div className="profile-yt-thumb-wrap">
                    <img src={defaultPropImg} alt="Casa" className="profile-yt-thumb-img" />
                    <div className="profile-yt-thumb-overlay" />
                    <div className="profile-yt-thumb-badge-top">
                      <Building2 size={11} color="#FF6600" />
                      <span>MIS PROPIEDADES</span>
                    </div>
                    <div className="profile-yt-thumb-badge-bottom">★ ACTIVA</div>
                  </div>

                  <div className="profile-yt-prop-meta">
                    <div className="profile-yt-prop-header-line">
                      <h4 className="profile-yt-prop-title">CASA DE MI INFANCIA</h4>
                    </div>
                    <div className="profile-yt-prop-address-line">
                      <MapPin size={12} color="#FF8548" />
                      <span>Calle 37 #sin numero x 4 y 6, Col. leandro valle, Mérida, Yucatán</span>
                    </div>
                    <div className="profile-yt-prop-actions-line">
                      <span className="profile-yt-prop-status-tag is-selected">▲ Propiedad Seleccionada</span>
                      <button type="button" className="profile-yt-prop-link-btn" onClick={() => navigate('/VistaMarket')}>
                        <span>Ver</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                </article>
              )}
            </div>
          )}

          {activeTab === 'datos' && (
            <div className="profile-yt-datos-grid">
              <div className="profile-floating-tile">
                <div className="profile-tile-icon-wrap"><User size={15} /></div>
                <div className="profile-tile-content">
                  <span className="profile-tile-label">NOMBRE COMPLETO</span>
                  <span className="profile-tile-val">{nombreCompleto}</span>
                </div>
              </div>

              <div className="profile-floating-tile is-accent">
                <div className="profile-tile-icon-wrap is-accent"><Shield size={15} /></div>
                <div className="profile-tile-content">
                  <span className="profile-tile-label">ROL EN SISTEMA</span>
                  <span className="profile-tile-val is-accent-text">{obtenerNombreRol(user?.role_id)}</span>
                </div>
              </div>

              <div className="profile-floating-tile">
                <div className="profile-tile-icon-wrap"><Mail size={15} /></div>
                <div className="profile-tile-content">
                  <span className="profile-tile-label">CORREO ELECTRÓNICO</span>
                  <span className="profile-tile-val">{user?.email || 'No registrado'}</span>
                </div>
              </div>

              <div className="profile-floating-tile">
                <div className="profile-tile-icon-wrap"><Phone size={15} /></div>
                <div className="profile-tile-content">
                  <span className="profile-tile-label">TELÉFONO</span>
                  <span className="profile-tile-val">{user?.phone_number || 'No registrado'}</span>
                </div>
              </div>

              <div className="profile-floating-tile">
                <div className="profile-tile-icon-wrap"><Calendar size={15} /></div>
                <div className="profile-tile-content">
                  <span className="profile-tile-label">FECHA DE NACIMIENTO</span>
                  <span className="profile-tile-val">{formatearFecha(user?.birth_date)}</span>
                </div>
              </div>

              <div className="profile-floating-tile">
                <div className="profile-tile-icon-wrap"><Clock size={15} /></div>
                <div className="profile-tile-content">
                  <span className="profile-tile-label">MIEMBRO DESDE</span>
                  <span className="profile-tile-val">{formatearFecha(user?.created_at)}</span>
                </div>
              </div>
            </div>
          )}

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

      {/* ── MODAL: CALENDARIO CLIENTE ── */}
      <ModalCalendarioCliente
        isOpen={showModalCalendario}
        onClose={() => setShowModalCalendario(false)}
      />

    </div>
  );
};

export default Profile;