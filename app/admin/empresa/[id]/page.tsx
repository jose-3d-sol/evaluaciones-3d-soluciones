'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionEmpresa({ params }: { params: { id: string } }) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [bloques, setBloques] = useState<any[]>([]);
  const [totalPreguntas, setTotalPreguntas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'candidatos' | 'banco'>('candidatos');

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data: emp } = await supabase.from('empresas').select('*').eq('id', params.id).single();
    setEmpresa(emp);
    const { data: cands } = await supabase.from('candidates').select('*').eq('empresa_id', params.id).order('fecha_creacion', { ascending: false });
    setCandidatos(cands || []);
    const { data: blqs } = await supabase.from('bloques_empresa').select('*').eq('empresa_id', params.id).order('orden');
    setBloques(blqs || []);
    const { count } = await supabase.from('preguntas').select('*', { count: 'exact', head: true }).eq('empresa_id', params.id);
    setTotalPreguntas(count ?? 0);
    setLoading(false);
  };

  const crearCandidato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) { setMensaje('Completa nombre y email'); return; }
    setCreando(true);
    // Verificar que no exista ya en esta empresa
    const { data: existe } = await supabase.from('candidates').select('id').eq('empresa_id', params.id).eq('email', email.trim());
    if (existe && existe.length > 0) {
      setMensaje('Ya existe un candidato con ese email en esta empresa. Entra a su perfil para asignarle una prueba nueva.');
      setCreando(false); return;
    }
    const { error } = await supabase.from('candidates').insert({
      nombre: nombre.trim(), email: email.trim(), empresa_id: params.id,
      bloques_asignados: [], bloques_evaluados: [], estado: 'SIN PRUEBAS',
      enlace_unico: 'perfil-' + Math.random().toString(36).slice(2, 10), // placeholder, ya no se usa para examen
    });
    if (error) setMensaje('Error: ' + error.message);
    else { setMensaje('✓ Candidato creado. Entra a su perfil para asignarle una prueba.'); setNombre(''); setEmail(''); cargar(); }
    setCreando(false);
  };

  const eliminarCandidato = async (id: string, nom: string) => {
    if (!confirm(`¿Eliminar al candidato "${nom}"?\n\nSe borrarán sus pruebas y resultados. No se puede deshacer.`)) return;
    await supabase.from('exam_attempts').delete().eq('candidate_id', id);
    await supabase.from('asignaciones').delete().eq('candidate_id', id);
    await supabase.from('candidates').delete().eq('id', id);
    cargar();
  };

  const subirBanco = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus('Procesando...');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const preguntas = Array.isArray(json) ? json : json.preguntas;
      const bloquesJson = json.bloques || [];
      if (!preguntas) { setUploadStatus('✗ Formato inválido'); setUploading(false); return; }
      await supabase.from('preguntas').delete().eq('empresa_id', params.id);
      await supabase.from('bloques_empresa').delete().eq('empresa_id', params.id);
      let listaBloques = bloquesJson;
      if (listaBloques.length === 0) {
        const set: Record<string, number> = {};
        preguntas.forEach((p: any) => { set[p.bloque_nombre] = p.bloque_peso || 10; });
        listaBloques = Object.entries(set).map(([nombre, peso], i) => ({ nombre, peso, id: i + 1 }));
      }
      await supabase.from('bloques_empresa').insert(listaBloques.map((b: any, i: number) => ({
        empresa_id: params.id, nombre: b.nombre, peso: b.peso || 10, orden: b.id || i + 1,
      })));
      const registros = preguntas.map((q: any) => ({
        empresa_id: params.id, bloque_nombre: q.bloque_nombre, bloque_peso: q.bloque_peso || 10,
        pregunta: q.pregunta, opciones: q.opciones, respuesta_correcta: q.respuesta_correcta,
        nivel: q.nivel, justificacion: q.justificacion || '',
      }));
      let ins = 0;
      for (let i = 0; i < registros.length; i += 100) {
        const lote = registros.slice(i, i + 100);
        const { error } = await supabase.from('preguntas').insert(lote);
        if (error) { setUploadStatus(`✗ Error: ${error.message}`); setUploading(false); return; }
        ins += lote.length; setUploadStatus(`Cargando... ${ins}/${registros.length}`);
      }
      setUploadStatus(`✓ ${ins} preguntas cargadas`);
      cargar();
    } catch (err: any) { setUploadStatus('✗ Error: ' + err.message); }
    setUploading(false);
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Cargando...</div>;
  if (!empresa) return <div className="text-center py-20 text-gray-500">Empresa no encontrada</div>;

  return (
    <div className="space-y-6">
      <a href="/admin" className="text-blue-600 hover:underline text-sm">← Volver a empresas</a>
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold text-gray-800">{empresa.nombre}</h1>
        {empresa.contacto && <p className="text-gray-500">{empresa.contacto}</p>}
        <div className="flex gap-6 mt-3 text-sm">
          <div><span className="font-bold text-gray-700">{candidatos.length}</span> <span className="text-gray-400">candidatos</span></div>
          <div><span className="font-bold text-gray-700">{totalPreguntas}</span> <span className="text-gray-400">preguntas</span></div>
          <div><span className="font-bold text-gray-700">{bloques.length}</span> <span className="text-gray-400">bloques</span></div>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('candidatos')} className={`px-4 py-2 font-medium text-sm ${tab === 'candidatos' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-500'}`}>Candidatos</button>
        <button onClick={() => setTab('banco')} className={`px-4 py-2 font-medium text-sm ${tab === 'banco' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-500'}`}>Banco de Preguntas</button>
      </div>

      {tab === 'banco' && (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Banco de Preguntas</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${totalPreguntas ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{totalPreguntas} preguntas</span>
          </div>
          <label className="inline-block cursor-pointer bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
            {uploading ? 'Cargando...' : 'Subir banco de preguntas (.json)'}
            <input type="file" accept=".json" onChange={subirBanco} disabled={uploading} className="hidden" />
          </label>
          {uploadStatus && <p className="text-sm text-gray-600 mt-2">{uploadStatus}</p>}
          {bloques.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Bloques de esta empresa:</h3>
              <div className="flex flex-wrap gap-2">
                {bloques.map(b => <span key={b.id} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">{b.nombre} ({b.peso}%)</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'candidatos' && (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Crear Candidato</h2>
            <p className="text-xs text-gray-400 mb-4">Crea el perfil del candidato una vez. Luego, desde su perfil, le asignas las pruebas que quieras (cada una con su propio enlace).</p>
            <form onSubmit={crearCandidato} className="flex flex-wrap gap-3 items-end">
              <input type="text" placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)}
                className="flex-1 min-w-48 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)}
                className="flex-1 min-w-48 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" disabled={creando} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400">
                {creando ? 'Creando...' : 'Crear'}
              </button>
            </form>
            {mensaje && <div className={`mt-3 text-sm rounded-lg px-4 py-2 ${mensaje.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{mensaje}</div>}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Candidatos ({candidatos.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-semibold">Nombre</th>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold">Estado</th>
                    <th className="pb-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatos.map(c => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-800">{c.nombre}</td>
                      <td className="py-3 text-gray-600">{c.email}</td>
                      <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.estado === 'COMPLETO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.estado}</span></td>
                      <td className="py-3">
                        <div className="flex gap-3">
                          <a href={`/admin/candidato/${c.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Perfil / Asignar prueba</a>
                          <button onClick={() => eliminarCandidato(c.id, c.nombre)} className="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {candidatos.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">No hay candidatos aún</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
