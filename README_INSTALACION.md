# Sistema de Evaluación 3D Soluciones - Instalación Rápida

## 🚀 PRIMEROS PASOS (5 minutos)

### 1. Descarga este proyecto en tu PC
```bash
git clone https://github.com/tu-usuario/evaluaciones-3d-soluciones.git
cd evaluaciones-3d-soluciones
```

### 2. Instala dependencias
```bash
npm install
```

### 3. Configura variables de entorno
```bash
# Copia el archivo .env.example a .env.local
cp .env.example .env.local

# Luego edita .env.local y pega tus claves de Supabase:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 4. Ejecuta localmente
```bash
npm run dev
```

Abre: http://localhost:3000

---

## 🌐 DESPLIEGUE EN VERCEL

1. Sube todo a GitHub
2. Ve a https://vercel.com/new
3. Importa tu repositorio
4. Agrega las 3 variables de entorno
5. Click "Deploy"

¡Listo! Tu sitio estará online en 3-5 minutos.

---

## 📱 RUTAS PRINCIPALES

- `/` → Página de inicio (candidatos ingresan su enlace)
- `/admin` → Panel administrativo (crear candidatos, cargar preguntas)
- `/examen/[enlace]` → Examen del candidato

---

## 📋 BASE DE DATOS (Supabase)

Ya deberías tener 3 tablas creadas:
- `candidates` - Datos de candidatos
- `exam_attempts` - Historial de intentos
- `preguntas` - Banco de 491 preguntas

Si no las tienes, revisa el archivo SQL_SETUP.sql

---

¡Listo para usar!
