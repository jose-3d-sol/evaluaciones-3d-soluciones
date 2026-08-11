'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPanel() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      const { data } = await supabase.from('candidates').select('*');
      setCandidates(data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const generateEnlace = () => {
    return `${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
  };

  const createCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return;

    const enlace = generateEnlace();

    try {
      await supabase.from('candidates').insert({
        nombre: nombre.trim(),
        email: email.trim(),
        enlace_unico: enlace,
        estado: 'INCOMPLETO'
      });

      alert(`Candidato creado. Enlace: ${enlace}`);
      setNombre('');
      setEmail('');
      loadCandidates();
    } catch (err) {
      alert('Error creando candidato');
    }
  };

  return (
    <div className="space-y-8 py-8">
      <h1 className="text-4xl font-bold text-blue-600">Panel Administrativo</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Crear Candidato</h2>
        <form onSubmit={createCandidate} className="space-y-4">
          <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border px-4 py-2 rounded" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border px-4 py-2 rounded" />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">Crear</button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Candidatos: {candidates.length}</h2>
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Nombre</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Enlace</th>
              <th className="border p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td className="border p-2">{c.nombre}</td>
                <td className="border p-2">{c.email}</td>
                <td className="border p-2 font-mono text-sm">{c.enlace_unico}</td>
                <td className="border p-2">{c.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
