import type { RoleInsight } from "@/lib/stats/aggregate";
import { ROLE_LABELS } from "@/lib/stats/roles";
import { pct, signedPct } from "@/lib/format";

export function RoleBreakdown({ roles }: { roles: RoleInsight[] }) {
  const visible = roles.filter((r) => r.role !== "UNKNOWN");
  if (visible.length === 0) {
    return <p className="text-sm text-zinc-500">Sem dados de role na amostra.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {visible.map((role) => (
        <li
          key={role.role}
          className="text-sm text-zinc-400"
          title={`Lift ${signedPct(role.lift)} · KDA ${role.kda.toFixed(2)}`}
        >
          <span className="text-zinc-500">{ROLE_LABELS[role.role]}</span>
          <span className="mx-1.5 text-zinc-600">·</span>
          <span className="tabular-nums text-zinc-300">{pct(role.wr)}</span>
          <span className="ml-1 text-xs text-zinc-600">{role.games}x</span>
        </li>
      ))}
    </ul>
  );
}
