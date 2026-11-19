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
      className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline disabled:opacity-50"
    >
      {pending ? "Removendo…" : "Trocar perfil"}
    </button>
  );
}
