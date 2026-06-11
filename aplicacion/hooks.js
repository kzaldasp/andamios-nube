// Hooks compartidos
import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';

// Búsqueda de clientes en el servidor con espera breve mientras se escribe,
// para no cargar la lista completa ni consultar en cada tecla.
export function useBusquedaClientes(limite = 20) {
  const [busqueda, setBusqueda] = useState('');
  const [resultado, setResultado] = useState(null); // { total, clientes }
  const temporizador = useRef();
  const pedido = useRef(0);

  useEffect(() => {
    clearTimeout(temporizador.current);
    const n = ++pedido.current;
    temporizador.current = setTimeout(() => {
      api(`/clientes?q=${encodeURIComponent(busqueda.trim())}&limite=${limite}`)
        .then(r => { if (n === pedido.current) setResultado(r); })
        .catch(() => { if (n === pedido.current) setResultado({ total: 0, clientes: [] }); });
    }, busqueda.trim() ? 250 : 0);
    return () => clearTimeout(temporizador.current);
  }, [busqueda, limite]);

  return { busqueda, setBusqueda, resultado };
}
