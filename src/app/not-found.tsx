import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-inset)] p-8 text-center">
      <h1 className="text-2xl text-[var(--foreground)]">
        Página não encontrada
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Volte à busca e informe um Riot ID válido.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl bg-[var(--alttab)] px-4 py-2 text-sm font-semibold text-white"
      >
        Ir para a busca
      </Link>
    </div>
  );
}
