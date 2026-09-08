import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/Auth/LoginAgente.css";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, Eye, EyeOff, Clock } from "lucide-react";
import Logo4 from "../../assets/Logo4.png";

const LoginAgente = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user, loginGlobal } = useAuth();

  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoverMessage, setRecoverMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados para Sala de Espera / Vinculación
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [requiresLink, setRequiresLink] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [companyCode, setCompanyCode] = useState("");
  //Variablaes para personalizar el Login
  const [backgroundSettings, setBackgroundSettings] = useState({ imageUrl: null, colorHex: '#000000', appLogo: null });
  const [selectedTenant, setSelectedTenant] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("agente_tenant_selected");
    if (saved) {
      try { setSelectedTenant(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  // 1. AUTO-LOGIN: Si ya existe sesión, redirigir según el rol
  useEffect(() => {
    if (user) {
      const role = Number(user.role_id);
      if ([0, 1, 4, 5, 6, 7].includes(role)) navigate("/VistaRoot");
      else if (role === 2 || role === 8) navigate("/VistaTecnico");
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
        setBackgroundSettings({ imageUrl: null, colorHex: '#000000', appLogo: null });
      }
    };
    fetchSettings();
  }, []);

const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje("");

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/login`, {
    email: email,
    password: password
});

      // 👇 1. ATRAPAMOS EL NUEVO PAQUETE DEL BACKEND 👇
      const { token, user } = res.data;

      // 👇 2. GUARDAMOS EL TOKEN COMO UN TESORO 👇
      localStorage.setItem('agente_token', token);

      // 👇 3. LE DECIMOS A AXIOS QUE USE EL TOKEN DESDE AHORA 👇
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // 4. Sacamos los datos del usuario (ahora vienen dentro del objeto 'user')
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

      // Actualizamos tu contexto global
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

      // 5. Las redirecciones se quedan exactamente igual
      const roleNum = Number(role_id);
      if (roleNum === 0) {
        setMensaje(`¡Bienvenido ROOT ${first_name}! Entrando al panel principal...`);
        setTimeout(() => navigate("/VistaRoot"), 1000);
      } else if (roleNum === 4 || roleNum === 5 || roleNum === 6) {
        let typeLabel = 'AUTÓNOMO';
        if (roleNum === 5) typeLabel = 'AUTÓNOMO PERSONAL';
        if (roleNum === 4) typeLabel = 'AUTÓNOMO EMPRESARIAL';
        if (roleNum === 6) typeLabel = 'CONTRATISTA';
        setMensaje(`¡Bienvenido ${typeLabel} ${first_name}! Entrando a tu panel...`);
        setTimeout(() => navigate("/VistaRoot"), 1000);
      } else if (roleNum === 1) {
        setMensaje(`¡Bienvenido ADMIN ${first_name}! Entrando al panel administrativo...`);
        setTimeout(() => navigate("/VistaRoot"), 1000);
      } else if (roleNum === 2) {
        setMensaje(`¡Bienvenido TÉCNICO INTERNO ${first_name}! Abriendo tu panel de trabajo...`);
        setTimeout(() => navigate("/VistaTecnico"), 1000);
      } else if (roleNum === 8) {
        setMensaje(`¡Bienvenido TÉCNICO DE LA RED ${first_name}! Abriendo tu panel...`);
        setTimeout(() => navigate("/VistaTecnico"), 1000);
      } else if (roleNum === 3) {
        setMensaje(`¡Bienvenido CLIENTE ${first_name}! Abriendo tu portal...`);
        setTimeout(() => navigate("/propiedades"), 1000);
      } else if (roleNum === 7) {
        setMensaje(`¡Bienvenido ADMIN. DE PROPIEDADES ${first_name}! Entrando al panel...`);
        setTimeout(() => navigate("/VistaRoot"), 1000);
      } else {
        setMensaje(`Error: Tu usuario (Rol ${roleNum}) no tiene permisos válidos.`);
      }
      
    } catch (error) {
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
      }, 4000);
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

  return (
  <div 
      className="main-viewport"
      style={{ 
        backgroundColor: backgroundSettings.colorHex, 
        backgroundImage: backgroundSettings.imageUrl ? `url(${backgroundSettings.imageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        transition: 'background-image 0.5s ease-in-out'
      }} 
    >
         
      
      <img src={backgroundSettings.appLogo || Logo4} alt="Agente Solutions" className="logo-top-left" style={{ objectFit: 'contain' }} />
      <div className="decoration-layer">
        <div className="stripe-top"></div>
        <div className="stripe-bottom"></div>
        <div className="shape-right"></div>
     
      </div>
      
      {isPendingApproval ? (
        <div className="form-section" style={{ textAlign: 'center', backgroundColor: 'rgba(20, 20, 20, 0.95)', borderRadius: '24px', padding: '40px 25px', border: '2px solid #f26522', color: '#fff', boxShadow: '0 15px 35px rgba(242, 101, 34, 0.3)', zIndex: 10 }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(242, 101, 34, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '1px solid #f26522' }}>
            <Clock size={45} color="#f26522" />
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '15px', fontWeight: '900', fontStyle: 'italic' }}>¡PERFIL EN REVISIÓN!</h2>
          <p style={{ color: '#ddd', fontSize: '1rem', lineHeight: '1.6', marginBottom: '25px', maxWidth: '400px', margin: '0 auto 25px auto' }}>
            Tu cuenta está en la sala de espera y debe ser revisada y autorizada por el <strong>Administrador de tu empresa</strong> para poder iniciar sesión.
          </p>
          {requiresLink ? (
             <form onSubmit={handleLinkCompany} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '350px', margin: '0 auto' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ fontSize: '0.85rem', color: '#ccc', marginBottom: '5px', display: 'block' }}>¿Trabajas para un Autónomo? Ingresa su código:</label>
                  <input type="text" placeholder="Código de empresa" required value={companyCode} onChange={e => setCompanyCode(e.target.value)} style={{ width: '100%', padding: '12px 15px', borderRadius: '20px', border: 'none', background: '#f3f3f3', color: '#111', boxSizing: 'border-box' }} />
                </div>
                <button type="submit" disabled={isLoading} style={{ padding: '12px 24px', backgroundColor: '#f26522', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                  {isLoading ? 'Vinculando...' : 'Vincular y Solicitar Acceso'}
                </button>
             </form>
          ) : (
            <div style={{ padding: '15px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', borderLeft: '4px solid #f26522', display: 'inline-block' }}>
               <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>⏳ Pendiente de aprobación</span>
            </div>
          )}
          {mensaje && <p style={{ color: '#ff4d4d', marginTop: '15px', fontSize: '0.9rem', fontWeight: 'bold' }}>{mensaje}</p>}
          <button type="button" onClick={() => { setIsPendingApproval(false); setRequiresLink(false); setMensaje(""); }} style={{ background: 'none', border: 'none', color: '#888', textDecoration: 'underline', marginTop: '20px', cursor: 'pointer' }}>
             Volver al inicio de sesión
          </button>
        </div>
      ) : (
      <form className="form-section" onSubmit={handleLogin}>
        {selectedTenant && (
          <div style={{
            backgroundColor: "#FFF5EC",
            border: "1px solid #FFCEA2",
            borderRadius: "10px",
            padding: "10px 15px",
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.85rem"
          }}>
            <div>
              <span style={{ color: "#888", display: "block", fontSize: "0.75rem" }}>PORTAL EMPRESARIAL:</span>
              <strong style={{ color: "#333", fontSize: "0.95rem" }}>🏢 {selectedTenant.name} ({selectedTenant.code})</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("agente_tenant_selected");
                setSelectedTenant(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#FF6600",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "0.8rem"
              }}
            >
              Cambiar
            </button>
          </div>
        )}
        <h2 className="form-title">INICIO DE SESIÓN</h2>

        <div className="input-group">
          <Mail size={22} strokeWidth={2.5} className="input-icon" />
          <input
            type="text"
            placeholder="CORREO O CELULAR"
            className="custom-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ paddingLeft: "55px" }}
          />
        </div>

        <div className="input-group">
          <Lock size={22} strokeWidth={2.5} className="input-icon" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="CONTRASEÑA"
            className="custom-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ paddingLeft: "55px" }}
          />
          <button type="button" className="toggle-password-btn" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
          </button>
        </div>

        <button type="submit" className="btn-login">INICIAR</button>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
          <span style={{ color: '#888' }}>¿No tienes una cuenta? </span>
          <span 
            onClick={() => navigate('/registro-cliente')} 
            style={{ color: '#FF6600', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            Regístrate aquí
          </span>
        </div>
        <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '0.9rem' }}>
          <span 
            onClick={() => setIsRecoverModalOpen(true)} 
            style={{ color: '#FF6600', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            ¿Olvidaste tu contraseña? Recuperar aquí
          </span>
        </div>
        {mensaje && (
          <p className={`msg-box ${mensaje.includes("Error") ? "error" : "success"}`}>
            {mensaje}
          </p>
        )}
      </form>
      )}

      {isRecoverModalOpen && (
        <div className="login-modal-overlay">
          <div className="login-modal-content">
            <img src={backgroundSettings.appLogo || Logo4} alt="Agente Solutions" className="login-modal-logo" style={{ width: '150px', marginBottom: '20px', objectFit: 'contain' }} />
            <h3 style={{ color: 'white', marginBottom: '20px', fontStyle: 'italic' }}>RECUPERAR CONTRASEÑA</h3>
            <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '15px' }}>Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
            <form onSubmit={handleRecoverPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
              <div className="input-group">
                <Mail size={20} strokeWidth={2.5} className="input-icon" />
                <input
                  type="email"
                  placeholder="CORREO REGISTRADO"
                  className="custom-input login-modal-input"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  required
                  style={{ paddingLeft: "50px" }}
                />
              </div>
              <button type="submit" disabled={isLoading} className="btn-login" style={{ fontSize: '1.2rem', padding: '10px' }}>
                {isLoading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
              </button>
              <button 
                type="button" 
                className="btn-cancelar"
                onClick={() => setIsRecoverModalOpen(false)} 
              >
                CANCELAR
              </button>
              {recoverMessage && (
                <p className={`msg-box ${recoverMessage.includes("Error") || recoverMessage.includes("no coinciden") ? "error" : "success"}`} style={{ marginTop: '10px' }}>
                  {recoverMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginAgente;