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

  // Estado de categorías (SOLO 2: 'agente' | 'autonomo')
  const [activeCategory, setActiveCategory] = useState("agente");
  const [selectedRoleKey, setSelectedRoleKey] = useState("client");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados de validación y respuesta
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [backgroundSettings, setBackgroundSettings] = useState({ imageUrl: null, colorHex: '#000000', appLogo: null });

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
  const rolActual = ROLES_PUBLICOS.find(r => r.key === selectedRoleKey) || rolesFiltrados[0] || ROLES_PUBLICOS[0];

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

  // Navegar al rol anterior/siguiente
  const handleStepRole = (direction) => {
    const currentIndex = rolesFiltrados.findIndex(r => r.key === selectedRoleKey);
    if (currentIndex === -1) return;
    
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = rolesFiltrados.length - 1;
    if (nextIndex >= rolesFiltrados.length) nextIndex = 0;

    const nextRole = rolesFiltrados[nextIndex];
    setSelectedRoleKey(nextRole.key);
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

  const currentIndex = rolesFiltrados.findIndex(r => r.key === selectedRoleKey);
  const activeRoleIndex = currentIndex !== -1 ? currentIndex : 0;

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
        width: '100vw',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        fontFamily: '"Arial Black", sans-serif',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}
    >
      {/* ── LOGO DE AGENTE SOLUTIONS EN LA MISMA POSICIÓN DEL LOGIN ── */}
      <img 
        src={backgroundSettings.appLogo || Logo4} 
        alt="Agente Solutions" 
        className="logo-top-left"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer', objectFit: 'contain' }}
      />

      {/* ── CAPA DECORATIVA DE FRANJAS (IGUAL QUE EN LOGIN) ── */}
      <div className="decoration-layer">
        <div className="stripe-top"></div>
        <div className="stripe-bottom"></div>
        <div className="shape-right"></div>
      </div>

      <style>{`
        /* ── SECCIÓN DE REGISTRO ALINEADA AL COSTADO DERECHO ── */
        .register-side-section {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          width: 440px;
          margin-right: 7%;
          padding: 20px 0;
          box-sizing: border-box;
        }

        /* ── SELECTOR DE LAS 2 CATEGORÍAS EN CAPSULA ── */
        .side-category-pills {
          display: flex;
          background: rgba(25, 25, 25, 0.9);
          padding: 5px;
          border-radius: 50px;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          gap: 6px;
          width: 100%;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
        }
        .side-cat-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          border-radius: 40px;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 0.82rem;
          font-weight: 900;
          font-style: italic;
          cursor: pointer;
          transition: all 0.25s ease;
          white-space: nowrap;
        }
        .side-cat-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.06);
        }
        .side-cat-btn.active {
          background: #f26522;
          color: #fff;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        /* ── CARRUSEL CON FLECHAS DE NAVEGACIÓN ULTRA VISIBLES ── */
        .role-carousel-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }

        .side-arrow-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #f26522;
          border: 3px solid #ffffff;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 25;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
          transition: all 0.2s ease;
          padding: 0;
        }
        .side-arrow-btn svg {
          width: 32px !important;
          height: 32px !important;
          stroke: #ffffff !important;
          stroke-width: 3.5px !important;
          display: block !important;
        }
        .side-arrow-btn:hover {
          background: #ff7438;
          transform: translateY(-50%) scale(1.12);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.8);
        }
        .side-arrow-btn:active {
          transform: translateY(-50%) scale(0.95);
        }
        .side-arrow-btn.left { left: -24px; }
        .side-arrow-btn.right { right: -24px; }

        /* ── TARJETA DEL USUARIO ACTUAL (LIMPIA SIN RESPLANDOR NARANJA) ── */
        .current-role-card {
          width: 100%;
          background: #181b20;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 24px 22px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.8);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          animation: cardSwap 0.25s ease-out;
        }
        @keyframes cardSwap {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .card-top-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 0.72rem;
          font-weight: 900;
          font-style: italic;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          background: rgba(242, 101, 34, 0.15);
          color: #f26522;
          border: 1px solid rgba(242, 101, 34, 0.4);
          margin-bottom: 10px;
          align-self: flex-start;
        }

        .card-role-title {
          font-size: 1.5rem;
          font-weight: 900;
          font-style: italic;
          color: #fff;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 10px;
          letter-spacing: 0.5px;
        }

        .card-role-tagline {
          font-size: 0.85rem;
          color: #f26522;
          font-weight: 900;
          font-style: italic;
          margin-bottom: 12px;
        }

        .card-role-description {
          font-size: 0.88rem;
          color: #cbd5e1;
          font-family: system-ui, sans-serif;
          line-height: 1.45;
          margin-bottom: 14px;
        }

        .card-features-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 18px;
          font-family: system-ui, sans-serif;
          font-size: 0.82rem;
          color: #94a3b8;
        }
        .card-feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dots-indicator-container {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-bottom: 14px;
        }
        .dot-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.2s;
        }
        .dot-indicator.active {
          width: 22px;
          border-radius: 10px;
          background: #f26522;
        }

        /* ── MODAL EMERGENTE ── */
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
        }

        .register-modal-card {
          background-color: #1e2229;
          border: 3px solid #f26522;
          border-radius: 24px;
          padding: 32px 26px;
          width: 100%;
          max-width: 540px;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(242, 101, 34, 0.35);
          position: relative;
          box-sizing: border-box;
        }

        .modal-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: #e53e3e;
          border: 2px solid #ffffff;
          color: #ffffff;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 30;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
          padding: 0;
        }
        .modal-close-btn svg {
          width: 22px !important;
          height: 22px !important;
          stroke: #ffffff !important;
          stroke-width: 3.5px !important;
          display: block !important;
        }
        .modal-close-btn:hover {
          background: #c53030;
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 6px 16px rgba(229, 62, 62, 0.5);
        }

        .modal-header-box {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1.5px solid rgba(255, 255, 255, 0.1);
        }
        .modal-title {
          color: white;
          font-style: italic;
          font-size: 1.7rem;
          letter-spacing: 1.5px;
          margin: 0 0 4px 0;
          font-weight: 900;
        }
        .modal-subtitle {
          color: #f26522;
          font-size: 0.9rem;
          font-weight: 900;
          font-style: italic;
          margin: 0;
        }

        .modal-specialties-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 12px;
          margin-bottom: 14px;
        }
        .modal-specialties-title {
          font-size: 0.82rem;
          color: #94a3b8;
          font-weight: 900;
          font-style: italic;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .modal-specialties-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          max-height: 110px;
          overflow-y: auto;
        }
        .modal-spec-chip {
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 900;
          background: #2b313a;
          border: 1.5px solid #444;
          color: #cbd5e1;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }
        .modal-spec-chip.selected {
          background: rgba(242, 101, 34, 0.25);
          border-color: #f26522;
          color: #fff;
          box-shadow: 0 0 10px rgba(242, 101, 34, 0.35);
        }

        /* ── RESPONSIVO (< 960px) ── */
        @media (max-width: 960px) {
          .main-viewport {
            justify-content: center !important;
            flex-direction: column !important;
            padding: 20px 15px 40px 15px !important;
          }
          .logo-top-left {
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            margin: 20px auto 30px auto !important;
            display: block !important;
            width: 240px !important;
            transform: scale(1.6) !important;
            transform-origin: top center !important;
          }
          .register-side-section {
            margin-right: 0 !important;
            width: 100% !important;
            max-width: 420px !important;
          }
        }
      `}</style>

      {/* ── SECCIÓN DE REGISTRO LATERAL DERECHA (IGUAL QUE EN EL LOGIN) ── */}
      <div className="register-side-section">
        <h2 className="form-title">REGISTRO</h2>

        {isPendingApproval ? (
          <div style={{
            width: '100%',
            textAlign: 'center',
            backgroundColor: '#1e2229',
            borderRadius: '24px',
            padding: '30px 20px',
            border: '2px solid #f26522',
            color: '#fff',
            boxShadow: '0 15px 35px rgba(242, 101, 34, 0.3)',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              backgroundColor: 'rgba(242, 101, 34, 0.2)',
              border: '2px solid #f26522',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Clock size={36} color="#f26522" />
            </div>
            <h3 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '10px', fontWeight: '900', fontStyle: 'italic' }}>
              ¡PERFIL EN REVISIÓN!
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '18px', fontFamily: 'system-ui, sans-serif' }}>
              Tu registro se ha completado. Tu cuenta debe ser autorizada por el <strong>Administrador</strong> para poder iniciar sesión.
            </p>
            <button 
              type="button" 
              className="btn-login"
              onClick={() => navigate('/')}
            >
              VOLVER AL LOGIN
            </button>
          </div>
        ) : (
          <>
            {/* ── PESTAÑAS: EXACTAMENTE 2 CATEGORÍAS ── */}
            <div className="side-category-pills">
              <button
                type="button"
                className={`side-cat-btn ${activeCategory === "agente" ? "active" : ""}`}
                onClick={() => handleCategoryChange("agente")}
              >
                <span>🟠 Agente Solutions (2)</span>
              </button>
              <button
                type="button"
                className={`side-cat-btn ${activeCategory === "autonomo" ? "active" : ""}`}
                onClick={() => handleCategoryChange("autonomo")}
              >
                <span>🔵 Autónomos & Red (5)</span>
              </button>
            </div>

            {/* ── CARRUSEL CON FLECHAS Y TARJETA DEL USUARIO ── */}
            <div className="role-carousel-wrapper">
              {/* FLECHA ANTERIOR */}
              <button
                type="button"
                className="side-arrow-btn left"
                onClick={() => handleStepRole(-1)}
                title="Usuario anterior"
                aria-label="Usuario anterior"
              >
                <ChevronLeft size={32} strokeWidth={3.5} color="#ffffff" />
              </button>

              {/* TARJETA DEL USUARIO SELECCIONADO */}
              <div className="current-role-card">
                <span className="card-top-badge">{rolActual.badge}</span>
                <h3 className="card-role-title">
                  <span>{rolActual.icon}</span>
                  <span>{rolActual.label}</span>
                </h3>
                <div className="card-role-tagline">{rolActual.tagline}</div>
                <p className="card-role-description">{rolActual.description}</p>

                <div className="card-features-box">
                  {rolActual.features.map((feat, idx) => (
                    <div key={idx} className="card-feature-item">
                      <CheckCircle2 size={16} color="#f26522" style={{ flexShrink: 0 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* INDICADORES DE PUNTOS */}
                <div className="dots-indicator-container">
                  {rolesFiltrados.map((r, idx) => (
                    <div
                      key={r.key}
                      className={`dot-indicator ${idx === activeRoleIndex ? "active" : ""}`}
                    />
                  ))}
                </div>

                {/* BOTÓN REGISTRARME */}
                <button
                  type="button"
                  className="btn-login"
                  onClick={() => handleOpenRegisterModal(rolActual.key)}
                >
                  <span>{rolActual.cta}</span>
                  <ArrowRight size={20} style={{ marginLeft: "8px", verticalAlign: "middle" }} />
                </button>
              </div>

              {/* FLECHA SIGUIENTE */}
              <button
                type="button"
                className="side-arrow-btn right"
                onClick={() => handleStepRole(1)}
                title="Siguiente usuario"
                aria-label="Siguiente usuario"
              >
                <ChevronRight size={32} strokeWidth={3.5} color="#ffffff" />
              </button>
            </div>

            {/* ENLACES INFERIORES */}
            <div style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '6px' }}>
              <span style={{ color: '#888' }}>¿Ya tienes una cuenta? </span>
              <span 
                onClick={() => navigate('/')} 
                style={{ color: '#FF6600', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
              >
                Inicia sesión aquí
              </span>
            </div>
          </>
        )}
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
              title="Cerrar ventana"
              aria-label="Cerrar ventana"
            >
              <X size={22} color="#ffffff" strokeWidth={3.5} />
            </button>

            {/* ENCABEZADO DEL MODAL */}
            <div className="modal-header-box">
              <img 
                src={backgroundSettings.appLogo || Logo4} 
                alt="Agente Solutions" 
                style={{ width: '140px', marginBottom: '8px', objectFit: 'contain' }} 
              />
              <h3 className="modal-title">
                {rolActual.icon} {rolActual.label}
              </h3>
              <p className="modal-subtitle">
                {rolActual.categoryLabel} • {rolActual.badge}
              </p>
            </div>

            {/* FORMULARIO ESTILO LOGIN */}
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
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

              {/* RECAPTCHA ESTILIZADO HORIZONTAL */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', margin: '8px 0' }}>
                <div style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.5)',
                  border: '1.5px solid rgba(242, 101, 34, 0.4)',
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: '#222'
                }}>
                  <ReCAPTCHA
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LfHnl4tAAAAAIosLgj18bnFZ4aqpQ0jBXpnJs_Q"}
                    onChange={handleCaptchaChange}
                    theme="dark"
                    size="normal"
                  />
                </div>
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
                style={{ marginTop: '4px' }}
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
    </div>
  );
};

export default ClientRegister;