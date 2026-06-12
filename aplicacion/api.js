// Cliente del API y utilidades compartidas

export async function api(ruta, opciones = {}) {
  const res = await fetch('/api' + ruta, {
    method: opciones.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined
  });
  const datos = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.dispatchEvent(new Event('sesion-expirada'));
    throw new Error(datos.error || 'Sesión expirada');
  }
  if (!res.ok) throw new Error(datos.error || 'Ocurrió un error');
  return datos;
}

// Abre en otra pestaña cómo quedaría un documento con el formato dado
export async function abrirPreviaPlantilla(tipo, texto, alquilerId) {
  const ventana = window.open('', '_blank'); // se abre antes del fetch para que el navegador no la bloquee
  try {
    const res = await fetch('/api/plantillas/previa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, texto, alquiler_id: alquilerId })
    });
    if (!res.ok) {
      const datos = await res.json().catch(() => ({}));
      throw new Error(datos.error || 'No se pudo generar la vista previa');
    }
    const html = await res.text();
    ventana.document.write(html);
    ventana.document.close();
  } catch (err) {
    ventana?.close();
    throw err;
  }
}

export const dinero = (centavos) => {
  const negativo = centavos < 0;
  return (negativo ? '-$' : '$') + (Math.abs(centavos) / 100).toFixed(2);
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function fechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

export function nombreMes(iso) {
  // recibe 'YYYY-MM'
  const [y, m] = iso.split('-').map(Number);
  return `${MESES_LARGO[m - 1]} ${y}`;
}

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function nombreTipo(tipo, cantidad = 2) {
  if (tipo === 'andamio') return cantidad === 1 ? 'andamio' : 'andamios';
  return cantidad === 1 ? 'tablón' : 'tablones';
}

export function navegar(ruta) {
  window.location.hash = ruta;
}
