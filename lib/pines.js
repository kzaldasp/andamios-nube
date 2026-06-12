// Guardado seguro del PIN: nunca en texto plano, sino con hash y sal
// (formato "v1$sal$hash"). Así el respaldo descargable no expone los PIN.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashPin(pin) {
  const sal = randomBytes(16).toString('hex');
  const hash = scryptSync(String(pin), sal, 32).toString('hex');
  return `v1$${sal}$${hash}`;
}

export function esPinHasheado(guardado) {
  return String(guardado || '').startsWith('v1$');
}

export function verificarPin(pin, guardado) {
  const g = String(guardado || '');
  if (!esPinHasheado(g)) return g !== '' && g === String(pin); // PIN antiguo aún sin convertir
  const [, sal, hash] = g.split('$');
  const calculado = scryptSync(String(pin), sal, 32);
  const almacenado = Buffer.from(hash, 'hex');
  return calculado.length === almacenado.length && timingSafeEqual(calculado, almacenado);
}
