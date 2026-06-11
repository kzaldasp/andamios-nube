// Documentos imprimibles: pagaré y recibo de pago
import { una, todas, leerConfig } from './db.js';
import { hoyLocal, calcularAlquiler } from './calculos.js';

function dinero(centavos) {
  return '$' + (centavos / 100).toFixed(2);
}

function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

function e(t) {
  return String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const ESTILO_BASE = `
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 18cm; margin: 1.2cm auto; color: #111; line-height: 1.65; padding: 0 12px; }
  h1 { text-align: center; font-size: 1.35em; letter-spacing: 2px; margin-bottom: 0; }
  .sub { text-align: center; color: #444; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; }
  th, td { border: 1px solid #555; padding: 6px 10px; text-align: left; font-size: 0.95em; }
  th { background: #eee; }
  .num { text-align: right; }
  .firmas { display: flex; justify-content: space-around; margin-top: 75px; text-align: center; }
  .firmas div { width: 40%; border-top: 1px solid #111; padding-top: 6px; }
  .nota { font-size: 0.85em; color: #444; margin-top: 24px; }
  .no-imprimir { text-align: center; margin: 18px 0; }
  .no-imprimir button { font-size: 1.05em; padding: 10px 24px; cursor: pointer; border-radius: 8px; border: 1px solid #888; background: #f5f5f5; }
  @media print { .no-imprimir { display: none; } body { margin: 0 auto; } }
`;

const BOTONES = `<div class="no-imprimir">
  <button onclick="window.print()">🖨️ Imprimir</button>
  <button onclick="location.href='/'">← Volver a la aplicación</button>
</div>`;

function nombreTipo(tipo, cantidad) {
  if (tipo === 'andamio') return cantidad === 1 ? 'Andamio' : 'Andamios';
  return cantidad === 1 ? 'Tablón' : 'Tablones';
}

export async function paginaPagare(alqId) {
  const alq = await una(`
    SELECT a.*, c.nombre AS cliente_nombre, c.cedula AS cliente_cedula,
           c.telefono AS cliente_telefono, c.direccion AS cliente_direccion
    FROM alquileres a JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ?`, alqId);
  if (!alq) return null;
  const items = await todas('SELECT * FROM alquiler_items WHERE alquiler_id = ?', alqId);
  const cfg = await leerConfig();
  const repos = { andamio: Number(cfg.reposicion_andamio), tablon: Number(cfg.reposicion_tablon) };
  let totalReposicion = 0;
  const filas = items.map(it => {
    const valorRep = it.cantidad * repos[it.tipo];
    totalReposicion += valorRep;
    return `<tr>
      <td class="num">${it.cantidad}</td>
      <td>${nombreTipo(it.tipo, it.cantidad)}</td>
      <td>${it.precio_dia === 0 ? 'Préstamo (sin costo)' : dinero(it.precio_dia) + ' por día'}</td>
      <td class="num">${dinero(valorRep)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pagaré N.º ${alq.id} — ${e(alq.cliente_nombre)}</title>
<style>${ESTILO_BASE}</style></head><body>
${BOTONES}
<h1>PAGARÉ POR ALQUILER</h1>
<p class="sub">${e(cfg.negocio_nombre)}${cfg.telefono ? ' — Tel: ' + e(cfg.telefono) : ''}</p>
<p>${cfg.ciudad ? e(cfg.ciudad) + ', ' : ''}${fechaLarga(alq.fecha_inicio)}.</p>
<p>Yo, <strong>${e(alq.cliente_nombre)}</strong>${alq.cliente_cedula ? ', con cédula de identidad N.º <strong>' + e(alq.cliente_cedula) + '</strong>' : ''}${alq.cliente_telefono ? ', teléfono ' + e(alq.cliente_telefono) : ''}${alq.cliente_direccion ? ', con domicilio en ' + e(alq.cliente_direccion) : ''}, declaro haber recibido en calidad de <strong>alquiler</strong> los siguientes bienes${cfg.propietaria ? ', de propiedad de <strong>' + e(cfg.propietaria) + '</strong>' : ''}:</p>
<table>
  <tr><th class="num">Cantidad</th><th>Detalle</th><th>Tarifa</th><th class="num">Valor de reposición</th></tr>
  ${filas}
  <tr><td colspan="3" class="num"><strong>Total valor de reposición</strong></td><td class="num"><strong>${dinero(totalReposicion)}</strong></td></tr>
</table>
${alq.direccion_obra ? `<p>Los bienes serán utilizados en la obra ubicada en: <strong>${e(alq.direccion_obra)}</strong>.</p>` : ''}
<p>Me comprometo a <strong>devolver los bienes en buen estado</strong> y a pagar el valor del alquiler acumulado según la tarifa diaria indicada (se cobra de lunes a ${alq.cobra_sabado ? 'sábado' : 'viernes'}; los domingos no se cobran). En caso de pérdida, daño o no devolución de los bienes, me obligo a pagar incondicionalmente el valor de reposición indicado, sin necesidad de requerimiento judicial previo.</p>
${alq.garantia ? `<p>Garantía entregada: <strong>${e(alq.garantia)}</strong>.</p>` : ''}
${alq.notas ? `<p>Observaciones: ${e(alq.notas)}</p>` : ''}
<div class="firmas">
  <div><strong>EL CLIENTE</strong><br>${e(alq.cliente_nombre)}<br>${alq.cliente_cedula ? 'C.I. ' + e(alq.cliente_cedula) : ''}</div>
  <div><strong>${cfg.propietaria ? e(cfg.propietaria).toUpperCase() : 'LA PROPIETARIA'}</strong><br>${cfg.propietaria_cedula ? 'C.I. ' + e(cfg.propietaria_cedula) : ''}</div>
</div>
<p class="nota">Alquiler N.º ${alq.id} — documento generado el ${fechaLarga(hoyLocal())}.</p>
</body></html>`;
}

export async function paginaRecibo(pagoId) {
  const pago = await una(`
    SELECT p.*, u.nombre AS usuario_nombre FROM pagos p
    LEFT JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = ?`, pagoId);
  if (!pago) return null;
  const alq = await una(`
    SELECT a.*, c.nombre AS cliente_nombre, c.cedula AS cliente_cedula
    FROM alquileres a JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ?`, pago.alquiler_id);
  const cfg = await leerConfig();
  const calc = await calcularAlquiler(alq, hoyLocal());
  const detalleItems = calc.items
    .map(it => `${it.cantidad} ${nombreTipo(it.tipo, it.cantidad).toLowerCase()}`)
    .join(', ');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recibo N.º ${pago.id}</title>
<style>${ESTILO_BASE}
  .monto-grande { text-align: center; font-size: 1.8em; font-weight: bold; margin: 18px 0; }
  .resumen { background: #f4f4f4; border: 1px solid #ccc; border-radius: 8px; padding: 12px 16px; }
</style></head><body>
${BOTONES}
<h1>RECIBO DE PAGO</h1>
<p class="sub">${e(cfg.negocio_nombre)}${cfg.telefono ? ' — Tel: ' + e(cfg.telefono) : ''}</p>
<p>${cfg.ciudad ? e(cfg.ciudad) + ', ' : ''}${fechaLarga(pago.fecha)}.</p>
<p class="monto-grande">${dinero(pago.monto)}</p>
<p>Recibido de <strong>${e(alq.cliente_nombre)}</strong>${alq.cliente_cedula ? ' (C.I. ' + e(alq.cliente_cedula) + ')' : ''}
por concepto de alquiler de <strong>${e(detalleItems)}</strong> (alquiler N.º ${alq.id}, iniciado el ${fechaLarga(alq.fecha_inicio)}).
${pago.nota ? '<br>Nota: ' + e(pago.nota) : ''}</p>
<div class="resumen">
  Cargo acumulado a la fecha: <strong>${dinero(calc.cargo_total)}</strong><br>
  ${alq.descuento > 0 ? 'Descuento: <strong>−' + dinero(alq.descuento) + '</strong><br>' : ''}
  Total pagado (incluye este pago): <strong>${dinero(calc.pagado)}</strong><br>
  Saldo ${calc.saldo >= 0 ? 'pendiente' : 'a favor del cliente'}: <strong>${dinero(Math.abs(calc.saldo))}</strong>
</div>
<div class="firmas">
  <div><strong>RECIBÍ CONFORME</strong><br>${pago.usuario_nombre ? e(pago.usuario_nombre) : (cfg.propietaria ? e(cfg.propietaria) : '')}</div>
  <div><strong>ENTREGUÉ CONFORME</strong><br>${e(alq.cliente_nombre)}</div>
</div>
<p class="nota">Recibo N.º ${pago.id} — generado el ${fechaLarga(hoyLocal())}.</p>
</body></html>`;
}
