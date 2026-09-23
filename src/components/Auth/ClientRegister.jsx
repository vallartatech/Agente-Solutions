import React, { useState, useEffect, useRef } from "react";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Mail, 
  Phone, 
  Building, 
  Building2, 
  Briefcase, 
  Key, 
  Globe, 
  HardHat, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  Info,
  Layers,
  ArrowRight
} from "lucide-react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import Logo4 from "../../assets/Logo4.png";

// Catálogo de especialidades técnicas
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

// Los 7 roles públicos clasificados por categoría
const ROLES_PUBLICOS = [
  // ── CATEGORÍA 1: AGENTE SOLUTIONS (DIRECTOS / MATRIZ) ──
  {
    key: "client",
    roleId: 3,
    category: "agente",
    categoryLabel: "Agente Solutions",
    label: "CLIENTE",
    shortLabel: "Cliente",
    badge: "Matriz Oficial",
    icon: "👤",
    color: "#10B981",
    tagline: "Contrata servicios para tu hogar o negocio",
    description: "Solicita servicios de mantenimiento, reparaciones y soporte técnico directo con la red y garantía de Agente Solutions.",
    features: [
      "Solicitud de servicios programados y emergencias SOS",
      "Seguimiento en tiempo real con reportes de avance",
      "Aprobación transparente de presupuestos y pagos"
    ],
    cta: "Crear Cuenta Cliente",
    trialInfo: "Acceso inmediato sin costo de suscripción"
  },
  {
    key: "technician",
    roleId: 2,
    category: "agente",
    categoryLabel: "Agente Solutions",
    label: "TÉCNICO AGENTE",
    shortLabel: "Técnico Agente",
    badge: "Técnico Interno",
    icon: "🛠️",
    color: "#0284C7",
    tagline: "Presta servicios oficiales en Agente Solutions",
    description: "Forma parte del equipo técnico oficial asignado a las órdenes de trabajo y levantamientos de la matriz Agente Solutions.",
    features: [
      "Recepción de órdenes de trabajo directas",
      "Checklists inteligentes y reportes de evidencia",
      "Registro de venta cruzada y comisiones por trabajo"
    ],
    cta: "Unirme como Técnico",
    trialInfo: "1 año de suscripción gratuita de bienvenida"
  },

  // ── CATEGORÍA 2: AUTÓNOMOS Y RED (MULTI-TENANT & RED) ──
  {
    key: "owner_personal",
    roleId: 5,
    category: "autonomo",
    categoryLabel: "Autónomos y Red",
    label: "AUTÓNOMO PERSONAL",
    shortLabel: "Autónomo Personal",
    badge: "Hasta 3 Propiedades",
    icon: "🏢",
    color: "#3B82F6",
    tagline: "Gestiona tu portafolio personal de inmuebles",
    description: "Ideal para propietarios e inversionistas que gestionan hasta 3 propiedades y desean coordinar sus mantenimientos con orden.",
    features: [
      "Control de hasta 3 inmuebles y zonas",
      "Coordinación de órdenes de mantenimiento",
      "6 meses gratis de membresía completa"
    ],
    cta: "Comenzar Prueba Personal",
    trialInfo: "6 Meses Gratis de Prueba ($299/mes posterior)"
  },
  {
    key: "owner_business",
    roleId: 4,
    category: "autonomo",
    categoryLabel: "Autónomos y Red",
    label: "AUTÓNOMO EMPRESARIAL",
    shortLabel: "Aut. Empresarial",
    badge: "Hasta 30 Clientes",
    icon: "🏬",
    color: "#8B5CF6",
    tagline: "Plataforma integral para empresas de servicio",
    description: "Para empresas de mantenimiento, administradoras y gestores con cuadrilla propia que manejan hasta 30 clientes y técnicos.",
    features: [
      "Gestión de hasta 30 clientes y propiedades ilimitadas",
      "Código de empresa exclusivo para afiliar técnicos y clientes",
      "Tableros de control avanzados, cotizaciones y reportes"
    ],
    cta: "Comenzar Prueba Empresarial",
    trialInfo: "6 Meses Gratis de Prueba ($935/mes posterior)"
  },
  {
    key: "admin_propiedades",
    roleId: 7,
    category: "autonomo",
    categoryLabel: "Autónomos y Red",
    label: "ADMIN. PROPIEDADES",
    shortLabel: "Admin. Propiedades",
    badge: "Property Manager",
    icon: "🔑",
    color: "#F59E0B",
    tagline: "Gestión y administración de inmuebles",
    description: "Property Managers y administradores de condominios o residenciales vinculados al equipo de una empresa o Autónomo.",
    features: [
      "Supervisión operativa de condominios y propiedades",
      "Gestión de accesos, incidencias y levantamientos",
      "Vinculación directa mediante código de empresa"
    ],
    cta: "Registrar Administrador",
    trialInfo: "Sujeto a vinculación y aprobación de empresa"
  },
  {
    key: "tecnico_red",
    roleId: 8,
    category: "autonomo",
    categoryLabel: "Autónomos y Red",
    label: "TÉCNICO DE LA RED",
    shortLabel: "Técnico de Red",
    badge: "Marketplace Abierto",
    icon: "🌐",
    color: "#EC4899",
    tagline: "Ofrece tus servicios en la red abierta",
    description: "Especialistas y profesionales independientes que ofrecen sus servicios y habilidades en el marketplace abierto de trabajos.",
    features: [
      "Presencia y perfil en el catálogo público de técnicos",
      "Cotización directa de solicitudes y trabajos de la red",
      "1 año completo de suscripción gratuita de bienvenida"
    ],
    cta: "Unirme a la Red Técnica",
    trialInfo: "1 año de membresía gratuita sin costo"
  },
  {
    key: "contratista",
    roleId: 6,
    category: "autonomo",
    categoryLabel: "Autónomos y Red",
    label: "CONTRATISTA",
    shortLabel: "Contratista",
    badge: "Proyectos y Obras",
    icon: "🏗️",
    color: "#0D9488",
    tagline: "Empresas de obras, proyectos y remodelación",
    description: "Empresas constructoras y contratistas dedicados a remodelaciones, proyectos integrales de obra y subcontratación técnica.",
    features: [
      "Gestión de proyectos de obra y remodelación",
      "Coordinación de cuadrillas y subcontratistas",
      "Seguimiento fotográfico de avances y presupuestos"
    ],
    cta: "Registrar Contratista",
    trialInfo: "6 Meses Gratis de Prueba ($935/mes posterior)"
  }
];

const ClientRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Estados del formulario
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState(["Electricidad"]);

  // Estado de navegación de categorías y rol seleccionado
  const [activeCategory, setActiveCategory] = useState("all"); // 'all' | 'agente' | 'autonomo'
  const [selectedRoleKey, setSelectedRoleKey] = useState("client");

  // Estados visuales y de estado de carga
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [backgroundSettings, setBackgroundSettings] = useState({ imageUrl: null, colorHex: '#08080c', appLogo: null });

  // Referencias para scroll responsivo en carrusel de iconos
  const iconDockRef = useRef(null);

  // Leer parámetros de URL al montar (?code=AUT_123 & ?role=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get("code") || params.get("company_code");
    const roleParam = params.get("role") || params.get("plan");

    if (codeParam) {
      setCompanyCode(codeParam.toUpperCase());
    }

    if (roleParam) {
      const found = ROLES_PUBLICOS.find(r => r.key === roleParam || String(r.roleId) === roleParam);
      if (found) {
        setSelectedRoleKey(found.key);
        setActiveCategory(found.category);
      }
    }
  }, [location.search]);

  // Cargar configuración de fondo
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`)
      .then(r => { 
        if (r.data.success && r.data.settings) {
          setBackgroundSettings(r.data.settings); 
        }
      })
      .catch(() => {});
  }, []);

  // Filtrar roles según la categoría seleccionada
  const rolesFiltrados = ROLES_PUBLICOS.filter(r => {
    if (activeCategory === "all") return true;
    return r.category === activeCategory;
  });

  const rolActual = ROLES_PUBLICOS.find(r => r.key === selectedRoleKey) || ROLES_PUBLICOS[0];

  // Cambiar categoría y seleccionar el primer rol correspondiente
  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setMessage("");
    const matches = ROLES_PUBLICOS.filter(r => cat === "all" || r.category === cat);
    if (matches.length > 0 && !matches.some(m => m.key === selectedRoleKey)) {
      setSelectedRoleKey(matches[0].key);
    }
  };

  // Seleccionar rol y centrar en el carrusel táctil móvil si aplica
  const handleSelectRole = (key) => {
    setSelectedRoleKey(key);
    setMessage("");
  };

  // Navegar al rol anterior/siguiente en móvil
  const handleStepRole = (direction) => {
    const currentIndex = rolesFiltrados.findIndex(r => r.key === selectedRoleKey);
    if (currentIndex === -1) return;
    
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = rolesFiltrados.length - 1;
    if (nextIndex >= rolesFiltrados.length) nextIndex = 0;

    const nextRole = rolesFiltrados[nextIndex];
    setSelectedRoleKey(nextRole.key);
    
    // Centrar icono en el dock
    if (iconDockRef.current) {
      const targetBtn = iconDockRef.current.querySelector(`[data-role-key="${nextRole.key}"]`);
      if (targetBtn) {
        targetBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  };

  // Manejar selección de especialidades para técnicos
  const toggleSpecialty = (specName) => {
    setSelectedSpecialties(prev => {
      if (prev.includes(specName)) {
        if (prev.length === 1) return prev; // Mantener al menos una
        return prev.filter(s => s !== specName);
      } else {
        return [...prev, specName];
      }
    });
  };

  const handleCaptchaChange = (value) => {
    setIsCaptchaValid(!!value);
    setCaptchaToken(value);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("Error: La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Error: Las contraseñas no coinciden.");
      return;
    }

    if (!isCaptchaValid && !captchaToken) {
      setMessage("Error: Por favor verifica que no eres un robot en el reCAPTCHA.");
      return;
    }

    setIsLoading(true);

    const roleId = rolActual.roleId;
    const isAutonomoAccount = (roleId === 5 || roleId === 4 || roleId === 6 || roleId === 8);

    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone.trim(),
        password: password,
        role_id: roleId,
        company_code: (!isAutonomoAccount && roleId !== 7) ? (companyCode.trim() || null) : (companyCode.trim() || null),
        company_name: isAutonomoAccount ? (companyName.trim() || `${firstName.trim()} ${lastName.trim()}`) : null,
        specialties: (roleId === 2 || roleId === 8) ? selectedSpecialties : [],
        captcha_token: captchaToken
      };

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/registro-usuario`, payload);

      setIsLoading(false);

      if (res.data.status === 'pending_payment') {
        navigate(`/activacion-cuenta?tenant_id=${res.data.tenant_id}`);
      } else if (res.data.status === 'pending_approval' || roleId === 2 || (roleId === 7 && companyCode.trim() !== '')) {
        setIsPendingApproval(true);
      } else if (roleId === 5 || roleId === 4 || roleId === 6 || roleId === 8) {
        setMessage('🎉 ¡Registro exitoso con periodo gratuito de prueba! Redirigiendo al inicio de sesión...');
        setTimeout(() => navigate('/'), 2200);
      } else {
        setMessage('✨ ¡Cuenta registrada exitosamente! Redirigiendo al inicio de sesión...');
        setTimeout(() => navigate('/'), 1800);
      }

    } catch (error) {
      setIsLoading(false);
      let errorMsg = "Error al conectar con el servidor.";
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          errorMsg = Object.values(error.response.data.errors).flat().join(" ");
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        }
      }
      setMessage("Error: " + errorMsg);
    }
  };

  return (
    <div 
      className="register-main-container"
      style={{
        backgroundColor: backgroundSettings.colorHex || '#0b0f19',
        backgroundImage: backgroundSettings.imageUrl ? `linear-gradient(rgba(11, 15, 25, 0.88), rgba(11, 15, 25, 0.95)), url(${backgroundSettings.imageUrl})` : 'radial-gradient(circle at 50% 20%, #172033 0%, #090d16 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '30px 16px 60px 16px',
        boxSizing: 'border-box',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <style>{`
        /* ── RESET Y ESTILOS GLOBALES DE REGISTRO ── */
        .register-main-container * {
          box-sizing: border-box;
        }

        .back-nav-btn {
          position: fixed;
          top: 24px;
          left: 24px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 9999px;
          transition: all 0.25s ease;
          z-index: 100;
          backdrop-filter: blur(12px);
          font-weight: 600;
          font-size: 0.9rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .back-nav-btn:hover {
          background: rgba(242, 101, 34, 0.2);
          border-color: #f26522;
          color: #f26522;
          transform: translateY(-2px);
        }

        /* ── HEADER Y LOGO ── */
        .reg-header {
          text-align: center;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .reg-logo {
          max-width: 220px;
          height: auto;
          margin-bottom: 12px;
          filter: drop-shadow(0 6px 16px rgba(0,0,0,0.4));
          cursor: pointer;
          transition: transform 0.2s;
        }
        .reg-logo:hover {
          transform: scale(1.02);
        }
        .reg-title {
          font-size: 1.9rem;
          font-weight: 900;
          letter-spacing: -0.5px;
          margin: 0 0 6px 0;
          background: linear-gradient(135deg, #ffffff 40%, #cbd5e1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .reg-subtitle {
          color: #94a3b8;
          font-size: 0.95rem;
          margin: 0;
          max-width: 500px;
        }

        /* ── PESTAÑAS DE CATEGORÍAS ── */
        .category-tabs-wrapper {
          display: flex;
          background: rgba(30, 41, 59, 0.7);
          padding: 5px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          margin-bottom: 22px;
          gap: 6px;
          max-width: 620px;
          width: 100%;
          box-shadow: 0 10px 25px rgba(0,0,0,0.25);
        }
        .category-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        .category-tab-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.04);
        }
        .category-tab-btn.active {
          background: #f26522;
          color: #fff;
          box-shadow: 0 4px 15px rgba(242, 101, 34, 0.4);
        }

        /* ── SELECTOR DE ICONOS MÓVIL (DOCK HORIZONTAL) ── */
        .icon-dock-container {
          display: none;
          width: 100%;
          max-width: 580px;
          margin-bottom: 18px;
          position: relative;
        }
        .icon-dock-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 10px 6px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .icon-dock-scroll::-webkit-scrollbar {
          display: none;
        }
        .icon-dock-item {
          flex: 0 0 72px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: rgba(30, 41, 59, 0.6);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          padding: 10px 4px 8px 4px;
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          scroll-snap-align: center;
          position: relative;
        }
        .icon-dock-item .dock-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
          transition: all 0.25s ease;
        }
        .icon-dock-item .dock-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: #94a3b8;
          text-align: center;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 66px;
        }
        .icon-dock-item.active {
          transform: translateY(-4px) scale(1.06);
          background: rgba(15, 23, 42, 0.95);
          border-color: var(--active-color, #f26522);
          box-shadow: 0 8px 20px rgba(0,0,0,0.4), 0 0 15px var(--active-color-glow, rgba(242,101,34,0.3));
        }
        .icon-dock-item.active .dock-label {
          color: #fff;
          font-weight: 800;
        }
        .icon-dock-item.active .dock-icon-circle {
          background: var(--active-color, #f26522);
          transform: scale(1.08);
        }

        .dock-nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
          transition: all 0.2s;
        }
        .dock-nav-arrow:hover {
          background: #f26522;
          border-color: #f26522;
        }
        .dock-nav-arrow.left { left: -14px; }
        .dock-nav-arrow.right { right: -14px; }

        /* ── GRID DE TARJETAS EN ESCRITORIO ── */
        .desktop-roles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          width: 100%;
          max-width: 1180px;
          margin-bottom: 28px;
        }
        .role-card-desktop {
          background: rgba(20, 29, 47, 0.6);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.2, 0.9, 0.2, 1);
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
        }
        .role-card-desktop:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow: 0 15px 30px rgba(0,0,0,0.35);
          background: rgba(25, 36, 58, 0.8);
        }
        .role-card-desktop.active {
          background: rgba(15, 23, 42, 0.95);
          border-color: var(--card-color, #f26522);
          box-shadow: 0 16px 36px rgba(0,0,0,0.45), 0 0 20px var(--card-color-glow, rgba(242,101,34,0.25));
          transform: translateY(-6px) scale(1.02);
        }
        .role-card-desktop::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--card-color, #f26522);
        }
        .role-card-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.07);
          color: var(--card-color, #f26522);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 12px;
          align-self: flex-start;
        }
        .role-card-title {
          font-size: 1.12rem;
          font-weight: 900;
          color: #fff;
          margin: 0 0 6px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .role-card-desc {
          font-size: 0.84rem;
          color: #94a3b8;
          line-height: 1.4;
          margin: 0 0 14px 0;
          flex-grow: 1;
        }
        .role-card-select-btn {
          width: 100%;
          padding: 9px 12px;
          border-radius: 12px;
          border: none;
          background: rgba(255, 255, 255, 0.06);
          color: #cbd5e1;
          font-size: 0.82rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
        }
        .role-card-desktop.active .role-card-select-btn {
          background: var(--card-color, #f26522);
          color: #fff;
          box-shadow: 0 4px 14px var(--card-color-glow, rgba(242,101,34,0.3));
        }

        /* ── TARJETA Y FORMULARIO PRINCIPAL DE REGISTRO ── */
        .register-form-container {
          width: 100%;
          max-width: 1180px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 28px;
          backdrop-filter: blur(20px);
          box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 30px rgba(242, 101, 34, 0.15);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .reg-split-layout {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 0;
          width: 100%;
        }

        /* Columna Izquierda: Detalles del Rol Seleccionado */
        .role-details-panel {
          padding: 38px 32px;
          background: linear-gradient(170deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        .role-details-panel::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 5px;
          background: var(--active-role-color, #f26522);
        }
        .role-detail-header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.08);
          color: var(--active-role-color, #f26522);
          border: 1px solid rgba(255, 255, 255, 0.12);
          margin-bottom: 14px;
        }
        .role-detail-title {
          font-size: 1.8rem;
          font-weight: 900;
          color: #fff;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .role-detail-tagline {
          font-size: 1rem;
          color: var(--active-role-color, #f26522);
          font-weight: 700;
          margin: 0 0 16px 0;
        }
        .role-detail-desc {
          color: #cbd5e1;
          font-size: 0.92rem;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .role-features-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 28px;
        }
        .role-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.88rem;
          color: #e2e8f0;
          line-height: 1.4;
        }
        .role-feature-icon {
          color: var(--active-role-color, #f26522);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .trial-pill-box {
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .trial-pill-box strong {
          color: #fff;
        }

        /* Columna Derecha: Formulario de Registro */
        .form-fields-panel {
          padding: 38px 36px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .form-grid-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .input-wrapper {
          position: relative;
          margin-bottom: 14px;
        }
        .input-wrapper label {
          display: block;
          font-size: 0.78rem;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .input-icon-left {
          position: absolute;
          left: 14px;
          bottom: 12px;
          color: #64748b;
          pointer-events: none;
          transition: color 0.2s;
        }
        .custom-reg-input {
          width: 100%;
          padding: 12px 14px 12px 44px;
          background: rgba(15, 23, 42, 0.6);
          border: 1.5px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          color: #fff;
          font-size: 0.92rem;
          outline: none;
          transition: all 0.25s ease;
        }
        .custom-reg-input:focus {
          border-color: #f26522;
          background: rgba(15, 23, 42, 0.9);
          box-shadow: 0 0 0 4px rgba(242, 101, 34, 0.18);
        }
        .custom-reg-input:focus + .input-icon-left,
        .input-wrapper:focus-within .input-icon-left {
          color: #f26522;
        }
        .custom-reg-input::placeholder {
          color: #475569;
          font-size: 0.88rem;
        }
        .toggle-pw-btn {
          position: absolute;
          right: 12px;
          bottom: 11px;
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .toggle-pw-btn:hover {
          color: #fff;
        }

        /* Selector de Especialidades en Chips */
        .specialties-section {
          margin-bottom: 16px;
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 14px;
        }
        .specialties-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .specialties-chips-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          max-height: 140px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .specialty-chip {
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 0.78rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .specialty-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .specialty-chip.selected {
          background: rgba(2, 132, 199, 0.2);
          border-color: #0284c7;
          color: #38bdf8;
          box-shadow: 0 0 10px rgba(2, 132, 199, 0.25);
        }

        /* Botón de Submit */
        .submit-reg-btn {
          width: 100%;
          padding: 15px 24px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(135deg, #f26522 0%, #ea580c 100%);
          color: #fff;
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: 0.3px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 10px 25px rgba(242, 101, 34, 0.4);
          transition: all 0.25s cubic-bezier(0.2, 0.9, 0.2, 1);
          margin-top: 10px;
        }
        .submit-reg-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(242, 101, 34, 0.55);
          background: linear-gradient(135deg, #ff7438 0%, #f26522 100%);
        }
        .submit-reg-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-link-container {
          text-align: center;
          margin-top: 18px;
          font-size: 0.9rem;
          color: #94a3b8;
        }
        .login-link-action {
          color: #f26522;
          font-weight: 800;
          cursor: pointer;
          margin-left: 6px;
          text-decoration: underline;
        }
        .login-link-action:hover {
          color: #ff8246;
        }

        /* ── RESPONSIVIDAD (MÓVIL & TABLET) ── */
        @media (max-width: 900px) {
          .reg-split-layout {
            grid-template-columns: 1fr;
          }
          .role-details-panel {
            padding: 26px 20px;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .form-fields-panel {
            padding: 26px 20px;
          }
          .desktop-roles-grid {
            display: none;
          }
          .icon-dock-container {
            display: block;
          }
          .back-nav-btn {
            top: 14px;
            left: 14px;
            padding: 8px 14px;
            font-size: 0.8rem;
          }
          .reg-title {
            font-size: 1.5rem;
          }
          .form-grid-row {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }

        @media (min-width: 901px) {
          .icon-dock-container {
            display: none;
          }
        }
      `}</style>

      {/* BOTÓN REGRESAR */}
      <button 
        type="button" 
        className="back-nav-btn" 
        onClick={() => navigate("/")}
        title="Regresar al inicio de sesión"
      >
        <ArrowLeft size={18} />
        <span>Volver</span>
      </button>

      {/* ENCABEZADO Y LOGO */}
      <div className="reg-header">
        <img 
          src={backgroundSettings.appLogo || Logo4} 
          alt="Agente Solutions" 
          className="reg-logo"
          onClick={() => navigate("/")}
        />
        <h1 className="reg-title">CREAR CUENTA</h1>
        <p className="reg-subtitle">
          Selecciona tu perfil de usuario y únete al ecosistema de Agente Solutions.
        </p>
      </div>

      {/* PANTALLA DE PENDIENTE DE APROBACIÓN */}
      {isPendingApproval ? (
        <div style={{
          width: '100%',
          maxWidth: '600px',
          padding: '40px 28px',
          textAlign: 'center',
          borderRadius: '24px',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '2px solid #f26522',
          boxShadow: '0 20px 50px rgba(242, 101, 34, 0.3)',
          backdropFilter: 'blur(16px)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(242, 101, 34, 0.15)',
            border: '2px solid #f26522',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto'
          }}>
            <Clock size={42} color="#f26522" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '12px' }}>
            ¡PERFIL EN REVISIÓN!
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: '1.6', marginBottom: '24px' }}>
            Tu registro se ha completado con éxito. Por seguridad de la plataforma, tu cuenta está en la sala de espera y debe ser validada y aprobada por el <strong>Administrador</strong> para habilitar tu acceso.
          </p>
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '14px',
            borderLeft: '4px solid #f26522',
            textAlign: 'left',
            marginBottom: '26px'
          }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#e2e8f0' }}>
              <strong style={{ color: '#f26522' }}>Empresa / Vinculación:</strong> {companyCode || 'Agente Solutions (Matriz Oficial)'}
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#e2e8f0' }}>
              <strong style={{ color: '#f26522' }}>Estado:</strong> <span style={{ color: '#4ade80', fontWeight: 'bold' }}>⏳ Pendiente de Aprobación</span>
            </p>
          </div>
          <button
            type="button"
            className="submit-reg-btn"
            style={{ maxWidth: '300px', margin: '0 auto' }}
            onClick={() => navigate("/")}
          >
            <span>Ir al Inicio de Sesión</span>
            <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <>
          {/* TABS DE CATEGORÍA (AGENTE SOLUTIONS vs AUTÓNOMOS Y RED vs TODOS) */}
          <div className="category-tabs-wrapper">
            <button
              type="button"
              className={`category-tab-btn ${activeCategory === "all" ? "active" : ""}`}
              onClick={() => handleCategoryChange("all")}
            >
              <Layers size={16} />
              <span>Todos ({ROLES_PUBLICOS.length})</span>
            </button>
            <button
              type="button"
              className={`category-tab-btn ${activeCategory === "agente" ? "active" : ""}`}
              onClick={() => handleCategoryChange("agente")}
            >
              <span>🟠 Agente Solutions (2)</span>
            </button>
            <button
              type="button"
              className={`category-tab-btn ${activeCategory === "autonomo" ? "active" : ""}`}
              onClick={() => handleCategoryChange("autonomo")}
            >
              <span>🔵 Autónomos & Red (5)</span>
            </button>
          </div>

          {/* DOCK / SELECTOR DE ICONOS TÁCTIL (MÓVIL & TABLET) */}
          <div className="icon-dock-container">
            <button 
              type="button" 
              className="dock-nav-arrow left"
              onClick={() => handleStepRole(-1)}
              aria-label="Rol anterior"
            >
              <ChevronLeft size={20} />
            </button>

            <div ref={iconDockRef} className="icon-dock-scroll">
              {rolesFiltrados.map((r) => {
                const isActive = r.key === selectedRoleKey;
                return (
                  <div
                    key={r.key}
                    data-role-key={r.key}
                    className={`icon-dock-item ${isActive ? "active" : ""}`}
                    style={{
                      "--active-color": r.color,
                      "--active-color-glow": `${r.color}40`
                    }}
                    onClick={() => handleSelectRole(r.key)}
                  >
                    <div className="dock-icon-circle">
                      {r.icon}
                    </div>
                    <span className="dock-label">{r.shortLabel}</span>
                  </div>
                );
              })}
            </div>

            <button 
              type="button" 
              className="dock-nav-arrow right"
              onClick={() => handleStepRole(1)}
              aria-label="Rol siguiente"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* GRID DE ROLES EN ESCRITORIO */}
          <div className="desktop-roles-grid">
            {rolesFiltrados.map((r) => {
              const isActive = r.key === selectedRoleKey;
              return (
                <div
                  key={r.key}
                  className={`role-card-desktop ${isActive ? "active" : ""}`}
                  style={{
                    "--card-color": r.color,
                    "--card-color-glow": `${r.color}35`
                  }}
                  onClick={() => handleSelectRole(r.key)}
                >
                  <div>
                    <span className="role-card-badge">{r.badge}</span>
                    <h3 className="role-card-title">
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </h3>
                    <p className="role-card-desc">{r.tagline}</p>
                  </div>

                  <button type="button" className="role-card-select-btn">
                    {isActive ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Perfil Seleccionado</span>
                      </>
                    ) : (
                      <>
                        <span>Seleccionar Perfil</span>
                        <ChevronRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* TARJETA PRINCIPAL Y FORMULARIO */}
          <div 
            className="register-form-container"
            style={{
              "--active-role-color": rolActual.color,
              "--active-role-glow": `${rolActual.color}30`
            }}
          >
            <div className="reg-split-layout">
              {/* COLUMNA IZQUIERDA: RESUMEN DEL ROL SELECCIONADO */}
              <div className="role-details-panel">
                <div>
                  <span className="role-detail-header-badge">
                    <span>{rolActual.categoryLabel}</span> • <span>{rolActual.badge}</span>
                  </span>
                  
                  <h2 className="role-detail-title">
                    <span>{rolActual.icon}</span>
                    <span>{rolActual.label}</span>
                  </h2>

                  <p className="role-detail-tagline">{rolActual.tagline}</p>
                  <p className="role-detail-desc">{rolActual.description}</p>

                  <div className="role-features-list">
                    {rolActual.features.map((feat, idx) => (
                      <div key={idx} className="role-feature-item">
                        <CheckCircle2 size={18} className="role-feature-icon" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="trial-pill-box">
                  <Sparkles size={20} color={rolActual.color} style={{ flexShrink: 0 }} />
                  <span>{rolActual.trialInfo}</span>
                </div>
              </div>

              {/* COLUMNA DERECHA: FORMULARIO DE REGISTRO */}
              <div className="form-fields-panel">
                <form onSubmit={handleRegister}>
                  {/* FILA: NOMBRE Y APELLIDOS */}
                  <div className="form-grid-row">
                    <div className="input-wrapper">
                      <label>Nombre(s)</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan"
                        className="custom-reg-input"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                      <User size={18} className="input-icon-left" />
                    </div>

                    <div className="input-wrapper">
                      <label>Apellidos</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Pérez López"
                        className="custom-reg-input"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                      <User size={18} className="input-icon-left" />
                    </div>
                  </div>

                  {/* FILA: CORREO Y TELÉFONO */}
                  <div className="form-grid-row">
                    <div className="input-wrapper">
                      <label>Correo Electrónico</label>
                      <input
                        type="email"
                        required
                        placeholder="ejemplo@correo.com"
                        className="custom-reg-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Mail size={18} className="input-icon-left" />
                    </div>

                    <div className="input-wrapper">
                      <label>Teléfono / WhatsApp</label>
                      <input
                        type="tel"
                        required
                        placeholder="10 dígitos"
                        className="custom-reg-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <Phone size={18} className="input-icon-left" />
                    </div>
                  </div>

                  {/* FILA: CONTRASEÑAS */}
                  <div className="form-grid-row">
                    <div className="input-wrapper">
                      <label>Contraseña</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Mínimo 6 caracteres"
                        className="custom-reg-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ paddingRight: "40px" }}
                      />
                      <Lock size={18} className="input-icon-left" />
                      <button
                        type="button"
                        className="toggle-pw-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="input-wrapper">
                      <label>Confirmar Contraseña</label>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="Repite tu contraseña"
                        className="custom-reg-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{ paddingRight: "40px" }}
                      />
                      <Lock size={18} className="input-icon-left" />
                      <button
                        type="button"
                        className="toggle-pw-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* CAMPO CONDICIONAL: NOMBRE DE EMPRESA (PARA EMPRESARIAL Y CONTRATISTA) */}
                  {(rolActual.roleId === 4 || rolActual.roleId === 6) && (
                    <div className="input-wrapper">
                      <label>Nombre Comercial de tu Empresa / Negocio</label>
                      <input
                        type="text"
                        placeholder="Ej. Mantenimientos del Pacífico S.A."
                        className="custom-reg-input"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                      <Building2 size={18} className="input-icon-left" />
                    </div>
                  )}

                  {/* CAMPO CONDICIONAL: CÓDIGO DE EMPRESA / INVITACIÓN */}
                  {(rolActual.roleId === 3 || rolActual.roleId === 2 || rolActual.roleId === 7) && (
                    <div className="input-wrapper">
                      <label>
                        Código de Empresa / Invitación {rolActual.roleId === 7 ? "(Requerido)" : "(Opcional)"}
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. AUT_123 o código de tu administrador"
                        className="custom-reg-input"
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                      />
                      <Key size={18} className="input-icon-left" />
                    </div>
                  )}

                  {/* SELECTOR DE ESPECIALIDADES (PARA TÉCNICO AGENTE Y TÉCNICO DE LA RED) */}
                  {(rolActual.roleId === 2 || rolActual.roleId === 8) && (
                    <div className="specialties-section">
                      <div className="specialties-title">
                        <Wrench size={15} color="#0284c7" />
                        <span>Selecciona tus Especialidades de Servicio:</span>
                      </div>
                      <div className="specialties-chips-grid">
                        {ESPECIALIDADES_CATALOGO.map((spec) => {
                          const isSelected = selectedSpecialties.includes(spec.name);
                          return (
                            <button
                              key={spec.id}
                              type="button"
                              className={`specialty-chip ${isSelected ? "selected" : ""}`}
                              onClick={() => toggleSpecialty(spec.name)}
                            >
                              <span>{spec.icon}</span>
                              <span>{spec.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* RECAPTCHA */}
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 10px 0' }}>
                    <ReCAPTCHA
                      sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LfHnl4tAAAAAIosLgj18bnFZ4aqpQ0jBXpnJs_Q"}
                      onChange={handleCaptchaChange}
                      theme="dark"
                      size="compact"
                    />
                  </div>

                  {/* MENSAJES DE ERROR / ÉXITO */}
                  {message && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '14px',
                      marginBottom: '14px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      backgroundColor: message.includes('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: message.includes('Error') ? '#fca5a5' : '#86efac',
                      border: message.includes('Error') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                      {message}
                    </div>
                  )}

                  {/* BOTÓN DE REGISTRO */}
                  <button
                    type="submit"
                    className="submit-reg-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span>Procesando registro...</span>
                    ) : (
                      <>
                        <span>{rolActual.cta}</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>

                  {/* ENLACE AL LOGIN */}
                  <div className="login-link-container">
                    <span>¿Ya tienes una cuenta registrada?</span>
                    <span 
                      className="login-link-action"
                      onClick={() => navigate("/")}
                    >
                      Inicia Sesión aquí
                    </span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientRegister;