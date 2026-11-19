import type { ReactNode } from "react";
import { pct } from "@/lib/format";
import type { TemporalInsights } from "@/lib/stats/temporal";
import { ConfidenceBadge } from "./ConfidenceBadge";

type Props = {
  temporal: TemporalInsights;
  overallWr: number;
};

export function PerformanceInsights({ temporal, overallWr }: Props) {
  const days = temporal.byDayOfWeek.filter((d) => d.games > 0);
  const hours = temporal.byHour.filter((h) => h.games >= 3);
  const sessions = temporal.sessionIndex.filter((s) => s.games > 0);
  const streaks = temporal.afterWinStreaks.filter((s) => s.games >= 3);
  const lossStreaks = (temporal.afterLossStreaks ?? []).filter(
    (s) => s.games >= 3,
  );
  const gaps = (temporal.byRefillGap ?? []).filter((g) => g.games >= 5);
  const patches = temporal.byPatch.slice(0, 5);
  const avoid = (temporal.avoidList ?? []).slice(0, 5);

  return (
    <section className="panel space-y-5 p-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Quando jogar</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Histórico · {temporal.timezone.replace("_", " ")} · média{" "}
          {pct(overallWr)}
          {temporal.recentForm
            ? ` · forma recente ${pct(temporal.recentForm.wr)}`
            : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightBlock title="Melhor horário">
          {temporal.bestPlayWindow ? (
            <p className="text-sm text-zinc-200">
              <span className="font-semibold text-[#7dd3de]">
                {temporal.bestPlayWindow.label}
              </span>
              {" · "}
              {pct(temporal.bestPlayWindow.wr)} WR ·{" "}
              {temporal.bestPlayWindow.games} jogos
              <span className="text-zinc-500">
                {" "}
                ({pct(temporal.bestPlayWindow.lift)} vs média)
              </span>
            </p>
          ) : (
            <p className="text-sm text-zinc-500">
              Precisa de mais partidas por horário.
            </p>
          )}
          {hours.length > 0 ? (
            <MiniBars
              rows={hours.map((h) => ({
                label: h.label,
                wr: h.wr,
                games: h.games,
                lift: h.lift,
              }))}
            />
          ) : null}
        </InsightBlock>

        <InsightBlock title="Dias da semana">
          {temporal.bestDay ? (
            <p className="text-sm text-zinc-200">
              Melhor:{" "}
              <span className="font-semibold text-[#7dd3de]">
                {temporal.bestDay.label}
              </span>
              {" · "}
              {pct(temporal.bestDay.wr)} · {temporal.bestDay.games} jogos
            </p>
          ) : null}
          <ul className="mt-2 space-y-1.5">
            {days.map((d) => (
              <li
                key={d.key}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-zinc-300">{d.label}</span>
                <span className="tabular-nums text-zinc-400">
                  {d.games === 0 ? "—" : `${pct(d.wr)} · ${d.games}x`}
                </span>
              </li>
            ))}
          </ul>
        </InsightBlock>

        <InsightBlock title="Partidas na sessão">
          <p className="mb-2 text-xs text-zinc-500">
            Sessão = partidas com menos de 3h de intervalo
          </p>
          {sessions.length === 0 ? (
            <p className="text-sm text-zinc-500">Sem dados de sessão</p>
          ) : (
            <ul className="space-y-1.5">
              {sessions.map((s) => (
                <li
                  key={s.key}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-zinc-300">{s.label}</span>
                  <span
                    className={`tabular-nums ${
                      s.lift <= -0.08
                        ? "text-rose-300"
                        : s.lift >= 0.05
                          ? "text-emerald-300"
                          : "text-zinc-400"
                    }`}
                  >
                    {pct(s.wr)} · {s.games}x
                  </span>
                </li>
              ))}
            </ul>
          )}
        </InsightBlock>

        <InsightBlock title="Após wins / derrotas">
          {streaks.length === 0 && lossStreaks.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Poucas sequências ainda — sincronize mais histórico.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {streaks.map((s) => (
                <li
                  key={s.key}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-[var(--muted-strong)]">{s.label}</span>
                  <span
                    className={`tabular ${
                      s.lift <= -0.08 ? "text-rose-300" : "text-[var(--muted)]"
                    }`}
                  >
                    próxima {pct(s.wr)} · {s.games}x
                  </span>
                </li>
              ))}
              {lossStreaks.map((s) => (
                <li
                  key={s.key}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-[var(--muted-strong)]">{s.label}</span>
                  <span
                    className={`tabular ${
                      s.lift <= -0.08 ? "text-rose-300" : "text-[var(--muted)]"
                    }`}
                  >
                    próxima {pct(s.wr)} · {s.games}x
                  </span>
                </li>
              ))}
            </ul>
          )}
        </InsightBlock>
      </div>

      {gaps.length > 0 ? (
        <InsightBlock title="Gap entre partidas (refila)">
          <ul className="space-y-1.5">
            {gaps.map((g) => (
              <li
                key={g.key}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-[var(--muted-strong)]">{g.label}</span>
                <span
                  className={`tabular ${
                    g.lift <= -0.08 ? "text-rose-300" : "text-[var(--muted)]"
                  }`}
                >
                  {pct(g.wr)} · {g.games}x
                </span>
              </li>
            ))}
          </ul>
        </InsightBlock>
      ) : null}

      {avoid.length > 0 ? (
        <InsightBlock title="Evitar (sangria no histórico)">
          <ul className="space-y-1.5">
            {avoid.map((a) => (
              <li
                key={a.key}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-[var(--muted-strong)]">{a.label}</span>
                <span className="tabular text-rose-300">
                  {pct(a.wr)} · {a.games}x
                </span>
              </li>
            ))}
          </ul>
        </InsightBlock>
      ) : null}

      <InsightBlock title="Por patch">
        {patches.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Versão do jogo ainda não veio no histórico salvo — sincronize de
            novo.
          </p>
        ) : (
          <ul className="space-y-2">
            {patches.map((p, i) => (
              <li
                key={p.patch}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-white">
                    {p.patch}
                    {i === 0 ? (
                      <span className="ml-2 text-xs text-[#7dd3de]">atual</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {p.games} jogos · {pct(p.wr)} WR
                  </p>
                </div>
                <ConfidenceBadge level={p.confidence} />
              </li>
            ))}
          </ul>
        )}
      </InsightBlock>
    </section>
  );
}

function InsightBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="data-label mb-2">{title}</p>
      {children}
    </div>
  );
}

function MiniBars({
  rows,
}: {
  rows: { label: string; wr: number; games: number; lift: number }[];
}) {
  const top = [...rows].sort((a, b) => b.games - a.games).slice(0, 8);
  return (
    <ul className="mt-3 space-y-1">
      {top.map((r) => (
        <li key={r.label} className="flex items-center gap-2 text-xs">
          <span className="w-8 text-zinc-500">{r.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${
                r.lift >= 0.05
                  ? "bg-emerald-400/80"
                  : r.lift <= -0.08
                    ? "bg-rose-400/70"
                    : "bg-[#0596aa]/70"
              }`}
              style={{ width: `${Math.max(8, Math.round(r.wr * 100))}%` }}
            />
          </div>
          <span className="w-16 text-right tabular-nums text-zinc-400">
            {pct(r.wr)}
          </span>
        </li>
      ))}
    </ul>
  );
}
