'use client';

import { useState, useEffect } from 'react';

// Contraseña del panel admin. Cámbiala por la que quieras.
const ADMIN_PASSWORD = '3DSoluciones2026';
const STORAGE_KEY = 'admin_auth_ok';

export function useAdminAuth() {
  const [autenticado, setAutenticado] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') setAutenticado(true);
    } catch {}
    setVerificando(false);
  }, []);

  const login = (pass: string): boolean => {
    if (pass === ADMIN_PASSWORD) {
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}
      setAutenticado(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    setAutenticado(false);
  };

  return { autenticado, verificando, login, logout };
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { autenticado, verificando, login, logout } = useAdminAuth();
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  if (verificando) return <div className="text-center py-20 text-gray-400">Cargando...</div>;

  if (!autenticado) {
    return (
      <div className="max-w-sm mx-auto mt-16 bg-white p-8 rounded-2xl shadow-md border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">🔒</div>
          <h1 className="text-xl font-bold text-gray-800">Panel de Administración</h1>
          <p className="text-gray-500 text-sm">Ingresa la contraseña para continuar</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!login(pass)) setError('Contraseña incorrecta'); }} className="space-y-3">
          <input type="password" value={pass} onChange={(e) => { setPass(e.target.value); setError(''); }}
            placeholder="Contraseña" autoFocus
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">Cerrar sesión admin</button>
      </div>
      {children}
    </div>
  );
}
