// Cliente del API y utilidades compartidas

export async function api(ruta, opciones = {}) {
  const res = await fetch('/api' + ruta, {
    method: opciones.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined
  });
  const datos = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.dispatchEvent(new Event('sesion-expirada'));
    throw new Error(datos.error || 'Sesión expirada');
  }
  if (!res.ok) {
    const err = new Error(datos.error || 'Ocurrió un error');
    err.datos = datos; // por si la respuesta trae más detalle (ej: puede_forzar)
    throw err;
  }
  return datos;
}

// Enlace para abrir un chat de WhatsApp (convierte celulares de Ecuador)
export function enlaceWhatsApp(telefono, texto = '') {
  let d = String(telefono || '').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) d = '593' + d.slice(1);
  const consulta = texto ? '?text=' + encodeURIComponent(texto) : '';
  return d ? `https://wa.me/${d}${consulta}` : `https://web.whatsapp.com/${consulta}`;
}

// Descarga una tabla como archivo CSV (se abre en Excel)
export function descargarCSV(nombreArchivo, encabezados, filas) {
  const celda = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lineas = [encabezados, ...filas].map(f => f.map(celda).join(';')).join('\r\n');
  // BOM para que Excel reconozca las tildes
  const blob = new Blob(['﻿' + lineas], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Abre en otra pestaña cómo quedaría un documento con el formato dado
export async function abrirPreviaPlantilla(tipo, texto, alquilerId) {
  const ventana = window.open('', '_blank'); // se abre antes del fetch para que el navegador no la bloquee
  try {
    const res = await fetch('/api/plantillas/previa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, texto, alquiler_id: alquilerId })
    });
    if (!res.ok) {
      const datos = await res.json().catch(() => ({}));
      throw new Error(datos.error || 'No se pudo generar la vista previa');
    }
    const html = await res.text();
    ventana.document.write(html);
    ventana.document.close();
  } catch (err) {
    ventana?.close();
    throw err;
  }
}

export const dinero = (centavos) => {
  const negativo = centavos < 0;
  return (negativo ? '-$' : '$') + (Math.abs(centavos) / 100).toFixed(2);
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function fechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

export function nombreMes(iso) {
  // recibe 'YYYY-MM'
  const [y, m] = iso.split('-').map(Number);
  return `${MESES_LARGO[m - 1]} ${y}`;
}

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ----- Cálculo visual del saldo (réplica de lib/calculos.js, solo de guía) -----
// El monto real lo calcula siempre el servidor; esto sirve para mostrar al
// usuario cuánto debería pagar a medida que cambia las fechas en los modales.

// Días cobrables entre dos fechas (mismo criterio que el servidor):
// domingo nunca; sábado solo si cobraSabado; primer/último día según se indique.
export function diasCobrables(desde, hasta, cobraSabado, contarPrimero, contarUltimo) {
  if (!desde || !hasta || hasta < desde) return 0;
  const [y1, m1, d1] = desde.split('-').map(Number);
  const [y2, m2, d2] = hasta.split('-').map(Number);
  const ini = new Date(y1, m1 - 1, d1);
  const fin = new Date(y2, m2 - 1, d2);
  let dias = 0;
  for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
    if (!contarPrimero && d.getTime() === ini.getTime() && fin > ini) continue;
    if (!contarUltimo && d.getTime() === fin.getTime() && fin > ini) continue;
    const dow = d.getDay();
    if (dow === 0) continue;
    if (dow === 6 && !cobraSabado) continue;
    dias++;
  }
  return dias;
}

// Proyecta cuánto sería el cargo y el saldo si se cobrara hasta `hasta`.
// Lo ya devuelto queda fijo; solo se recalcula lo que sigue afuera.
export function proyectarSaldo(alq, hasta, cobrarUltimoDia = true) {
  let cargoTotal = 0;
  for (const it of alq.items || []) {
    const inicioItem = it.fecha_inicio || alq.fecha_inicio;
    let cargo = it.cargo - it.cargo_pendiente; // parte ya devuelta, fija
    if (it.pendientes > 0) {
      const dias = diasCobrables(inicioItem, hasta, alq.cobra_sabado, alq.cobrar_primer_dia, cobrarUltimoDia);
      cargo += it.pendientes * it.precio_dia * dias;
    }
    cargoTotal += cargo;
  }
  const saldo = cargoTotal - alq.descuento - alq.pagado;
  return { cargo_total: cargoTotal, saldo };
}

export function nombreTipo(tipo, cantidad = 2) {
  if (tipo === 'andamio') return cantidad === 1 ? 'andamio' : 'andamios';
  return cantidad === 1 ? 'tablón' : 'tablones';
}

export function navegar(ruta) {
  window.location.hash = ruta;
}
