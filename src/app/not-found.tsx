import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-black/30 p-8 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-white">
        Página não encontrada
      </h1>
      <p className="mt-3 text-sm text-zinc-400">
        Volte à busca e informe um Riot ID válido.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl bg-[#0596aa] px-4 py-2 text-sm font-semibold text-white"
      >
        Ir para a busca
      </Link>
    </div>
  );
}
