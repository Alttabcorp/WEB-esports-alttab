import type { MatchLpInsights } from "@/lib/stats/matchLpLedger";
import type { DayLpCalendarEntry } from "@/lib/stats/lpCalendar";
import { LpCalendarGrid } from "@/components/LpCalendarGrid";
import { Panel } from "@/components/ui";

type Props = {
  insights: MatchLpInsights;
  calendar?: DayLpCalendarEntry[];
  currentPatch?: string | null;
  patchNote?: string | null;
  /** Labels em português simples (aba Quando). */
  simpleLabels?: boolean;
  /** Oculta o calendário (ex.: já renderizado fora). */
  hideCalendar?: boolean;
  /** Só as barras (sem painel de intro) — para layout lado a lado. */
  barsOnly?: boolean;
};

function simplifySessionLabel(label: string): string {
  const m = label.match(/(\d+)/);
  if (!m) return label;
  const n = Number(m[1]);
  if (n === 1) return "1ª partida da sessão";
  return `${n}ª partida da sessão`;
}

function simplifyTiltHint(avg: number, sample: number): string {
  return `Após 2 derrotas: ${avg} PDL/jogo (em ${sample} jogos)`;
}

/** Ex.: "+9 PDL · 2 jogos" — média e tamanho da amostra. */
function formatLpSample(lpAvg: number, games: number): string {
  const sign = lpAvg > 0 ? "+" : "";
  return `${sign}${lpAvg} PDL · ${games} ${games === 1 ? "jogo" : "jogos"}`;
}

function LpBars({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; lpAvg: number; games: number }[];
}) {
  if (!rows.length) {
    return (
      <div>
        <p className="data-label mb-2">{title}</p>
        <p className="text-sm text-[var(--muted)]">Amostra insuficiente.</p>
      </div>
    );
  }
  const max = Math.max(...rows.map((r) => Math.abs(r.lpAvg)), 1);
  return (
    <div>
      <p className="data-label mb-2">{title}</p>
      <ul className="space-y-2">
        {rows.slice(0, 6).map((r) => (
          <li key={r.label}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-[var(--muted-strong)]">
                {r.label}
              </span>
              <span
                className={`tabular shrink-0 text-xs sm:text-sm ${
                  r.lpAvg >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                }`}
                title={`PDL médio por partida neste grupo · baseado em ${r.games} partidas`}
              >
                {formatLpSample(r.lpAvg, r.games)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-inset)]">
              <div
                className={`h-full rounded-full ${
                  r.lpAvg >= 0 ? "bg-emerald-500/70" : "bg-rose-500/70"
                }`}
                style={{
                  width: `${Math.min(100, (Math.abs(r.lpAvg) / max) * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarsGrid({
  insights,
  simpleLabels,
  sessionRows,
}: {
  insights: MatchLpInsights;
  simpleLabels: boolean;
  sessionRows: { label: string; lpAvg: number; games: number }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Panel className="p-3 sm:p-4">
        <LpBars
          title={simpleLabels ? "Por horário" : "PDL médio por horário"}
          rows={insights.byHour}
        />
      </Panel>
      <Panel className="p-3 sm:p-4">
        <LpBars
          title={
            simpleLabels ? "Por ordem na sessão" : "PDL por índice de sessão"
          }
          rows={sessionRows}
        />
      </Panel>
      <Panel className="p-3 sm:p-4">
        <LpBars
          title={simpleLabels ? "Por rota" : "PDL por role"}
          rows={insights.byRole}
        />
      </Panel>
      <Panel className="p-3 sm:p-4">
        <LpBars
          title={simpleLabels ? "Por campeão" : "PDL médio por champ"}
          rows={insights.byChampion}
        />
      </Panel>
    </div>
  );
}

export function LpInsightsPanel({
  insights,
  calendar = [],
  currentPatch = null,
  patchNote = null,
  simpleLabels = false,
  hideCalendar = false,
  barsOnly = false,
}: Props) {
  const sessionRows = simpleLabels
    ? insights.bySessionIndex.map((r) => ({
        ...r,
        label: simplifySessionLabel(r.label),
      }))
    : insights.bySessionIndex;

  if (barsOnly) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="data-label">Barras de PDL</p>
            <p className="mt-0.5 text-xs text-[var(--muted)] sm:text-sm">
              Média por partida no grupo · win ≈ +
              {insights.avgLpPerWin.toFixed(0)} · loss ≈ −
              {insights.avgLpPerLoss.toFixed(0)}
              {currentPatch ? ` · patch ${currentPatch}` : ""}
            </p>
          </div>
          {insights.tiltCostAvg != null ? (
            <p className="text-xs text-[var(--danger)] sm:text-sm">
              {simpleLabels
                ? simplifyTiltHint(insights.tiltCostAvg, insights.tiltSample)
                : `Tilt: ${insights.tiltCostAvg} PDL/jogo`}
            </p>
          ) : null}
        </div>
        {patchNote ? (
          <p className="text-xs text-[var(--warn)]">{patchNote}</p>
        ) : null}
        <BarsGrid
          insights={insights}
          simpleLabels={simpleLabels}
          sessionRows={sessionRows}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel className="space-y-3 p-4">
        <div>
          <h2 className="type-title text-base">
            {simpleLabels ? "Onde você ganha PDL" : "PDL no histórico"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {simpleLabels
              ? `Cada barra é o PDL médio por partida naquele grupo. Ex.: +9 PDL · 2 jogos = média de +9 nas 2 partidas da amostra. Vitória ≈ +${insights.avgLpPerWin.toFixed(0)} PDL · derrota ≈ −${insights.avgLpPerLoss.toFixed(0)} PDL.`
              : `ΔPDL por partida (snapshots quando houver; senão estimativa ±${insights.avgLpPerWin.toFixed(0)}/${insights.avgLpPerLoss.toFixed(0)}). Números à direita = média · quantidade de jogos.`}
            {currentPatch ? ` Patch foco: ${currentPatch}.` : ""}
          </p>
          {patchNote ? (
            <p className="mt-1 text-xs text-[var(--warn)]">{patchNote}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-[var(--muted-strong)]">
          {!simpleLabels ? (
            <>
              <span>Win ≈ +{insights.avgLpPerWin} PDL</span>
              <span>Loss ≈ −{insights.avgLpPerLoss} PDL</span>
            </>
          ) : null}
          {insights.tiltCostAvg != null ? (
            <span className="text-[var(--danger)]">
              {simpleLabels
                ? simplifyTiltHint(insights.tiltCostAvg, insights.tiltSample)
                : `Custo de tilt: ${insights.tiltCostAvg} PDL/jogo (${insights.tiltSample} jogos)`}
            </span>
          ) : null}
        </div>
      </Panel>

      <BarsGrid
        insights={insights}
        simpleLabels={simpleLabels}
        sessionRows={sessionRows}
      />

      {!hideCalendar && calendar.length > 0 ? (
        <LpCalendarGrid calendar={calendar} />
      ) : null}
    </div>
  );
}
