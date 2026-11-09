import {
  Star, Clock, CheckCircle2, Hourglass, ShieldCheck, GraduationCap, Quote, Briefcase, Award,
  Banknote, Landmark, CreditCard, Receipt, CalendarDays, Clock3,
} from 'lucide-react';
import { IconoEspecialidad } from './iconoEspecialidad';
import CodigoQrTecnico from './CodigoQrTecnico';
import '../../../styles/AgenteMarket/Shared/TecnicoQr.css';

// Ficha pública de un técnico de la red: lo que puede ver cualquier cliente.
// Sin teléfono, correo, dirección, RFC, CLABE ni documentos (el servidor ya no los manda en nivel público).

const anio = (iso) => (iso ? new Date(String(iso).replace(' ', 'T')).getFullYear() : null);

const Cifra = ({ Icono, valor, etiqueta }) => (
  <div className="tqr-cifra">
    <Icono size={16} />
    <strong>{valor}</strong>
    <span>{etiqueta}</span>
  </div>
);

/**
 *  perfil:   datos de GET /red/qr/{codigo} o /mis-tecnicos/{id}/detalle (o un respaldo armado con la tarjeta)
 *  conQr:    muestra el bloque del código QR (si el perfil trae qr_codigo)
 *  children: secciones extra (historial contigo, acciones…) que van antes del QR
 */
const FichaTecnicoQr = ({ perfil: p, conQr = true, children }) => {
  const foto = String(p.foto || '').startsWith('http') ? p.foto : null;
  const especialidades = (p.especialidades || []).map(e => (typeof e === 'string' ? e : e.name)).filter(Boolean);
  const formasPago = [
    p.acepta_efectivo && { Icono: Banknote, texto: 'Efectivo' },
    p.acepta_transferencia && { Icono: Landmark, texto: 'Transferencia' },
    p.tiene_terminal && { Icono: CreditCard, texto: 'Tarjeta' },
    p.emite_factura && { Icono: Receipt, texto: 'Emite factura' },
  ].filter(Boolean);
  const verificado = p.insignias?.identidad_verificada;

  return (
    <div className="tqr-ficha">
      <header className="tqr-ficha-cabeza">
        <div className="tqr-foto">{foto ? <img src={foto} alt="" /> : (p.nombre || 'T').charAt(0).toUpperCase()}</div>
        <div className="tqr-identidad">
          <h2>{p.nombre || 'Técnico'}</h2>
          <p>{p.rol || 'Técnico de la red'}{p.miembro_desde ? ` · En la red desde ${anio(p.miembro_desde)}` : ''}</p>
          {p.insignias && (
            <div className="tqr-insignias">
              {verificado
                ? <span className="ok"><ShieldCheck size={13} /> Identidad verificada</span>
                : <span className="pend"><Clock3 size={13} /> En validación</span>}
              {p.insignias.estudios_verificados && <span className="ok"><GraduationCap size={13} /> Estudios verificados</span>}
            </div>
          )}
        </div>
      </header>

      <section className="tqr-cifras">
        <Cifra Icono={Star} valor={p.calificacion != null ? Number(p.calificacion).toFixed(1) : '—'} etiqueta={p.total_resenas ? `${p.total_resenas} reseña${p.total_resenas === 1 ? '' : 's'}` : 'Sin reseñas'} />
        <Cifra Icono={Clock} valor={p.puntualidad != null ? Number(p.puntualidad).toFixed(1) : '—'} etiqueta="Puntualidad" />
        <Cifra Icono={CheckCircle2} valor={p.trabajos_terminados ?? '—'} etiqueta="Trabajos terminados" />
        <Cifra Icono={Hourglass} valor={p.anios_experiencia ?? '—'} etiqueta={p.anios_experiencia === 1 ? 'Año de experiencia' : 'Años de experiencia'} />
      </section>

      {especialidades.length > 0 && (
        <section className="tqr-seccion">
          <h3>Especialidades</h3>
          <ul className="tqr-chips">
            {especialidades.map(e => <li key={e}><IconoEspecialidad nombre={e} size={14} /> {e}</li>)}
          </ul>
        </section>
      )}

      {p.presentacion && (
        <section className="tqr-seccion">
          <h3><Quote size={15} /> Sobre mí</h3>
          <p className="tqr-presentacion">{p.presentacion}</p>
        </section>
      )}

      {p.experiencias?.length > 0 && (
        <section className="tqr-seccion">
          <h3><Briefcase size={15} /> Experiencia</h3>
          <ul className="tqr-lista">
            {p.experiencias.slice(0, 3).map(e => (
              <li key={e.id}>
                <strong>{e.puesto || 'Técnico'}</strong>
                <span>{e.empresa} · <CalendarDays size={12} /> {e.desde_anio || '¿?'} – {e.hasta_anio || 'Actual'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(p.nivel_estudios_texto || p.cursos?.length > 0) && (
        <section className="tqr-seccion">
          <h3><GraduationCap size={15} /> Formación</h3>
          <ul className="tqr-lista">
            {p.nivel_estudios_texto && <li><strong>{p.nivel_estudios_texto}</strong><span>Nivel de estudios</span></li>}
            {(p.cursos || []).slice(0, 4).map(c => (
              <li key={c.id}>
                <strong><Award size={13} /> {c.nombre}</strong>
                <span>{[c.institucion, c.anio].filter(Boolean).join(' · ') || 'Curso / certificación'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {formasPago.length > 0 && (
        <section className="tqr-seccion">
          <h3>Formas de pago</h3>
          <ul className="tqr-chips tqr-chips-neutros">
            {formasPago.map(({ Icono, texto }) => <li key={texto}><Icono size={14} /> {texto}</li>)}
          </ul>
        </section>
      )}

      {children}

      {conQr && p.qr_codigo && (
        <section className="tqr-seccion tqr-seccion-qr">
          <h3>Código QR del técnico</h3>
          <CodigoQrTecnico codigo={p.qr_codigo} nombre={p.nombre} subtitulo={especialidades.slice(0, 2).join(' · ') || p.rol} />
        </section>
      )}
    </div>
  );
};

export default FichaTecnicoQr;
