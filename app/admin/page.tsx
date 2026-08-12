'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminEmpresas() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [conteos, setConteos] = useState<Record<string, { candidatos: number; preguntas: number }>>({});

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data } = await supabase.from('empresas').select('*').order('fecha_creacion', { ascending: false });
    setEmpresas(data || []);
    // Conteos por empresa
    const c: Record<string, any> = {};
    for (const emp of data || []) {
      const { count: nc } = await supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('empresa_id', emp.id);
      const { count: np } = await supabase.from('preguntas').select('*', { count: 'exact', head: true }).eq('empresa_id', emp.id);
      c[emp.id] = { candidatos: nc ?? 0, preguntas: np ?? 0 };
    }
    setConteos(c);
    setLoading(false);
  };

  const crearEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setMensaje('Ingresa el nombre de la empresa'); return; }
    setCreando(true);
    const { error } = await supabase.from('empresas').insert({ nombre: nombre.trim(), contacto: contacto.trim() });
    if (error) setMensaje('Error: ' + error.message);
    else { setMensaje(''); setNombre(''); setContacto(''); cargar(); }
    setCreando(false);
  };

  const eliminarEmpresa = async (id: string, nom: string) => {
    if (!confirm(`¿Eliminar la empresa "${nom}"?\n\nEsto borrará TODOS sus candidatos, preguntas y resultados. Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('empresas').delete().eq('id', id);
    if (error) setMensaje('Error al eliminar: ' + error.message);
    else cargar();
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Empresas</h1>
        <p className="text-gray-500">Gestiona las empresas y sus evaluaciones</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Agregar Empresa</h2>
        <form onSubmit={crearEmpresa} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: ELMEC S.A."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contacto (opcional)</label>
            <input type="text" value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Email o teléfono"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={creando}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400">
            {creando ? 'Creando...' : 'Agregar'}
          </button>
        </form>
        {mensaje && <div className="mt-3 text-sm text-red-600">{mensaje}</div>}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {empresas.map(emp => (
          <div key={emp.id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition">
            <div className="flex justify-between items-start mb-3">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold text-lg">
                {emp.nombre.charAt(0).toUpperCase()}
              </div>
              <button onClick={() => eliminarEmpresa(emp.id, emp.nombre)}
                className="text-gray-300 hover:text-red-500 transition text-sm" title="Eliminar empresa">✕</button>
            </div>
            <h3 className="font-bold text-gray-800 text-lg">{emp.nombre}</h3>
            {emp.contacto && <p className="text-gray-400 text-sm">{emp.contacto}</p>}
            <div className="flex gap-4 mt-4 text-sm">
              <div><span className="font-bold text-gray-700">{conteos[emp.id]?.candidatos ?? 0}</span> <span className="text-gray-400">candidatos</span></div>
              <div><span className="font-bold text-gray-700">{conteos[emp.id]?.preguntas ?? 0}</span> <span className="text-gray-400">preguntas</span></div>
            </div>
            <a href={`/admin/empresa/${emp.id}`}
              className="block text-center mt-4 bg-blue-50 text-blue-700 py-2 rounded-lg font-medium hover:bg-blue-100 transition">
              Gestionar →
            </a>
          </div>
        ))}
        {empresas.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed">
            No hay empresas aún. Agrega la primera arriba.
          </div>
        )}
      </div>
    </div>
  );
}
