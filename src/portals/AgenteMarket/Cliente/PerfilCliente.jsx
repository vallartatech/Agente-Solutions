import React, { useRef, useState, useEffect, useMemo } from 'react';
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
  Building2,
  MapPin,
  ExternalLink,
  CalendarDays,
  LogOut,
  Plus
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import logo from '../../../assets/Logo4.png';
import defaultPropImg from '../../../assets/propiedad_ejemplo.jpg';
import ModalCalendarioCliente from './ModalCalendarioCliente';
import NotificationBell from '../../../components/Shared/NotificationBell';
import '../../../styles/Shared/Profile.css';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80';

const PerfilCliente = () => {
  const { user, loginGlobal, logoutGlobal } = useAuth();
  const navigate = useNavigate();

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const uploadTargetRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Propiedades del cliente
  const [propiedades, setPropiedades] = useState([]);
  const [selectedPropId, setSelectedPropId] = useState(null);
  const [loadingProps, setLoadingProps] = useState(true);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar propiedades exclusivas del cliente autenticado
  useEffect(() => {
    const fetchProps = async () => {
      try {
        const token = localStorage.getItem('agente_token');
        const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades`, authHeader);
        const rawProps = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        
        // Filtro estricto por usuario / tenant del cliente
        const forThisUser = rawProps.filter(p => 
          (user?.id && (p.user_id === user.id || p.usuario_id === user.id || p.cliente_id === user.id || p.cliente?.id === user.id)) ||
          (user?.tenant_id && p.tenant_id === user.tenant_id)
        );
        
        // Si la API ya devuelve filtradas por token, usamos rawProps si coinciden o forThisUser
        const list = forThisUser.length > 0 ? forThisUser : (rawProps.length > 0 && user?.role_id === 3 ? rawProps : []);
        setPropiedades(list);
        if (list.length > 0) {
          setSelectedPropId(list[0].id);
        }
      } catch (err) {
        console.error("Error al cargar propiedades del cliente:", err);
      } finally {
        setLoadingProps(false);
      }
    };
    fetchProps();
  }, [user?.id, user?.tenant_id, user?.role_id]);

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
      return null;
    }
    return propiedades.find(p => p.id === selectedPropId) || propiedades[0];
  }, [propiedades, selectedPropId]);

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
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault(); 
    try {
      const token = localStorage.getItem('agente_token');
      
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/usuarios/update-profile`, {
        user_id: user.id,
        ...formData
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      alert("¡Datos actualizados con éxito!");
    } catch (error) {
      console.error("Error en handleSaveProfile:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Hubo un error al actualizar los datos.";
      alert(errorMsg);
    }
  };

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
      alert("Error al subir la imagen.");
    } finally {
      setIsUploading(false);
    }
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

  const obtenerNombreRol = (roleId) => {
    switch(Number(roleId)) {
      case 0: return 'Usuario Root';
      case 1: return 'Administrador';
      case 2: return 'Técnico Agente';
      case 3: return 'Cliente';
      case 4: return 'Negocio';
      case 5: return 'Autónomo';
      case 6: return 'Contratista';
      case 7: return 'Admin Propiedades';
      case 8: return 'Técnico de la Red';
      default: return 'Cliente';
    }
  };

  const formatearFecha = (fechaDb) => {
    if (!fechaDb) return 'No registrada'; 
    const fecha = new Date(fechaDb);
    fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset());
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const nombreCompleto = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.name || 'Cliente';
  const coverUrl = user?.cover_picture || (activeProperty ? getPropImage(activeProperty) : DEFAULT_COVER);

  return (
    <div className="profile-liquid-root">
      {/* Top Floating Action Bar (Cliente Theme) */}
      <header className="profile-liquid-topbar" ref={dropdownRef}>
        <div className="profile-topbar-left">
          <img 
            src={logo} 
            alt="Agente Solutions" 
            className="profile-brand-logo"
            onClick={() => navigate('/VistaMarket')} 
            title="Ir al Portal de Propiedades"
          />
        </div>

        {/* Center Nav Links: CLIENTE NAVIGATION */}
        <nav className="vcp-header-nav profile-topbar-nav">
          <button className="vcp-nav-btn" onClick={() => navigate('/VistaMarket')}>
            INICIO
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/VistaMarket')}>
            MIS PROPIEDADES
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/servicios')}>
            SERVICIOS
          </button>
          <button className="vcp-nav-btn active" onClick={() => navigate('/mi-perfil')}>
            MI PERFIL
          </button>
        </nav>

        {/* Right Actions & User Profile */}
        <div className="vcp-header-right profile-topbar-right">
          <button 
            type="button"
            className="profile-change-cover-header-btn" 
            onClick={() => openPhotoMenu('cover_picture')}
            disabled={isUploading}
            title="Cambiar imagen de portada"
          >
            <Camera size={14} />
            <span>{isUploading ? 'SUBIENDO...' : 'CAMBIAR PORTADA'}</span>
          </button>

          <div className="vcp-header-actions-group">
            <button 
              type="button"
              className="vcp-header-icon-btn profile-header-icon-btn" 
              title="Abrir Calendario y Citas"
              onClick={() => setShowModalCalendario(true)}
            >
              <CalendarDays size={18} strokeWidth={2.2} />
            </button>

            <NotificationBell triggerClassName="vcp-header-icon-btn" />
          </div>

          <button 
            type="button"
            className="vcp-avatar-btn profile-avatar-btn" 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            title="Opciones de sesión"
          >
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Avatar" className="vcp-avatar-img profile-avatar-img" />
            ) : (
              <div className="vcp-avatar-initial profile-avatar-initial">
                {user?.first_name ? user.first_name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : 'C')}
              </div>
            )}
          </button>

          {profileDropdownOpen && (
            <div className="profile-header-dropdown">
              <div className="vcp-dropdown-user-header">
                <div className="vcp-dropdown-role-pill">
                  <Shield size={12} className="vcp-dropdown-role-icon" />
                  <span>{obtenerNombreRol(user?.role_id)}</span>
                </div>
                <div className="vcp-dropdown-user-name">{nombreCompleto}</div>
                {user?.email && (
                  <div className="vcp-dropdown-user-email">{user.email}</div>
                )}
              </div>

              <div className="vcp-dropdown-divider" />

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

          {/* ── 2. 3 COLUMNS VIEWPORT ── */}
          <div className="profile-three-col-viewport">
        
            {/* ── COLUMNA 1: IDENTIDAD CLIENTE (IZQUIERDA) ── */}
            <section className="profile-col-identity">
              <div className="profile-identity-card">
                
                <div className="profile-identity-avatar-wrap" onClick={() => openPhotoMenu('profile_picture')} title="Cambiar foto de perfil">
                  {user?.profile_picture ? (
                    <img src={user.profile_picture} alt="Perfil" className="profile-identity-avatar-img" />
                  ) : (
                    <div className="profile-identity-avatar-fallback">
                      {user?.first_name ? user.first_name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : 'C')}
                    </div>
                  )}
                  <div className="profile-avatar-camera-pill">
                    <Camera size={11} />
                  </div>
                </div>

                <div className="profile-identity-info">
                  <h1 className="profile-identity-name" title={nombreCompleto}>
                    {nombreCompleto}
                  </h1>
                  <div className="profile-identity-tags-row">
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

              </div>
            </section>

            {/* ── COLUMNA 2: DATOS DEL CLIENTE (CENTRO) ── */}
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

            </section>

            {/* ── COLUMNA 3: PROPIEDADES ASOCIADAS DEL CLIENTE (DERECHA) ── */}
            <section className="profile-col-properties">
              
              <div className="profile-props-header-row">
                <div className="profile-props-title-wrap">
                  <Building2 size={18} color="#FF6600" />
                  <h2 className="profile-props-title">MIS PROPIEDADES</h2>
                  <span className="profile-props-count-pill">
                    {propiedades.length} {propiedades.length === 1 ? 'Propiedad' : 'Propiedades'}
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

              {activeProperty ? (
                <>
                  {/* Visual Card de la Propiedad Seleccionada */}
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
                        {activeProperty?.nombre_propiedad || activeProperty?.nombre || activeProperty?.alias || 'MI INMUEBLE'}
                      </h3>
                      <div className="profile-prop-featured-address">
                        <MapPin size={13} color="#FF8548" />
                        <span>{activeProperty?.address || activeProperty?.direccion || activeProperty?.zona || 'Mérida, Yucatán'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Carrusel horizontal de miniaturas */}
                  <div className="profile-thumbs-container">
                    <span className="profile-thumbs-label">GALERÍA DE PROPIEDADES:</span>
                    <div className="profile-thumbs-scroll-track">
                      {propiedades.map((prop, idx) => {
                        const isActive = prop.id === activeProperty?.id;
                        const thumbImg = getPropImage(prop);
                        return (
                          <div 
                            key={prop.id}
                            className={`profile-thumb-card ${isActive ? 'is-active' : ''}`}
                            onClick={() => setSelectedPropId(prop.id)}
                            title={`Seleccionar: ${prop.nombre_propiedad || prop.nombre || `Propiedad #${prop.id}`}`}
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
                      })}
                    </div>
                  </div>
                </>
              ) : (
                /* Estado cuando el cliente aún no registra propiedades */
                <div className="profile-prop-featured-card empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', textAlign: 'center' }}>
                  <Building2 size={44} color="#f26522" style={{ marginBottom: '12px', opacity: 0.8 }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#ffffff', fontWeight: 800 }}>
                    Sin Propiedades Registradas
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#94a3b8', maxWidth: '320px' }}>
                    Registra tu primer inmueble, casa o negocio para solicitar servicios de mantenimiento preventivo y correctivo.
                  </p>
                  <button
                    type="button"
                    className="profile-props-view-btn"
                    onClick={() => navigate('/VistaMarket')}
                    style={{ padding: '9px 18px', fontSize: '0.80rem' }}
                  >
                    <Plus size={15} />
                    <span>REGISTRAR INMUEBLE</span>
                  </button>
                </div>
              )}

            </section>

          </div>

        </div>

      </main>

      {/* ── MODAL: EDITAR PERFIL CLIENTE ── */}
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

              <div className="profile-modal-actions">
                <button type="button" className="profile-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="profile-btn-save">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ELIMINAR CUENTA ── */}
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
                Estás a punto de solicitar la desactivación de tu cuenta en <strong>Agente Solutions</strong>.
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

      {/* Modal de Calendario */}
      <ModalCalendarioCliente
        isOpen={showModalCalendario}
        onClose={() => setShowModalCalendario(false)}
      />

    </div>
  );
};

export default PerfilCliente;
