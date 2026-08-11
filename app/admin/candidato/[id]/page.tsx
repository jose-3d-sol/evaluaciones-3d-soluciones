'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BLOQUES, clasificar, pesoPorNombre } from '@/lib/tipos';

export default function DetalleCandidato({ params }: { params: { id: string } }) {
  const [candidato, setCandidato] = useState<any>(null);
  const [intentos, setIntentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data: cand } = await supabase.from('candidates').select('*').eq('id', params.id).single();
    const { data: att } = await supabase.from('exam_attempts').select('*').eq('candidate_id', params.id).order('fecha', { ascending: false });
    setCandidato(cand);
    setIntentos(att || []);
    setLoading(false);
  };

  // Última nota por bloque (de todos los intentos)
  const ultimaNotaPorBloque = () => {
    const notas: Record<string, number> = {};
    const ordenados = [...intentos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    ordenados.forEach(intento => {
      const nb = intento.notas_por_bloque || {};
      Object.keys(nb).forEach(b => { notas[b] = nb[b]; });
    });
    return notas;
  };

  const notaFinalPonderada = () => {
    const notas = ultimaNotaPorBloque();
    const bloquesEvaluados = Object.keys(notas);
    if (bloquesEvaluados.length < BLOQUES.length) return null; // Incompleto
    let suma = 0, pesos = 0;
    bloquesEvaluados.forEach(b => {
      const peso = pesoPorNombre(b);
      suma += notas[b] * peso;
      pesos += peso;
    });
    return pesos > 0 ? Math.round(suma / pesos) : 0;
  };

  const exportarPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text('3D Soluciones Eléctricas', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text('Reporte de Evaluación Técnica', 14, 28);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Candidato: ${candidato.nombre}`, 14, 42);
    doc.text(`Email: ${candidato.email}`, 14, 49);
    doc.text(`Estado: ${candidato.estado}`, 14, 56);

    const notaFinal = notaFinalPonderada();
    doc.text(`Nota Final: ${notaFinal !== null ? notaFinal + '%' : 'INCOMPLETO'}`, 14, 63);
    if (notaFinal !== null) doc.text(`Clasificación: ${clasificar(notaFinal)}`, 14, 70);

    const notas = ultimaNotaPorBloque();
    const filas = BLOQUES.map(b => [
      b.nombre,
      `${b.peso}%`,
      notas[b.nombre] !== undefined ? `${notas[b.nombre]}%` : 'No evaluado',
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['Bloque', 'Peso', 'Última Nota']],
      body: filas,
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`Evaluacion_${candidato.nombre.replace(/\s/g, '_')}.pdf`);
  };

  const exportarExcel = async () => {
    const XLSX = await import('xlsx');
    const notas = ultimaNotaPorBloque();
    const datos = BLOQUES.map(b => ({
      Bloque: b.nombre,
      'Peso (%)': b.peso,
      'Última Nota (%)': notas[b.nombre] !== undefined ? notas[b.nombre] : 'No evaluado',
    }));
    const notaFinal = notaFinalPonderada();
    datos.push({ Bloque: '', 'Peso (%)': '' as any, 'Última Nota (%)': '' as any });
    datos.push({ Bloque: 'NOTA FINAL', 'Peso (%)': '' as any, 'Última Nota (%)': notaFinal !== null ? notaFinal : 'INCOMPLETO' });

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evaluación');
    XLSX.writeFile(wb, `Evaluacion_${candidato.nombre.replace(/\s/g, '_')}.xlsx`);
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Cargando...</div>;
  if (!candidato) return <div className="text-center py-20 text-gray-500">Candidato no encontrado</div>;

  const notas = ultimaNotaPorBloque();
  const notaFinal = notaFinalPonderada();

  return (
    <div className="space-y-6">
      <a href="/admin" className="text-blue-600 hover:underline text-sm">← Volver al panel</a>

      <div className="bg-white p-6 rounded-2xl shadow-md">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{candidato.nombre}</h1>
            <p className="text-gray-500">{candidato.email}</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">Código: {candidato.enlace_unico}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportarPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">Exportar PDF</button>
            <button onClick={exportarExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">Exportar Excel</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-700">{notaFinal !== null ? `${notaFinal}%` : '—'}</div>
            <div className="text-xs text-gray-500 mt-1">Nota Final Ponderada</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-sm font-bold text-gray-700 mt-2">{notaFinal !== null ? clasificar(notaFinal) : 'INCOMPLETO'}</div>
            <div className="text-xs text-gray-500 mt-1">Clasificación</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-gray-700">{Object.keys(notas).length}/{BLOQUES.length}</div>
            <div className="text-xs text-gray-500 mt-1">Bloques Evaluados</div>
          </div>
        </div>
        {notaFinal === null && (
          <p className="text-xs text-amber-600 mt-3 text-center">
            La nota final se calcula cuando el candidato ha evaluado los 8 bloques.
          </p>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Desempeño por Bloque</h2>
        <div className="space-y-3">
          {BLOQUES.map(b => {
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

      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Historial de Intentos ({intentos.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-semibold">Fecha</th>
                <th className="pb-2 font-semibold">Bloques</th>
                <th className="pb-2 font-semibold">Score</th>
                <th className="pb-2 font-semibold">Clasificación</th>
              </tr>
            </thead>
            <tbody>
              {intentos.map(it => (
                <tr key={it.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">{new Date(it.fecha).toLocaleString('es')}</td>
                  <td className="py-2 text-gray-600 text-xs">{(it.bloques_en_intento || []).join(', ')}</td>
                  <td className="py-2 font-semibold text-gray-800">{it.score_total}%</td>
                  <td className="py-2 text-gray-600 text-xs">{it.clasificacion}</td>
                </tr>
              ))}
              {intentos.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-gray-400">Sin intentos aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
