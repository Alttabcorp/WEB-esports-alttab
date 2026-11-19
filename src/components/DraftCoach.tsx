"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type {
  ChampionCatalogEntry,
  RuneCatalog,
  SpellCatalog,
} from "@/lib/ddragon";
import { championIconUrl } from "@/lib/ddragon";
import { pct } from "@/lib/format";
import type { DraftRecommendation } from "@/lib/stats/draft";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { DraftContextTips } from "./DraftContextTips";
import { RunePageIcons } from "./RunePageIcons";

const DRAFT_ROLES: RoleKey[] = [
  "TOP",
  "JUNGLE",
  "MIDDLE",
  "BOTTOM",
  "UTILITY",
];

type SlotTarget =
  | { side: "enemy"; index: number }
  | { side: "ally"; index: number }
  | { side: "ban"; index: number }
  | { side: "me" };

type Props = {
  region: string;
  riotId: string;
  queue: string;
  count: number;
  ddragonVersion: string;
  catalog: ChampionCatalogEntry[];
  idToKey: Record<number, string>;
  runeCatalog: RuneCatalog;
  spellCatalog: SpellCatalog;
  defaultRole?: RoleKey;
};

function emptyTeam(): (number | null)[] {
  return [null, null, null, null, null];
}

function slotLabel(target: SlotTarget, role: RoleKey): string {
  if (target.side === "me") return `Seu pick · ${ROLE_LABELS[role]}`;
  if (target.side === "ban") return `Ban ${target.index + 1}`;
  if (target.side === "enemy") {
    return `Inimigo · ${ROLE_LABELS[DRAFT_ROLES[target.index]]}`;
  }
  return `Aliado · ${ROLE_LABELS[DRAFT_ROLES[target.index]]}`;
}

