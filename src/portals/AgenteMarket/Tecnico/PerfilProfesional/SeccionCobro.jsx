import { useState } from 'react';
import { Receipt, Landmark, Banknote, CreditCard, Check, AlertCircle } from 'lucide-react';
import { bancoDeClabe, estadoClabe, formatoClabe, rfcValido, soloDigitos } from './clabe';

// Pregunta Sí/No como dos botones grandes (más fácil de tocar en celular que un switch)
export const SiNo = ({ valor, onChange, nombre }) => (
  <div className="pp-sino" role="radiogroup" aria-label={nombre}>
    {[{ v: true, t: 'Sí' }, { v: false, t: 'No' }].map(({ v, t }) => (
      <button
        key={t}
        type="button"
        role="radio"
        aria-checked={valor === v}
        className={`pp-sino-btn ${valor === v ? 'activo' : ''}`}
        onClick={() => onChange(v)}
      >
        {valor === v && <Check size={15} strokeWidth={3} />} {t}
      </button>
    ))}
  </div>
);

/** Datos iniciales del formulario a partir del perfil del backend. */
export const formCobro = (p = {}) => ({
  emite_factura: p.emite_factura ?? null,
  rfc: p.rfc || '',
  razon_social: p.razon_social || '',
  banco: p.banco || '',
  titular_cuenta: p.titular_cuenta || '',
  clabe: p.clabe || '',
  acepta_efectivo: p.acepta_efectivo ?? null,
  tiene_terminal: p.tiene_terminal ?? null,
});

/** Lo que se manda al backend. */
export const payloadCobro = (f) => ({
  ...f,
  rfc: f.emite_factura ? f.rfc.trim().toUpperCase() || null : null,
  razon_social: f.emite_factura ? f.razon_social.trim() || null : null,
  clabe: soloDigitos(f.clabe) || null,
  banco: f.banco.trim() || null,
  titular_cuenta: f.titular_cuenta.trim() || null,
});

/** Errores que se pueden detectar antes de guardar. */
export const erroresCobro = (f) => {
  const e = {};
  if (f.emite_factura && f.rfc.trim() && !rfcValido(f.rfc)) e.rfc = 'El RFC no tiene un formato válido (12 o 13 caracteres).';
  const clabe = estadoClabe(f.clabe);
  if (clabe.tipo === 'error') e.clabe = clabe.texto;
  return e;
};

/**
 * Cobro y facturación: factura (RFC y razón social), cuenta para transferencias (CLABE)
 * y si acepta efectivo o tarjeta. Solo se copian los datos: la app no cobra por el técnico.
 */
const SeccionCobro = ({ form, setForm, errores = {} }) => {
  const [bancoEditado, setBancoEditado] = useState(Boolean(form.banco));
  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));
  const clabe = estadoClabe(form.clabe);

  const cambiarClabe = (valor) => {
    const digitos = soloDigitos(valor).slice(0, 18);
    setForm(prev => {
      const sig = { ...prev, clabe: digitos };
      // El banco se llena solo con la CLABE, mientras el técnico no lo haya escrito a mano
      const banco = bancoDeClabe(digitos);
      if (banco && !bancoEditado) sig.banco = banco;
      return sig;
    });
  };

  return (
    <div className="pp-seccion">
      <div className="pp-bloque">
        <h3 className="pp-bloque-titulo"><Receipt size={18} /> Facturación</h3>
        <label className="pp-pregunta">¿Emites factura?</label>
        <SiNo nombre="¿Emites factura?" valor={form.emite_factura} onChange={(v) => set('emite_factura', v)} />

        {form.emite_factura && (
          <div className="pp-grid-2 pp-aparece">
            <label className="pp-campo">
              <span>RFC</span>
              <input
                type="text"
                value={form.rfc}
                maxLength={13}
                autoCapitalize="characters"
                placeholder="Ej. PEPJ800101AB1"
                className={errores.rfc ? 'con-error' : ''}
                onChange={(e) => set('rfc', e.target.value.toUpperCase().replace(/\s/g, ''))}
              />
              {errores.rfc && <small className="pp-error"><AlertCircle size={13} /> {errores.rfc}</small>}
            </label>
            <label className="pp-campo">
              <span>Razón social o nombre fiscal</span>
              <input
                type="text"
                value={form.razon_social}
                maxLength={191}
                placeholder="Como aparece en tu constancia"
                onChange={(e) => set('razon_social', e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      <div className="pp-bloque">
        <h3 className="pp-bloque-titulo"><Landmark size={18} /> Cuenta para transferencias</h3>
        <p className="pp-nota">El cliente que te contrate verá estos datos para copiarlos y pagarte por transferencia. La app no cobra por ti.</p>

        <label className="pp-campo">
          <span>CLABE interbancaria (18 dígitos)</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={formatoClabe(form.clabe)}
            placeholder="000 000 00000000000 0"
            className={`pp-input-clabe ${clabe.tipo === 'error' || errores.clabe ? 'con-error' : ''} ${clabe.tipo === 'ok' ? 'con-ok' : ''}`}
            onChange={(e) => cambiarClabe(e.target.value)}
          />
          {clabe.texto && (
            <small className={clabe.tipo === 'ok' ? 'pp-ok' : clabe.tipo === 'error' ? 'pp-error' : 'pp-ayuda'}>
              {clabe.tipo === 'ok' ? <Check size={13} strokeWidth={3} /> : clabe.tipo === 'error' ? <AlertCircle size={13} /> : null} {clabe.texto}
            </small>
          )}
          {!clabe.texto && errores.clabe && <small className="pp-error"><AlertCircle size={13} /> {errores.clabe}</small>}
        </label>

        <div className="pp-grid-2">
          <label className="pp-campo">
            <span>Banco</span>
            <input
              type="text"
              value={form.banco}
              maxLength={100}
              placeholder="Se llena con la CLABE"
              onChange={(e) => { setBancoEditado(true); set('banco', e.target.value); }}
            />
          </label>
          <label className="pp-campo">
            <span>Titular de la cuenta</span>
            <input
              type="text"
              value={form.titular_cuenta}
              maxLength={191}
              placeholder="Nombre completo del titular"
              onChange={(e) => set('titular_cuenta', e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="pp-bloque">
        <h3 className="pp-bloque-titulo"><Banknote size={18} /> Otras formas de cobro</h3>
        <div className="pp-grid-2">
          <div>
            <label className="pp-pregunta">¿Aceptas pago en efectivo?</label>
            <SiNo nombre="¿Aceptas pago en efectivo?" valor={form.acepta_efectivo} onChange={(v) => set('acepta_efectivo', v)} />
          </div>
          <div>
            <label className="pp-pregunta"><CreditCard size={14} /> ¿Tienes terminal para tarjeta?</label>
            <SiNo nombre="¿Tienes terminal para tarjeta?" valor={form.tiene_terminal} onChange={(v) => set('tiene_terminal', v)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeccionCobro;
