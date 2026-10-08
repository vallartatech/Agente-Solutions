import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/Auth/LoginAgente.css";
import { useAuth } from "../../context/AuthContext";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Globe,
  Building2,
  KeyRound,
  User,
  Phone,
  Sparkles,
  X
} from "lucide-react";
import Logo4 from "../../assets/Logo4.png";
import LoginArtwork from "../../assets/Atardecer.png";

// Catálogo de roles públicos clasificados en 2 categorías
const ROLES_PUBLICOS = [
  // ── CATEGORÍA 1: CLIENTES (1) ──
  {
    key: "market_client_personal",
    roleId: 4,
    category: "agente",
    categoryLabel: "Clientes (1)",
    label: "CLIENTE PARTICULAR",
    shortLabel: "Cliente",
    badge: "PROPIETARIO / RED",
    icon: "🏡",
    color: "#3b82f6",
    tagline: "Publica necesidades y recibe cotizaciones tipo Uber",
    description: "Ideal para propietarios que desean cotizaciones competitivas en tiempo real de técnicos y contratistas calificados de la red.",
    features: [
      "Publica necesidades y obtén propuestas, cotizaciones y tiempo compromiso de cumplimiento.",
      "Recepción de ofertas y chat directos con técnicos.",
      "Opción de delegar administración a gestores administrativos.",
      "Historial de trabajos, cotizaciones, conversaciones y reportes fotográficos en la nube."
    ],
    cta: "REGISTRARME COMO CLIENTE",
    trialInfo: "6 Meses Gratis de Prueba ($299/mes posterior)"
  },

  // ── CATEGORÍA 2: PROVEEDORES (2) ──
  {
    key: "market_tech_independent",
    roleId: 6,
    category: "autonomo",
    categoryLabel: "Proveedores (2)",
    label: "TÉCNICO INDEPENDIENTE",
    shortLabel: "Técnico Freelance",
    badge: "MARKETPLACE ABIERTO",
    icon: "🧑‍🔧",
    color: "#ec4899",
    tagline: "Gana trabajos en el mapa en vivo tipo Uber",
    description: "Profesionales y especialistas independientes que ofrecen sus servicios en la red abierta y cotizan trabajos disponibles.",
    features: [
      "Acceso al mapa en vivo de trabajos disponibles",
      "Perfil público con calificaciones e insignias ⭐",
      "1 año completo de suscripción gratuita de bienvenida"
    ],
    cta: "REGISTRARME COMO INDEPENDIENTE",
    trialInfo: "1 año de membresía gratuita sin costo"
  },
  {
    key: "market_contractor",
    roleId: 7,
    category: "autonomo",
    categoryLabel: "Proveedores (2)",
    label: "CONTRATISTA / LÍDER",
    shortLabel: "Contratista",
    badge: "LÍDER DE CUADRILLA",
    icon: "🏗️",
    color: "#0d9488",
    tagline: "Maneja cuadrillas y asigna trabajos ganados",
    description: "Contratistas y empresas con equipo de trabajo que cotizan en la red y asignan las órdenes ganadas a los miembros de su cuadrilla.",
    features: [
      "Gestión y vinculación de técnicos de cuadrilla",
      "Cotiza en la red y asigna trabajos a tu equipo",
      "Supervisión y control de ingresos de la cuadrilla"
    ],
    cta: "REGISTRARME COMO CONTRATISTA",
    trialInfo: "6 Meses Gratis de Prueba ($935/mes posterior)"
  }
];

const WELCOME_SLIDES = [
  {
    badge: " PLATAFORMA",
    title: "RESOLVIENDO TUS NECESIDADES EN MANTENIMIENTO",
    subtitle: "Conecta con clientes, gestores inmobiliarios, contratistas y especialistas en tiempo real.",
  },
  {
    badge: "GESTORÍA INMOBILIARIA & OBRAS",
    title: "GESTIONA TODO EN UN SOLO LUGAR:",
    subtitle: "Convierte en proveedor de nuestro ecosistema y ten acceso sin límites a toda nuestra cartera de clientes que solicita trabajos en una red de necesidades. Encuentra un espacio para trabajar de manera independiente donde el límite de ingreso lo ponés tu.",
  },
  {
    badge: "MERCADO EN VIVO & CUADRILLAS",
    title: "IMPULSA TU CRECIMIENTO",
    subtitle: "Gana trabajos en el mapa en vivo, gestiona tus ingresos y únete a nuestra red profesional.",
  }
];

