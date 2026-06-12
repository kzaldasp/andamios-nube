import { todas, db } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';
import { hoyLocal } from '../../../lib/calculos.js';
import { hashPin, esPinHasheado } from '../../../lib/pines.js';

// Copia de seguridad de todos los datos en un archivo JSON, y restauración.
// (La base vive en Turso; esto permite guardar una copia propia.)
const TABLAS = ['usuarios', 'clientes', 'alquileres', 'alquiler_items', 'devoluciones', 'pagos', 'inventario_movimientos', 'config'];

export const GET = conSesion(async () => {
  const copia = { generado: new Date().toISOString(), aplicacion: 'alquiler-andamios' };
  for (const tabla of TABLAS) copia[tabla] = await todas(`SELECT * FROM ${tabla}`);
  return new Response(JSON.stringify(copia, null, 1), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="respaldo-andamios-${hoyLocal()}.json"`
    }
  });
});

// Restaura un respaldo: borra TODO lo actual y carga lo del archivo.
// Cierra todas las sesiones (hay que volver a entrar con el PIN del respaldo).
export const POST = conSesion(async (request) => {
  const copia = await request.json();
  if (copia?.aplicacion !== 'alquiler-andamios') {
    return Response.json({ error: 'El archivo no parece un respaldo de esta aplicación' }, { status: 400 });
  }
  for (const tabla of TABLAS) {
    if (!Array.isArray(copia[tabla])) {
      return Response.json({ error: `El respaldo está incompleto: falta la tabla "${tabla}"` }, { status: 400 });
    }
  }
  if (!copia.usuarios.length) {
    return Response.json({ error: 'El respaldo no tiene usuarios: no se puede restaurar' }, { status: 400 });
  }

  const c = await db();
  // Borrar primero las tablas hijas, luego las padres
  await c.batch([
    'DELETE FROM devoluciones', 'DELETE FROM pagos', 'DELETE FROM alquiler_items',
    'DELETE FROM alquileres', 'DELETE FROM inventario_movimientos', 'DELETE FROM clientes',
    'DELETE FROM sesiones', 'DELETE FROM intentos_login', 'DELETE FROM usuarios', 'DELETE FROM config'
  ], 'write');

  // Insertar en orden padres → hijas, conservando los mismos ids
  const ORDEN = ['usuarios', 'clientes', 'alquileres', 'alquiler_items', 'devoluciones', 'pagos', 'inventario_movimientos', 'config'];
  for (const tabla of ORDEN) {
    const filas = copia[tabla].map(fila => {
      // Respaldos viejos traen el PIN en texto plano: se convierte aquí
      if (tabla === 'usuarios' && !esPinHasheado(fila.pin)) return { ...fila, pin: hashPin(fila.pin) };
      return fila;
    });
    for (let i = 0; i < filas.length; i += 50) {
      await c.batch(filas.slice(i, i + 50).map(fila => {
        const columnas = Object.keys(fila);
        return {
          sql: `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`,
          args: columnas.map(k => fila[k])
        };
      }), 'write');
    }
  }
  return Response.json({ ok: true, restaurado: copia.generado || '' });
});
