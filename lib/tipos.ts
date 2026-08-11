export interface Bloque {
  id: number;
  nombre: string;
  peso: number;
}

export const BLOQUES: Bloque[] = [
  { id: 1, nombre: 'Diagnóstico Eléctrico', peso: 30 },
  { id: 2, nombre: 'Sistemas de Enfriamiento', peso: 10 },
  { id: 3, nombre: 'Bushings', peso: 10 },
  { id: 4, nombre: 'Protección y Fusibles', peso: 10 },
  { id: 5, nombre: 'Tap Changers y Switches', peso: 10 },
  { id: 6, nombre: 'Instrumentación e Indicadores', peso: 10 },
  { id: 7, nombre: 'Manejo y Tratamiento de Aceite', peso: 15 },
  { id: 8, nombre: 'Reparaciones Mecánicas y Estructurales', peso: 5 },
];

export interface NivelCertificacion {
  nivel: number;
  titulo: string;
  rango_min: number;
  rango_max: number;
}

export const NIVELES: NivelCertificacion[] = [
  { nivel: 1, titulo: 'Técnico en Desarrollo', rango_min: 70, rango_max: 79 },
  { nivel: 2, titulo: 'Técnico Calificado', rango_min: 80, rango_max: 84 },
  { nivel: 3, titulo: 'Especialista Técnico', rango_min: 85, rango_max: 89 },
  { nivel: 4, titulo: 'Especialista Senior', rango_min: 90, rango_max: 94 },
  { nivel: 5, titulo: 'Experto Técnico (SME)', rango_min: 95, rango_max: 100 },
];

export function clasificar(score: number): string {
  if (score < 70) return 'No Certificado';
  for (const n of NIVELES) {
    if (score >= n.rango_min && score <= n.rango_max) {
      return `Nivel ${n.nivel} - ${n.titulo}`;
    }
  }
  return 'No Certificado';
}

// Mapea nombre de bloque a su peso oficial (los datos usan bloque_nombre confiable)
export function pesoPorNombre(nombre: string): number {
  const b = BLOQUES.find(x => x.nombre === nombre);
  return b ? b.peso : 10;
}

export interface Pregunta {
  id: number;
  bloque_id: number;
  bloque_nombre: string;
  bloque_peso: number;
  pregunta: string;
  opciones: { A: string; B: string; C: string; D: string };
  respuesta_correcta: string;
  nivel: string;
  justificacion: string;
}
