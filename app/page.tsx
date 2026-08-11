'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [enlace, setEnlace] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExamen = async (e: React.FormEvent) => {
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
        .eq('enlace_unico', enlace.trim())
        .single();

      if (err || !data) {
        setError('Código de acceso inválido');
        setLoading(false);
        return;
      }

      window.location.href = `/examen/${enlace.trim()}`;
    } catch (err) {
      setError('Error al conectar. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-8 py-12">
      <div className="bg-white p-8 rounded-lg shadow">
        <h2 className="text-3xl font-bold mb-6 text-blue-600">Acceder al Examen</h2>
        <form onSubmit={handleExamen} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Código de Acceso
            </label>
            <input
              type="text"
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
              placeholder="Ej: 1234-ABCD-5678"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Conectando...' : 'Entrar al Examen'}
          </button>
        </form>
      </div>

      <div className="bg-blue-50 p-8 rounded-lg border-2 border-blue-200">
        <h2 className="text-2xl font-bold mb-4 text-blue-600">Información</h2>
        <ul className="space-y-3 text-gray-700">
          <li>✓ Exámenes completamente aleatorios</li>
          <li>✓ Múltiples intentos sin límite</li>
          <li>✓ Retroalimentación técnica</li>
          <li>✓ 5 Niveles de certificación</li>
          <li>✓ 491 preguntas de técnicos</li>
        </ul>
      </div>
    </div>
  );
}
