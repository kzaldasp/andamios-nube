import { ejecutar } from '../../../../lib/db.js';
import { conSesion } from '../../../../lib/auth.js';
import { hoyLocal, inventarioTotal } from '../../../../lib/calculos.js';

export const POST = conSesion(async (request, contexto, usuario) => {
  const { tipo, cantidad, motivo } = await request.json();
  if (tipo !== 'andamio' && tipo !== 'tablon') return Response.json({ error: 'Tipo inválido' }, { status: 400 });
  const cant = Math.trunc(Number(cantidad));
  if (!cant) return Response.json({ error: 'Cantidad inválida' }, { status: 400 });
  const total = (await inventarioTotal())[tipo];
  if (total + cant < 0) return Response.json({ error: `No puedes dar de baja más de ${total}` }, { status: 400 });
  await ejecutar('INSERT INTO inventario_movimientos (tipo, cantidad, motivo, fecha, usuario_id) VALUES (?, ?, ?, ?, ?)',
    tipo, cant, motivo || '', hoyLocal(), usuario.id);
  return Response.json({ ok: true });
});
