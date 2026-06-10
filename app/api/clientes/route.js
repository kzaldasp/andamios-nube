import { todas, ejecutar } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';

export const GET = conSesion(async () => {
  return Response.json(await todas('SELECT * FROM clientes ORDER BY nombre'));
});

export const POST = conSesion(async (request) => {
  const c = await request.json();
  if (!c.nombre?.trim()) return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  const r = await ejecutar('INSERT INTO clientes (nombre, cedula, telefono, direccion, notas) VALUES (?, ?, ?, ?, ?)',
    c.nombre.trim(), c.cedula || '', c.telefono || '', c.direccion || '', c.notas || '');
  return Response.json({ id: r.lastInsertRowid }, { status: 201 });
});
