// Lógica de cobro: días cobrables y estado de cuenta de cada alquiler
import { todas } from './db.js';

// Fecha de hoy en Ecuador, sin importar en qué país corra el servidor
export function hoyLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
}

// Días cobrables entre dos fechas.
// - El día de inicio cuenta. El último día cuenta solo si contarUltimo.
// - Domingo nunca se cobra; sábado solo si cobraSabado.
export function diasCobrables(desde, hasta, cobraSabado, contarUltimo) {
  if (hasta < desde) return 0;
  const [y1, m1, d1] = desde.split('-').map(Number);
  const [y2, m2, d2] = hasta.split('-').map(Number);
  const ini = new Date(y1, m1 - 1, d1);
  const fin = new Date(y2, m2 - 1, d2);
  let dias = 0;
  for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
    if (!contarUltimo && d.getTime() === fin.getTime() && fin > ini) continue;
    const dow = d.getDay(); // 0 = domingo, 6 = sábado
    if (dow === 0) continue;
    if (dow === 6 && !cobraSabado) continue;
    dias++;
  }
  return dias;
}

// Estado de cuenta de varios alquileres con solo 3 consultas en total
// (importante ahora que la base de datos está en internet).
// Devuelve un Map: alquiler_id -> { items, pagos, cargo_total, pagado, saldo }
export async function calcularVarios(alqs, hasta) {
  const resultado = new Map();
  if (!alqs.length) return resultado;
  const ids = alqs.map(a => a.id);
  const ph = ids.map(() => '?').join(',');

  const items = await todas(`SELECT * FROM alquiler_items WHERE alquiler_id IN (${ph})`, ...ids);
  const itemIds = items.map(i => i.id);
  const devs = itemIds.length ? await todas(`
    SELECT d.*, u.nombre AS usuario_nombre FROM devoluciones d
    LEFT JOIN usuarios u ON u.id = d.usuario_id
    WHERE d.item_id IN (${itemIds.map(() => '?').join(',')})
    ORDER BY d.fecha, d.id`, ...itemIds) : [];
  const pagos = await todas(`
    SELECT p.*, u.nombre AS usuario_nombre FROM pagos p
    LEFT JOIN usuarios u ON u.id = p.usuario_id
    WHERE p.alquiler_id IN (${ph}) ORDER BY p.fecha, p.id`, ...ids);

  for (const alq of alqs) {
    const fechaTope = alq.estado === 'cerrado' && alq.fecha_cierre ? alq.fecha_cierre : hasta;
    let cargoTotal = 0;
    const detalleItems = items.filter(it => it.alquiler_id === alq.id).map(it => {
      let devueltas = 0, cargo = 0;
      const devsDetalle = devs.filter(dv => dv.item_id === it.id).map(dv => {
        const dias = diasCobrables(alq.fecha_inicio, dv.fecha, alq.cobra_sabado, dv.cobrar_ultimo_dia);
        const sub = dv.cantidad * it.precio_dia * dias;
        devueltas += dv.cantidad;
        cargo += sub;
        return { ...dv, dias, subtotal: sub };
      });
      const pendientes = it.cantidad - devueltas;
      let diasPend = 0, cargoPend = 0;
      if (pendientes > 0) {
        diasPend = diasCobrables(alq.fecha_inicio, fechaTope, alq.cobra_sabado, true);
        cargoPend = pendientes * it.precio_dia * diasPend;
        cargo += cargoPend;
      }
      cargoTotal += cargo;
      return {
        ...it, devueltas, pendientes,
        dias_pendientes: diasPend, cargo_pendiente: cargoPend,
        cargo, devoluciones: devsDetalle
      };
    });
    const pagosAlq = pagos.filter(p => p.alquiler_id === alq.id);
    const pagado = pagosAlq.reduce((s, p) => s + p.monto, 0);
    const saldo = cargoTotal - alq.descuento - pagado;
    resultado.set(alq.id, { items: detalleItems, pagos: pagosAlq, cargo_total: cargoTotal, pagado, saldo });
  }
  return resultado;
}

export async function calcularAlquiler(alq, hasta) {
  return (await calcularVarios([alq], hasta)).get(alq.id);
}

// Unidades fuera (sin devolver) en alquileres activos, por tipo
export async function unidadesFuera() {
  const llevadas = await todas(`
    SELECT i.tipo, COALESCE(SUM(i.cantidad), 0) AS n
    FROM alquiler_items i JOIN alquileres a ON a.id = i.alquiler_id
    WHERE a.estado = 'activo' GROUP BY i.tipo`);
  const devueltas = await todas(`
    SELECT i.tipo, COALESCE(SUM(d.cantidad), 0) AS n
    FROM devoluciones d
    JOIN alquiler_items i ON i.id = d.item_id
    JOIN alquileres a ON a.id = i.alquiler_id
    WHERE a.estado = 'activo' GROUP BY i.tipo`);
  const fuera = { andamio: 0, tablon: 0 };
  for (const f of llevadas) fuera[f.tipo] += f.n;
  for (const f of devueltas) fuera[f.tipo] -= f.n;
  return fuera;
}

// Inventario total por tipo (suma de altas y bajas)
export async function inventarioTotal() {
  const total = { andamio: 0, tablon: 0 };
  for (const f of await todas('SELECT tipo, COALESCE(SUM(cantidad), 0) AS s FROM inventario_movimientos GROUP BY tipo')) {
    total[f.tipo] = f.s;
  }
  return total;
}
