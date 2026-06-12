import { todas, ejecutar } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';
import { hashPin } from '../../../lib/pines.js';

export const GET = conSesion(async () => {
  return Response.json(await todas('SELECT id, nombre, activo FROM usuarios ORDER BY nombre'));
});

export const POST = conSesion(async (request) => {
  const { nombre, pin } = await request.json();
  if (!nombre?.trim()) return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  if (!/^\d{4,6}$/.test(pin || '')) return Response.json({ error: 'El PIN debe tener de 4 a 6 dígitos' }, { status: 400 });
  try {
    const r = await ejecutar('INSERT INTO usuarios (nombre, pin) VALUES (?, ?)', nombre.trim(), hashPin(pin));
    return Response.json({ id: r.lastInsertRowid }, { status: 201 });
  } catch {
    return Response.json({ error: 'Ya existe un usuario con ese nombre' }, { status: 400 });
  }
});
