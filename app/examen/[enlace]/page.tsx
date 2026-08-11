'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { clasificar, pesoPorNombre } from '@/lib/tipos';

// Selección aleatoria balanceada por nivel (40% básico, 35% intermedio, 25% avanzado)
function seleccionarBalanceado(preguntas: any[], cantidad: number): any[] {
  const porNivel: Record<string, any[]> = { 'BÁSICO': [], 'INTERMEDIO': [], 'AVANZADO': [] };
  preguntas.forEach(p => {
    const n = (p.nivel || '').toUpperCase();
    if (porNivel[n]) porNivel[n].push(p);
  });
  const mezclar = (a: any[]) => a.sort(() => Math.random() - 0.5);
  Object.keys(porNivel).forEach(k => mezclar(porNivel[k]));

  const nBasico = Math.round(cantidad * 0.40);
  const nInter = Math.round(cantidad * 0.35);
  const nAvanz = cantidad - nBasico - nInter;

  let sel = [
    ...porNivel['BÁSICO'].slice(0, nBasico),
    ...porNivel['INTERMEDIO'].slice(0, nInter),
    ...porNivel['AVANZADO'].slice(0, nAvanz),
  ];
  // Si falta (poca disponibilidad en algún nivel), rellenar con lo que haya
  if (sel.length < cantidad) {
    const usados = new Set(sel.map(p => p.id));
    const resto = mezclar(preguntas.filter(p => !usados.has(p.id)));
    sel = [...sel, ...resto.slice(0, cantidad - sel.length)];
  }
  return mezclar(sel);
}

