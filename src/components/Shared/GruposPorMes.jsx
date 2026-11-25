// Agente Market: lista agrupada por año y mes (fecha de solicitud). Cada mes es un botón que despliega
// sus trabajos; el mes más reciente abre desplegado. Lo usan el Tablero del cliente y "Mis trabajos" del técnico.
import { Fragment, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import '../../styles/Shared/GruposPorMes.css';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SIN_FECHA = 'sin-fecha';

const aFecha = (v) => {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * - items: la lista ya filtrada.
 * - fecha(item): fecha con la que se agrupa (la de solicitud).
 * - clave(item): key única de cada elemento.
 * - render(item): cómo se dibuja cada elemento.
 * - abrirTodos: con una búsqueda activa se despliegan todos los meses con resultados.
 * - seleccionado(item): si devuelve true, su mes se abre (p. ej. al llegar desde un aviso).
 * - porPagina: cuántos se muestran por mes antes de "Ver más".
 */
const GruposPorMes = ({ items, fecha, clave, render, abrirTodos = false, seleccionado, porPagina = 25 }) => {
  // Lo que el usuario abrió o cerró a mano: { 'AAAA-MM': true | false }
  const [manual, setManual] = useState({});
  const [mostrar, setMostrar] = useState({});

  // Al empezar o terminar una búsqueda manda la búsqueda, no lo que se abrió o cerró antes
  const [abrirTodosPrevio, setAbrirTodosPrevio] = useState(abrirTodos);
  if (abrirTodosPrevio !== abrirTodos) {
    setAbrirTodosPrevio(abrirTodos);
    setManual({});
  }

  const anios = useMemo(() => {
    const porMes = new Map();
    items.forEach((item) => {
      const d = aFecha(fecha(item));
      const k = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : SIN_FECHA;
      if (!porMes.has(k)) porMes.set(k, []);
      porMes.get(k).push({ item, ts: d ? d.getTime() : 0 });
    });
    const claves = [...porMes.keys()].filter((k) => k !== SIN_FECHA).sort().reverse();
    if (porMes.has(SIN_FECHA)) claves.push(SIN_FECHA);

    const lista = [];
    claves.forEach((k) => {
      const anio = k === SIN_FECHA ? 'Sin fecha' : k.slice(0, 4);
      let grupo = lista.find((a) => a.anio === anio);
      if (!grupo) { grupo = { anio, meses: [] }; lista.push(grupo); }
      grupo.meses.push({
        clave: k,
        nombre: k === SIN_FECHA ? 'Sin fecha de solicitud' : MESES[Number(k.slice(5)) - 1],
        // Dentro del mes, del más nuevo al más viejo
        items: porMes.get(k).sort((a, b) => b.ts - a.ts).map((x) => x.item),
      });
    });
    return lista;
  }, [items, fecha]);

  const masReciente = anios[0]?.meses[0]?.clave;

  const estaAbierto = (mes) => {
    if (manual[mes.clave] !== undefined) return manual[mes.clave];
    if (abrirTodos) return true;
    if (seleccionado && mes.items.some(seleccionado)) return true;
    return mes.clave === masReciente;
  };

  const alternar = (mes) => setManual((m) => ({ ...m, [mes.clave]: !estaAbierto(mes) }));

  return (
    <div className="gm">
      {anios.map((anio) => (
        <section key={anio.anio} className="gm-anio" aria-label={`Año ${anio.anio}`}>
          <h3 className="gm-anio-titulo">{anio.anio}</h3>
          {anio.meses.map((mes) => {
            const abierto = estaAbierto(mes);
            const visibles = mostrar[mes.clave] || porPagina;
            return (
              <div key={mes.clave} className={`gm-mes ${abierto ? 'abierto' : ''}`}>
                <button
                  type="button"
                  className="gm-mes-btn"
                  onClick={() => alternar(mes)}
                  aria-expanded={abierto}
                >
                  <ChevronDown size={17} className="gm-mes-flecha" />
                  <span className="gm-mes-nombre">{mes.nombre}</span>
                  <span className="gm-mes-n">{mes.items.length}</span>
                </button>
                {abierto && (
                  <div className="gm-mes-lista">
                    {mes.items.slice(0, visibles).map((item) => (
                      <Fragment key={clave(item)}>{render(item)}</Fragment>
                    ))}
                    {mes.items.length > visibles && (
                      <button
                        type="button"
                        className="gm-mas"
                        onClick={() => setMostrar((m) => ({ ...m, [mes.clave]: visibles + porPagina }))}
                      >
                        Ver más ({mes.items.length - visibles} restantes)
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
};

export default GruposPorMes;
