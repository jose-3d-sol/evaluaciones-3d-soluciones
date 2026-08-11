'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [enlace, setEnlace] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAcceso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enlace.trim()) {
      setError('Por favor ingresa tu código de acceso');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('candidates')
        .select('*')
        .eq('enlace_unico', enlace.trim().toUpperCase())
        .single();

      if (err || !data) {
        setError('Código de acceso inválido. Verifica e intenta de nuevo.');
        setLoading(false);
        return;
      }
      window.location.href = `/examen/${enlace.trim().toUpperCase()}`;
    } catch {
      setError('Error al conectar. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 mt-4">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Acceder a tu Evaluación</h1>
        <p className="text-gray-500 text-sm mb-6">Ingresa el código único que te fue proporcionado</p>
        <form onSubmit={handleAcceso} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Código de Acceso</label>
            <input
              type="text"
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
              placeholder="Ej: A1B2C3D4E-F5G6"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Verificando...' : 'Iniciar Evaluación'}
          </button>
        </form>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 rounded-2xl shadow-md">
        <h2 className="text-xl font-bold mb-5">Acerca de la Evaluación</h2>
        <ul className="space-y-4">
          {[
            ['Exámenes personalizados', 'Cada intento genera preguntas aleatorias únicas'],
            ['Múltiples intentos', 'Sin límite de repeticiones para mejorar'],
            ['Retroalimentación', 'Conoce tus áreas de oportunidad'],
            ['5 niveles de certificación', 'Desde Técnico en Desarrollo hasta Experto SME'],
            ['8 bloques técnicos', 'Cobertura integral de competencias'],
          ].map(([titulo, desc], i) => (
            <li key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">✓</div>
              <div>
                <div className="font-semibold">{titulo}</div>
                <div className="text-blue-100 text-sm">{desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
