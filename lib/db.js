// Base de datos en Turso (libSQL). Para pruebas locales acepta una URL
// "file:..." y usa el SQLite incluido en Node, con la misma interfaz.
import { createClient } from '@libsql/client/web';

const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    pin TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS sesiones (
    token TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    creada TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS intentos_login (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    momento INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    cedula TEXT DEFAULT '',
    telefono TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    notas TEXT DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS alquileres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    fecha_inicio TEXT NOT NULL,
    cobra_sabado INTEGER NOT NULL DEFAULT 1,
    cobrar_primer_dia INTEGER NOT NULL DEFAULT 1,
    garantia TEXT DEFAULT '',
    garantia_devuelta INTEGER NOT NULL DEFAULT 0,
    direccion_obra TEXT DEFAULT '',
    notas TEXT DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'activo',
    descuento INTEGER NOT NULL DEFAULT 0,
    fecha_cierre TEXT DEFAULT NULL,
    creado_por INTEGER REFERENCES usuarios(id),
    cerrado_por INTEGER REFERENCES usuarios(id)
  )`,
  `CREATE TABLE IF NOT EXISTS alquiler_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alquiler_id INTEGER NOT NULL REFERENCES alquileres(id),
    tipo TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_dia INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS devoluciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES alquiler_items(id),
    cantidad INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    cobrar_hasta TEXT DEFAULT NULL,
    cobrar_ultimo_dia INTEGER NOT NULL DEFAULT 1,
    usuario_id INTEGER REFERENCES usuarios(id)
  )`,
  `CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alquiler_id INTEGER NOT NULL REFERENCES alquileres(id),
    monto INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    nota TEXT DEFAULT '',
    usuario_id INTEGER REFERENCES usuarios(id)
  )`,
  `CREATE TABLE IF NOT EXISTS inventario_movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    motivo TEXT DEFAULT '',
    fecha TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id)
  )`,
  `CREATE TABLE IF NOT EXISTS config (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  )`
];

export const CONFIG_DEFECTO = {
  negocio_nombre: 'Alquiler de Andamios',
  propietaria: '',
  propietaria_cedula: '',
  ciudad: '',
  telefono: '',
  precio_andamio: '50',         // centavos por día
  precio_tablon: '25',
  reposicion_andamio: '6000',   // valor a pagar si no devuelven (centavos)
  reposicion_tablon: '1500'
};

// Adaptador con la misma interfaz (execute/batch) sobre node:sqlite,
// para desarrollo local con TURSO_DATABASE_URL=file:...
function clienteLocal(url) {
  const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
  const db = new DatabaseSync(url.slice('file:'.length));
  db.exec('PRAGMA journal_mode = WAL;');
  const ejecutar = ({ sql, args = [] }) => {
    const st = db.prepare(sql);
    if (/^\s*(select|with|pragma)/i.test(sql)) {
      const rows = st.all(...args);
      return { rows, columns: Object.keys(rows[0] ?? {}), lastInsertRowid: undefined, rowsAffected: 0 };
    }
    const r = st.run(...args);
    return { rows: [], columns: [], lastInsertRowid: r.lastInsertRowid, rowsAffected: r.changes };
  };
  return {
    async execute(stmt) { return ejecutar(typeof stmt === 'string' ? { sql: stmt } : stmt); },
    async batch(stmts) { return stmts.map(s => ejecutar(typeof s === 'string' ? { sql: s } : s)); }
  };
}

let cliente = null;
let inicializacion = null;

function obtenerCliente() {
  if (cliente) return cliente;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error('Falta configurar TURSO_DATABASE_URL');
  cliente = url.startsWith('file:')
    ? clienteLocal(url)
    : createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return cliente;
}

// Crea las tablas una sola vez por arranque del servidor
export async function db() {
  const c = obtenerCliente();
  if (!inicializacion) {
    inicializacion = (async () => {
      await c.batch(ESQUEMA, 'write');
      await c.batch(Object.entries(CONFIG_DEFECTO).map(([clave, valor]) => ({
        sql: 'INSERT OR IGNORE INTO config (clave, valor) VALUES (?, ?)', args: [clave, valor]
      })), 'write');
      // Migraciones para bases creadas antes de estas columnas (fallan sin
      // problema si ya existen)
      await c.execute(`ALTER TABLE alquileres ADD COLUMN direccion_obra TEXT DEFAULT ''`).catch(() => {});
      await c.execute(`ALTER TABLE alquileres ADD COLUMN cobrar_primer_dia INTEGER NOT NULL DEFAULT 1`).catch(() => {});
      // Fecha hasta la que se cobra una devolución cuando es distinta al
      // día real de la entrega (ej: entregó martes, se cobra hasta lunes)
      await c.execute(`ALTER TABLE devoluciones ADD COLUMN cobrar_hasta TEXT DEFAULT NULL`).catch(() => {});
    })().catch(err => { inicializacion = null; throw err; });
  }
  await inicializacion;
  return c;
}

// Filas como objetos planos { columna: valor } (las filas de libsql no se
// pueden esparcir con ... directamente)
function aObjetos(rs) {
  return rs.rows.map(fila => {
    const o = {};
    for (const col of rs.columns) o[col] = fila[col];
    return o;
  });
}

export async function todas(sql, ...args) {
  return aObjetos(await (await db()).execute({ sql, args }));
}

export async function una(sql, ...args) {
  return (await todas(sql, ...args))[0] ?? null;
}

export async function ejecutar(sql, ...args) {
  const rs = await (await db()).execute({ sql, args });
  return {
    lastInsertRowid: rs.lastInsertRowid === undefined ? undefined : Number(rs.lastInsertRowid),
    rowsAffected: rs.rowsAffected
  };
}

export async function leerConfig() {
  const cfg = {};
  for (const fila of await todas('SELECT clave, valor FROM config')) cfg[fila.clave] = fila.valor;
  return cfg;
}

export async function guardarConfig(cambios) {
  const c = await db();
  const stmts = Object.entries(cambios)
    .filter(([k]) => k in CONFIG_DEFECTO)
    .map(([k, v]) => ({
      sql: 'INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
      args: [k, String(v)]
    }));
  if (stmts.length) await c.batch(stmts, 'write');
}
