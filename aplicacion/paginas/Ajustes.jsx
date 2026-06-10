// Ajustes: datos del negocio, precios, valores de reposición y usuarios
import { useEffect, useState } from 'react';
import { UserPlus, KeyRound, CloudDownload } from 'lucide-react';
import { api } from '../api.js';
import {
  Tarjeta, TituloSeccion, Boton, Campo, Entrada, Modal,
  Cargando, Insignia, useAviso
} from '../ui.jsx';

// La config guarda dinero en centavos; aquí se edita en dólares
const CAMPOS_DINERO = ['precio_andamio', 'precio_tablon', 'reposicion_andamio', 'reposicion_tablon'];

export default function Ajustes({ alRecargarSesion }) {
  const aviso = useAviso();
  const [config, setConfig] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(null); // { id?, nombre, pin }

  const cargar = async () => {
    const cfg = await api('/config');
    for (const k of CAMPOS_DINERO) cfg[k] = (Number(cfg[k]) / 100).toFixed(2);
    setConfig(cfg);
    setUsuarios(await api('/usuarios'));
  };
  useEffect(() => { cargar(); }, []);

  if (!config) return <Cargando />;

  const campo = (k) => ({ value: config[k] ?? '', onChange: e => setConfig({ ...config, [k]: e.target.value }) });

  const guardarConfig = async () => {
    setGuardando(true);
    try {
      const cuerpo = { ...config };
      for (const k of CAMPOS_DINERO) cuerpo[k] = Math.round(Number(config[k]) * 100) || 0;
      await api('/config', { method: 'POST', body: cuerpo });
      aviso('Ajustes guardados ✔');
    } catch (err) {
      aviso(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const guardarUsuario = async () => {
    const u = modalUsuario;
    setGuardando(true);
    try {
      if (u.id) {
        await api(`/usuarios/${u.id}`, { method: 'PUT', body: { nombre: u.nombre, pin: u.pin } });
      } else {
        await api('/usuarios', { method: 'POST', body: { nombre: u.nombre, pin: u.pin } });
      }
      aviso('Usuario guardado ✔');
      setModalUsuario(null);
      cargar();
      alRecargarSesion?.();
    } catch (err) {
      aviso(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (u) => {
    try {
      await api(`/usuarios/${u.id}`, { method: 'PUT', body: { activo: u.activo ? 0 : 1 } });
      cargar();
      alRecargarSesion?.();
    } catch (err) {
      aviso(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800">Ajustes</h1>

      <Tarjeta>
        <TituloSeccion>Datos del negocio</TituloSeccion>
        <p className="text-xs text-slate-400 -mt-2 mb-3">Aparecen en el pagaré y los recibos.</p>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Campo etiqueta="Nombre del negocio"><Entrada {...campo('negocio_nombre')} /></Campo>
          <Campo etiqueta="Teléfono"><Entrada {...campo('telefono')} /></Campo>
          <Campo etiqueta="Nombre de la propietaria"><Entrada {...campo('propietaria')} /></Campo>
          <Campo etiqueta="Cédula de la propietaria"><Entrada {...campo('propietaria_cedula')} /></Campo>
          <Campo etiqueta="Ciudad"><Entrada {...campo('ciudad')} /></Campo>
        </div>
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion>Precios por día (dólares)</TituloSeccion>
        <div className="grid grid-cols-2 gap-x-4">
          <Campo etiqueta="Andamio"><Entrada type="number" step="0.01" min="0" {...campo('precio_andamio')} /></Campo>
          <Campo etiqueta="Tablón"><Entrada type="number" step="0.01" min="0" {...campo('precio_tablon')} /></Campo>
        </div>
        <TituloSeccion>Valor de reposición (para el pagaré)</TituloSeccion>
        <p className="text-xs text-slate-400 -mt-2 mb-3">Lo que debe pagar el cliente si no devuelve o daña la pieza.</p>
        <div className="grid grid-cols-2 gap-x-4">
          <Campo etiqueta="Andamio"><Entrada type="number" step="0.01" min="0" {...campo('reposicion_andamio')} /></Campo>
          <Campo etiqueta="Tablón"><Entrada type="number" step="0.01" min="0" {...campo('reposicion_tablon')} /></Campo>
        </div>
      </Tarjeta>

      <Boton onClick={guardarConfig} cargando={guardando} className="w-full">Guardar ajustes</Boton>

      <Tarjeta>
        <TituloSeccion
          extra={
            <Boton variante="secundario" className="!py-1.5 !px-3"
              onClick={() => setModalUsuario({ nombre: '', pin: '' })}>
              <UserPlus size={15} /> Agregar
            </Boton>
          }>
          Usuarios
        </TituloSeccion>
        <ul className="divide-y divide-slate-100">
          {usuarios.map(u => (
            <li key={u.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">{u.nombre}</span>
                {!u.activo && <Insignia color="rojo">Inactivo</Insignia>}
              </div>
              <div className="flex gap-2">
                <Boton variante="fantasma" className="!py-1 !px-2 text-xs"
                  onClick={() => setModalUsuario({ id: u.id, nombre: u.nombre, pin: '' })}>
                  <KeyRound size={13} /> Editar
                </Boton>
                <Boton variante="fantasma" className="!py-1 !px-2 text-xs"
                  onClick={() => alternarActivo(u)}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </Boton>
              </div>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion>Acerca de los datos</TituloSeccion>
        <p className="text-sm text-slate-500 mb-3">
          Toda la información se guarda en internet (base de datos Turso), por eso pueden
          usar la aplicación desde cualquier celular o computadora. De vez en cuando
          descarga una copia de seguridad y guárdala en tu equipo.
        </p>
        <Boton variante="secundario" onClick={() => { window.location.href = '/api/respaldo'; }}>
          <CloudDownload size={16} /> Descargar copia de seguridad
        </Boton>
      </Tarjeta>

      <Modal titulo={modalUsuario?.id ? 'Editar usuario' : 'Nuevo usuario'}
        abierto={!!modalUsuario} onCerrar={() => setModalUsuario(null)}>
        {modalUsuario && (
          <>
            <Campo etiqueta="Nombre">
              <Entrada value={modalUsuario.nombre}
                onChange={e => setModalUsuario({ ...modalUsuario, nombre: e.target.value })} autoFocus />
            </Campo>
            <Campo etiqueta={modalUsuario.id ? 'Nuevo PIN (deja vacío para no cambiarlo)' : 'PIN (4 a 6 números)'}>
              <Entrada inputMode="numeric" maxLength={6} value={modalUsuario.pin}
                onChange={e => setModalUsuario({ ...modalUsuario, pin: e.target.value.replace(/\D/g, '') })} />
            </Campo>
            <Boton className="w-full mt-3" cargando={guardando} onClick={guardarUsuario}
              disabled={!modalUsuario.nombre.trim() || (!modalUsuario.id && modalUsuario.pin.length < 4)}>
              Guardar
            </Boton>
          </>
        )}
      </Modal>
    </div>
  );
}
