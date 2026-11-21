"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ClearProfileButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function clear() {
    startTransition(async () => {
      await fetch("/api/profile", { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={clear}
      disabled={pending}
      className="text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--muted-strong)] hover:underline disabled:opacity-50"
    >
      {pending ? "Removendo…" : "Trocar perfil"}
    </button>
  );
}
