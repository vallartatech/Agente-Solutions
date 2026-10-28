import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, PlusCircle, Trash2, Layout, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { useAuth } from "../../context/AuthContext";
import Header from "../Shared/Header";
import "../../styles/Auth/CustomizeLogin.css";

const ICONS_LIST = [
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Twitter', label: 'Twitter/X' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Youtube', label: 'YouTube' },
  { value: 'Phone', label: 'Teléfono' },
  { value: 'Mail', label: 'Correo' },
  { value: 'Globe', label: 'Página Web' },
  { value: 'MapPin', label: 'Ubicación' },
];

const CustomizeLogin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isRoot = Number(user?.role_id) === 0;
  const [activeTab, setActiveTab] = useState(isRoot ? 'fondo' : 'logo'); // 'fondo', 'logo', 'sidebar'

  useEffect(() => {
    if (isRoot) {
      setActiveTab('fondo');
    }
  }, [isRoot]);
  
  // -- ESTADOS TAB: FONDO --
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [imageToDelete, setImageToDelete] = useState(false);
  
  // -- ESTADOS TAB: LOGO --
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [logoToDelete, setLogoToDelete] = useState(false);

  // -- ESTADOS TAB: SIDEBAR --
  const [sidebarLinks, setSidebarLinks] = useState([]);

  // -- ESTADOS GLOBALES --
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCurrentSettings = async () => {
      try {
        // Fetch fondo y logo
        const responseSettings = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`);
        if (responseSettings.data.success) {
          if (responseSettings.data.settings.imageUrl) setPreviewUrl(responseSettings.data.settings.imageUrl);
          if (responseSettings.data.settings.colorHex) setSelectedColor(responseSettings.data.settings.colorHex);
          if (responseSettings.data.settings.appLogo) setLogoPreviewUrl(responseSettings.data.settings.appLogo);
        }

        // Fetch sidebar links
        const responseSidebar = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/sidebar-links`);
        if (responseSidebar.data.success) {
          setSidebarLinks(responseSidebar.data.links || []);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchCurrentSettings();
  }, []);

  // -- HANDLERS FONDO --
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImageToDelete(false);
      setStatusMessage("");
    }
  };
  const handleDeleteImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageToDelete(true);
    setStatusMessage("");
  };

  // -- HANDLERS LOGO --
  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedLogoFile(file);
      setLogoPreviewUrl(URL.createObjectURL(file));
      setLogoToDelete(false);
      setStatusMessage("");
    }
  };
  const handleDeleteLogo = () => {
    setSelectedLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoToDelete(true);
    setStatusMessage("");
  };

  // -- HANDLERS SIDEBAR --
  const addSidebarLink = () => {
    setSidebarLinks([...sidebarLinks, { id: Date.now(), icon: 'Globe', label: '', url: '' }]);
  };
  
  const updateSidebarLink = (id, field, value) => {
    setSidebarLinks(sidebarLinks.map(link => link.id === id ? { ...link, [field]: value } : link));
  };
  
  const removeSidebarLink = (id) => {
    setSidebarLinks(sidebarLinks.filter(link => link.id !== id));
  };

  const moveLink = (index, direction) => {
    if (index + direction < 0 || index + direction >= sidebarLinks.length) return;
    const newLinks = [...sidebarLinks];
    const temp = newLinks[index];
    newLinks[index] = newLinks[index + direction];
    newLinks[index + direction] = temp;
    setSidebarLinks(newLinks);
  };

  // -- GUARDAR TODO --
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage("");

    try {
      // 1. Guardar Color e Imagen SOLO si es Root
      if (isRoot) {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-background/color`, { color_hex: selectedColor });

        if (imageToDelete) {
          await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-background/image`);
          setImageToDelete(false);
        } else if (selectedFile) {
          const formData = new FormData();
          formData.append("background_image", selectedFile);
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-background/image`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setSelectedFile(null);
        }
      }

      // 3. Guardar Logo
      if (logoToDelete) {
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/app-logo`);
        setLogoToDelete(false);
      } else if (selectedLogoFile) {
        const formDataLogo = new FormData();
        formDataLogo.append("app_logo", selectedLogoFile);
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/app-logo`, formDataLogo, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSelectedLogoFile(null);
      }

      // 4. Guardar Sidebar Links
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/sidebar-links`, { links: sidebarLinks });

      setStatusMessage("¡Éxito! Todos los cambios han sido guardados.");
      
      // Emitir evento para que Header y Sidebar recarguen su configuración sin tener que recargar la página entera
      window.dispatchEvent(new Event('settings-updated'));
      
    } catch (error) {
      console.error("Save error:", error);
      setStatusMessage("Error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="main-container">
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <div className="content-wrapper">
        <Header titulo="CONFIGURACIÓN GLOBAL" />

        <div className="customize-wrapper">
          <div className="customize-header-banner">
            <h2 className="customize-title">APARIENCIA Y NAVEGACIÓN GLOBAL</h2>
            <button 
              onClick={() => navigate(-1)} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                background: '#F26522', color: 'white', padding: '10px 24px', 
                borderRadius: '30px', border: 'none', cursor: 'pointer', 
                fontWeight: '800', fontSize: '0.9rem',
                boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)'
              }}
            >
              <ChevronLeft size={18} />
              <span>VOLVER AL PANEL</span>
            </button>
          </div>

          {/* TABS MENU */}
          <div className="tabs-container">
            {isRoot && (
              <button className={`tab-button ${activeTab === 'fondo' ? 'active' : ''}`} onClick={() => setActiveTab('fondo')}>
                <Layout size={18} /> Fondo de Inicio (Root)
              </button>
            )}
            <button className={`tab-button ${activeTab === 'logo' ? 'active' : ''}`} onClick={() => setActiveTab('logo')}>
              <ImageIcon size={18} /> Logotipo Principal
            </button>
            <button className={`tab-button ${activeTab === 'sidebar' ? 'active' : ''}`} onClick={() => setActiveTab('sidebar')}>
              <LinkIcon size={18} /> Botones del Sidebar
            </button>
          </div>

          <div className="customize-card">
            
            {/* PESTAÑA 1: FONDO DE INICIO (ROOT) */}
            {activeTab === 'fondo' && (
              <div className="customize-grid">
                <div className="customize-section-card">
                  <div>
                    <span className="customize-section-title">
                      <Layout size={18} color="#F26522" /> 1. VISTA PREVIA Y FOTO DE FONDO
                    </span>
                    <p className="color-note" style={{ marginTop: 0, marginBottom: '16px' }}>
                      Sube una imagen de alta definición (JPG, PNG o WebP) para personalizar el fondo de inicio de sesión.
                    </p>
                    <div className="preview-box" style={{ backgroundColor: selectedColor }}>
                      <span className="preview-box-badge">VISTA PREVIA EN VIVO</span>
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '5px' }}>🎨</span>
                          <span style={{ fontWeight: '800', fontSize: '1rem' }}>FONDO DE COLOR PREDETERMINADO</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: '10px' }}>
                    <label className="btn-choose-file">
                      📂 SUBIR FOTO DE FONDO
                      <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} style={{ display: "none" }} />
                    </label>
                    {(previewUrl || selectedFile) && (
                      <button type="button" onClick={handleDeleteImage} className="btn-delete-file" title="Eliminar imagen">
                        <Trash2 size={18} /> ELIMINAR FOTO
                      </button>
                    )}
                  </div>
                </div>

                <div className="customize-section-card">
                  <div>
                    <span className="customize-section-title">
                      <Layout size={18} color="#F26522" /> 2. COLOR PREDETERMINADO Y PALETAS
                    </span>
                    <p className="color-note" style={{ marginTop: 0, marginBottom: '16px' }}>
                      Este color se mostrará de fondo mientras carga la imagen o como color sólido principal.
                    </p>

                    <div className="color-picker-container">
                      <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="color-picker-input" />
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'block' }}>CÓDIGO HEXADECIMAL</span>
                        <div style={{ fontWeight: "900", fontSize: "1.4rem", color: "#0f172a" }}>
                          {selectedColor.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginTop: '16px' }}>
                      ACCESOS RÁPIDOS DE COLOR:
                    </span>
                    <div className="preset-swatches">
                      {[
                        { hex: '#000000', label: 'Negro Absoluto' },
                        { hex: '#0B132B', label: 'Azul Noche' },
                        { hex: '#1E293B', label: 'Gris Antracita' },
                        { hex: '#F26522', label: 'Naranja Agente' },
                        { hex: '#FFFFFF', label: 'Blanco Pulcro' }
                      ].map((swatch) => (
                        <button
                          key={swatch.hex}
                          type="button"
                          onClick={() => setSelectedColor(swatch.hex)}
                          className="swatch-btn"
                          style={{ backgroundColor: swatch.hex }}
                          title={swatch.label}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="color-note">
                    <strong>Nota:</strong> Los cambios aplicados aquí se actualizarán instantáneamente en la pantalla principal de Inicio de Sesión de todos los usuarios.
                  </p>
                </div>
              </div>
            )}

            {/* PESTAÑA 2: LOGOTIPO */}
            {activeTab === 'logo' && (
              <div className="customize-grid">
                <div className="customize-section-card">
                  <div>
                    <span className="customize-section-title">
                      <ImageIcon size={18} color="#F26522" /> LOGOTIPO PRINCIPAL
                    </span>
                    <p className="color-note" style={{ marginTop: 0, marginBottom: '15px' }}>
                      Aparecerá en el encabezado de los paneles administrativos y en el Login. Recomendado formato PNG transparente (máx 2MB).
                    </p>
                    
                    <div className="preview-box" style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1' }}>
                      {logoPreviewUrl ? (
                        <img src={logoPreviewUrl} alt="Logo Preview" style={{ width: "auto", height: "80%", maxWidth: "80%", objectFit: "contain" }} />
                      ) : (
                        <span style={{ color: "#94a3b8", fontWeight: "bold" }}>No se ha subido ningún logo personalizado</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: '10px' }}>
                    <label className="btn-choose-file" style={{ backgroundColor: '#2563eb' }}>
                      📂 SUBIR NUEVO LOGO
                      <input type="file" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={handleLogoFileChange} style={{ display: "none" }} />
                    </label>
                    {(logoPreviewUrl || selectedLogoFile) && (
                      <button type="button" onClick={handleDeleteLogo} className="btn-delete-file" title="Eliminar Logo">
                        <Trash2 size={18} /> ELIMINAR LOGO
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 3: SIDEBAR (REDES SOCIALES) */}
            {activeTab === 'sidebar' && (
              <div>
                <span className="customize-section-title">
                  <LinkIcon size={18} color="#F26522" /> BOTONES DE CONTACTO PARA EL CLIENTE
                </span>
                <p className="color-note" style={{ marginTop: 0 }}>
                  Agrega botones de redes sociales, página web o métodos de contacto que aparecerán en la barra lateral del portal del cliente.
                </p>
                
                <div className="sidebar-links-list">
                  {sidebarLinks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                      Aún no has agregado ningún botón. Haz clic en "Añadir Nuevo Botón" para empezar.
                    </div>
                  ) : (
                    sidebarLinks.map((link, index) => (
                      <div key={link.id} className="sidebar-link-item">
                        <div className="sidebar-link-top-controls">
                          <div className="sidebar-reorder-btns">
                            <button onClick={() => moveLink(index, -1)} disabled={index === 0} className="btn-reorder" title="Subir">▲</button>
                            <button onClick={() => moveLink(index, 1)} disabled={index === sidebarLinks.length - 1} className="btn-reorder" title="Bajar">▼</button>
                          </div>
                          
                          <select 
                            className="sidebar-link-icon-select"
                            value={link.icon}
                            onChange={(e) => updateSidebarLink(link.id, 'icon', e.target.value)}
                          >
                            {ICONS_LIST.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>

                          <button onClick={() => removeSidebarLink(link.id)} className="btn-delete-file sidebar-delete-btn" title="Borrar Botón">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="sidebar-link-inputs-wrapper">
                          <input 
                            type="text" 
                            placeholder="Etiqueta (ej. Mi Facebook)" 
                            className="sidebar-link-input"
                            value={link.label}
                            onChange={(e) => updateSidebarLink(link.id, 'label', e.target.value)}
                          />
                          
                          <input 
                            type="url" 
                            placeholder="URL (ej. https://facebook.com/pagina)" 
                            className="sidebar-link-input"
                            value={link.url}
                            onChange={(e) => updateSidebarLink(link.id, 'url', e.target.value)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <button type="button" className="btn-add-link" onClick={addSidebarLink}>
                  <PlusCircle size={18} /> AÑADIR NUEVO BOTÓN
                </button>
              </div>
            )}

            {/* BARRA DE GUARDAR GENERAL */}
            <div style={{ borderTop: "2px solid #f1f5f9", paddingTop: "24px", marginTop: "28px" }}>
              <button onClick={handleSaveChanges} disabled={isSaving} className="btn-save-all">
                {isSaving ? "GUARDANDO TODOS LOS CAMBIOS..." : "💾 GUARDAR TODA LA CONFIGURACIÓN"}
              </button>
            </div>

            {statusMessage && (
              <p style={{
                marginTop: "20px", fontWeight: "bold", padding: "14px", borderRadius: "14px",
                textAlign: "center", fontSize: "1.05rem", color: "white",
                backgroundColor: statusMessage.includes("Error") ? "#ef4444" : "#10b981",
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
              }}>
                {statusMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomizeLogin;
