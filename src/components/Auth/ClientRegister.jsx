import React, { useState, useEffect, useRef } from "react";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Mail, 
  Phone, 
  Building2, 
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
  X,
  ArrowRight
} from "lucide-react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import Logo4 from "../../assets/Logo4.png";
import "../../styles/Auth/LoginAgente.css";

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

// Los 7 roles públicos clasificados exactamente en 2 categorías
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
    description: "Solicita servicios de mantenimiento, reparaciones y soporte técnico directo con la garantía oficial de Agente Solutions.",
    features: [
      "Solicitud de servicios programados y emergencias SOS",
      "Seguimiento en tiempo real con reportes de avance",
      "Aprobación de cotizaciones y pagos seguros"
    ],
    cta: "REGISTRARME",
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
    cta: "REGISTRARME",
    trialInfo: "1 año de suscripción gratuita de bienvenida"
  },

  // ── CATEGORÍA 2: AUTÓNOMOS Y RED (MULTI-TENANT & RED) ──
  {
    key: "owner_personal",
    roleId: 5,
    category: "autonomo",
    categoryLabel: "Autónomos y Red",
    label: "AUTÓNOMO PERSONAL",
    shortLabel: "Aut. Personal",
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
    cta: "REGISTRARME",
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
    cta: "REGISTRARME",
    trialInfo: "6 Meses Gratis de Prueba ($935/mes posterior)"
  },
  {
    key: "admin_propiedades",
    roleId: 7,
    category: "autonomo",
    categoryLabel: "Autónomos y Red",
    label: "ADMIN. PROPIEDADES",
    shortLabel: "Admin. Prop.",
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
    cta: "REGISTRARME",
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
    cta: "REGISTRARME",
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
    cta: "REGISTRARME",
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

  // Estado de navegación de categorías (SOLO 2: 'agente' | 'autonomo')
  const [activeCategory, setActiveCategory] = useState("agente");
  const [selectedRoleKey, setSelectedRoleKey] = useState("client");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados visuales y de estado de carga
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [backgroundSettings, setBackgroundSettings] = useState({ imageUrl: null, colorHex: '#000000', appLogo: null });

  // Referencia para scroll responsivo en dock móvil
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

  // Cargar configuración visual de fondo del login
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`)
      .then(r => { 
        if (r.data.success && r.data.settings) {
          setBackgroundSettings(r.data.settings); 
        }
      })
      .catch(() => {});
  }, []);

  // Filtrar roles según la categoría activa ('agente' o 'autonomo')
  const rolesFiltrados = ROLES_PUBLICOS.filter(r => r.category === activeCategory);
  const rolActual = ROLES_PUBLICOS.find(r => r.key === selectedRoleKey) || ROLES_PUBLICOS[0];

  // Cambiar categoría activa
  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setMessage("");
    const matches = ROLES_PUBLICOS.filter(r => r.category === cat);
    if (matches.length > 0 && !matches.some(m => m.key === selectedRoleKey)) {
      setSelectedRoleKey(matches[0].key);
    }
  };

  // Abrir modal con el rol seleccionado
  const handleOpenRegisterModal = (roleKey) => {
    setSelectedRoleKey(roleKey);
    setMessage("");
    setIsModalOpen(true);
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
    
    if (iconDockRef.current) {
      const targetBtn = iconDockRef.current.querySelector(`[data-role-key="${nextRole.key}"]`);
      if (targetBtn) {
        targetBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  };

  // Manejar selección de especialidades
  const toggleSpecialty = (specName) => {
    setSelectedSpecialties(prev => {
      if (prev.includes(specName)) {
        if (prev.length === 1) return prev;
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
        captcha_token: captchaToken || "from_admin_bypass"
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
      className="main-viewport"
      style={{
        backgroundColor: backgroundSettings.colorHex || '#000000',
        backgroundImage: backgroundSettings.imageUrl ? `url(${backgroundSettings.imageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '30px 15px 60px 15px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: '"Arial Black", sans-serif'
      }}
    >
      {/* CAPA DECORATIVA DE FRANJAS (IGUAL QUE EN LOGIN) */}
      <div className="decoration-layer">
        <div className="stripe-top"></div>
        <div className="stripe-bottom"></div>
        <div className="shape-right"></div>
      </div>

      <style>{`
        /* ── BOTÓN VOLVER ── */
        .back-nav-btn {
          position: fixed;
          top: 30px;
          left: 30px;
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid #f26522;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 50px;
          transition: all 0.25s ease;
          z-index: 100;
          font-weight: 900;
          font-style: italic;
          font-size: 0.95rem;
          box-shadow: 0 4px 15px rgba(242, 101, 34, 0.3);
        }
        .back-nav-btn:hover {
          background: #f26522;
          color: #fff;
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(242, 101, 34, 0.5);
        }

        /* ── ENCABEZADO ── */
        .register-header-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 25px;
          z-index: 10;
        }
        .reg-main-logo {
          max-width: 280px;
          width: 100%;
          height: auto;
          object-fit: contain;
          margin-bottom: 15px;
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6));
          cursor: pointer;
        }
        .reg-main-title {
          color: white;
          font-style: italic;
          font-size: 2.2rem;
          letter-spacing: 2px;
          margin: 0 0 8px 0;
          text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.7);
          font-weight: 900;
        }
        .reg-main-desc {
          color: #cbd5e1;
          font-size: 0.95rem;
          font-weight: normal;
          font-family: system-ui, sans-serif;
          margin: 0;
          max-width: 540px;
        }

        /* ── SELECTOR DE LAS 2 CATEGORÍAS ── */
        .two-category-tabs-container {
          display: flex;
          background: rgba(20, 20, 20, 0.85);
          padding: 6px;
          border-radius: 50px;
          border: 2px solid rgba(242, 101, 34, 0.4);
          margin-bottom: 28px;
          gap: 10px;
          max-width: 560px;
          width: 100%;
          z-index: 10;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
        }
        .two-cat-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 18px;
          border-radius: 40px;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 0.92rem;
          font-weight: 900;
          font-style: italic;
          cursor: pointer;
          transition: all 0.25s ease;
          white-space: nowrap;
        }
        .two-cat-tab-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }
        .two-cat-tab-btn.active {
          background: #f26522;
          color: #fff;
          box-shadow: 0 4px 18px rgba(242, 101, 34, 0.5);
          transform: scale(1.02);
        }

        /* ── DOCK DE ICONOS MÓVIL (< 900px) ── */
        .mobile-icon-dock {
          display: none;
          width: 100%;
          max-width: 500px;
          margin-bottom: 20px;
          position: relative;
          z-index: 10;
        }
        .mobile-dock-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 10px 8px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .mobile-dock-scroll::-webkit-scrollbar {
          display: none;
        }
        .mobile-dock-item {
          flex: 0 0 76px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: rgba(30, 30, 30, 0.85);
          border: 2px solid rgba(255, 255, 255, 0.15);
          padding: 10px 4px 8px 4px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.25s ease;
          scroll-snap-align: center;
        }
        .mobile-dock-item .dock-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
          transition: all 0.25s ease;
        }
        .mobile-dock-item .dock-label {
          font-size: 0.7rem;
          font-weight: 900;
          color: #94a3b8;
          text-align: center;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 70px;
        }
        .mobile-dock-item.active {
          transform: translateY(-4px) scale(1.08);
          background: #111;
          border-color: #f26522;
          box-shadow: 0 8px 20px rgba(242, 101, 34, 0.4);
        }
        .mobile-dock-item.active .dock-label {
          color: #fff;
        }
        .mobile-dock-item.active .dock-icon-circle {
          background: #f26522;
          transform: scale(1.1);
        }
        .dock-arrow-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.85);
          border: 2px solid #f26522;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 15;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
        .dock-arrow-btn.left { left: -14px; }
        .dock-arrow-btn.right { right: -14px; }

        /* ── GRID DE TARJETAS EN ESCRITORIO ── */
        .desktop-cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 22px;
          width: 100%;
          max-width: 1140px;
          z-index: 10;
          margin-bottom: 30px;
        }
        .desktop-role-card {
          background: rgba(20, 20, 20, 0.9);
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.2, 0.9, 0.2, 1);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
          position: relative;
          overflow: hidden;
        }
        .desktop-role-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: #f26522;
        }
        .desktop-role-card:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: #f26522;
          box-shadow: 0 20px 45px rgba(242, 101, 34, 0.3);
          background: rgba(26, 26, 26, 0.98);
        }
        .desktop-role-card.active {
          border-color: #f26522;
          box-shadow: 0 20px 50px rgba(242, 101, 34, 0.45);
          background: #111;
        }
        .role-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 900;
          font-style: italic;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          background: rgba(242, 101, 34, 0.15);
          color: #f26522;
          border: 1px solid rgba(242, 101, 34, 0.4);
          margin-bottom: 12px;
          align-self: flex-start;
        }
        .role-card-heading {
          font-size: 1.35rem;
          font-weight: 900;
          font-style: italic;
          color: #fff;
          margin: 0 0 6px 0;
          display: flex;
          align-items: center;
          gap: 10px;
          letter-spacing: 0.5px;
        }
        .role-card-tagline {
          font-size: 0.88rem;
          color: #f26522;
          font-weight: 900;
          margin-bottom: 10px;
        }
        .role-card-body {
          font-size: 0.88rem;
          color: #cbd5e1;
          font-family: system-ui, sans-serif;
          line-height: 1.45;
          margin-bottom: 16px;
          flex-grow: 1;
        }
        .role-card-features {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
          font-family: system-ui, sans-serif;
          font-size: 0.82rem;
          color: #94a3b8;
        }
        .role-card-feature-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Botón de Selección en Tarjeta */
        .role-select-trigger-btn {
          width: 100%;
          padding: 13px;
          border-radius: 50px;
          border: none;
          background: #f26522;
          color: white;
          font-size: 1.05rem;
          font-weight: 900;
          font-style: italic;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 18px rgba(242, 101, 34, 0.4);
          transition: all 0.2s;
        }
        .role-select-trigger-btn:hover {
          transform: scale(1.03);
          background: #ff7438;
          box-shadow: 0 8px 24px rgba(242, 101, 34, 0.6);
        }

        /* ── VENTANA EMERGENTE (MODAL DE REGISTRO) ── */
        .register-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.88);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(8px);
          padding: 20px;
          box-sizing: border-box;
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .register-modal-card {
          background-color: #1e2229;
          border: 3px solid #f26522;
          border-radius: 24px;
          padding: 32px 28px;
          width: 100%;
          max-width: 560px;
          max-height: 92vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(242, 101, 34, 0.35);
          position: relative;
          box-sizing: border-box;
          animation: popUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popUp {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-close-btn:hover {
          background: #ff4444;
          border-color: #ff4444;
          transform: rotate(90deg);
        }

        .modal-header-box {
          text-align: center;
          margin-bottom: 22px;
          padding-bottom: 15px;
          border-bottom: 1.5px solid rgba(255, 255, 255, 0.1);
        }
        .modal-title {
          color: white;
          font-style: italic;
          font-size: 1.8rem;
          letter-spacing: 1.5px;
          margin: 0 0 6px 0;
          font-weight: 900;
        }
        .modal-subtitle {
          color: #f26522;
          font-size: 0.95rem;
          font-weight: 900;
          font-style: italic;
          margin: 0;
        }

        /* Selector de Especialidades en Modal */
        .modal-specialties-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 15px;
        }
        .modal-specialties-title {
          font-size: 0.85rem;
          color: #94a3b8;
          font-weight: 900;
          font-style: italic;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .modal-specialties-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          max-height: 120px;
          overflow-y: auto;
        }
        .modal-spec-chip {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 900;
          background: #2b313a;
          border: 1.5px solid #444;
          color: #cbd5e1;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s;
        }
        .modal-spec-chip.selected {
          background: rgba(242, 101, 34, 0.25);
          border-color: #f26522;
          color: #fff;
          box-shadow: 0 0 10px rgba(242, 101, 34, 0.35);
        }

        /* ── RESPONSIVO MÓVIL ── */
        @media (max-width: 900px) {
          .desktop-cards-container {
            display: none;
          }
          .mobile-icon-dock {
            display: block;
          }
          .reg-main-title {
            font-size: 1.6rem;
          }
          .back-nav-btn {
            top: 15px;
            left: 15px;
            padding: 8px 14px;
            font-size: 0.85rem;
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
        <span>VOLVER</span>
      </button>

      {/* LOGO Y ENCABEZADO */}
      <div className="register-header-section">
        <img 
          src={backgroundSettings.appLogo || Logo4} 
          alt="Agente Solutions" 
          className="reg-main-logo"
          onClick={() => navigate("/")}
        />
        <h1 className="reg-main-title">REGISTRO DE USUARIOS</h1>
        <p className="reg-main-desc">
          Elige el perfil con el que deseas ingresar a la plataforma.
        </p>
      </div>

      {/* PANTALLA DE PENDIENTE DE APROBACIÓN */}
      {isPendingApproval ? (
        <div style={{
          width: '100%',
          maxWidth: '520px',
          padding: '40px 25px',
          textAlign: 'center',
          borderRadius: '24px',
          backgroundColor: '#1e2229',
          border: '3px solid #f26522',
          boxShadow: '0 15px 40px rgba(242, 101, 34, 0.35)',
          color: '#fff',
          zIndex: 10
        }}>
          <div style={{
            width: '75px',
            height: '75px',
            borderRadius: '50%',
            backgroundColor: 'rgba(242, 101, 34, 0.2)',
            border: '2px solid #f26522',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto'
          }}>
            <Clock size={40} color="#f26522" />
          </div>
          <h2 style={{ fontSize: '1.7rem', color: '#fff', marginBottom: '12px', fontWeight: '900', fontStyle: 'italic' }}>
            ¡PERFIL EN REVISIÓN!
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '22px', fontFamily: 'system-ui, sans-serif' }}>
            Tu registro se ha completado con éxito. Por seguridad, tu cuenta está en la sala de espera y debe ser revisada y autorizada por el <strong>Administrador de tu empresa</strong> para iniciar sesión.
          </p>
          <div style={{
            padding: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            borderLeft: '4px solid #f26522',
            textAlign: 'left',
            marginBottom: '24px',
            fontFamily: 'system-ui, sans-serif'
          }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#eee' }}>
              <strong style={{ color: '#f26522' }}>Empresa / Código:</strong> {companyCode || 'Agente Solutions (Matriz Oficial)'}<br />
              <strong style={{ color: '#f26522' }}>Estado:</strong> <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>⏳ Pendiente de aprobación</span>
            </p>
          </div>
          <button 
            type="button" 
            className="btn-login"
            onClick={() => navigate("/")}
          >
            VOLVER AL INICIO DE SESIÓN
          </button>
        </div>
      ) : (
        <>
          {/* PESTAÑAS: EXACTAMENTE 2 CATEGORÍAS (AGENTE SOLUTIONS vs AUTÓNOMOS Y RED) */}
          <div className="two-category-tabs-container">
            <button
              type="button"
              className={`two-cat-tab-btn ${activeCategory === "agente" ? "active" : ""}`}
              onClick={() => handleCategoryChange("agente")}
            >
              <span>🟠 Agente Solutions (2)</span>
            </button>
            <button
              type="button"
              className={`two-cat-tab-btn ${activeCategory === "autonomo" ? "active" : ""}`}
              onClick={() => handleCategoryChange("autonomo")}
            >
              <span>🔵 Autónomos & Red (5)</span>
            </button>
          </div>

          {/* DOCK / CARRUSEL DE ICONOS MÓVIL (< 900px) */}
          <div className="mobile-icon-dock">
            <button 
              type="button" 
              className="dock-arrow-btn left"
              onClick={() => handleStepRole(-1)}
              aria-label="Rol anterior"
            >
              <ChevronLeft size={20} />
            </button>

            <div ref={iconDockRef} className="mobile-dock-scroll">
              {rolesFiltrados.map((r) => {
                const isActive = r.key === selectedRoleKey;
                return (
                  <div
                    key={r.key}
                    data-role-key={r.key}
                    className={`mobile-dock-item ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedRoleKey(r.key)}
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
              className="dock-arrow-btn right"
              onClick={() => handleStepRole(1)}
              aria-label="Rol siguiente"
            >
              <ChevronRight size={20} />
            </button>

            {/* Tarjeta activa en móvil con botón de abrir ventana emergente */}
            <div style={{ marginTop: '16px' }}>
              <div className="desktop-role-card active" style={{ cursor: 'default' }}>
                <div>
                  <span className="role-badge-pill">{rolActual.badge}</span>
                  <h3 className="role-card-heading">
                    <span>{rolActual.icon}</span>
                    <span>{rolActual.label}</span>
                  </h3>
                  <div className="role-card-tagline">{rolActual.tagline}</div>
                  <p className="role-card-body">{rolActual.description}</p>
                  
                  <div className="role-card-features">
                    {rolActual.features.map((feat, idx) => (
                      <div key={idx} className="role-card-feature-row">
                        <CheckCircle2 size={16} color="#f26522" style={{ flexShrink: 0 }} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="role-select-trigger-btn"
                  onClick={() => handleOpenRegisterModal(rolActual.key)}
                >
                  <span>{rolActual.cta}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* GRID DE TARJETAS EN ESCRITORIO (>= 900px) */}
          <div className="desktop-cards-container">
            {rolesFiltrados.map((r) => {
              const isActive = r.key === selectedRoleKey;
              return (
                <div
                  key={r.key}
                  className={`desktop-role-card ${isActive ? "active" : ""}`}
                  onClick={() => handleOpenRegisterModal(r.key)}
                >
                  <div>
                    <span className="role-badge-pill">{r.badge}</span>
                    <h3 className="role-card-heading">
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </h3>
                    <div className="role-card-tagline">{r.tagline}</div>
                    <p className="role-card-body">{r.description}</p>

                    <div className="role-card-features">
                      {r.features.map((feat, idx) => (
                        <div key={idx} className="role-card-feature-row">
                          <CheckCircle2 size={16} color="#f26522" style={{ flexShrink: 0 }} />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="role-select-trigger-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRegisterModal(r.key);
                    }}
                  >
                    <span>{r.cta}</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* ENLACE AL INICIO DE SESIÓN */}
          <div style={{ zIndex: 10, marginTop: '10px', textAlign: 'center', fontSize: '0.95rem' }}>
            <span style={{ color: '#888' }}>¿Ya tienes una cuenta registrada? </span>
            <span 
              onClick={() => navigate('/')} 
              style={{ color: '#f26522', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
            >
              Inicia sesión aquí
            </span>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              VENTANA EMERGENTE (MODAL DE REGISTRO CON EL DISEÑO DEL LOGIN)
          ══════════════════════════════════════════════════════════════════════ */}
          {isModalOpen && (
            <div 
              className="register-modal-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsModalOpen(false);
              }}
            >
              <div className="register-modal-card">
                {/* BOTÓN CERRAR */}
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsModalOpen(false)}
                  title="Cerrar"
                >
                  <X size={20} />
                </button>

                {/* ENCABEZADO DEL MODAL */}
                <div className="modal-header-box">
                  <img 
                    src={backgroundSettings.appLogo || Logo4} 
                    alt="Agente Solutions" 
                    style={{ width: '150px', marginBottom: '10px', objectFit: 'contain' }} 
                  />
                  <h3 className="modal-title">
                    {rolActual.icon} {rolActual.label}
                  </h3>
                  <p className="modal-subtitle">
                    {rolActual.categoryLabel} • {rolActual.badge}
                  </p>
                </div>

                {/* FORMULARIO ESTILO LOGIN */}
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                  {/* NOMBRE Y APELLIDOS */}
                  <div className="form-row-responsive">
                    <div className="input-group">
                      <User size={20} strokeWidth={2.5} className="input-icon" />
                      <input
                        type="text"
                        placeholder="NOMBRE(S)"
                        className="custom-input"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        style={{ paddingLeft: "55px" }}
                      />
                    </div>
                    <div className="input-group">
                      <User size={20} strokeWidth={2.5} className="input-icon" />
                      <input
                        type="text"
                        placeholder="APELLIDOS"
                        className="custom-input"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        style={{ paddingLeft: "55px" }}
                      />
                    </div>
                  </div>

                  {/* CORREO Y TELÉFONO */}
                  <div className="form-row-responsive">
                    <div className="input-group">
                      <Mail size={20} strokeWidth={2.5} className="input-icon" />
                      <input
                        type="email"
                        placeholder="CORREO ELECTRÓNICO"
                        className="custom-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ paddingLeft: "55px" }}
                      />
                    </div>
                    <div className="input-group">
                      <Phone size={20} strokeWidth={2.5} className="input-icon" />
                      <input
                        type="tel"
                        placeholder="TELÉFONO / WHATSAPP"
                        className="custom-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        style={{ paddingLeft: "55px" }}
                      />
                    </div>
                  </div>

                  {/* CONTRASEÑA Y CONFIRMACIÓN */}
                  <div className="form-row-responsive">
                    <div className="input-group">
                      <Lock size={20} strokeWidth={2.5} className="input-icon" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="CONTRASEÑA"
                        className="custom-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ paddingLeft: "55px" }}
                      />
                      <button 
                        type="button" 
                        className="toggle-password-btn" 
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                      </button>
                    </div>

                    <div className="input-group">
                      <Lock size={20} strokeWidth={2.5} className="input-icon" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="CONFIRMAR CONTRASEÑA"
                        className="custom-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={{ paddingLeft: "55px" }}
                      />
                      <button 
                        type="button" 
                        className="toggle-password-btn" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                      </button>
                    </div>
                  </div>

                  {/* CONDICIONAL: NOMBRE DE EMPRESA (EMPRESARIAL Y CONTRATISTA) */}
                  {(rolActual.roleId === 4 || rolActual.roleId === 6) && (
                    <div className="input-group">
                      <Building2 size={20} strokeWidth={2.5} className="input-icon" />
                      <input
                        type="text"
                        placeholder="NOMBRE DE TU EMPRESA / NEGOCIO"
                        className="custom-input"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        style={{ paddingLeft: "55px" }}
                      />
                    </div>
                  )}

                  {/* CONDICIONAL: CÓDIGO DE EMPRESA (CLIENTE, TÉCNICO AGENTE, ADMIN PROP) */}
                  {(rolActual.roleId === 3 || rolActual.roleId === 2 || rolActual.roleId === 7) && (
                    <div className="input-group">
                      <Key size={20} strokeWidth={2.5} className="input-icon" />
                      <input
                        type="text"
                        placeholder={rolActual.roleId === 7 ? "CÓDIGO DE EMPRESA (OBLIGATORIO)" : "CÓDIGO DE EMPRESA (OPCIONAL)"}
                        className="custom-input"
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                        style={{ paddingLeft: "55px" }}
                      />
                    </div>
                  )}

                  {/* CONDICIONAL: ESPECIALIDADES TÉCNICAS */}
                  {(rolActual.roleId === 2 || rolActual.roleId === 8) && (
                    <div className="modal-specialties-box">
                      <div className="modal-specialties-title">
                        <Wrench size={16} color="#f26522" />
                        <span>ESPECIALIDADES DE SERVICIO:</span>
                      </div>
                      <div className="modal-specialties-grid">
                        {ESPECIALIDADES_CATALOGO.map((spec) => {
                          const isSelected = selectedSpecialties.includes(spec.name);
                          return (
                            <button
                              key={spec.id}
                              type="button"
                              className={`modal-spec-chip ${isSelected ? "selected" : ""}`}
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
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                    <ReCAPTCHA
                      sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LfHnl4tAAAAAIosLgj18bnFZ4aqpQ0jBXpnJs_Q"}
                      onChange={handleCaptchaChange}
                      theme="dark"
                      size="compact"
                    />
                  </div>

                  {/* MENSAJES DE ERROR / ÉXITO */}
                  {message && (
                    <p className={`msg-box ${message.includes("Error") ? "error" : "success"}`}>
                      {message}
                    </p>
                  )}

                  {/* BOTONES DE ACCIÓN */}
                  <button 
                    type="submit" 
                    className="btn-login" 
                    disabled={isLoading}
                    style={{ marginTop: '5px' }}
                  >
                    {isLoading ? "REGISTRANDO..." : "REGISTRAR"}
                  </button>

                  <button 
                    type="button" 
                    className="btn-cancelar"
                    onClick={() => setIsModalOpen(false)}
                  >
                    CANCELAR
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientRegister;