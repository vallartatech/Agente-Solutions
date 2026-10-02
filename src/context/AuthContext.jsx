import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from "axios";
// 👇 1. IMPORTAMOS ONESIGNAL AQUÍ
import OneSignal from 'react-onesignal'; 

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

  // Mark as initialized after first render
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

    // 👇 2. VINCULAMOS ONESIGNAL AL INICIAR SESIÓN (Protegido contra bloqueo de permisos)
    if (userData && userData.id) {
      try {
        if (typeof OneSignal?.login === 'function') {
          OneSignal.login(String(userData.id)); 
        }
      } catch (e) {
        console.warn("OneSignal.login omitido/bloqueado por permisos del navegador:", e);
      }
    }
  };

  const logoutGlobal = () => {
    setUser(null);
    localStorage.removeItem('agente_session');
    localStorage.removeItem('agente_token'); // Limpiar también el token
    delete axios.defaults.headers.common["Authorization"];
    
    // 👇 3. DESVINCULAMOS ONESIGNAL AL CERRAR SESIÓN
    try {
      if (typeof OneSignal?.logout === 'function') {
        OneSignal.logout();
      }
    } catch (e) {
      console.warn("OneSignal.logout omitido/bloqueado por permisos del navegador:", e);
    }
  };

  // INTERCEPTOR PARA MANEJAR EXPIRACIÓN DE TOKEN (401)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          logoutGlobal();
          window.location.href = "/";
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
            alert('Tu sesión ha expirado por seguridad. Por favor, vuelve a iniciar sesión.');
            window.location.href = '/'; 
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