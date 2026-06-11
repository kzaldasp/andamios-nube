import { todas, una, ejecutar } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';

// Búsqueda de clientes en el servidor: devuelve solo los campos que usan
// las listas y como máximo `limite` resultados, para que cargue rápido.
export const GET = conSesion(async (request) => {
  const sp = new URL(request.url).searchParams;
  const q = (sp.get('q') || '').trim();
  const limite = Math.min(Math.max(Number(sp.get('limite')) || 100, 1), 500);
  const patron = `%${q}%`;
  const where = q ? 'WHERE nombre LIKE ? OR cedula LIKE ? OR telefono LIKE ?' : '';
  const args = q ? [patron, patron, patron] : [];
  const total = (await una(`SELECT COUNT(*) AS n FROM clientes ${where}`, ...args)).n;
  const clientes = await todas(
    `SELECT id, nombre, cedula, telefono FROM clientes ${where} ORDER BY nombre LIMIT ${limite}`, ...args);
  return Response.json({ total, clientes });
});

export const POST = conSesion(async (request) => {
  const c = await request.json();
  if (!c.nombre?.trim()) return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  const r = await ejecutar('INSERT INTO clientes (nombre, cedula, telefono, direccion, notas) VALUES (?, ?, ?, ?, ?)',
    c.nombre.trim(), c.cedula || '', c.telefono || '', c.direccion || '', c.notas || '');
  return Response.json({ id: r.lastInsertRowid }, { status: 201 });
});
