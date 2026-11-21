import type { RoleInsight } from "@/lib/stats/aggregate";
import { ROLE_LABELS } from "@/lib/stats/roles";
import { pct, signedPct } from "@/lib/format";

export function RoleBreakdown({ roles }: { roles: RoleInsight[] }) {
  const visible = roles.filter((r) => r.role !== "UNKNOWN");
  if (visible.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Sem dados de role na amostra.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {visible.map((role) => (
        <li
          key={role.role}
          className="text-sm text-[var(--muted)]"
          title={`Lift ${signedPct(role.lift)} · KDA ${role.kda.toFixed(2)}`}
        >
          <span className="text-[var(--muted)]">{ROLE_LABELS[role.role]}</span>
          <span className="mx-1.5 text-[var(--muted)]">·</span>
          <span className="tabular-nums text-[var(--muted-strong)]">{pct(role.wr)}</span>
          <span className="ml-1 text-xs text-[var(--muted)]">{role.games}x</span>
        </li>
      ))}
    </ul>
  );
}
