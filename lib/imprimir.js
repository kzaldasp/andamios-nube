// Documentos imprimibles: pagaré y recibo de pago.
// El texto sale de una plantilla editable (Ajustes → Formato de documentos,
// o una específica del alquiler). Las palabras {{asi}} se reemplazan por los
// datos reales; las líneas cuyos datos estén vacíos se omiten solas.
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
  .monto-grande { text-align: center; font-size: 1.8em; font-weight: bold; margin: 18px 0; }
  .resumen { background: #f4f4f4; border: 1px solid #ccc; border-radius: 8px; padding: 12px 16px; }
  .no-imprimir { text-align: center; margin: 18px 0; }
  .no-imprimir button { font-size: 1.05em; padding: 10px 24px; cursor: pointer; border-radius: 8px; border: 1px solid #888; background: #f5f5f5; }
  @media print { .no-imprimir { display: none; } body { margin: 0 auto; } }
`;

// Convierte el documento en imagen y la comparte: en celular abre el menú de
// compartir (ahí está WhatsApp); en computadora descarga la imagen y abre
// WhatsApp Web para adjuntarla. html2canvas se carga solo al tocar el botón.
const SCRIPT_WHATSAPP = `
function telefonoWhatsApp(t) {
  var d = String(t || '').replace(/\\D/g, '');
  if (d.length === 10 && d.charAt(0) === '0') d = '593' + d.slice(1); // celular de Ecuador
  return d;
}
async function enviarWhatsApp() {
  var boton = document.getElementById('boton-wpp');
  var original = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Preparando…';
  try {
    if (!window.html2canvas) {
      await new Promise(function (listo, fallo) {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        s.onload = listo;
        s.onerror = function () { fallo(new Error('No se pudo preparar la imagen. Revisa la conexión a internet.')); };
        document.head.appendChild(s);
      });
    }
    var canvas = await html2canvas(document.body, {
      scale: 2, backgroundColor: '#ffffff',
      ignoreElements: function (el) { return el.classList && el.classList.contains('no-imprimir'); }
    });
    var blob = await new Promise(function (r) { canvas.toBlob(r, 'image/png'); });
    var archivo = new File([blob], DATOS_ENVIO.archivo, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: DATOS_ENVIO.titulo });
    } else {
      var enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(blob);
      enlace.download = DATOS_ENVIO.archivo;
      enlace.click();
      alert('Se descargó la imagen "' + DATOS_ENVIO.archivo + '". Ahora se abrirá WhatsApp: adjúntala ahí como foto.');
      var tel = telefonoWhatsApp(DATOS_ENVIO.telefono);
      window.open(tel ? 'https://wa.me/' + tel : 'https://web.whatsapp.com', '_blank');
    }
  } catch (err) {
    if (err && err.name !== 'AbortError') alert(err.message || 'No se pudo enviar por WhatsApp');
  } finally {
    boton.disabled = false;
    boton.textContent = original;
  }
}`;

// datos: { archivo, titulo, telefono } del documento a compartir
function botonera(datos) {
  return `<div class="no-imprimir">
  <button onclick="window.print()">🖨️ Imprimir</button>
  <button id="boton-wpp" onclick="enviarWhatsApp()" style="background:#dcf8c6;border-color:#25d366">📲 Enviar por WhatsApp</button>
  <button onclick="location.href='/'">← Volver a la aplicación</button>