const LoginAgente = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user, loginGlobal } = useAuth();

  // Welcome / Onboarding Intro Screen State
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeSlide, setWelcomeSlide] = useState(0);
  const [welcomeTouchStartX, setWelcomeTouchStartX] = useState(null);

  const handleWelcomeTouchStart = (e) => {
    setWelcomeTouchStartX(e.touches[0].clientX);
  };

  const handleWelcomeTouchEnd = (e) => {
    if (welcomeTouchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - welcomeTouchStartX;
    if (deltaX < -40) {
      if (welcomeSlide < WELCOME_SLIDES.length - 1) {
        setWelcomeSlide((prev) => prev + 1);
      }
    } else if (deltaX > 40) {
      if (welcomeSlide > 0) {
        setWelcomeSlide((prev) => prev - 1);
      }
    }
    setWelcomeTouchStartX(null);
  };

  // Sliding Auth Panel State (false = Login, true = Register)
  const [isSignUp, setIsSignUp] = useState(false);

  // Role Explorer State (when true, card slides to the left and role carousel appears on the right)
  const [showRoleExplorer, setShowRoleExplorer] = useState(false);
  const [activeCategory, setActiveCategory] = useState("agente");
  const [selectedRoleKey, setSelectedRoleKey] = useState("market_client_personal");
  const [slideDirection, setSlideDirection] = useState("next"); // 'next' | 'prev'

  // Registration Form States
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regMessage, setRegMessage] = useState("");

  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [recoverStep, setRecoverStep] = useState(1);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverNewPassword, setRecoverNewPassword] = useState("");
  const [recoverConfirmPassword, setRecoverConfirmPassword] = useState("");
  const [showRecoverPassword, setShowRecoverPassword] = useState(false);
  const [showRecoverConfirm, setShowRecoverConfirm] = useState(false);
  const [recoverMessage, setRecoverMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Estados para Sala de Espera / Vinculación
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [requiresLink, setRequiresLink] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [companyCode, setCompanyCode] = useState("");

  // Variables para personalizar el Login
  const [backgroundSettings, setBackgroundSettings] = useState({ imageUrl: null, colorHex: '#0b0c10', appLogo: null });
  const [selectedTenant, setSelectedTenant] = useState(null);

  // Mobile Bottom Sheet Swipe / Collapse State
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const [cardTouchStartX, setCardTouchStartX] = useState(null);

  const handleCardTouchStart = (e) => {
    setCardTouchStartX(e.touches[0].clientX);
  };

  const handleCardTouchEnd = (e) => {
    if (cardTouchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - cardTouchStartX;
    if (deltaX > 35) {
      handleStepRole(-1);
    } else if (deltaX < -35) {
      handleStepRole(1);
    }
    setCardTouchStartX(null);
  };

  // Keyboard navigation for Role Explorer (Arrow Left / Right, Escape)
  useEffect(() => {
    if (!showRoleExplorer) return;
    const handleRoleExplorerKeyDown = (e) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        handleStepRole(-1);
      } else if (e.key === 'ArrowRight') {
        handleStepRole(1);
      } else if (e.key === 'Escape') {
        setShowRoleExplorer(false);
      }
    };
    window.addEventListener('keydown', handleRoleExplorerKeyDown);
    return () => window.removeEventListener('keydown', handleRoleExplorerKeyDown);
  }, [showRoleExplorer, activeCategory, selectedRoleKey]);

  const handleSheetTouchStart = (e) => {
    if (window.innerWidth > 820) return;
    // Don't intercept touches on interactive form controls
    if (e.target.closest('input, textarea, select, button, a, .aiw-role-item, .aiw-category-btn')) return;
    setTouchStartY(e.touches[0].clientY);
  };

  const handleSheetTouchMove = (e) => {
    if (!touchStartY || window.innerWidth > 820) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY;
    if (!isSheetCollapsed && deltaY > 0) {
      setDragOffsetY(Math.min(deltaY, 320));
    } else if (isSheetCollapsed && deltaY < 0) {
      setDragOffsetY(Math.max(deltaY, -320));
    }
  };

  const handleSheetTouchEnd = () => {
    if (window.innerWidth > 820) return;
    if (!isSheetCollapsed && dragOffsetY > 55) {
      setIsSheetCollapsed(true);
    } else if (isSheetCollapsed && dragOffsetY < -45) {
      setIsSheetCollapsed(false);
      setShowRoleExplorer(false);
    }
    setDragOffsetY(0);
    setTouchStartY(null);
  };

  // Filtrado de roles según la categoría activa
  const rolesFiltrados = ROLES_PUBLICOS.filter(r => r.category === activeCategory);
  const rolActual = ROLES_PUBLICOS.find(r => r.key === selectedRoleKey) || rolesFiltrados[0] || ROLES_PUBLICOS[0];

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSlideDirection("next");
    const matches = ROLES_PUBLICOS.filter(r => r.category === cat);
    if (matches.length > 0 && !matches.some(m => m.key === selectedRoleKey)) {
      setSelectedRoleKey(matches[0].key);
    }
  };

  const handleStepRole = (direction) => {
    setSlideDirection(direction > 0 ? "next" : "prev");
    const currentIndex = rolesFiltrados.findIndex(r => r.key === selectedRoleKey);
    if (currentIndex === -1) return;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = rolesFiltrados.length - 1;
    if (nextIndex >= rolesFiltrados.length) nextIndex = 0;
    setSelectedRoleKey(rolesFiltrados[nextIndex].key);
  };

  const handleDotClick = (rKey, targetIndex) => {
    const currentIndex = rolesFiltrados.findIndex(r => r.key === selectedRoleKey);
    setSlideDirection(targetIndex >= currentIndex ? "next" : "prev");
    setSelectedRoleKey(rKey);
  };

  const handleSelectRoleFromExplorer = (role) => {
    setSelectedRoleKey(role.key);
    setShowRoleExplorer(false);
    setIsSheetCollapsed(false);
    setIsSignUp(true);
    setRegMessage(`✅ Rol seleccionado: ${role.label}`);
    setTimeout(() => setRegMessage(""), 3000);
  };

  const handleTopBack = () => {
    if (showRoleExplorer && !isSignUp) {
      setShowRoleExplorer(false);
      return;
    }
    if (isSignUp) {
      // Si estamos en Registro, volver a Iniciar Sesión
      setIsSignUp(false);
      setShowRoleExplorer(false);
      setIsSheetCollapsed(false);
      setMensaje("");
      setRegMessage("");
    } else {
      // Si estamos en Iniciar Sesión, volver a la pantalla de Bienvenida
      setShowWelcome(true);
      setShowRoleExplorer(false);
      setIsSheetCollapsed(false);
      setMensaje("");
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("agente_tenant_selected");
    if (saved) {
      try { setSelectedTenant(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  // 1. AUTO-LOGIN: Si ya existe sesión, redirigir según el rol
  useEffect(() => {
    if (user) {
      const role = Number(user.role_id);
      if (role === 0 || role === 1) navigate("/VistaRoot");
      else if (role === 4 || role === 5 || role === 7) navigate("/VistaMarket");
      else if (role === 2) navigate("/VistaTecnico");
      else if (role === 6 || role === 8) navigate("/mercado-trabajos");
      else if (role === 3) navigate("/propiedades");
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`);
        if (response.data.success) {
          setBackgroundSettings(response.data.settings);
        }
      } catch (error) {
        console.error("Error al cargar configuraciones visuales:", error);
        setBackgroundSettings({ imageUrl: null, colorHex: '#0b0c10', appLogo: null });
      }
    };
    fetchSettings();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje("");
    setIsLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/login`, {
        email: email,
        password: password
      });

      const { token, user } = res.data;

      localStorage.setItem('agente_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const {
        id,
        first_name,
        last_name,
        email: emailDb,
        phone_number,
        birth_date,
        role_id,
        profile_picture,
        cover_picture,
        created_at
      } = user;

      loginGlobal({
        id,
        first_name,
        last_name,
        email: emailDb,
        phone_number,
        birth_date,
        role_id,
        profile_picture,
        cover_picture,
        created_at
      });

      setIsLoading(false);
      // Redirecciones y mensajes personalizados según el rol
      const roleNum = Number(role_id);
      if (roleNum === 0) {
        setMensaje(`¡Bienvenido ROOT ${first_name}! Entrando al panel principal...`);
        setTimeout(() => navigate("/VistaRoot"), 1000);
      } else if (roleNum === 1) {
        setMensaje(`¡Bienvenido ADMIN ${first_name}! Entrando al panel...`);
        setTimeout(() => navigate("/VistaRoot"), 1000);
      } else if (roleNum === 2) {
        setMensaje(`¡Bienvenido TÉCNICO INTERNO ${first_name}! Abriendo tu panel de trabajo...`);
        setTimeout(() => navigate("/VistaTecnico"), 1000);
      } else if (roleNum === 3) {
        setMensaje(`¡Bienvenido CLIENTE ${first_name}! Abriendo tu portal...`);
        setTimeout(() => navigate("/propiedades"), 1000);
      } else if (roleNum === 4) {
        setMensaje(`¡Bienvenido CLIENTE PARTICULAR ${first_name}! Entrando a Agente Market...`);
        setTimeout(() => navigate("/VistaMarket"), 1000);
      } else if (roleNum === 5) {
        setMensaje(`¡Bienvenido GESTOR INMOBILIARIO ${first_name}! Entrando al panel de gestión...`);
        setTimeout(() => navigate("/VistaMarket"), 1000);
      } else if (roleNum === 6) {
        setMensaje(`¡Bienvenido TÉCNICO INDEPENDIENTE ${first_name}! Abriendo el Mercado de Trabajos...`);
        setTimeout(() => navigate("/mercado-trabajos"), 1000);
      } else if (roleNum === 7) {
        setMensaje(`¡Bienvenido CONTRATISTA ${first_name}! Entrando al panel de cuadrillas...`);
        setTimeout(() => navigate("/VistaMarket"), 1000);
      } else if (roleNum === 8) {
        setMensaje(`¡Bienvenido TÉCNICO DE CUADRILLA ${first_name}! Abriendo el Mercado de Trabajos...`);
        setTimeout(() => navigate("/mercado-trabajos"), 1000);
      } else {
        setMensaje(`Error: Tu usuario (Rol ${roleNum}) no tiene permisos válidos.`);
      }

    } catch (error) {
      setIsLoading(false);
      console.log("Error en el login:", error);

      if (error.response) {
        if (error.response.status === 403) {
          if (error.response.data?.status === 'pending') {
            setIsPendingApproval(true);
            setRequiresLink(false);
            return;
          }
          if (error.response.data?.status === 'pending_link') {
            setIsPendingApproval(true);
            setRequiresLink(true);
            setPendingUserId(error.response.data.user_id);
            return;
          }
          if (error.response.data?.blocked && error.response.data?.tenant_id) {
            navigate(`/activacion-cuenta?tenant_id=${error.response.data.tenant_id}`);
            return;
          }
          setMensaje(`Error: ${error.response.data.error || error.response.data.message || 'Acceso denegado.'}`);
        } else if (error.response.status === 401) {
          setMensaje(`Error: ${error.response.data?.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.'}`);
        } else if (error.response.status === 422) {
          setMensaje(`Error: ${error.response.data?.message || 'Datos de inicio de sesión incompletos.'}`);
        } else {
          const serverMsg = error.response.data?.message || error.response.data?.error || (typeof error.response.data === 'string' ? error.response.data : null);
          setMensaje(`Error: ${serverMsg || 'Credenciales incorrectas o error en el servidor.'}`);
        }
      } else {
        setMensaje("Error: Servidor no disponible. Revisa tu conexión.");
      }
    }
  };

  const handleLinkCompany = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje("");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/vincular-empresa`, {
        user_id: pendingUserId,
        company_code: companyCode
      });
      setIsLoading(false);
      if (res.data.success) {
        setRequiresLink(false);
      }
    } catch (err) {
      setIsLoading(false);
      setMensaje(err.response?.data?.message || 'Error al vincular código.');
    }
  };

  const openRecoverModal = () => {
    setRecoverEmail(email ? email.trim() : "");
    setRecoverNewPassword("");
    setRecoverConfirmPassword("");
    setRecoverMessage("");
    setRecoverStep(1);
    setIsRecoverModalOpen(true);
  };

  const handleStep1Submit = (e) => {
    if (e) e.preventDefault();
    setRecoverMessage("");
    if (!recoverEmail || !recoverEmail.trim()) {
      setRecoverMessage("Error: Por favor ingresa tu correo registrado.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoverEmail.trim())) {
      setRecoverMessage("Error: Por favor ingresa un correo electrónico válido.");
      return;
    }
    setRecoverStep(2);
  };

  const handleRecoverPasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    setRecoverMessage("");

    if (!recoverNewPassword || recoverNewPassword.length < 4) {
      setRecoverMessage("Error: La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    if (recoverNewPassword !== recoverConfirmPassword) {
      setRecoverMessage("Error: Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/reset-password`, {
        email: recoverEmail.trim(),
        password: recoverNewPassword,
        password_confirmation: recoverConfirmPassword,
        token: "direct_reset"
      });

      setIsLoading(false);
      setRecoverMessage(`✅ ${res.data?.message || "¡Contraseña actualizada exitosamente!"}`);

      // Auto completar los campos del login principal
      setEmail(recoverEmail.trim());
      setPassword(recoverNewPassword);
      setMensaje("✨ ¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.");

      setTimeout(() => {
        setIsRecoverModalOpen(false);
        setRecoverStep(1);
        setRecoverNewPassword("");
        setRecoverConfirmPassword("");
        setRecoverMessage("");
      }, 1500);

    } catch (error) {
      setIsLoading(false);
      console.error("Error al restablecer contraseña:", error);
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "No encontramos ninguna cuenta con este correo electrónico.";
      setRecoverMessage(`Error: ${errMsg}`);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegMessage("");

    if (regPassword.length < 6) {
      setRegMessage("Error: La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegMessage("Error: Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        first_name: regFirstName.trim(),
        last_name: regLastName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone_number: regPhone.trim(),
        password: regPassword,
        role_id: rolActual?.roleId || 3,
        captcha_token: "from_admin_bypass"
      };

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/registro-usuario`, payload);
      setIsLoading(false);

      setRegMessage("¡Cuenta creada con éxito! Transfiriendo al inicio de sesión...");

      setTimeout(() => {
        setEmail(regEmail);
        setPassword(regPassword);
        setIsSignUp(false);
        setRegMessage("");
        setMensaje("✨ ¡Registro exitoso! Ya puedes iniciar sesión con tu nueva cuenta.");
      }, 1600);

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
      setRegMessage(`Error: ${errorMsg}`);
    }
  };

  return (
    <div
      className={`aiw-viewport ${showRoleExplorer ? "aiw-roles-view-left" : ""} ${showWelcome ? "aiw-welcome-active" : ""}`}
      style={{
        backgroundColor: backgroundSettings.colorHex || '#0b0c10'
      }}
    >
      {/* Background sunset layer on the right */}
      <div
        className="aiw-bg-art-layer"
        style={{
          backgroundImage: `url(${backgroundSettings.imageUrl || LoginArtwork})`
        }}
      ></div>
      {/* Background gradient fade to dark on the left */}
      <div className="aiw-bg-fade-overlay"></div>

      {/* Background ambient glow effect */}
      <div className="aiw-ambient-glow"></div>

      {/* === ONBOARDING / WELCOME SCREEN (Shown before opening login/register) === */}
      {showWelcome && (
        <div
          className="aiw-welcome-screen"
          onTouchStart={handleWelcomeTouchStart}
          onTouchEnd={handleWelcomeTouchEnd}
        >
          {/* Top Bar with Saltar button pinned to top right */}
          <div className="aiw-welcome-topbar">
            <button
              type="button"
              className="aiw-welcome-skip-btn"
              onClick={() => setShowWelcome(false)}
            >
              Saltar
            </button>
          </div>

          {/* Hero Content */}
          <div className="aiw-welcome-body">
            {/* Logo de la empresa centrado arriba del texto */}
            <div className="aiw-welcome-brand-center">
              <img
                src={backgroundSettings.appLogo || Logo4}
                alt="Agente Solutions"
                className="aiw-welcome-logo-center"
              />
            </div>

            <div className="aiw-welcome-badge">
              <Sparkles size={14} className="aiw-welcome-badge-icon" />
              <span>{WELCOME_SLIDES[welcomeSlide].badge}</span>
            </div>

            <h1 className="aiw-welcome-title">
              {WELCOME_SLIDES[welcomeSlide].title}
            </h1>

            <p className="aiw-welcome-desc">
              {WELCOME_SLIDES[welcomeSlide].subtitle}
            </p>

            {/* Pagination Indicator Dots */}
            <div className="aiw-welcome-dots">
              {WELCOME_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`aiw-welcome-dot ${idx === welcomeSlide ? "active" : ""}`}
                  onClick={() => setWelcomeSlide(idx)}
                  aria-label={`Ir a slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Bottom Action Button */}
          <div className="aiw-welcome-footer">
            <button
              type="button"
              className="aiw-welcome-continue-btn"
              onClick={() => {
                if (welcomeSlide < WELCOME_SLIDES.length - 1) {
                  setWelcomeSlide(prev => prev + 1);
                } else {
                  setShowWelcome(false);
                }
              }}
            >
              <span>{welcomeSlide === WELCOME_SLIDES.length - 1 ? "Comenzar" : "Continuar"}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Back button at top-left outside of the card */}
      {!showWelcome && (
        <button
          type="button"
          className="aiw-top-back-btn"
          onClick={handleTopBack}
          title={isSignUp ? "Volver al inicio de sesión" : "Volver a la pantalla de bienvenida"}
          aria-label="Volver"
        >
          <ArrowLeft size={19} strokeWidth={2.5} />
          <span>Volver</span>
        </button>
      )}

      {/* Main Split Layout Container */}
      <div className={`aiw-page-container ${showRoleExplorer ? "aiw-roles-expanded" : ""} ${showWelcome ? "aiw-hide-auth-page" : "aiw-show-auth-page"}`}>

        {/* LEFT HERO SECTION: Large Company Logo */}
        <div className="aiw-hero-left">
          <div className="aiw-hero-logo-box">
            <img
              src={backgroundSettings.appLogo || Logo4}
              alt="Agente Solutions - Resolviendo tus necesidades"
              className="aiw-hero-logo-img"
            />
          </div>

          {/* MOBILE FLOATING ROLE CAROUSEL (Visible on mobile when sheet is collapsed on register) */}
          {isSignUp && isSheetCollapsed && (
            <div className="aiw-mobile-floating-carousel">
              {/* Category selector buttons */}
              <div className="aiw-mcarousel-cat-row">
                <button
                  type="button"
                  className={`aiw-mcarousel-cat-btn ${activeCategory === "agente" ? "active" : ""}`}
                  onClick={() => handleCategoryChange("agente")}
                >
                  Clientes ({ROLES_PUBLICOS.filter(r => r.category === 'agente').length})
                </button>
                <button
                  type="button"
                  className={`aiw-mcarousel-cat-btn ${activeCategory === "autonomo" ? "active" : ""}`}
                  onClick={() => handleCategoryChange("autonomo")}
                >
                  Proveedores ({ROLES_PUBLICOS.filter(r => r.category === 'autonomo').length})
                </button>
              </div>

              {/* 3D Coverflow Perspective Stage (Swipeable with finger) */}
              <div className="aiw-mcarousel-track">
                <div
                  className="aiw-coverflow-stage"
                  onTouchStart={handleCardTouchStart}
                  onTouchEnd={handleCardTouchEnd}
                >
                  {rolesFiltrados.map((r, i) => {
                    const activeIndex = rolesFiltrados.findIndex(rf => rf.key === selectedRoleKey);
                    const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;
                    const diff = i - safeActiveIndex;
                    const isCenter = diff === 0;

                    let transform = "";
                    let zIndex = 1;
                    let opacity = 0;
                    let pointerEvents = "none";

                    if (isCenter) {
                      transform = "translateX(0) scale(1) translateZ(0)";
                      zIndex = 10;
                      opacity = 1;
                      pointerEvents = "auto";
                    } else if (diff === -1) {
                      transform = "translateX(-80px) scale(0.86) rotateY(12deg)";
                      zIndex = 6;
                      opacity = 0.65;
                      pointerEvents = "auto";
                    } else if (diff === 1) {
                      transform = "translateX(80px) scale(0.86) rotateY(-12deg)";
                      zIndex = 6;
                      opacity = 0.65;
                      pointerEvents = "auto";
                    } else if (diff === -2) {
                      transform = "translateX(-140px) scale(0.72) rotateY(20deg)";
                      zIndex = 3;
                      opacity = 0.3;
                      pointerEvents = "auto";
                    } else if (diff === 2) {
                      transform = "translateX(140px) scale(0.72) rotateY(-20deg)";
                      zIndex = 3;
                      opacity = 0.3;
                      pointerEvents = "auto";
                    } else {
                      transform = `translateX(${diff > 0 ? 170 : -170}px) scale(0.6)`;
                      zIndex = 1;
                      opacity = 0;
                      pointerEvents = "none";
                    }

                    return (
                      <div
                        key={r.key}
                        className={`aiw-coverflow-card ${isCenter ? "active-center" : "flanking"}`}
                        style={{
                          transform,
                          zIndex,
                          opacity,
                          pointerEvents,
                          borderColor: isCenter ? r.color : `${r.color}55`,
                          boxShadow: isCenter
                            ? `0 22px 50px rgba(0, 0, 0, 0.9), 0 0 28px ${r.color}35`
                            : `0 10px 25px rgba(0, 0, 0, 0.6)`
                        }}
                        onClick={() => {
                          if (!isCenter) {
                            handleDotClick(r.key, i);
                          } else {
                            handleSelectRoleFromExplorer(r);
                          }
                        }}
                      >
                        {/* Top Header Badge */}
                        <div className="aiw-cf-top-row">
                          <span
                            className="aiw-cf-badge"
                            style={{
                              borderColor: `${r.color}66`,
                              color: r.color,
                              background: `${r.color}18`
                            }}
                          >
                            {r.badge}
                          </span>
                          <span className="aiw-cf-category-tag">
                            {r.category === 'agente' ? 'MATRIZ OFICIAL' : 'RED DE TRABAJO'}
                          </span>
                        </div>

                        {/* Full Role Information */}
                        <div className="aiw-cf-info">
                          <h3 className="aiw-cf-title">{r.label}</h3>
                          <p className="aiw-cf-tagline" style={{ color: r.color }}>{r.tagline}</p>
                          <p className="aiw-cf-desc">{r.description}</p>

                          <div className="aiw-cf-features">
                            {r.features.map((feat, fIdx) => (
                              <div key={fIdx} className="aiw-cf-feat-item">
                                <span className="aiw-cf-bullet" style={{ color: r.color }}>•</span>
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>

                          <span className="aiw-cf-trial-info">{r.trialInfo}</span>
                        </div>

                        {/* Bottom CTA Action Button */}
                        <div className="aiw-cf-bottom-bar">
                          <button
                            type="button"
                            className="aiw-cf-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRoleFromExplorer(r);
                            }}
                            style={{ background: isCenter ? `linear-gradient(135deg, ${r.color}, #f26522)` : '#262934' }}
                          >
                            <span>{isCenter ? `REGISTRARME COMO ${r.shortLabel.toUpperCase()}` : `ELEGIR ${r.shortLabel.toUpperCase()}`}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CENTER / LEFT (when expanded): Sliding Login / Register Card */}
        <div className="aiw-hero-right aiw-hero-card-col">
          <div
            className={`aiw-card-wrapper ${isSheetCollapsed ? "aiw-sheet-collapsed" : "aiw-sheet-expanded"}`}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
            onClick={() => {
              if (isSheetCollapsed) {
                setIsSheetCollapsed(false);
                setShowRoleExplorer(false);
              }
            }}
            style={
              dragOffsetY !== 0
                ? {
                  transform: `translateY(${isSheetCollapsed
                    ? `calc(100% - 62px + ${dragOffsetY}px)`
                    : `${dragOffsetY}px`
                    })`,
                  transition: 'none'
                }
                : undefined
            }
          >

            {/* Floating side arrow outside the card to toggle Role Explorer when on Register */}
            {isSignUp && (
              <button
                type="button"
                className={`aiw-side-arrow-trigger ${showRoleExplorer ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRoleExplorer(prev => !prev);
                }}
                title={showRoleExplorer ? "Ocultar tipos de usuarios" : "Ver tipos de usuarios"}
                aria-label="Explorar tipos de usuarios"
              >
                {showRoleExplorer ? <ChevronLeft size={26} strokeWidth={3} /> : <ChevronRight size={26} strokeWidth={3} />}
                <span className="aiw-side-arrow-tooltip">
                  {showRoleExplorer ? "Cerrar roles" : "Tipos de usuario"}
                </span>
              </button>
            )}

            <div className={`aiw-card ${isSignUp ? "aiw-right-panel-active" : ""}`}>

              {/* Mobile Drag Handle (Swipe line to hide/show sheet) */}
              <div
                className="aiw-mobile-drag-handle"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSheetCollapsed(prev => {
                    const next = !prev;
                    if (!next) setShowRoleExplorer(false);
                    return next;
                  });
                }}
                title={isSheetCollapsed ? "Toca o desliza para abrir el registro" : "Desliza hacia abajo para ocultar"}
                aria-label="Tirador táctil"
              >
                <div className="aiw-drag-pill"></div>
                {isSheetCollapsed && (
                  <span className="aiw-drag-peek-label">Toca para abrir formulario</span>
                )}
              </div>

              {/* === 1. SIGN IN FORM (LOGIN) === */}
              <div className="aiw-form-container aiw-sign-in-container">
                <div className="aiw-form-side">

                  {/* Header Brand */}
                  <div className="aiw-brand">
                    <div className="aiw-brand-icon-wrapper">
                      {backgroundSettings.appLogo ? (
                        <img src={backgroundSettings.appLogo} alt="Logo" className="aiw-brand-logo-img" />
                      ) : (
                        <div className="aiw-globe-icon">
                          <Globe size={24} strokeWidth={1.7} />
                        </div>
                      )}
                    </div>
                    <h1 className="aiw-brand-title">AGENTE SOLUTIONS</h1>
                  </div>

                  {/* Tenant badge if active */}
                  {selectedTenant && (
                    <div className="aiw-tenant-badge">
                      <div className="aiw-tenant-info">
                        <span className="aiw-tenant-label">PORTAL EMPRESARIAL</span>
                        <strong className="aiw-tenant-name">
                          <Building2 size={13} style={{ marginRight: 4 }} />
                          {selectedTenant.name} ({selectedTenant.code})
                        </strong>
                      </div>
                      <button
                        type="button"
                        className="aiw-tenant-btn"
                        onClick={() => {
                          localStorage.removeItem("agente_tenant_selected");
                          setSelectedTenant(null);
                        }}
                      >
                        Cambiar
                      </button>
                    </div>
                  )}

                  {/* Pending Approval Screen */}
                  {isPendingApproval ? (
                    <div className="aiw-pending-container">
                      <div className="aiw-pending-icon-circle">
                        <Clock size={36} color="#f26522" />
                      </div>
                      <h2 className="aiw-pending-title">PERFIL EN REVISIÓN</h2>
                      <p className="aiw-pending-desc">
                        Tu cuenta está en sala de espera. Debe ser autorizada por el <strong>Administrador de tu empresa</strong> para iniciar sesión.
                      </p>

                      {requiresLink ? (
                        <form onSubmit={handleLinkCompany} className="aiw-pending-link-form">
                          <label className="aiw-field-label">¿Trabajas para un Autónomo? Ingresa el código:</label>
                          <input
                            type="text"
                            placeholder="CÓDIGO DE EMPRESA"
                            required
                            value={companyCode}
                            onChange={e => setCompanyCode(e.target.value)}
                            className="aiw-input"
                          />
                          <button type="submit" disabled={isLoading} className="aiw-btn-primary">
                            {isLoading ? 'VINCULANDO...' : 'VINCULAR Y SOLICITAR ACCESO'}
                          </button>
                        </form>
                      ) : (
                        <div className="aiw-pending-status-chip">
                          <span>⏳ Pendiente de aprobación</span>
                        </div>
                      )}

                      {mensaje && (
                        <p className={`aiw-feedback-msg ${mensaje.includes("Error") ? "error" : "success"}`}>
                          {mensaje}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => { setIsPendingApproval(false); setRequiresLink(false); setMensaje(""); }}
                        className="aiw-text-link aiw-mt-md"
                      >
                        Volver al inicio de sesión
                      </button>
                    </div>
                  ) : (
                    /* Standard Login Form */
                    <form className="aiw-login-form" onSubmit={handleLogin}>

                      {/* Email Field */}
                      <div className="aiw-input-field">
                        <Mail size={18} className="aiw-field-icon" />
                        <input
                          type="text"
                          placeholder="Correo o celular..."
                          className="aiw-input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="username"
                        />
                      </div>

                      {/* Password Field */}
                      <div className="aiw-input-field">
                        <Lock size={16} className="aiw-field-icon" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Contraseña..."
                          className="aiw-input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          className="aiw-eye-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                          aria-label="Ver u ocultar contraseña"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Submit Button */}
                      <button type="submit" className="aiw-btn-primary" disabled={isLoading}>
                        <span>{isLoading ? "CONECTANDO..." : "INICIAR SESIÓN"}</span>
                        <div className="aiw-btn-arrow">
                          <ArrowRight size={18} />
                        </div>
                      </button>

                      {/* Social / Google Button */}
                      <button
                        type="button"
                        className="aiw-social-btn-google"
                        title="Continuar con Google"
                        onClick={() => setMensaje("Autenticación con Google disponible próximamente.")}
                      >
                        <svg className="aiw-google-icon" viewBox="0 0 24 24" width="18" height="18">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>CONTINUAR CON GOOGLE</span>
                      </button>

                      {/* Divider OR */}
                      <div className="aiw-divider">
                        <span className="aiw-divider-line"></span>
                        <span className="aiw-divider-text">OR</span>
                        <span className="aiw-divider-line"></span>
                      </div>

                      {/* Switch to SignUp button */}
                      <button
                        type="button"
                        className="aiw-btn-capsule"
                        onClick={() => { setIsSignUp(true); setShowRoleExplorer(false); setMensaje(""); }}
                      >
                        <span className="aiw-capsule-text">REGISTRARME COMO CLIENTE</span>
                      </button>

                      {mensaje && (
                        <div className={`aiw-feedback-msg ${mensaje.includes("Error") ? "error" : "success"}`}>
                          {mensaje}
                        </div>
                      )}
                    </form>
                  )}

                  {/* Bottom Footer Links */}
                  <div className="aiw-footer-bar">
                    <button
                      type="button"
                      className="aiw-footer-link"
                      onClick={openRecoverModal}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                </div>
              </div>

              {/* === 2. SIGN UP FORM (REGISTER) === */}
              <div className="aiw-form-container aiw-sign-up-container">
                <div className="aiw-form-side">

                  {/* Header Brand */}
                  <div className="aiw-brand">
                    <div className="aiw-brand-icon-wrapper">
                      <div className="aiw-sparkle-icon">
                        <Sparkles size={22} color="#f26522" />
                      </div>
                    </div>
                    <h1 className="aiw-brand-title">CREAR CUENTA</h1>
                    <span className="aiw-brand-subtitle">ÚNETE A AGENTE SOLUTIONS</span>
                  </div>

                  {/* Role Selection Badge Indicator */}
                  <button
                    type="button"
                    className="aiw-role-selected-chip"
                    onClick={() => {
                      if (window.innerWidth <= 820) {
                        setShowRoleExplorer(true);
                        setIsSheetCollapsed(true);
                      } else {
                        setShowRoleExplorer(prev => !prev);
                      }
                    }}
                    title="Cambiar tipo de cuenta"
                  >
                    <div className="aiw-role-chip-left">
                      <span className="aiw-role-chip-label">ROL:</span>
                      <strong className="aiw-role-chip-name">{rolActual.label}</strong>
                    </div>
                    <div className="aiw-role-chip-action">
                      <span>Cambiar</span>
                      <ChevronRight size={13} />
                    </div>
                  </button>

                  <form className="aiw-login-form" onSubmit={handleRegisterSubmit}>

                    {/* Nombre */}
                    <div className="aiw-input-field">
                      <User size={15} className="aiw-field-icon" />
                      <input
                        type="text"
                        placeholder="Nombre(s)"
                        className="aiw-input"
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Apellido */}
                    <div className="aiw-input-field">
                      <User size={15} className="aiw-field-icon" />
                      <input
                        type="text"
                        placeholder="Apellido(s)"
                        className="aiw-input"
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Email Field */}
                    <div className="aiw-input-field">
                      <Mail size={15} className="aiw-field-icon" />
                      <input
                        type="email"
                        placeholder="Correo electrónico"
                        className="aiw-input"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>

                    {/* Phone Field */}
                    <div className="aiw-input-field">
                      <Phone size={15} className="aiw-field-icon" />
                      <input
                        type="tel"
                        placeholder="Teléfono / Celular"
                        className="aiw-input"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        required
                      />
                    </div>

                    {/* Password Field */}
                    <div className="aiw-input-field">
                      <Lock size={15} className="aiw-field-icon" />
                      <input
                        type={showRegPassword ? "text" : "password"}
                        placeholder="Contraseña"
                        className="aiw-input"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="aiw-eye-toggle"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        tabIndex={-1}
                        aria-label="Ver u ocultar contraseña"
                      >
                        {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="aiw-input-field">
                      <Lock size={15} className="aiw-field-icon" />
                      <input
                        type={showRegPassword ? "text" : "password"}
                        placeholder="Confirmar contraseña"
                        className="aiw-input"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="aiw-eye-toggle"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        tabIndex={-1}
                        aria-label="Ver u ocultar contraseña"
                      >
                        {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" className="aiw-btn-primary" disabled={isLoading}>
                      <span>{isLoading ? "REGISTRANDO..." : `REGISTRARME COMO ${rolActual.shortLabel.toUpperCase()}`}</span>
                      <div className="aiw-btn-arrow">
                        <ArrowRight size={18} />
                      </div>
                    </button>

                    {/* Feedback Message */}
                    {regMessage && (
                      <div className={`aiw-feedback-msg ${regMessage.includes("Error") ? "error" : "success"}`}>
                        {regMessage}
                      </div>
                    )}
                  </form>

                  {/* Bottom Footer Links */}
                  <div className="aiw-footer-bar">
                    <button
                      type="button"
                      className="aiw-footer-link aiw-highlight-roles-link"
                      onClick={() => {
                        if (window.innerWidth <= 820) {
                          setShowRoleExplorer(true);
                          setIsSheetCollapsed(true);
                        } else {
                          setShowRoleExplorer(prev => !prev);
                        }
                      }}
                    >
                      {showRoleExplorer ? "Ocultar roles" : "Explorar todos los roles"}
                    </button>
                    <span className="aiw-footer-dot">•</span>
                    <button
                      type="button"
                      className="aiw-footer-link"
                      onClick={() => { setIsSignUp(false); setShowRoleExplorer(false); setRegMessage(""); }}
                    >
                      Ya tengo cuenta
                    </button>
                  </div>

                </div>
              </div>

              {/* === 3. SLIDING OVERLAY CONTAINER === */}
              <div className="aiw-overlay-container">
                <div
                  className="aiw-overlay"
                  style={{
                    backgroundImage: `url(${backgroundSettings.imageUrl || LoginArtwork})`
                  }}
                >
                  <div className="aiw-overlay-bg-tint"></div>

                  {/* LEFT OVERLAY PANEL (Visible when Registering -> Invites to Login) */}
                  <div className="aiw-overlay-panel aiw-overlay-left">
                    <div className="aiw-overlay-top-brand">
                      <img
                        src={backgroundSettings.appLogo || Logo4}
                        alt="Logo Agente Solutions"
                        className="aiw-overlay-logo"
                      />
                    </div>

                    <div className="aiw-overlay-content-box">
                      <h2 className="aiw-overlay-title">¡Bienvenido de nuevo!</h2>
                      <p className="aiw-overlay-desc">
                        Para mantenerte conectado con tus servicios y operaciones, ingresa con tu cuenta.
                      </p>
                      <button
                        type="button"
                        className="aiw-overlay-btn"
                        onClick={() => { setIsSignUp(false); setShowRoleExplorer(false); setRegMessage(""); }}
                      >
                        INICIAR SESIÓN
                      </button>
                    </div>
                  </div>

                  {/* RIGHT OVERLAY PANEL (Visible when Logging In -> Invites to Register) */}
                  <div className="aiw-overlay-panel aiw-overlay-right">
                    <div className="aiw-overlay-top-brand">
                      <img
                        src={backgroundSettings.appLogo || Logo4}
                        alt="Logo Agente Solutions"
                        className="aiw-overlay-logo"
                      />
                    </div>

                    <div className="aiw-overlay-content-box">
                      <h2 className="aiw-overlay-title">¡Hola, bienvenido!</h2>
                      <p className="aiw-overlay-desc">
                        Únete hoy mismo a la plataforma y potencia tus servicios con automatización inteligente.
                      </p>
                      <button
                        type="button"
                        className="aiw-overlay-btn"
                        onClick={() => { setIsSignUp(true); setShowRoleExplorer(false); setMensaje(""); }}
                      >
                        CREAR CUENTA
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT HERO SECTION (when expanded): Roles Showcase Carousel */}
        {showRoleExplorer && (
          <div className="aiw-hero-roles-col">
            <div className="aiw-roles-card-box">

              {/* Roles Header */}
              <div className="aiw-roles-header">
                <div className="aiw-roles-header-left">
                  <span className="aiw-roles-eyebrow">REGISTRO MULTI-ROL</span>
                  <h2 className="aiw-roles-title">TIPOS DE USUARIO AGENTE SOLUTIONS</h2>
                </div>
              </div>

              {/* Category selector pills (clean, modern segment control) */}
              <div className="aiw-roles-cat-pills">
                <button
                  type="button"
                  className={`aiw-roles-cat-btn ${activeCategory === "agente" ? "active" : ""}`}
                  onClick={() => handleCategoryChange("agente")}
                >
                  Clientes ({ROLES_PUBLICOS.filter(r => r.category === 'agente').length})
                </button>
                <button
                  type="button"
                  className={`aiw-roles-cat-btn ${activeCategory === "autonomo" ? "active" : ""}`}
                  onClick={() => handleCategoryChange("autonomo")}
                >
                  Proveedores ({ROLES_PUBLICOS.filter(r => r.category === 'autonomo').length})
                </button>
              </div>

              {/* 3D Coverflow Carousel container */}
              <div className="aiw-carousel-wrapper">

                {/* 3D Coverflow Perspective Track Stage */}
                <div
                  className="aiw-dcarousel-track"
                  onTouchStart={handleCardTouchStart}
                  onTouchEnd={handleCardTouchEnd}
                >
                  <div className="aiw-coverflow-desktop-stage">
                    {rolesFiltrados.map((r, i) => {
                      const activeIndex = rolesFiltrados.findIndex(rf => rf.key === selectedRoleKey);
                      const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;
                      const diff = i - safeActiveIndex;
                      const isCenter = diff === 0;

                      let transform = "";
                      let zIndex = 1;
                      let opacity = 0;
                      let pointerEvents = "none";
                      let filter = "none";

                      if (isCenter) {
                        transform = "translateX(0) scale(1) translateZ(0) rotateY(0deg)";
                        zIndex = 10;
                        opacity = 1;
                        pointerEvents = "auto";
                        filter = "none";
                      } else if (diff === -1) {
                        transform = "translateX(-130px) scale(0.86) translateZ(-40px) rotateY(16deg)";
                        zIndex = 6;
                        opacity = 0.65;
                        pointerEvents = "auto";
                        filter = "brightness(0.75) blur(0.3px)";
                      } else if (diff === 1) {
                        transform = "translateX(130px) scale(0.86) translateZ(-40px) rotateY(-16deg)";
                        zIndex = 6;
                        opacity = 0.65;
                        pointerEvents = "auto";
                        filter = "brightness(0.75) blur(0.3px)";
                      } else if (diff === -2) {
                        transform = "translateX(-210px) scale(0.72) translateZ(-90px) rotateY(26deg)";
                        zIndex = 3;
                        opacity = 0.25;
                        pointerEvents = "auto";
                        filter = "brightness(0.5) blur(1.5px)";
                      } else if (diff === 2) {
                        transform = "translateX(210px) scale(0.72) translateZ(-90px) rotateY(-26deg)";
                        zIndex = 3;
                        opacity = 0.25;
                        pointerEvents = "auto";
                        filter = "brightness(0.5) blur(1.5px)";
                      } else {
                        transform = `translateX(${diff > 0 ? 270 : -270}px) scale(0.55) translateZ(-130px)`;
                        zIndex = 1;
                        opacity = 0;
                        pointerEvents = "none";
                      }

                      return (
                        <div
                          key={r.key}
                          className={`aiw-coverflow-card aiw-desktop-cf-card ${isCenter ? "active-center" : "flanking"}`}
                          style={{
                            transform,
                            zIndex,
                            opacity,
                            pointerEvents,
                            filter,
                            borderColor: isCenter ? r.color : `${r.color}55`,
                            boxShadow: isCenter
                              ? `0 24px 55px rgba(0, 0, 0, 0.9), 0 0 35px ${r.color}40`
                              : `0 10px 25px rgba(0, 0, 0, 0.6)`
                          }}
                          onClick={() => {
                            if (!isCenter) {
                              handleDotClick(r.key, i);
                            } else {
                              handleSelectRoleFromExplorer(r);
                            }
                          }}
                        >
                          <div className="aiw-rcard-top">
                            <span
                              className="aiw-rcard-badge"
                              style={{
                                borderColor: `${r.color}77`,
                                color: r.color,
                                background: `${r.color}1a`
                              }}
                            >
                              {r.badge}
                            </span>
                            <span className="aiw-cf-category-tag">
                              {r.category === 'agente' ? 'MATRIZ OFICIAL' : 'RED DE TRABAJO'}
                            </span>
                          </div>

                          <h3 className="aiw-rcard-title">{r.label}</h3>

                          <p className="aiw-rcard-tagline" style={{ color: r.color }}>{r.tagline}</p>
                          <p className="aiw-rcard-desc">{r.description}</p>

                          <div className="aiw-rcard-features-box">
                            {r.features.map((feat, fIdx) => (
                              <div key={fIdx} className="aiw-rcard-feat-item">
                                <CheckCircle2 size={16} className="aiw-feat-check-icon" style={{ color: r.color }} />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>

                          {/* Dots pagination */}
                          <div className="aiw-rcard-dots">
                            {rolesFiltrados.map((item, dotIdx) => (
                              <button
                                key={item.key}
                                type="button"
                                className={`aiw-rcard-dot ${item.key === selectedRoleKey ? "active" : ""}`}
                                style={item.key === selectedRoleKey ? { background: r.color, boxShadow: `0 0 10px ${r.color}99` } : {}}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDotClick(item.key, dotIdx);
                                }}
                                aria-label={`Ver ${item.label}`}
                              />
                            ))}
                          </div>

                          {/* Select Role Button */}
                          <button
                            type="button"
                            className="aiw-rcard-cta-btn"
                            style={{
                              background: isCenter
                                ? `linear-gradient(135deg, ${r.color} 0%, #f26522 60%, #e11d48 100%)`
                                : undefined
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRoleFromExplorer(r);
                            }}
                          >
                            <span>{r.cta}</span>
                            <ArrowRight size={17} />
                          </button>

                          <span className="aiw-rcard-trial-info">{r.trialInfo}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Bottom helper */}
              <div className="aiw-roles-bottom-footer">
                <button
                  type="button"
                  className="aiw-roles-back-link"
                  onClick={() => setShowRoleExplorer(false)}
                >
                  <ArrowLeft size={14} style={{ marginRight: 6 }} />
                  Volver al formulario de registro
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* MODAL RECUPERACIÓN DE CONTRASEÑA DIRECTA */}
      {isRecoverModalOpen && (
        <div className="aiw-modal-overlay" onClick={() => setIsRecoverModalOpen(false)}>
          <div className="aiw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="aiw-modal-header">
              <div className="aiw-modal-icon-wrap">
                <KeyRound size={26} color="#f26522" />
              </div>
              <h3 className="aiw-modal-title">
                {recoverStep === 1 ? "RECUPERAR CONTRASEÑA" : "NUEVA CONTRASEÑA"}
              </h3>
              <p className="aiw-modal-subtitle">
                {recoverStep === 1
                  ? "Ingresa tu correo registrado para restablecer tu contraseña."
                  : "Ingresa tu nueva contraseña para actualizar tu cuenta."}
              </p>
            </div>

            {recoverStep === 1 ? (
              <form onSubmit={handleStep1Submit} className="aiw-modal-form">
                <div className="aiw-input-field">
                  <Mail size={18} className="aiw-field-icon" />
                  <input
                    type="email"
                    placeholder="TU CORREO REGISTRADO..."
                    className="aiw-input"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <button type="submit" disabled={isLoading} className="aiw-btn-primary">
                  <span>CONTINUAR</span>
                  <div className="aiw-btn-arrow">
                    <ArrowRight size={17} />
                  </div>
                </button>

                <button
                  type="button"
                  className="aiw-btn-cancel"
                  onClick={() => setIsRecoverModalOpen(false)}
                >
                  CANCELAR
                </button>

                {recoverMessage && (
                  <div className={`aiw-feedback-msg ${recoverMessage.startsWith("Error") ? "error" : "success"}`}>
                    {recoverMessage}
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleRecoverPasswordSubmit} className="aiw-modal-form">
                <div className="aiw-recover-email-chip">
                  <div className="aiw-recover-email-chip-text" title={recoverEmail}>
                    <Mail size={14} color="#f26522" />
                    <span>{recoverEmail}</span>
                  </div>
                  <button
                    type="button"
                    className="aiw-recover-change-btn"
                    onClick={() => {
                      setRecoverStep(1);
                      setRecoverMessage("");
                    }}
                  >
                    Cambiar
                  </button>
                </div>

                <div className="aiw-input-field">
                  <Lock size={16} className="aiw-field-icon" />
                  <input
                    type={showRecoverPassword ? "text" : "password"}
                    placeholder="Nueva contraseña..."
                    className="aiw-input"
                    value={recoverNewPassword}
                    onChange={(e) => setRecoverNewPassword(e.target.value)}
                    required
                    minLength={4}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="aiw-eye-toggle"
                    onClick={() => setShowRecoverPassword(!showRecoverPassword)}
                    tabIndex={-1}
                    aria-label="Ver u ocultar contraseña"
                  >
                    {showRecoverPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="aiw-input-field">
                  <Lock size={16} className="aiw-field-icon" />
                  <input
                    type={showRecoverConfirm ? "text" : "password"}
                    placeholder="Confirmar nueva contraseña..."
                    className="aiw-input"
                    value={recoverConfirmPassword}
                    onChange={(e) => setRecoverConfirmPassword(e.target.value)}
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    className="aiw-eye-toggle"
                    onClick={() => setShowRecoverConfirm(!showRecoverConfirm)}
                    tabIndex={-1}
                    aria-label="Ver u ocultar confirmación de contraseña"
                  >
                    {showRecoverConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" disabled={isLoading} className="aiw-btn-primary">
                  <span>{isLoading ? "ACTUALIZANDO..." : "GUARDAR CONTRASEÑA"}</span>
                  {!isLoading && (
                    <div className="aiw-btn-arrow">
                      <ArrowRight size={17} />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  className="aiw-btn-cancel"
                  onClick={() => {
                    setRecoverStep(1);
                    setRecoverMessage("");
                  }}
                  disabled={isLoading}
                >
                  VOLVER
                </button>

                {recoverMessage && (
                  <div className={`aiw-feedback-msg ${recoverMessage.startsWith("Error") ? "error" : "success"}`}>
                    {recoverMessage}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginAgente;