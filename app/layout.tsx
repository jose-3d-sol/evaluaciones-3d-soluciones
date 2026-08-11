import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Evaluaciones 3D Soluciones',
  description: 'Sistema de evaluación de técnicos e ingenieros',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <nav className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <a href="/" className="flex items-center gap-3">
              <div className="bg-white text-blue-800 font-bold text-xl w-10 h-10 rounded-lg flex items-center justify-center">3D</div>
              <div>
                <div className="text-lg font-bold leading-tight">3D Soluciones Eléctricas</div>
                <div className="text-xs text-blue-200">Sistema de Evaluación Técnica</div>
              </div>
            </a>
            <div className="flex gap-2">
              <a href="/" className="hover:bg-blue-600 px-4 py-2 rounded-lg transition text-sm font-medium">Inicio</a>
              <a href="/admin" className="hover:bg-blue-600 px-4 py-2 rounded-lg transition text-sm font-medium">Panel Admin</a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        <footer className="text-center text-gray-400 text-sm py-6">
          © 2026 3D Soluciones Eléctricas · Sistema de Evaluación Técnica
        </footer>
      </body>
    </html>
  );
}