</div>
<script>
var DATOS_ENVIO = ${JSON.stringify(datos).replace(/</g, '\\u003c')};
${SCRIPT_WHATSAPP}
</script>`;
}

function nombreTipo(tipo, cantidad) {
  if (tipo === 'andamio') return cantidad === 1 ? 'Andamio' : 'Andamios';
  return cantidad === 1 ? 'Tablón' : 'Tablones';
}

const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function isoFecha(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Lista de meses [año, mes] entre dos fechas ISO, inclusive
function mesesEntre(desde, hasta) {
  let [y, m] = desde.split('-').map(Number);
  const [y2, m2] = hasta.split('-').map(Number);
  const meses = [];
  while (y < y2 || (y === y2 && m <= m2)) {
    meses.push([y, m]);
    if (++m > 12) { m = 1; y++; }
  }
  return meses;
}

// ---------- Calendario del alquiler ----------
// Reconstruye el cobro día por día (mismo criterio que lib/calculos.js): cada
// día cuesta = piezas que seguían afuera ese día × su tarifa, saltando domingos
// (y sábados si así se acordó). La suma de todos los días cuadra con el total.
export async function paginaCalendario(alqId) {
  const alq = await una(`
    SELECT a.*, c.nombre AS cliente_nombre, c.cedula AS cliente_cedula, c.telefono AS cliente_telefono
    FROM alquileres a JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ?`, alqId);
  if (!alq) return null;
  const cfg = await leerConfig();
  const hoy = hoyLocal();
  const calc = await calcularAlquiler(alq, hoy);
  const fechaTope = alq.estado === 'cerrado' && alq.fecha_cierre ? alq.fecha_cierre : hoy;

  // Armamos los "lotes": cada grupo de piezas con su intervalo de cobro
  const lotes = [];
  for (const it of calc.items) {
    const inicioItem = it.fecha_inicio || alq.fecha_inicio;
    for (const dv of it.devoluciones) {
      lotes.push({
        unidades: dv.cantidad, precio: it.precio_dia, desde: inicioItem,
        hasta: dv.cobrar_hasta || dv.fecha, primer: alq.cobrar_primer_dia, ultimo: dv.cobrar_ultimo_dia
      });
    }
    if (it.pendientes > 0) {
      lotes.push({
        unidades: it.pendientes, precio: it.precio_dia, desde: inicioItem,
        hasta: fechaTope, primer: alq.cobrar_primer_dia, ultimo: 1
      });
    }
  }

  // Mapa de días: iso -> { monto, ini, agregado, dev, pago, cierre }
  const dias = new Map();
  const tocar = (iso) => {
    if (!dias.has(iso)) dias.set(iso, { monto: 0, ini: false, agregado: false, dev: 0, pago: 0, cierre: false });
    return dias.get(iso);
  };

  for (const lote of lotes) {
    const [yd, md, dd] = lote.desde.split('-').map(Number);
    const [yh, mh, dh] = lote.hasta.split('-').map(Number);
    const ini = new Date(yd, md - 1, dd), fin = new Date(yh, mh - 1, dh);
    if (fin < ini) continue;
    for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
      if (!lote.primer && d.getTime() === ini.getTime() && fin > ini) continue;
      if (!lote.ultimo && d.getTime() === fin.getTime() && fin > ini) continue;
      const dow = d.getDay();
      if (dow === 0) continue;
      if (dow === 6 && !alq.cobra_sabado) continue;
      tocar(isoFecha(d.getFullYear(), d.getMonth() + 1, d.getDate())).monto += lote.unidades * lote.precio;
    }
  }

  // Eventos sobre el calendario
  tocar(alq.fecha_inicio).ini = true;
  for (const it of calc.items) {
    if (it.fecha_inicio && it.fecha_inicio !== alq.fecha_inicio) tocar(it.fecha_inicio).agregado = true;
    for (const dv of it.devoluciones) tocar(dv.fecha).dev += dv.cantidad;
  }
  for (const p of calc.pagos) tocar(p.fecha).pago += p.monto;
  if (alq.estado === 'cerrado' && alq.fecha_cierre) tocar(alq.fecha_cierre).cierre = true;

  // Rango de meses a dibujar
  const claves = [alq.fecha_inicio, fechaTope, ...dias.keys()];
  const rangoIni = claves.reduce((a, b) => b < a ? b : a);
  const rangoFin = claves.reduce((a, b) => b > a ? b : a);

  const cabecera = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    .map(d => `<th>${d}</th>`).join('');

  const calendarios = mesesEntre(rangoIni, rangoFin).map(([y, m]) => {
    const ndias = new Date(y, m, 0).getDate();
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunes = 0
    const celdas = [];
    for (let i = 0; i < offset; i++) celdas.push('<td class="vacia"></td>');
    for (let d = 1; d <= ndias; d++) {
      const iso = isoFecha(y, m, d);
      const info = dias.get(iso);
      const fecha = new Date(y, m - 1, d);
      const dow = fecha.getDay();
      const dentro = iso >= alq.fecha_inicio && iso <= fechaTope;
      const noCobra = dow === 0 || (dow === 6 && !alq.cobra_sabado);
      let clase = 'fuera';
      if (dentro) clase = (info && info.monto > 0) ? 'cobra' : (noCobra ? 'nocobra' : 'libre');
      const evs = [];
      if (info?.ini) evs.push('🏁 inicio');
      if (info?.agregado) evs.push('➕ piezas');
      if (info?.dev) evs.push(`↩ ${info.dev}`);
      if (info?.pago) evs.push(`💵 ${dinero(info.pago)}`);
      if (info?.cierre) evs.push('🔒 cierre');
      const monto = info && info.monto > 0
        ? `<span class="dia-monto">${dinero(info.monto)}</span>`
        : (dentro && noCobra ? '<span class="dia-libre">—</span>' : '');
      celdas.push(`<td class="${clase}"><span class="dia-num">${d}</span>${monto}${evs.length ? `<span class="dia-ev">${evs.join('<br>')}</span>` : ''}</td>`);
    }
    while (celdas.length % 7 !== 0) celdas.push('<td class="vacia"></td>');
    let filas = '';
    for (let i = 0; i < celdas.length; i += 7) filas += `<tr>${celdas.slice(i, i + 7).join('')}</tr>`;
    return `<div class="cal-mes"><h2>${MESES_LARGO[m - 1]} ${y}</h2>
