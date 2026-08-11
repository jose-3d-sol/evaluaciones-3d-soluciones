-- Tabla de candidatos
CREATE TABLE candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  bloques_asignados JSONB DEFAULT '[]'::jsonb,
  bloques_evaluados JSONB DEFAULT '[]'::jsonb,
  estado VARCHAR(50) DEFAULT 'INCOMPLETO',
  nota_final DECIMAL(5,2),
  clasificacion VARCHAR(50),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_ultima_prueba TIMESTAMP,
  enlace_unico VARCHAR(255) UNIQUE
);

-- Tabla de intentos de examen
CREATE TABLE exam_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  fecha TIMESTAMP DEFAULT NOW(),
  bloques_en_intento JSONB NOT NULL,
  preguntas_ids JSONB NOT NULL,
  respuestas JSONB NOT NULL,
  score_total DECIMAL(5,2) NOT NULL,
  clasificacion VARCHAR(50),
  notas_por_bloque JSONB
);

-- Tabla de preguntas
CREATE TABLE preguntas (
  id INT PRIMARY KEY,
  bloque_id INT NOT NULL,
  bloque_nombre VARCHAR(255),
  bloque_peso INT,
  pregunta TEXT NOT NULL,
  opciones JSONB NOT NULL,
  respuesta_correcta VARCHAR(1),
  nivel VARCHAR(50),
  justificacion TEXT
);
