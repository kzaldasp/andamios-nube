import { una, ejecutar } from '../../../../../lib/db.js';
import { conSesion } from '../../../../../lib/auth.js';

// Anula un pago registrado por error: desaparece de la cuenta y de los reportes
export const POST = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const alq = await una('SELECT * FROM alquileres WHERE id = ?', Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  if (alq.estado === 'cerrado') {
    return Response.json({ error: 'El alquiler está cerrado: reábrelo primero para anular el pago' }, { status: 400 });
  }
  const c = await request.json();
  const pago = await una('SELECT * FROM pagos WHERE id = ? AND alquiler_id = ?', Number(c.pago_id), alq.id);
  if (!pago) return Response.json({ error: 'Pago no encontrado' }, { status: 400 });
  await ejecutar('DELETE FROM pagos WHERE id = ?', pago.id);
  return Response.json({ ok: true });
});