export function DraftCoach({
  region,
  riotId,
  queue,
  count,
  ddragonVersion,
  catalog,
  idToKey,
  runeCatalog,
  spellCatalog,
  defaultRole = "MIDDLE",
}: Props) {
  const [role, setRole] = useState<RoleKey>(
    defaultRole === "UNKNOWN" ? "MIDDLE" : defaultRole,
  );
  const [enemies, setEnemies] = useState<(number | null)[]>(emptyTeam);
  const [allies, setAllies] = useState<(number | null)[]>(emptyTeam);
  const [bans, setBans] = useState<(number | null)[]>(Array(10).fill(null));
  const [myPick, setMyPick] = useState<number | null>(null);
  const [active, setActive] = useState<SlotTarget | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recs, setRecs] = useState<DraftRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"ban" | "pick">("ban");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of catalog) map.set(c.id, c.name);
    return map;
  }, [catalog]);

  const taken = useMemo(() => {
    const ids = [...enemies, ...allies, ...bans, myPick].filter(
      (x): x is number => x != null,
    );
    return new Set(ids);
  }, [enemies, allies, bans, myPick]);

  const laneEnemyIndex = DRAFT_ROLES.indexOf(role);
  const laneEnemyId =
    laneEnemyIndex >= 0 ? (enemies[laneEnemyIndex] ?? null) : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((c) => !taken.has(c.id) || c.id === myPick)
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .slice(0, 64);
  }, [catalog, taken, query, myPick]);

  const enemyIds = useMemo(
    () => enemies.filter((x): x is number => x != null),
    [enemies],
  );
  const allyIds = useMemo(
    () => allies.filter((x): x is number => x != null),
    [allies],
  );
  const banIds = useMemo(
    () => bans.filter((x): x is number => x != null),
    [bans],
  );

  const recommend = useCallback(
    (opts?: { confirmPick?: number }) => {
      setError(null);
      startTransition(async () => {
        try {
          const res = await fetch("/api/draft/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              region,
              riotId,
              queue,
              count,
              role,
              enemyChampionIds: enemyIds,
              allyChampionIds: allyIds,
              bannedChampionIds: banIds,
              sessionId: opts?.confirmPick ? sessionId : undefined,
              pickedChampionId: opts?.confirmPick ?? undefined,
            }),
          });
          const data = (await res.json()) as {
            error?: string;
            sessionId?: string;
            draft?: { recommendations: DraftRecommendation[] };
          };
          if (!res.ok) {
            setError(data.error ?? "Falha ao recomendar");
            return;
          }
          if (data.sessionId) setSessionId(data.sessionId);
          if (data.draft?.recommendations) {
            setRecs(data.draft.recommendations);
          }
          if (opts?.confirmPick) setMyPick(opts.confirmPick);
        } catch {
          setError("Erro de rede ao pedir recomendação");
        }
      });
    },
    [
      region,
      riotId,
      queue,
      count,
      role,
      enemyIds,
      allyIds,
      banIds,
      sessionId,
    ],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => recommend(), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, enemyIds.join(","), allyIds.join(","), banIds.join(",")]);

  useEffect(() => {
    if (!pickerOpen) return;
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePicker();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  function closePicker() {
    setPickerOpen(false);
    setQuery("");
    setActive(null);
  }

  function openPicker(target: SlotTarget) {
    setActive(target);
    setQuery("");
    setPickerOpen(true);
  }

  function placeChampion(id: number) {
    if (!active) return;
    if (active.side === "enemy") {
      setEnemies((prev) => {
        const next = [...prev];
        next[active.index] = id;
        return next;
      });
    } else if (active.side === "ally") {
      setAllies((prev) => {
        const next = [...prev];
        next[active.index] = id;
        return next;
      });
    } else if (active.side === "ban") {
      setBans((prev) => {
        const next = [...prev];
        next[active.index] = id;
        return next;
      });
    } else {
      setMyPick(id);
      recommend({ confirmPick: id });
    }
    closePicker();
  }

  function clearSlot(target: SlotTarget) {
    if (target.side === "enemy") {
      setEnemies((prev) => {
        const next = [...prev];
        next[target.index] = null;
        return next;
      });
    } else if (target.side === "ally") {
      setAllies((prev) => {
        const next = [...prev];
        next[target.index] = null;
        return next;
      });
    } else if (target.side === "ban") {
      setBans((prev) => {
        const next = [...prev];
        next[target.index] = null;
        return next;
      });
    } else {
      setMyPick(null);
    }
  }

  function onSlotClick(target: SlotTarget, currentId: number | null) {
    if (currentId != null) {
      clearSlot(target);
      return;
    }
    openPicker(target);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--alttab)]/10 px-4 py-3 text-sm">
        <p className="font-semibold text-white">Seleção manual</p>
        <p className="mt-1 text-[var(--muted-strong)]">
          Espelhe o champ select do LoL: bans → picks → seu pick. O ranking
          atualiza sozinho com o seu histórico.
        </p>
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex gap-1 rounded-lg bg-black/30 p-1">
            <button
              type="button"
              onClick={() => setPhase("ban")}
              className={`min-h-9 rounded-md px-3 py-1.5 text-sm font-medium ${
                phase === "ban"
                  ? "bg-[var(--danger)]/80 text-white"
                  : "text-[var(--muted)] hover:text-white"
              }`}
            >
              1. Bans
            </button>
            <button
              type="button"
              onClick={() => setPhase("pick")}
              className={`min-h-9 rounded-md px-3 py-1.5 text-sm font-medium ${
                phase === "pick"
                  ? "bg-[var(--alttab)] text-white"
                  : "text-[var(--muted)] hover:text-white"
              }`}
            >
              2. Picks
            </button>
          </div>
          <span className="data-label mr-1">Sua lane</span>
          {DRAFT_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`min-h-9 rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
                role === r
                  ? "bg-[var(--alttab)] text-white"
                  : "bg-white/5 text-[var(--muted-strong)] hover:bg-white/10"
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          {pending ? (
            <span className="text-[var(--alttab-soft)]">Atualizando…</span>
          ) : (
            <span>{recs.length} sugestões</span>
          )}
          {phase === "pick" && !laneEnemyId ? (
            <span className="text-amber-200">
              Defina o inimigo de {ROLE_LABELS[role]}
            </span>
          ) : laneEnemyId ? (
            <span>vs {nameById.get(laneEnemyId) ?? laneEnemyId}</span>
          ) : null}
        </div>
      </div>

      {/* Workspace */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* Board column */}
        <div className="space-y-3">
          <div
            className={`panel px-3 py-3 transition ${
              phase === "ban"
                ? "ring-1 ring-rose-500/40"
                : "opacity-70"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="data-label">
                Bans{phase === "ban" ? " · fase atual" : ""}
              </p>
              <p className="text-[11px] text-zinc-600">
                clique vazio = escolher · preenchido = remover
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {bans.map((id, index) => (
                <BanChip
                  key={`ban-${index}`}
                  index={index}
                  championId={id}
                  ddragonVersion={ddragonVersion}
                  idToKey={idToKey}
                  name={id != null ? nameById.get(id) : undefined}
                  active={
                    active?.side === "ban" &&
                    active.index === index &&
                    pickerOpen
                  }
                  onClick={() =>
                    onSlotClick({ side: "ban", index }, id)
                  }
                />
              ))}
            </div>
            {phase === "ban" ? (
              <button
                type="button"
                onClick={() => setPhase("pick")}
                className="mt-3 min-h-10 w-full rounded-lg bg-[var(--alttab)]/20 py-2 text-sm font-semibold text-[var(--alttab-soft)] hover:bg-[var(--alttab)]/30"
              >
                Bans ok — ir para picks
              </button>
            ) : null}
          </div>

          <div
            className={`grid gap-3 sm:grid-cols-2 transition ${
              phase === "pick"
                ? "ring-1 ring-[#0596aa]/35 rounded-xl p-1"
                : "opacity-70"
            }`}
          >
            <TeamPanel
              title={
                phase === "pick" ? "Seu time · fase atual" : "Seu time"
              }
              tone="blue"
              roles={DRAFT_ROLES}
              myRole={role}
              slots={allies}
              myPick={myPick}
              active={active}
              pickerOpen={pickerOpen}
              ddragonVersion={ddragonVersion}
              idToKey={idToKey}
              nameById={nameById}
              enemySide={false}
              onAlly={(index, id) =>
                onSlotClick({ side: "ally", index }, id)
              }
              onMe={() => onSlotClick({ side: "me" }, myPick)}
            />
            <TeamPanel
              title="Inimigos"
              tone="red"
              roles={DRAFT_ROLES}
              myRole={role}
              slots={enemies}
              myPick={null}
              active={active}
              pickerOpen={pickerOpen}
              ddragonVersion={ddragonVersion}
              idToKey={idToKey}
              nameById={nameById}
              enemySide
              highlightLane
              onAlly={(index, id) =>
                onSlotClick({ side: "enemy", index }, id)
              }
              onMe={() => undefined}
            />
          </div>
        </div>

        {/* Recommendations column */}
        <section className="panel-strong flex min-h-[420px] flex-col px-4 py-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Top picks neste board
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Baseado no seu histórico — escolha e confirme
            </p>
          </div>

          {error ? (
            <p className="mb-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          {recs.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm text-[var(--muted-strong)]">
                Monte o board para ver recomendações
              </p>
              <p className="text-xs text-[var(--muted)]">
                Comece pelo inimigo de {ROLE_LABELS[role]} — ele pesa mais no
                score.
              </p>
              <button
                type="button"
                onClick={() =>
                  openPicker({ side: "enemy", index: laneEnemyIndex })
                }
                className="mt-3 min-h-10 rounded-lg bg-[var(--alttab)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--alttab-deep)]"
              >
                Escolher inimigo de lane
              </button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {recs.map((rec, index) => {
                const key = idToKey[rec.championId] ?? rec.championName;
                const activePick = myPick === rec.championId;
                return (
                  <li
                    key={rec.championId}
                    className={`rounded-xl border p-3 transition ${
                      activePick
                        ? "border-[var(--alttab)] bg-[var(--alttab)]/12"
                        : "border-[var(--border)] bg-black/25 hover:border-white/15"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="relative shrink-0">
                        <Image
                          src={championIconUrl(ddragonVersion, key)}
                          alt={rec.championName}
                          width={52}
                          height={52}
                          className="rounded-lg"
                        />
                        <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded bg-black/85 text-[10px] font-bold text-[var(--alttab-soft)]">
                          {index + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">
                            {rec.championName}
                          </p>
                          <ConfidenceBadge level={rec.confidence} />
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          {pct(rec.wrInRole)} WR · {rec.gamesInRole} jogos na
                          role
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                          {rec.reasons[0]}
                        </p>
                        {rec.topRune && !rec.vsRune ? (
                          <div className="mt-2">
                            <RunePageIcons
                              primaryStyle={rec.topRune.primaryStyle}
                              subStyle={rec.topRune.subStyle}
                              keystone={rec.topRune.keystone}
                              primaryPerkIds={rec.topRune.primaryPerkIds}
                              subPerkIds={rec.topRune.subPerkIds}
                              perkIds={rec.topRune.perkIds}
                              runeCatalog={runeCatalog}
                              size="sm"
                              showLabels={false}
                            />
                          </div>
                        ) : null}
                        <DraftContextTips
                          rec={rec}
                          ddragonVersion={ddragonVersion}
                          runeCatalog={runeCatalog}
                          spellCatalog={spellCatalog}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setMyPick(rec.championId);
                          recommend({ confirmPick: rec.championId });
                        }}
                        className={`min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
                          activePick
                            ? "bg-[var(--alttab)] text-white"
                            : "border border-[var(--border)] text-[var(--muted-strong)] hover:border-[var(--border-strong)] hover:text-white"
                        }`}
                      >
                        {activePick ? "Pick" : "Usar"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Champion picker modal */}
      {pickerOpen && active ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
          onClick={closePicker}
          role="presentation"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-t-2xl border border-white/10 bg-[#0a161c] shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Escolher campeão"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {slotLabel(active, role)}
                </p>
                <p className="text-xs text-zinc-500">
                  Digite para filtrar · Esc para fechar
                </p>
              </div>
              <button
                type="button"
                onClick={closePicker}
                className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Fechar
              </button>
            </div>
            <div className="border-b border-white/8 px-4 py-3">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar campeão…"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#0596aa]/50 focus:ring-2 focus:ring-[#0596aa]/25"
              />
            </div>
            <div className="grid grid-cols-5 gap-2 overflow-y-auto p-4 sm:grid-cols-8 md:grid-cols-10">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.name}
                  onClick={() => placeChampion(c.id)}
                  className="group flex flex-col items-center gap-1 rounded-lg border border-transparent p-1 transition hover:border-[#0596aa]/50 hover:bg-[#0596aa]/10"
                >
                  <Image
                    src={championIconUrl(ddragonVersion, c.key)}
                    alt={c.name}
                    width={52}
                    height={52}
                    className="w-full rounded-md"
                  />
                  <span className="w-full truncate text-center text-[10px] text-zinc-500 group-hover:text-zinc-300">
                    {c.name}
                  </span>
                </button>
              ))}
              {filtered.length === 0 ? (
                <p className="col-span-full py-8 text-center text-sm text-zinc-500">
                  Nenhum campeão encontrado
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BanChip({
  index,
  championId,
  ddragonVersion,
  idToKey,
  name,
  active,
  onClick,
}: {
  index: number;
  championId: number | null;
  ddragonVersion: string;
  idToKey: Record<number, string>;
  name?: string;
  active: boolean;
  onClick: () => void;
}) {
  const key =
    championId != null ? (idToKey[championId] ?? String(championId)) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={name ?? `Ban ${index + 1}`}
      className={`relative h-11 w-11 overflow-hidden rounded-md border transition ${
        active
          ? "border-[var(--alttab)] ring-2 ring-[var(--alttab)]/40"
          : "border-[var(--border)] hover:border-white/25"
      } ${championId ? "opacity-70 grayscale" : "bg-black/30"}`}
    >
      {key ? (
        <Image
          src={championIconUrl(ddragonVersion, key)}
          alt={name ?? `Ban ${index + 1}`}
          width={44}
          height={44}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-[var(--muted)]">
          B{index + 1}
        </span>
      )}
    </button>
  );
}

function TeamPanel({
  title,
  tone,
  roles,
  myRole,
  slots,
  myPick,
  active,
  pickerOpen,
  ddragonVersion,
  idToKey,
  nameById,
  enemySide,
  highlightLane = false,
  onAlly,
  onMe,
}: {
  title: string;
  tone: "blue" | "red";
  roles: RoleKey[];
  myRole: RoleKey;
  slots: (number | null)[];
  myPick: number | null;
  active: SlotTarget | null;
  pickerOpen: boolean;
  ddragonVersion: string;
  idToKey: Record<number, string>;
  nameById: Map<number, string>;
  enemySide: boolean;
  highlightLane?: boolean;
  onAlly: (index: number, id: number | null) => void;
  onMe: () => void;
}) {
  const accent =
    tone === "blue"
      ? "border-sky-500/25 bg-sky-500/[0.04]"
      : "border-rose-500/25 bg-rose-500/[0.04]";
  const bar = tone === "blue" ? "bg-sky-500" : "bg-rose-500";

  return (
    <div className={`overflow-hidden rounded-xl border ${accent}`}>
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <span className={`h-2 w-2 rounded-full ${bar}`} />
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="divide-y divide-white/5">
        {roles.map((r, index) => {
          const isMyLane = r === myRole;
          if (!enemySide && isMyLane) {
            return (
              <SlotRow
                key={`me-${r}`}
                label={`Você`}
                roleLabel={ROLE_LABELS[r]}
                championId={myPick}
                name={myPick != null ? nameById.get(myPick) : undefined}
                ddragonVersion={ddragonVersion}
                idToKey={idToKey}
                active={pickerOpen && active?.side === "me"}
                highlight
                onClick={onMe}
              />
            );
          }
          const id = slots[index];
          const isActive =
            pickerOpen &&
            active?.side === (enemySide ? "enemy" : "ally") &&
            active.index === index;
          return (
            <SlotRow
              key={`${tone}-${r}`}
              label={ROLE_LABELS[r]}
              championId={id}
              name={id != null ? nameById.get(id) : undefined}
              ddragonVersion={ddragonVersion}
              idToKey={idToKey}
              active={isActive}
              highlight={Boolean(highlightLane && isMyLane)}
              onClick={() => onAlly(index, id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SlotRow({
  label,
  roleLabel,
  championId,
  name,
  ddragonVersion,
  idToKey,
  active,
  highlight,
  onClick,
}: {
  label: string;
  roleLabel?: string;
  championId: number | null;
  name?: string;
  ddragonVersion: string;
  idToKey: Record<number, string>;
  active: boolean;
  highlight: boolean;
  onClick: () => void;
}) {
  const key =
    championId != null ? (idToKey[championId] ?? String(championId)) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition ${
        active
          ? "bg-[var(--alttab)]/20"
          : highlight
            ? "bg-[var(--warn)]/10 hover:bg-[var(--warn)]/15"
            : "hover:bg-white/[0.03]"
      }`}
    >
      {key ? (
        <Image
          src={championIconUrl(ddragonVersion, key)}
          alt={name ?? label}
          width={44}
          height={44}
          className="rounded-md"
        />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-[var(--muted)]">
          +
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-[var(--muted)]">
          {label}
          {roleLabel ? ` · ${roleLabel}` : ""}
          {highlight ? " · lane" : ""}
        </span>
        <span className="block truncate text-sm font-medium text-white">
          {name ?? "Selecionar"}
        </span>
      </span>
    </button>
  );
}
