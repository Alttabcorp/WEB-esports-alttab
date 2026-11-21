import Link from "next/link";
import { Button } from "@/components/ui";

export function PrepGate({
  title,
  detail,
  configOnly = false,
}: {
  title: string;
  detail: string;
  configOnly?: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-10">
      <p className="data-label">Preparar</p>
      <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
        {title}
      </h1>
      <p className="text-sm text-[var(--muted)]">{detail}</p>
      <div className="flex flex-wrap gap-2">
        <Button href="/config">{configOnly ? "Ir para configuração" : "Config"}</Button>
        {!configOnly ? (
          <Button href="/" variant="secondary">
            Hub
          </Button>
        ) : null}
      </div>
      <Link
        href="/"
        className="text-sm text-[var(--alttab-soft)] hover:underline"
      >
        ← Voltar
      </Link>
    </div>
  );
}
