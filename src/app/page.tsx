import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <h1 className="text-3xl font-bold mb-4 text-green-900">Golfrivals</h1>
      <p className="mb-8 text-center text-green-800">Private golf skins tracker for friends</p>
      <Link href="/create-game" className="bg-green-600 text-white rounded px-6 py-3 font-semibold shadow hover:bg-green-700 transition mb-4">Start New Game</Link>
      <div className="flex gap-4 mt-4">
        <Link href="/auth/login" className="btn btn-gold">Iniciar sesión</Link>
        <Link href="/auth/register" className="btn btn-blue">Registrarse</Link>
      </div>
    </div>
  );
}
