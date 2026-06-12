// Pruebas del corazón del negocio: días cobrables y estado de cuenta.
// Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';

process.env.TURSO_DATABASE_URL = 'file:pruebas-calculos.db';
rmSync('pruebas-calculos.db', { force: true });
const { diasCobrables, calcularAlquiler } = await import('../lib/calculos.js');
const { ejecutar } = await import('../lib/db.js');

// 2026-06-01 es lunes; 2026-06-06 sábado; 2026-06-07 domingo

test('semana completa de lunes a sábado', () => {
  assert.equal(diasCobrables('2026-06-01', '2026-06-06', 1, 1, 1), 6);
});

test('el domingo nunca se cobra', () => {
  assert.equal(diasCobrables('2026-06-01', '2026-06-07', 1, 1, 1), 6);
});

test('sin sábados se cobra solo de lunes a viernes', () => {
  assert.equal(diasCobrables('2026-06-01', '2026-06-07', 0, 1, 1), 5);
});

test('sin contar el primer día', () => {
  assert.equal(diasCobrables('2026-06-01', '2026-06-05', 1, 0, 1), 4);
});

test('sin contar el último día', () => {
  assert.equal(diasCobrables('2026-06-01', '2026-06-05', 1, 1, 0), 4);
});

test('llevar y devolver el mismo día siempre cobra ese día', () => {
  assert.equal(diasCobrables('2026-06-02', '2026-06-02', 1, 0, 0), 1);
});

test('rango invertido no cobra nada', () => {
  assert.equal(diasCobrables('2026-06-05', '2026-06-01', 1, 1, 1), 0);
});

test('estado de cuenta: devolución parcial, cobrar_hasta y pieza agregada después', async () => {
  await ejecutar(`INSERT INTO clientes (nombre) VALUES ('Prueba')`);
  await ejecutar(`INSERT INTO alquileres (cliente_id, fecha_inicio, cobra_sabado, cobrar_primer_dia) VALUES (1, '2026-06-01', 1, 1)`);
  // 2 andamios a $0.50/día desde el inicio
  await ejecutar(`INSERT INTO alquiler_items (alquiler_id, tipo, cantidad, precio_dia) VALUES (1, 'andamio', 2, 50)`);
  // 1 tablón a $0.25/día agregado el jueves 4 (cobra desde su propia fecha)
  await ejecutar(`INSERT INTO alquiler_items (alquiler_id, tipo, cantidad, precio_dia, fecha_inicio) VALUES (1, 'tablon', 1, 25, '2026-06-04')`);
  // Devuelve 1 andamio el viernes 5, pero acordaron cobrar solo hasta el miércoles 3
  await ejecutar(`INSERT INTO devoluciones (item_id, cantidad, fecha, cobrar_hasta, cobrar_ultimo_dia) VALUES (1, 1, '2026-06-05', '2026-06-03', 1)`);
  await ejecutar(`INSERT INTO pagos (alquiler_id, monto, fecha) VALUES (1, 100, '2026-06-05')`);

  const alq = { id: 1, fecha_inicio: '2026-06-01', cobra_sabado: 1, cobrar_primer_dia: 1, estado: 'activo', fecha_cierre: null, descuento: 0 };
  const calc = await calcularAlquiler(alq, '2026-06-06'); // corte el sábado 6

  const andamios = calc.items.find(i => i.tipo === 'andamio');
  // Devuelto: lun a mié = 3 días × $0.50 = $1.50
  assert.equal(andamios.devoluciones[0].dias, 3);
  assert.equal(andamios.devoluciones[0].subtotal, 150);
  // Pendiente: 1 andamio, lun a sáb = 6 días × $0.50 = $3.00
  assert.equal(andamios.pendientes, 1);
  assert.equal(andamios.dias_pendientes, 6);
  assert.equal(andamios.cargo, 450);

  const tablones = calc.items.find(i => i.tipo === 'tablon');
  // Desde el jueves 4 al sábado 6 = 3 días × $0.25 = $0.75
  assert.equal(tablones.dias_pendientes, 3);
  assert.equal(tablones.cargo, 75);

  assert.equal(calc.cargo_total, 525);
  assert.equal(calc.pagado, 100);
  assert.equal(calc.saldo, 425);
});
