import type { RoleInsight } from "@/lib/stats/aggregate";
import { ROLE_LABELS } from "@/lib/stats/roles";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { pct, signedPct } from "@/lib/format";

export function RoleBreakdown({ roles }: { roles: RoleInsight[] }) {
  const visible = roles.filter((r) => r.role !== "UNKNOWN");
  if (visible.length === 0) {
    return <p className="text-sm text-zinc-400">Sem dados de role na amostra.</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((role) => (
        <li
          key={role.role}
          className="rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-semibold text-white">{ROLE_LABELS[role.role]}</p>
            <ConfidenceBadge level={role.confidence} />
          </div>
          <p className="text-2xl font-bold text-[#7dd3de]">{pct(role.wr)}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {role.games} jogos · Lift {signedPct(role.lift)} · KDA{" "}
            {role.kda.toFixed(2)}
          </p>
        </li>
      ))}
    </ul>
  );
}
