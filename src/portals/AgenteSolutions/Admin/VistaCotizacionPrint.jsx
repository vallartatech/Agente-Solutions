import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import "../../../styles/AgenteSolutions/Admin/VistaCotizacionPrint.css";
import logo from "../../../assets/Logo3.png"; 
import mpLogo from "../../../assets/Mercado-Pago.png";
import html2pdf from 'html2pdf.js';

const IVA_RATE = 0.16;

const VistaCotizacionPrint = () => {
  const navigate = useNavigate();
  const [cotizacion, setCotizacion] = useState(null);
  const [elementosTabla, setElementosTabla] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [pdfGenerado, setPdfGenerado] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  // Detectar si quien genera el PDF es Admin o Cliente
  const esAdmin = (() => {
    try {
      const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
      const roleId = session?.userData?.role_id;
      return roleId === 0 || roleId === 1; // 0=root, 1=admin
    } catch { return false; }
  })();

  // --- ESTADOS PARA LAS ESPECIFICACIONES ---
  const [escala, setEscala] = useState(1);
  const [notas, setNotas] = useState("");

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      // 794px es el ancho aproximado de 21cm
      if (screenWidth < 840) {
        setEscala(Math.max(0.3, (screenWidth - 40) / 794));
      } else {
        setEscala(1);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const datosGuardados = localStorage.getItem('cotizacion_para_imprimir');
    
    if (datosGuardados) {
      const data = JSON.parse(datosGuardados);
      setCotizacion(data);

      // El backend puede enviar 'concept' o 'concepto'
      const rawConcept = data.concept || data.concepto;
      let items = [];
      
      try {
        const detalle = typeof rawConcept === 'string' ? JSON.parse(rawConcept) : rawConcept;
        
        if (detalle && typeof detalle === 'object') {
          // Soporta 'conceptos' o 'servicios' (enviado por técnicos)
          const listadoServicios = detalle.conceptos || detalle.servicios || [];
          listadoServicios.filter(c => c.descripcion || c.precio_u || c.precio).forEach(c => {
            const precio = parseFloat(c.precio_u || c.precio || 0);
            const cant = parseFloat(c.cantidad || 1);
            items.push({ 
              descripcion: c.descripcion || '(Sin Descripción)', 
              cantidad: cant, 
              unidad: 'S', 
              precio_u: precio, 
              importe: cant * precio 
            });
          });

          // Soporta 'materiales'
          if (detalle.materiales) {
            detalle.materiales.filter(m => m.nombre || m.descripcion || m.costo_u || m.precio).forEach(m => {
              const precio = parseFloat(m.costo_u || m.precio || 0);
              const cant = parseFloat(m.cantidad || 1);
              items.push({ 
                descripcion: m.nombre || m.descripcion || '(Sin Descripción)', 
                cantidad: cant, 
                unidad: 'PZA', 
                precio_u: precio, 
                importe: cant * precio 
              });
            });
          }
        } else if (rawConcept) {
          // Fallback si es solo texto
          items.push({ 
            descripcion: rawConcept, 
            cantidad: 1, 
            unidad: 'S', 
            precio_u: parseFloat(data.total || 0), 
            importe: parseFloat(data.total || 0) 
          });
        }
      } catch (error) {
        if (rawConcept) {
          items.push({ 
            descripcion: rawConcept, 
            cantidad: 1, 
            unidad: 'S', 
            precio_u: parseFloat(data.total || 0), 
            importe: parseFloat(data.total || 0) 
          });
        }
      }
      
      setElementosTabla(items);

      // --- LÓGICA PARA NOTAS PREDETERMINADAS (SOLO TÉCNICOS) ---
      if (data.tecnico) {
        const propName = data.propiedad || data.propiedad_nombre || "S/N";
        const clientName = data.cliente || "S/N";
        const defaultNotas = `Cotización realizada por el Técnico: ${data.tecnico}\nen la propiedad: ${propName}\nde Nombre del Cliente: ${clientName}\n\n`;
        
        // Solo establecemos si no hay notas previas guardadas en esta sesión
        setNotas(prev => prev || defaultNotas);
      }
    }
  }, []);

  const handleGenerarPDF = async () => {
    setGuardando(true);
    
    // 1. Configuración del PDF
    const elemento = document.getElementById('cotizacion-pdf');
    const opciones = {
      margin: 0,
      filename: `cotizacion_${cotizacion.folio}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true }, // useCORS es vital para que salga el logo de Cloudinary
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      // 2. Generar el PDF como un "Blob" (archivo en memoria)
      const pdfBlob = await html2pdf().set(opciones).from(elemento).output('blob');

      // 3. Preparar el envío (FormData)
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `cotizacion_${cotizacion.folio}.pdf`);
      formData.append('observaciones', notas);
      formData.append('titulo_seccion', 'ESPECIFICACIONES'); // Título fijo enviado al backend

      // 4. Enviar a Laravel
      const respuesta = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacion.id}/finalizar`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setPdfUrl(respuesta.data.url);
      setPdfGenerado(true);
      alert("¡Cotización generada y guardada exitosamente!");
      
    } catch (error) {
      console.error("Error en el proceso:", error);
      alert("Hubo un error al procesar el archivo.");
    } finally {
      setGuardando(false);
    }
  };

  const handleDescargar = () => {
    const elemento = document.getElementById('cotizacion-pdf');
    const opciones = {
      margin: 0,
      filename: `cotizacion_${cotizacion.folio}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opciones).from(elemento).save();
  };

  const handleImprimir = () => {
    window.print();
  };

  if (!cotizacion) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Cargando información...</div>;
  }

  // Calcular subtotal a partir de los items de la tabla
  const subtotal = elementosTabla.reduce((acc, item) => acc + item.importe, 0);
  const iva = subtotal * IVA_RATE;
  const subtotalConIva = subtotal + iva;
  const esPagadoMP = Boolean(
    (cotizacion?.status === 'Pagado' || cotizacion?.payment_status === 'approved') &&
    !cotizacion?.cash_confirmed &&
    !cotizacion?.cash_requested &&
    (cotizacion?.mp_payment_data || cotizacion?.metodo_pago === 'mercadopago' || cotizacion?.payment_method === 'mercadopago')
  );
  const comisionMP = esPagadoMP ? ((subtotalConIva * 0.0349 + 4) * 1.16) : 0;
  const totalFinal = esPagadoMP ? (subtotalConIva + comisionMP) : subtotalConIva;
  const priceFactor = (!esAdmin && subtotal > 0) ? (totalFinal / subtotal) : 1;

  const formatearDinero = (cantidad) => {
    return `$${parseFloat(cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ backgroundColor: '#f4f4f4', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Panel de control superior */}
      <div className="no-print" style={{ marginBottom: '20px', width: '100%', maxWidth: '21cm', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '10px' }}>
         <button 
            onClick={() => navigate('/vista-cotizaciones')}
            style={{ padding: '12px 24px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', flexGrow: 1, textAlign: 'center' }}
         >
           ⬅️ REGRESAR
         </button>

         <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flexGrow: 2, justifyContent: 'flex-end' }}>
           {!pdfGenerado ? (
             <button 
                onClick={handleGenerarPDF} 
                disabled={guardando}
                style={{ padding: '12px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', flexGrow: 1, textAlign: 'center' }}
             >
               {guardando ? 'PREPARANDO...' : '✅ SUBIR ESPECIFICACIONES A SISTEMA'}
             </button>
           ) : (
             <a 
               href={pdfUrl} 
               target="_blank" 
               rel="noopener noreferrer" 
               style={{ padding: '12px 24px', backgroundColor: '#17a2b8', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', display: 'inline-block', flexGrow: 1, textAlign: 'center' }}
             >
               📄 VER PDF GUARDADO
             </a>
           )}
           <button 
              onClick={handleImprimir}
              style={{ padding: '12px 24px', backgroundColor: '#FF6600', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', flexGrow: 1, textAlign: 'center' }}
           >
             🖨️ IMPRIMIR / DESCARGAR
           </button>
         </div>
      </div>

      <div style={{ width: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center', paddingBottom: '20px' }}>
        <div style={{ transform: `scale(${escala})`, transformOrigin: 'top center', transition: 'transform 0.2s ease', width: '21cm' }}>
          <div id="cotizacion-pdf" className="cotizacion-container printable-page-container" style={{ minWidth: '21cm', margin: '0 auto' }}>

          <div className="header">
          <div className="header-left">
            <img src={logo} alt="logo" className="logo" />
            <div className="info-cliente">
              <p><strong>ATENCION A:</strong></p>
              <h2>{(cotizacion.cliente || 'CLIENTE').toUpperCase()}</h2>
              
              {/* Solo mostrar datos de la propiedad si es de un técnico */}
              {cotizacion.tecnico && (cotizacion.propiedad || cotizacion.propiedad_nombre) && (
                <>
                  <p><strong>PROPIEDAD:</strong></p>
                  <h3 style={{ color: '#333', marginBottom: '10px' }}>
                    {(cotizacion.propiedad || cotizacion.propiedad_nombre).toUpperCase()}
                  </h3>
                </>
              )}

              <p><strong>LOCACION:</strong></p>
              <h3>{(cotizacion.ubicacion || 'MERIDA, YUCATAN').toUpperCase()}</h3>

            </div>

            {/* Cajas movidas a la izquierda al LADO de los datos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="fecha-box" style={{ width: '180px', padding: '15px' }}>
                <span>FECHA DE COTIZACIÓN</span>
                <p>{cotizacion.fecha || new Date().toLocaleDateString()}</p> 
              </div>
              {cotizacion.tecnico && (
                <div className="fecha-box" style={{ width: '180px', padding: '15px', background: '#333' }}>
                  <span style={{ color: '#eee' }}>TÉCNICO ASIGNADO</span>
                  <p style={{ color: 'white' }}>{cotizacion.tecnico.toUpperCase()}</p>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="linea"></div>

        <div className="tabla-container">
          <table className="tabla">
            <thead>
              <tr>
                <th>NO</th>
                <th>CONCEPTO</th>
                <th>CANT</th>
                <th>U/S</th>
                <th>PRECIO/U</th>
                <th>PRECIO</th>
              </tr>
            </thead>
            <tbody>
              {elementosTabla.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td style={{ textAlign: 'left' }}>{(item.descripcion || '').toUpperCase()}</td>
                  <td>{item.cantidad}</td>
                  <td>{item.unidad}</td>
                  <td>{formatearDinero(item.precio_u * priceFactor)}</td>
                  <td>{formatearDinero(item.importe * priceFactor)}</td>
                </tr>
              ))}
              {esAdmin && (
                <tr className="totales">
                  <td colSpan="4" style={{ border: 'none' }}></td>
                  <td className="label">SUBTOTAL</td>
                  <td className="subtotal">{formatearDinero(subtotal)}</td>
                </tr>
              )}
              {esAdmin && (
                <tr className="totales">
                  <td colSpan="4" style={{ border: 'none' }}></td>
                  <td className="label">IVA (16%)</td>
                  <td>{formatearDinero(iva)}</td>
                </tr>
              )}
              {esAdmin && esPagadoMP && (
                <tr className="totales">
                  <td colSpan="4" style={{ border: 'none' }}></td>
                  <td className="label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', border: 'none' }}>
                    <img src={mpLogo} alt="MercadoPago" style={{ height: '14px', objectFit: 'contain' }} />
                    <span>COMISIÓN (T. Oficial)</span>
                  </td>
                  <td style={{ color: '#009ee3', fontWeight: '600' }}>{formatearDinero(comisionMP)}</td>
                </tr>
              )}
              <tr className="totales total-final">
                <td colSpan="4" style={{ border: 'none' }}></td>
                <td className="label">TOTAL</td>
                <td>{formatearDinero(totalFinal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="notas">
          <h4 style={{ color: '#FF6600', marginBottom: '8px', textTransform: 'uppercase', fontSize: '1rem', borderBottom: '2px solid #FF6600', paddingBottom: '4px', display: 'inline-block' }}>
            ESPECIFICACIONES
          </h4>

          <textarea 
            className="notas-textarea"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            spellCheck="false"
            placeholder="Escriba aquí los términos, especificaciones o condiciones de esta cotización..."
            style={{ border: '1px solid #eee' }}
          />
        </div>

        <div className="fiscales" style={{ marginTop: 'auto' }}>
          <h3>DATOS FISCALES</h3>
          <p><strong>JORGE ERNESTO VALLARTA SOSA</strong></p>
          <p><strong>RFC:</strong> VASJ820324779</p>
          <p><strong>DIRECCIÓN:</strong> CALLE 23 No. 137 POR 20A XCANATUN. MERIDA, YUCATAN</p>
          <p><strong>TELÉFONO:</strong> 9992426030</p>
          <p>Vallofacturas@gmail.com</p>
          <p><strong>RÉGIMEN:</strong> PERSONAS FISICAS CON ACTIVIDADES EMPRESARIALES Y COMERCIALES</p>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default VistaCotizacionPrint;
