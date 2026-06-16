// Pruebas del formato editable de pagaré y recibo. Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';

process.env.TURSO_DATABASE_URL = 'file:pruebas-plantillas.db';
rmSync('pruebas-plantillas.db', { force: true });
const { ejecutar, guardarConfig } = await import('../lib/db.js');
const { paginaPagare, paginaRecibo } = await import('../lib/imprimir.js');

await ejecutar(`INSERT INTO clientes (nombre, cedula, telefono) VALUES ('Juan Pérez', '1712345678', '0991234567')`);
await ejecutar(`INSERT INTO alquileres (cliente_id, fecha_inicio, garantia, direccion_obra) VALUES (1, '2026-06-01', 'Cédula', 'Av. Siempre Viva 123')`);
await ejecutar(`INSERT INTO alquiler_items (alquiler_id, tipo, cantidad, precio_dia) VALUES (1, 'andamio', 4, 50)`);
await ejecutar(`INSERT INTO pagos (alquiler_id, monto, fecha, nota) VALUES (1, 1000, '2026-06-10', 'abono')`);

test('pagaré con formato por defecto', async () => {
  const html = await paginaPagare(1);
  for (const t of ['PAGARÉ POR ALQUILER', 'Juan Pérez', '1712345678', 'Av. Siempre Viva 123', 'cada cuadro de andamio', 'EL CLIENTE', 'Enviar por WhatsApp']) {
    assert.ok(html.includes(t), `falta: ${t}`);
  }
  assert.ok(!html.includes('<table>'), 'ya no debe haber tabla con totales en el pagaré');
  assert.ok(!html.includes('Observaciones'), 'la línea sin datos debió omitirse');
  assert.ok(!html.includes('{{'), 'quedó un marcador sin reemplazar');
});

test('recibo con formato por defecto', async () => {
  const html = await paginaRecibo(1);
  for (const t of ['RECIBO DE PAGO', '$10.00', 'monto-grande', 'abono', 'RECIBÍ CONFORME']) {
    assert.ok(html.includes(t), `falta: ${t}`);
  }
});

test('la plantilla global personalizada reemplaza a la original', async () => {
  await guardarConfig({ plantilla_pagare: '# MI TÍTULO\n\nCliente: **{{cliente}}**\n\nGarantía: {{garantia}}' });
  const html = await paginaPagare(1);
  assert.ok(html.includes('MI TÍTULO'));
  assert.ok(html.includes('<strong>Juan Pérez</strong>'));
  assert.ok(!html.includes('PAGARÉ POR ALQUILER'));
});

test('la plantilla del alquiler gana sobre la global', async () => {
  await ejecutar(`UPDATE alquileres SET plantilla_pagare = 'SOLO ESTE: {{cliente}}' WHERE id = 1`);
  const html = await paginaPagare(1);
  assert.ok(html.includes('SOLO ESTE: Juan Pérez'));
  assert.ok(!html.includes('MI TÍTULO'));
});

test('la vista previa (plantilla forzada) gana sobre todo', async () => {
  const html = await paginaPagare(1, 'PREVIA de {{cliente}}');
  assert.ok(html.includes('PREVIA de Juan Pérez'));
});

test('los datos del cliente no inyectan HTML', async () => {
  await ejecutar(`UPDATE clientes SET nombre = '<script>x</script>' WHERE id = 1`);
  const html = await paginaPagare(1, '{{cliente}}');
  assert.ok(!html.includes('<script>x'));
});
