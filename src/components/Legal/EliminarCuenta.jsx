// src/components/Legal/EliminarCuenta.jsx  (ruta pública: ver App.jsx)
// Página pública para solicitar la eliminación de cuenta y/o datos (requisito de Google Play).
// IMPORTANTE: esta ruta debe abrir SIN iniciar sesión (fuera de cualquier ruta protegida).

import { useState } from "react";
import axios from "axios";

const CORREO = "contacto@agentesolutions.com.mx";
const TELEFONO = "999 242 6030";

const C = {
  bg: "#111111",
  texto: "#f3f4f6",
  suave: "#9ca3af",
  naranja: "#FF6600",
  borde: "#2a2a2a",
};

const s = {
  wrap: { background: C.bg, minHeight: "100vh", width: "100%" },
  page: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "40px 16px 80px",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    lineHeight: 1.7,
    color: C.texto,
    fontSize: 16,
  },
  h1: { fontSize: "clamp(26px, 5.5vw, 40px)", fontWeight: 900, margin: "0 0 4px", letterSpacing: 1 },
  sub: { color: C.suave, fontWeight: 600, margin: "0 0 24px" },
  h2: { color: C.naranja, fontSize: 22, fontWeight: 800, margin: "36px 0 10px" },
  ul: { paddingLeft: 22, margin: "8px 0" },
  ol: { paddingLeft: 22, margin: "8px 0" },
  li: { marginBottom: 8 },
  a: { color: C.naranja, textDecoration: "none", fontWeight: 700 },
  caja: {
    border: `1px solid ${C.borde}`,
    borderRadius: 12,
    padding: "14px 18px",
    margin: "12px 0",
    background: "#181818",
  },
  boton: {
    display: "inline-block",
    marginTop: 12,
    padding: "12px 22px",
    borderRadius: 999,
    background: C.naranja,
    color: "#fff",
    fontWeight: 800,
    textDecoration: "none",
  },
  volver: { display: "inline-block", marginTop: 40, color: C.suave, textDecoration: "none" },
  form: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 420, marginTop: 12 },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: `1px solid ${C.borde}`,
    background: "#fff",
    color: "#111",
    fontSize: 16,
    boxSizing: "border-box",
  },
  check: { display: "flex", gap: 10, alignItems: "flex-start", color: C.suave, fontSize: 15, cursor: "pointer" },
  botonForm: {
    padding: "12px 22px",
    borderRadius: 999,
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
  },
};

