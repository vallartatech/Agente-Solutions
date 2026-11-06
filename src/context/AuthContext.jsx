import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from "axios";
import { desvincularUsuarioOneSignal } from '../components/Shared/oneSignalPush';
import { mostrarAviso } from '../utils/dialogos';

const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [initialized, setInitialized] = React.useState(false);
  const [user, setUser] = useState(() => {
    const savedSession = localStorage.getItem('agente_session');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      
      if (new Date().getTime() > sessionData.expirationTime) {
        localStorage.removeItem('agente_session');
        return null;
      }

      // Configurar token inicial
      const token = localStorage.getItem("agente_token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      return sessionData.userData; 
    }
    return null;
  });

  // Mark as initialized after first render (App.jsx vincula OneSignal cuando cambia user.id)
  useEffect(() => {
    setInitialized(true);
  }, []);

  const loginGlobal = (userData) => {
    const TIEMPO_EXPIRACION = 36 * 60 * 60 * 1000; // 36 Horas
    const expirationTime = new Date().getTime() + TIEMPO_EXPIRACION;

    const sessionData = {
      userData: userData,
      expirationTime: expirationTime
    };

    const token = localStorage.getItem("agente_token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    setUser(userData);
    localStorage.setItem('agente_session', JSON.stringify(sessionData));
  };

  const logoutGlobal = () => {
    setUser(null);
    localStorage.removeItem('agente_session');
    localStorage.removeItem('agente_token'); // Limpiar también el token
    delete axios.defaults.headers.common["Authorization"];
    
    // Desvincular el dispositivo del usuario en OneSignal
    desvincularUsuarioOneSignal();
  };

  // INTERCEPTOR PARA MANEJAR EXPIRACIÓN DE TOKEN (401)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Técnico de la red sin validar (el backend lo bloquea): se marca en la sesión
        // y App.jsx lo manda a "Completa tu perfil"
        if (error.response?.status === 403 && error.response.data?.reason === 'perfil_profesional_pendiente') {
          setUser(prev => {
            if (!prev || prev.perfil_profesional?.bloqueado) return prev;
            const actualizado = { ...prev, perfil_profesional: { bloqueado: true, estado: error.response.data.estado } };
            try {
              const sesion = JSON.parse(localStorage.getItem('agente_session') || '{}');
              localStorage.setItem('agente_session', JSON.stringify({ ...sesion, userData: actualizado }));
            } catch { /* la sesión en memoria basta */ }
            return actualizado;
          });
        }
        if (error.response && error.response.status === 401) {
          const url = error.config?.url || '';
          // Si el 401 viene del login o rutas públicas, no forzar recarga de página para permitir mostrar el mensaje de error
          if (!url.includes('/login') && !url.includes('/forgot-password') && !url.includes('/registro')) {
            logoutGlobal();
            window.location.href = "/";
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    let intervalo;
    if (user) {
      intervalo = setInterval(() => {
        const savedSession = localStorage.getItem('agente_session');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          if (new Date().getTime() > sessionData.expirationTime) {
            logoutGlobal();
            clearInterval(intervalo);
            // Se redirige cuando el usuario cierra el aviso
            mostrarAviso('Tu sesión ha expirado por seguridad. Por favor, vuelve a iniciar sesión.', 'warning')
              .then(() => { window.location.href = '/'; }); 
          }
        }
      }, 60000); 
    }
    return () => clearInterval(intervalo); 
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loginGlobal, logoutGlobal, logout: logoutGlobal, initialized }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);