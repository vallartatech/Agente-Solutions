import React, { useState } from "react";
import axios from "axios";
import { CreditCard, X, ShieldCheck } from "lucide-react";

const ModalCompraEspacios = ({ isOpen, onClose, tenantId, userId, planName }) => {
  const [extraQuantity, setExtraQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Determinar el nombre del plan para el subtítulo
  const resolvedPlanName = planName || (() => {
    try {
      const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
      const roleId = session?.userData?.role_id;
      if (roleId === 4) return 'Empresarial';
      if (roleId === 5) return 'Personal';
      return 'Personal';
    } catch {
      return 'Personal';
    }
  })();

  const handlePagar = async () => {
    const targetId = tenantId || userId || 1;
    if (!targetId) {
      setError("ID de empresa no identificado. Intenta recargar la página.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const origin = window.location.origin;
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercadopago/subscription/${targetId}`,
        {
          plan_option: "monthly",
          type: "extra_property",
          quantity: extraQuantity,
          ...(userId ? { user_id: userId } : {})
        },
        { headers: { Origin: origin } }
      );

      const url = import.meta.env.DEV ? res.data.sandbox_init_point : res.data.init_point;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Enlace de pago no devuelto por MercadoPago");
      }
    } catch (e) {
      console.error(e);
      setError("No se pudo generar el enlace de pago con MercadoPago. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const total = (79.99 * extraQuantity).toFixed(2);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        overflowY: "auto"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#0d1117",
          border: "2px solid #FF6600",
          borderRadius: "28px",
          width: "100%",
          maxWidth: "520px",
          padding: "36px 30px",
          boxShadow: "0 20px 60px rgba(255, 102, 0, 0.3), 0 0 30px rgba(0, 0, 0, 0.9)",
          position: "relative",
          color: "#fff",
          textAlign: "center",
          animation: "fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          boxSizing: "border-box"
        }}
      >
        {/* Botón de Cerrar */}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "50%",
            width: "38px",
            height: "38px",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s"
          }}
          onMouseOver={(e) => !loading && (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
          title="Cerrar modal"
        >
          <X size={20} />
        </button>

        {/* Ícono superior */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "rgba(255, 102, 0, 0.12)",
            border: "2px solid #FF6600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            boxShadow: "0 0 20px rgba(255, 102, 0, 0.25)"
          }}
        >
          <CreditCard size={36} color="#FF6600" />
        </div>

        {/* Título Principal */}
        <h3
          style={{
            fontSize: "1.6rem",
            fontWeight: 900,
            margin: "0 0 8px 0",
            letterSpacing: "-0.5px",
            lineHeight: 1.25,
            color: "#ffffff"
          }}
        >
          🏠 AMPLIACIÓN DE PORTAFOLIO (+{extraQuantity})
        </h3>

        {/* Subtítulo Dinámico */}
        <p
          style={{
            color: "#FF6600",
            fontWeight: 800,
            fontSize: "1rem",
            margin: "0 0 16px 0",
            letterSpacing: "0.2px"
          }}
        >
          Adquiere Espacios para Propiedades en tu Plan {resolvedPlanName}
        </p>

        {/* Descripción exacta */}
        <p
          style={{
            color: "#9CA3AF",
            fontSize: "0.92rem",
            lineHeight: 1.6,
            marginBottom: "22px",
            textAlign: "center"
          }}
        >
          Selecciona cuántos espacios de propiedad deseas agregar a tu cuenta. Cada espacio adicional tiene un costo único de <strong style={{ color: "#ffffff" }}>$79.99 MXN</strong>.
        </p>

        {/* Caja de Selector de Cantidad */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "18px",
            padding: "18px 20px",
            marginBottom: "22px"
          }}
        >
          <label
            style={{
              color: "#D1D5DB",
              fontSize: "0.88rem",
              fontWeight: 700,
              display: "block",
              marginBottom: "14px"
            }}
          >
            ¿Cuántos espacios de propiedad necesitas?
          </label>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px",
              marginBottom: "18px"
            }}
          >
            <button
              type="button"
              onClick={() => setExtraQuantity(Math.max(1, extraQuantity - 1))}
              disabled={loading}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "2px solid #FF6600",
                background: "rgba(255, 102, 0, 0.15)",
                color: "#fff",
                fontWeight: 900,
                fontSize: "1.5rem",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s"
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.background = "rgba(255, 102, 0, 0.35)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 102, 0, 0.15)")}
            >
              -
            </button>

            <span
              style={{
                fontSize: "2.2rem",
                fontWeight: 900,
                color: "#FF6600",
                minWidth: "50px",
                display: "inline-block",
                textAlign: "center"
              }}
            >
              {extraQuantity}
            </span>

            <button
              type="button"
              onClick={() => setExtraQuantity(extraQuantity + 1)}
              disabled={loading}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "2px solid #FF6600",
                background: "rgba(255, 102, 0, 0.15)",
                color: "#fff",
                fontWeight: 900,
                fontSize: "1.5rem",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s"
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.background = "rgba(255, 102, 0, 0.35)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 102, 0, 0.15)")}
            >
              +
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#F3F4F6",
              fontSize: "1.05rem",
              fontWeight: 800,
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              paddingTop: "14px",
              flexWrap: "wrap",
              gap: "8px"
            }}
          >
            <span>Total a Pagar ({extraQuantity} {extraQuantity === 1 ? "espacio" : "espacios"}):</span>
            <span style={{ color: "#10B981", fontSize: "1.25rem", fontWeight: 900 }}>${total} MXN</span>
          </div>
        </div>

        {error && (
          <p
            style={{
              color: "#EF4444",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "12px",
              borderRadius: "10px",
              fontSize: "0.88rem",
              marginBottom: "18px",
              fontWeight: 600
            }}
          >
            {error}
          </p>
        )}

        {/* Botón de Pago MercadoPago */}
        <button
          onClick={handlePagar}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "50px",
            border: "none",
            background: "linear-gradient(135deg, #FF6600 0%, #ea580c 100%)",
            color: "#fff",
            fontWeight: 900,
            fontSize: "1.08rem",
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.5px",
            boxShadow: "0 8px 24px rgba(255, 102, 0, 0.45)",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px"
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "0 10px 28px rgba(255, 102, 0, 0.6)";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(255, 102, 0, 0.45)";
          }}
        >
          {loading ? (
            <span>⌛ GENERANDO ENLACE...</span>
          ) : (
            <>
              <CreditCard size={22} />
              <span>PAGAR ${total} CON MERCADOPAGO</span>
            </>
          )}
        </button>

        <div
          style={{
            marginTop: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            color: "#9CA3AF",
            fontSize: "0.8rem"
          }}
        >
          <ShieldCheck size={16} color="#10B981" />
          <span>Pago 100% seguro y encriptado por MercadoPago</span>
        </div>
      </div>
    </div>
  );
};

export default ModalCompraEspacios;

