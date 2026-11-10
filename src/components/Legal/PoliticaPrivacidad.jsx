// src/components/Legal/PoliticaPrivacidad.jsx  (ruta pública: ver App.jsx)
// Aviso de Privacidad público de la app Agente Solutions.
// IMPORTANTE: esta ruta debe abrir SIN iniciar sesión (fuera de cualquier ruta protegida).

const EMPRESA = {
  responsable: "Jorge Ernesto Vallarta Sosa",
  nombreComercial: "Agente Solutions",
  domicilio:
    "Calle 69 #273 por 48 y 46, Unidad Habitacional Cordemex, C.P. 97115, Mérida, Yucatán, México",
  correo: "contacto@agentesolutions.com.mx",
  telefono: "999 242 6030",
  encargadaDatos: "Tania A. García Montero, Asistente de Dirección",
  telefonoEncargada: "999 110 0088",
  url: "app.agentesolutions.com.mx/privacidad",
  ultimaActualizacion: "9 de noviembre de 2026",
};

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
  h1: { fontSize: "clamp(28px, 6vw, 44px)", fontWeight: 900, margin: "0 0 4px", letterSpacing: 1 },
  sub: { color: C.suave, fontWeight: 600, margin: "0 0 24px" },
  h2: { color: C.naranja, fontSize: 22, fontWeight: 800, margin: "36px 0 10px" },
  ul: { paddingLeft: 22, margin: "8px 0" },
  li: { marginBottom: 8 },
  a: { color: C.naranja, textDecoration: "none", fontWeight: 700 },
  caja: {
    border: `1px solid ${C.borde}`,
    borderRadius: 12,
    padding: "14px 18px",
    margin: "12px 0",
    background: "#181818",
  },
  volver: {
    display: "inline-block",
    marginTop: 40,
    padding: "10px 20px",
    borderRadius: 999,
    background: C.naranja,
    color: "#fff",
    fontWeight: 800,
    textDecoration: "none",
  },
};

