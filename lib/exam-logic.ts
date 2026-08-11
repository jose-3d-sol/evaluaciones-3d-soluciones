// lib/exam-logic.ts
// Lógica para generar exámenes aleatorios balanceados

interface Pregunta {
  id: number;
  bloque_id: number;
  bloque_nombre: string;
  pregunta: string;
  opciones: { A: string; B: string; C: string; D: string };
  respuesta_correcta: string;
  nivel: 'BÁSICO' | 'INTERMEDIO' | 'AVANZADO';
  justificacion: string;
}

interface ConfigExamen {
  bloques_ids: number[];
  preguntas_por_bloque: Record<number, number>;
  balance_niveles?: { BÁSICO: number; INTERMEDIO: number; AVANZADO: number };
}

interface ExamenGenerado {
  preguntas: Pregunta[];
  total: number;
  distribucion_por_nivel: Record<string, number>;
  distribucion_por_bloque: Record<string, number>;
}

/**
 * Genera un examen aleatorio balanceado por nivel de dificultad
 */
export function generarExamen(
  todasLasPreguntas: Pregunta[],
  config: ConfigExamen
): ExamenGenerado {
  // 1. Filtrar preguntas por bloques solicitados
  let preguntasFiltradas = todasLasPreguntas.filter((p) =>
    config.bloques_ids.includes(p.bloque_id)
  );

  // 2. Organizar por bloque
  const preguntasPorBloque: Record<number, Pregunta[]> = {};
  config.bloques_ids.forEach((bloqueId) => {
    preguntasPorBloque[bloqueId] = preguntasFiltradas.filter(
      (p) => p.bloque_id === bloqueId
    );
  });

  // 3. Seleccionar preguntas por bloque
  const preguntasSeleccionadas: Pregunta[] = [];

  Object.entries(config.preguntas_por_bloque).forEach(([bloqueIdStr, cantidad]) => {
    const bloqueId = parseInt(bloqueIdStr);
    const preguntasDelBloque = preguntasPorBloque[bloqueId] || [];

    if (preguntasDelBloque.length === 0) {
      console.warn(`No hay preguntas para el bloque ${bloqueId}`);
      return;
    }

    // Seleccionar aleatoriamente SIN repetir
    const seleccionadas = seleccionarAleatoriamente(
      preguntasDelBloque,
      Math.min(cantidad, preguntasDelBloque.length)
    );

    preguntasSeleccionadas.push(...seleccionadas);
  });

  // 4. Validar balance de niveles (60% Básico/Intermedio, 40% Avanzado)
  const balanceNiveles = config.balance_niveles || {
    BÁSICO: 40,
    INTERMEDIO: 35,
    AVANZADO: 25,
  };

  const balanceado = balancearPorNivel(
    preguntasSeleccionadas,
    balanceNiveles
  );

  // 5. Mezclar orden
  const examenFinal = mezclarArray(balanceado);

  // 6. Calcular estadísticas
  const distribucion_por_nivel = contarPorNivel(examenFinal);
  const distribucion_por_bloque = contarPorBloque(examenFinal);

  return {
    preguntas: examenFinal,
    total: examenFinal.length,
    distribucion_por_nivel,
    distribucion_por_bloque,
  };
}

/**
 * Balancea un array de preguntas según distribución de niveles
 */
function balancearPorNivel(
  preguntas: Pregunta[],
  objetivo: Record<string, number>
): Pregunta[] {
  const total = preguntas.length;
  const cantidadPorNivel = {
    BÁSICO: Math.round((total * objetivo.BÁSICO) / 100),
    INTERMEDIO: Math.round((total * objetivo.INTERMEDIO) / 100),
    AVANZADO: Math.round((total * objetivo.AVANZADO) / 100),
  };

  const preguntasPorNivel: Record<string, Pregunta[]> = {
    BÁSICO: [],
    INTERMEDIO: [],
    AVANZADO: [],
  };

  preguntas.forEach((p) => {
    preguntasPorNivel[p.nivel]?.push(p);
  });

  const resultado: Pregunta[] = [];

  // Agregar preguntas de cada nivel
  Object.entries(cantidadPorNivel).forEach(([nivel, cantidad]) => {
    const disponibles = preguntasPorNivel[nivel] || [];
    const seleccionar = Math.min(cantidad, disponibles.length);
    const seleccionadas = seleccionarAleatoriamente(disponibles, seleccionar);
    resultado.push(...seleccionadas);
  });

  return resultado;
}

/**
 * Selecciona N elementos aleatorios SIN repetir
 */
function seleccionarAleatoriamente<T>(array: T[], n: number): T[] {
  const copia = [...array];
  const resultado: T[] = [];

  for (let i = 0; i < n && copia.length > 0; i++) {
    const indice = Math.floor(Math.random() * copia.length);
    resultado.push(copia[indice]);
    copia.splice(indice, 1);
  }

  return resultado;
}

/**
 * Mezcla un array (Fisher-Yates)
 */
function mezclarArray<T>(array: T[]): T[] {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Cuenta preguntas por nivel
 */
function contarPorNivel(preguntas: Pregunta[]): Record<string, number> {
  return {
    BÁSICO: preguntas.filter((p) => p.nivel === 'BÁSICO').length,
    INTERMEDIO: preguntas.filter((p) => p.nivel === 'INTERMEDIO').length,
    AVANZADO: preguntas.filter((p) => p.nivel === 'AVANZADO').length,
  };
}

/**
 * Cuenta preguntas por bloque
 */
function contarPorBloque(preguntas: Pregunta[]): Record<string, number> {
  const conteo: Record<string, number> = {};
  preguntas.forEach((p) => {
    conteo[p.bloque_nombre] = (conteo[p.bloque_nombre] || 0) + 1;
  });
  return conteo;
}

/**
 * Valida que un candidato haya cubierto todos los bloques
 */
export function candidatoCubreTodasLasBloques(
  bloquesCubiertos: number[],
  totalBloques: number = 8
): boolean {
  const bloquesFaltantes = [];
  for (let i = 1; i <= totalBloques; i++) {
    if (!bloquesCubiertos.includes(i)) {
      bloquesFaltantes.push(i);
    }
  }
  return bloquesFaltantes.length === 0;
}

/**
 * Obtiene los bloques que faltan cubrir
 */
export function obtenerBloquesFaltantes(
  bloquesCubiertos: number[],
  totalBloques: number = 8
): number[] {
  const faltantes = [];
  for (let i = 1; i <= totalBloques; i++) {
    if (!bloquesCubiertos.includes(i)) {
      faltantes.push(i);
    }
  }
  return faltantes;
}
