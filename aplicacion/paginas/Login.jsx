// Pantalla de entrada: elegir usuario + PIN. La primera vez crea el primer usuario.
import { useState } from 'react';
import { HardHat, ArrowLeft } from 'lucide-react';
import { api } from '../api.js';
import { Boton, Campo, Entrada, useAviso } from '../ui.jsx';

export default function Login({ sesion, onEntrar }) {
  const [elegido, setElegido] = useState(null);
  const [pin, setPin] = useState('');
  const [cargando, setCargando] = useState(false);
  const [nombre, setNombre] = useState('');
  const aviso = useAviso();

  const primeraVez = sesion?.requiere_configuracion;

  const entrar = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (primeraVez) {
        await api('/primer-usuario', { method: 'POST', body: { nombre, pin } });
      } else {
        await api('/login', { method: 'POST', body: { usuario_id: elegido.id, pin } });
      }
      onEntrar();
    } catch (err) {
      aviso(err.message, 'error');
      setPin('');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-3">
            <HardHat size={34} className="text-blue-700" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Alquiler de Andamios</h1>
          <p className="text-sm text-slate-400 mt-1">
            {primeraVez ? 'Bienvenido. Crea el primer usuario para comenzar.' : '¿Quién está atendiendo?'}
          </p>
        </div>

        {primeraVez ? (
          <form onSubmit={entrar}>
            <Campo etiqueta="Tu nombre">
              <Entrada value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María" autoFocus />
            </Campo>
            <Campo etiqueta="PIN (4 a 6 números)" ayuda="Lo usarás para entrar. Después podrás crear más usuarios en Ajustes.">
              <Entrada type="password" inputMode="numeric" maxLength={6} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
            </Campo>
            <Boton type="submit" cargando={cargando} className="w-full mt-2"
              disabled={!nombre.trim() || pin.length < 4}>
              Crear y entrar
            </Boton>
          </form>
        ) : !elegido ? (
          <div className="space-y-2">
            {sesion.usuarios.map(u => (
              <button key={u.id} onClick={() => setElegido(u)}
                className="w-full text-left px-4 py-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50
                  font-medium text-slate-700 transition-colors cursor-pointer">
                {u.nombre}
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={entrar}>
            <button type="button" onClick={() => { setElegido(null); setPin(''); }}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-3 cursor-pointer">
              <ArrowLeft size={14} /> Cambiar usuario
            </button>
            <p className="font-semibold text-slate-700 mb-3">Hola, {elegido.nombre} 👋</p>
            <Campo etiqueta="Tu PIN">
              <Entrada type="password" inputMode="numeric" maxLength={6} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" autoFocus />
            </Campo>
            <Boton type="submit" cargando={cargando} className="w-full mt-2" disabled={pin.length < 4}>
              Entrar
            </Boton>
          </form>
        )}
      </div>
    </div>
  );
}
