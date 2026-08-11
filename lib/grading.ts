// lib/grading.ts
// Lógica de calificación y clasificación de candidatos

export interface ResultadoExamen {
  totalPreguntas: number;
  correctas: number;
  incorrectas: number;
  porcentaje: number;
  clasificacion: string;
  notasPorBloque: Record<string, number>;
}

export interface NivelCertificacion {
  nivel: number;
  titulo: string;
  rango_min: number;
  rango_max: number;
}

const NIVELES_CERTIFICACION: NivelCertificacion[] = [
  { nivel: 1, titulo: "Técnico en Desarrollo", rango_min: 70, rango_max: 79 },
  { nivel: 2, titulo: "Técnico Calificado", rango_min: 80, rango_max: 84 },
  { nivel: 3, titulo: "Especialista Técnico", rango_min: 85, rango_max: 89 },
  { nivel: 4, titulo: "Especialista Senior", rango_min: 90, rango_max: 94 },
  { nivel: 5, titulo: "Experto Técnico (SME)", rango_min: 95, rango_max: 100 },
];

const PESOS_BLOQUES: Record<number, number> = {
  1: 30, // Diagnóstico Eléctrico
  2: 10, // Sistemas de Enfriamiento
  3: 10, // Bushings
  4: 10, // Protección y Fusibles
  5: 10, // Tap Changers y Switches
  6: 10, // Instrumentación e Indicadores
  7: 15, // Manejo y Tratamiento de Aceite
  8: 5,  // Reparaciones Mecánicas y Estructurales
};

/**
 * Califica un examen basado en respuestas del candidato
 */
export function calificarExamen(
  respuestasCandidato: Record<number, string>,
  preguntasDelExamen: Array<{ id: number; respuesta_correcta: string; bloque_id: number }>
): ResultadoExamen {
  let correctas = 0;
  const notasPorBloque: Record<number, number> = {};
  const preguntasPorBloque: Record<number, { correctas: number; total: number }> = {};

  // Inicializar
  Object.keys(PESOS_BLOQUES).forEach((bloqueId) => {
    preguntasPorBloque[parseInt(bloqueId)] = { correctas: 0, total: 0 };
  });

  // Evaluar cada pregunta
  preguntasDelExamen.forEach((pregunta) => {
    const respuestaCandiato = respuestasCandidato[pregunta.id];
    const esCorrecto = respuestaCandiato === pregunta.respuesta_correcta;

    // Contar por bloque
    preguntasPorBloque[pregunta.bloque_id].total += 1;
    if (esCorrecto) {
      correctas += 1;
      preguntasPorBloque[pregunta.bloque_id].correctas += 1;
    }
  });

  // Calcular porcentaje por bloque
  Object.entries(preguntasPorBloque).forEach(([bloqueIdStr, stats]) => {
    const bloqueId = parseInt(bloqueIdStr);
    if (stats.total > 0) {
      notasPorBloque[bloqueId] = (stats.correctas / stats.total) * 100;
    }
  });

  // Calcular porcentaje total
  const porcentaje = (correctas / preguntasDelExamen.length) * 100;
  const incorrectas = preguntasDelExamen.length - correctas;

  // Clasificar
  const clasificacion = clasificarCandidato(porcentaje);

  return {
    totalPreguntas: preguntasDelExamen.length,
    correctas,
    incorrectas,
    porcentaje: Math.round(porcentaje * 100) / 100,
    clasificacion,
    notasPorBloque,
  };
}

/**
 * Clasifica a un candidato según su porcentaje
 */
export function clasificarCandidato(porcentaje: number): string {
  const nivel = NIVELES_CERTIFICACION.find(
    (n) => porcentaje >= n.rango_min && porcentaje <= n.rango_max
  );
  return nivel?.titulo || "Por debajo de mínimo";
}

/**
 * Obtiene el nivel de certificación
 */
