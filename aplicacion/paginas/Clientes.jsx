// Lista de clientes y ficha individual con su historial
import { useEffect, useState } from 'react';
import { UserPlus, ChevronRight, Pencil } from 'lucide-react';
import { api, fechaCorta, navegar } from '../api.js';
import {
  Tarjeta, TituloSeccion, Boton, Campo, Entrada, AreaTexto, Modal,
  Cargando, Vacio, Insignia, Saldo, useAviso
} from '../ui.jsx';

function FormularioCliente({ inicial, onGuardar, guardando }) {
  const [c, setC] = useState(inicial);
  const campo = (k) => ({ value: c[k] ?? '', onChange: e => setC({ ...c, [k]: e.target.value }) });
  return (
    <>
      <Campo etiqueta="Nombre completo *"><Entrada {...campo('nombre')} autoFocus /></Campo>
      <div className="grid grid-cols-2 gap-x-3">
        <Campo etiqueta="Cédula"><Entrada inputMode="numeric" {...campo('cedula')} /></Campo>
        <Campo etiqueta="Teléfono"><Entrada inputMode="tel" {...campo('telefono')} /></Campo>
      </div>
      <Campo etiqueta="Dirección"><Entrada {...campo('direccion')} /></Campo>
      <Campo etiqueta="Notas"><AreaTexto {...campo('notas')} /></Campo>
      <Boton className="w-full mt-2" cargando={guardando} disabled={!c.nombre?.trim()}
        onClick={() => onGuardar(c)}>
        Guardar
      </Boton>
    </>
  );
}

export function Clientes() {
  const aviso = useAviso();
  const [clientes, setClientes] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => api('/clientes').then(setClientes);
  useEffect(() => { cargar(); }, []);

  if (!clientes) return <Cargando />;

  const filtrados = busqueda.trim()
    ? clientes.filter(c => (c.nombre + ' ' + c.cedula + ' ' + c.telefono).toLowerCase().includes(busqueda.trim().toLowerCase()))
    : clientes;

  const crear = async (datos) => {
    setGuardando(true);
    try {
      const r = await api('/clientes', { method: 'POST', body: datos });
      aviso('Cliente creado ✔');
      setCreando(false);
      navegar(`/cliente/${r.id}`);
    } catch (err) {
      aviso(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Clientes ({clientes.length})</h1>
        <Boton onClick={() => setCreando(true)}><UserPlus size={16} /> Nuevo</Boton>
      </div>
      <Entrada placeholder="Buscar por nombre, cédula o teléfono…" value={busqueda}
        onChange={e => setBusqueda(e.target.value)} />

      {filtrados.length === 0 ? (
        <Tarjeta><Vacio>No hay clientes{busqueda && ' con esa búsqueda'}.</Vacio></Tarjeta>
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {filtrados.map(c => (
              <li key={c.id}>
                <a href={`#/cliente/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div>
                    <div className="font-medium text-slate-800">{c.nombre}</div>
                    <div className="text-xs text-slate-400">
                      {[c.cedula && `C.I. ${c.cedula}`, c.telefono].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </a>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Modal titulo="Nuevo cliente" abierto={creando} onCerrar={() => setCreando(false)}>
        <FormularioCliente inicial={{}} onGuardar={crear} guardando={guardando} />
      </Modal>
    </div>
  );
}

export function Cliente({ id }) {
  const aviso = useAviso();
  const [cliente, setCliente] = useState(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => api(`/clientes/${id}`).then(setCliente).catch(err => aviso(err.message, 'error'));
  useEffect(() => { cargar(); }, [id]);

  if (!cliente) return <Cargando />;

  const guardar = async (datos) => {
    setGuardando(true);
    try {
      await api(`/clientes/${id}`, { method: 'PUT', body: datos });
      aviso('Cliente actualizado ✔');
      setEditando(false);
      cargar();
    } catch (err) {
      aviso(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Tarjeta>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{cliente.nombre}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {[cliente.cedula && `C.I. ${cliente.cedula}`, cliente.telefono, cliente.direccion]
                .filter(Boolean).join(' · ') || 'Sin datos de contacto'}
            </p>
            {cliente.notas && <p className="text-sm text-slate-400 mt-1">📝 {cliente.notas}</p>}
          </div>
          <Boton variante="secundario" className="!px-3 shrink-0" onClick={() => setEditando(true)}>
            <Pencil size={15} /> Editar
          </Boton>
        </div>
      </Tarjeta>

      <section>
        <TituloSeccion
          extra={<a href="#/nuevo" className="text-sm font-medium text-blue-700">+ Nuevo alquiler</a>}>
          Historial de alquileres
        </TituloSeccion>
        {cliente.alquileres.length === 0 ? (
          <Tarjeta><Vacio>Este cliente todavía no tiene alquileres.</Vacio></Tarjeta>
        ) : (
          <div className="space-y-2.5">
            {cliente.alquileres.map(a => (
              <a key={a.id} href={`#/alquiler/${a.id}`} className="block">
                <Tarjeta className="hover:border-blue-400 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">{a.resumen_items}</span>
                        {a.estado === 'cerrado'
                          ? <Insignia>Cerrado</Insignia>
                          : <Insignia color="azul">Activo</Insignia>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {fechaCorta(a.fecha_inicio)}{a.fecha_cierre && ` → ${fechaCorta(a.fecha_cierre)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Saldo valor={a.saldo} />
                      <ChevronRight size={18} className="text-slate-300" />
                    </div>
                  </div>
                </Tarjeta>
              </a>
            ))}
          </div>
        )}
      </section>

      <Modal titulo="Editar cliente" abierto={editando} onCerrar={() => setEditando(false)}>
        <FormularioCliente inicial={cliente} onGuardar={guardar} guardando={guardando} />
      </Modal>
    </div>
  );
}
