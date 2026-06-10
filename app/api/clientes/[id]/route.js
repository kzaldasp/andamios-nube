import { una, todas, ejecutar } from '../../../../lib/db.js';
import { conSesion } from '../../../../lib/auth.js';
import { hoyLocal, calcularVarios } from '../../../../lib/calculos.js';

export const GET = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const cliente = await una('SELECT * FROM clientes WHERE id = ?', Number(id));
  if (!cliente) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
  const hoy = hoyLocal();
  const alqs = await todas('SELECT * FROM alquileres WHERE cliente_id = ? ORDER BY id DESC', cliente.id);
  const calculos = await calcularVarios(alqs, hoy);
  const alquileres = alqs.map(a => {
    const calc = calculos.get(a.id);
    return {
      id: a.id, fecha_inicio: a.fecha_inicio, estado: a.estado, fecha_cierre: a.fecha_cierre,
      cargo_total: calc.cargo_total, pagado: calc.pagado, saldo: calc.saldo,
      resumen_items: calc.items.map(i => `${i.cantidad} ${i.tipo === 'andamio' ? 'andamio(s)' : 'tablón(es)'}`).join(', ')
    };
  });
  return Response.json({ ...cliente, alquileres });
});

export const PUT = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const actual = await una('SELECT * FROM clientes WHERE id = ?', Number(id));
  if (!actual) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
  const c = await request.json();
  if (c.nombre !== undefined && !c.nombre.trim()) return Response.json({ error: 'El nombre no puede quedar vacío' }, { status: 400 });
  await ejecutar('UPDATE clientes SET nombre = ?, cedula = ?, telefono = ?, direccion = ?, notas = ? WHERE id = ?',
    c.nombre?.trim() ?? actual.nombre, c.cedula ?? actual.cedula, c.telefono ?? actual.telefono,
    c.direccion ?? actual.direccion, c.notas ?? actual.notas, Number(id));
  return Response.json({ ok: true });
});
