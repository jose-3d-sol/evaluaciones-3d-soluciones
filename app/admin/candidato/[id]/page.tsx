'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { clasificar } from '@/lib/tipos';
import { AdminGate } from '@/lib/auth';

function DetalleCandidatoInner({ params }: { params: { id: string } }) {
  const [candidato, setCandidato] = useState<any>(null);
  const [empresa, setEmpresa] = useState<any>(null);
  const [bloques, setBloques] = useState<any[]>([]);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [intentos, setIntentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form nueva asignación
  const [seleccion, setSeleccion] = useState<Record<string, { activo: boolean; cantidad: number }>>({});
  const [asignando, setAsignando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data: cand } = await supabase.from('candidates').select('*').eq('id', params.id).single();
    setCandidato(cand);
    if (cand?.empresa_id) {
      const { data: emp } = await supabase.from('empresas').select('*').eq('id', cand.empresa_id).single();
      setEmpresa(emp);
      const { data: blqs } = await supabase.from('bloques_empresa').select('*').eq('empresa_id', cand.empresa_id).order('orden');
      setBloques(blqs || []);
      setSeleccion(Object.fromEntries((blqs || []).map((b: any) => [b.id, { activo: false, cantidad: 10 }])));
    }
    const { data: asigs } = await supabase.from('asignaciones').select('*').eq('candidate_id', params.id).order('fecha_creacion', { ascending: false });
    setAsignaciones(asigs || []);
    const { data: att } = await supabase.from('exam_attempts').select('*').eq('candidate_id', params.id).order('fecha', { ascending: false });
    setIntentos(att || []);
    setLoading(false);
  };

  const pesoDe = (nombre: string) => bloques.find(b => b.nombre === nombre)?.peso || 10;

  const generarEnlace = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 9; i++) s += chars[Math.floor(Math.random() * chars.length)];
    s += '-';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const asignarPrueba = async () => {
    const activos = bloques.filter(b => seleccion[b.id]?.activo);
    if (activos.length === 0) { setMensaje('Selecciona al menos un bloque'); return; }
    setAsignando(true);
    const enlace = generarEnlace();
    const config = activos.map(b => ({ bloque_nombre: b.nombre, cantidad: seleccion[b.id].cantidad }));
    const { error } = await supabase.from('asignaciones').insert({
      candidate_id: params.id, empresa_id: candidato.empresa_id,
      enlace_unico: enlace, bloques_config: config, estado: 'PENDIENTE',
    });
    if (error) setMensaje('Error: ' + error.message);
    else {
      const url = `${window.location.origin}/examen/${enlace}`;
      navigator.clipboard.writeText(url);
      setMensaje(`✓ Prueba asignada. Enlace copiado: ${url}`);
      setSeleccion(Object.fromEntries(bloques.map((b: any) => [b.id, { activo: false, cantidad: 10 }])));
      cargar();
    }
    setAsignando(false);
  };

  const copiarEnlace = (enlace: string) => {
    const url = `${window.location.origin}/examen/${enlace}`;
    navigator.clipboard.writeText(url);
    setMensaje(`✓ Enlace copiado: ${url}`);
  };

  const eliminarAsignacion = async (id: string) => {
    if (!confirm('¿Eliminar esta prueba asignada? Si ya fue respondida, también se borra ese resultado.')) return;
    await supabase.from('exam_attempts').delete().eq('asignacion_id', id);
    await supabase.from('asignaciones').delete().eq('id', id);
    cargar();
  };

  // Última nota por bloque (de todos los intentos) - permite mejorar repitiendo
  const ultimaNotaPorBloque = () => {
    const notas: Record<string, number> = {};
    const ordenados = [...intentos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    ordenados.forEach(it => { const nb = it.notas_por_bloque || {}; Object.keys(nb).forEach(b => { notas[b] = nb[b]; }); });
    return notas;
  };

  const notaFinal = () => {
    const notas = ultimaNotaPorBloque();
    if (bloques.length === 0 || Object.keys(notas).length < bloques.length) return null;
    let s = 0, w = 0;
    Object.keys(notas).forEach(b => { const p = pesoDe(b); s += notas[b] * p; w += p; });
    return w > 0 ? Math.round(s / w) : 0;
  };

  const exportarPDFResumen = async () => {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(30, 64, 175); doc.text('3D Soluciones Electricas', 14, 20);
    doc.setFontSize(12); doc.setTextColor(80); doc.text('Reporte de Evaluacion Tecnica', 14, 28);
    doc.setFontSize(11); doc.setTextColor(0);
    doc.text(`Empresa: ${empresa?.nombre || '-'}`, 14, 42);
    doc.text(`Candidato: ${candidato.nombre}`, 14, 49);
    doc.text(`Email: ${candidato.email}`, 14, 56);
    const nf = notaFinal();
    doc.text(`Nota Final: ${nf !== null ? nf + '%' : 'INCOMPLETO'}`, 14, 63);
    if (nf !== null) doc.text(`Clasificacion: ${clasificar(nf)}`, 14, 70);
    const notas = ultimaNotaPorBloque();
    const filas = bloques.map(b => [b.nombre, `${b.peso}%`, notas[b.nombre] !== undefined ? `${notas[b.nombre]}%` : 'No evaluado']);
    autoTable(doc, { startY: 80, head: [['Bloque', 'Peso', 'Ultima Nota']], body: filas, headStyles: { fillColor: [37, 99, 235] } });
    doc.save(`Resumen_${candidato.nombre.replace(/\s/g, '_')}.pdf`);
  };

  const exportarPDFCompleto = async (intento: any) => {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const detalle = intento.respuestas?.detalle || [];
    const errores = detalle.filter((d: any) => !d.acertada);
    let y = 20;

    // ===== RESUMEN =====
    doc.setFontSize(18); doc.setTextColor(30, 64, 175); doc.text('3D Soluciones Electricas', 14, y); y += 8;
    doc.setFontSize(12); doc.setTextColor(80); doc.text('Retroalimentacion de Evaluacion', 14, y); y += 10;
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Empresa: ${empresa?.nombre || '-'}`, 14, y); y += 6;
    doc.text(`Candidato: ${candidato.nombre}`, 14, y); y += 6;
    doc.text(`Fecha: ${new Date(intento.fecha).toLocaleString('es')}`, 14, y); y += 6;
    doc.setFontSize(11); doc.setTextColor(30, 64, 175);
    doc.text(`Puntaje: ${intento.score_total}%   -   ${intento.clasificacion}`, 14, y); y += 8;

    // Tabla desempeno por bloque de este intento
    const nb = intento.notas_por_bloque || {};
    const filas = Object.keys(nb).map(b => [b, `${nb[b]}%`]);
    if (filas.length > 0) {
      autoTable(doc, { startY: y, head: [['Bloque evaluado', 'Nota']], body: filas, headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 9 } });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Resumen de aciertos
    doc.setFontSize(10); doc.setTextColor(0);
    const totalP = detalle.length; const correctas = totalP - errores.length;
    doc.text(`Respuestas correctas: ${correctas} de ${totalP}`, 14, y); y += 10;

    // ===== SOLO PREGUNTAS EQUIVOCADAS =====
    doc.setFontSize(13); doc.setTextColor(220, 38, 38);
    doc.text('Preguntas a reforzar', 14, y); y += 8;

    const addText = (text: string, x: number, fs: number, color: number[], maxW: number) => {
      doc.setFontSize(fs); doc.setTextColor(color[0], color[1], color[2]);
      doc.splitTextToSize(text, maxW).forEach((ln: string) => {
        if (y > 278) { doc.addPage(); y = 20; } doc.text(ln, x, y); y += fs * 0.5;
      });
    };

    if (errores.length === 0) {
      doc.setFontSize(11); doc.setTextColor(22, 163, 74);
      doc.text('Excelente: no hubo respuestas incorrectas en esta prueba.', 14, y);
    } else {
      errores.forEach((d: any, i: number) => {
        if (y > 250) { doc.addPage(); y = 20; } y += 3;
        addText(`${i + 1}. [${d.bloque}]`, 16, 10, [40, 40, 40], 178);
        addText(d.pregunta, 16, 9, [40, 40, 40], 178);
        const tu = d.tu_respuesta ? `${d.tu_respuesta}) ${d.opciones[d.tu_respuesta]}` : '(sin responder)';
        addText(`Tu respuesta: ${tu}`, 16, 8, [180, 60, 60], 178);
        addText(`Respuesta correcta: ${d.correcta}) ${d.opciones[d.correcta]}`, 16, 8, [22, 120, 74], 178);
        if (d.justificacion) addText(`Justificacion: ${d.justificacion}`, 16, 8, [110, 110, 110], 178);
        y += 4;
      });
    }
    doc.save(`Retroalimentacion_${candidato.nombre.replace(/\s/g, '_')}.pdf`);
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Cargando...</div>;
  if (!candidato) return <div className="text-center py-20 text-gray-500">Candidato no encontrado</div>;

  const notas = ultimaNotaPorBloque();
  const nf = notaFinal();
  // Mapa asignacion -> intento (para saber cuáles ya se respondieron)
  const intentoPorAsig: Record<string, any> = {};
  intentos.forEach(it => { if (it.asignacion_id) intentoPorAsig[it.asignacion_id] = it; });

  return (
    <div className="space-y-6">
      <a href={empresa ? `/admin/empresa/${empresa.id}` : '/admin'} className="text-blue-600 hover:underline text-sm">← Volver</a>

      <div className="bg-white p-6 rounded-2xl shadow-md">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{candidato.nombre}</h1>
            <p className="text-gray-500">{candidato.email}</p>
            {empresa && <p className="text-xs text-gray-400 mt-1">{empresa.nombre}</p>}
          </div>
          <button onClick={exportarPDFResumen} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">PDF Resumen</button>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-700">{nf !== null ? `${nf}%` : '—'}</div>
            <div className="text-xs text-gray-500 mt-1">Nota Final Ponderada</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-sm font-bold text-gray-700 mt-2">{nf !== null ? clasificar(nf) : 'INCOMPLETO'}</div>
            <div className="text-xs text-gray-500 mt-1">Clasificación</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-gray-700">{Object.keys(notas).length}/{bloques.length}</div>
            <div className="text-xs text-gray-500 mt-1">Bloques Evaluados</div>
          </div>
        </div>
        {nf === null && <p className="text-xs text-amber-600 mt-3 text-center">La nota final se calcula cuando ha evaluado todos los bloques de la empresa.</p>}
      </div>

      {/* ASIGNAR NUEVA PRUEBA */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Asignar Nueva Prueba</h2>
        <p className="text-xs text-gray-400 mb-4">Elige los bloques para esta prueba. Se genera un enlace nuevo que le envías al candidato. Puedes repetir bloques ya evaluados para mejorar su nota.</p>
        {bloques.length === 0 ? (
          <p className="text-amber-600 text-sm">La empresa aún no tiene banco de preguntas cargado.</p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              {bloques.map(b => {
                const yaEval = notas[b.nombre] !== undefined;
                return (
                  <div key={b.id} className={`border rounded-lg p-3 ${seleccion[b.id]?.activo ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input type="checkbox" checked={seleccion[b.id]?.activo || false}
                        onChange={e => setSeleccion({ ...seleccion, [b.id]: { ...seleccion[b.id], activo: e.target.checked } })} className="w-4 h-4" />
                      <span className="font-medium text-sm text-gray-800">{b.nombre}</span>
                      {yaEval && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{notas[b.nombre]}%</span>}
                      <span className="text-xs text-gray-400 ml-auto">{b.peso}%</span>
                    </label>
                    {seleccion[b.id]?.activo && (
                      <div className="flex items-center gap-2 pl-6">
                        <span className="text-xs text-gray-500">Preguntas:</span>
                        <input type="number" min={1} max={100} value={seleccion[b.id].cantidad}
                          onChange={e => setSeleccion({ ...seleccion, [b.id]: { ...seleccion[b.id], cantidad: parseInt(e.target.value) || 1 } })}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-sm" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={asignarPrueba} disabled={asignando} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400">
              {asignando ? 'Asignando...' : 'Asignar Prueba y Copiar Enlace'}
            </button>
          </>
        )}
        {mensaje && <div className={`mt-3 text-sm rounded-lg px-4 py-2 break-all ${mensaje.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{mensaje}</div>}
      </div>

      {/* PRUEBAS ASIGNADAS */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Pruebas Asignadas ({asignaciones.length})</h2>
        <div className="space-y-3">
          {asignaciones.map(a => {
            const intento = intentoPorAsig[a.id];
            const bloquesTxt = (a.bloques_config || []).map((c: any) => `${c.bloque_nombre} (${c.cantidad})`).join(', ');
            return (
              <div key={a.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${intento ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {intento ? `Completada · ${intento.score_total}%` : 'Pendiente'}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(a.fecha_creacion).toLocaleDateString('es')}</span>
                    </div>
                    <p className="text-sm text-gray-600">{bloquesTxt}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    {!intento && <button onClick={() => copiarEnlace(a.enlace_unico)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Copiar enlace</button>}
                    {intento && <button onClick={() => exportarPDFCompleto(intento)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">PDF retroalimentación</button>}
                    <button onClick={() => eliminarAsignacion(a.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
                  </div>
                </div>
              </div>
            );
          })}
          {asignaciones.length === 0 && <p className="text-center text-gray-400 py-4">Aún no le has asignado ninguna prueba.</p>}
        </div>
      </div>

      {/* DESEMPEÑO POR BLOQUE */}
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Desempeño por Bloque</h2>
        <div className="space-y-3">
          {bloques.map(b => {
            const nota = notas[b.nombre];
            return (
              <div key={b.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{b.nombre} <span className="text-gray-400 text-xs">(peso {b.peso}%)</span></span>
                  <span className="font-semibold text-gray-800">{nota !== undefined ? `${nota}%` : 'No evaluado'}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${nota === undefined ? 'bg-gray-200' : nota >= 70 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${nota || 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


export default function DetalleCandidato({ params }: { params: { id: string } }) {
  return <AdminGate><DetalleCandidatoInner params={params} /></AdminGate>;
}
