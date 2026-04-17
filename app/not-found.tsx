import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full border border-gray-800 bg-gray-950 p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        
        {/* Background visual detail */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent opacity-50" />
        <div className="absolute -left-10 -bottom-10 text-9xl opacity-5 select-none font-mono font-bold text-gray-400">
          ?
        </div>

        <h1 className="text-4xl tracking-widest font-display font-bold text-gray-300 mb-2">
          ERROR 404
        </h1>
        <p className="text-sm font-mono text-amber-500/80 uppercase tracking-wider mb-8 border-b border-gray-800 pb-4 w-full">
          Sector No Encontrado.
        </p>

        <p className="text-gray-500 font-mono text-sm mb-8 leading-relaxed">
          Las coordenadas de navegación introducidas apuntan a un vacío espacial. La nave no puede trazar una ruta hacia este sector.
        </p>

        <Link
          href="/"
          className="w-full py-4 text-center font-display font-bold tracking-widest bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800 hover:text-white transition-colors duration-200 uppercase"
        >
          [ Volver a la Base ]
        </Link>
      </div>
    </div>
  );
}