<table class="cal"><thead><tr>${cabecera}</tr></thead><tbody>${filas}</tbody></table></div>`;
  }).join('');

  // Detalle del porqué del total
  const filasDetalle = calc.items.map(it => {
    const desc = it.precio_dia === 0 ? 'préstamo (sin costo)' : `${dinero(it.precio_dia)} / día c/u`;
    return `<tr><td>${it.cantidad} ${nombreTipo(it.tipo, it.cantidad)}</td><td>${desc}</td><td class="num">${dinero(it.cargo)}</td></tr>`;
  }).join('');
  const filasPagos = calc.pagos.length
    ? calc.pagos.map(p => `<tr><td colspan="2">Pago del ${fechaLarga(p.fecha)}${p.nota ? ' — ' + e(p.nota) : ''}</td><td class="num">−${dinero(p.monto)}</td></tr>`).join('')
    : '';

  const etiquetaSaldo = calc.saldo > 0 ? 'Saldo pendiente'
    : calc.saldo < 0 ? (alq.estado === 'cerrado' ? 'Vuelto al cliente' : 'Saldo a favor') : 'Cuenta saldada';

  const detalle = `<h2 class="titulo-detalle">¿Por qué este total?</h2>
<table>
  <thead><tr><th>Piezas</th><th>Tarifa</th><th class="num">Cargo</th></tr></thead>
  <tbody>
    ${filasDetalle}
    <tr class="fila-total"><td colspan="2">Cargo total acumulado</td><td class="num">${dinero(calc.cargo_total)}</td></tr>
    ${alq.descuento > 0 ? `<tr><td colspan="2">Descuento</td><td class="num">−${dinero(alq.descuento)}</td></tr>` : ''}
    ${filasPagos}
    <tr class="fila-saldo"><td colspan="2">${etiquetaSaldo}</td><td class="num">${dinero(Math.abs(calc.saldo))}</td></tr>
  </tbody>
