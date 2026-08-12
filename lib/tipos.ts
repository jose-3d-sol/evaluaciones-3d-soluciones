// Niveles de certificación (globales)
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

export interface Bloque {
  id: string;
  empresa_id: string;
  nombre: string;
  peso: number;
  orden: number;
}

export interface Pregunta {
  id: number;
  empresa_id: string;
  bloque_nombre: string;
  bloque_peso: number;
  pregunta: string;
  opciones: { A: string; B: string; C: string; D: string };
  respuesta_correcta: string;
  nivel: string;
  justificacion: string;
}

export interface Empresa {
  id: string;
  nombre: string;
  contacto: string;
}
