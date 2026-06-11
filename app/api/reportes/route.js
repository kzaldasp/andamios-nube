import { todas, una } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';
import { hoyLocal, calcularVarios } from '../../../lib/calculos.js';

// Reportes con filtro de fechas opcional (?desde=YYYY-MM-DD&hasta=YYYY-MM-DD)
export const GET = conSesion(async (request) => {
  const sp = new URL(request.url).searchParams;
  const desde = sp.get('desde') || '';
  const hasta = sp.get('hasta') || '';

  // Condición reutilizable sobre una columna de fecha
  const rango = (columna) => {
    const cond = [], args = [];
    if (desde) { cond.push(`${columna} >= ?`); args.push(desde); }
    if (hasta) { cond.push(`${columna} <= ?`); args.push(hasta); }
    return { where: cond.length ? 'WHERE ' + cond.join(' AND ') : '', cond, args };
  };

  const rp = rango('p.fecha');

  const porMes = await todas(`
    SELECT substr(p.fecha, 1, 7) AS mes, SUM(p.monto) AS total, COUNT(*) AS pagos
    FROM pagos p ${rp.where} GROUP BY mes ORDER BY mes DESC LIMIT 24`, ...rp.args);

  const cobrado = await una(`SELECT COALESCE(SUM(p.monto), 0) AS total, COUNT(*) AS n FROM pagos p ${rp.where}`, ...rp.args);
  const ri = rango('a.fecha_inicio');
  const nuevos = (await una(`SELECT COUNT(*) AS n FROM alquileres a ${ri.where}`, ...ri.args)).n;
  const rc = rango('a.fecha_cierre');
  const cerrados = await una(`
    SELECT COUNT(*) AS n, COALESCE(SUM(a.descuento), 0) AS descuentos
    FROM alquileres a ${rc.where ? rc.where + " AND" : 'WHERE'} a.estado = 'cerrado'`, ...rc.args);

  const topClientes = await todas(`
    SELECT c.id, c.nombre, SUM(p.monto) AS total, COUNT(p.id) AS pagos
    FROM pagos p
    JOIN alquileres a ON a.id = p.alquiler_id
    JOIN clientes c ON c.id = a.cliente_id
    ${rp.where}
    GROUP BY c.id, c.nombre ORDER BY total DESC LIMIT 8`, ...rp.args);

  // Deudores: estado actual de los alquileres activos (no depende del rango)
  const activos = await todas(`
    SELECT a.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
    FROM alquileres a JOIN clientes c ON c.id = a.cliente_id WHERE a.estado = 'activo'`);
  const calculos = await calcularVarios(activos, hoyLocal());
  const deudores = activos
    .map(a => ({
      alquiler_id: a.id, cliente_nombre: a.cliente_nombre, cliente_telefono: a.cliente_telefono,
      fecha_inicio: a.fecha_inicio, saldo: calculos.get(a.id).saldo
    }))
    .filter(d => d.saldo > 0)
    .sort((x, y) => y.saldo - x.saldo);

  const ultimosPagos = await todas(`
    SELECT p.*, c.nombre AS cliente_nombre, u.nombre AS usuario_nombre
    FROM pagos p
    JOIN alquileres a ON a.id = p.alquiler_id
    JOIN clientes c ON c.id = a.cliente_id
    LEFT JOIN usuarios u ON u.id = p.usuario_id
    ${rp.where}
    ORDER BY p.fecha DESC, p.id DESC LIMIT 50`, ...rp.args);

  return Response.json({
    por_mes: porMes,
    totales: {
      cobrado: cobrado.total, pagos: cobrado.n,
      alquileres_nuevos: nuevos, alquileres_cerrados: cerrados.n, descuentos: cerrados.descuentos
    },
    top_clientes: topClientes,
    deudores,
    ultimos_pagos: ultimosPagos
  });
});
