import { todas } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';
import { hoyLocal } from '../../../lib/calculos.js';

// Descarga una copia de seguridad de todos los datos en un archivo JSON.
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