</table>`;

  const periodo = `Del <strong>${fechaLarga(alq.fecha_inicio)}</strong> ${alq.estado === 'cerrado'
    ? `al <strong>${fechaLarga(alq.fecha_cierre)}</strong> (cerrado)`
    : `a hoy, <strong>${fechaLarga(hoy)}</strong> (activo)`}`;

  const estiloCal = `<style>
  .cal-info { text-align: center; color: #444; margin-bottom: 4px; }
  .leyenda { font-size: 0.82em; color: #444; text-align: center; margin: 10px 0 4px; }
  .leyenda span { display: inline-block; margin: 0 8px; white-space: nowrap; }
  .sw { display: inline-block; width: 11px; height: 11px; border: 1px solid #aaa; vertical-align: -1px; border-radius: 2px; }
  .cal-mes { margin: 16px 0; page-break-inside: avoid; }
  .cal-mes h2 { font-size: 1.05em; text-align: center; margin: 0 0 6px; }
  table.cal { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0; }
  table.cal th { background: #eee; font-size: 0.78em; padding: 4px 2px; border: 1px solid #bbb; text-align: center; }
  table.cal td { border: 1px solid #ccc; height: 62px; vertical-align: top; padding: 3px 4px; font-size: 0.8em; overflow: hidden; }
  table.cal td.cobra { background: #eaf6ea; }
  table.cal td.nocobra { background: #f6f6f6; }
  table.cal td.fuera, table.cal td.vacia { background: #fbfbfb; }
  .dia-num { color: #999; font-size: 0.85em; float: right; }
  .dia-monto { font-weight: bold; color: #1b6b1b; }
  .dia-libre { color: #bbb; }
  .dia-ev { display: block; clear: both; font-size: 0.75em; color: #555; margin-top: 2px; line-height: 1.25; }
  .titulo-detalle { font-size: 1.1em; margin-top: 22px; }
  .fila-total td { font-weight: bold; border-top: 2px solid #555; }
  .fila-saldo td { font-weight: bold; background: #f4f4f4; }
</style>`;

  const cuerpo = `${estiloCal}
<h1>CALENDARIO DEL ALQUILER</h1>
<p class="sub">${e(cfg.negocio_nombre || '')}${cfg.telefono ? ' — Tel: ' + e(cfg.telefono) : ''}</p>
<p class="cal-info"><strong>${e(alq.cliente_nombre)}</strong>${alq.cliente_cedula ? ' · C.I. ' + e(alq.cliente_cedula) : ''} · Alquiler N.º ${alq.id}</p>
<p class="cal-info">${periodo}</p>
<p class="leyenda">
  <span><i class="sw" style="background:#eaf6ea"></i> día cobrado</span>
  <span><i class="sw" style="background:#f6f6f6"></i> no se cobra (domingo${alq.cobra_sabado ? '' : ' / sábado'})</span>
  <span>🏁 inicio</span><span>➕ más piezas</span><span>↩ devolución</span><span>💵 pago</span><span>🔒 cierre</span>
</p>
${calendarios}
${detalle}`;

  return paginaCompleta(`Calendario — Alquiler N.º ${alq.id}`, cuerpo, {
    archivo: `calendario-${alq.id}.png`,
    titulo: `Calendario del alquiler N.º ${alq.id}`,
    telefono: alq.cliente_telefono
  });
}

// ---------- Plantillas ----------
// Reglas del texto: {{palabra}} se reemplaza por el dato; una línea cuyos
// datos queden todos vacíos se elimina; **texto** sale en negrita;
// "# " al inicio = título, "## " = subtítulo centrado, "> " = letra pequeña.

export const PLANTILLA_PAGARE_DEFECTO = `# PAGARÉ POR ALQUILER
## {{negocio_y_telefono}}

{{lugar_y_fecha}}.

Yo, {{cliente_y_datos}}, declaro haber recibido en calidad de **alquiler** los siguientes bienes{{de_propiedad_de}}:

{{tabla_articulos}}

Los bienes serán utilizados en la obra ubicada en: **{{direccion_obra}}**.

Me comprometo a **devolver los bienes en buen estado** y a pagar el valor del alquiler acumulado según la tarifa diaria indicada (se cobra de lunes a {{ultimo_dia_cobrado}}; los domingos no se cobran{{nota_primer_dia}}). En caso de pérdida, daño o no devolución de los bienes, me obligo a pagar incondicionalmente el valor de reposición indicado, sin necesidad de requerimiento judicial previo.

Garantía entregada: **{{garantia}}**.

Observaciones: {{notas}}

{{firmas}}

> Alquiler N.º {{numero}} — documento generado el {{fecha_hoy}}.`;

export const PLANTILLA_RECIBO_DEFECTO = `# RECIBO DE PAGO
## {{negocio_y_telefono}}

{{lugar_y_fecha}}.

{{monto_grande}}

Recibido de **{{cliente_y_cedula}}** por concepto de alquiler de **{{detalle_articulos}}** (alquiler N.º {{numero_alquiler}}, iniciado el {{fecha_inicio}}).

Nota: {{nota}}

{{resumen_cuenta}}

{{firmas}}

> Recibo N.º {{numero_recibo}} — generado el {{fecha_hoy}}.`;

export const MARCADORES_PAGARE = [
  ['numero', 'Número del alquiler'],
  ['cliente', 'Nombre del cliente'],
  ['cedula', 'Cédula del cliente'],
  ['telefono', 'Teléfono del cliente'],
  ['direccion', 'Domicilio del cliente'],
  ['cliente_y_datos', 'Nombre del cliente seguido de su cédula, teléfono y domicilio (solo lo que tenga registrado)'],
  ['lugar_y_fecha', 'Ciudad y fecha de inicio (ej: Quito, 11 de junio de 2026)'],
  ['fecha_inicio', 'Fecha de inicio del alquiler'],
  ['fecha_hoy', 'Fecha en que se imprime el documento'],
  ['negocio', 'Nombre del negocio'],
  ['negocio_y_telefono', 'Nombre del negocio con su teléfono'],
  ['propietaria', 'Nombre de la propietaria'],
  ['cedula_propietaria', 'Cédula de la propietaria'],
  ['de_propiedad_de', 'Texto ", de propiedad de …" (sale vacío si no hay propietaria)'],
  ['tabla_articulos', 'Lista de las piezas con su tarifa diaria, y la nota fija del valor de reposición por pieza'],
  ['direccion_obra', 'Dirección de la obra'],
  ['garantia', 'Garantía entregada'],
  ['notas', 'Observaciones del alquiler'],
  ['ultimo_dia_cobrado', '"sábado" o "viernes", según cómo se cobre este alquiler'],
  ['nota_primer_dia', 'Aclaración de que el primer día no se cobra (si aplica)'],
  ['firmas', 'Líneas de firma del cliente y de la propietaria']
];

export const MARCADORES_RECIBO = [
  ['numero_recibo', 'Número del recibo'],
  ['numero_alquiler', 'Número del alquiler'],
  ['monto', 'Monto pagado (ej: $12.50)'],
  ['monto_grande', 'Monto pagado en letras grandes y centrado'],
  ['fecha_pago', 'Fecha del pago'],
  ['lugar_y_fecha', 'Ciudad y fecha del pago'],
  ['fecha_inicio', 'Fecha de inicio del alquiler'],
  ['fecha_hoy', 'Fecha en que se imprime el documento'],
  ['cliente', 'Nombre del cliente'],
  ['cedula', 'Cédula del cliente'],
  ['cliente_y_cedula', 'Nombre del cliente con su cédula (si la tiene)'],
  ['detalle_articulos', 'Resumen de las piezas (ej: 4 andamios, 6 tablones)'],
  ['nota', 'Nota del pago'],
  ['cargo_total', 'Cargo acumulado a la fecha'],
  ['pagado', 'Total pagado hasta ahora'],
  ['saldo', 'Saldo pendiente o a favor'],
  ['resumen_cuenta', 'Recuadro con el estado de la cuenta (cargo, pagado y saldo)'],
  ['negocio', 'Nombre del negocio'],
  ['negocio_y_telefono', 'Nombre del negocio con su teléfono'],
  ['firmas', 'Líneas de firma de quien recibe y quien paga'],
  ['firmado_por', 'Nombre de quien registró el pago']
];

// Convierte el texto de la plantilla en HTML reemplazando los {{marcadores}}.
// valores: { clave: 'texto' } o { clave: { html: '<...>' } } para bloques ya armados.
function renderizarPlantilla(texto, valores) {
  const crudo = (k) => {
    const v = valores[k];
    if (v == null) return '';
    return typeof v === 'object' ? (v.html || '') : String(v);
  };
  const lineas = [];
  for (const lineaCruda of texto.split(/\r?\n/)) {
    const claves = [...lineaCruda.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]);
    // Si la línea usa marcadores y todos quedaron vacíos, se omite entera
    if (claves.length && claves.every(k => crudo(k) === '')) continue;
    lineas.push(lineaCruda.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
      const v = valores[k];
      if (v == null) return '';
      return typeof v === 'object' ? (v.html || '') : e(String(v));
    }));
  }
  // Bloques separados por líneas en blanco; títulos y HTML van solos
  const bloques = [];
  let actual = [];
  const cerrar = () => { if (actual.length) { bloques.push({ tipo: 'p', texto: actual.join('<br>') }); actual = []; } };
  for (const l of lineas) {
    if (!l.trim()) { cerrar(); continue; }
    if (l.startsWith('## ')) { cerrar(); bloques.push({ tipo: 'sub', texto: l.slice(3) }); continue; }
    if (l.startsWith('# ')) { cerrar(); bloques.push({ tipo: 'h1', texto: l.slice(2) }); continue; }
    if (l.startsWith('> ')) { cerrar(); bloques.push({ tipo: 'nota', texto: l.slice(2) }); continue; }
    if (l.trim().startsWith('<')) { cerrar(); bloques.push({ tipo: 'html', texto: l }); continue; }
    actual.push(l);
  }
  cerrar();
  return bloques.map(b => {
    if (b.tipo === 'html') return b.texto;
    const t = b.texto.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    if (b.tipo === 'h1') return `<h1>${t}</h1>`;
    if (b.tipo === 'sub') return `<p class="sub">${t}</p>`;
    if (b.tipo === 'nota') return `<p class="nota">${t}</p>`;
    return `<p>${t}</p>`;
  }).join('\n');
}

function elegirPlantilla(forzada, delAlquiler, global, defecto) {
  for (const t of [forzada, delAlquiler, global]) {
    if (t && String(t).trim()) return String(t);
  }
  return defecto;
}

function paginaCompleta(titulo, cuerpo, envio) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titulo)}</title>
<style>${ESTILO_BASE}</style></head><body>
${botonera(envio)}
${cuerpo}
</body></html>`;
}

// plantillaForzada: texto de prueba para la vista previa (opcional)
export async function paginaPagare(alqId, plantillaForzada) {
  const alq = await una(`
    SELECT a.*, c.nombre AS cliente_nombre, c.cedula AS cliente_cedula,
           c.telefono AS cliente_telefono, c.direccion AS cliente_direccion
    FROM alquileres a JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ?`, alqId);
  if (!alq) return null;
  const items = await todas('SELECT * FROM alquiler_items WHERE alquiler_id = ?', alqId);
  const cfg = await leerConfig();
  const filasDetalle = items.map(it =>
    `<li>${it.cantidad} ${nombreTipo(it.tipo, it.cantidad)} — ${it.precio_dia === 0 ? 'préstamo, sin costo' : dinero(it.precio_dia) + ' por día c/u'}</li>`
  ).join('');
  const tabla = `<ul class="detalle-bienes">${filasDetalle}</ul>
<p>Valor de reposición en caso de pérdida o daño: <strong>$40.00</strong> por cada cuadro de andamio, <strong>$15.00</strong> por cada cruceta y <strong>$8.00</strong> por cada tablón.</p>`;

  const clienteYDatos = `<strong>${e(alq.cliente_nombre)}</strong>`
    + (alq.cliente_cedula ? `, con cédula de identidad N.º <strong>${e(alq.cliente_cedula)}</strong>` : '')
    + (alq.cliente_telefono ? `, teléfono ${e(alq.cliente_telefono)}` : '')
    + (alq.cliente_direccion ? `, con domicilio en ${e(alq.cliente_direccion)}` : '');

  const firmas = `<div class="firmas">
  <div><strong>EL CLIENTE</strong><br>${e(alq.cliente_nombre)}<br>${alq.cliente_cedula ? 'C.I. ' + e(alq.cliente_cedula) : ''}</div>
  <div><strong>LA PROPIETARIA</strong><br>${cfg.propietaria ? e(cfg.propietaria) : ''}<br>${cfg.propietaria_cedula ? 'C.I. ' + e(cfg.propietaria_cedula) : ''}</div>
</div>`;

  const valores = {
    numero: alq.id,
    cliente: alq.cliente_nombre,
    cedula: alq.cliente_cedula,
    telefono: alq.cliente_telefono,
    direccion: alq.cliente_direccion,
    cliente_y_datos: { html: clienteYDatos },
    lugar_y_fecha: (cfg.ciudad ? cfg.ciudad + ', ' : '') + fechaLarga(alq.fecha_inicio),
    fecha_inicio: fechaLarga(alq.fecha_inicio),
    fecha_hoy: fechaLarga(hoyLocal()),
    negocio: cfg.negocio_nombre,
    negocio_y_telefono: cfg.negocio_nombre + (cfg.telefono ? ' — Tel: ' + cfg.telefono : ''),
    propietaria: cfg.propietaria,
    cedula_propietaria: cfg.propietaria_cedula,
    de_propiedad_de: { html: cfg.propietaria ? `, de propiedad de <strong>${e(cfg.propietaria)}</strong>` : '' },
    tabla_articulos: { html: tabla },
    direccion_obra: alq.direccion_obra,
    garantia: alq.garantia,
    notas: alq.notas,
    ultimo_dia_cobrado: alq.cobra_sabado ? 'sábado' : 'viernes',
    nota_primer_dia: alq.cobrar_primer_dia ? '' : '; el día de entrega de los bienes no se cobra',
    firmas: { html: firmas }
  };

  const plantilla = elegirPlantilla(plantillaForzada, alq.plantilla_pagare, cfg.plantilla_pagare, PLANTILLA_PAGARE_DEFECTO);
  const cuerpo = renderizarPlantilla(plantilla, valores);
  return paginaCompleta(`Pagaré N.º ${alq.id} — ${alq.cliente_nombre}`, cuerpo, {
    archivo: `pagare-${alq.id}.png`,
    titulo: `Pagaré N.º ${alq.id}`,
    telefono: alq.cliente_telefono
  });
}

// plantillaForzada: texto de prueba para la vista previa (opcional)
export async function paginaRecibo(pagoId, plantillaForzada) {
  const pago = await una(`
    SELECT p.*, u.nombre AS usuario_nombre FROM pagos p
    LEFT JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = ?`, pagoId);
  if (!pago) return null;
  const alq = await una(`
    SELECT a.*, c.nombre AS cliente_nombre, c.cedula AS cliente_cedula, c.telefono AS cliente_telefono
    FROM alquileres a JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ?`, pago.alquiler_id);
  const cfg = await leerConfig();
  const calc = await calcularAlquiler(alq, hoyLocal());
  const detalleItems = calc.items
    .map(it => `${it.cantidad} ${nombreTipo(it.tipo, it.cantidad).toLowerCase()}`)
    .join(', ');

  const resumen = `<div class="resumen">
  Cargo acumulado a la fecha: <strong>${dinero(calc.cargo_total)}</strong><br>
  ${alq.descuento > 0 ? 'Descuento: <strong>−' + dinero(alq.descuento) + '</strong><br>' : ''}
  Total pagado (incluye este pago): <strong>${dinero(calc.pagado)}</strong><br>
  Saldo ${calc.saldo >= 0 ? 'pendiente' : 'a favor del cliente'}: <strong>${dinero(Math.abs(calc.saldo))}</strong>
</div>`;

  const firmas = `<div class="firmas">
  <div><strong>RECIBÍ CONFORME</strong><br>${pago.usuario_nombre ? e(pago.usuario_nombre) : (cfg.propietaria ? e(cfg.propietaria) : '')}</div>
  <div><strong>ENTREGUÉ CONFORME</strong><br>${e(alq.cliente_nombre)}</div>
</div>`;

  const valores = {
    numero_recibo: pago.id,
    numero_alquiler: alq.id,
    monto: dinero(pago.monto),
    monto_grande: { html: `<p class="monto-grande">${dinero(pago.monto)}</p>` },
    fecha_pago: fechaLarga(pago.fecha),
    lugar_y_fecha: (cfg.ciudad ? cfg.ciudad + ', ' : '') + fechaLarga(pago.fecha),
    fecha_inicio: fechaLarga(alq.fecha_inicio),
    fecha_hoy: fechaLarga(hoyLocal()),
    cliente: alq.cliente_nombre,
    cedula: alq.cliente_cedula,
    cliente_y_cedula: { html: e(alq.cliente_nombre) + (alq.cliente_cedula ? ` (C.I. ${e(alq.cliente_cedula)})` : '') },
    detalle_articulos: detalleItems,
    nota: pago.nota,
    cargo_total: dinero(calc.cargo_total),
    pagado: dinero(calc.pagado),
    saldo: dinero(Math.abs(calc.saldo)) + (calc.saldo < 0 ? ' a favor del cliente' : ''),
    resumen_cuenta: { html: resumen },
    negocio: cfg.negocio_nombre,
    negocio_y_telefono: cfg.negocio_nombre + (cfg.telefono ? ' — Tel: ' + cfg.telefono : ''),
    firmas: { html: firmas },
    firmado_por: pago.usuario_nombre || ''
  };

  const plantilla = elegirPlantilla(plantillaForzada, alq.plantilla_recibo, cfg.plantilla_recibo, PLANTILLA_RECIBO_DEFECTO);
  const cuerpo = renderizarPlantilla(plantilla, valores);
  return paginaCompleta(`Recibo N.º ${pago.id}`, cuerpo, {
    archivo: `recibo-${pago.id}.png`,
    titulo: `Recibo N.º ${pago.id}`,
    telefono: alq.cliente_telefono
  });
}
