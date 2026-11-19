"use client";

import Image from "next/image";
import { championIconUrl, itemIconUrl } from "@/lib/ddragon";
import type { MatchHistoryRow } from "@/lib/db/persist";
import { ROLE_LABELS } from "@/lib/stats/roles";

type Props = {
  matches: MatchHistoryRow[];
  ddragonVersion: string;
  idToKey: Record<number, string>;
};

const QUEUE_LABEL: Record<number, string> = {
  420: "Solo/Duo",
  440: "Flex",
  450: "ARAM",
  400: "Normal",
  430: "Blind",
};

export function MatchHistoryPanel({
  matches,
  ddragonVersion,
  idToKey,
}: Props) {
  return (
    <section className="panel space-y-3 p-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-white">
          Histórico de partidas
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {matches.length > 0
            ? `${matches.length} partidas salvas no banco`
            : "Nenhuma partida no banco — sincronize em Config"}
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Vá em Config → Atualizar histórico para gravar as partidas aqui.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {matches.map((m) => {
            const champKey = idToKey[m.championId] ?? m.championName;
            const enemyKey =
              m.enemyChampionId != null
                ? idToKey[m.enemyChampionId] ?? m.enemyChampionName
                : null;
            const when = new Date(m.gameCreation).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            const mins = Math.max(1, Math.round(m.gameDuration / 60));

            return (
              <li
                key={m.matchId}
                className={`flex flex-wrap items-center gap-3 py-3 ${
                  m.win ? "bg-emerald-500/[0.04]" : "bg-rose-500/[0.04]"
                }`}
              >
                <div
                  className={`w-1 self-stretch rounded-full ${
                    m.win ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                <Image
                  src={championIconUrl(ddragonVersion, champKey)}
                  alt={m.championName}
                  width={40}
                  height={40}
                  className="rounded-md"
                />
                <div className="min-w-[7rem] flex-1">
                  <p className="text-sm font-medium text-white">
                    {m.championName}
                    <span
                      className={`ml-2 text-xs ${
                        m.win ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {m.win ? "Vitória" : "Derrota"}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {ROLE_LABELS[m.role] ?? m.role} ·{" "}
                    {QUEUE_LABEL[m.queueId] ?? `Q${m.queueId}`} · {mins} min ·{" "}
                    {m.patch !== "desconhecido" ? `p${m.patch}` : when}
                  </p>
                  <p className="text-xs text-zinc-600">{when}</p>
                </div>

                <p className="tabular-nums text-sm text-zinc-200">
                  {m.kills}/{m.deaths}/{m.assists}
                  <span className="ml-2 text-xs text-zinc-500">{m.cs} CS</span>
                </p>

                {enemyKey ? (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span>vs</span>
                    <Image
                      src={championIconUrl(ddragonVersion, enemyKey)}
                      alt={m.enemyChampionName ?? ""}
                      width={28}
                      height={28}
                      className="rounded"
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-1">
                  {m.items.map((id) => (
                    <Image
                      key={`${m.matchId}-${id}`}
                      src={itemIconUrl(ddragonVersion, id)}
                      alt=""
                      width={22}
                      height={22}
                      className="rounded"
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
