import { Link } from 'react-router-dom';

// Página pública requerida por Google Play (URL de política de privacidad)
const CORREO_SOPORTE = 'soporte@agentesolutions.com';
const ULTIMA_ACTUALIZACION = '28 de octubre de 2026';

const Seccion = ({ titulo, children }) => (
  <section style={{ marginBottom: '28px' }}>
    <h2 style={{ fontSize: '1.15rem', color: '#f26522', marginBottom: '10px' }}>{titulo}</h2>
    <div style={{ lineHeight: 1.65, color: '#ddd', fontSize: '0.98rem' }}>{children}</div>
  </section>
);

const PoliticaPrivacidad = () => {
  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', backgroundColor: '#111', color: '#fff', padding: '32px 16px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h1 style={{ fontStyle: 'italic', marginBottom: '6px' }}>AVISO DE PRIVACIDAD</h1>
        <p style={{ color: '#999', marginBottom: '32px' }}>Agente Solutions · Última actualización: {ULTIMA_ACTUALIZACION}</p>

        <Seccion titulo="1. Responsable">
          <p>
            Agente Solutions (“nosotros”) es responsable del tratamiento de los datos personales que se recaban a través
            de la aplicación móvil y el sitio web Agente Solutions, conforme a la Ley Federal de Protección de Datos
            Personales en Posesión de los Particulares. Contacto: <a href={`mailto:${CORREO_SOPORTE}`} style={{ color: '#f26522' }}>{CORREO_SOPORTE}</a>.
          </p>
        </Seccion>

        <Seccion titulo="2. Datos que recabamos">
          <ul style={{ paddingLeft: '20px' }}>
            <li><b>Identificación y contacto:</b> nombre, correo electrónico, teléfono y, en el caso de técnicos, CURP y especialidades.</li>
            <li><b>Datos de inmuebles y servicios:</b> direcciones, zonas, equipos registrados, órdenes de trabajo, cotizaciones, reportes y firmas.</li>
            <li><b>Fotografías, videos y documentos</b> que el usuario captura o adjunta como evidencia de los trabajos.</li>
            <li><b>Ubicación precisa:</b> se usa al registrar una propiedad o un trabajo y, para el personal que lo autoriza expresamente, para mostrar su posición al equipo mientras la aplicación está abierta. La ubicación no se recaba en segundo plano.</li>
            <li><b>Identificador de notificaciones</b> del dispositivo, para enviar avisos de trabajos y alarmas.</li>
            <li><b>Datos de pago:</b> los pagos se procesan a través de MercadoPago. No almacenamos números de tarjeta; solo conservamos el estado y el monto de la transacción.</li>
          </ul>
        </Seccion>

        <Seccion titulo="3. Para qué usamos los datos">
          <ul style={{ paddingLeft: '20px' }}>
            <li>Crear y administrar tu cuenta y autenticarte.</li>
            <li>Asignar, ejecutar y documentar servicios de mantenimiento en inmuebles.</li>
            <li>Generar cotizaciones, reportes y comprobantes.</li>
            <li>Enviarte notificaciones relacionadas con tus servicios.</li>
            <li>Prevenir fraude y abuso (por ejemplo, con Google reCAPTCHA en el registro).</li>
          </ul>
          <p>No vendemos tus datos personales ni los usamos con fines publicitarios.</p>
        </Seccion>

        <Seccion titulo="4. Con quién compartimos los datos">
          <p>Solo con los proveedores necesarios para operar el servicio:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>Railway (alojamiento de servidores y base de datos).</li>
            <li>Google (Maps para ubicación y reCAPTCHA para seguridad).</li>
            <li>OneSignal (envío de notificaciones push).</li>
            <li>MercadoPago (procesamiento de pagos).</li>
          </ul>
          <p>
            Los datos de un servicio también son visibles para los participantes de ese servicio (por ejemplo, el cliente,
            el técnico asignado y la empresa que lo administra). Toda la información viaja cifrada mediante HTTPS.
          </p>
        </Seccion>

        <Seccion titulo="5. Conservación y eliminación">
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Puedes eliminar tu cuenta desde la sección de perfil de
            la aplicación o desde <Link to="/eliminar-cuenta" style={{ color: '#f26522' }}>esta página</Link>, sin necesidad
            de tener la app instalada. Al eliminarla, tu acceso se desactiva de inmediato y tus datos personales se eliminan
            o anonimizan en un plazo máximo de 90 días. Podemos conservar la información que la ley nos obligue a guardar
            (por ejemplo, registros fiscales de pagos) y los reportes de servicios realizados que pertenecen a la empresa
            que los contrató.
          </p>
        </Seccion>

        <Seccion titulo="6. Tus derechos (ARCO)">
          <p>
            Puedes solicitar el acceso, rectificación, cancelación u oposición al tratamiento de tus datos, así como revocar
            tu consentimiento, escribiendo a <a href={`mailto:${CORREO_SOPORTE}`} style={{ color: '#f26522' }}>{CORREO_SOPORTE}</a>.
            Responderemos en un plazo máximo de 20 días hábiles.
          </p>
        </Seccion>

        <Seccion titulo="7. Menores de edad">
          <p>La aplicación está dirigida a personas mayores de 18 años y no recaba intencionalmente datos de menores.</p>
        </Seccion>

        <Seccion titulo="8. Cambios a este aviso">
          <p>Publicaremos cualquier cambio en esta misma página e indicaremos la fecha de la última actualización.</p>
        </Seccion>

        <Link to="/" style={{ color: '#f26522', fontWeight: 'bold' }}>← Volver al inicio</Link>
      </div>
    </div>
  );
};

export default PoliticaPrivacidad;
