'use client';
// La interfaz es una SPA con rutas por hash (#/...), igual que la versión
// local: se carga solo en el navegador, sin renderizado en servidor.
import dynamic from 'next/dynamic';

const Aplicacion = dynamic(() => import('../aplicacion/principal.jsx'), { ssr: false });

export default function Pagina() {
  return <Aplicacion />;
}
