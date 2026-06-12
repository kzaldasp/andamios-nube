import { ejecutar } from '../../../lib/db.js';
import { hayUsuarios, crearSesion, publica } from '../../../lib/auth.js';
import { hashPin } from '../../../lib/pines.js';

// Crear el primer usuario (solo cuando no existe ninguno)
export const POST = publica(async (request) => {
  if (await hayUsuarios()) return Response.json({ error: 'Ya hay usuarios creados' }, { status: 400 });
  const { nombre, pin } = await request.json();
  if (!nombre?.trim() || !/^\d{4,6}$/.test(pin || '')) {
    return Response.json({ error: 'Nombre y PIN de 4 a 6 dígitos son obligatorios' }, { status: 400 });
  }
  const r = await ejecutar('INSERT INTO usuarios (nombre, pin) VALUES (?, ?)', nombre.trim(), hashPin(pin));
  const cookie = await crearSesion(r.lastInsertRowid);
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': cookie } });
});
