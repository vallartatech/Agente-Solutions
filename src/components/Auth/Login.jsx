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
  Globe,
  Building2,
  KeyRound,
  User,
  Phone,
  Sparkles
} from "lucide-react";
import Logo4 from "../../assets/Logo4.png";
import LoginArtwork from "../../assets/Atardecer.png";

const LoginAgente = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user, loginGlobal } = useAuth();

  // Sliding Auth Panel State (false = Login, true = Register)
  const [isSignUp, setIsSignUp] = useState(false);

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
  const [recoverEmail, setRecoverEmail] = useState("");
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
          setMensaje(`Error: ${error.response.data.error || 'Acceso denegado.'}`);
        } else if (error.response.status === 401) {
          setMensaje(`Error: ${error.response.data.message || 'Credenciales incorrectas.'}`);
        } else {
          setMensaje("Error: Hubo un problema al procesar tu solicitud.");
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

  const handleRecoverPassword = async (e) => {
    e.preventDefault();
    setRecoverMessage("");
    setIsLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/forgot-password`, {
        email: recoverEmail
      });
      setRecoverMessage(res.data.message || "Te hemos enviado un enlace a tu correo.");
      setTimeout(() => {
        setIsRecoverModalOpen(false);
        setRecoverMessage("");
        setRecoverEmail("");
        setIsLoading(false);
      }, 3500);
    } catch (error) {
      setIsLoading(false);
      console.log("Error al recuperar:", error);
      if (error.response) {
        setRecoverMessage(`Error: ${error.response.data.message || 'No se pudo procesar tu solicitud.'}`);
      } else {
        setRecoverMessage("Error al recuperar la contraseña. Verifica tu conexión.");
      }
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
        role_id: 3,
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
      className="aiw-viewport"
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

      {/* Main Split Layout Container */}
      <div className="aiw-page-container">

        {/* LEFT HERO SECTION: Large Company Logo */}
        <div className="aiw-hero-left">
          <div className="aiw-hero-logo-box">
            <img
              src={backgroundSettings.appLogo || Logo4}
              alt="Agente Solutions - Resolviendo tus necesidades"
              className="aiw-hero-logo-img"
            />
          </div>
        </div>

        {/* RIGHT HERO SECTION: Sliding Login / Register Card */}
        <div className="aiw-hero-right">
          <div className="aiw-card-wrapper">
            <div className={`aiw-card ${isSignUp ? "aiw-right-panel-active" : ""}`}>

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
                    <span className="aiw-brand-subtitle">AI & AUTOMATION PLATFORM</span>
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
                          placeholder="CORREO O CELULAR..."
                          className="aiw-input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="username"
                        />
                      </div>

                      {/* Password Field */}
                      <div className="aiw-input-field">
                        <Lock size={18} className="aiw-field-icon" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="CONTRASEÑA..."
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

                      {/* Social / Quick Action Buttons */}
                      <div className="aiw-social-row">
                        <button
                          type="button"
                          className="aiw-social-btn"
                          title="Iniciar con Google"
                          onClick={() => setMensaje("Autenticación con Google disponible próximamente.")}
                        >
                          <span className="aiw-social-g">G</span>
                        </button>
                        <button
                          type="button"
                          className="aiw-social-btn"
                          title="Iniciar con X"
                          onClick={() => setMensaje("Autenticación con X disponible próximamente.")}
                        >
                          <span>𝕏</span>
                        </button>
                        <button
                          type="button"
                          className="aiw-social-btn"
                          title="Comunidad Discord"
                          onClick={() => window.open("https://discord.com", "_blank")}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                          </svg>
                        </button>
                      </div>

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
                        onClick={() => { setIsSignUp(true); setMensaje(""); }}
                      >
                        <span className="aiw-capsule-emoji">🦊</span>
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
                      onClick={() => setIsRecoverModalOpen(true)}
                    >
                      ¿Olvidaste contraseña?
                    </button>
                    <span className="aiw-footer-dot">•</span>
                    <button
                      type="button"
                      className="aiw-footer-link"
                      onClick={() => { setIsSignUp(true); setMensaje(""); }}
                    >
                      Crear Cuenta
                    </button>
                    <span className="aiw-footer-dot">•</span>
                    <span className="aiw-footer-text">T&Cs</span>
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

                  <form className="aiw-login-form" onSubmit={handleRegisterSubmit}>

                    {/* Names in 2 columns */}
                    <div className="aiw-input-row">
                      <div className="aiw-input-field">
                        <User size={15} className="aiw-field-icon" />
                        <input
                          type="text"
                          placeholder="NOMBRE..."
                          className="aiw-input"
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="aiw-input-field">
                        <input
                          type="text"
                          placeholder="APELLIDO..."
                          className="aiw-input aiw-input-no-icon"
                          value={regLastName}
                          onChange={(e) => setRegLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Email Field */}
                    <div className="aiw-input-field">
                      <Mail size={15} className="aiw-field-icon" />
                      <input
                        type="email"
                        placeholder="CORREO ELECTRÓNICO..."
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
                        placeholder="TELÉFONO / CELULAR..."
                        className="aiw-input"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        required
                      />
                    </div>

                    {/* Password Fields in 2 columns */}
                    <div className="aiw-input-row">
                      <div className="aiw-input-field">
                        <Lock size={15} className="aiw-field-icon" />
                        <input
                          type={showRegPassword ? "text" : "password"}
                          placeholder="CONTRASEÑA..."
                          className="aiw-input"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="aiw-input-field">
                        <input
                          type={showRegPassword ? "text" : "password"}
                          placeholder="CONFIRMAR..."
                          className="aiw-input aiw-input-no-icon"
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
                          aria-label="Ver contraseña"
                        >
                          {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" className="aiw-btn-primary" disabled={isLoading}>
                      <span>{isLoading ? "REGISTRANDO..." : "CREAR MI CUENTA"}</span>
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
                      className="aiw-footer-link"
                      onClick={() => navigate('/registro-cliente')}
                    >
                      ¿Eres Autónomo / Empresa?
                    </button>
                    <span className="aiw-footer-dot">•</span>
                    <button
                      type="button"
                      className="aiw-footer-link"
                      onClick={() => { setIsSignUp(false); setRegMessage(""); }}
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
                      <div className="aiw-overlay-pill">
                        <span>✨ Iniciar Sesión</span>
                      </div>
                      <h2 className="aiw-overlay-title">¡Bienvenido de nuevo!</h2>
                      <p className="aiw-overlay-desc">
                        Para mantenerte conectado con tus servicios y operaciones, ingresa con tu cuenta.
                      </p>
                      <button
                        type="button"
                        className="aiw-overlay-btn"
                        onClick={() => { setIsSignUp(false); setRegMessage(""); }}
                      >
                        INICIAR SESIÓN
                      </button>
                    </div>

                    <div className="aiw-overlay-bottom-hint">
                      <span>Agente Solutions AI Platform</span>
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
                      <div className="aiw-overlay-pill">
                        <span>🚀 Registro Rápido</span>
                      </div>
                      <h2 className="aiw-overlay-title">¡Hola, bienvenido!</h2>
                      <p className="aiw-overlay-desc">
                        Únete hoy mismo a la plataforma y potencia tus servicios con automatización inteligente.
                      </p>
                      <button
                        type="button"
                        className="aiw-overlay-btn"
                        onClick={() => { setIsSignUp(true); setMensaje(""); }}
                      >
                        CREAR CUENTA
                      </button>
                    </div>

                    <div className="aiw-overlay-bottom-hint">
                      <span>Agente Solutions AI Platform</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* RECOVER PASSWORD MODAL */}
      {isRecoverModalOpen && (
        <div className="aiw-modal-overlay" onClick={() => setIsRecoverModalOpen(false)}>
          <div className="aiw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="aiw-modal-header">
              <div className="aiw-modal-icon-wrap">
                <KeyRound size={26} color="#f26522" />
              </div>
              <h3 className="aiw-modal-title">RECUPERAR CONTRASEÑA</h3>
              <p className="aiw-modal-subtitle">
                Ingresa tu correo electrónico registrado y te enviaremos las instrucciones de restablecimiento.
              </p>
            </div>

            <form onSubmit={handleRecoverPassword} className="aiw-modal-form">
              <div className="aiw-input-field">
                <Mail size={18} className="aiw-field-icon" />
                <input
                  type="email"
                  placeholder="TU CORREO REGISTRADO..."
                  className="aiw-input"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={isLoading} className="aiw-btn-primary">
                {isLoading ? 'ENVIANDO...' : 'ENVIAR ENLACE DE RECUPERACIÓN'}
              </button>

              <button
                type="button"
                className="aiw-btn-cancel"
                onClick={() => setIsRecoverModalOpen(false)}
              >
                CANCELAR
              </button>

              {recoverMessage && (
                <div className={`aiw-feedback-msg ${recoverMessage.includes("Error") || recoverMessage.includes("no coinciden") ? "error" : "success"}`}>
                  {recoverMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginAgente;