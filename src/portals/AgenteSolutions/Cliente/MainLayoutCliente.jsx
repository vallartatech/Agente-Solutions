import React from 'react';
import { useNavigate, Outlet, useLocation, useParams } from 'react-router-dom';
import "../../../styles/AgenteSolutions/Cliente/LayoutCliente.css";
import { User, ArrowLeft, Home, Bell, LayoutGrid, FileText, ChevronLeft, LayoutDashboard, Menu, X, Search, Facebook, Instagram, Twitter, Youtube, Phone, Mail, Globe, MapPin, Link as LinkIcon, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import NotificationBell from '../../../components/Shared/NotificationBell';
import defaultLogo from "../../../assets/Logo4.png";
import axios from "axios";

const MainLayoutCliente = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutGlobal } = useAuth();
  const [menuAbierto, setMenuAbierto] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const fullName = `${user?.first_name || user?.name || 'Cliente'} ${user?.last_name || ''}`.trim();
  
  const [appLogo, setAppLogo] = React.useState(defaultLogo);
  const [sidebarLinks, setSidebarLinks] = React.useState([]);

  // Estados para ayuda y membresía PRO / Autónomo
  const [showHelpModal, setShowHelpModal] = React.useState(false);
  const [showProModal, setShowProModal] = React.useState(false);
  const [proCompanyName, setProCompanyName] = React.useState("");
  const [proPhone, setProPhone] = React.useState(user?.phone_number || user?.phone || "");
  const [proEmail, setProEmail] = React.useState(user?.email || "");
  const [loadingPro, setLoadingPro] = React.useState(false);
  const [pendingProTenant, setPendingProTenant] = React.useState(null);
  const [isEditingPendingPro, setIsEditingPendingPro] = React.useState(false);

  const handleRequestPro = async (e) => {
    e.preventDefault();
    if (!proCompanyName.trim()) return alert("Por favor ingresa el nombre de tu Empresa o Negocio.");
    setLoadingPro(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/tenants/request-membership`, {
        company_name: proCompanyName,
        phone: proPhone,
        email: proEmail,
        membership_type: 'autonomo'
      });
      alert(isEditingPendingPro ? "¡Solicitud actualizada con éxito! Sigue en proceso de verificación." : "¡Solicitud enviada con éxito! El equipo de Root revisará tu cuenta y pronto serás Autónomo / PRO.");
      setPendingProTenant(res.data.tenant || { name: proCompanyName, phone: proPhone, email: proEmail, status: 'pending_approval' });
      setIsEditingPendingPro(false);
    } catch (error) {
      alert(error.response?.data?.message || "Error al solicitar membresía PRO.");
    } finally {
      setLoadingPro(false);
    }
  };

  const { id: urlPropertyId } = useParams();
  
  // Estados para mantener los IDs sincronizados
  const [currentPropertyId, setCurrentPropertyId] = React.useState(localStorage.getItem('current_property_id'));
  const [currentLevantamientoId, setCurrentLevantamientoId] = React.useState(localStorage.getItem('current_levantamiento_id'));

  const fetchDynamicSettings = async () => {
    try {
      const resSettings = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`);
      if (resSettings.data.success && resSettings.data.settings.appLogo) {
        setAppLogo(resSettings.data.settings.appLogo);
      }
      
      const resLinks = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/sidebar-links`);
      if (resLinks.data.success && resLinks.data.links) {
        setSidebarLinks(resLinks.data.links);
      }

      if (user) {
        try {
          const resStatus = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/tenants/my-membership-status`);
          if (resStatus.data.success && resStatus.data.has_pending) {
            setPendingProTenant(resStatus.data.tenant);
            if (resStatus.data.tenant?.name) setProCompanyName(resStatus.data.tenant.name);
            if (resStatus.data.tenant?.phone) setProPhone(resStatus.data.tenant.phone);
            if (resStatus.data.tenant?.email) setProEmail(resStatus.data.tenant.email);
          } else {
            setPendingProTenant(null);
          }
        } catch (err) {
          console.error("Error fetching my membership status:", err);
        }
      }
    } catch (error) {
      console.error("Error fetching dynamic sidebar settings", error);
    }
  };

  React.useEffect(() => {
    fetchDynamicSettings();
    window.addEventListener('settings-updated', fetchDynamicSettings);
    return () => window.removeEventListener('settings-updated', fetchDynamicSettings);
  }, []);

  // Sincronizar cada vez que cambia la ruta O cuando se dispara el evento personalizado
  React.useEffect(() => {
    const syncIds = () => {
      const pId = localStorage.getItem('current_property_id');
      const lId = localStorage.getItem('current_levantamiento_id');
      
      if (urlPropertyId && urlPropertyId !== pId) {
        setCurrentLevantamientoId(null);
      } else {
        setCurrentLevantamientoId(lId);
      }
      setCurrentPropertyId(pId);
    };

    syncIds();
    window.addEventListener('sync-agente-ids', syncIds);
    return () => window.removeEventListener('sync-agente-ids', syncIds);
  }, [location.pathname, urlPropertyId]);
  
  const cleanId = (id) => id ? id.toString().replace('prop_', '') : null;
  const isReportRoute = location.pathname.includes('/detalle-reporte');
  const effectivePropertyId = isReportRoute ? cleanId(currentPropertyId) : (cleanId(urlPropertyId) || cleanId(currentPropertyId));
  const tableroPath = effectivePropertyId ? `/DetallePropiedad/${effectivePropertyId}` : '/propiedades';
  
  const globalRoutes = ['/propiedades', '/levantamientos', '/vista-cotizaciones', '/registro-propiedades'];
  const isGlobalRoute = globalRoutes.includes(location.pathname);
  const isHomeView = location.pathname === '/VistaInicioCliente';

  const getIconComponent = (iconName) => {
    switch(iconName) {
      case 'Facebook': return <Facebook size={18} />;
      case 'Instagram': return <Instagram size={18} />;
      case 'Twitter': return <Twitter size={18} />;
      case 'TikTok': return <Globe size={18} />; // Alternativa si no existe logo de Tiktok
      case 'Youtube': return <Youtube size={18} />;
      case 'Phone': return <Phone size={18} />;
      case 'Mail': return <Mail size={18} />;
      case 'Globe': return <Globe size={18} />;
      case 'MapPin': return <MapPin size={18} />;
      default: return <LinkIcon size={18} />;
    }
  };

  return (
    <div className="tt-container">
      {!isHomeView && (
        <>
          {isMobileMenuOpen && (
            <div 
              className="sidebar-backdrop" 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}
            />
          )}
          <aside className={`tt-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {isMobileMenuOpen && (
            <button className="btn-close-mobile" onClick={() => setIsMobileMenuOpen(false)}>
              <X size={20} color="white" />
            </button>
          )}
  
          {/* LOGO EN LA PARTE SUPERIOR */}
          <div className="logo-section">
             <img src={appLogo} alt="Agente Logo" className="main-logo" style={{ cursor: 'pointer', objectFit: 'contain' }} onClick={() => navigate('/propiedades')} />
          </div>

          {/* 🔥 SECCIÓN INFERIOR: LINKS SOCIALES, AYUDA Y MEMBRESÍA PRO */}
          <div className="sidebar-bottom-group">
            <div className="tt-nav">
              {sidebarLinks.map((link) => (
                <button 
                  key={link.id}
                  className="tt-nav-btn" 
                  onClick={() => window.open(link.url, '_blank')}
                >
                  {getIconComponent(link.icon)} <span>{link.label}</span>
                </button>
              ))}
            </div>

            <div className="sidebar-actions-stack">
              <button 
                onClick={() => setShowHelpModal(true)}
                className="tt-nav-btn btn-help-sidebar"
              >
                <span className="btn-icon-symbol">❓</span> <span>¿Necesitas ayuda?</span>
              </button>

              <button 
                onClick={() => {
                  setIsEditingPendingPro(false);
                  setShowProModal(true);
                }}
                className={`tt-nav-btn btn-pro-sidebar ${pendingProTenant ? 'is-pending' : ''}`}
              >
                <span className="btn-icon-symbol">{pendingProTenant ? '⏳' : '🚀'}</span> 
                <span>{pendingProTenant ? 'En Proceso PRO' : 'Cámbiate a PRO'}</span>
              </button>
            </div>
          </div>
        </aside>
        </>
      )}


      <main className="tt-main">
        <header className="tt-header">
          <div className="header-left-group" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="btn-menu-mobile" onClick={() => setIsMobileMenuOpen(true)} style={{ display: 'none' }}>
              <Menu size={28} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {!isGlobalRoute && (
                <button 
                  onClick={() => navigate('/propiedades')} 
                  className="btn-regresar-header-naranja"
                  style={{
                    backgroundColor: '#f26624',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(242, 102, 36, 0.2)'
                  }}
                >
                  <ArrowLeft size={16} /> REGRESAR
                </button>
              )}
            </div>
          </div>

          {isGlobalRoute && (
            <div className="center-title-section">
               <h2 className="header-welcome-message">
                 Hola {(user?.first_name || user?.name || "Cliente").toUpperCase()}. Gracias por trabajar con nosotros.
               </h2>
            </div>
          )}
          
          <div className="header-right-group" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="header-actions-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/cotizaciones-pendientes')}
                title="Cotizaciones pendientes"
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  border: '2px solid #f26624',
                  backgroundColor: 'transparent',
                  color: '#f26624',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <ShoppingCart size={28} strokeWidth={2.5} />
              </button>
              <NotificationBell />
            </div>
            
            <div className="user-profile-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {!isGlobalRoute && (
                <span className="header-username-text" style={{ cursor: 'default', fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                  {fullName}
                </span>
              )}
              <div style={{ position: "relative" }}>
                <button
                  className="icon-btn"
                  style={{ padding: 0, overflow: "hidden", display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #f26624' }}
                  onClick={() => setMenuAbierto(!menuAbierto)}
                >
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt="Foto de perfil"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <User size={22} color="#666" />
                  )}
                </button>

              {menuAbierto && (
                <>
                  <div 
                    className="profile-backdrop" 
                    onClick={() => setMenuAbierto(false)} 
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999 }} 
                  />
                  <div className="profile-dropdown-menu" style={{ position: 'absolute', right: 0, top: '50px', background: 'white', border: '1px solid #ccc', borderRadius: '8px', zIndex: 1000, minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <button
                      className="dropdown-item"
                      onClick={() => { setMenuAbierto(false); navigate("/mi-perfil"); }}
                      style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: '10px 15px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <User size={16} /> Mi Perfil
                    </button>
                    <div className="dropdown-divider" style={{ borderBottom: '1px solid #eee', margin: '5px 0' }}></div>
                    <button
                      className="dropdown-item logout"
                      onClick={() => { logoutGlobal(); navigate("/"); }}
                      style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: '10px 15px', cursor: 'pointer', color: 'red', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} /> Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
        
        <div className="tt-orange-bar"></div>

        <div className="tt-body">
          {children || <Outlet context={{ searchTerm, setSearchTerm }} />}
        </div>

        {/* 🔥 MODAL DE AYUDA */}
        {showHelpModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '30px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative', textAlign: 'center' }}>
              <button onClick={() => setShowHelpModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#666' }}>✖</button>
              <h3 style={{ color: '#F26522', marginBottom: '10px', fontSize: '1.4rem', fontWeight: 'bold' }}>🤝 Centro de Ayuda</h3>
              <p style={{ color: '#555', fontSize: '0.95rem', marginBottom: '25px' }}>¿Necesitas asistencia técnica o soporte con tu cuenta en Agente Solutions? Estamos aquí para ayudarte.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={() => window.open('https://wa.me/5219999999999?text=Hola,%20necesito%20ayuda%20en%20Agente%20Solutions', '_blank')} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '12px', borderRadius: '15px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  💬 WhatsApp de Soporte
                </button>
                <button onClick={() => window.open('mailto:soporte@agentesolutions.com?subject=Soporte%20Cliente', '_blank')} style={{ backgroundColor: '#4a4a4a', color: '#fff', border: 'none', padding: '12px', borderRadius: '15px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  📧 Correo de Soporte
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 MODAL CÁMBIATE A PRO / AUTÓNOMO */}
        {showProModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '30px', maxWidth: '480px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative' }}>
              <button onClick={() => setShowProModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#666' }}>✖</button>
              
              {pendingProTenant && !isEditingPendingPro ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>⏳</div>
                  <h3 style={{ color: '#1e3a8a', fontSize: '1.5rem', fontWeight: '900', marginBottom: '12px' }}>
                    ¡En Proceso de Aprobación!
                  </h3>
                  <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '14px', padding: '18px', marginBottom: '20px', textAlign: 'left' }}>
                    <p style={{ color: '#0369a1', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 10px 0' }}>
                      Hola <strong>{user?.first_name || 'Cliente'}</strong>, ya hemos registrado y recibido tu solicitud para convertirte en <strong>Autónomo PRO</strong> con tu empresa/negocio:
                    </p>
                    <div style={{ backgroundColor: '#fff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0f2fe', fontWeight: 'bold', color: '#1e3a8a', fontSize: '1.05rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🏢 {pendingProTenant.name || proCompanyName}
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>
                      🔒 Un administrador del equipo <strong>Root</strong> está verificando tu cuenta e información. En cuanto sea aprobada, tu sesión se actualizará automáticamente y tendrás acceso completo a las herramientas independientes.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button 
                      onClick={() => setIsEditingPendingPro(true)} 
                      style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                      ✏️ Modificar datos
                    </button>
                    <button 
                      onClick={() => setShowProModal(false)} 
                      style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)' }}
                    >
                      ✔ Entendido
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h3 style={{ background: isEditingPendingPro ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #FF6600 0%, #FF9900 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.5rem', fontWeight: '900', marginBottom: '10px' }}>
                      {isEditingPendingPro ? '✏️ Modificar Solicitud PRO' : '🚀 Cámbiate a Agente Solutions PRO'}
                    </h3>
                    <p style={{ color: '#555', fontSize: '0.9rem', lineHeight: '1.4' }}>
                      {isEditingPendingPro ? 'Actualiza el nombre de tu empresa, teléfono o correo si deseas corregir la solicitud en curso.' : 'Únete como Autónomo o Empresa colaboradora en nuestra plataforma. Gestiona tu propia cartera de propiedades, clientes y técnicos de forma independiente.'}
                    </p>
                  </div>
                  
                  <form onSubmit={handleRequestPro} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Nombre de tu Empresa / Negocio *</label>
                      <input type="text" required placeholder="Ej. Soluciones Inmobiliarias S.A." value={proCompanyName} onChange={(e) => setProCompanyName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ccc', fontSize: '0.95rem', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Teléfono de Contacto</label>
                      <input type="text" placeholder="Ej. 9991234567" value={proPhone} onChange={(e) => setProPhone(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ccc', fontSize: '0.95rem', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Correo Electrónico</label>
                      <input type="email" placeholder="tucorreo@empresa.com" value={proEmail} onChange={(e) => setProEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ccc', fontSize: '0.95rem', outline: 'none' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      {isEditingPendingPro && (
                        <button type="button" onClick={() => setIsEditingPendingPro(false)} style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', width: '40%' }}>
                          Cancelar
                        </button>
                      )}
                      <button type="submit" disabled={loadingPro} style={{ background: isEditingPendingPro ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #FF6600 0%, #FF9900 100%)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '900', fontSize: '1rem', cursor: loadingPro ? 'not-allowed' : 'pointer', width: isEditingPendingPro ? '60%' : '100%', boxShadow: isEditingPendingPro ? '0 4px 15px rgba(30, 58, 138, 0.4)' : '0 4px 15px rgba(255, 102, 0, 0.4)' }}>
                        {loadingPro ? 'ENVIANDO... ⏳' : isEditingPendingPro ? 'GUARDAR CAMBIOS 💾' : 'SOLICITAR MEMBRESÍA PRO 🚀'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MainLayoutCliente;
