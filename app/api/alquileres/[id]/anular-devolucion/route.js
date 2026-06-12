import { una, ejecutar } from '../../../../../lib/db.js';
import { conSesion } from '../../../../../lib/auth.js';

// Anula una devolución registrada por error: las piezas vuelven a contar como afuera
export const POST = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const alq = await una('SELECT * FROM alquileres WHERE id = ?', Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  if (alq.estado === 'cerrado') {
    return Response.json({ error: 'El alquiler está cerrado: reábrelo primero para anular la devolución' }, { status: 400 });
  }
  const c = await request.json();
  const dev = await una(`
    SELECT d.* FROM devoluciones d
    JOIN alquiler_items i ON i.id = d.item_id
    WHERE d.id = ? AND i.alquiler_id = ?`, Number(c.devolucion_id), alq.id);
  if (!dev) return Response.json({ error: 'Devolución no encontrada' }, { status: 400 });
  await ejecutar('DELETE FROM devoluciones WHERE id = ?', dev.id);
  return Response.json({ ok: true });
});
