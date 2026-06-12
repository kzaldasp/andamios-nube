// Pruebas del guardado seguro de PINs. Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, verificarPin, esPinHasheado } from '../lib/pines.js';

test('el hash no contiene el PIN y se verifica bien', () => {
  const h = hashPin('1234');
  assert.ok(esPinHasheado(h));
  assert.ok(!h.includes('1234'));
  assert.ok(verificarPin('1234', h));
  assert.ok(!verificarPin('4321', h));
});

test('dos hashes del mismo PIN son distintos (sal aleatoria)', () => {
  assert.notEqual(hashPin('1234'), hashPin('1234'));
});

test('compatibilidad con PIN antiguo sin hash', () => {
  assert.ok(verificarPin('5678', '5678'));
  assert.ok(!verificarPin('0000', '5678'));
  assert.ok(!verificarPin('', ''));
});
