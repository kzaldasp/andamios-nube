import { una, ejecutar } from '../../../../../lib/db.js';
import { conSesion } from '../../../../../lib/auth.js';

export const POST = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const alq = await una('SELECT * FROM alquileres WHERE id = ?', Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  await ejecutar(`UPDATE alquileres SET estado = 'activo', fecha_cierre = NULL, cerrado_por = NULL WHERE id = ?`, alq.id);
  return Response.json({ ok: true });
});
