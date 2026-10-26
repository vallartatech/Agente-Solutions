// ReporteTrabajo.jsx
import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import "../../../styles/AgenteSolutions/Cliente/ReporteTrabajo.css";
import logo from '../../../assets/fondo.png';
import { esVideoUrl } from '../../../utils/evidencia';

const ReporteTrabajo = ({ trabajo, propiedad, tecnico, cliente, imagenes }) => {
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Reporte_Trabajo_${trabajo?.id || "Nuevo"}`,
    onAfterPrint: () => console.log("Reporte impreso"),
  });

  const datosReporte = {
    folio: trabajo?.id || "FT-2024-001",
    fechaEmision: new Date().toLocaleDateString("es-MX"),
    fechaTrabajo: trabajo?.fecha || "15/04/2024",
    horaInicio: trabajo?.hora_inicio || "09:00 AM",
    horaFin: trabajo?.hora_fin || "02:00 PM",
    
    cliente: {
      nombre: cliente?.nombre || "Carlos Basulto",
      telefono: cliente?.telefono || "999-123-4567",
      correo: cliente?.correo || "carlos@email.com",
      direccion: cliente?.direccion || "Calle Principal #123, Colonia Centro",
    },
    
    propiedad: {
      nombre: propiedad?.nombre || "Residencia Los Pinos",
      direccion: propiedad?.direccion || "Av. Las Torres #456, Mérida, Yucatán",
      tipo: propiedad?.tipo || "Casa Habitación",
      superficie: propiedad?.superficie || "250 m²",
    },
    
    tecnico: {
      nombre: tecnico?.nombre || "Jorge Casas",
      especialidad: tecnico?.especialidad || "Electricidad y Fontanería",
      cedula: tecnico?.cedula || "12345678",
    },
    
    descripcion: trabajo?.descripcion || "Instalación de sistema eléctrico completo, incluyendo cableado, interruptores y centros de carga. Se realizó mantenimiento preventivo en toda la instalación existente.",
    
    materiales: trabajo?.materiales || [
      { nombre: "Cable Calibre 12", cantidad: 3, unidad: "rollos", precio: 850.00 },
      { nombre: "Interruptor Termomagnético", cantidad: 5, unidad: "piezas", precio: 120.00 },
      { nombre: "Contactos Blindados", cantidad: 10, unidad: "piezas", precio: 45.00 },
      { nombre: "Cinta Aislante", cantidad: 2, unidad: "rollos", precio: 25.00 },
    ],
    
    observaciones: trabajo?.observaciones || "Se recomienda realizar mantenimiento cada 6 meses. El cliente quedó satisfecho con el trabajo realizado.",
    
    firmaCliente: trabajo?.firmaCliente || null,
    firmaTecnico: trabajo?.firmaTecnico || null,
  };

  const totalMateriales = datosReporte.materiales.reduce(
    (sum, m) => sum + m.cantidad * m.precio,
    0
  );
  
  const imagenesTrabajo = imagenes || [
    "https://via.placeholder.com/300x200?text=Foto+1",
    "https://via.placeholder.com/300x200?text=Foto+2",
    "https://via.placeholder.com/300x200?text=Foto+3",
  ];

  return (
    <div className="reporte-container">
      <div className="print-actions">
        <button onClick={handlePrint} className="btn-print">
          🖨️ IMPRIMIR REPORTE
        </button>
      </div>

      <div ref={componentRef} className="reporte-content">
        {/* Encabezado Corregido */}
        <div className="reporte-header">
          <div className="header-left">
            <img src={logo} alt="Logo" className="logo-reporte" />
          </div>
          <div className="header-right">
            <div className="folio-box">
              <span className="folio-label">FOLIO:</span>
              <span className="folio-number">{datosReporte.folio}</span>
            </div>
           
          </div>
        </div>

        {/* Título */}
        <div className="reporte-title">
          <h2>REPORTE DE TRABAJO REALIZADO</h2>
          <div className="fecha-trabajo">
            <span>📅 Fecha: {datosReporte.fechaTrabajo}</span>
            <span>⏰ Horario: {datosReporte.horaInicio} - {datosReporte.horaFin}</span>
          </div>
        </div>

        {/* Info Cliente */}
        <div className="info-section">
          <h3>INFORMACIÓN DEL CLIENTE</h3>
          <div className="info-grid-2cols">
            <div className="info-linea">
              <strong>NOMBRE:</strong> <span>{datosReporte.cliente.nombre}</span>
            </div>
            <div className="info-linea">
              <strong>TELÉFONO:</strong> <span>{datosReporte.cliente.telefono}</span>
            </div>
            <div className="info-linea">
              <strong>CORREO:</strong> <span>{datosReporte.cliente.correo}</span>
            </div>
            <div className="info-linea full-width">
              <strong>DIRECCIÓN:</strong> <span>{datosReporte.cliente.direccion}</span>
            </div>
          </div>
        </div>

        {/* Info Propiedad */}
        <div className="info-section">
          <h3>INFORMACIÓN DE LA PROPIEDAD</h3>
          <div className="info-grid-2cols">
            <div className="info-linea">
              <strong>PROPIEDAD:</strong> <span>{datosReporte.propiedad.nombre}</span>
            </div>
            <div className="info-linea">
              <strong>TIPO:</strong> <span>{datosReporte.propiedad.tipo}</span>
            </div>
            <div className="info-linea">
              <strong>SUPERFICIE:</strong> <span>{datosReporte.propiedad.superficie}</span>
            </div>
            <div className="info-linea full-width">
              <strong>UBICACIÓN:</strong> <span>{datosReporte.propiedad.direccion}</span>
            </div>
          </div>
        </div>

        {/* Técnico */}
        <div className="info-section">
          <h3>TÉCNICO RESPONSABLE</h3>
          <div className="info-grid-2cols">
            <div className="info-linea">
              <strong>NOMBRE:</strong> <span>{datosReporte.tecnico.nombre}</span>
            </div>
            <div className="info-linea">
              <strong>ESPECIALIDAD:</strong> <span>{datosReporte.tecnico.especialidad}</span>
            </div>
            <div className="info-linea">
              <strong>CÉDULA:</strong> <span>{datosReporte.tecnico.cedula}</span>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="info-section">
          <h3>DESCRIPCIÓN DEL TRABAJO</h3>
          <div className="descripcion-box">
            <p>{datosReporte.descripcion}</p>
          </div>
        </div>

        {/* Materiales */}
        <div className="info-section">
          <h3>MATERIALES UTILIZADOS</h3>
          <table className="materiales-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Precio Unitario</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {datosReporte.materiales.map((material, idx) => (
                <tr key={idx}>
                  <td>{material.nombre}</td>
                  <td>{material.cantidad}</td>
                  <td>{material.unidad}</td>
                  <td>${material.precio.toFixed(2)}</td>
                  <td>${(material.cantidad * material.precio).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan="4" className="total-label">TOTAL MATERIALES:</td>
                <td className="total-amount">${totalMateriales.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Galería */}
        <div className="info-section">
          <h3>EVIDENCIA FOTOGRÁFICA</h3>
          <div className="galeria-imagenes">
            {imagenesTrabajo.map((img, idx) => (
              <div key={idx} className="imagen-item">
                {esVideoUrl(img)
                  ? <video src={img} controls playsInline style={{ width: '100%', borderRadius: 8 }} />
                  : <img src={img} alt={`Evidencia ${idx + 1}`} />}
                <p>Foto {idx + 1}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Observaciones */}
        <div className="info-section">
          <h3>OBSERVACIONES Y RECOMENDACIONES</h3>
          <div className="observaciones-box">
            <p>{datosReporte.observaciones}</p>
          </div>
        </div>

        {/* Firmas */}
        <div className="firmas-section">
          <div className="firma-cliente">
            <div className="firma-linea">
              {datosReporte.firmaCliente ? (
                <img src={datosReporte.firmaCliente} alt="Firma Cliente" />
              ) : (
                <div className="linea-firma"></div>
              )}
            </div>
            <p>Firma del Cliente</p>
          </div>
          <div className="firma-tecnico">
            <div className="firma-linea">
              {datosReporte.firmaTecnico ? (
                <img src={datosReporte.firmaTecnico} alt="Firma Técnico" />
              ) : (
                <div className="linea-firma"></div>
              )}
            </div>
            <p>Firma del Técnico</p>
          </div>
        </div>

        {/* Pie de página */}
        <div className="reporte-footer">
          <p>Este documento es un comprobante oficial de los trabajos realizados.</p>
          <p>AGENTE SOLUTIONS - Resolviendo tus necesidades</p>
          <p>Tel: (999) 123-4567 | Email: soporte@agentesolutions.com</p>
        </div>
      </div>
    </div>
  );
};

export default ReporteTrabajo;