export default function PoliticaPrivacidad() {
  const e = EMPRESA;
  const mail = (
    <a style={s.a} href={`mailto:${e.correo}`}>
      {e.correo}
    </a>
  );

  return (
    <div style={s.wrap}>
      <main style={s.page}>
        <h1 style={s.h1}>AVISO DE PRIVACIDAD</h1>
        <p style={s.sub}>
          {e.nombreComercial} · Última actualización: {e.ultimaActualizacion}
        </p>

        {/* 1 */}
        <h2 style={s.h2}>1. Responsable</h2>
        <p>
          <strong>{e.responsable}</strong>, con nombre comercial <strong>{e.nombreComercial}</strong>{" "}
          ("nosotros"), con domicilio en {e.domicilio}, es responsable del tratamiento de los datos
          personales que se recaban a través de la aplicación móvil y el sitio web {e.nombreComercial}{" "}
          (app.agentesolutions.com.mx), conforme a la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares.
        </p>
        <div style={s.caja}>
          <strong>Contacto de privacidad</strong>
          <br />
          Encargada de datos personales: {e.encargadaDatos} · Tel. {e.telefonoEncargada}
          <br />
          Correo: {mail} · Tel. {e.telefono}
        </div>

        {/* 2 */}
        <h2 style={s.h2}>2. A quién aplica</h2>
        <ul style={s.ul}>
          <li style={s.li}>Clientes que se registran por sí mismos en la aplicación.</li>
          <li style={s.li}>
            Personal y colaboradores a quienes asignamos una cuenta: administradores, técnicos, técnicos de
            red, técnicos de cuadrilla, encargados de cuadrilla y agentes inmobiliarios.
          </li>
        </ul>

        {/* 3 */}
        <h2 style={s.h2}>3. Datos que recabamos</h2>
        <ul style={s.ul}>
          <li style={s.li}>
            <strong>Identificación y contacto:</strong> nombre, correo electrónico, teléfono, fecha de
            nacimiento, foto de perfil, domicilio o dirección del servicio, usuario y contraseña
            (almacenada de forma cifrada). En el caso de técnicos, también sus especialidades.
          </li>
          <li style={s.li}>
            <strong>Técnicos de la red, encargados y técnicos de cuadrilla:</strong> RFC, razón social,
            banco, titular y CLABE interbancaria (el RFC y la CLABE se almacenan cifrados); copia de
            identificación oficial (INE), comprobante de domicilio, constancia de antecedentes penales,
            diplomas o constancias de cursos, y currículum (estudios, experiencia y presentación).
          </li>
          <li style={s.li}>
            <strong>Inmuebles y servicios:</strong> direcciones, zonas, áreas, equipos registrados, órdenes
            de trabajo, cotizaciones, reportes, comprobantes de gastos, calificaciones y reseñas, y códigos
            QR de acceso a inmuebles.
          </li>
          <li style={s.li}>
            <strong>Fotografías, videos y documentos</strong> que el usuario captura con la cámara o
            adjunta desde su dispositivo como evidencia de los trabajos o de los inmuebles.
          </li>
          <li style={s.li}>
            <strong>Ubicación precisa:</strong> se usa al registrar una propiedad o un trabajo y, para el
            personal que lo autoriza expresamente, para mostrar su posición al equipo mientras la
            aplicación está abierta. <strong>La ubicación no se recaba en segundo plano.</strong>
          </li>
          <li style={s.li}>
            <strong>Notificaciones:</strong> identificador de notificaciones del dispositivo, para enviar
            avisos de trabajos y alarmas.
          </li>
          <li style={s.li}>
            <strong>Datos de pago:</strong> los pagos se procesan a través de MercadoPago. No almacenamos
            el número completo de la tarjeta; conservamos el folio, monto, fecha y estado de la
            transacción, y la información que MercadoPago nos devuelve, como el nombre del titular y los
            últimos 4 dígitos de la tarjeta.
          </li>
          <li style={s.li}>
            <strong>Mensajes:</strong> mensajes de chat y archivos adjuntos que intercambian clientes,
            técnicos y personal dentro de la aplicación.
          </li>
          <li style={s.li}>
            <strong>Datos técnicos:</strong> dirección IP, navegador o tipo de dispositivo, sistema
            operativo, fecha y hora de acceso y registros necesarios para el funcionamiento y la seguridad
            del servicio.
          </li>
        </ul>
        <p>
          No solicitamos datos sobre origen étnico, estado de salud, creencias religiosas o filosóficas,
          opiniones políticas ni preferencias sexuales.
        </p>
        <div style={s.caja}>
          <strong>Datos financieros, de identificación y antecedentes</strong>
          <br />
          La CLABE y los datos bancarios son datos financieros; la INE es una identificación oficial; y la
          constancia de antecedentes penales es información especialmente delicada. Solo se solicitan a
          técnicos de la red, encargados y técnicos de cuadrilla, y su tratamiento requiere su{" "}
          <strong>consentimiento expreso</strong>, que se otorga marcando la casilla correspondiente al
          completar su perfil profesional. Se almacenan en un área privada, el RFC y la CLABE de forma
          cifrada, y solo el personal administrativo autorizado tiene acceso.
        </div>

        {/* 4 */}
        <h2 style={s.h2}>4. Para qué usamos sus datos</h2>
        <p>
          <strong>Finalidades principales</strong> (necesarias para prestar el servicio):
        </p>
        <ul style={s.ul}>
          <li style={s.li}>Crear y administrar cuentas y controlar el acceso según el rol asignado.</li>
          <li style={s.li}>
            Recibir, asignar, dar seguimiento y cerrar solicitudes, órdenes de trabajo, cotizaciones y
            servicios.
          </li>
          <li style={s.li}>
            Registrar evidencia (fotografías, videos y ubicación) de los trabajos realizados.
          </li>
          <li style={s.li}>Mostrar ubicaciones en mapas y coordinar al personal en campo.</li>
          <li style={s.li}>Enviar notificaciones sobre trabajos, asignaciones y alarmas.</li>
          <li style={s.li}>Procesar y registrar pagos.</li>
          <li style={s.li}>
            En el caso de técnicos de la red, encargados y técnicos de cuadrilla: verificar su identidad y
            domicilio (INE y comprobante de domicilio), evaluar su idoneidad y la seguridad de los
            clientes antes de aceptarlos en la red (antecedentes penales, diplomas y currículum), emitir o
            recibir comprobantes fiscales (RFC y razón social) y pagarles por los trabajos realizados
            (banco, titular y CLABE).
          </li>
          <li style={s.li}>Comunicarnos con usted sobre su cuenta o sus servicios.</li>
          <li style={s.li}>Mantener la seguridad de la aplicación y prevenir usos indebidos.</li>
        </ul>
        <p>
          <strong>Finalidades secundarias</strong> (opcionales):
        </p>
        <ul style={s.ul}>
          <li style={s.li}>Enviar información sobre nuevos servicios o promociones.</li>
          <li style={s.li}>Evaluar la calidad del servicio mediante encuestas.</li>
        </ul>
        <p>
          Si no desea que sus datos se usen para las finalidades secundarias, escríbanos a {mail}. Esto no
          afectará el servicio que recibe.
        </p>

        {/* 5 */}
        <h2 style={s.h2}>5. Con quién compartimos sus datos</h2>
        <p>
          No vendemos ni rentamos sus datos personales. Para operar la aplicación utilizamos proveedores
          que tratan datos por nuestra cuenta:
        </p>
        <ul style={s.ul}>
          <li style={s.li}>
            <strong>Google Maps (Google LLC):</strong> visualización de mapas y ubicaciones.
          </li>
          <li style={s.li}>
            <strong>OneSignal:</strong> envío de notificaciones push.
          </li>
          <li style={s.li}>
            <strong>MercadoPago:</strong> procesamiento de pagos; recibe directamente los datos de pago que
            usted captura.
          </li>
          <li style={s.li}>
            <strong>Google reCAPTCHA:</strong> protección contra registros y accesos automatizados.
          </li>
          <li style={s.li}>
            <strong>Cloudinary:</strong> almacenamiento de fotografías, videos y archivos de evidencia,
            comprobantes y adjuntos de chat.
          </li>
          <li style={s.li}>
            <strong>Railway:</strong> hospedaje en la nube de la aplicación, su base de datos y documentos
            privados (como INE y comprobantes de los técnicos).
          </li>
        </ul>
        <p>
          Algunos de estos proveedores pueden estar ubicados fuera de México y tratan los datos conforme a
          sus propias políticas de privacidad. También podremos compartir datos cuando lo requiera una
          autoridad competente conforme a la ley.
        </p>

        {/* 6 */}
        <h2 style={s.h2}>6. Permisos del dispositivo</h2>
        <p>
          La aplicación puede solicitar acceso a la <strong>ubicación</strong>, la{" "}
          <strong>cámara</strong>, las <strong>fotos, videos y archivos</strong> y las{" "}
          <strong>notificaciones</strong>. Cada permiso se solicita solo cuando se necesita para una
          función y puede retirarse en cualquier momento desde la configuración del dispositivo; algunas
          funciones podrían dejar de estar disponibles.
        </p>

        {/* 7 */}
        <h2 style={s.h2}>7. Conservación y seguridad</h2>
        <p>
          Conservamos los datos mientras la cuenta esté activa. Si usted solicita eliminar su cuenta, sus
          datos se eliminan o anonimizan 30 días después de la solicitud. Se conservan, sin vincularse a su
          nombre: los registros de pagos (monto, fecha, estado y folio), sin su correo ni datos de la
          tarjeta, como registro contable de la empresa; los comprobantes de gastos, como documentos
          fiscales de la empresa; y las fotografías y videos de evidencia de trabajos y de inmuebles, como
          historial de los servicios (ver{" "}
          <a style={s.a} href="/eliminar-cuenta">
            Eliminar cuenta y datos
          </a>
          ). Aplicamos
          medidas de seguridad administrativas, técnicas y físicas, como conexión cifrada (HTTPS),
          contraseñas cifradas y control de acceso por roles.
        </p>

        {/* 8 */}
        <h2 style={s.h2}>8. Sus derechos ARCO</h2>
        <p>
          Usted puede <strong>Acceder</strong> a sus datos, <strong>Rectificarlos</strong>,{" "}
          <strong>Cancelarlos</strong> u <strong>Oponerse</strong> a su uso, así como revocar su
          consentimiento o limitar su uso. Envíe su solicitud a {mail} indicando:
        </p>
        <ul style={s.ul}>
          <li style={s.li}>Su nombre y un medio para responderle.</li>
          <li style={s.li}>Copia de una identificación oficial.</li>
          <li style={s.li}>La descripción clara de lo que solicita.</li>
          <li style={s.li}>Cualquier documento que ayude a localizar sus datos.</li>
        </ul>
        <p>Responderemos dentro de los plazos que establece la ley.</p>

        {/* 9 */}
        <h2 style={s.h2}>9. Eliminación de cuenta</h2>
        <p>
          Puede eliminar su cuenta desde la aplicación (Perfil → <strong>"Eliminar mi Cuenta"</strong>) o
          escribiendo a {mail} con el asunto <strong>"Eliminar cuenta"</strong>. La cuenta se desactiva de
          inmediato y sus datos se eliminan o anonimizan de forma definitiva 30 días después, salvo los
          registros de pagos que debemos conservar por obligación fiscal. Consulte el detalle en{" "}
          <a style={s.a} href="/eliminar-cuenta">
            Eliminar cuenta y datos
          </a>
          .
        </p>

        {/* 10 */}
        <h2 style={s.h2}>10. Menores de edad</h2>
        <p>
          La aplicación está dirigida a personas mayores de 18 años y no recaba intencionalmente datos de
          menores de edad.
        </p>

        {/* 11 */}
        <h2 style={s.h2}>11. Cambios a este aviso</h2>
        <p>
          Podemos actualizar este aviso. Cualquier cambio se publicará en esta misma página ({e.url}) con
          su fecha de actualización.
        </p>

        {/* 12 */}
        <h2 style={s.h2}>12. Autoridad</h2>
        <p>
          Si considera que su derecho a la protección de datos personales ha sido vulnerado, puede acudir a
          la Secretaría Anticorrupción y Buen Gobierno, autoridad competente en la materia.
        </p>

        <a href="/" style={s.volver}>
          ← Volver a la app
        </a>
      </main>
    </div>
  );
}
