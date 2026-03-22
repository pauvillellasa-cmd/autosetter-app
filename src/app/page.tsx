import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          AutoSetter
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Despliega un equipo de ventas IA en tus DMs de Instagram. Cualifica
          leads, envia contenido y agenda llamadas 24/7.
        </p>
        <Link
          href="/login"
          className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-8 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          Empezar
        </Link>
      </div>
    </div>
  );
}
