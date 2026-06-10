import { una, ejecutar } from '../../../../../lib/db.js';
import { conSesion } from '../../../../../lib/auth.js';
import { hoyLocal } from '../../../../../lib/calculos.js';

export const POST = conSesion(async (request, contexto, usuario) => {
  const { id } = await contexto.params;
  const alq = await una('SELECT * FROM alquileres WHERE id = ?', Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  const c = await request.json();
  const monto = Math.round(Number(c.monto) * 100); // llega en dólares
  if (!monto || monto <= 0) return Response.json({ error: 'Monto inválido' }, { status: 400 });
  const r = await ejecutar('INSERT INTO pagos (alquiler_id, monto, fecha, nota, usuario_id) VALUES (?, ?, ?, ?, ?)',
    alq.id, monto, c.fecha || hoyLocal(), c.nota || '', usuario.id);
  return Response.json({ ok: true, pago_id: r.lastInsertRowid });
});
