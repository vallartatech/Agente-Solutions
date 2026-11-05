import { useEffect, useState } from 'react';
import axios from 'axios';
import { Landmark, Copy, Check, Pencil, X, Save } from 'lucide-react';
import { mostrarAviso } from '../../utils/dialogos';
import '../../styles/Shared/DatosBancarios.css';

const API = import.meta.env.VITE_API_BASE_URL;

// Mismos valores que el backend usa por defecto, para mostrar algo aunque falle la red
const POR_DEFECTO = { banco: 'Banorte', titular: '', cuenta: '1195878544', clabe: '072910011958785445' };

let cache = null;
const suscriptores = new Set();
const publicar = (datos) => { cache = datos; suscriptores.forEach((fn) => fn(datos)); };

const headers = () => {
  const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const cargarDatos = async () => {
  try {
    const res = await axios.get(`${API}/ui/settings/bank-info`, { headers: headers() });
    publicar({ ...POR_DEFECTO, ...(res.data?.data || {}) });
  } catch {
    if (!cache) publicar(POR_DEFECTO);
  }
};

const copiarTexto = async (texto) => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Navegadores sin portapapeles moderno (o sin HTTPS)
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
};

// CLABE en bloques de 3 para leerla fácil (se copia sin espacios)
const formatearClabe = (c) => String(c || '').replace(/(\d{3})(?=\d)/g, '$1 ');

const Fila = ({ etiqueta, valor, mostrar, copiado, onCopiar }) => (
  <div className="db-fila">
    <div className="db-fila-texto">
      <small>{etiqueta}</small>
      <strong>{mostrar || valor}</strong>
    </div>
    <button type="button" className={`db-copiar ${copiado ? 'ok' : ''}`} onClick={onCopiar} aria-label={`Copiar ${etiqueta}`}>
      {copiado ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar</>}
    </button>
  </div>
);

/**
 * Datos para pagar por transferencia, con botón de copiar en cada dato.
 * `editable`: Root/Admin pueden cambiarlos (se guardan en el servidor para todos).
 * `monto`: si se pasa, se muestra también como dato copiable.
 */
const DatosBancarios = ({ editable = false, monto = null, titulo = 'Datos para transferencia', compacto = false }) => {
  const [datos, setDatos] = useState(cache);
  const [copiado, setCopiado] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    suscriptores.add(setDatos);
    if (!cache) cargarDatos();
    return () => { suscriptores.delete(setDatos); };
  }, []);

  const copiar = async (clave, texto) => {
    if (await copiarTexto(texto)) {
      setCopiado(clave);
      setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 1800);
    } else {
      mostrarAviso('No se pudo copiar. Mantén presionado el dato para copiarlo manualmente.', 'warning');
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    const limpio = {
      banco: form.banco.trim(),
      titular: form.titular.trim(),
      cuenta: form.cuenta.replace(/\s+/g, ''),
      clabe: form.clabe.replace(/\s+/g, ''),
    };
    if (!limpio.banco) return mostrarAviso('Escribe el nombre del banco.', 'warning');
    if (!/^\d{18}$/.test(limpio.clabe)) return mostrarAviso('La CLABE debe tener exactamente 18 dígitos.', 'warning');
    if (limpio.cuenta && !/^\d+$/.test(limpio.cuenta)) return mostrarAviso('El número de cuenta solo lleva dígitos.', 'warning');

    setGuardando(true);
    try {
      const res = await axios.post(`${API}/ui/settings/bank-info`, limpio, { headers: headers() });
      publicar({ ...POR_DEFECTO, ...(res.data?.data || limpio) });
      setEditando(false);
      mostrarAviso('Datos bancarios actualizados. Los clientes ya ven los nuevos datos.', 'success');
    } catch (err) {
      mostrarAviso(err.response?.data?.message || 'No se pudieron guardar los datos bancarios.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  if (!datos) return <div className="db-card db-cargando">Cargando datos bancarios...</div>;

  const montoTexto = monto != null
    ? Number(monto).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
    : null;

  return (
    <div className={`db-card ${compacto ? 'compacto' : ''}`}>
      <div className="db-head">
        <span className="db-icono"><Landmark size={18} /></span>
        <div className="db-head-texto">
          <strong>{titulo}</strong>
          <small>{datos.banco}{datos.titular ? ` · ${datos.titular}` : ''}</small>
        </div>
        {editable && !editando && (
          <button
            type="button"
            className="db-editar"
            onClick={() => { setForm({ ...datos }); setEditando(true); }}
            title="Editar datos bancarios"
            aria-label="Editar datos bancarios"
          >
            <Pencil size={15} />
          </button>
        )}
      </div>

      {editando ? (
        <form className="db-form" onSubmit={guardar}>
          <label>Banco<input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} maxLength={80} /></label>
          <label>Titular (opcional)<input value={form.titular} onChange={(e) => setForm({ ...form, titular: e.target.value })} maxLength={120} /></label>
          <label>Número de cuenta<input value={form.cuenta} inputMode="numeric" onChange={(e) => setForm({ ...form, cuenta: e.target.value })} maxLength={20} /></label>
          <label>CLABE (18 dígitos)<input value={form.clabe} inputMode="numeric" onChange={(e) => setForm({ ...form, clabe: e.target.value })} maxLength={22} /></label>
          <div className="db-form-acciones">
            <button type="button" className="db-btn sec" onClick={() => setEditando(false)} disabled={guardando}><X size={15} /> Cancelar</button>
            <button type="submit" className="db-btn" disabled={guardando}><Save size={15} /> {guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      ) : (
        <div className="db-filas">
          {montoTexto && (
            <Fila etiqueta="Monto a transferir" valor={Number(monto).toFixed(2)} mostrar={montoTexto} copiado={copiado === 'monto'} onCopiar={() => copiar('monto', Number(monto).toFixed(2))} />
          )}
          {datos.cuenta && (
            <Fila etiqueta="Cuenta" valor={datos.cuenta} copiado={copiado === 'cuenta'} onCopiar={() => copiar('cuenta', datos.cuenta)} />
          )}
          <Fila etiqueta="CLABE interbancaria" valor={datos.clabe} mostrar={formatearClabe(datos.clabe)} copiado={copiado === 'clabe'} onCopiar={() => copiar('clabe', datos.clabe)} />
        </div>
      )}
    </div>
  );
};

export default DatosBancarios;
