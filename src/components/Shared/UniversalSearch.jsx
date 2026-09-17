import React from 'react';
import '../../styles/Shared/UniversalSearch.css';

const UniversalSearch = ({ data, setFilteredData, placeholder, filtroActual, type }) => {
  const [busqueda, setBusqueda] = React.useState("");

  React.useEffect(() => {
    const termino = busqueda.toLowerCase();
    
    const filtrados = data.filter((item) => {
      let coincideFiltro = true;
      
      if (type === 'USUARIOS') {
        if (filtroActual === "TODOS") {
          coincideFiltro = true;
        } else if (filtroActual === "AUTONOMOS") {
          coincideFiltro = item.role_id === 4 || item.role_id === 5 || item.role_id === 6 || (typeof item.rol === 'string' && item.rol.includes("AUTONOMO"));
        } else if (filtroActual === "ADMINS") {
          coincideFiltro = item.role_id === 1 || item.role_id === 7 || (typeof item.rol === 'string' && item.rol.includes("ADMIN"));
        } else if (filtroActual === "TECNICOS") {
          coincideFiltro = item.role_id === 2 || item.role_id === 8 || (typeof item.rol === 'string' && item.rol.includes("TECNICO"));
        } else if (filtroActual === "CLIENTES") {
          coincideFiltro = item.role_id === 3 || (typeof item.rol === 'string' && item.rol.includes("CLIENTE"));
        } else if (filtroActual === "ROOTS") {
          coincideFiltro = item.role_id === 0 || item.rol === "ROOT";
        } else {
          const rolBuscado = filtroActual.replace("S", "");
          coincideFiltro = item.rol === rolBuscado;
        }
      } else if (type === 'PROPIEDADES') {
        coincideFiltro = filtroActual === "TODAS" || item.tipo === filtroActual;
        
      } else if (type === 'COTIZACIONES') {
        // ✅ A PRUEBA DE BALAS: Extraemos el estado, sea como sea que venga de la BD
        const estadoActual = String(item.estado || item.status || '').toLowerCase();
        
        if (filtroActual === 'Todas') {
          coincideFiltro = true;
        } else if (filtroActual === 'Por Pagar') {
          coincideFiltro = estadoActual.includes('por pagar') ||
                           estadoActual.includes('aprobad') || 
                           estadoActual === 'procesada por admin' || 
                           estadoActual.includes('aceptad') || 
                           estadoActual.includes('validado') ||
                           estadoActual.includes('anticipo') ||   // Anticipo Pagado (60%)
                           estadoActual.includes('efectivo solic'); // Pago en Efectivo Solicitado
        } else if (filtroActual === 'Pagadas') {
          coincideFiltro = (estadoActual.includes('pagad') || estadoActual.includes('pago')) && 
                           !estadoActual.includes('anticipo'); // Excluir "anticipo pagado" del grupo Pagadas
        } else if (filtroActual === 'Rechazadas') {
          coincideFiltro = estadoActual.includes('rechazad'); // Captura rechazado y rechazada
        } else if (filtroActual === 'Recotizaciones') {
          coincideFiltro = estadoActual.includes('recotiza') || 
                           item.recotizacionSolicitada === true;
        }
      } else if (type === 'TECNICO_TABLERO') {
        coincideFiltro = true; // El tablero ya está filtrado por técnico, la búsqueda es global sobre eso
      } else if (type === 'LEVANTAMIENTOS') {
        if (filtroActual === "REALIZADOS") {
          coincideFiltro = item.status === "Finalizado" || item.status === "completed";
        } else {
          coincideFiltro = item.status !== "Finalizado" && item.status !== "completed";
        }
      }

      // Búsqueda por texto (Lupa)
      let coincideBusqueda = false;
      if (type === 'COTIZACIONES') {
        const searchFields = [
          item.folio,
          item.cliente,
          item.propiedad_nombre,
          item.propiedad_direccion,
          item.tecnico,
          item.cliente_telefono,
          item.telefono_cliente,
          item.telefono,
          item.total
        ];

        // Incluir cualquier otro valor directo del objeto
        Object.keys(item).forEach(key => {
          const val = item[key];
          if (typeof val === 'string' || typeof val === 'number') {
            searchFields.push(val);
          }
        });

        const textToSearch = searchFields.map(val => String(val || '').toLowerCase()).join(' ');
        coincideBusqueda = textToSearch.includes(termino);
      } else {
        coincideBusqueda = Object.values(item).some(valor => 
          String(valor || '').toLowerCase().includes(termino)
        );
      }

      return coincideFiltro && coincideBusqueda;
    });

    setFilteredData(filtrados);
  }, [busqueda, data, filtroActual, type, setFilteredData]);

  return (
    <div className="search-wrapper-full">
      <div className="search-input-container">
        <input
          type="text"
          placeholder={placeholder}
          className="search-input-large"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {busqueda === "" && <span className="search-icon-inside">🔍</span>}
      </div>
    </div>
  );
};

export default UniversalSearch;