import { una, ejecutar } from '../../../../lib/db.js';
import { conSesion } from '../../../../lib/auth.js';

export const PUT = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const u = await una('SELECT * FROM usuarios WHERE id = ?', Number(id));
  if (!u) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });
  const { nombre, pin, activo } = await request.json();
  if (pin !== undefined && pin !== '' && !/^\d{4,6}$/.test(pin)) {
    return Response.json({ error: 'El PIN debe tener de 4 a 6 dígitos' }, { status: 400 });
  }
  if (activo === 0 || activo === false) {
    const activos = (await una('SELECT COUNT(*) AS n FROM usuarios WHERE activo = 1')).n;
    if (activos <= 1 && u.activo) return Response.json({ error: 'Debe quedar al menos un usuario activo' }, { status: 400 });
  }
  await ejecutar('UPDATE usuarios SET nombre = ?, pin = ?, activo = ? WHERE id = ?',
    nombre?.trim() || u.nombre, (pin && pin !== '') ? pin : u.pin, activo === undefined ? u.activo : (activo ? 1 : 0), Number(id));
  return Response.json({ ok: true });
});
