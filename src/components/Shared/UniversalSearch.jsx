import React from 'react';
import { Search } from 'lucide-react';
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
        } else if (filtroActual === "ACTIVOS") {
          coincideFiltro = !item.bloqueado;
        } else if (filtroActual === "BLOQUEADOS") {
          coincideFiltro = item.bloqueado === true;
        } else if (filtroActual === "CLIENTES") {
          coincideFiltro = Number(item.role_id) === 3 || String(item.id).startsWith('c_') || (typeof item.rol === 'string' && item.rol.toUpperCase().includes("CLIENTE"));
        } else if (filtroActual === "TECNICOS" || filtroActual === "TECNICOS_TODOS") {
          coincideFiltro = Number(item.role_id) === 2 || Number(item.role_id) === 8 || Number(item.role_id) === 6 || (typeof item.rol === 'string' && item.rol.toUpperCase().includes("TECNICO"));
        } else if (filtroActual === "TECNICOS_AGENTE") {
          coincideFiltro = Number(item.role_id) === 2;
        } else if (filtroActual === "TECNICOS_RED") {
          coincideFiltro = Number(item.role_id) === 8;
        } else if (filtroActual === "CONTRATISTAS") {
          coincideFiltro = Number(item.role_id) === 6;
        } else if (filtroActual === "AUTONOMOS") {
          coincideFiltro = Number(item.role_id) === 4 || Number(item.role_id) === 5 || (typeof item.rol === 'string' && item.rol.toUpperCase().includes("AUTONOMO"));
        } else if (filtroActual === "ADMINS" || filtroActual === "ADMINISTRADORES") {
          coincideFiltro = Number(item.role_id) === 1 || Number(item.role_id) === 7 || Number(item.role_id) === 0 || (typeof item.rol === 'string' && item.rol.toUpperCase().includes("ADMIN"));
        } else if (filtroActual === "ROOTS") {
          coincideFiltro = Number(item.role_id) === 0 || item.rol === "ROOT";
        } else {
          const rolBuscado = filtroActual.replace("S", "");
          coincideFiltro = item.rol === rolBuscado || String(item.role_id) === String(filtroActual);
        }
      } else if (type === 'PROPIEDADES') {
        coincideFiltro = filtroActual === "TODAS" || item.tipo === filtroActual;
        
      } else if (type === 'COTIZACIONES') {
        const estadoActual = String(item.estado || item.status || '').toLowerCase();
        
        if (filtroActual === 'Todas') {
          coincideFiltro = true;
        } else if (filtroActual === 'Por Pagar') {
          coincideFiltro = estadoActual.includes('por pagar') ||
                           estadoActual.includes('aprobad') || 
                           estadoActual === 'procesada por admin' || 
                           estadoActual.includes('aceptad') || 
                           estadoActual.includes('validado') ||
                           estadoActual.includes('anticipo') ||
                           estadoActual.includes('efectivo solic');
        } else if (filtroActual === 'Pagadas') {
          coincideFiltro = (estadoActual.includes('pagad') || estadoActual.includes('pago')) && 
                           !estadoActual.includes('anticipo');
        } else if (filtroActual === 'Rechazadas') {
          coincideFiltro = estadoActual.includes('rechazad');
        } else if (filtroActual === 'Recotizaciones') {
          coincideFiltro = estadoActual.includes('recotiza') || 
                           item.recotizacionSolicitada === true;
        }
      } else if (type === 'TECNICO_TABLERO') {
        coincideFiltro = true;
      } else if (type === 'LEVANTAMIENTOS') {
        if (filtroActual === "REALIZADOS") {
          coincideFiltro = item.status === "Finalizado" || item.status === "completed";
        } else {
          coincideFiltro = item.status !== "Finalizado" && item.status !== "completed";
        }
      }

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
        {busqueda === "" && <Search size={18} className="search-icon-inside" />}
      </div>
    </div>
  );
};

export default UniversalSearch;