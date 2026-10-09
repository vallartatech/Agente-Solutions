import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  CalendarDays,
  LogOut,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Award,
  Briefcase
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import logo from '../../../assets/Logo4.png';
import ModalCalendarioCliente from '../Cliente/ModalCalendarioCliente';
import NotificationBell from '../../../components/Shared/NotificationBell';
import MobileBottomNav from '../../../components/Shared/MobileBottomNav';
import '../../../styles/Shared/Profile.css';

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
  const [modalSpecialties, setModalSpecialties] = useState([]);
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showModalCalendario, setShowModalCalendario] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const handleToggleModalSpecialty = (specName) => {
    setModalSpecialties(prev => {
      if (prev.includes(specName)) {
        if (prev.length <= 1) return prev; // Mantener al menos 1
        return prev.filter(s => s !== specName);
      } else {
        return [...prev, specName];
      }
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingSpecs(true);
    try {
      const token = localStorage.getItem('agente_token');
      const rawId = String(user.id).replace(/[^\d]/g, '');

      // 1. Guardar datos personales
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/usuarios/update-profile`, {
        user_id: user.id,
        ...formData
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 2. Guardar especialidades
      let updatedSpecs = modalSpecialties;
      try {
        const specRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/u_${rawId}/specialties`, {
          specialties: modalSpecialties
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (specRes.data?.specialties) {
          updatedSpecs = specRes.data.specialties;
        }
      } catch (err) {
        console.error("Error sincronizando especialidades:", err);
      }

      setSelectedSpecialties(modalSpecialties);

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
      alert("¡Perfil y especialidades actualizados con éxito!");
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Hubo un error al actualizar los datos.";
      alert(errorMsg);
    } finally {
      setSavingSpecs(false);
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

  // Filtrar objetos completos de las especialidades activas para la vista
  const activeSpecialtiesList = useMemo(() => {
    if (!selectedSpecialties || selectedSpecialties.length === 0) {
      return [{ id: 1, name: "Electricidad", icon: "⚡", desc: "Instalaciones y cableado general" }];
    }
    return selectedSpecialties.map(specName => {
      const match = ESPECIALIDADES_CATALOGO.find(cat => cat.name === specName);
      if (match) return match;
      return { id: specName, name: specName, icon: "🔧", desc: "Servicios técnicos especializados" };
    });
  }, [selectedSpecialties]);

  return (
    <div className="profile-liquid-root">
      {/* Top Floating Action Bar (Técnico Theme) */}
      <header className="profile-liquid-topbar" ref={dropdownRef}>
        <div className="profile-topbar-left">
          <img 
            src={logo} 
            alt="Agente Solutions" 
            className="profile-brand-logo"
            onClick={() => navigate('/mercado-trabajos')} 
            title="Ir al Mercado de Trabajos"
          />
        </div>

        {/* Center Nav Links: TÉCNICO NAVIGATION */}
        <nav className="vcp-header-nav profile-topbar-nav">
          <button className="vcp-nav-btn" onClick={() => navigate('/mercado-trabajos', { state: { view: 'mercado' } })}>
            MERCADO (SOLICITUDES)
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/mercado-trabajos', { state: { view: 'tablero' } })}>
            TRABAJOS ACEPTADOS
          </button>
          <button className="vcp-nav-btn" onClick={() => navigate('/mercado-trabajos', { state: { view: 'usuarios' } })}>
            MIS CLIENTES
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
                {user?.first_name ? user.first_name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : 'T')}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* ── PORTAL GLOBAL DE PERFIL FLOTANTE ── */}
      {profileDropdownOpen && createPortal(
        <div className="vcp-profile-portal-root">
          <div 
            className="vcp-profile-backdrop" 
            onClick={() => setProfileDropdownOpen(false)}
          />
          <div 
            className="profile-header-dropdown vcp-profile-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
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
              className="profile-dropdown-item vcp-dropdown-item" 
              onClick={() => { setProfileDropdownOpen(false); navigate('/mi-perfil'); }}
            >
              <User size={16} /> Mi Perfil
            </button>
            <button 
              className="profile-dropdown-item logout vcp-dropdown-item" 
              onClick={() => { 
                setProfileDropdownOpen(false); 
                if (logoutGlobal) logoutGlobal(); 
                navigate('/', { replace: true }); 
              }}
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>,
        document.body
      )}

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
        
            {/* ── COLUMNA 1: IDENTIDAD TÉCNICO (IZQUIERDA) ── */}
            <section className="profile-col-identity">
              <div className="profile-identity-card">
                
                <div className="profile-identity-avatar-wrap" onClick={() => openPhotoMenu('profile_picture')} title="Cambiar foto de perfil">
                  {user?.profile_picture ? (
                    <img src={user.profile_picture} alt="Perfil" className="profile-identity-avatar-img" />
                  ) : (
                    <div className="profile-identity-avatar-fallback">
                      {user?.first_name ? user.first_name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : 'T')}
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
                  title="Editar información y especialidades de perfil"
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

            {/* ── COLUMNA 2: DATOS DEL TÉCNICO (CENTRO) ── */}
            <section className="profile-col-data">
              
              <div className="profile-data-heading">
                <span className="profile-heading-text">DATOS DEL PROFESIONAL</span>
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

            {/* ── COLUMNA 3: ESPECIALIDADES ACTIVAS (SOLO VISTA / READ-ONLY) ── */}
            <section className="profile-col-technician-panel">
              <div className="profile-tech-header-row">
                <div className="profile-tech-title-wrap">
                  <Wrench size={18} color="#f26522" />
                  <h2 className="profile-tech-title">MIS ESPECIALIDADES Y SERVICIOS</h2>
                  <span className="profile-tech-count-pill">
                    {activeSpecialtiesList.length} {activeSpecialtiesList.length === 1 ? 'Especialidad Activa' : 'Especialidades Activas'}
                  </span>
                </div>
              </div>

              {/* Showcase Card Limpio de Solo Lectura */}
              <div className="profile-tech-showcase-card">
                <div className="profile-tech-specs-subheading">
                  <span>🛠️ Ramos de Especialidad Registrados:</span>
                  <small>Visible para los clientes en la Red</small>
                </div>

                <div className="profile-tech-specs-grid readonly-grid" style={{ maxHeight: '200px' }}>
                  {activeSpecialtiesList.map((spec, idx) => (
                    <div 
                      key={idx}
                      className="profile-tech-spec-item is-selected"
                      style={{ cursor: 'default', transform: 'none' }}
                      title={`${spec.name}: ${spec.desc || 'Especialidad del técnico'}`}
                    >
                      <span className="profile-tech-spec-icon">{spec.icon}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span className="profile-tech-spec-name">{spec.name}</span>
                        {spec.desc && (
                          <span style={{ fontSize: '0.58rem', color: '#cbd5e1', lineHeight: '1.2', marginTop: '1px' }}>
                            {spec.desc}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Nota explicativa para editar */}
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem' }}>💡</span>
                  <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>
                    Para modificar o agregar especialidades, pulsa en el botón <strong>"EDITAR DATOS"</strong> en la columna izquierda.
                  </span>
                </div>

                {/* Bottom Metrics Bar */}
                <div className="profile-tech-metrics-bar">
                  <div className="profile-tech-metric-box">
                    <span className="profile-tech-metric-val star">
                      ★ 5.0
                    </span>
                    <span className="profile-tech-metric-label">Calificación</span>
                  </div>
                  <div className="profile-tech-metric-box">
                    <span className="profile-tech-metric-val status">
                      <ShieldCheck size={14} /> Verificado
                    </span>
                    <span className="profile-tech-metric-label">Proveedor de Red</span>
                  </div>
                  <div className="profile-tech-metric-box">
                    <span className="profile-tech-metric-val">
                      <MapPin size={13} color="#f26522" /> Mérida
                    </span>
                    <span className="profile-tech-metric-label">Zona Cobertura</span>
                  </div>
                </div>
              </div>
            </section>

          </div>

        </div>

      </main>

      {/* ── MODAL: EDITAR PERFIL Y ESPECIALIDADES DEL TÉCNICO ── */}
      {isModalOpen && (
        <div className="profile-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="profile-modal-liquid-card" onClick={e => e.stopPropagation()}>
            <button className="profile-modal-close-btn" onClick={() => setIsModalOpen(false)}>
              <X size={18} />
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

              {/* Selector interactivo de Especialidades adentro del Modal */}
              <div className="profile-form-group" style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ color: '#f26522', fontWeight: 900 }}>🛠️ SELECCIONA TUS ESPECIALIDADES:</label>
                  <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{modalSpecialties.length} activas</span>
                </div>
                <div className="profile-modal-specs-list" style={{ maxHeight: '160px' }}>
                  {ESPECIALIDADES_CATALOGO.map(spec => {
                    const isSelected = modalSpecialties.includes(spec.name);
                    return (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => handleToggleModalSpecialty(spec.name)}
                        className={`profile-spec-toggle-btn ${isSelected ? 'is-selected' : ''}`}
                        title={spec.desc}
                      >
                        <span>{spec.icon}</span> 
                        <span>{spec.name}</span>
                        {isSelected && <span style={{ marginLeft: '4px', fontSize: '0.75rem' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

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

      {/* Responsive Bottom Navigation (Only Icons) */}
      <MobileBottomNav />

    </div>
  );
};

export default PerfilTecnico;
