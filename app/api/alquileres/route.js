import { todas, ejecutar, leerConfig } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';
import { hoyLocal, calcularVarios } from '../../../lib/calculos.js';

export const GET = conSesion(async (request) => {
  const hoy = hoyLocal();
  const sp = new URL(request.url).searchParams;
  const cond = [], args = [];
  if (sp.get('estado')) { cond.push('a.estado = ?'); args.push(sp.get('estado')); }
  if (sp.get('desde')) { cond.push('a.fecha_inicio >= ?'); args.push(sp.get('desde')); }
  if (sp.get('hasta')) { cond.push('a.fecha_inicio <= ?'); args.push(sp.get('hasta')); }
  let sql = 'SELECT a.*, c.nombre AS cliente_nombre FROM alquileres a JOIN clientes c ON c.id = a.cliente_id';
  if (cond.length) sql += ' WHERE ' + cond.join(' AND ');
  sql += ' ORDER BY a.id DESC LIMIT 300';
  const alqs = await todas(sql, ...args);
  const calculos = await calcularVarios(alqs, hoy);
  const lista = alqs.map(a => {
    const calc = calculos.get(a.id);
    return {
      id: a.id, cliente_nombre: a.cliente_nombre, fecha_inicio: a.fecha_inicio,
      estado: a.estado, fecha_cierre: a.fecha_cierre,
      cargo_total: calc.cargo_total, pagado: calc.pagado, saldo: calc.saldo,
      resumen_items: calc.items.map(i => `${i.cantidad} ${i.tipo === 'andamio' ? 'andamio(s)' : 'tablón(es)'}`).join(', ')
    };
  });
  return Response.json(lista);
});

export const POST = conSesion(async (request, contexto, usuario) => {
  const c = await request.json();
  let clienteId = Number(c.cliente_id) || null;
  if (!clienteId && c.cliente) {
    if (!c.cliente.nombre?.trim()) return Response.json({ error: 'El nombre del cliente es obligatorio' }, { status: 400 });
    const r = await ejecutar('INSERT INTO clientes (nombre, cedula, telefono, direccion) VALUES (?, ?, ?, ?)',
      c.cliente.nombre.trim(), c.cliente.cedula || '', c.cliente.telefono || '', c.cliente.direccion || '');
    clienteId = r.lastInsertRowid;
  }
  if (!clienteId) return Response.json({ error: 'Falta el cliente' }, { status: 400 });

  const cfg = await leerConfig();
  const precios = { andamio: Number(cfg.precio_andamio), tablon: Number(cfg.precio_tablon) };
  const items = (c.items || [])
    .map(i => ({ tipo: i.tipo === 'andamio' ? 'andamio' : 'tablon', cantidad: Math.floor(Number(i.cantidad) || 0), prestamo: !!i.prestamo }))
    .filter(i => i.cantidad > 0);
  if (!items.length) return Response.json({ error: 'Agrega al menos un andamio o tablón' }, { status: 400 });

  const fecha = c.fecha_inicio || hoyLocal();
  const r = await ejecutar(`INSERT INTO alquileres (cliente_id, fecha_inicio, cobra_sabado, cobrar_primer_dia, garantia, direccion_obra, notas, creado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    clienteId, fecha, c.cobra_sabado === false ? 0 : 1, c.cobrar_primer_dia === false ? 0 : 1,
    c.garantia || '', c.direccion_obra || '', c.notas || '', usuario.id);
  const alqId = r.lastInsertRowid;
  for (const it of items) {
    await ejecutar('INSERT INTO alquiler_items (alquiler_id, tipo, cantidad, precio_dia) VALUES (?, ?, ?, ?)',
      alqId, it.tipo, it.cantidad, it.prestamo ? 0 : precios[it.tipo]);
  }
  // Abono entregado al momento de llevarse las piezas (opcional)
  const abono = Math.round(Number(c.abono) * 100) || 0;
  if (abono > 0) {
    await ejecutar('INSERT INTO pagos (alquiler_id, monto, fecha, nota, usuario_id) VALUES (?, ?, ?, ?, ?)',
      alqId, abono, fecha, 'Abono inicial', usuario.id);
  }
  return Response.json({ id: alqId }, { status: 201 });
});
