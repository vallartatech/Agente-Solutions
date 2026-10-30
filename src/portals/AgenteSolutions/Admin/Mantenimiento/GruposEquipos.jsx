import { useEffect, useMemo } from 'react';
import { Camera, Plus, Trash2 } from 'lucide-react';
import { grupoVacio, OPCIONES_VECES } from './cicloMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

export const SelectorVeces = ({ valor, onChange }) => (
  <div className="mt-veces" role="group" aria-label="Veces al año">
    {OPCIONES_VECES.map((n) => (
      <button key={n} type="button" className={Number(valor) === n ? 'on' : ''} onClick={() => onChange(n)} aria-pressed={Number(valor) === n}>
        {n}
      </button>
    ))}
  </div>
);

const CampoFoto = ({ etiqueta, archivo, onChange }) => {
  const vista = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  return (
    <label className={`mt-foto ${vista ? 'con-foto' : ''}`}>
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { if (e.target.files?.[0]) onChange(e.target.files[0]); e.target.value = ''; }}
      />
      {vista ? <img src={vista} alt={etiqueta} /> : <Camera size={20} />}
      <span>{etiqueta}</span>
    </label>
  );
};

// Equipos sin levantamiento, por grupo: si todos son iguales basta una fila con sus 2 fotos ("3 minis");
// si alguno es distinto, va en otra fila. Es un registro aparte del levantamiento.
const GruposEquipos = ({ grupos, onChange, conVeces = false }) => {
  const cambiar = (i, campo, valor) => onChange(grupos.map((g, j) => (j === i ? { ...g, [campo]: valor } : g)));

  return (
    <div className="mt-grupos">
      {grupos.map((g, i) => (
        <div className="mt-grupo" key={i}>
          <div className="mt-grupo-fila">
            <label className="mt-campo mt-campo-cantidad">
              <span>Equipos</span>
              <input
                type="number"
                min="1"
                max="1000"
                value={g.cantidad}
                onChange={(e) => cambiar(i, 'cantidad', e.target.value)}
              />
            </label>
            <label className="mt-campo mt-campo-tipo">
              <span>Tipo</span>
              <input
                type="text"
                maxLength={150}
                placeholder="Ej. Minisplit 12,000 BTU"
                value={g.tipo}
                onChange={(e) => cambiar(i, 'tipo', e.target.value)}
              />
            </label>
            <button type="button" className="mt-quitar" onClick={() => onChange(grupos.filter((_, j) => j !== i))} aria-label="Quitar grupo">
              <Trash2 size={16} />
            </button>
          </div>

          <div className="mt-fotos">
            <CampoFoto etiqueta="Foto del equipo *" archivo={g.foto_equipo} onChange={(f) => cambiar(i, 'foto_equipo', f)} />
            <CampoFoto etiqueta="Tarjeta de datos *" archivo={g.foto_datos} onChange={(f) => cambiar(i, 'foto_datos', f)} />
          </div>

          <label className="mt-campo">
            <span>Detalle (opcional)</span>
            <input
              type="text"
              maxLength={1000}
              placeholder="Ej. Dos en planta alta, uno en planta baja"
              value={g.detalle}
              onChange={(e) => cambiar(i, 'detalle', e.target.value)}
            />
          </label>

          {conVeces && (
            <div className="mt-campo">
              <span>Veces al año</span>
              <SelectorVeces valor={g.veces_al_ano} onChange={(n) => cambiar(i, 'veces_al_ano', n)} />
            </div>
          )}
        </div>
      ))}

      <button type="button" className="mt-agregar" onClick={() => onChange([...grupos, grupoVacio()])}>
        <Plus size={16} /> Agregar equipos sin levantamiento
      </button>
    </div>
  );
};

export default GruposEquipos;