export function obtenerNivelCertificacion(porcentaje: number): NivelCertificacion | null {
  return (
    NIVELES_CERTIFICACION.find(
      (n) => porcentaje >= n.rango_min && porcentaje <= n.rango_max
    ) || null
  );
}

/**
 * Calcula nota final PONDERADA
 * Solo si el candidato ha evaluado TODOS los bloques
 */
export function calcularNotaFinalPonderada(
  notasUltimasPorBloque: Record<number, number>,
  bloquesCubiertos: number[]
): { notaFinal: number | null; estado: "COMPLETO" | "INCOMPLETO"; bloquesFaltantes: number[] } {
  const totalBloques = 8;
  const bloquesFaltantes = [];

  for (let i = 1; i <= totalBloques; i++) {
    if (!bloquesCubiertos.includes(i)) {
      bloquesFaltantes.push(i);
    }
  }

  // Si faltan bloques, no calcular nota final
  if (bloquesFaltantes.length > 0) {
    return {
      notaFinal: null,
      estado: "INCOMPLETO",
      bloquesFaltantes,
    };
  }

  // Calcular promedio ponderado
  let sumaProductos = 0;
  let sumaPesos = 0;

  Object.entries(PESOS_BLOQUES).forEach(([bloqueIdStr, peso]) => {
    const bloqueId = parseInt(bloqueIdStr);
    const nota = notasUltimasPorBloque[bloqueId] || 0;
    sumaProductos += nota * peso;
    sumaPesos += peso;
  });

  const notaFinal = sumaPesos > 0 ? sumaProductos / sumaPesos : 0;

  return {
    notaFinal: Math.round(notaFinal * 100) / 100,
    estado: "COMPLETO",
    bloquesFaltantes: [],
  };
}

/**
 * Obtiene estadísticas de desempeño
 */
export function obtenerEstadisticas(
  intentos: Array<{
    score_total: number;
    notas_por_bloque: Record<string, number>;
    fecha: string;
  }>
) {
  if (intentos.length === 0) {
    return null;
  }

  const scores = intentos.map((i) => i.score_total);
  const promedio = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maximo = Math.max(...scores);
  const minimo = Math.min(...scores);
  const tendencia = intentos.length > 1 
    ? scores[scores.length - 1] - scores[0] 
    : 0;

  return {
    promedio: Math.round(promedio * 100) / 100,
    maximo: Math.round(maximo * 100) / 100,
    minimo: Math.round(minimo * 100) / 100,
    tendencia: Math.round(tendencia * 100) / 100,
    totalIntentos: intentos.length,
    mejorando: tendencia > 0,
  };
}

/**
 * Obtiene desempeño por bloque
 */
export function obtenerDesempenoPorBloque(
  intentos: Array<{
    notas_por_bloque: Record<string, number>;
  }>
) {
  const desempenoPorBloque: Record<string, number[]> = {};

  const bloques = [
    "Diagnóstico Eléctrico",
    "Sistemas de Enfriamiento",
    "Bushings",
    "Protección y Fusibles",
    "Tap Changers y Switches",
    "Instrumentación e Indicadores",
    "Manejo y Tratamiento de Aceite",
    "Reparaciones Mecánicas y Estructurales",
  ];

  bloques.forEach((bloque) => {
    desempenoPorBloque[bloque] = [];
  });

  intentos.forEach((intento) => {
    Object.entries(intento.notas_por_bloque).forEach(([bloque, nota]) => {
      if (desempenoPorBloque[bloque]) {
        desempenoPorBloque[bloque].push(nota);
      }
    });
  });

  // Calcular promedios
  const resultado: Record<string, number> = {};
  Object.entries(desempenoPorBloque).forEach(([bloque, notas]) => {
    if (notas.length > 0) {
      resultado[bloque] = Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100;
    }
  });

  return resultado;
}

/**
 * Verifica si el candidato pasó la evaluación
 */
export function candidatoPaso(porcentaje: number, minimoRequerido: number = 70): boolean {
  return porcentaje >= minimoRequerido;
}
