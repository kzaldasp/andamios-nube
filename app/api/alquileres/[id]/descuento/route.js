import { una, ejecutar } from '../../../../../lib/db.js';
import { conSesion } from '../../../../../lib/auth.js';

export const POST = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const alq = await una('SELECT * FROM alquileres WHERE id = ?', Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  const c = await request.json();
  const monto = Math.max(0, Math.round(Number(c.monto) * 100) || 0);
  await ejecutar('UPDATE alquileres SET descuento = ? WHERE id = ?', monto, alq.id);
  return Response.json({ ok: true });
});
