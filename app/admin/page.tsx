'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BLOQUES } from '@/lib/tipos';

export default function AdminPanel() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [totalPreguntas, setTotalPreguntas] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Config por candidato: qué bloques y cuántas preguntas de cada uno
  const [seleccion, setSeleccion] = useState<Record<number, { activo: boolean; cantidad: number }>>(
    Object.fromEntries(BLOQUES.map(b => [b.id, { activo: true, cantidad: 10 }]))
  );

  useEffect(() => {
    loadCandidates();
    contarPreguntas();
  }, []);

  const loadCandidates = async () => {
    const { data } = await supabase.from('candidates').select('*').order('fecha_creacion', { ascending: false });
    setCandidates(data || []);
  };

  const contarPreguntas = async () => {
    const { count } = await supabase.from('preguntas').select('*', { count: 'exact', head: true });
    setTotalPreguntas(count ?? 0);
  };

  const generarEnlace = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 9; i++) s += chars[Math.floor(Math.random() * chars.length)];
    s += '-';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const crearCandidato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      setMensaje('Completa nombre y email');
      return;
    }
    const bloquesActivos = BLOQUES.filter(b => seleccion[b.id].activo);
    if (bloquesActivos.length === 0) {
      setMensaje('Selecciona al menos un bloque');
      return;
    }
    setCreando(true);
    setMensaje('');

    const enlace = generarEnlace();
    const config = bloquesActivos.map(b => ({
      bloque_id: b.id,
      bloque_nombre: b.nombre,
      cantidad: seleccion[b.id].cantidad,
    }));

    const { error } = await supabase.from('candidates').insert({
      nombre: nombre.trim(),
      email: email.trim(),
      enlace_unico: enlace,
      bloques_asignados: config,
      bloques_evaluados: [],
      estado: 'INCOMPLETO',
    });

    if (error) {
      setMensaje('Error: ' + error.message);
    } else {
      setMensaje(`✓ Candidato creado. Código: ${enlace}`);
      setNombre('');
      setEmail('');
      loadCandidates();
    }
    setCreando(false);
  };

  const subirPreguntas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus('Procesando archivo...');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const preguntas = Array.isArray(json) ? json : json.preguntas;
      if (!preguntas || !Array.isArray(preguntas)) {
        setUploadStatus('✗ Formato inválido: no se encontró la lista de preguntas');
        setUploading(false);
        return;
      }

      // Limpiar preguntas existentes primero
      await supabase.from('preguntas').delete().neq('id', -1);

      // Insertar en lotes de 100
      const registros = preguntas.map((q: any) => ({
        id: q.id,
        bloque_id: q.bloque_id,
        bloque_nombre: q.bloque_nombre,
        bloque_peso: q.bloque_peso,
        pregunta: q.pregunta,
        opciones: q.opciones,
        respuesta_correcta: q.respuesta_correcta,
        nivel: q.nivel,
        justificacion: q.justificacion || '',
      }));

      let insertadas = 0;
      for (let i = 0; i < registros.length; i += 100) {
        const lote = registros.slice(i, i + 100);
        const { error } = await supabase.from('preguntas').insert(lote);
        if (error) {
          setUploadStatus(`✗ Error en lote ${i}: ${error.message}`);
          setUploading(false);
          return;
        }
        insertadas += lote.length;
        setUploadStatus(`Cargando... ${insertadas}/${registros.length}`);
      }
      setUploadStatus(`✓ ${insertadas} preguntas cargadas correctamente`);
      contarPreguntas();
    } catch (err: any) {
      setUploadStatus('✗ Error: ' + err.message);
    }
    setUploading(false);
  };

  const copiarEnlace = (enlace: string) => {
    const url = `${window.location.origin}/examen/${enlace}`;
    navigator.clipboard.writeText(url);
    setMensaje(`✓ Enlace copiado: ${url}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Panel Administrativo</h1>
        <p className="text-gray-500">Gestión de candidatos y banco de preguntas</p>
      </div>

      {/* Banco de preguntas */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Banco de Preguntas</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${totalPreguntas ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {totalPreguntas === null ? 'Verificando...' : `${totalPreguntas} preguntas cargadas`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="cursor-pointer bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
            {uploading ? 'Cargando...' : 'Subir BANCO_PREGUNTAS.json'}
            <input type="file" accept=".json" onChange={subirPreguntas} disabled={uploading} className="hidden" />
          </label>
          {uploadStatus && <span className="text-sm text-gray-600">{uploadStatus}</span>}
        </div>
        <p className="text-xs text-gray-400 mt-2">Sube el archivo una sola vez. Volver a subirlo reemplaza todas las preguntas.</p>
      </div>

      {/* Crear candidato */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Crear Nuevo Candidato</h2>
        <form onSubmit={crearCandidato} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <input type="text" placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Bloques a evaluar y cantidad de preguntas</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {BLOQUES.map(b => (
                <div key={b.id} className={`border rounded-lg p-3 transition ${seleccion[b.id].activo ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={seleccion[b.id].activo}
                      onChange={e => setSeleccion({ ...seleccion, [b.id]: { ...seleccion[b.id], activo: e.target.checked } })}
                      className="w-4 h-4" />
                    <span className="font-medium text-sm text-gray-800">{b.nombre}</span>
                    <span className="text-xs text-gray-400 ml-auto">peso {b.peso}%</span>
                  </label>
                  {seleccion[b.id].activo && (
                    <div className="flex items-center gap-2 pl-6">
                      <span className="text-xs text-gray-500">Preguntas:</span>
                      <input type="number" min={1} max={50} value={seleccion[b.id].cantidad}
                        onChange={e => setSeleccion({ ...seleccion, [b.id]: { ...seleccion[b.id], cantidad: parseInt(e.target.value) || 1 } })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {mensaje && (
            <div className={`text-sm rounded-lg px-4 py-3 ${mensaje.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {mensaje}
            </div>
          )}

          <button type="submit" disabled={creando}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400">
            {creando ? 'Creando...' : 'Crear Candidato'}
          </button>
        </form>
      </div>

      {/* Lista de candidatos */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Candidatos ({candidates.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 font-semibold">Nombre</th>
                <th className="pb-3 font-semibold">Email</th>
                <th className="pb-3 font-semibold">Estado</th>
                <th className="pb-3 font-semibold">Nota</th>
                <th className="pb-3 font-semibold">Clasificación</th>
                <th className="pb-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-800">{c.nombre}</td>
                  <td className="py-3 text-gray-600">{c.email}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.estado === 'COMPLETO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="py-3 text-gray-800 font-semibold">{c.nota_final ? `${c.nota_final}%` : '—'}</td>
                  <td className="py-3 text-gray-600 text-xs">{c.clasificacion || '—'}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button onClick={() => copiarEnlace(c.enlace_unico)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium">Copiar enlace</button>
                      <a href={`/admin/candidato/${c.id}`}
                        className="text-gray-600 hover:text-gray-800 text-xs font-medium">Ver detalle</a>
                    </div>
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400">No hay candidatos aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
