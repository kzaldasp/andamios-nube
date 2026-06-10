import { una, ejecutar } from '../../../../../lib/db.js';
import { conSesion } from '../../../../../lib/auth.js';
import { hoyLocal } from '../../../../../lib/calculos.js';

export const POST = conSesion(async (request, contexto, usuario) => {
  const { id } = await contexto.params;
  const alq = await una('SELECT * FROM alquileres WHERE id = ?', Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  const c = await request.json();
  const item = await una('SELECT * FROM alquiler_items WHERE id = ? AND alquiler_id = ?', Number(c.item_id), alq.id);
  if (!item) return Response.json({ error: 'Ítem no válido' }, { status: 400 });
  const yaDevueltas = (await una('SELECT COALESCE(SUM(cantidad), 0) AS s FROM devoluciones WHERE item_id = ?', item.id)).s;
  const cant = Math.floor(Number(c.cantidad) || 0);
  if (cant < 1) return Response.json({ error: 'Cantidad inválida' }, { status: 400 });
  if (yaDevueltas + cant > item.cantidad) {
    return Response.json({ error: `Solo quedan ${item.cantidad - yaDevueltas} por devolver` }, { status: 400 });
  }
  const fecha = c.fecha || hoyLocal();
  if (fecha < alq.fecha_inicio) return Response.json({ error: 'La fecha de devolución no puede ser antes del inicio' }, { status: 400 });
  await ejecutar('INSERT INTO devoluciones (item_id, cantidad, fecha, cobrar_ultimo_dia, usuario_id) VALUES (?, ?, ?, ?, ?)',
    item.id, cant, fecha, c.cobrar_ultimo_dia === false ? 0 : 1, usuario.id);
  return Response.json({ ok: true });
});
