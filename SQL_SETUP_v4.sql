-- ============================================
-- ESQUEMA v4: Asignaciones de prueba múltiples por candidato
-- Ejecutar en Supabase SQL Editor (solo AGREGA, no borra)
-- ============================================

-- Tabla de EMPRESAS (si no existe de v3)
CREATE TABLE IF NOT EXISTS empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  contacto VARCHAR(255),
  fecha_creacion TIMESTAMP DEFAULT NOW()
);
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acceso_empresas" ON empresas;
CREATE POLICY "acceso_empresas" ON empresas FOR ALL USING (true) WITH CHECK (true);

-- Tabla de BLOQUES por empresa (si no existe de v3)
CREATE TABLE IF NOT EXISTS bloques_empresa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  peso INT DEFAULT 10,
  orden INT DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);
ALTER TABLE bloques_empresa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acceso_bloques_empresa" ON bloques_empresa;
CREATE POLICY "acceso_bloques_empresa" ON bloques_empresa FOR ALL USING (true) WITH CHECK (true);

-- Columnas empresa_id (si no existen de v3)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;

-- ============================================
-- NUEVO EN v4: TABLA DE ASIGNACIONES DE PRUEBA
-- Un candidato puede tener MUCHAS asignaciones, cada una con su enlace y sus bloques
-- ============================================
CREATE TABLE IF NOT EXISTS asignaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  enlace_unico VARCHAR(255) UNIQUE NOT NULL,
  bloques_config JSONB DEFAULT '[]'::jsonb,   -- [{bloque_nombre, cantidad}]
  estado VARCHAR(50) DEFAULT 'PENDIENTE',      -- PENDIENTE | COMPLETADA
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_completada TIMESTAMP
);
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acceso_asignaciones" ON asignaciones;
CREATE POLICY "acceso_asignaciones" ON asignaciones FOR ALL USING (true) WITH CHECK (true);

-- Vincular cada intento a una asignación
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS asignacion_id UUID REFERENCES asignaciones(id) ON DELETE CASCADE;

-- ============================================
-- LISTO. El candidato ahora es solo un perfil (nombre, email, empresa).
-- Las pruebas se crean como "asignaciones", cada una con su propio enlace.
-- ============================================
