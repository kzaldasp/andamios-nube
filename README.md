# Alquiler de Andamios (versión en internet)

Sistema para el negocio familiar de alquiler de andamios y tablones:
clientes, cobros diarios, devoluciones por partes, abonos, descuentos,
préstamos, garantías, inventario, pagarés y recibos imprimibles, y
reportes de ingresos.

- **Aplicación**: Next.js (corre gratis en Vercel)
- **Base de datos**: Turso (SQLite en internet, gratis)
- **Acceso**: desde cualquier celular o computadora, con usuario y PIN

## Publicarla en internet (una sola vez)

Necesitas 3 cuentas gratuitas. Sigue el orden:

### 1. GitHub (guarda el código)
1. Crea una cuenta en https://github.com
2. Crea un repositorio nuevo (botón **New**), llámalo `andamios-nube`,
   déjalo **Private** y NO marques ninguna casilla de inicialización.
3. En esta carpeta ejecuta (reemplaza TU-USUARIO):
   ```
   git remote add origin https://github.com/TU-USUARIO/andamios-nube.git
   git push -u origin main
   ```
   (Windows abrirá el navegador para iniciar sesión la primera vez.)

### 2. Turso (la base de datos)
1. Crea una cuenta en https://turso.tech (puedes entrar con GitHub).
2. Crea una base de datos: botón **Create Database**, nombre `andamios`,
   región la más cercana (por ejemplo AWS us-east-1 / Norteamérica).
3. Copia dos cosas desde la página de la base de datos:
   - La **URL** (empieza con `libsql://...`)
   - Un **token**: botón *Create Token* (sin vencimiento, lectura y escritura)

### 3. Vercel (donde corre la aplicación)
1. Crea una cuenta en https://vercel.com (entra con GitHub).
2. **Add New → Project** e importa el repositorio `andamios-nube`.
3. Antes de desplegar, abre **Environment Variables** y agrega:
   - `TURSO_DATABASE_URL` = la URL `libsql://...` de Turso
   - `TURSO_AUTH_TOKEN` = el token de Turso
4. Botón **Deploy**. Al terminar te da la dirección de la aplicación,
   por ejemplo `https://andamios-nube.vercel.app`.

Esa dirección es la que se guarda en el celular de todos
("Agregar a pantalla de inicio"). La primera vez la app pide crear
el primer usuario con su PIN.

## Primeros pasos dentro de la app
1. Crear el primer usuario (nombre y PIN).
2. En **Ajustes**: nombre del negocio, propietaria, precios y valores
   de reposición; crear los demás usuarios.
3. En **Inventario**: registrar cuántos andamios y tablones tienen.
4. Registrar los alquileres que ya están en curso con su fecha real
   de inicio (la app calcula sola lo acumulado).

## Seguridad
- Cada persona entra con su PIN; toda transacción queda registrada
  con su nombre.
- Tras 8 intentos fallidos de PIN, el ingreso se bloquea 15 minutos.
- En **Ajustes** hay un botón para descargar una copia de seguridad
  de todos los datos (archivo JSON); hazlo de vez en cuando.

## Para programadores
- Desarrollo local: copia `.env.ejemplo` a `.env.local`
  (con `TURSO_DATABASE_URL=file:datos-local.db` no necesitas internet)
  y ejecuta `npm install` y `npm run dev`.
- Actualizar la app publicada: haz commit y `git push`;
  Vercel la vuelve a desplegar sola.
- El dinero se guarda en centavos (enteros). La lógica de cobro está
  en `lib/calculos.js`; las reglas: se cobra de lunes a sábado
  (sábado excluible por alquiler), domingo nunca, y cobrar el día de
  la devolución se decide caso por caso al registrarla.