export default function ExamenPage({ params }: { params: { enlace: string } }) {
  const [candidato, setCandidato] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preguntas, setPreguntas] = useState<any[]>([]);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [actual, setActual] = useState(0);
  const [iniciado, setIniciado] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    cargarCandidato();
  }, []);

  const cargarCandidato = async () => {
    const { data, error: err } = await supabase
      .from('candidates').select('*').eq('enlace_unico', params.enlace).single();
    if (err || !data) {
      setError('Código de acceso inválido');
    } else {
      setCandidato(data);
    }
    setLoading(false);
  };

  const iniciarExamen = async () => {
    setLoading(true);
    const config = candidato.bloques_asignados || [];
    let seleccionadas: any[] = [];

    for (const cfg of config) {
      const { data: preguntasBloque } = await supabase
        .from('preguntas').select('*').eq('bloque_nombre', cfg.bloque_nombre);
      if (preguntasBloque && preguntasBloque.length > 0) {
        const sel = seleccionarBalanceado(preguntasBloque, cfg.cantidad);
        seleccionadas = [...seleccionadas, ...sel];
      }
    }

    if (seleccionadas.length === 0) {
      setError('No hay preguntas disponibles para los bloques asignados. Contacta al administrador.');
      setLoading(false);
      return;
    }
    setPreguntas(seleccionadas);
    setIniciado(true);
    setLoading(false);
  };

  const responder = (opcion: string) => {
    setRespuestas({ ...respuestas, [preguntas[actual].id]: opcion });
  };

  const finalizarExamen = async () => {
    setEnviando(true);
    // Calcular scores por bloque
    const porBloque: Record<string, { correctas: number; total: number; peso: number }> = {};
    preguntas.forEach(p => {
      const b = p.bloque_nombre;
      if (!porBloque[b]) porBloque[b] = { correctas: 0, total: 0, peso: pesoPorNombre(b) };
      porBloque[b].total++;
      if (respuestas[p.id] === p.respuesta_correcta) porBloque[b].correctas++;
    });

    const notasBloque: Record<string, number> = {};
    Object.keys(porBloque).forEach(b => {
      notasBloque[b] = Math.round((porBloque[b].correctas / porBloque[b].total) * 100);
    });

    // Score total ponderado por peso de bloque (solo bloques de este intento)
    let sumaPonderada = 0, sumaPesos = 0;
    Object.keys(porBloque).forEach(b => {
      sumaPonderada += notasBloque[b] * porBloque[b].peso;
      sumaPesos += porBloque[b].peso;
    });
    const scoreTotal = sumaPesos > 0 ? Math.round(sumaPonderada / sumaPesos) : 0;
    const clasif = clasificar(scoreTotal);

    // Guardar intento
    await supabase.from('exam_attempts').insert({
      candidate_id: candidato.id,
      bloques_en_intento: Object.keys(porBloque),
      preguntas_ids: preguntas.map(p => p.id),
      respuestas: respuestas,
      score_total: scoreTotal,
      clasificacion: clasif,
      notas_por_bloque: notasBloque,
    });

    // Actualizar bloques evaluados del candidato
    const evaluadosPrevios = candidato.bloques_evaluados || [];
    const nuevosEvaluados = Array.from(new Set([...evaluadosPrevios, ...Object.keys(porBloque)]));
    await supabase.from('candidates').update({
      bloques_evaluados: nuevosEvaluados,
      fecha_ultima_prueba: new Date().toISOString(),
    }).eq('id', candidato.id);

    // Detalle para retroalimentación
    const detalle = preguntas.map(p => ({
      pregunta: p.pregunta,
      bloque: p.bloque_nombre,
      tu_respuesta: respuestas[p.id] || '(sin responder)',
      correcta: p.respuesta_correcta,
      acertada: respuestas[p.id] === p.respuesta_correcta,
      justificacion: p.justificacion || '',
      opciones: p.opciones,
    }));

    setResultado({ scoreTotal, clasif, notasBloque, detalle });
    setTerminado(true);
    setEnviando(false);
    window.scrollTo(0, 0);
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

  // Pantalla de resultados
  if (terminado && resultado) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-md text-center">
          <div className="text-6xl mb-4">{resultado.scoreTotal >= 70 ? '🎉' : '📋'}</div>
          <h1 className="text-3xl font-bold text-gray-800">{resultado.scoreTotal}%</h1>
          <p className="text-lg font-semibold text-blue-700 mt-1">{resultado.clasif}</p>
          <p className="text-gray-500 text-sm mt-2">Evaluación completada</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Resultados por Bloque</h2>
          <div className="space-y-3">
            {Object.entries(resultado.notasBloque).map(([bloque, nota]: any) => (
              <div key={bloque}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{bloque}</span>
                  <span className="font-semibold text-gray-800">{nota}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${nota >= 70 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${nota}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Retroalimentación</h2>
          <div className="space-y-4">
            {resultado.detalle.map((d: any, i: number) => (
              <div key={i} className={`border-l-4 pl-4 py-2 ${d.acertada ? 'border-green-400' : 'border-red-400'}`}>
                <div className="flex items-start gap-2">
                  <span className={`text-sm font-bold ${d.acertada ? 'text-green-600' : 'text-red-600'}`}>
                    {d.acertada ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 font-medium">{d.pregunta}</p>
                    <p className="text-xs text-gray-500 mt-1">Bloque: {d.bloque}</p>
                    {!d.acertada && (
                      <p className="text-xs text-gray-600 mt-1">
                        Respuesta correcta: <span className="font-semibold">{d.correcta}</span>
                        {d.justificacion && <span className="block mt-1 text-gray-500">{d.justificacion}</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <a href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Finalizar
          </a>
        </div>
      </div>
    );
  }

  // Pantalla de bienvenida
  if (!iniciado) {
    const config = candidato.bloques_asignados || [];
    const totalPreguntas = config.reduce((s: number, c: any) => s + c.cantidad, 0);
    return (
      <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Hola, {candidato.nombre}</h1>
        <p className="text-gray-500 mb-6">Estás por comenzar tu evaluación técnica</p>
        <div className="bg-blue-50 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Bloques a evaluar:</span><span className="font-semibold text-gray-800">{config.length}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Total de preguntas:</span><span className="font-semibold text-gray-800">{totalPreguntas}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Tiempo límite:</span><span className="font-semibold text-gray-800">Sin límite</span></div>
        </div>
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Bloques incluidos:</h3>
          <div className="space-y-1">
            {config.map((c: any, i: number) => (
              <div key={i} className="flex justify-between text-sm text-gray-600">
                <span>• {c.bloque_nombre}</span><span>{c.cantidad} preg.</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={iniciarExamen} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
          Comenzar Evaluación
        </button>
      </div>
    );
  }

  // Examen en curso
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
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      <div className="bg-white shadow-md p-6">
        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded mb-3">{pregunta.bloque_nombre}</span>
        <p className="text-lg text-gray-800 font-medium mb-6">{pregunta.pregunta}</p>
        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map(op => (
            <button key={op} onClick={() => responder(op)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${respuestas[pregunta.id] === op ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className="font-bold text-blue-700 mr-2">{op}.</span>
              <span className="text-gray-700 text-sm">{pregunta.opciones[op]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-b-2xl shadow-md p-4 flex justify-between border-t">
        <button onClick={() => setActual(Math.max(0, actual - 1))} disabled={actual === 0}
          className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition">
          ← Anterior
        </button>
        {actual < preguntas.length - 1 ? (
          <button onClick={() => setActual(actual + 1)}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
            Siguiente →
          </button>
        ) : (
          <button onClick={finalizarExamen} disabled={enviando}
            className="px-6 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:bg-gray-400">
            {enviando ? 'Calificando...' : 'Finalizar Examen'}
          </button>
        )}
      </div>

      {/* Navegación rápida */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {preguntas.map((p, i) => (
          <button key={i} onClick={() => setActual(i)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${i === actual ? 'bg-blue-600 text-white' : respuestas[p.id] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