// Opción 2: inicia sesión y solicita la eliminación (mismo flujo de 30 días que en la app)
function FormularioEliminar() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);

  const enviar = async (ev) => {
    ev.preventDefault();
    if (!confirmado) {
      setMensaje("Debe confirmar que entiende que, pasados 30 días, la eliminación no se puede deshacer.");
      return;
    }
    setCargando(true);
    setMensaje("");
    try {
      const api = import.meta.env.VITE_API_BASE_URL;
      const login = await axios.post(`${api}/login`, { email, password });
      const token = login.data?.token;
      if (!token) throw new Error("Sin token");
      const res = await axios.delete(`${api}/users/delete-my-account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExito(true);
      setMensaje(
        res.data?.message ||
          "Tu cuenta se eliminará definitivamente en 30 días. Si fue un error, contacta a soporte."
      );
    } catch (error) {
      setExito(false);
      const d = error.response?.data;
      setMensaje(d?.error || d?.message || `No se pudo procesar la solicitud. Escríbanos a ${CORREO}.`);
    } finally {
      setCargando(false);
    }
  };

  if (exito) {
    return <div style={{ ...s.caja, borderColor: "#16a34a", color: "#86efac" }}>{mensaje}</div>;
  }

  return (
    <form onSubmit={enviar} style={s.form}>
      <input
        type="text"
        placeholder="Correo o teléfono de la cuenta"
        value={email}
        onChange={(ev) => setEmail(ev.target.value)}
        autoComplete="username"
        required
        style={s.input}
      />
      <div style={{ position: "relative" }}>
        <input
          type={verPassword ? "text" : "password"}
          placeholder="Contraseña"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          autoComplete="current-password"
          required
          style={{ ...s.input, paddingRight: 80 }}
        />
        <button
          type="button"
          onClick={() => setVerPassword(!verPassword)}
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14 }}
        >
          {verPassword ? "Ocultar" : "Ver"}
        </button>
      </div>
      <label style={s.check}>
        <input
          type="checkbox"
          checked={confirmado}
          onChange={(ev) => setConfirmado(ev.target.checked)}
          style={{ marginTop: 5, accentColor: C.naranja }}
        />
        Entiendo que mi cuenta se desactiva de inmediato y que, pasados 30 días, la eliminación no se puede
        deshacer.
      </label>
      <button type="submit" disabled={cargando} style={{ ...s.botonForm, opacity: cargando ? 0.6 : 1 }}>
        {cargando ? "Procesando..." : "Eliminar mi cuenta"}
      </button>
      {mensaje && <p style={{ color: "#f87171", margin: 0 }}>{mensaje}</p>}
    </form>
  );
}

export default function EliminarCuenta() {
  const asunto = encodeURIComponent("Eliminar cuenta - Agente Solutions");
  const cuerpo = encodeURIComponent(
    "Solicito la eliminación de mi cuenta de Agente Solutions.\n\n" +
      "Nombre completo:\n" +
      "Correo o usuario de la cuenta:\n" +
      "Teléfono registrado:\n\n" +
      "(Si solo desea eliminar algunos datos y conservar su cuenta, indíquelo aquí.)"
  );
  const mail = (
    <a style={s.a} href={`mailto:${CORREO}`}>
      {CORREO}
    </a>
  );

  return (
    <div style={s.wrap}>
      <main style={s.page}>
        <h1 style={s.h1}>ELIMINAR CUENTA Y DATOS</h1>
        <p style={s.sub}>Agente Solutions · Jorge Ernesto Vallarta Sosa</p>

        <p>
          En esta página se explica cómo solicitar la eliminación de su cuenta de la aplicación{" "}
          <strong>Agente Solutions</strong> (Android y app.agentesolutions.com.mx), o la eliminación de
          algunos de sus datos sin borrar la cuenta.
        </p>

        <h2 style={s.h2}>Opción 1: desde la aplicación</h2>
        <ol style={s.ol}>
          <li style={s.li}>Inicie sesión en la aplicación Agente Solutions.</li>
          <li style={s.li}>
            Toque su foto de perfil para abrir su perfil. Si su perfil profesional todavía está en
            revisión, encontrará la opción en la pantalla "Completar perfil".
          </li>
          <li style={s.li}>
            Toque <strong>"Eliminar mi Cuenta"</strong> y confirme.
          </li>
        </ol>

        <h2 style={s.h2}>Opción 2: desde esta página</h2>
        <p>
          Ingrese el correo (o teléfono) y la contraseña de su cuenta. Su cuenta se desactivará de inmediato
          y se eliminará de forma definitiva en 30 días.
        </p>
        <FormularioEliminar />

        <h2 style={s.h2}>Opción 3: por correo (sin necesidad de la app)</h2>
        <ol style={s.ol}>
          <li style={s.li}>
            Envíe un correo a {mail} <strong>desde el correo registrado en su cuenta</strong>, con el
            asunto <strong>"Eliminar cuenta"</strong>.
          </li>
          <li style={s.li}>
            Incluya su nombre completo, el correo o usuario de la cuenta y su teléfono registrado.
          </li>
          <li style={s.li}>
            Si solo desea borrar algunos datos (por ejemplo, fotografías o su ubicación registrada) y
            conservar su cuenta, indique cuáles.
          </li>
          <li style={s.li}>
            Le confirmaremos la recepción y, si es necesario, verificaremos su identidad antes de proceder.
          </li>
        </ol>
        <a style={s.boton} href={`mailto:${CORREO}?subject=${asunto}&body=${cuerpo}`}>
          Solicitar eliminación por correo
        </a>
        <p style={{ color: C.suave, marginTop: 12 }}>
          ¿Dudas? Llame al {TELEFONO}.
        </p>

        <h2 style={s.h2}>Qué pasa después</h2>
        <ol style={s.ol}>
          <li style={s.li}>
            Su cuenta se <strong>desactiva de inmediato</strong> y ya no podrá iniciar sesión.
          </li>
          <li style={s.li}>
            Durante <strong>30 días</strong> puede cancelar la eliminación contactando a soporte, por si
            fue un error.
          </li>
          <li style={s.li}>
            Al cumplirse los 30 días, sus datos se <strong>eliminan de forma definitiva</strong> como se
            describe abajo.
          </li>
        </ol>

        <h2 style={s.h2}>Datos que se eliminan</h2>
        <ul style={s.ul}>
          <li style={s.li}>
            Datos de la cuenta: nombre, correo, teléfono, fecha de nacimiento, contraseña, foto de perfil
            y de portada.
          </li>
          <li style={s.li}>Especialidades (en el caso de técnicos).</li>
          <li style={s.li}>
            En técnicos de la red, encargados y técnicos de cuadrilla: RFC, razón social, banco, titular,
            CLABE, copia de INE, comprobante de domicilio, constancia de antecedentes penales, diplomas y
            currículum.
          </li>
          <li style={s.li}>Ubicaciones registradas del usuario.</li>
          <li style={s.li}>
            Foto de perfil y de portada, documentos personales (KYC) y archivos adjuntos en chats.
          </li>
          <li style={s.li}>
            Mensajes de chat y sus adjuntos, y el texto de las reseñas que haya escrito.
          </li>
          <li style={s.li}>Sesiones, notificaciones e identificador de notificaciones del dispositivo.</li>
        </ul>

        <h2 style={s.h2}>Datos que se conservan</h2>
        <div style={s.caja}>
          <ul style={{ ...s.ul, margin: 0 }}>
            <li style={s.li}>
              <strong>Registros de pagos</strong> (monto, fecha, estado y folio): se conservan de forma
              anonimizada, sin su nombre, correo ni datos de la tarjeta, como registro contable de la
              empresa.
            </li>
            <li style={s.li}>
              <strong>Fotografías y videos de evidencia de trabajos y de inmuebles:</strong> se conservan sin
              vincularse a su nombre, como historial de los servicios.
            </li>
            <li style={s.li}>
              <strong>Comprobantes de gastos</strong> registrados en los servicios: se conservan como
              documentos fiscales de la empresa.
            </li>
            <li style={s.li}>
              <strong>Órdenes de trabajo, reportes y calificaciones numéricas:</strong> se conservan de
              forma <strong>anonimizada</strong> (aparecen como "Usuario eliminado", sin datos que lo
              identifiquen) como historial de los servicios.
            </li>
            <li style={s.li}>
              <strong>Propiedades:</strong> la dirección y la foto de fachada de los inmuebles atendidos se
              conservan, desvinculadas de su nombre, como historial de servicio del inmueble.
            </li>
            <li style={s.li}>
              <strong>Empresas:</strong> si usted es dueño de una empresa registrada en la app, se elimina
              su información personal, pero la empresa y la información de sus demás usuarios se
              conservan.
            </li>
            <li style={s.li}>
              <strong>Copias de seguridad:</strong> los datos eliminados pueden permanecer en respaldos
              hasta por <strong>90 días</strong>, después de los cuales se borran de forma definitiva.
            </li>
          </ul>
        </div>

        <h2 style={s.h2}>Más información</h2>
        <p>
          Consulte nuestro{" "}
          <a style={s.a} href="/privacidad">
            Aviso de Privacidad
          </a>
          .
        </p>

        <a href="/" style={s.volver}>
          ← Volver a la app
        </a>
      </main>
    </div>
  );
}
