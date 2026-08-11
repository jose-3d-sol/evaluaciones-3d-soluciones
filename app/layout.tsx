import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Evaluaciones 3D Soluciones',
  description: 'Sistema de evaluación de técnicos e ingenieros',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-blue-600 text-white p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <h1 className="text-2xl font-bold">3D Soluciones - Evaluaciones</h1>
              <div className="flex gap-4">
                <a href="/" className="hover:bg-blue-700 px-4 py-2 rounded">Inicio</a>
                <a href="/admin" className="hover:bg-blue-700 px-4 py-2 rounded">Admin</a>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto p-4">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
