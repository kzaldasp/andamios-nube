// Estructura general: sesión, navegación y enrutado
import { useEffect, useState, useCallback } from 'react';
import { Home, PlusCircle, Users, Package, BarChart3, Settings, History, LogOut, HardHat } from 'lucide-react';
import { api } from './api.js';
import { Cargando } from './ui.jsx';
import Login from './paginas/Login.jsx';
import Inicio from './paginas/Inicio.jsx';
import NuevoAlquiler from './paginas/NuevoAlquiler.jsx';
import Alquiler from './paginas/Alquiler.jsx';
import { Clientes, Cliente } from './paginas/Clientes.jsx';
import Inventario from './paginas/Inventario.jsx';
import { Reportes, Historial } from './paginas/Reportes.jsx';
import Ajustes from './paginas/Ajustes.jsx';

function useRuta() {
  const [ruta, setRuta] = useState(window.location.hash.slice(1) || '/');
  useEffect(() => {
    const f = () => {
      setRuta(window.location.hash.slice(1) || '/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return ruta;
}

const ENLACES = [
  { ruta: '/', texto: 'Inicio', Icono: Home },
  { ruta: '/nuevo', texto: 'Nuevo', Icono: PlusCircle },
  { ruta: '/clientes', texto: 'Clientes', Icono: Users },
  { ruta: '/inventario', texto: 'Inventario', Icono: Package },
  { ruta: '/reportes', texto: 'Reportes', Icono: BarChart3 },
  { ruta: '/historial', texto: 'Historial', Icono: History },
  { ruta: '/ajustes', texto: 'Ajustes', Icono: Settings }
];

export default function App() {
  const [sesion, setSesion] = useState(null); // { usuario, usuarios, requiere_configuracion }
  const [cargando, setCargando] = useState(true);
  const ruta = useRuta();

  const cargarSesion = useCallback(async () => {
    try {
      setSesion(await api('/sesion'));
    } catch {
      setSesion({ usuario: null, usuarios: [], requiere_configuracion: false });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarSesion(); }, [cargarSesion]);

  useEffect(() => {
    const f = () => setSesion(s => s ? { ...s, usuario: null } : s);
    window.addEventListener('sesion-expirada', f);
    return () => window.removeEventListener('sesion-expirada', f);
  }, []);

  if (cargando) return <div className="min-h-screen bg-slate-100"><Cargando /></div>;

  if (!sesion?.usuario) {
    return <Login sesion={sesion} onEntrar={cargarSesion} />;
  }

  const cerrarSesion = async () => {
    await api('/logout', { method: 'POST', body: {} });
    cargarSesion();
  };

  let pagina;
  const mAlquiler = ruta.match(/^\/alquiler\/(\d+)$/);
  const mCliente = ruta.match(/^\/cliente\/(\d+)$/);
  if (ruta === '/') pagina = <Inicio />;
  else if (ruta === '/nuevo') pagina = <NuevoAlquiler />;
  else if (mAlquiler) pagina = <Alquiler id={Number(mAlquiler[1])} key={mAlquiler[1]} />;
  else if (ruta === '/clientes') pagina = <Clientes />;
  else if (mCliente) pagina = <Cliente id={Number(mCliente[1])} key={mCliente[1]} />;
  else if (ruta === '/inventario') pagina = <Inventario />;
  else if (ruta === '/reportes') pagina = <Reportes />;
  else if (ruta === '/historial') pagina = <Historial />;
  else if (ruta === '/ajustes') pagina = <Ajustes alRecargarSesion={cargarSesion} />;
  else pagina = <Inicio />;

  const rutaBase = '/' + (ruta.split('/')[1] || '');
  const activo = (r) => r === '/' ? rutaBase === '/' || rutaBase === '/alquiler' : rutaBase === r;

  return (
    <div className="min-h-screen bg-slate-100 pb-20 sm:pb-8">
      <header className="bg-blue-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <a href="#/" className="flex items-center gap-2 font-semibold text-lg">
              <HardHat size={22} className="text-amber-400" />
              Alquiler de Andamios
            </a>
            <button onClick={cerrarSesion}
              className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm cursor-pointer">
              <span className="hidden sm:inline">{sesion.usuario.nombre}</span>
              <LogOut size={16} />
            </button>
          </div>
          {/* Navegación en escritorio */}
          <nav className="hidden sm:flex gap-1 -mb-px">
            {ENLACES.map(({ ruta: r, texto, Icono }) => (
              <a key={r} href={'#' + r}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
                  ${activo(r) ? 'bg-slate-100 text-blue-800' : 'text-blue-200 hover:text-white hover:bg-blue-700'}`}>
                <Icono size={16} /> {texto}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5">{pagina}</main>

      {/* Navegación inferior en celular */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex justify-around pb-[env(safe-area-inset-bottom)]">
        {ENLACES.slice(0, 5).map(({ ruta: r, texto, Icono }) => (
          <a key={r} href={'#' + r}
            className={`flex flex-col items-center gap-0.5 py-2 px-2 text-[11px] font-medium
              ${activo(r) ? 'text-blue-700' : 'text-slate-400'}`}>
            <Icono size={20} /> {texto}
          </a>
        ))}
        <a href="#/ajustes"
          className={`flex flex-col items-center gap-0.5 py-2 px-2 text-[11px] font-medium
            ${activo('/ajustes') || activo('/historial') ? 'text-blue-700' : 'text-slate-400'}`}>
          <Settings size={20} /> Más
        </a>
      </nav>
    </div>
  );
}
