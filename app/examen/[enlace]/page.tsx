'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { clasificar } from '@/lib/tipos';

function seleccionarBalanceado(preguntas: any[], cantidad: number): any[] {
  const porNivel: Record<string, any[]> = { 'BÁSICO': [], 'INTERMEDIO': [], 'AVANZADO': [] };
  preguntas.forEach(p => { const n = (p.nivel || '').toUpperCase(); if (porNivel[n]) porNivel[n].push(p); });
  const mezclar = (a: any[]) => a.sort(() => Math.random() - 0.5);
  Object.keys(porNivel).forEach(k => mezclar(porNivel[k]));
  const nB = Math.round(cantidad * 0.40), nI = Math.round(cantidad * 0.35), nA = cantidad - nB - nI;
  let sel = [...porNivel['BÁSICO'].slice(0, nB), ...porNivel['INTERMEDIO'].slice(0, nI), ...porNivel['AVANZADO'].slice(0, nA)];
  if (sel.length < cantidad) {
    const usados = new Set(sel.map(p => p.id));
    sel = [...sel, ...mezclar(preguntas.filter(p => !usados.has(p.id))).slice(0, cantidad - sel.length)];
  }
  return mezclar(sel);
}

export default function ExamenPage({ params }: { params: { enlace: string } }) {
  const [asignacion, setAsignacion] = useState<any>(null);
  const [candidato, setCandidato] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [yaCompletada, setYaCompletada] = useState(false);
  const [preguntas, setPreguntas] = useState<any[]>([]);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [actual, setActual] = useState(0);
  const [iniciado, setIniciado] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    // El enlace ahora pertenece a una ASIGNACIÓN
    const { data: asig, error: err } = await supabase.from('asignaciones').select('*').eq('enlace_unico', params.enlace).single();
    if (err || !asig) { setError('Código de acceso inválido'); setLoading(false); return; }
    if (asig.estado === 'COMPLETADA') { setYaCompletada(true); setLoading(false); return; }
    setAsignacion(asig);
    const { data: cand } = await supabase.from('candidates').select('*').eq('id', asig.candidate_id).single();
    setCandidato(cand);
    setLoading(false);
  };

  const iniciarExamen = async () => {
    setLoading(true);
    const config = asignacion.bloques_config || [];

    // Anti-repeticion: reunir IDs de preguntas que este candidato ya vio en intentos previos
    const { data: intentosPrevios } = await supabase.from('exam_attempts')
      .select('preguntas_ids').eq('candidate_id', asignacion.candidate_id);
    const yaVistas = new Set<number>();
    (intentosPrevios || []).forEach((it: any) => (it.preguntas_ids || []).forEach((id: number) => yaVistas.add(id)));

    let seleccionadas: any[] = [];
    for (const cfg of config) {
      const { data: pb } = await supabase.from('preguntas').select('*')
        .eq('empresa_id', asignacion.empresa_id).eq('bloque_nombre', cfg.bloque_nombre);
      if (pb && pb.length > 0) {
        // Preferir preguntas NO vistas; si no alcanzan, completar con vistas
        const noVistas = pb.filter((p: any) => !yaVistas.has(p.id));
        const vistas = pb.filter((p: any) => yaVistas.has(p.id));
        let pool = noVistas;
        if (noVistas.length < cfg.cantidad) {
          // No hay suficientes nuevas: usar todas las nuevas + rellenar con vistas al azar
          pool = [...noVistas, ...vistas.sort(() => Math.random() - 0.5)];
        }
        seleccionadas = [...seleccionadas, ...seleccionarBalanceado(pool, cfg.cantidad)];
      }
    }
    if (seleccionadas.length === 0) { setError('No hay preguntas disponibles. Contacta al administrador.'); setLoading(false); return; }
    setPreguntas(seleccionadas); setIniciado(true); setLoading(false);
  };

  const responder = (op: string) => setRespuestas({ ...respuestas, [preguntas[actual].id]: op });

  const finalizarExamen = async () => {
    setEnviando(true);
    const { data: blqs } = await supabase.from('bloques_empresa').select('nombre,peso').eq('empresa_id', asignacion.empresa_id);
    const pesos: Record<string, number> = {};
    (blqs || []).forEach((b: any) => { pesos[b.nombre] = b.peso; });

    const porBloque: Record<string, { c: number; t: number; peso: number }> = {};
    preguntas.forEach(p => {
      const b = p.bloque_nombre;
      if (!porBloque[b]) porBloque[b] = { c: 0, t: 0, peso: pesos[b] || 10 };
      porBloque[b].t++;
      if (respuestas[p.id] === p.respuesta_correcta) porBloque[b].c++;
    });
    const notasBloque: Record<string, number> = {};
    Object.keys(porBloque).forEach(b => { notasBloque[b] = Math.round((porBloque[b].c / porBloque[b].t) * 100); });
    let sp = 0, sw = 0;
    Object.keys(porBloque).forEach(b => { sp += notasBloque[b] * porBloque[b].peso; sw += porBloque[b].peso; });
    const scoreTotal = sw > 0 ? Math.round(sp / sw) : 0;

    const detalle = preguntas.map(p => ({
      pregunta: p.pregunta, bloque: p.bloque_nombre, opciones: p.opciones,
      tu_respuesta: respuestas[p.id] || null, correcta: p.respuesta_correcta,
      acertada: respuestas[p.id] === p.respuesta_correcta, justificacion: p.justificacion || '', nivel: p.nivel,
    }));

    await supabase.from('exam_attempts').insert({
      candidate_id: candidato.id, asignacion_id: asignacion.id,
      bloques_en_intento: Object.keys(porBloque), preguntas_ids: preguntas.map(p => p.id),
      respuestas: { mapa: respuestas, detalle }, score_total: scoreTotal,
      clasificacion: clasificar(scoreTotal), notas_por_bloque: notasBloque,
    });

    await supabase.from('asignaciones').update({ estado: 'COMPLETADA', fecha_completada: new Date().toISOString() }).eq('id', asignacion.id);

    // Actualizar bloques evaluados y estado del candidato
    const prev = candidato.bloques_evaluados || [];
    const nuevos = Array.from(new Set([...prev, ...Object.keys(porBloque)]));
    const { count: totalBloques } = await supabase.from('bloques_empresa').select('*', { count: 'exact', head: true }).eq('empresa_id', asignacion.empresa_id);
    const estado = nuevos.length >= (totalBloques || 99) ? 'COMPLETO' : 'EN PROGRESO';
    await supabase.from('candidates').update({ bloques_evaluados: nuevos, estado, fecha_ultima_prueba: new Date().toISOString() }).eq('id', candidato.id);

    setTerminado(true); setEnviando(false); window.scrollTo(0, 0);
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Cargando...</div>;

  if (error) return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-md text-center">
      <div className="text-red-500 text-5xl mb-4">⚠</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso no válido</h2>
      <p className="text-gray-500">{error}</p>
      <a href="/" className="inline-block mt-4 text-blue-600 hover:underline">Volver al inicio</a>
    </div>
  );

  if (yaCompletada) return (
    <div className="max-w-lg mx-auto bg-white p-10 rounded-2xl shadow-md text-center">
      <div className="text-5xl mb-4">✓</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Esta prueba ya fue completada</h2>
      <p className="text-gray-500">Este enlace ya se usó. Si necesitas realizar otra evaluación, solicita un nuevo enlace al administrador.</p>
      <a href="/" className="inline-block mt-4 text-blue-600 hover:underline">Volver al inicio</a>
    </div>
  );

  if (terminado) return (
    <div className="max-w-lg mx-auto bg-white p-10 rounded-2xl shadow-md text-center">
      <div className="text-6xl mb-4">✓</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Examen finalizado</h1>
      <p className="text-gray-500 mb-1">Gracias por completar tu evaluación, {candidato.nombre}.</p>
      <p className="text-gray-400 text-sm">Tus respuestas fueron registradas. El área correspondiente te compartirá los resultados.</p>
      <a href="/" className="inline-block mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">Salir</a>
    </div>
  );

  if (!iniciado) {
    const config = asignacion.bloques_config || [];
    const total = config.reduce((s: number, c: any) => s + c.cantidad, 0);
    return (
      <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Hola, {candidato.nombre}</h1>
        <p className="text-gray-500 mb-6">Estás por comenzar tu evaluación técnica</p>
        <div className="bg-blue-50 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Bloques a evaluar:</span><span className="font-semibold text-gray-800">{config.length}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Total de preguntas:</span><span className="font-semibold text-gray-800">{total}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Tiempo límite:</span><span className="font-semibold text-gray-800">Sin límite</span></div>
        </div>
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Bloques incluidos:</h3>
          <div className="space-y-1">
            {config.map((c: any, i: number) => <div key={i} className="flex justify-between text-sm text-gray-600"><span>• {c.bloque_nombre}</span><span>{c.cantidad} preg.</span></div>)}
          </div>
        </div>
        <button onClick={iniciarExamen} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">Comenzar Evaluación</button>
      </div>
    );
  }

  const pregunta = preguntas[actual];
  const respondidas = Object.keys(respuestas).length;
  const progreso = Math.round((respondidas / preguntas.length) * 100);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-t-2xl shadow-md p-4 border-b">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-gray-500">Pregunta {actual + 1} de {preguntas.length}</span>
          <span className="text-gray-500">{respondidas} respondidas</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progreso}%` }} /></div>
      </div>
      <div className="bg-white shadow-md p-6">
        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded mb-3">{pregunta.bloque_nombre}</span>
        <p className="text-lg text-gray-800 font-medium mb-6">{pregunta.pregunta}</p>
        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map(op => (
            <button key={op} onClick={() => responder(op)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${respuestas[pregunta.id] === op ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className="font-bold text-blue-700 mr-2">{op}.</span><span className="text-gray-700 text-sm">{pregunta.opciones[op]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-b-2xl shadow-md p-4 flex justify-between border-t">
        <button onClick={() => setActual(Math.max(0, actual - 1))} disabled={actual === 0} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition">← Anterior</button>
        {actual < preguntas.length - 1
          ? <button onClick={() => setActual(actual + 1)} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">Siguiente →</button>
          : <button onClick={finalizarExamen} disabled={enviando} className="px-6 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:bg-gray-400">{enviando ? 'Enviando...' : 'Finalizar Examen'}</button>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {preguntas.map((p, i) => (
          <button key={i} onClick={() => setActual(i)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${i === actual ? 'bg-blue-600 text-white' : respuestas[p.id] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{i + 1}</button>
        ))}
      </div>
    </div>
  );
}
