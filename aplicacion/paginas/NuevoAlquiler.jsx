// Crear un alquiler: cliente (nuevo o existente), cantidades, garantía y condiciones
import { useEffect, useState } from 'react';
import { UserPlus, Search } from 'lucide-react';
import { api, hoyISO, navegar } from '../api.js';
import { Tarjeta, TituloSeccion, Boton, Campo, Entrada, AreaTexto, Interruptor, useAviso, CLASE_INPUT } from '../ui.jsx';

export default function NuevoAlquiler() {
  const aviso = useAviso();
  const [config, setConfig] = useState(null);
  const [clientes, setClientes] = useState([]);

  const [modoCliente, setModoCliente] = useState('existente'); // existente | nuevo
  const [busqueda, setBusqueda] = useState('');
  const [clienteId, setClienteId] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', cedula: '', telefono: '', direccion: '' });

  const [andamios, setAndamios] = useState('');
  const [tablones, setTablones] = useState('');
  const [prestamoAndamios, setPrestamoAndamios] = useState(false);
  const [prestamoTablones, setPrestamoTablones] = useState(false);

  const [fecha, setFecha] = useState(hoyISO());
  const [cobraSabado, setCobraSabado] = useState(true);
  const [garantia, setGarantia] = useState('Cédula');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api('/config').then(setConfig);
    api('/clientes').then(c => {
      setClientes(c);
      if (c.length === 0) setModoCliente('nuevo');
    });
  }, []);

  const filtrados = busqueda.trim()
    ? clientes.filter(c =>
        (c.nombre + ' ' + c.cedula + ' ' + c.telefono).toLowerCase().includes(busqueda.trim().toLowerCase()))
    : clientes;

  const clienteElegido = clientes.find(c => c.id === clienteId);

  const guardar = async () => {
    const items = [];
    if (Number(andamios) > 0) items.push({ tipo: 'andamio', cantidad: Number(andamios), prestamo: prestamoAndamios });
    if (Number(tablones) > 0) items.push({ tipo: 'tablon', cantidad: Number(tablones), prestamo: prestamoTablones });
    if (!items.length) return aviso('Indica cuántos andamios o tablones se llevan', 'error');
    if (modoCliente === 'existente' && !clienteId) return aviso('Elige el cliente', 'error');
    if (modoCliente === 'nuevo' && !nuevoCliente.nombre.trim()) return aviso('Escribe el nombre del cliente', 'error');

    setGuardando(true);
    try {
      const cuerpo = {
        items, fecha_inicio: fecha, cobra_sabado: cobraSabado, garantia, notas,
        ...(modoCliente === 'existente' ? { cliente_id: clienteId } : { cliente: nuevoCliente })
      };
      const r = await api('/alquileres', { method: 'POST', body: cuerpo });
      aviso('Alquiler registrado ✔');
      if (window.confirm('¿Imprimir el pagaré para que lo firme el cliente?')) {
        window.open(`/imprimir/pagare/${r.id}`, '_blank');
      }
      navegar(`/alquiler/${r.id}`);
    } catch (err) {
      aviso(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const precio = (clave) => config ? '$' + (Number(config[clave]) / 100).toFixed(2) : '…';

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800">Nuevo alquiler</h1>

      <Tarjeta>
        <TituloSeccion>1. Cliente</TituloSeccion>
        <div className="flex gap-2 mb-4">
          <Boton variante={modoCliente === 'existente' ? 'primario' : 'secundario'}
            onClick={() => setModoCliente('existente')} className="flex-1">
            <Search size={15} /> Ya registrado
          </Boton>
          <Boton variante={modoCliente === 'nuevo' ? 'primario' : 'secundario'}
            onClick={() => setModoCliente('nuevo')} className="flex-1">
            <UserPlus size={15} /> Cliente nuevo
          </Boton>
        </div>

        {modoCliente === 'existente' ? (
          <>
            <Entrada placeholder="Buscar por nombre, cédula o teléfono…" value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setClienteId(null); }} />
            {clienteElegido ? (
              <div className="mt-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm">
                <strong>{clienteElegido.nombre}</strong>
                {clienteElegido.cedula && <> — C.I. {clienteElegido.cedula}</>}
                {clienteElegido.telefono && <> — {clienteElegido.telefono}</>}
                <button onClick={() => setClienteId(null)} className="ml-2 text-blue-700 underline cursor-pointer">cambiar</button>
              </div>
            ) : (
              <div className="mt-2 max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {filtrados.length === 0 && (
                  <p className="text-sm text-slate-400 p-3">
                    No se encontró. <button className="text-blue-700 underline cursor-pointer"
                      onClick={() => { setModoCliente('nuevo'); setNuevoCliente(n => ({ ...n, nombre: busqueda })); }}>
                      Créalo como cliente nuevo
                    </button>
                  </p>
                )}
                {filtrados.slice(0, 30).map(c => (
                  <button key={c.id} onClick={() => setClienteId(c.id)}
                    className="block w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 cursor-pointer">
                    <span className="font-medium text-slate-700">{c.nombre}</span>
                    {c.cedula && <span className="text-slate-400"> — {c.cedula}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-4">
            <Campo etiqueta="Nombre completo *">
              <Entrada value={nuevoCliente.nombre} onChange={e => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
            </Campo>
            <Campo etiqueta="Cédula">
              <Entrada inputMode="numeric" value={nuevoCliente.cedula} onChange={e => setNuevoCliente({ ...nuevoCliente, cedula: e.target.value })} />
            </Campo>
            <Campo etiqueta="Teléfono">
              <Entrada inputMode="tel" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} />
            </Campo>
            <Campo etiqueta="Dirección">
              <Entrada value={nuevoCliente.direccion} onChange={e => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })} />
            </Campo>
          </div>
        )}
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion>2. ¿Qué se lleva?</TituloSeccion>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-xl p-4">
            <Campo etiqueta={`Andamios (${precio('precio_andamio')} por día)`}>
              <Entrada type="number" min="0" inputMode="numeric" placeholder="0"
                value={andamios} onChange={e => setAndamios(e.target.value)} />
            </Campo>
            <Interruptor marcado={prestamoAndamios} onChange={setPrestamoAndamios}
              etiqueta="Es préstamo (no se cobra)" />
          </div>
          <div className="border border-slate-200 rounded-xl p-4">
            <Campo etiqueta={`Tablones (${precio('precio_tablon')} por día)`}>
              <Entrada type="number" min="0" inputMode="numeric" placeholder="0"
                value={tablones} onChange={e => setTablones(e.target.value)} />
            </Campo>
            <Interruptor marcado={prestamoTablones} onChange={setPrestamoTablones}
              etiqueta="Es préstamo (no se cobra)" />
          </div>
        </div>
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion>3. Condiciones</TituloSeccion>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Campo etiqueta="Fecha de inicio">
            <Entrada type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </Campo>
          <Campo etiqueta="Garantía que deja el cliente" ayuda="Ej: cédula, licencia, otro documento…">
            <Entrada value={garantia} onChange={e => setGarantia(e.target.value)} />
          </Campo>
        </div>
        <Interruptor marcado={cobraSabado} onChange={setCobraSabado}
          etiqueta="Cobrar los sábados"
          descripcion="Los domingos nunca se cobran. Apaga esto si acordaron no cobrar sábados." />
        <Campo etiqueta="Notas (opcional)">
          <AreaTexto value={notas} onChange={e => setNotas(e.target.value)} placeholder="Cualquier acuerdo especial…" />
        </Campo>
      </Tarjeta>

      <Boton onClick={guardar} cargando={guardando} className="w-full !py-3.5 text-base">
        Registrar alquiler
      </Boton>
    </div>
  );
}
